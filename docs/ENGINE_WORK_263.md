# 263 · 명시적 C++ 생명주기와 공용 이벤트 실행

- Lifecycle 주석으로 construction/beginPlay/tick/endPlay 및 overlap/hit begin/stay/end 10종 자동 연결
- 동일 단계의 사용자 BP보다 먼저 실행·변수/컴포넌트 초기화 뒤 구성·배치 위치 보존·생성/종료/풀/일시정지/간격과 기존 묶음 호출 공유
- 저장 그래프 변경 없이 실행용 복사본에만 entry 생성·엄격한 반환/인자/중복/static/pure 검증·기존 일반 Tick 이름은 자동 실행하지 않음
- 재적용에서 생명주기 선언 추가/변경은 재실행 요구; 본문만 수정하는 기존 호환 재적용은 유지

근거: [기계 판독 기록](research/ENGINE_WORK_263.json).

검증 범위와 잔여:

- 자동 base 콜백 연결·fixed/late update·에디터에서 C++ 구성 자동 컴파일은 미구현


261–267 사용자 설치 dcab5bc06a6db1c9·2958명세파일 실행후SHA동일·숨김editor2/독립D3D·GL게임4 오류0/exit0. 변형체7질의/CPP·BP·자동수명주기/센서진입이탈/배치위치·액터별Tick·동적간격·생성선택UI 확인. User10385 SHA불변·링크2/.hbproject·Versions1·이전설치196694054B 제거. USER_INSTALL_267.json.
