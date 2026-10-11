# 092 — DirectX 전용 2D 패스

Windows 빌드의 `windowsRenderer=d3d11`에서 기존 SpriteMask·Light2D·ShadowCaster2D·CompositeShadowCaster2D와 파티클 마스크를 사용해요. 기존 공용 sorting·shape·컴포넌트·게임 서비스가 데이터를 준비하고, D3D11에서 마스크/그림자 타깃과 조명 셰이더를 실행해요. 별도 AI 에셋·스키마나 게임 코드를 만들지 않아요.

## 제작과 호출

- SpriteRenderer/TilemapRenderer의 inside/outside 마스크, sorting group·layer/order·custom range를 공용 제작 데이터로 처리해요. 파티클도 같은 마스크 타깃을 사용해요. 스프라이트/타일의 `shading:lit2d`는 Light2D를 받아요. 파티클 조명·그림자는 이번 범위에 포함되지 않아요.
- global·point·spot·freeform·sprite 광원, 레이어 선택, 네 블렌드 스타일의 곱셈/가산/감산·RGBA/반전 조명 마스크, normal disabled/fast/accurate, 거리·겹침 순서·볼류메트릭을 기존 공용 자료로 연결해요.
- caster의 스프라이트/형상·self/unshadow·composite와 softness, light별 shadow/volume strength는 공용 기하 계산과 stencil 패스를 사용해요. 전체 atlas clear는 D3D11의 scissor와 무관하므로 한 번만 하고, 각 패스는 viewport/scissor로 셀을 지정해요.
- `hb::Sprites::SetMaskInteraction`, `hb::Light2D::SetIntensity/SetShadows`와 기존 대응 BP·Components 함수, 사람 속성 편집·AI document.patch/Undo/Save를 재사용해요. 실제 Windows 검사에서 C++ mask/lamp/shadow 변경과 I/L 키 BP가 화면에 반영되는지 확인했어요. 쉬운 제작 API가 DirectX 코드를 직접 작성하도록 바뀌지 않아요.

## 자원과 실행

네이티브 브리지는 기존 upload/frame/reset 프로토콜에 `target2d`, `dataTexture`, `passes2d`를 추가해요. 보조 타깃 렌더는 동기 큐로 같은 프레임에 먼저 기록해요. 대상 크기·finite 값·enum/index·장치 소유권·자기 타깃 sampling을 검사하고, 오류 때 보조 패스 상태를 복구해요. 자유형 광원의 shader loop도 기존 최대64점 이내로 한정해요.

마스크는 실제 사용 조합에만 화면 크기의 RGBA8 타깃을 할당해요. 마스크 이미지의 필터/wrap·alpha cutoff·UV·변환을 유지하고, 마지막 화면 마스크는 픽셀 위치로 읽어요. 타깃 dispose 이벤트가 JS 패스 캐시 키도 지워요. 동일 카메라/형상/텍스처/설정이면 다시 그리지 않아요. 그림자 atlas는 공용 dirty 판단을 사용해요. 타깃 resize/dispose·사용 중지·장면 전환 때 자원을 해제해요.

Light 자료는 RGBA32F 9열, shape는 RG32F, shadow rect/bounds는 RGBA32F, sprite cookie는 RGBA8 texture array예요. 한 장짜리 cookie도 array view를 사용해요. 공용 데이터가 바뀔 때만 전송해요. 128B 2D 상수 버퍼 세 개를 순환하고 정상 프레임에는 픽셀/입자 위치·개수를 회수하지 않아요.

진단 `targets2d/target2dBytes`는 현재 보조 타깃 수/추정 bytes, `passes2d/draws2d`는 renderer 수명 누적 값이에요. `maskCachedTargets`는 현재 JS 마스크 패스 캐시 키 수예요. RGBA8은 4B/픽셀이고 stencil 타깃은 D24S8 4B가 추가돼요. 이것은 전체 GPU 메모리나 프로세스 RAM 측정이 아니에요. 2D 셰이더가 sampler 세 개를 예약하므로 동시 노드 머테리얼 texture sampler는13개까지예요. 효과 없는 기존 graph는 D3D11 제한16개를 유지하며 초과를 명시적으로 거절해요. 오브젝트 수에 500/1000 제한을 추가하지 않았어요.

## 근거와 HB 적용 판단

