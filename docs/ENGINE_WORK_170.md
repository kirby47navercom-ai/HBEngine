# 170 — 프리팹 구조·UV 저작·IK·가상 음성·타일 조회

기준 `b5d240f`, 2026-10-16. 누적 원장에 남은 제작·실행 세부를 이어 구현한다. [현재 원장](ENGINE_STATUS.md)과 [실행 근거](research/ENGINE_WORK_170.json)를 함께 따른다.

## 프리팹 구조와 변형

프리팹의 외부 자식을 ‘자식 변경 포함’으로 연결 인스턴스에 포함한다. 안정 로컬 ID와 월드 ID 대응을 추가하며 원본은 아직 바꾸지 않는다. 추가·삭제한 직접 자식은 속성 창에서 적용/복원할 수 있다. ‘모두 적용’은 속성과 구조를 하나의 원본·장면 파일 변경으로 묶어 기존 원자 Undo/Redo를 사용한다. 원본 revision과 장면 revision을 다시 검사하고 영향을 받는 다른 인스턴스도 기존 3방향 병합으로 갱신한다. 루트 배치 위치·회전은 유지한다.

구조 복원에서 외부 자식이 고아가 되면 부모를 먼저 옮기도록 거부한다. 다른 프리팹은 자동 흡수하지 않는다. 중첩 확장 ID의 구조 변경·중첩 프리팹 포함은 현재 원본 편집을 요구하며 별도 stage와 중첩 대상 선택은 남아 있다.

변형 프리팹의 상속 컴포넌트 수정은 `['components',stableId,'properties',key]`로 저장한다. 부모 배열 순서가 바뀌거나 다른 컴포넌트가 추가돼도 대상이 유지된다. 컴포넌트 추가와 `remove:true` 삭제도 같은 안정 경로를 사용한다. 예전 배열 인덱스/전체 필드 오버라이드는 계속 읽는다. 상속한 부모 아래에 새 자식을 두는 변형은 부분 자료 검증과 최종 해석 후 계층 검증을 구분한다.

## 메시 UV 제작

메시 편집기에 3D/UV 전환을 추가했다. UV 화면에서 면/연결 섬을 선택하고 드래그해 이동한다. Ctrl 선택, Ctrl+A, F 프레이밍, 오른쪽/가운데 버튼 팬과 포인터 중심 휠 확대를 지원한다. 드래그 도중에는 미리보기만 바꾸고 놓을 때 한 번의 검증·Undo를 만든다. UV 화면에서는 숨겨진 3D 렌더를 반복하지 않고 캔버스도 입력·크기 변경 때만 그린다.

선택 면 분리는 외부와 공유하는 정점을 복제하면서 위치·노멀·색·UV를 보존한다. UV Transform은 이동/회전/크기, 섬 펼치기는 주요 평면 투영, 섬 패킹은 종횡비를 유지하는 결정적 shelf 배치와 공통 배율 탐색을 사용한다. UV 여백과 결과 범위를 검사하고 원본은 실패 시 유지한다. 섬은 인덱스를 공유한 간선의 연결 성분이다. 일반 곡면 LSCM/ABF, 서로 다른 노멀 분할의 seam stitch, 최적 회전 패킹이나 모든 모델링 연산을 완료한 것은 아니다.

## 다중 IK 세부

기존 고정 루트 위치를 기본값으로 유지한다. 새 설정으로 입력 포즈 고정, 먼저 당기기, 반복 자유 이동을 선택한다. 루트 당김·최대 이동·루트 위치 강성으로 이동을 제한한다. 목표별 회전·회전 가중치를 추가하고 대상 액터 좌표계와 함께 해석한다. 뼈별 회전 강성, 선호 회전의 초기 편향과 기존 XYZ 제한/제외 뼈를 사용한다. 강성1과 고정 루트는 회전을 잠근다. 전역 Alpha는 위치와 회전에 한 번 적용한다.

뼈 설정은 추가/삭제와 뼈 선택·강성·선호 XYZ 입력으로 편집한다. 루트 이외의 위치 강성은 허용하지 않는다. 늘이기·일반 관절 위치 해법·독립 Control Rig stage/컨트롤 기즈모/베이크는 별도다. HB 공유 CCD의 확장이며 Unreal PBIK와 같은 구현으로 표현하지 않는다.

C++ `AnimationGraph::SetIKEffectorRotation/SetIKEffectorRotationWeight/SetIKRootSettings`와 같은 블루프린트 노드가 공용 서비스를 호출한다. `rootMotion` 진단은 이 솔버의 루트 이동량으로, 캐릭터 이동을 구동하는 클립 Root Motion과 별개다.

## 음성 예산과 가상화

