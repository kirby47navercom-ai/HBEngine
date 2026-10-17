# 265 · C++ 생성 흐름과 자동 실행 표시

- Actor/Character/GameMode/GameInstance 등의 새 C++ Start를 beginPlay에 자동 연결
- 에셋 만들기에서 선택 Tick 헤더/소스 동시 생성·기본값은 빈 Tick 없음·Component Tick 옵션 차단·선택 노드 상세에 자동 실행 단계 표시
- API와 AI schema가 Lifecycle/생성 옵션/정확한 지원 범위를 제공·기존 파일 덮어쓰기 거부

근거: [기계 판독 기록](research/ENGINE_WORK_265.json).

검증 범위와 잔여:

- Component/SceneComponent 템플릿의 기본 Start는 일반 Callable; 사용자 C++ 컴포넌트 부착 수명 전체는 별도
