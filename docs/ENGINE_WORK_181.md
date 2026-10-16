# 181 — 명명 슬롯과 재사용 UI 제작·실행

NamedSlot은 자식 하나를 받는다. 재사용 Widget.properties.widgetSlots는 슬롯명→.hbwidget.json 경로/null의 JSON 문자열이다. 키가 없으면 기본 내용, null이면 빈 슬롯이다. 이름/부모 바로 아래 인스펙터에서 고르고 빈 슬롯의 점선·이름은 Designer에만 나온다.

원본 에셋을 바꾸지 않고 중첩 슬롯/기본 내용 교체·이름공간·스타일/이벤트/변수 연결을 처리한다. 순환·존재하지 않는 슬롯·겹친 교체·기존 깊이/요소 예산을 검증한다. 실제 게임의 버튼→BP 이벤트와 C++ UI::SetText(owner,"WorldCard","Dialog/Body/Content/Label",text)를 확인했다.

슬롯 경로도 의존성 수집·파일/폴더 이름 변경에 포함한다. Assets 밖 Source/UI 자산을 모바일 공용 패키지에서 읽어 UI를 생성/수정했다. 알 수 없는 슬롯은 빌드가 거부한다. AI 스키마가 원본 전용 modelimport 생성 예제를 요청하며 실패하던 문제도 수정했다.

[검증 근거](research/ENGINE_WORK_181.json).

위젯 클래스 전체 상속·실행 중 슬롯 자산 교체·UE Expose-on-Instance 정책은 별도다.

원본256/펼침10000요소·깊이16의 기존 검증은 유지한다. 새 씬 객체 상한은 없다.

iOS 프로젝트 수집/공용 실행 검증은 PC 결과이며 Xcode 컴파일·실물 기기 결과가 아니다.


183 설치 확인: 3bffac6f21389589·명세2490파일 실행 후 SHA 일치·격리 설치 EXE의 실행 LOD 포즈 Hz·충돌 선택·사람 편집/Undo·오류0/종료0. 사용자 프로필10385파일 전후 SHA 일치. 바로가기/.hbproject 연결 확인, 이전 설치174065839바이트 정리, Versions1. 설치 근거 docs/research/USER_INSTALL_183.json.
