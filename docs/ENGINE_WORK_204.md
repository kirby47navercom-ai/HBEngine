# 204 — 콘텐츠 목록 가상화·키보드·AI 페이지

콘텐츠 목록/타일은 화면과 앞뒤 여유 행만 만든다. 전체 인덱스/선택/드래그와 접근성 위치는 유지하고 스크롤·크기 변경 때만 한 번 갱신한다. 종료 시 observer와 예약 프레임을 해제한다. 1만 항목의 표본 DOM은 목록17개·끝13개·타일50개였다.

방향키·Home/End/Page·Space·문자 탐색·Ctrl/Shift 범위 선택을 연결했다. 콘텐츠 E 입력을 뷰포트가 가로채는 충돌을 실제 키 입력에서 찾아 고쳤다. Alt/마우스 뒤로가기는 사건 대상의 브라우저를 사용한다. 선택1만 개의 재생성 복원과 현재 선택 중복 저장 축소도 확인했다.

project.browser.read의 offset/limit/nextOffset과 project.browser.view의 폴더/표시/선택/포커스는 사람과 같은 함수를 사용한다. limit1000은 한 응답의 페이지 크기이며 에셋 수 제한이 아니다. [WAI listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/)36–94와 대조했다. 메타데이터 자체는 전체를 유지하며 전체 게임FPS·모든 스크린리더/IME·다른 파일 클립보드 동작의 완료로 확대하지 않는다.

근거: [ENGINE_WORK_204.json](research/ENGINE_WORK_204.json). 사용자 설치 전환은 별도 영수증에서 확인한다.


200–205 설치 확인: 1fadf9f7d5c394c8·명세2614파일 실행 후 SHA 동일·실제 설치 EXE 프리팹 문맥/환경/잠금/Undo/저장/동기화/Play·131파일/112MiB UI·1만 콘텐츠17/13/50카드와 Alt뒤로·문자 탐색·재생성후1만선택, 오류0/종료0. User10385파일 SHA불변·링크2/.hbproject·이전 설치184807680B 정리·Versions1. USER_INSTALL_205.json.
