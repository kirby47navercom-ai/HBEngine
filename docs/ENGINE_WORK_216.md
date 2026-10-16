# 216 — 녹화 없이 C++ 속성·BP 변수 트랙 제작

- 선택 오브젝트의 실제 BP/공개 C++ metadata·인스턴스 기본값·배열·null을 실행 없이 읽는 공용 바인딩 목록과 수동 트랙 생성
- 변수 검색/대상·자료형 표시·값/배열 키 편집; 안정 변수ID/클래스속성·중복/readonly/유효시간 거부·불변 원본·비동기 문서/대상 변경 보호
- sequence.bindings/sequence.binding.add와 사람 편집의 동일 helper·문서 revision/공용 Undo/dryRun·독립 preview·실제 C++ getter/배열·Seek/Stop 복원·D3D 게임

남은 범위: 등록된 기본 타입과 단일 배열 범위·미등록 struct/중첩 컨테이너/큰 키 예산은 기존212 잔여다. 사용자가 임의 C++ 코드를 실행하여 metadata를 추측하지 않음 / 새 native ABI나 별도 VM을 추가하지 않음. 최종 검색 focus·배열 캡처는 사용자 설치 검사에서 추가 확인

근거: [ENGINE_WORK_216.json](research/ENGINE_WORK_216.json). 설치 검사는 후속 영수증에 기록한다.
