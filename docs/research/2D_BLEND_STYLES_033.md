# 2D 공용 블렌드 스타일과 표면 마스크

2026-10-06. Unity6000.0의 [설정 본문·표](https://docs.unity3d.com/kr/6000.0/Manual/urp/LightBlendStyles.html)와 URP17.0.4의 [타입·자체 name 선언](https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@17.0/api/UnityEngine.Rendering.Universal.Light2DBlendStyle.html)을 읽었어요. 광원별 독립 혼합 설정 대신 네 가지 공용 스타일을 선택하는 구조예요. 이미지·연결 문서·상속 API는 이 읽기에 포함하지 않아요.

공식 Graphics의 동일 버전 커밋 feb4de2d9a93a4ae10d287d3a6d7003d08ea3e53에서 [Light2DBlendStyle.cs](https://github.com/Unity-Technologies/Graphics/blob/feb4de2d9a93a4ae10d287d3a6d7003d08ea3e53/Packages/com.unity.render-pipelines.universal/Runtime/2D/Light2DBlendStyle.cs) 전체를 읽었어요. RGBA와 반전 채널, 혼합 계수는 내부 선언이고 공개 API 문서에 name만 나온다는 차이를 확인했어요. [CombinedShapeLightShared.hlsl](https://github.com/Unity-Technologies/Graphics/blob/feb4de2d9a93a4ae10d287d3a6d7003d08ea3e53/Packages/com.unity.render-pipelines.universal/Shaders/2D/Include/CombinedShapeLightShared.hlsl) 전체에서는 각 스타일에 마스크를 적용한 뒤 곱셈·가산 항을 합하고 마지막 음수를 자르는 순서를 확인했어요. 스타일을 순서대로 색에 곱하는 방식은 다른 결과를 내요.

| 보존 원문 | SHA-256 |
|---|---|
| 매뉴얼 HTML | 675c3ef05b04c2e313db85ba0c9dc646cace0b2af6ac9c366c717e63caabe634 |
| 자체 API HTML | f67d3ee2e312fcd0a9d70a6f75a5175545011ad38605100d51f16043496a0c96 |
| Light2DBlendStyle.cs | 69e681eb6631de751c2f2db8ba5f39009c972ab2ac78bce160fe2e06ba46a3dc |
| CombinedShapeLightShared.hlsl | e57fb24c83d1e23952bc9634e047e02cd5250c8004d1c3e1a1664c2986030ee6 |

캡처·응답·읽은 범위는 native/build/light-blend-source-033/manifest.json에 있어요. 설치 Unity와 독립 렌더 비교, URP 전체 소스·모든 연결 API 검증은 별도이며 전체 연구 완료로 올리지 않아요.

## HBEngine 연결 계약

- 2D 배치 메뉴의 Renderer 2D 오브젝트는 네 스타일의 이름·혼합·마스크 채널을 보유해요. 활성·표시된 설정 중 우선순위가 높은 것을 쓰고 동률에는 먼저 배치된 오브젝트를 사용해요. 설정이 없으면 기존 스타일0 곱셈/마스크 없음이에요.
- Light2D의 스타일 선택은 0~3이에요. 씬과 BP 속성에서 이름으로 선택하고 런타임에도 바꿀 수 있어요. 스타일의 변경은 그 스타일을 참조하는 광원 모두에 적용돼요.
- SpriteRenderer와 TilemapRenderer의 lightMaskTexture는 기본 이미지와 대응하는 RGBA 데이터 텍스처예요. 색 공간 변환을 하지 않으며 스프라이트 잘라내기·반전·타일 UV를 따라가요. 없으면 흰 마스크이고 반전 채널은 0이 돼요. SpriteMask의 화면 가림과는 별도 필드예요.
- 광원마다 마스크를 적용한 기여를 곱셈/가산/감산 합으로 모으고 마지막에 음수를 잘라요. 기존 발광·번쩍임·노멀·전용 그림자 경로를 유지해요. 스타일 수에 따른 화면 크기의 추가 렌더 타깃은 만들지 않아요. 기존64광원·64형상 정점 상한을 유지해요.
- Light2D::Set/GetBlendStyle, Set/GetRendererBlendStyle, Sprites::Set/GetLightMaskTexture와 같은 선언의 BP 노드 여섯 개, AI 스키마 render2d.blendStyles를 함께 제공해요. 잘못된 인덱스/모드/마스크는 변경 전에 거절해요.

HBEngine 설정은 현재 씬의 오브젝트예요. Unity의 카메라별 Renderer Asset 선택·HDR emulation scale·중간 light render texture·광원 겹침/볼륨 구현까지 동일하다는 뜻은 아니에요. HBEngine의 광원이 없는 기존 2D Lit 표면은 어두움을 유지하며, 공식 셰이더의 비활성 variant에서 원래 색을 반환하는 분기와 구분해요.

검사는 test:light-blends와 기존 실제 편집기/Player 2D GPU 검사에 묶었어요. 저장/제어·C++·혼합 픽셀·RGBA와 반전·UV·기존 전용 그림자를 함께 확인하고 실행 증거는 아래에 추가해요. 새 기능의 모바일 실기기/FPS나8시간 메모리를 이 검사로 대체하지 않아요.

## 실행 증거

- CPU test:light-blends, 기존2D 조명·렌더 자원 수명 검사 통과. 실제 GCC에서 같은 호출의 스타일/마스크 읽기, 잘못된 값의 원자적 거절, 생성 BP/AI 계약을 대조했어요.
- 실제 에디터 native/build/authoring-window-dILucz 및 Game.exe dzqYeh: 전체133/조명83 검사, 오류0. 혼합 픽셀 RGBA[89,137,89,255]가 예상RGB[89,137,89]와 일치해요. RGBA·네 반전 채널·크롭/반전·기존 노멀/전용 그림자도 통과해요.
- 타일 마스크/갱신 두 항목을 추가한 실제 에디터 GPU5o3l8N:135/조명85 검사, 오류0. 복제된 타일 머테리얼의 선형 데이터 마스크와 제거 뒤 흰 마스크 복원을 확인했어요. 동일 코드의 모바일 GPU/성능은 이 증거로 대신하지 않아요.
