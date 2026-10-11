# 093 — 반사 프로브와 캡처 기반 간접광

ReflectionProbe를 오브젝트/컴포넌트로 만들고, 같은 저장 자료를 DirectX·WebGL2·WebGPU에서 실행해요. 사람의 속성 편집, C++·블루프린트 함수, AI 문서 편집이 같은 컴포넌트와 검증을 사용해요. DirectX의 캡처·필터·조명 계산은 GPU에서 처리해요.

## 제작과 호출

오브젝트 메뉴의 반사 프로브 또는 컴포넌트 추가에서 생성해요. 크기·볼륨 오프셋·캡처 위치·근거리/원거리·해상도·반사 강도·간접광 강도·우선순위·경계 혼합·박스 투영·갱신 방식을 속성 창에서 편집해요. 에디터에서는 범위 상자가 보여요. 근거리보다 원거리가 커야 하고, 해상도는 16–2048의 2의 거듭제곱이에요. 기본값은128이에요.

기본 `once`는 처음 캡처를 재사용해요. 위치/해상도/거리/소유 오브젝트 제외 설정이나 `refreshVersion`이 바뀌면 다시 캡처해요. `manual`도 처음에는 캡처하고 이후 Refresh를 사용해요. `onChange`는 장면 기하·머테리얼·광원·환경·포즈 변경 때 갱신해요. 시간 노드/UV Panner도 갱신 대상이에요. 무관한 장면 변경에도 전체 프로브가 갱신될 수 있으므로 움직이는 장면에서 이 모드를 켜면 비용이 커져요.

```cpp
hb::ReflectionProbes::Refresh(probeActor);
hb::ReflectionProbes::SetIntensity(probeActor, 1.0f);
hb::ReflectionProbes::SetDiffuseIntensity(probeActor, 0.5f);
```

마지막 선택 인자 `component`는 컴포넌트 ID/이름/타입을 지정해요. 기본값은 `ReflectionProbe`예요. 블루프린트의 `reflectionProbeRefresh/reflectionProbeIntensity/reflectionProbeDiffuse`도 같은 서비스예요. 기존 Components 함수로 나머지 속성을 변경할 수 있어요. AI는 `engineSchema().components.ReflectionProbe`의 실제 필드/검증, 기존 document.patch·revision/dryRun·Undo/Save를 사용해요. 별도 AI 전용 에셋 형식은 없어요.

간접광 강도의 기본값은0이에요. 기존 ambient/hemisphere 광원에 캡처 광량을 추가하므로 제작자가 켜고 밝기를 맞춰요. 캡처를 다시 수행하지 않아도 반사/간접광 강도는 즉시 바뀌어요.

## DirectX 실행

각 프로브는 R16G16B16A16_FLOAT 여섯 면 캡처, 같은 형식의 GGX mip cube, 캡처 깊이 D32와 SH9 계수 버퍼를 가져요. 캡처는 다른 프로브 조명을 끄고 원본 광원·머테리얼·현재 그림자를 그려서 자기 반사를 반복 누적하지 않아요. 메인 카메라 밖의3D 기하도 캡처 대상이고, 기존 변형/인스턴스 자료를 재사용해요. 캡처는 HDR 선형 색이며 화면용 톤매핑을 거치지 않아요. 하늘은 캡처 far 거리 때문에 잘리지 않게 처리해요. 2D 화면 렌더·파티클·에디터 도우미는 캡처에서 제외해요.

GGX 필터는 mip0을 GPU 복사하고 나머지를 64 Hammersley 표본의 compute shader로 계산해요. SH9 diffuse 계수는 각 면16×16 표본과 구면 면적 가중치로 GPU에서 적분해요. BRDF LUT는 최초 사용 때만 128×128 RG32F, texel당128 표본으로 만들고 모든 프로브가 공유해요. SH 계수/filtered cube/BRDF는 픽셀 셰이더에서 읽어요. 매 프레임 CPU로 이미지·계수·입자 위치를 회수하지 않아요.

