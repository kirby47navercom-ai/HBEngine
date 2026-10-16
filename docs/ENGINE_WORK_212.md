# 212 — C++ 공개 속성·BP 변수/배열 Take와 실제 실행

- Take includeVariables와 변수·C++ 설정; reflected 타입/배열/안정 변수 ID 또는 클래스·속성 이름을 가진 variable/nativeProperty 트랙·null/길이 변경 보존
- 스칼라 float/vec2/vec3/color 보간과 bool/int/string/object/배열/struct-like 기본값 step·쓰기 전 여러 typed 값 검증·읽기 전용/메타데이터 변경 거부·없는 actor 참조 null·key 데이터 deep-copy 보존
- 기존 C++/BP 실제 상태 경로로 적용·앞뒤 Seek/정지와 실제 C++ scalar/vector-array 읽기·변수 Map 복원; 같은 원본 JSON·dryRun/Undo·배열 키 textarea 편집
- BP 구성/변수/공개 C++ 기본값을 실행 없이 읽는 독립 제작 미리보기와 simulation component 트랙 억제; 실제 변수 값도 preview read에 포함
- runtime.values 요청형 페이지·플레이어 development 진단; 실제 창에서 녹화한 Take를 D3D11 게임으로 내보내 C++ 배열 크기/첫 값/스칼라·BP 변수/복원/종료 확인

남은 범위: 등록된 기본 타입 bool/int/float/string/vec2/vec3/color/object/transform/hit 및 단일 std::vector/BP 배열에 한정. 배열128개/키JSON64KiB의 명시 검증 예산; 미등록 사용자 C++ struct/중첩 컨테이너·큰 키는 잔여 / C++ BlueprintReadOnly는 녹화/쓰기 대상에서 제외. private BP 변수는 로컬 디버그/녹화 대상일 수 있으나 UI 인스턴스 노출 설정을 바꾸지 않음 / 변수 바인딩의 별도 수동 생성 선택창·생성 표시 복사본의 게임 상태·전문 PCM/시간코드/실폰 검증은 잔여. 제작 미리보기는 사용자 C++/BP/물리를 다시 실행하는 게임 리플레이가 아님 / 실제 기본 C++/BP reflection/worker 스냅샷 경로를 쓴다. 별도 nativeSet RPC나 매 프레임 전체 디버그 복사·GPU 읽기는 추가하지 않음

근거: [ENGINE_WORK_212.json](research/ENGINE_WORK_212.json). 설치 검증은 별도 영수증에 기록한다.
