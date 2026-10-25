# 실행 바인딩 준비

VM 생성과 addBindings는 대상 ID를 한 묶음으로 준비해요. 컴포넌트 설치·인스턴스 덮어쓰기도 동기 작업 안에서 한 대상 Map을 공유해요. 빈 바인딩은 월드에 접근하지 않으며 standalone 컴포넌트 설치는 Set·일회성 generator도 받아요. 같은 ID가 여럿이면 기존처럼 첫 오브젝트를 사용해요.

prepareActorBindings는 비동기 헤더/소스 읽기 이후에도 현재 슬롯의 ID와 오브젝트를 확인해요. 대기 중 교체·정렬·삭제됐으면 원래 조회 규칙으로 재탐색해요. 누락된 ID를 영구 캐시하지 않아요. 클래스 할당은 첫 바인딩을 유지해요.

initializeSpawn은 생성 그룹을 준비한 후 Construction → actor → systems → BeginPlay → Pool 이벤트 순서와 기존 isCurrent 호출 횟수를 유지해요. engineOperations.start는 바인딩이 없는 AbilitySystem 소유자도 첫 초기화 전에 준비해요. BlueprintRuntime.primeObjects는 기존 VM 내부 조회를 준비하는 helper이며 새 SDK ABI가 아니에요.

신규 검사11개는 실제 VM·설치·비동기 준비·생성·서비스 경로, Set/generator와 ID 접근 횟수, 같은 ID 교체/재생성, 빈 입력을 확인해요. 네이티브 메타데이터 비동기 사례의 컴파일러는 소스 검사 stub이에요. 관련 실행 회귀53개와 기존 object lookup gate, 정확한 SDK·실행 파일 해시가 일치하는 C++ 소켓 호출 gate를 함께 확인했어요. 헤더 파싱·그래프 복사·startActor 바인딩 탐색·일반 월드 순회는 남아 있어요. 신규 FPS/heap/GPU/GUI/설치 검증으로 계산하지 않아요.