기본 실제 음성32·전체 추적1024를 설정 가능한 예산으로 둔다. AudioListener 컴포넌트와 생성 메뉴에서 수신 위치와 예산을 지정한다. AudioSource/오디오 에셋의 우선순위0–256은 작은 값이 우선이다. 같은 우선순위에서는 거리 감쇠·볼륨, 기존 실제 음성과 안정 생성 순서를 사용한다. C++/블루프린트 SetVoiceBudget/SetPriority/GetRealVoiceCount/GetVirtualVoiceCount와 런타임 오디오 진단을 연결했다. 원래 고정64개 오류는 설정한 추적 예산 검사로 바꿨다.

관리 음성은 기존 PCM 디코드 캐시32MiB와 같은 URL의 진행 중 디코드를 공유한다. 가상 음성에는 재생 소스·공간음·계측 노드를 붙이지 않는다. 시계·피치·반복·탐색·종료는 유지하며 승격 시 해당 위치에서 새 소스를 시작한다. 실제 음성에서 내려오면 소스와 연결을 끊고 제한된 기존 계측 풀을 재사용한다. 가상 재생 자체는 장치 재개를 기다리지 않는다. 같은 호출에서 재생 직후 우선순위를 바꿔도 비동기 준비에 누락되지 않도록 대기 설정과 실제 경로를 함께 갱신한다.

PC 배경음과 명시적으로 가상화를 끈 스트리밍 음성은 우선 배정한다. 예산0 또는 자리가 없으면 출력 경로를 내려놓지만 스트리밍 디코더까지 제거하지는 않는다. 모바일의 기존 PCM 재생은 유지한다. 실제 소리 크기 추정은 DSP 출력 전체/마스킹의 지각 모델이 아니며, 활성 음성·디코드는 캐시 외부에서도 PCM을 소유할 수 있다. native DSP/모바일 실기기 음질과 전체 RAM 목표는 따로 남긴다.

## 2D 비용과 AI

불변 레이어의 셀 인덱스를 WeakMap에 캐시한다. Get/Has는 같은 레이어 배열에서 인덱스를 재사용한다. 단일 Set은 로드 때 검증한 엔진 소유 자료에서 좌표·값만 검증하고 기존 셀 객체와 다른 레이어를 공유한다. 이전 전체 에셋 재검증을 반복하지 않는다. 결과는 기존 자동타일·dirty 청크·충돌·C++/블루프린트 경로로 간다. 배열 복사와 일부 쓰기/충돌 동기화 비용, 큰 맵 제한과 장시간 성능은 여전히 별도다.

AI `scene.prefab.adopt`, `scene.prefab.apply {all:true}` 또는 `property:[]`, `anim.ik.bone.add/remove`를 추가했다. 기존 `world.mesh.edit`에 uvCut/uvTransform/uvUnwrap/uvPackIslands를 연결한다. 사람과 같은 안정 ID·검증·expectedRevision/dryRun/Undo를 쓴다. 새 게임 함수7개를 공용 C++에서 생성해 전체 노드는767개다. 추가 종속성·상시 폴링·자동 GPU 읽기는 없다.

## 근거와 확인 범위

[Unity6000.0 Prefab overrides](https://docs.unity3d.com/6000.0/Documentation/Manual/PrefabInstanceOverrides.html)의 구성/자식 변경·개별/전체 적용 본문을 다시 대조했다. [AudioSource.priority](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/AudioSource-priority.html)의 실제/가상 음성과 우선순위·볼륨 계약을 읽었다. HB의 Web Audio 예산은 Unity의 플랫폼별 구현과 구별한다.

[Unreal5.8 FullBodyIK](https://dev.epicgames.com/documentation/en-us/unreal-engine/control-rig-full-body-ik-in-unreal-engine)의 루트/강성/회전 목표 지정 본문과 [ProBuilder6.0.9 UV Editor](https://docs.unity3d.com/Packages/com.unity.probuilder@6.0/manual/uv-editor.html)의 선택·수동 편집 구역을 대조했다. 연결 API·manual UV actions 전체와 전체 corpus 읽음으로 승격하지 않는다. [WebView2 NavigationCompleted](https://learn.microsoft.com/en-us/microsoft-edge/webview2/reference/win32/icorewebview2navigationcompletedeventargs?view=webview2-1.0.4258.31)의 오류 상태 계약도 읽고 시작 실패에 상태 코드를 남기게 했다. 단순 IsSuccess=false만으로 원인을 단정하지 않는다.

구체적 검사·실패 수정과 SHA는 실행 근거에 기록한다. 사용자 설치와 데이터 보존은 USER_INSTALL_170.json으로 별도 확인한다. 설치·단위 검사·선택한 시나리오를 전체 엔진/PC120·모바일60 성능 완료로 계산하지 않는다.