오브젝트 원점이 들어간 프로브를 우선순위·작은 부피 순으로 두 개 고르고, 픽셀 위치에서 경계 감쇠와 혼합을 적용해요. 박스 투영은 볼륨 경계와 반사 광선의 교차점으로 방향을 보정해요. 회전된 볼륨은 현재 world AABB를 사용해요. 오브젝트 원점이 밖에 있는 큰 메시, 두 개보다 많은 볼륨과 맞닿은 큰 메시, oriented box의 정확한 내부 선택은 후속이에요.

필터용16B 상수 버퍼3개와 draw용128B probe 상수 버퍼3개를 순환해요. 같은 장면의 정적 캡처/필터/BRDF는 재사용하고, 비활성/삭제/장면 종료 때 해제해요. 노드 머테리얼은 프로브 사용 때 sampler 한 개를 예약해서 최대14개 맵을 허용해요. 2D 효과의 기존 제한13개, 효과 없는 노드 셰이더16개는 유지하고 초과는 오류로 알리어요. 오브젝트 수 제한을 추가하지 않아요.

## 브라우저 실행

기존 Three r180 PMREM을 재사용해서 같은 장면을 HDR 캡처해요. WebGL은 원래 머테리얼의 shader hook을 보존하고, WebGPU는 TSL 환경 조명 노드를 사용해요. 반사/간접광 강도·경계 감쇠·박스 투영을 적용하며 현재 선택은 머테리얼당 한 개예요. 서로 다른 오브젝트가 머테리얼을 공유하면 프로브 바인딩을 분리하되 제작 uniform/hook은 공유해 실행 중 수정이 유지돼요. 캡처 하늘은 프로브 중심/거리로 임시 이동했다가 복구해요. 실패 때도 숨긴 오브젝트·환경·머테리얼·하늘 변환을 복구해요.

검사에서 발견한 기존 WebGPU 색상 변환도 고쳤어요. RGB 멤버를 가진 Color 객체를 vec3 상수에 넣으면 셰이더의 XYZ가0이 되었어요. 이제 실제 RGB 숫자로 vec3을 만들어요. 또한 MeshStandardNodeMaterial이 사용자 LightingNode를 EnvironmentNode로 다시 감싸지 않도록 연결하고, TSL mix 인자 순서/분리 캐시·성분별 광선 부호를 맞췄어요.

브라우저의 PMREM diffuse와 네이티브 SH9은 서로 다른 근사라 픽셀값이 같다는 계약은 없어요. 브라우저의 다중 프로브 혼합, anisotropy/clearcoat 전용 반사 법선·거칠기와 box projection의 결합은 후속이에요.

## 비용과 진단

`reflectionProbes`는 현재 네이티브 프로브 수, `probeTextureBytes`는 캡처+filtered mip+깊이+SH buffer와 공유 LUT의 추정 bytes예요. CB·드라이버 할당/정렬·전체 GPU 메모리는 포함하지 않아요. `probeCaptures/probeDispatches`는 renderer 수명 누적 완료 기록 수이고, 실제 GPU 완료 시간은 아니에요. `probeCachedCaptures`는 현재 JS 캡처 키 수예요. 브라우저의 `renderer.probes`는 count/captures와 선택 방식이에요.

해상도32의 프로브 하나는118,912B, 기본128은1,900,672B예요. 공유 LUT는131,072B예요. 사용하지 않으면 이 자원은 만들지 않아요. 최초 여섯 면 렌더/필터는 한 번에 제출하므로 높은 해상도나 많은 프로브에서는 프레임 지연이 생길 수 있어요. 시간 분할·베이크 파일 저장/재사용·공간별 dirty set은 후속이에요.

## 조사 근거와 차이

