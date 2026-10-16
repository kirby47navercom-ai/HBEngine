# 221 — 불변 능력 속성/태그 계산 재사용

- 효과/능력/속성의 실제 값이 바뀔 때만 속성 집계와 태그를 새로 계산; 재사용 중에도 효과 남은 시간·능력 재사용/종료 시각과 이벤트는 계속 갱신
- 기존 공용 C++/BP getter·readonly Inspector·AI 페이지가 동일 상태를 읽으며 새 프레임별 전체 디버그 복사/GPU 읽기를 추가하지 않음
- baseline b432bac의 같은 runtime 코드·공통 의존성으로 교대 CPU5표본 비교: 100개+기존 Health/Mana 속성·8효과·500tick에서 value집계51000→0, CPU 합계 약15–17.3ms→0.3–1.13ms; 객체/태그 재사용과 실제속성/효과 내용 대조
- 변경/주기 누적·효과 만료·태그 제거 때 재계산하며 실제 편집기/별도D3D C++getter35속성/8효과/주기효과와 UI까지 확인

범위: 측정은 AbilitySystem.tick CPU 합계이며 게임 전체 프레임·FPS·GPU/IPC/VRAM 측정이 아니다 / 시간이 변하는 효과/능력 수명 행과 C++ JSON 전달 등 다른 프레임 비용은 유지한다. 전체PC120/실폰60 성능 gate와 구분

근거: [ENGINE_WORK_221.json](research/ENGINE_WORK_221.json). 설치는 별도 영수증에 기록한다.


221–222 설치 확인: be51b1db8dde157a·명세2718파일 실행후SHA동일·passive속성/태그 집계 재사용·실제CPP/BP 주기3틱/Health147/Stat108·현재Inspector/AI·218속성세트/Undo/비용/효과/작은Take팝업 회귀 통과. 오류0/종료0·캡처3시각확인. User10385파일SHA불변·링크2/.hbproject·Versions1·이전설치194263160B 제거. USER_INSTALL_222.json.
