# 네트워크 관심 영역 인덱스

관심 위치 이동 때 `states.values()` 전체를 순회하던 경로를 가변 반경 공간 인덱스로 바꿨어요. 반경 이상의 2의 거듭제곱 셀 크기를 선택해 액터 중심을 한 버킷에만 저장하고, 질의 위치 주변 27개 셀을 사용 중인 레벨별로 확인해요. XY/XZ의 2D·2.5D 배치와 XYZ 배치는 같은 좌표 계약을 사용해요.

전역 대상과 소유자 전용 대상은 따로 유지해요. 인덱스는 후보만 반환하며 최종 판정은 기존 `replicaRelevant`의 거리·소유권·삭제 규칙을 그대로 사용해요. 이전에 보이던 ID도 질의에 합쳐 관심 영역을 벗어난 대상에 hide를 전달해요. 생성 오브젝트 자식의 후보 위치·반경·소유자는 루트의 유효 설정을 따라가요. 루트 이동·소유권/반경 변경·삭제와 자식의 루트 변경 때 관련 항목만 재등록해요. 같은 분류·셀 안의 변경은 버킷을 다시 만들지 않아요.

자식의 루트가 바뀌면 이전 부모의 자식 목록에서도 제거해요. 빈 셀·반경 레벨·소유자 목록은 즉시 정리해요. JSON 상태 사본, 새 타이머, 감시 워커는 만들지 않아요. 서버의 액터 예산·전송 빈도·인증·패킷 형식은 유지해요.

최초 접속의 배치 오브젝트 숨김 동기화에는 여전히 전체 순회가 있어요. 전역 대상·소유 대상·삭제 기록이 많거나 넓은 반경에 액터가 밀집하면 후보도 많아요. 변경 패킷의 연결별 전송, 서버 권위 게임 규칙, 예측/재시뮬레이션·지연 보정·장면 세대·복잡한 원격 수명은 별도 작업이에요. 전체 네트워크 구현 완료로 계산하지 않아요.

## 사람·AI 조회

- 기존 `NetworkReplica.relevancyRadius/ownerOnly`, `NetworkSession.interestTarget`을 그대로 편집해요.
- `startMultiplayerServer().inspect().interestIndex`에서 entries/global/ownerGroups/levels/cells/queries/lastCandidates/unchangedUpdates를 요청할 때 읽어요.
- `hb context "관심 영역"`은 기존 서버·판정·클라이언트와 인덱스 소유 경로를 찾아요.
- `schema.replicationInterestIndex`에 알고리즘·최종 판정·통계·잔여 비용을 적었어요.

## 검증 범위

가변 반경·전역·소유자·음수 경계의 결과를 기존 전수 판정과 비교해요. 실제 두 WebSocket 연결로 초기 상태·관심 영역 이탈/재진입·루트/자식·부모 변경·소유권·삭제를 확인해요. 기존 재접속·풀 반환/재획득·늦은 접속·권한 검사도 재사용해요.

간격 128, 반경 20의 XY 격자 인덱스 자료 100,000개에서 32개 위치를 질의해 위치마다 후보 1개를 확인했어요. 이 조건의 자료구조 생성·질의 시간은 검사 기록에 남겨요. 게임 FPS, 전체 서버 RAM 또는 밀집 장면 성능을 측정한 수치는 아니에요.

## 읽은 공식 근거

[Epic Replication Graph](https://dev.epicgames.com/documentation/en-us/unreal-engine/replication-graph-in-unreal-engine)의 Structure와 High-Level Example에서 공유되는 지속 목록, 위치 그룹, 전역/연결별 대상과 부착 대상 묶음의 동작을 대조했어요. HB의 가변 반경 3D 버킷과 기존 WebSocket 프로토콜을 사용하며 Unreal의 Replication Graph 구현을 이식했다는 뜻은 아니에요. 연결된 API 전체 분석·Iris·네트워크 예측 구현은 포함하지 않아요.
