# 097 — 런타임 색상·벡터, 유리 흡수와 색 분산

2026-10-12. 최근 렌더링 묶음에 색상·벡터 파라미터 실행, 체적 흡수, 색 분산, 유리 제작 템플릿을 추가했어요. 사람과 AI는 기존 머테리얼 에셋·인스턴스·함수·속성 묶음·레이어 형식을 공유하고, Windows DirectX 11·WebGL·WebGPU에서 같은 표면 입력과 C++·블루프린트 함수를 사용해요.

## 제작과 실행

| 기능 | 제작·실행 계약 |
| --- | --- |
| 색상·벡터 | `hb::Materials::SetVector(actor, "Tint", hb::Vec3{1,.2f,.1f})`, `SetColor(actor, "BaseColor", hb::Color{1,.2f,.1f,1})`. 대응 노드 `materialVector`·`materialColor`는 Game.hpp에서 생성한 동일 서비스에 연결해요. |
| 표면 별칭 | `BaseColor`/`Color`, `Emissive`, `Normal`, `CoatNormal`, `AttenuationColor`. 노드에 연결된 표면은 해당 노드의 파라미터 이름으로 변경해요. 연결을 덮어쓰거나 무시하지 않고 명시적으로 거부해요. |
| 레이어·인스턴스 | 기존 `LayerParameterKey`와 scoped vector 이름을 재사용해요. 인스턴스와 clone은 자신만의 uniform을 소유해요. 서로 다른 슬롯에서 변경할 수 없는 이름은 어떤 슬롯도 바꾸기 전에 거부해요. |
| 흡수 | Surface의 `Attenuation Color`·`Attenuation Distance`. 흡수 색상은 선형 RGB, 거리는 월드 단위예요. `Thickness`는 로컬 단위이고 오브젝트 크기를 반영한 광선 길이에 Beer 법칙을 적용해요. 거리 **0은 흡수 끄기**예요. 두께 0도 흡수하지 않아요. |
| 색 분산 | Surface의 `Dispersion`, 범위 0~10, 기본 0. RGB마다 다른 굴절률로 불투명 장면 캡처를 샘플링해요. 일반적인 제작 값은 0~1이며 0은 단일 샘플 경로예요. |
| 쉬운 시작 | 기존 템플릿 메뉴에 `Glass`·`Tinted Glass`·`Prism`을 추가했어요. 생성한 노드는 일반 Scalar/Vector Parameter와 Surface라서 사람·AI가 동일하게 편집할 수 있어요. |

색상 문자열/색상 선택기의 hex는 sRGB에서 선형 RGB로 변환해요. Vec3 배열과 C++ 값은 선형 값이에요. `SetColor`의 RGB를 사용하고 알파는 `SetFloat(...,"Opacity",...)`로 별도 변경해요. HDR 발광은 `SetVector(...,"Emissive",...)`와 `EmissiveIntensity`를 사용해요. 유리의 표면 색과 내부 흡수 색은 별개의 입력이에요. UI에는 기존 속성 입력과 템플릿만 추가하고 긴 안내는 이 문서에 두어요.

## 비용과 수명

GLSL vec3 uniform, WebGPU typed uniform, DirectX의 기존 float structured buffer를 사용해요. DirectX에서는 기존 스칼라 뒤에 vec3 성분을 넣어 레이아웃을 보존해요. 1,000회 색상·벡터·거리·분산 변경에서 머테리얼 UUID와 프로그램을 재생성하지 않았어요. 브라우저는 첫 투과/분산 사용 때 필요한 셰이더 변형만 활성화하고 이후 같은 uniform을 재사용해요.

기존 실수 변경 경로의 **그래프 전체 복사와 재질 재생성 fallback**도 제거했어요. 실수와 벡터 모두 실제 uniform 이름을 먼저 확인해요. 연결된 표면을 잘못된 이름으로 변경하거나 여러 슬롯 중 일부만 이름이 맞는 경우 전체 변경을 거부해요. CPU 그래프를 매번 복사하거나 기존 슬롯을 새 머테리얼로 덮지 않아요. 이 수정 후에는 공용 검사와 세 실행기의 해당 호출을 다시 확인하며 HLSL 전체 회귀를 불필요하게 반복하지 않아요.

새 흡수·분산은 096의 HDR 캡처/mip를 재사용하고 새 이미지 버퍼를 만들지 않아요. DirectX draw constant에 흡수 색상/거리 16바이트를 추가했으며 기존 constant buffer 3개를 유지해요. 분산 0은 단일 샘플, 활성 분산은 RGB 세 샘플 경로예요. 투과를 쓰지 않는 DirectX 장면의 캡처 버퍼는 0이고, 종료·resize·장면 교체 수명을 유지해요. 브라우저의 활성화한 투과 자원은 값 0 이후에도 캐시될 수 있어서 브라우저 자원 0을 주장하지 않아요.

## 검증

