# 199 — 내비게이션 최근접 투영 공간 인덱스

NavMesh 경로 시작·끝점, 오프메시 링크와 EQS가 쓰는 최근접 투영을 공간 인덱스로 연결했다. 이미 쓰는 buildGeometryBVH를 컴파일된 내비게이션 메시마다 한 번 만들고 가까운 가지부터 검사한다. 삼각형마다 Triangle/임시 벡터를 만들지 않고 질의당 작업 벡터를 재사용한다. 전역 캐시·상시 타이머·새 의존성·GPU 읽기는 없다.

기존3차원 Euclid 최근접 거리, 최대 거리, 원래 삼각형ID의 동률 우선순위, 퇴화 삼각형 제외를 유지한다. 원래 노드 순서·포털·경로 간선은 바꾸지 않는다. 동적 영역 비용/마스크/장애물 필터는 질의 시 적용하고 인덱스는 공유한다. 중첩 질의는 각각의 작업 공간을 써서 결과를 덮어쓰지 않는다. 기하를 편집하면 기존 중심/포털과 함께 NavigationMesh를 다시 컴파일한다.

AI의 `runtime.navigation`과 Player 진단 navigation.meshes는 각 액터의 indexedTriangles/indexNodes/queries/lastNodes/lastCandidates/lastTriangles/totalTriangles를 복사해 반환한다. 스냅샷을 수정해도 실행 인덱스는 바뀌지 않는다. 기존 C++/BP MoveTo·경로 조회와 EQS는 같은 내부 투영을 사용한다.

CPU6군에서 XY/XZ/경사면300질의, 거리/영역/이동 장애물·동률·퇴화/빈 메시·중첩 질의·실제 공용 NavigationRuntime 이동·오프메시 연결을 이전 선형 알고리즘과 대조했다.2048삼각형20질의의 후보40960개가160개로 줄었고 위치/거리/삼각형ID가 같았다. 기존167의11군/169의23군도 통과했다. 이는 후보 수/정확성 결과이며 전체 게임FPS 측정은 아니다. [근거](research/ENGINE_WORK_199.json).

본문 대조: [Unity NavMesh.SamplePosition](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/AI.NavMesh.SamplePosition.html)234–282/321–368의 최대 거리·영역 필터·다층/큰 반경 비용, [Three Triangle](https://threejs.org/docs/pages/Triangle.html)0–41의 결과 벡터 소유. HB의 기존 투영 거리 규칙을 보존하는 데 사용했다. 동적 carving/비평면 정밀 funnel/ORCA 경계 제약은 별도 잔여다.

사용자 설치 런타임이 사용 중이어서 실제 창/C++ 브리지/패키징 검사는 대기한다. `check-navigation-191-window.mjs --indexed --3d`와 `--webgpu`용800삼각형 제작 표본을 준비했다. 새 실행 근거·사용자 설치 반영으로 계산하지 않는다.
