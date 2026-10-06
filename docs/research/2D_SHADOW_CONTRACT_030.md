# 2D 그림자: 제작·수명·렌더링 계약 분석

2026-10-06. Unity6000.0 매뉴얼과 URP17.0.4 API, 같은 패키지 버전의 공식 Graphics 소스를 실제로 읽고 대조했어요. 아래22개 파일의 읽기는 전체 엔진·URP 패키지·연결 API 분석 완료를 뜻하지 않아요. 아직 그림자 구현/실행 합격으로 계산하지 않아요.

## 원문과 범위

[제작 흐름](https://docs.unity3d.com/6000.0/Documentation/Manual/urp/2DShadows.html)·[컴포넌트 속성](https://docs.unity3d.com/6000.0/Documentation/Manual/urp/ShadowCaster2D.html)의 기술 본문/표와 URP17.0.4 ShadowCaster2D·CompositeShadowCaster2D의 자체 선언/속성/메서드, ShadowCasterGroup2D의 자체 선언/메서드4개, ShadowCastingOptions의 값4개를 읽었어요. 이미지·상속 API·연결 본문의 읽기는 별도예요. 매뉴얼/API 원문 SHA는 native/build/2d-shadow-docs-jVDrut/manifest.json과 아래 capture 파일에 보존해요.

공식 [Graphics 저장소](https://github.com/Unity-Technologies/Graphics/tree/feb4de2d9a93a4ae10d287d3a6d7003d08ea3e53/Packages/com.unity.render-pipelines.universal)의6000.0/staging을 feb4de2d9a93a4ae10d287d3a6d7003d08ea3e53으로 고정했어요. 그 package.json은17.0.4/Unity6000.0이에요. 공개 패키지 registry의17.0.4 직접 조회404는 저장소 소스/패키지 전체의 부재 증거로 쓰지 않아요. 설치된 Unity 바이너리와 정확히 같은 코드라는 검증도 아니에요. 파일 다운로드만을 읽기로 세지 않고 실제 읽은22개를 아래에 분리해요.

| 실제 전체 읽은 파일 | 저장 줄 수 | 원문 SHA-256 |
|---|---:|---|
| CompositeShadowCaster2D.cs | 33 | `a78ca37d5ff1cd87e463bf83663aad5a0f84af72b36800ec0c75db2e3694f50e` |
| ShadowCaster2D.cs | 628 | `17fe81c61a83494641c230c4cfa6da49f96cb2e8f83c221ef65e9c91ebc102ea` |
| ShadowCasterGroup2D.cs | 74 | `cb14ebae142a6bd1faa7564d69eaa83d8c21a26014b0c4314684fcfa939c5548` |
| ShadowCasterGroup2DManager.cs | 144 | `6981e9ca097034c1dc16c80965d6c7c21106ca3a6725e4d8cc5f6ff497a07a7b` |
| ShadowRendering.cs | 514 | `03703fed40914fabebb0959507fbb4d5d76846c06b3115a875ddd76f569bdbe0` |
| Shadow2D-Projected.shader | 114 | `7b284f48ca4158eb0a6b00808ed881af4b9d2e3420dde25d49991f931556cd94` |
| Shadow2D-Shadow-Geometry.shader | 55 | `6e43a4908976c9488075ef24a6105b24b42f7f53eb7b989319cc256543a1e754` |
| Shadow2D-Shadow-Sprite.shader | 68 | `3059b04487264f15711c975c272605c5bd5fd2fbdda5f7434698d9b07522443d` |
| Shadow2D-Unshadow-Geometry.shader | 113 | `584efa10cb4eddaec2c74d5f57c1a4a65bc81a16ce5f2081d02ec7d598f91402` |
| Shadow2D-Unshadow-Sprite.shader | 144 | `b3b17b50a3844ddbad03e5ad888fea94ad5209a6babfc9a4f530839b6ba40e4f` |
| ShadowEdge.cs | 26 | `796dbc2b4f70ece2056c4469b0963790f0c1c8304d20070786131cde34d6d1d8` |
| ShadowMesh2D.cs | 420 | `51f16ef64becb6ba791fc0ca355bab1a2a935980dd6e3d884a9dd02904386dec` |
| ShadowShape2D.cs | 87 | `28e06f1f2c72697e84bad2fb3aa4f53a9d2899e29f92b96f115652772fbdd749` |
| ShadowShape2DProvider.cs | 67 | `91ddad2ba97b70b7376014c03d599a66f34fbbb8cf117399d5c553af8c6f6b58` |
| ShadowUtility.cs | 938 | `17bbd4f6f9b566f4c04718a8a611607c63f5da8541299a68274eac040a9a4092` |
| LightingUtility.hlsl | 200 | `22e017b1d3b535838e8faeed3ecc55bae593eb7f37d419af0f7eef9ca86a9edc` |
| ShadowProjectVertex.hlsl | 116 | `af949d1a83da83b5a45f17c71f7b6ca9597e88f5164b37ad6c01156cb0350623` |
| ShadowShape2DProvider_Collider.cs | 365 | `e57eb22f1b0580221737db6adeb20fd15ff27dd714c64661344739077f4d3b9e` |
| ShadowShape2DProvider_SpriteRenderer.cs | 147 | `9ef7e458c22d44c14f32ea1d76bf2a2ca3821509292924a025b732367d81acae` |
| ShadowShape2DProvider_SpriteShape.cs | 103 | `d5695fb1643ef25cd0c8bdcb21306aff7d4246a017ea4b487e9dd2adeaea96b8` |
| ShadowShape2DProvider_SpriteSkin.cs | 71 | `21a04ca6d7c467a70f00fd1e1dbde9521c30ca935f441fc5115e3ddfa15dbe99` |
| ShadowShapeProvider2D_Utility.cs | 35 | `3ac3cdce1ddfd2b49d4abb13d77a60862b4ad1df13dea14f7ba832c37959fb01` |

각 파일의 정확한 고정 URL·HTTP상태·SHA·범위는 native/build/shadow-source-20261006/{captures,followup-030,followup-030b}.json에 있어요. [ShadowCasterGroup2D API](https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@17.0/api/UnityEngine.Rendering.Universal.ShadowCasterGroup2D.html)와 [CastingOptions API](https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@17.0/api/UnityEngine.Rendering.Universal.ShadowCaster2D.ShadowCastingOptions.html)의 자체 선언/인자/반환/값만 읽었고 전체 HTML/상속 API로 승격하지 않아요.

## 제작과 동작

- 광원에서 그림자를 켜고, 오브젝트에 전용 ShadowCaster2D를 붙여요. 모양 출처는 스프라이트/변형 스프라이트/2D 충돌 형상/편집 모양/None이에요. Cast, Self, Both, None은 각각 별도 상태예요. 출처None과 CastingOptionNone도 같은 필드가 아니에요. None 캐스터를 무조건 삭제하면 다른 캐스터의 unshadow/정렬 처리와 달라져요.
- 편집 모양은 닫힌 외곽선이에요. 화면의 점 이동/선 클릭으로 점 추가·좌표 편집과 적용/Undo가 필요해요. 스프라이트 출처는 렌더 삼각형/변형 외곽선으로부터 만들어지고 sliced/tiled는 설정된 사각 크기를 사용해요. 반전·프레임 교체·리그 변형을 반영하고 SpriteChangeCallback은 disable 때 해제해요.
- Collider provider는 shape hash·body 공간·카메라/광원 culling bounds가 바뀐 경우만 갱신해요. Circle/Capsule/Polygon/열린Edges를 구분하며 빈 형상·범위 밖이면 그림자 메시를 비워요. Collider 중심·부모/강체 변환·2D radii를 보존해요.
- 부모 Composite는 단순 새 탭이나 메시 표시가 아니에요. manager는 가장 바깥 composite까지 부모를 걸으며 같은 그룹의 캐스터를 함께 처리해요. 그룹은 priority로 정렬되고 그룹 내 캐스터는 반대 방향 priority 순서로 등록돼요. Enable/Disable·부모 변경·priority 변경에서 등록을 옮기고 editor playmode 종료 때 전역 목록을 비워요. 자체source의 Register는 중복을 막지 않으므로 HBEngine에 중복 등록을 그대로 복제할 필요는 없어요.
- 광원과 캐스터의 범위·캐스터 target sorting layer·숨김 여부를 검사한 다음 그 레이어의 그림자 pass를 실행해요. SelfShadow를 렌더러의 일반3D receiveShadow 값으로 바꾸면 해당 동작을 재현하지 못해요.

## 렌더링과 비용

그림자 텍스처는 광원 색 텍스처와 구분하고, 카메라 크기에 renderer의lightRenderTextureScale을 곱해 할당해요. 공식 소스는B10G11R11/24bit depth-stencil/mipmap없음/MSAA1과 임시RT release를 사용해요. 그룹의 sprite/geometry shadow·unshadow, projected shadow·projected unshadow를 순서대로 그리며 stencil을 그룹 안에서 설정/복구해요. R/G/B는 서로 다른 역할이며 LightingUtility는 그 값을 결합한 뒤 광원 그림자 강도를 적용해요.

ShadowProjectVertex는 광원을 캐스터 공간으로 옮기고, 좌표 반전/scale·광원 radius·최대15도soft angle로 단단한 투영과 부드러운 경계를 계산해요. ShadowUtility는 triangle union으로 외곽을 추출하고, 닫힌 경로를 안쪽 offset한 뒤 열린 경로는 그대로 보존해요. 형상만 바뀔 때 projection mesh를 재생성하고, 매 픽셀에서 모든 캐스터의 모든 변을 순회하는 설계로 바꾸지 않아요. HBEngine은 기존 Three 렌더 대상/상태 복구·공용 polygon 편집·컴포넌트 schema·C++/BP 생성 경로를 재사용해요. 공식 엔진 코드를 복사하지 않아요.

## 문서와 소스의 미해결 차이

매뉴얼은 SpriteSkin을 bones bounding box로 설명하지만 이 고정 provider는outlineVertices/outlineIndices를 사용해요. 매뉴얼 TrimEdge의1=원래크기/기본.2 설명과 소스의 bounds 비례 초기 trim·음수거리 offset도 바로 같은 단위로 간주할 수 없어요. HBEngine의 형상/경계 거리 계약을 명시하고 실제 결과로 검사해야 해요. 버전별 문서/소스 대응을 독립 검증한 것으로 계산하지 않아요.

## 다음 묶음과 검증 경계

전용ShadowCaster2D·Composite, 출처/모양/자기 그림자/레이어/알파/경계 설정, 광원 그림자 강도/품질, 공용Inspector·모양편집·C++·BP·AI schema와 실제Editor/Player의 픽셀/수명 검사를 함께 연결해요. 비활성/사용하지 않는 그림자는 렌더 대상을 할당하지 않고 종료/재배치 때 소유 자원을 정리해요. SpriteShape 기능 전체, Clipper2D/Offset/UTess·Light2D/Rendergraph/Passes 나머지·커스텀2D light blend/mask/cookie·volumetric·전체Unity/Unreal API와 미디어/독립 검증은 계속 별도 연구 대상이에요. 이 분석은 위 기능을 이미 전부 구현했다는 보고가 아니에요.
