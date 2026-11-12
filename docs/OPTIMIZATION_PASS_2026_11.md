# 2026-11 최적화 묶음

결과가 바뀌지 않는 낭비만 제거했어요. 화질·판정 결과는 그대로이고 할 일만 줄어요.

## C++ 엔진 질의 (Bridge.hpp)

- `bridgeSnapshot()`이 일반 월드 행마다 자기 자신의 위치·회전·크기를 복사해 다시 덮어쓰던 무변경 루프를 제거했어요. 네이티브 셀/액터만 보고해요.
- `engineQuery`가 매 질의마다 전체 월드 Json을 깊은 복사하던 것을 패킷에 빌려주고 끝나면 되돌리는 방식으로 바꿨어요. 수정한 행만 원래 값을 보관했다가 복원해요.
- 저장·데이터 질의(`saveJson*`, `dataJsonRead`, `dataTableRead`)는 월드 스냅샷 없이 보내요.
- 측정(check-query-world, 5000오브젝트, 프로세스 안 패킷 구성): 질의 1회 약 30ms → 약 0.025ms. IPC 직렬화·전송·물리 비용은 포함하지 않았어요.

## 3D 조명 (SceneRender.hpp)

- 점/스포트 조명의 범위·원뿔 밖이거나 면이 조명을 등지면(피부·식물·머리카락·코트 없음) 그림자 맵 샘플과 BRDF 계산을 건너뛰어요. 모든 조명 항이 attenuation을 곱하므로 결과는 같아요.
- 그림자 강도 0인 조명은 그림자 9탭을 읽지 않아요.

## 경로 추적 확산광 (보류)

- 가시성 LOD 경로(`hbTransport.y>.5`)에서 쓰지 않는 그림자 광선 `hbGeometryTrace`를 조건부로 계산하도록 바꾸면 `check-native-scene-render --post-only`가 스택 오버플로(0xC00000FD)로 끝났어요(HLSL 컴파일 단계 추정). 되돌렸고 다음 후보로 남겨요.

## LOD·로드

- `updateWorldLODs`가 LOD 그룹마다 카메라 월드 위치를 다시 계산하던 것을 한 번만 계산해요.
- 게임 시작 시 액터별 블루프린트 바인딩 검색을 배열 선형 검색(오브젝트×바인딩)에서 Map 조회로 바꿨어요. 첫 번째 바인딩을 고르는 기존 규칙은 같아요.

## 검증

- check-query-world 통과(Bridge.hpp 컴파일·5000행 병합/순서/추가 필드 보존), check-actor-pool·check-binding-preparation-2706(11)·check-blueprint-inheritance·check-game-session(5)·check-batch-165(17)·check-batch-166(12)·check-distance-world-1772 통과.
- 조명 변경: HEAD 격리 worktree에서 실제 DX11 `check-native-scene-render` 실행. core 구역의 점광/스포트/원뿔 밖 검사(56행까지) 통과, post 구역 통과. 같은 검사가 HEAD 자체에서 57행 반구광 assert 실패·core 멈춤·rendering-117 `rejected==5` 실패로 깨져 있어 전체 통과는 확인하지 못했어요.
- 실제 게임 FPS·GPU 시간 측정은 하지 않았어요.

## 다음 후보 (미구현)

- 타일 조명 컬링에 타일별 깊이 범위(HZB min/max)를 넣어 화면상 겹치지만 깊이가 먼 조명 제외. 현재는 조명 16개 이상일 때 2D 타일만 검사해요.
- 그림자 PCF 9회 Load를 비교 샘플러 Gather 4회로 교체(화질이 조금 달라져 픽셀 기준 갱신 필요).
- 메시 단순화 LOD 자동 생성·교차 페이드(WLD-04 잔여).
- 네이티브 장면 인코더의 그리기별 JSON.stringify 변경 감지를 버전 번호 비교로 교체.
