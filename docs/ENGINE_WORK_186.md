# 186 — 프리팹 격리 제작창과 공용 원본 편집

프리팹을 콘텐츠 브라우저에서 열면 해석된 계층과 2D·3D 뷰포트, 선택한 오브젝트의 실제 컴포넌트 속성이 나온다. 원본 열기는 해당 중첩/상속 원본을 별도 문서로 열며, 장면 복귀는 기존 장면 문서로 돌아간다. 기존 아이콘·도킹·뷰포트 조작·머테리얼/스프라이트 렌더러를 재사용한다. 프로그램을 실행하는 Play 로직은 프리팹 편집 미리보기에서 실행하지 않는다.

이름·표시·변형·부모, 오브젝트 추가/복제/삭제, 복사/잘라내기/붙여넣기, 그룹/그룹 해제, 컴포넌트 추가/값/기본값/삭제, 휠과 충돌 형상 편집을 원본 계약에 연결한다. 기본 2D/3D 배치 목록을 그대로 제공한다. 우클릭 메뉴와 재지정 가능한 기존 뷰포트 단축키를 사용하며, 입력 중/게임 중/비행 중 키 소유권을 유지한다. 속성 접힘과 스크롤을 유지하고 비활성 버튼을 동작 종료 후 복원한다.

중첩/상속 오브젝트는 바깥 원본의 overrides에 기록한다. 부모 구조 오버라이드는 선택 필드 reparented:[{object,parent}]로 저장하고 최종 해석 뒤 계층·순환을 검사한다. 부모 변경은 기본적으로 월드 변형을 보존하며 keepWorld:false로 로컬 값을 유지할 수 있다. 원본 implicit components는 Type_index 안정 ID를 사용해 중첩 컴포넌트 속성 경로도 해석한다. 복사된 해석 계층은 한 번만 평탄화해 중복 중첩 확장을 막고 참조를 재배치한다. 입력 원본은 불변이다.

AI는 prefab.stage.get으로 해석 계층·원본별 revision·미리보기 자원 정보를 조회하고 prefab.stage.edit로 같은 제작 명령을 사용한다. expectedRevision, 선택적인 expectedSources, dryRun, 단일 문서 Undo/Redo를 적용한다. 사람이 보는 창과 별도 데이터나 가짜 성공 경로를 만들지 않는다. 비동기 읽기 중 문서/안쪽 원본이 바뀌면 충돌로 거부한다.

CPU9·기존 프리팹/단축키 회귀·실제 편집기 키/컴포넌트/원본 탐색/Undo/저장·DirectX/WebGPU 게임의 새 제작 프리팹 Spawn·실제 C++ 조회를 묶어서 검사했다. 설치 실행 검사는 별도 영수증에 기록한다. [검증 근거](research/ENGINE_WORK_186.json).

설계 대조: [Unity 6.6 프리팹 편집 본문](https://docs.unity3d.com/Manual/EditingInPrefabMode.html) 125–238을 읽었다. 격리/문맥 모드, 계층·원본 탐색, 공유 원본 변경과 배치의 구분, 저장 의미를 대조했다. Unreal Components Mode 주소는 Internal Error였으며 읽음으로 계산하지 않는다. 연결 API·미디어와 전역 분석 gate는 승격하지 않는다.

- The stage is an isolated asset editor. Main-scene locked background/context environments and automatic Apply-to-specific-inner-source routing remain separate work; the source button opens the actual inner asset in its own stage.
- Linked instances receive normal shared prefab refreshes. Tests preserve unrelated scene actors, instance placement and the inner source, not a byte-identical linked scene snapshot.
- The editor uses the existing common WebGL preview renderer and controls. Packaged games were separately tested using real D3D11 and WebGPU; this is not proof of native editor rendering parity.
- Dirty/visible-only preview rendering, common resource disposal and existing caches are reused. No claim of large prefab FPS/RAM or an unlimited number of open GPU contexts.
- No new phone, Xcode, iOS store or whole-engine completion evidence.