[Unity Reflection Probe Inspector](https://docs.unity3d.com/6000.0/Documentation/Manual/class-ReflectionProbe.html)의 type/dynamic/refresh/time slicing/importance/intensity/box projection/size/offset와 캡처 설정을 읽고 HB 속성 계약을 정했어요. Unity의 baked/custom 유형·time slicing·culling mask·전체 blending 정책을 이번 구현으로 대체했다고 계산하지 않아요. [RenderProbe API](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/ReflectionProbe.RenderProbe.html)의 자체 선언/설명에서 수동 렌더 요청을 확인했어요. HB Refresh는 컴포넌트 버전을 올려 다음 렌더에서 캡처하며 Unity의 완료 요청 ID API는 구현하지 않아요.

[Unreal Reflection Captures](https://dev.epicgames.com/documentation/en-us/unreal-engine/reflections-captures-in-unreal-engine)의 sphere/box·작은 볼륨 우선·roughness mip·Lightmass 혼합 구역과 지정 cubemap/해상도 구역을 읽었어요. HB는 박스 기반 캡처를 제공하며 sphere/oriented box·지정 HDRI·Lightmass 혼합은 차이로 남겨요. [Epic SIGGRAPH shading notes](https://cdn2.unrealengine.com/Resources/files/2013SiggraphPresentationsNotes-26915738.pdf)의 지정 split sum/환경 prefilter/BRDF integral 구역을 읽고 GGX cube와 BRDF LUT를 분리했어요. 표본 수·형식·Schlick GGX geometry 근사는 HB 구현 선택이며 논문 전체/Unreal 현재 모든 셰이딩 경로를 복제하지 않아요.

[Stanford irradiance paper](https://graphics.stanford.edu/papers/envmap/envmap.pdf)의 SH basis/convolution 구역에서 아홉 계수와 band별 π, 2π/3, π/4를 확인했어요. HB는 cube의 sampled irradiance를 계산해요. 이것은 광선 추적이나 여러 번 반사하는 GI가 아니에요. [Microsoft cube texture 구역](https://learn.microsoft.com/en-us/windows/win32/direct3d11/overviews-direct3d-11-resources-textures-intro)과 [array UAV 선언/멤버](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/ns-d3d11-d3d11_tex2d_array_uav)는 여섯 면 cube SRV/각 mip array UAV 구성의 근거예요. 일반 cube/array/volume 노드 텍스처 공개 API는 여전히 별도 후속이에요.

원문7의 SHA/읽은 구역/미독과 설치 Three 소스 대조, 실행 증거/제품 SHA/실패 기록은 [093 원장](research/NATIVE_PROBES_093.json)에 기록해요. 다운로드·일부 본문 읽기를 전체 문서/API/corpus 완료로 계산하지 않아요.

## 검증과 다음 작업

GPU 검사는 sharp/rough 반사색, SH diffuse, 두 프로브 혼합, 박스 투영, 범위/강도, far 밖 하늘, 입력 거절·정적 재사용·해제를 확인해요. 기존54 HLSL 노드·3D 조명/그림자·블룸·인스턴스/변형/파티클·2D 회귀도 같이 실행해요. 실제 Windows DirectX/WebGL2/WebGPU 실행기는 메인 카메라 뒤의 발광체가 반사되는 픽셀, C++ Off/Refresh, O키 BP On과 캡처 재사용·장면 전환 해제를 확인해요. 공용 검사는 광원/머테리얼 변경 갱신, 공유 uniform/원본 복구, 실패 때 하늘 복구와 WebGPU 색상 상수를 확인해요.

Multi-bounce GI·lightmap baking·APV/DDGI, SSR/planar/ray-traced reflection, 일반 native cube/array/volume graph texture·추가 셰이딩/후처리는 남아 있어요. 전체 게임 FPS·RAM·휴대폰/iOS·발열 검증을 작은 장면 검사로 대신하지 않아요. 사용 설치본은 누적 선행 묶음 뒤 갱신하며 이번 단계는 개발 빌드와 격리 프로젝트에서 검증해요.
