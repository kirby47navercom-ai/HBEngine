# 애니메이션 동기화·마커·알림 · 2026-10-05

후속: [구간 알림·이벤트 인자](ANIMATION_NOTIFIES.md)의 Begin/Tick/End·범위/손잡이 편집·자료형 인자·콜백 취소/정리·실제 Editor/Player C++ 연결을 추가했어요. 아래 구간/인자 미지원 표시는 최초 단일 알림 추가 당시의 기록이에요.

## 공식 근거와 읽기 경계

[Epic Sync Groups](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-sync-groups-in-unreal-engine)의 기술 본문0–106을 다시 읽고 그룹·리더 역할·길이/마커 동기화·알림 발생을 대조했어요. [Animation Notifies](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-notifies-in-unreal-engine)의 기술 본문0–260을 읽었어요. 단일 알림과 구간 알림·최소 가중치·팔로워·몽타주 알림·편집/실행 속성을 구분했어요. 링크된 클래스/API 전체나 그림·영상까지 읽은 것으로 세지 않아요.

[Unity6000.0 가져온 클립의 Animation Events](https://docs.unity3d.com/6000.0/Documentation/Manual/AnimationEventsOnImportedClips.html)의 기술 본문과 [AnimationEvent](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/AnimationEvent.html)의 설명·예제·자체 속성/생성자 요약을 읽었어요. 개별 연결 API는 미독이에요. 원문·추출 본문·SHA256·읽기 경계는 `native/build/animation-sync-docs-4WgC0C/manifest.json`에 보존해요. 전체 문서/API 원장 완료로 승격하지 않아요.

## 제작과 데이터

Sequence Player의 속성에서 동기화 방식(None/Group/Graph), 그룹 이름과 리더 역할을 편집해요. Sync 노드는 입력 포즈의 Graph 방식 클립에 그룹을 전파해요. 명시적 Group 클립은 자신의 그룹을 유지해요. 포즈 노드는11종이고 공용 블루프린트 카탈로그는560개예요.

마커·단일 알림은 현재 각 Sequence Player 노드에 안정적 ID로 저장해요. 마커는 이름/시간, 알림은 이벤트 이름/시간/최소 가중치/팔로워 발생 여부를 가져요. 클립이나 스켈레톤 전체에 공유하는 알림 에셋은 이번 저장 계약에 포함하지 않아요. 예전 파일의 생략된 필드는 동기화/알림 없음으로 호환해요.

상세 타임라인에서 키를 드래그하거나 우클릭 위치에 추가해요. Ctrl 드래그는60Hz 간격, 좌우 키는1프레임, Shift 좌우 키는10프레임, Enter는 해당 속성 입력, Delete는 선택한 마커/알림만 삭제해요. 추가/삭제·속성 변경은 문서의 Undo/Redo/저장을 사용해요. 같은 선택의 속성을 바꿀 때 스크롤과 펼친 구역을 보존해요. 실행 중 편집은 잠그며 독립 미리보기에서 그룹·리더·위상을 읽어요. SVG 타임라인/1D 차트가 전역14px 아이콘 규칙에 눌리던 오류도 고쳤어요.

## 실행 계약

포즈 기여도를 먼저 계산한 뒤 그룹 시계를 맞추고 포즈를 샘플링해요. 공유 클립/상태는 한 Tick에서 한 번 진행해요. 일반 후보는 가장 큰 기여도가 리더이고 동률은 평가 순서, 강제 리더는 마지막 후보, 팔로워만 있으면 첫 후보예요. 전이 역할은 완전한 가중치가 된 후 그룹에 참여하고 완전히 빠지기 전까지 참여를 유지해요. 비관련/재진입은 참여 준비를 초기화해요.

리더가 바뀌면 직전 그룹 위상에 새 리더를 맞춘 후 이번 시간만 진행해요. 모든 참여자의 공통 마커 이름과 순서가 맞으면 구간 비율을 맞춰요. 반복된 이름 쌍은 가까운 위치를 선택한 후 지난 마커 구간 수를 보존해요. 맞는 구간이 없으면 그룹 전체를 클립 길이 비율로 맞춰요. 반복 시 절대 시계를 유지하고 샘플 시만 감싸며, 비반복은 끝에서 제한해요. 가중치는 포즈 가지의 기여도이며 뼈별 root motion/곡선 가중치 계약으로 확대하지 않아요.

단일 알림은 지난 시각보다 뒤이며 현재 시각까지인 경계를 발생시켜요. 처음 평가한 시작 시각의 알림은 한 번 발생해요. 반복의 여러 경계를 시간 순서로 정렬하며 최소 가중치와 팔로워 옵션을 적용해요. 일시정지는 시계를 진행하지 않아요. 알림은 Actor의 같은 이름 Custom Event로 전달돼 기존 블루프린트·사용자 C++ 호출을 사용할 수 있어요. 콜백이 그래프를 정지/교체하면 이전 그래프의 남은 알림을 전달하지 않아요.

알림 payload는 phase/notify/clip/context/group/time/cycle/weight예요. 현재는 구간 Begin/Tick/End, 사용자 지정 함수 인자, 알림 확률/LOD/필터·공유 스켈레톤 알림·사운드/입자 전용 알림·몽타주 Branching Point와 같은 후속이 필요해요. 단일 알림 구현을 이 모든 세부의 완료로 세지 않아요.

## 사람·AI·블루프린트·C++

`hb::AnimationGraph::GetSyncLeader/GetSyncPhase/GetSyncMode`와 생성된 BP3개가 같은 처리된 실행 상태를 읽어요. Leader는 표시 이름이 아닌 안정적 클립 노드 ID, Phase는0–1, Mode는 markers/length예요. 아직 활성 그룹이 없거나 이름이 잘못되면 명시적으로 거절해요. 이름은 노드 목록/snapshot에서 찾아요.

`schema.animationGraph.sync`는 실제 방식/역할/기본값/한도·시계/조회 계약을 제공해요. `document.patch`는 사람과 같은 검증·expectedRevision·dryRun·Undo/Redo·저장을 사용해요. `runtime.state.objects[].gameplayDebug.animationGraph.syncGroups`는 그룹·리더·마커 구간/비율·참여자/가중치/실제 시계를 제공해요. 저장 데이터에 디버그 snapshot을 섞지 않아요.

## 한도와 검증

클립별 마커/알림64개, 한 프레임의 마커 경계/이벤트4096개 제한을 검사해요. 시간은 클립 길이보다 짧아야 하며 마커 ID/시간, 알림 ID 중복을 거절해요. Graph 방식의 누락/모호한 그룹도 실행 전 거절해요. 기존 문맥2048·포즈 메모리64MiB 한도를 유지해요. 노드별 포즈 버퍼와 정렬한1D 샘플은 재사용해요. 프레임 계획의 Map/목록까지 무할당이라고 주장하지 않아요.

- `test:animation-sync`: 리더/전이 역할·교체·반복 마커·길이 대체·단일 알림 순서/팔로워/최소 가중치·정지·공유 DAG·상태 시계·2D 스프라이트/배치 보존·한도를 검사해요.
- 최종 실제 Editor `animation-sync-editor-I2DJmg`: 물리 키 드래그/키보드/우클릭·속성 스크롤·AI dryRun/patch/Undo·독립 미리보기·BP3개·컴파일 C++3개·Footstep→사용자 C++ 카운터·뼈/GPU·pause·원본 보존·exit0/소유 서버 정리를 통과했어요. 타임라인 PNG를 확인했어요.
- release Player `animation-sync-player-wkAJuF`: 실제 키→BP→사용자 C++ 조회/변경·알림 카운터·포즈/동기화·pause·원본·exit0/소유 서버 정리를 통과했어요. 마지막 전이 역할의 blend-out 참여 보강은 코어로 검사했고 두 실제 fixture의 canLeader 경로는 바꾸지 않아요.
- main/API/integration/runtime/startup 및 포즈/상태 회귀를 통과했어요. 실제 startup C++ 첫 프레임 HUD/배치 위치 근거는 `startup-state-TaqWsk`예요.
- `animation-sync-cost-OP3EhY/cpu-cost.json`의 한 Actor/두 트랜스폼 클립, 워밍업 후5×1000 Tick에서 중앙 Tick은 미동기화0.0061978ms·동기화0.007508ms였고 포즈120bytes/버퍼 재사용을 유지했어요. 이는 작은 CPU 검사이며 전체 FPS/메모리·대규모 캐릭터/모바일 실측이 아니에요.

실패03R2Wq는 fixture의 잘못된 type 조회, yT66QH/LzRgFC는 실제 SVG 크기 오류, 0jrO4q는 마우스 정수 픽셀의 실제 시각과 이상적 시각을 섞은 시험 오류였어요. 원본과 실패 기록은 보존하고 최종 성공과 구분해요. 사용자 설치본/프로필/게임/현재 창은 변경하지 않았어요. 전체2D·2.5D·3D/렌더/월드/게임/AI/C++/UI/오디오/모바일/배포·가벼움 요구를 계속 유지해요.