- `check-material-volume`: 세 백엔드의 1,000회 갱신, 타입·NaN/잘못된 크기 거부, 소스 보존, clone, 독립 레이어, 템플릿, 서로 다른 슬롯의 사전 거부.
- 공용 uniform·77종 머테리얼·함수·속성/레이어·AI 스키마/에셋/자원 수명과 API 생성 검사 통과.
- `native-scene-zkKmXb`: 60개 HLSL 그래프, 기존 2D·광원·그림자·2049 파티클/인스턴스·스키닝·프로브·블룸 회귀와 GPU 없는 경로 거부. 흡수 색/거리/두께/월드 크기, 0 두께/비활성 거리, RGB 분산 510성분, 캡처 재사용·해제 검증.
- 실제 실행 증거의 최종 경로는 [기계 기록](research/NATIVE_VOLUME_097.json)의 `artifacts`에 있어요. 선행 `native-scene-window-dAzQaL`·`gpu-scene-07cnMW`·`gpu-scene-cFbl4c`와 실수 변경 경로 수정 뒤 최종 세 실행에서, 숨겨진 실제 창의 사용자 C++와 실제 T/V 키 블루프린트, 흡수·거리·두께·표면색·분산, 같은 머테리얼/프로그램 유지, 오류 0·종료 0·자신의 서버 종료를 확인해요. DirectX 흰 유리 RGB 230/230/230 → 빨강 흡수 230/57/57 → 거리 2에서 230/154/154 → 두께 2에서 230/2/2였어요.

첫 검사 실패도 보존해요. 스크립트의 CPU/GLSL 교체 구역과 미정의 Begin 이벤트를 수정했고, 색상 변환 비교의 부동소수점 허용 오차를 명시했어요. 분산은 색 경계가 없는 가운데 한 점이 아니라 실제 화면의 색 경계에서 비교해요. 네이티브 비동기 캡처를 기다리고, WebGPU의 0 두께 비교는 **같은 0 두께에서 흡수 활성/비활성**을 비교해 굴절 위치 변화와 혼동하지 않아요. 불필요한 샘플 C++ 빌드는 격리 검사에서만 제외했어요. 전체 GPU 회귀는 한 번 통과한 뒤 그대로 유지하고 변경한 실제 실행 확인만 다시 돌렸어요.

실행 파일·원문·제품 파일·검사 기록 SHA와 세부 결과는 [기계 기록](research/NATIVE_VOLUME_097.json)에 있어요. 중복된 창 상태 덤프는 로컬 원본의 경로·SHA를 유지하고 핵심 픽셀·프로그램·수명 결과로 압축했어요.

최근 렌더링 묶음을 포함한 사용자 설치본을 `C:/Users/kirby/HBEngine/Versions/daf3ca72fb13d79e`로 갱신했어요. 1,976개 배포 파일 전체의 크기·SHA, 변경된 배포 제품 19개, 실행 파일, 두 바로가기와 `.hbproject` 연결을 확인했어요. 기존 `dcc7dfb86fcb2208` 버전의 주요 파일 4개와 최상위 사용자 설정 파일 1개의 SHA는 바뀌지 않았어요. 사용자 창을 실행·종료·재시작하지 않았고 게임 원본은 수정하지 않았어요. 다음 실행부터 새 버전을 사용해요. 불변 설치본을 다시 수정하지 않고 [설치 영수증](research/USER_INSTALL_097.json)을 별도로 남겼어요. 전체 사용자 프로필을 재귀 검사했다는 뜻은 아니에요.

## 직접 읽은 근거와 남은 경계

[Unity HDRP 17.0.4 Surface Type](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.0/manual/Surface-Type.html)의 자체 본문/표 HTML115~244, [Unreal 5.8 Transparency](https://dev.epicgames.com/documentation/en-us/unreal-engine/using-transparency-in-unreal-engine-materials)의 자체 텍스트0~131에서 제작·인스턴스·색상·투명도·비용·정렬을 확인했어요. 이 입력들을 HB의 기존 Surface·실행 서비스에 대응시킨 설계예요. Unreal의 Thin Translucent와 HB의 두께 기반 체적 모델이 동일한 구현이라는 뜻은 아니에요.

[Three r180 transmission shader](https://raw.githubusercontent.com/mrdoob/three.js/r180/src/renderers/shaders/ShaderChunk/transmission_pars_fragment.glsl.js) 114~208의 월드 크기·거리 흡수·RGB 굴절과 [Node material](https://raw.githubusercontent.com/mrdoob/three.js/r180/src/materials/nodes/MeshPhysicalNodeMaterial.js) 210~233·298~340·413~435의 uniform/활성화 연결을 설치 소스와 대조했어요. 링크/API·이미지/영상·다른 셰이딩 모델 및 전체 corpus 읽기·독립 검증은 이 기록으로 완료 처리하지 않아요.

현재 굴절은 불투명 장면 캡처를 사용해요. 중첩 유리의 재귀 굴절, 화면 밖 대상, 깊이 추적, 실제 뒷면 자동 두께, 색 투과 그림자, 굴절 프로브 fallback, 추가 셰이딩·후처리·GI는 별도 남은 작업이에요. 전체 게임 FPS/장시간 RAM과 휴대폰·iOS 실기기 검사는 이 작은 렌더 검사에서 대신 입증하지 않아요.
