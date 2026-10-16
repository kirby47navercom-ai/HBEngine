# 232 · 능력 세트 상속·합성과 원자 저장

- 부모→순서 있는 합성→로컬 재정의·공유 조상 한 번 적용·능력/태그 합집합·불변 공유 템플릿 LRU64/32MiB
- 부모/includes 편집·합성 결과/출처·재정의·Undo·abilityset.read 페이지와 참조 revision 재검사
- 세트 그래프 순환/누락·삭제 고아 검사·자식 우선 공동 생성/Undo·저장 도중 부모 SHA 충돌 롤백·실제 패키징 그래프 검사

검증 근거: [기계 판독 기록](research/ENGINE_WORK_232.json).

남은 범위:

- HB JSON 합성은 Unreal UAttributeSet의 동일 클래스/네트워크 구현이 아니다
- 사람 모두 저장은 종속 순서이며 전체 원자 저장은 files.apply 묶음을 사용한다