[Unity Light2D 제작](https://docs.unity3d.com/6000.0/Documentation/Manual/urp/2d-light-properties-explained.html)의 생성·대상 레이어·깊이·성능·freeform 본문을 확인했어요. HB도 XY 거리와 대상 레이어를 사용해요. Unity의 layer별 light RT batching을 그대로 복제한 것은 아니며, HB는 기존 float light table을 공유해요.

[Light2D 속성 표](https://docs.unity3d.com/6000.0/Documentation/Manual/urp/2DLightProperties.html)의 광원 종류/반경·각도·형상 편집/블렌드·겹침/그림자/볼륨/노멀 품질 전체를 직접 읽었어요. global의 shadow/volume/normal 제외와 fast/accurate 차이를 공용 셰이더에 맞춰 연결해요. 제작 guide의 “모든 2D 광원” 볼륨 표현과 이 표의 global 제외 차이는 유지하며 HB는 속성 표를 따라요. 단일 global/style/layer 규칙, 모든 Unity UI/API를 이 연결만으로 구현했다고 계산하지 않아요. 겹침의 실제 HB 계약은 기존034 고정 소스 대조를 재사용해요.

[SpriteMask 속성 표](https://docs.unity3d.com/6000.0/Documentation/Manual/sprite/mask/sprite-mask-reference.html)는 visibility와 조명 mask를 구분하게 해요. 현재 Unity 표의 back-exclusive와 HB 기존 back-inclusive custom range는 차이로 기록해요. 호환성을 위해 이번 네이티브 연결에서는 HB 공용 범위를 바꾸지 않아요. Supported Renderer source·Rendering Layer Mask·새 sort-point 제작 옵션은 별도 후속이에요.

[ShadowCaster 제작](https://docs.unity3d.com/6000.0/Documentation/Manual/urp/2DShadows.html)의 컴포넌트 추가·형상 이동/삽입·부모 composite 흐름을 확인하고 기존 HB 형상/composite를 실행에 연결해요. Unity 본체/Clipper/URP rendergraph를 구현하거나 동일성을 검증했다는 의미는 아니에요.

[Secondary textures](https://docs.unity3d.com/6000.0/Documentation/Manual/urp/SecondaryTextures.html)의 normal·조명 mask 구분, 같은 UV·비sRGB, sprite editor 선택/적용과 normal distance를 확인했어요. HB의 기존 normal/light-mask 속성을 재사용하며 Unity의 레이어별 normal RT prepass를 추가하지 않아요. 이미지 캡션은 읽었고 이미지/영상 자체와 연결 자료는 미독이에요.

[Microsoft blend state](https://learn.microsoft.com/en-us/windows/win32/direct3d11/d3d10-graphics-programming-guide-blend-state)와 [depth/stencil descriptor](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/ns-d3d11-d3d11_depth_stencil_desc)의 자체 본문·선언/표를 읽었어요. native MAX/ADD/no-color blend와 D24S8의 always/equal/not-equal stencil 상태를 사용해요. MSAA/alpha-to-coverage/dual-output 구현은 이번 연결에 포함되지 않아요.

원문7의 SHA, 실제 읽기 구역·HTML 본문 재대조·미독, 제품/검사 해시는 [원장](research/NATIVE_2D_092.json)에 기록해요. 030–035 공용2D 분석을 재사용하되 전체 패키지/API/corpus나 독립 검증 완료로 올리지 않아요.

## 검증과 남은 작업

실제 GPU에서 inside/outside, sorting-layer 조명, 블렌드/반전 mask, freeform RG32F와 단일 cookie array, stencil reset 색 유지·입력 검증을 확인했어요. 실제 Windows 실행기에서는 SVG mask·C++/BP 변경·shadow·cookie·volume·masked GPU particles, 정적 패스 재사용, 800×450 resize와 3D 전환 뒤 타깃0/bytes0을 확인했어요. 한글 HUD·54 HLSL 노드·3D 그림자/블룸·인스턴스/애니메이션/파티클 기존 회귀도 함께 통과했어요. 최종 이미지의 mask/shadow/cookie 방향을 직접 확인했어요. 실패 기록은 삭제하지 않았어요.

네이티브 GI/반사·일반 cube/array/volume graph texture·추가 셰이딩/후처리, pixel-perfect 정점 snapping 및 2D 모듈/particle 추가 세부는 남아 있어요. 전체 게임 PC120/모바일60, 전체 RAM·장기 실행·휴대폰/iOS/발열과 엔진 전체 완료는 이번 작은 장면 통과로 대체하지 않아요. 설치본은 누적 선행 묶음 뒤 갱신하며 이번 작업은 저장소 빌드·격리 프로젝트만 사용해요.
