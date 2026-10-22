# 네트워크 생성과 종료 수명

접속 세대와 게임 월드 세대는 별개다. 게임이 계속 실행 중이어도 접속 종료·재접속 또는 원격 루트 삭제가 일어나면 대기 중인 원격 프리팹 생성은 취소해야 한다.

## 실행 계약

- `NetworkWorld.spawnCurrent`는 접속 세대, connected 상태, 원격 루트와 에셋을 확인한다. 위치만 변경된 정상 상태 갱신은 생성을 취소하지 않는다.
- 원격 생성 서비스가 세대를 내부 인자로 전달한다. SceneSpawn은 삽입 전, 렌더 준비 뒤, 초기화 뒤에 확인하고 기존 실패 정리 경로로 자신이 삽입한 오브젝트·바인딩·렌더 그룹을 회수한다.
- `initializeSpawn`은 Construction, 컴포넌트/시스템 시작, BeginPlay, OnPoolAcquire 사이마다 같은 조건을 확인한다. 이미 실행된 사용자 콜백의 임의 외부 효과를 되돌린다는 뜻은 아니다.
- 삭제 전 잡은 복제 엔트리와 실제 삭제 대상을 비교한다. 대기 중 같은 ID로 교체된 새 엔트리나 나중에 도착한 삭제 요청을 지우지 않는다. 숨김 복원·보간·RPC의 비동기 호출 뒤에도 세대와 대상 수명을 확인한다.
- 초기 스냅샷을 받는 동안 기존 오브젝트에 부분 상태를 적용하지 않는다. 청크 종료와 단일 welcome 모두 이전 스냅샷의 누락 대상 정리와 타임아웃 해제를 수행한다.
- 이미 생성된 루트의 미등록 자식 상태가 루트를 다시 생성하게 하지 않는다. 원격 생성 실패는 초기 스냅샷 수신 중에는 기록하지 않는다.
- 액터 정리가 끝나면 `unregister`가 그 오브젝트의 등록만 제거한다. 호스트의 published 집합은 유지해 다음 전송에서 destroy를 보낸다. NetworkReplica만 있는 수동 풀 오브젝트도 Acquire에서 재등록한다.

## 사람·AI 읽기

기존 `runtime.network {}` 연결 요약은 유지한다. `kind`를 지정하면 게임 데이터와 접속 키를 복제하지 않고 메타데이터만 반환한다.

```json
{"method":"runtime.network","params":{"kind":"replicas","offset":0,"limit":32,"query":"Enemy"}}
```

`kind`: `replicas`, `remote`, `removals`, `failures`. 기본 32, 최대 128개, 검색어 최대 160자다. 조회 결과는 ID, 이름, 루트/에셋, 등록·활성·숨김·소유 상태와 개수다. nativeProperties, 변환, 그래프, 접속 키는 읽거나 반환하지 않는다. 검색 없는 페이지는 필요한 구간까지만 순회하고, 검색은 정확한 총수를 위해 원본 Map을 순회하되 전체 목록 사본을 만들지 않는다. 반환 행을 수정해도 실행 상태는 바뀌지 않는다.

`hb context network --symbol spawnCurrent`와 `--symbol inspectNetworkWorld`는 각각 해당 소유 파일 한 개만 읽는다. 다른 호출처는 `--all`로 확장한다.

## 근거와 경계

- `tools/check-network-lifetime-1574.mjs`: 실제 NetworkWorld 비동기 경합, 청크/단일 스냅샷, 1,000개 메타데이터 페이지, 콜백 단계 취소, 실제 로컬 소켓과 BlueprintRuntime/engineOperations 프리팹 로딩·취소·풀 재사용.
- `tools/check-network-lifetime-1576-window.mjs`: 격리된 실제 2D 편집기에서 BP 접속, 프리팹 BeginPlay, 공개 페이지 조회, 원격 삭제와 같은 ID 재생성. `--executable`로 설치본 검사 가능하다.
- 기존 공정 전송 1,025개/한글 대형 패킷, 관심 영역·삭제·재접속, 2D 풀 100회/C++ 검사를 연결해 확인한다.

전용 권위 서버, 예측/재시뮬레이션, 부착·객체 참조 복제, 씬 원본의 클래스 교체와 일반 원격 풀 정책, 장면 전환 프로토콜 전체는 별도 잔여다. 인터넷 지연/손실, 실기기 FPS를 검증했다는 의미는 아니다.

1641 이후 실행 중 생성된 루트의 에셋/로컬 ID 교체·자식 상태 호환성과 작업 예산은 [원격 프리팹 교체](NETWORK_PREFAB_REPLACEMENT.md)를 따라요.
