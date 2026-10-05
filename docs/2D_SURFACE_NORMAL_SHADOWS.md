# 2D 표면·노멀 텍스처·광원 그림자

2026-10-05. 스프라이트/타일맵의 기존 GPU 렌더 경로에 연결한 자체 계약이에요. 전체 Unreal/Unity 분석이나 DirectX11·모바일 렌더 검증의 완료를 의미하지 않아요.

후속 [전용 Light2D](2D_LIGHTING.md)에서 shading=lit2d와 Global/Point/Spot·레이어/Z 무시·노멀 모드를 연결했어요. 아래 lit/그림자 설명과 당시 검증은 기존3D 광원 경로의 기록이에요.

## 직접 확인한 출처

- [Epic 5.8 Paper 2D Sprite Material](https://dev.epicgames.com/documentation/en-us/unreal-engine/paper-2d-sprite-material-in-unreal-engine?application_version=5.8): 웹 리더 접근은 실패했지만 공식 서버의 렌더된 HTML에서 소개·8개 표 행·Custom Sprite Materials 본문을 직접 읽었어요. Lit/Unlit과 Opaque/Masked/Translucent 조합, 알파 경계/연속 투명도·투명 배경의 검정·투명 재질 비용을 대조했어요. 그림과 연결 Material Editor/Niagara 문서는 미독이에요.
- [Unity 6000.0 Secondary Textures](https://docs.unity3d.com/6000.0/Documentation/Manual/urp/SecondaryTextures.html): 기술 본문126–210을 읽었어요. 별도 노멀/조명 마스크 텍스처·같은 UV·데이터 텍스처의 sRGB 해제·기본 Lit 재질 이름·Light2D normal 거리/품질·추가 패스 비용을 대조했어요. 조명 마스크는 SpriteMask의 숨김/표시와 다른 기능이에요. 그림은 캡션만 확인했고 연결 API/영상은 미독이에요.
- [Unity Light2D 제작](https://docs.unity3d.com/6000.0/Documentation/Manual/urp/2d-light-properties-explained.html) 기술126–175와 [ShadowCaster2D 제작](https://docs.unity3d.com/6000.0/Documentation/Manual/urp/2DShadows.html) 기술127–164를 읽었어요. 광원/오브젝트 Z를 무시하는 전용 조명, 정렬 레이어 대상, 윤곽 편집·부모 복합 캐스터를 추가 구현 대상으로 구분해요.
- [URP17 Light2D API](https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@17.0/api/UnityEngine.Rendering.Universal.Light2D.html)의 자체7개 속성 lightType/normalMapDistance/normalMapQuality/pointLightInnerAngle/InnerRadius/OuterAngle/OuterRadius 선언·요약674–861 일부를 읽었어요. 나머지/상속 API는 미독이에요.
- [Epic Sprite Editor](https://dev.epicgames.com/documentation/en-us/unreal-engine/paper-2d-sprite-editor-in-unreal-engine?application_version=5.8)의 DefaultMaterial/AdditionalTextures 속성은 검색 발췌만 확인했어요. 전체 본문 읽기로 세지 않아요.

원문·응답·redirect·SHA·읽기 경계는 Git에서 제외한 `native/build/2d-surface-docs-SZdfzn/manifest.json`에 보존해요. Unity SecondaryTextures는 요청한 add-secondary 주소에서 위 URP 페이지로 redirect됐어요. 현재 corpus 전체 분모/gate는 승격하지 않아요.

## 제작·호환

SpriteRenderer/TilemapRenderer의 공용 속성 정의를 속성 창, 블루프린트 컴포넌트, AI schema/패치, 런타임 검증이 함께 사용해요.

| 속성 | 값/동작 |
| --- | --- |
| shading | 기존 unlit/lit; unlit은 노멀 텍스처를 읽지 않아요. |
| blendMode | opaque / masked / translucent. 없는 필드는 기존 반투명 동작을 유지해요. |
| alphaCutoff | 0..1, 기본 .5; masked 색상과 불투명 이외의 그림자 윤곽에 적용해요. |
| normalTexture | 상대 파일 경로; 컴포넌트 값이 없으면 sprite/sheet/tilemap 에셋 값을 상속해요. |
| normalStrength | 0..16, 기본1. 0은 평평한 법선이에요. |
| normalFlipY | 기본false; 음의 Y 노멀맵을 반전해요. |
| castShadow / receiveShadow | 기본false. unlit도 그림자를 만들 수 있고, 받기는 Lit에서 작동해요. |

새 sprite/tilemap 에셋은 선택 필드 normalTexture를 기본 빈 값으로 만들어요. 기존 버전1 JSON은 필드가 없어도 유효해요. 시트의 분할 자식은 시트의 노멀 참조와 같은 안정적 sliceId/영역을 사용해요. 자식의 노멀 참조 입력은 상속값을 보여주며 원본 시트 또는 독립 전환에서 수정해요.

스프라이트/타일맵 제작기에 노멀 텍스처 선택이 있고, 스프라이트 도구막대의 표시는 색상/노멀맵이에요. 노멀 표시도 원본 색상 이미지 좌표/피벗/테두리/자르기 기준을 유지해요. 서로 다른 해상도의 보조 이미지는 같은 정규화 UV로 보여요. 표시 변경은 에셋 데이터나 Undo/revision을 바꾸지 않아요. 늦게 끝난 이미지 요청이 최신 표시를 덮지 않아요.

normalTexture는 프런트 참조 재작성과 서버 의존성/재가져오기/redirect·빌드 의존성에 포함해요. Assets 밖의 실제 참조도 게임 패키지에 들어가요. 코드의 임의 동적 문자열을 모두 자동 발견한다는 뜻은 아니에요.

## 실제 렌더 계약과 비용

Lit은 기존 MeshStandardMaterial, Unlit은 MeshBasicMaterial을 사용해요. 색상 텍스처는 sRGB, 노멀은 NoColorSpace 데이터이며 같은 atlas offset/repeat를 사용해요. simple/9-slice/tiled 및 프레임 전환에서 이 좌표를 유지해요. 노멀의 녹색 반전과 강도를 실제 normalScale에 적용해요.

Opaque는 알파 혼합/알파 discard가 없고, Masked는 기준 아래 픽셀을 버려요. 둘 다 깊이를 써요. Translucent는 기존 연속 알파 혼합·깊이 쓰기 해제를 유지해요. PNG/canvas에서 알파0의 RGB가0이면 Opaque는 검정으로 보여요. Opaque/Masked와 Translucent는 렌더 큐가 달라서 정렬 그룹만으로 모든 깊이/교차 순서를 해결하지 않아요.

방향/점/스포트 등 기존 **3D 광원의 그림자 맵**을 사용하는 스프라이트/타일 표면이에요. 전용 URP Light2D/ShadowCaster2D와 구분해요. 이 경로의 광원 위치/Z는 실제 3D 거리와 방향에 영향을 줘요. 방향/스포트용 depth와 점 광원용 distance 재질을 캐스터가 켜졌을 때만 만들어요. 반투명 그림자는 같은 alphaCutoff의 이진 윤곽이며 투과 광량 그림자는 아니에요. SpriteMask의 화면 마스크는 색상 패스에 적용하고 이 그림자 윤곽에 합성하지 않아요.

설치된 Three WebGLShadowMap은 사용자 지정 그림자 재질에도 색상 재질의 alphaTest를 복사해요. 그래서 onBeforeShadow에서 그림자의 기준을 복원해요. billboard는 그림자에서도 게임 카메라 방향을 사용하고 변환 행렬을 같은 그리기 전에 갱신해요.

원본 색상/노멀 캐시는 스프라이트 오브젝트당 합계32개 LRU예요. 프레임별 복제 맵/재질/형상·depth/distance는 교체/제거 때 해제해요. 타일맵은 기존 레이어당 하나의 메시를 유지하고 노멀 맵을 공유해요. 사용하지 않는 노멀과 꺼진 캐스터는 추가 텍스처/그림자 재질을 만들지 않아요. 이 비용 제한은 전체 FPS나 모바일 발열 측정의 근거가 아니에요.

## 같은 C++/블루프린트 함수

| C++ | 노드 키 |
| --- | --- |
| Sprites::SetBlendMode / GetBlendMode | spriteSetBlend / spriteGetBlend |
| Sprites::GetAlphaCutoff | spriteGetAlphaCutoff |
| Sprites::SetNormalMap / GetNormalMap | spriteSetNormal / spriteGetNormal |
| Sprites::SetShadows / GetShadows | spriteSetShadows / spriteGetShadows |

```cpp
hb::Sprites::SetLit(this, true);
hb::Sprites::SetBlendMode(this, "masked", .5f);
hb::Sprites::SetNormalMap(this, "Assets/HeroNormal.png", 1.5f, false);
hb::Sprites::SetShadows(this, true, true);
std::string texture;
float strength;
bool flipY;
hb::Sprites::GetNormalMap(this, texture, strength, flipY);
```

GetNormalMap은 컴포넌트 override 설정을 반환해요. 빈 texture는 에셋 상속을 뜻하며 활성 에셋의 해석된 경로 조회와 달라요. 노멀을 끄려면 강도0 또는 Unlit을 사용해요. 기존 SetLit/GetColor/GetSize 등과 같은 서비스/대기 중 쓰기 모델을 사용해서 한 C++ 호출 안의 쓰기 후 읽기가 즉시 일치해요. 자료형/범위/상대 경로를 JS/C++에서 검사하고 잘못된 변경을 기록하지 않아요. 기본 블루프린트 카탈로그는573개, 공통 계산 API289개예요.

## 검증 기록

- `node tools/check-authoring-window.mjs`: 실제 개발 Editor XORaAp에서 물리 키 노멀 참조 선택·Undo/Redo·색상/노멀 표시·분할 상속/저장, 기존 타일/충돌/단축키와 GPU49개를 확인했어요. sprite-normal.png와 surface-gpu.png를 직접 보았어요.
- GPU 단독 Editor gVRxKE도49개를 통과했어요. 색상/노멀 colorSpace·crop/cache/복제 해제·프레임/9-slice/tiled·강도/Y·Unlit 미로드·세 혼합/깊이·마스크 공존·방향/점 그림자·타일 노멀/최신 요청·stale sprite/셰이더를 포함해요. 추가 표면 검사는28개예요.
- 방향 그림자 픽셀은 clear228/shadow0/캐스터 해제228, 점 그림자는229/0/212였어요. 숫자는 지정64×64 장면의 빨강 채널이며 성능 수치가 아니에요.
- 코어 `check-2d-extensions`, `check-2d-workflow`, `check-2d-authoring`, `check-engine-integration`, `check-scene-runtime`, `check-sprite-rig`, `check-sprite-ik`, `check.mjs`, API 생성 일치와 diff 검사를 확인했어요.
- sBuiuu는 Opaque의 알파0 RGB 기대값을 잘못 쓴 검사였어요. jJ71fw는 그림자 기준 덮어쓰기였고 GPU 수정 검사로 해결됐어요. okKqXQ는 분할 출력 중 두 번째 임시 파일이 기본 에셋 상태에서 멈췄어요. 토스트 기록을 추가한 XORaAp에서는 같은 제작 과정이 통과했지만 이 한 번의 출력 실패 원인을 확정하지 않아요.

- `node tools/check-authoring-window.mjs --player`: 실제 배포 Game.exe v29dli에서 BP 설정→C++ 즉시 조회/노멀·그림자 설정→BP 노멀 반환 핀→C++ 인자 조회를 통과했어요. 두 native 검증 값 true·배치 위치 [2,-1,.25]·실제 MeshStandardMaterial·96×32 linear 노멀·scale[1.5,-1.5]·cast/receive·혼합/깊이를 확인하고 player-surface.png를 직접 보았어요.
- Assets 밖 Source/SurfaceNormal.png의 패키지 포함, 배포 렌더러의 같은 GPU49개·예외0·원본 바이트 보존·exit0·소유 서버 종료를 확인했어요. 표면 테스트 모듈은 검사 때 주입하며 배포 패키지에는 넣지 않아요.
- Player sLPgVT는 handshake 전 shell 증거를 읽던 검사 순서 오류, xxymzZ는 nativeFields 대신 실제 nativeProperties를 읽어야 했던 검사 필드 오류예요. 수정한 v29dli가 통과해요.

사용자 설치본·게임 원본·프로필·창을 바꾸지 않아요.

## 계속 연결할 세부

전용 Light2D 타입/정렬 레이어 대상·Z 무시·normal 거리/품질·조명 마스크/블렌드 스타일·볼류메트릭·윤곽/복합 ShadowCaster2D, 커스텀 스프라이트 노드 머테리얼/보조 텍스처 목록·Material Function, SpriteMask와 그림자 합성·파티클 마스크·실제 뷰포트 옵션/디버그, DirectX11/HLSL·모바일 기기 비용을 계속 구현해요. 2D만으로 전체 엔진 요구를 대체하지 않아요.
