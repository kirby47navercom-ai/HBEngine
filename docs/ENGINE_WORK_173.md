# 복제 오브젝트 수명과 관심 영역

NetworkReplica가 있는 로컬 블루프린트/프리팹은 호스트에서 기존 Scene::Spawn/Destroy로 생성·삭제한다. 안정 spawnRoot/로컬 ID를 전송하고 클라이언트는 허용된 로컬 생성 카탈로그에서 해당 에셋을 찾는다. 자식 참조를 기존 생성기로 재매핑하고 원격 문자열로 코드나 파일을 실행하지 않는다. 프리팹 루트의 Replica가 필요하며 NetworkSession을 포함한 네트워크 프리팹은 거부한다.

상세 속성의 복제 거리(0 전체)·소유자 전용, NetworkSession의 관심 기준 오브젝트를 설정한다. 거리/소유자 범위는 루트와 자식에 함께 적용한다. 동적 오브젝트는 범위 밖에서 제거/재진입 때 재생성하며 정적 오브젝트는 입력·물리 비활성 상태로 숨겼다가 복원한다. 호스트 풀 반환/재획득도 복제한다. 삭제는 호스트만 허용하며 원격 클라이언트의 생성/삭제·복제 기술자 변조를 거부한다.

스냅샷·지연 접속·재접속을 수명과 연결했다. 정적 삭제 표식은 이후 접속자에게 전달하며 동적 삭제는 릴레이의 상태 바이트를 회수한다. 변경 전송은 128행씩/회차 최대4패킷으로 나누고 보내지 못한 행은 다음 회차에 이어 보낸다. 이는 전체 오브젝트 수 제한이 아니다. 초기 수신도 64행씩, 가려진 동적 자식 캐시는 함께 회수한다.

[CPU6군·실제 D3D 출시/웹GPU 실행·기존18군 회귀](research/ENGINE_WORK_173.json). 실제 게임을 클라이언트와 호스트 두 역할로 바꿔 로컬 카탈로그 생성·제거·재진입과 C++ Spawn/Destroy를 확인했다. 렌더러 자동 GPU 읽기 경로를 추가하지 않았고 새 의존성은0이다. AI는 기존 컴포넌트 schema/document.patch·runtime.network, C++와 BP는 기존 공용 SDK를 사용한다.

경계: 거리 기준은 클라이언트 관측점으로 대역폭을 줄이는 기능이며 보안 판정이 아니다. 호스트 규칙 실행/전용 서버·예측·참조/부착·장면 세대·관심 영역 공간 가속은 남아 있다. 실제 호스트 키를 배포 에셋에 넣지 않고 별도 실행 구성에서 전달해야 한다. 모든 원격 에셋 배포나 전체 네트워크 시스템의 완료가 아니다.

대조: [Unreal Actor Relevancy](https://dev.epicgames.com/documentation/en-us/unreal-engine/actor-relevancy-in-unreal-engine)의 연결별 판단/거리·소유자/동적 수명, [Unity Object Spawning](https://docs.unity.cn/Packages/com.unity.netcode.gameobjects@2.13/manual/basics/object-spawning.html)의 로컬 프리팹 등록·권위/삭제·풀 수명을 참고했다. 전체 연결 API/엔진 corpus 분석으로 계산하지 않는다.
