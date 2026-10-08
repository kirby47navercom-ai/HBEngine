# 골격 리타게팅 제작·실행·베이크 — 072

2026-10-08. 서로 다른 관절 개수·길이·기준 방향을 가진 골격 사이에 애니메이션을 전달한다. 기존 Animation Graph, 071 IK, 모델 가져오기, 공용 BP/C++ 서비스와 실제 Player를 사용한다. 단순 이름 변경이나 별도 계산 데모로 완료를 판정하지 않는다.

## 제작 흐름

콘텐츠 브라우저의 애니메이션 분류에서 골격 리타게팅 리그(RIG_), 리타게터(RT_), 골격 클립(SK_)을 만든다. 각각 `.hbretargetrig.json`, `.hbretarget.json`, `.hbskeletalclip.json`을 사용하며 전용 편집기와 문서 탭·Undo·Save를 공유한다. 저장·Undo 후 일반 빈 폼으로 바뀌던 편집기 갱신 경로도 등록했다.

리그에는 모델 참조, 이름 있는 시작~끝 뼈 체인과 기준 포즈를 저장한다. Bind는 불변이며 보정 포즈는 추가·복제·삭제·초기화하고 뼈별 위치/회전을 편집하거나 현재 골격에서 가져온다. 포즈 미리보기는 장면의 원본을 바꾸지 않는다. 모델 참조는 제작 메타데이터이며 런타임 모델은 대상 Actor의 MeshRenderer가 제공한다. 모델을 지정하는 것만으로 게임 Actor를 자동 생성하지 않는다.

리타게터에는 원본/대상 리그와 이름 있는 프로필을 둔다. 기본 프로필 지정·복제·삭제, 체인 검색·미매핑 필터와 정확한 이름/빈 매핑/유사 이름 매핑을 제공한다. 유사 이름은 단순 정규화·포함 비교이며 동점과 좌우 불일치는 자동 선택하지 않는다. Unreal의 전체 자동 골격 추론과 동일한 알고리즘이라고 표시하지 않는다.

프로필에서 원본/대상 기준 포즈, 시작 포즈(대상 기준/그래프 입력), 자동/수동 배율, 루트·골반 쌍, 위치 보정, 루트 이동·회전·모션 전달을 편집한다. 대상 기준 포즈는 모든 대상 뼈의 로컬 위치·회전을 복사한다. 입력 포즈 모드는 기존 클립/레이어의 입력을 유지한 뒤 지정한 체인의 FK/IK만 바꾼다. 노드 Alpha는 전체 결과와 입력 포즈를 마지막에 한 번 혼합한다.

## 포즈 계산과 수명

FK는 기준 체인의 누적 길이를 정규화해 원본 회전 변화와 대상 기준 방향을 대조한다. 관절 수가 다르면 길이 보간, 루트부터 1:1, 끝부터 1:1 또는 회전 미전달을 고른다. 1:1에서 남는 대상 관절의 회전은 대상 기준 방향이다. 위치는 시작 포즈 유지/기준 차이×배율/원본 컴포넌트 절대 위치이며 체인별 회전·위치 Alpha가 있다. 절대 체인 위치는 배율을 곱하지 않는다. 루트의 절대 위치 모드는 프로필 배율을 곱한다.

자동 배율은 지정한 골반의 기준 높이 비율, 골반이 없으면 매핑된 체인의 총 길이 비율이다. 수동 배율 또는 추가 배율을 함께 적용한다. Actor 배치/부모의 월드 이동은 이 컴포넌트 공간 비율에 섞지 않는다. 시작 배치 위치를 0으로 덮어쓰지 않는다.

체인 IK는 071 FABRIK를 재사용한다. 원본 끝~시작의 방향/길이를 대상 기준 길이에 맞추고 위치 보정·목표 위치/회전 가중치를 적용한다. 프로필별 계산 계층과 바인딩을 분리해서 기준 포즈를 바꿀 때 다른 프로필의 길이가 섞이지 않는다. 같은 프레임 입력의 뼈·부모 변환과 균일 크기도 솔버에 전달한다. 허용 오차/최대 반복과 잔여 오차/반복 수를 공개한다.

원본은 숨겨져 있어도 애니메이션을 먼저 갱신한다. 여러 리타게팅 Actor의 의존 순서를 정렬하며 순환은 시작/원본 변경 경계에서 거절한다. 원본이 삭제·정리·풀 비활성 상태면 입력 포즈를 통과시키고 `missingActor`를 표시한다. 원본 모델 인스턴스가 바뀌면 매핑을 다시 준비한다. 뼈 이름 중복, 끊어진 체인, 0 길이, 음수/비균일 크기, 잘못된 가중치·프로필·벡터는 거절한다.

