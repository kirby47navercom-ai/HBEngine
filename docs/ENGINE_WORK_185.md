# 185 — 인스턴스 자식 조회 공용 함수와 종료 응답 수명

C++/블루프린트에 Scene::GetInstanceActor(instance,localId,includeInactive=false), GetInstanceActors(instance,includeInactive=false), GetInstanceLocalId(instance)를 추가했다. 생성된 프리팹과 연결된 장면 프리팹 모두 같은 가족 안에서 안정 로컬 ID로 찾는다. 루트 대신 자식 하나를 전달해도 같은 인스턴스를 가리킨다. 내부 생성 ID의 접두사/번호를 조합할 필요가 없다.

예: auto* root=hb::Scene::Spawn("Assets/PF_Outer.hbprefab.json",transform); auto* child=hb::Scene::GetInstanceActor(root,"anchor/child");
반환 포인터와 같은 기능의 BP 노드를 그대로 사용한다. 단일 조회·목록·로컬 ID의 null/일반 액터·비활성·삭제·다른 인스턴스 분리를 검증했다.

실제 Blueprint의 순수 노드 연결→로그, 컴파일한 C++, DirectX/WebGPU 게임에서 같은 C++ 함수 내 Spawn 직후와 다음 스냅샷 호출, 모바일 공용 AOT 두 모듈에서 확인했다. 노드781개/공통 C++696개이며 기존 Core289개와 구분한다.

Scene 서비스가 일괄적으로 변환 그룹으로 들어가던 생성기를 수정해 선언된 오브젝트·장면·변환 분류를 존중한다. 새 조회 노드의 핀에는 인스턴스/로컬 ID/비활성 포함 한글 라벨을 제공한다. 노드 ID와 C++ 시그니처는 유지한다.

웹/모바일 공용 백엔드가 종료된 뒤 늦게 돌아온 C++ 응답을 검증/반영하기 전에 폐기한다. 대기 중 다음 호출이 플랫폼으로 나가지 않고, dispose 반복과 질의 자원 해제를 검사했다. [검증 근거](research/ENGINE_WORK_185.json).

Instance lookup uses stable authored local IDs, not display names or guessed runtime IDs. Ordinary actors/null/missing instance return null, empty list or empty local ID. A root or any living member can identify the family.

GetInstanceActor localId is limited to1000 UTF-8 bytes consistently in JS/C++. includeInactive includes pooled actors but destroyed actors remain excluded. GetInstanceLocalId reads inactive metadata.

Lookup is a CPU world scan; the single-member JS path does not allocate an all-actor candidate array. There is no new global cache/scene-object cap. This is not proof of sustained large-world FPS/RAM.

Backend disposal stops queued native jobs and rejects late results; it does not forcibly stop C++ already executing on the platform. The existing platform timeout still bounds an unresponsive request.

Portable mobile AOT modules run on this PC; iOS export is a project, not an Xcode/phone/store build.


185 설치 확인: 4c2fe681686c5505·명세2506파일 실행 후 SHA 일치·격리 설치 EXE의 새 공용 조회 노드 표시/Undo·중첩 프리팹 UndoRedo·키/슬롯/메시/LOD·오류0/종료0. 사용자 프로필10385파일 전후 SHA 일치. 바로가기/.hbproject 연결 확인, 이전 설치174446335바이트 정리, Versions1. 설치 근거 docs/research/USER_INSTALL_185.json.
