# 2D 스프라이트 리그 · 2026-10-05

## 조사와 적용

Unity 2D Animation 13의 [Skinning Editor](https://docs.unity3d.com/Packages/com.unity.2d.animation@13.0/manual/SkinningEditor.html), [도구·단축키](https://docs.unity3d.com/Packages/com.unity.2d.animation@13.0/manual/SkinEdToolsShortcuts.html), [Sprite Skin](https://docs.unity3d.com/Packages/com.unity.2d.animation@13.0/manual/SpriteSkin.html), [SpriteSkin API](https://docs.unity3d.com/Packages/com.unity.2d.animation@13.0/api/UnityEngine.U2D.Animation.SpriteSkin.html)를 대조했어요. 이번 읽기는 뼈·메시·가중치·바인드 포즈·변형 정점 API와 관련 도구 본문 부분이에요. 패키지 전체 본문/API·영상 검증을 완료한 기록으로 세지 않아요.

Unreal의 [Paper 2D Sprite Editor](https://dev.epicgames.com/documentation/en-us/unreal-engine/paper-2d-sprite-editor-in-unreal-engine)의 분리 에셋 편집, 피벗·영역·렌더 형상·충돌·머테리얼 제작 구성을 대조했어요. 모든 Paper2D 기능/API를 구현하거나 읽었다는 의미는 아니에요. 2D 리그는 HBEngine 자체 데이터와 공용 실행기로 만들었어요.

## 에셋과 제작

콘텐츠 브라우저에서 `2D 스프라이트 리그`를 만들고 `.hbspriterig.json`을 전용 탭으로 열어요. 왼쪽은 뼈 계층, 가운데는 원본 스프라이트·메시·뼈 편집, 오른쪽은 선택 속성, 아래는 클립·시간·키 값이에요. 편집 중 긴 안내 문장을 반복하지 않아요.

- 뼈 생성·선택·이동·회전·크기·길이, 계층 드래그, 중간 분할, 하위 트리 삭제와 가중치 재배분을 제공해요. 부모 변경은 바인드 월드 변환을 유지하고 순환·전단이 필요한 연결을 거절해요.
- 메시 격자 생성, 정점 드래그·추가·삭제·사각 선택, 세 정점 면 생성, 공유 변 분할, UV 편집을 제공해요.
- 정점당 최대 4개 정규화 가중치, 뼈 선분 거리 기반 자동 배분, 더하기·빼기·지정·늘리기·줄이기 브러시, 이웃 정점 평활화와 개별 수치 편집을 제공해요. 자동 배분은 자체 거리 알고리즘이며 Unity의 자동 가중치 알고리즘과 같다고 주장하지 않아요.
- 바인드 데이터와 미리보기 포즈를 분리해요. 로컬 위치·회전·크기의 클립·선형/고정 키, 이름·길이·반복, 시간 탐색·재생·선택 뼈 키 추가를 저장해요. 음수/유한하지 않은 브러시 범위와 중복 키 시간 등을 검증해요.
- 우클릭/휠 버튼 드래그 이동, 커서 중심 휠 확대, `F` 전체 보기, Delete 삭제를 제공해요. Shift+Q/W/E/R/A/S/D/Z/N/1은 포즈/뼈/뼈 생성/뼈 분할/격자/정점/정점 추가/자동 가중치/브러시/포즈 복원이에요. Ctrl+C/V는 같은 에디터 JS 인스턴스 안에서 뼈·메시·클립을 복사하며 OS 클립보드나 독립 창 간 공유는 아직 아니에요.

`배치`는 SpriteRenderer와 SpriteSkin을 가진 장면 오브젝트를 만들어요. 이미지·메시·가중치가 준비되지 않은 작성 중 리그는 배치 전에 거절해요. 생성과 편집은 문서 실행 취소·다시 실행·저장 경로를 공유해요.

## 실행과 비용

SpriteSkin 컴포넌트의 `rig`가 에셋을 참조해요. 로컬 XY 월드 단위, 회전 도, UV 좌하단 기준을 사용해요. 표시 이름 대신 안정적인 뼈 ID를 데이터와 애니메이션 바인딩에 사용하며 한글 표시 이름도 조회할 수 있어요.

바인드 역행렬과 뼈 변환으로 CPU linear blend skinning을 계산해요. 정점 배열·행렬·가중치 인덱스를 재사용하고 뼈 포즈가 달라진 경우에만 정점과 렌더 경계를 다시 계산해요. SpriteRenderer의 반전·색·정렬·마스크·셰이딩 경로를 사용하며 텍스처 변경 때는 포즈/가중치를 유지한 채 geometry에 다시 연결해요. GPU 스키닝은 제공하지 않아요.

클립은 기존 Animator와 AnimationGraph가 읽는 실제 Three.js AnimationClip이에요. 그래프의 혼합·뼈 레이어와 동일 포즈 데이터를 사용해요. Editor Play, packaged Player, 화면 없는 runProject 모두 같은 SpriteRigPose를 사용해요. 에디터 리그 창은 실행 중 실제 연결 Actor의 뼈 값을 표시하고 작성 필드를 잠가요.

BP/C++에 공용 `SpriteSkin::Set/GetBonePosition`, `Set/GetBoneRotation`, `Set/GetBoneScale`, `Reset` 7개가 있어요. C++ setter 직후 getter는 요청 snapshot에 반영된 값을 읽어요. Reset은 실행기로 보내는 명령이므로 같은 C++ 호출 내부 후속 getter까지 즉시 복원되는 계약은 아직 아니에요. 전체 카탈로그는 현재 533개예요.

AI는 schema.spriteRig의 필드/도구/한도, assetTypes.spriterig 예제와 `rig.bone.add/remove/reparent/split`, `rig.mesh.grid/splitEdge`, `rig.weights.auto/paint/smooth/set`을 사용해요. expectedRevision·dryRun·검증·Undo/Redo·저장을 사람 UI와 공유해요. 일반 document.patch로 클립·UV 등을 수정해요. runtime.state의 spriteSkin은 요청할 때 포즈를 반환해요. clock/reset native 요청에 리그 전체를 매 프레임 직렬화하지 않아요. 참조 수집·rename·게임 패키징은 rig→sprite→texture 의존성을 따라가요.

한도는 뼈128/계층64, 정점16384, index98304, 클립64, 키8192, 정점당 영향4예요. 작성 중에는 빈 메시/가중치 draft가 가능하지만 실행 전 완전 검증이 필요해요. 이 한도는 대규모 탄막·모바일 FPS 보증이 아니에요.

## 검증과 이어갈 세부

`npm run test:sprite-rig`는 바인드 포즈·Actor 변환 상쇄·버퍼 재사용·가중치·브러시·평활화·변/뼈 분할·계층·혼합 키·그래프·공용 서비스·실제 C++·headless·원본 보존을 검사해요. 최신 근거 `native/build/sprite-rig-XvfOcd`예요.

`test:sprite-rig-editor-window`는 고유 프로젝트/프로필/포트의 화면 밖 비활성 Editor에서 물리 뼈 드래그·휠/이동·Undo/Redo·AI dryRun·키·이름·배치/복원·실행 잠금·실제 포즈를 검사해요. 최종 `sprite-rig-editor-4pSQeG`에서 저장 상태까지 Undo된 문서의 dirty 해제·정상 종료·검사 서버 정리도 통과했고 PNG를 확인했어요. `test:sprite-rig-player-window`의 release Player `sprite-rig-player-kFFO2l`에서 C++가 시작 위치를 보존하고 첫 Tick 전 한글 HUD를 바꿔 읽었으며, 90도 변형 정점과 실제 PNG의 4704개 마젠타 픽셀을 확인했어요. BP Reset·원본 보존·정상 종료·검사 서버 정리도 통과했어요. 사용자 설치본/원본/현재 창은 변경하지 않았어요.

2D IK·스프라이트 변형 깊이·PSD 다중 스프라이트 캐릭터·외부 뼈 재바인딩·GPU skin·양방향 일반 클립 변환·커브 편집/Undo 전문화는 후속 작업이에요. 2D 조명/그림자·타일 충돌 모양·입자 마스크, 다른 애니메이션/렌더링/프레임워크/모바일/배포 등 전체 누적 요구도 계속 유지해요. 이 문서가 전체 요구의 완료 판정은 아니에요.