기준 포즈는 모델 가져오기 때 약한 참조에 저장하고 복제 때 전달한다. 원본 골격이나 원본 클립을 수정하지 않는다. 포즈와 벡터/Quaternion 버퍼는 재사용하고 종료 때 참조·IK 계층을 정리한다. 리타게팅이 없는 월드는 Actor 정렬을 생성하지 않는다. 리타게팅이 있는 월드의 매 프레임 의존 목록과 관절별 계층 갱신 비용은 아직 남는다. 긴 골격의 계층 갱신은 O(n²)이며 측정 결과가 필요하면 일괄 컴포넌트 변환으로 교체한다.

루트 모션은 원본 그래프의 마지막 프레임 델타를 배율·노드 Alpha로 전달한다. 대상 `all`/`ignore` 모드에만 적용하고 `none`/`montages`에서는 원본 그래프 모션을 추출하지 않는다. 현재 계산은 공용 CPU 포즈 실행기이며 C++ SDK는 같은 서비스에 연결된다. 새 DirectX 네이티브 리타게팅 커널이나 전체 GPU 애니메이션 완료를 뜻하지 않는다.

## 미리보기와 베이크

원본·대상 Actor와 원본 모델 클립을 선택해 별도 월드에서 재생·정지·시간 이동한다. 일반 Animation Graph 미리보기에서도 참조 원본의 AnimationGraph/Animator를 유지하고 원본 모델 복제를 생략하지 않는다. 게임 이벤트·물리·오디오 실행은 제외한다. 실제 실행 중에는 제작 변경/베이크를 잠그고 실행 상태를 표시한다.

베이크는 원본/대상 골격을 별도로 복제해 현재 프로필로 샘플링한 로컬 position/quaternion 트랙을 새 SK_ 에셋에 저장한다. FPS와 시작/끝 범위를 지정하며 마지막 샘플을 포함한다. 부동소수 계산으로 끝 키가 중복되던 경우를 확인했다. 일정 샘플마다 UI에 실행 기회를 주며 8M 값의 저장 메모리 경계를 넘으면 범위를 줄이도록 오류를 돌려준다. 이 경계는 장면 오브젝트 개수 제한이 아니다. 저장한 클립은 기존 Clip 노드에서 원본 Actor 없이 재생한다. 이벤트·모프 커브 베이크는 아직 별도 작업이다.

## BP·C++·AI

`hb::AnimationGraph`의 다음 함수와 BP 노드가 같은 런타임을 사용한다.

| C++ 함수 | BP ID | 입력/반환 |
| --- | --- | --- |
| SetRetargetSource | animGraphRetargetSource | 대상 Actor, 노드 이름/ID, 원본 Actor(null은 해제) |
| SetRetargetProfile | animGraphRetargetSetProfile | 프로필 이름/ID |
| SetRetargetWeight | animGraphRetargetWeight | Alpha 0~1 |
| GetRetargetScale | animGraphRetargetScale | 최신 노드 계산의 배율 |
| GetRetargetProfile | animGraphRetargetProfile | 최신 노드 계산의 프로필 이름 |

노드 이름/ID는 고유해야 하며 프로필 이름과 다른 프로필 ID의 충돌도 에셋 검증에서 거절한다. C++ 설정은 기존 프레임 경계의 명령을 사용하고 Getter는 최신 공개 계산 상태를 읽는다. 뒤의 레이어가 최종 포즈를 바꿀 수 있다. AI schema에 에셋 종류·확장자·프로필/체인/노드 기본값·모드·함수 계약을 추가했고 동일 `document.patch`/`dryRun`/`expectedRevision`, Undo와 Save를 사용한다. 별도 AI 실행기를 추가하지 않는다.

## 검증과 기록

`npm run test:animation-retarget`는 3→5 관절 보간, 두 1:1 모드, FK/IK·배율/루트, 대상 기준/입력 포즈, 프로필별 IK 길이·동일 프레임 크기, 원본 보존·100회 비누적·풀 비활성·순환, 공용 서비스 순서, 모션 혼합/모드, 베이크→공통 Clip 재생, 범위/중복/잘못된 입력과 정리를 확인한다.

`test:animation-retarget-editor`와 `test:animation-retarget-player`는 고유 임시 프로젝트/프로필/포트의 실제 Win32/WebView2 창을 사용한다. 가져온 glTF의 숨겨진 원본, 실제 렌더용 뼈 바인딩, C++ 설정/BP 조회→C++ 값 일치, 정지/재개·배치 보존을 확인한다. 편집기 검사에는 리그/프로필 편집·Undo·저장·잘못된 dryRun의 revision 보존·미리보기·새 베이크 파일 저장이 포함된다. 원본 바이트 보존, 오류0, 종료0, 소유 서버 정리와 제품 SHA는 [072 증거](research/ANIMATION_RETARGET_072.json)에 남긴다. 초기 접속 시간초과와 Save/Undo 갱신 오류 기록도 보존한다.

기존 애니메이션·상태·Sync·Blend Space·몽타주·씬/에셋·710 BP 노드/625 C++ 연결 함수(계산289·서비스336) 검사를 함께 유지한다. 실제 휴대폰/iOS/전체 게임 FPS·장시간 RAM 검사는 이번 결과로 승격하지 않는다. 사용자 설치본 갱신은 누적 선행 작업 뒤의 순서를 유지한다.

## 직접 읽은 근거와 남은 세부

[UE IK Rig Retargeting](https://dev.epicgames.com/documentation/en-us/unreal-engine/ik-rig-animation-retargeting-in-unreal-engine)의 자체 311줄과 [Runtime Retargeting](https://dev.epicgames.com/documentation/en-us/unreal-engine/runtime-ik-retargeting-in-unreal-engine)의 자체 61줄에서 리그·체인·기준 포즈·제작 창과 숨겨진 원본 갱신 요구를 대조했다. 연결된 페이지/미디어/엔진 C++ 구현 본문은 미독이다.

[UE 5.8 Operation Stack](https://dev.epicgames.com/documentation/en-us/unreal-engine/retargeting-operation-stack-in-unreal-engine-5-8)의 자체 0~1001줄과 표를 읽었다. 순서 있는 연산과 Override Sets, FK/IK·기준 포즈·루트/골반·커브·고정/필터·Stride/Speed Plant·공간 접촉을 구분했다. HB의 현재 고정 계산 순서를 UE의 임의 Op Stack 편집기로 표시하지 않는다.

[FRetargetChainMapping](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/IKRig/FRetargetChainMapping)의 자체 62줄 선언/필드/메서드 요약, [GetChainMapping](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/IKRig/UIKRetargeter/GetChainMapping)의 선언/설명과 5.6 폐기 안내를 읽었다. [FAnimNode_RetargetPoseFromMesh](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/IKRig/FAnimNode_RetargetPoseFromMesh?lang=en-US)의 자체 135줄에서 원본 선행 Tick, 프로필/Override Sets, 입력 포즈, 재사용 버퍼와 LOD 필드를 확인했다. 실제 함수 구현·연결 API는 미독이다.

[Unity Retargeting](https://docs.unity3d.com/6000.0/Documentation/Manual/Retargeting.html)의 자체 126~197줄, [Avatar Setup](https://docs.unity3d.com/6000.0/Documentation/Manual/AvatarCreationandSetup.html)의 자체 125~191줄, [Configuring Avatar](https://docs.unity3d.com/6000.0/Documentation/Manual/ConfiguringtheAvatar.html)의 자체 126~277줄, [Avatar Mapping](https://docs.unity3d.com/6000.0/Documentation/Manual/class-Avatar.html)의 자체 126~175줄을 읽었다. 필요한/선택적 Human 본, T/Bind 포즈·매핑 템플릿과 컨트롤러/게임 Actor 재사용을 대조했다. Muscle API·Mecanim 내부와 연결 미디어는 미독이다.

읽은 10주소의 원문 캐시 SHA와 읽기 범위를 증거에 기록했다. 발견 원장에는 Unreal 신규6·Unity 기존4의 출처를 반영했으며 다운로드를 원장 본문 검토/전체 분석으로 승격하지 않았다. 설치된 Three SkeletonUtils의 retarget 관련 앞부분을 참고했지만 전체 파일 분석으로 세지 않았다.

남은 리타게팅 세부에는 임의 연산 스택/Override Set 조합, 여러 Source Pose 모드·컴포넌트 선택, LOD별 FK/IK, Human Avatar/Muscle·자동 T포즈/템플릿, 관절 제한, 커브/모프 전달과 베이크, Speed Plant·Stride/Pole Vector/핀·필터·공간 접촉·루트 생성, 2D SpriteSkin 전용 리타게팅, 모바일 실증이 있다. Full Body IK/Control Rig와 `WORK_ORDER_051`의 다른 분야 요구도 유지한다. 전체 Unreal/Unity 분석이나 누적 엔진 목표 완료로 표시하지 않는다.
