# 211 — 생성 오브젝트 Take·독립 시퀀스 수명·제작 미리보기

- 녹화 시작 뒤 생긴 오브젝트의 bool 생성/삭제·풀 반환/재사용 키와 시각 템플릿; 2D 스프라이트/3D 메시·계층·외부 부모 world 변환·시각 컴포넌트 속성/구성·골격 경로 공유
- 독립 ID와 sequence 소유 표시 복사본; 스크립트/물리 재실행 없이 원본 보호·앞뒤 Seek/루프·Stop/실행 종료/실패의 소유 자원 정리·원본 ID와 격리
- 녹화 설정 메뉴의 생성·삭제 체크/수동 생성 트랙·타입 bool 키·같은 sequence.take.apply CAS/dryRun/Undo; C++ Scene Spawn/Move/Destroy와 LevelSequence Play/Seek/Stop 실제 연결
- 제작 미리보기 BP 컴포넌트/안정 ID·원본 수정 보존, 원시 도형/스프라이트 생성과 비동기 초기화 렌더 경합 해결; timeline.preview.read 실제 독립 월드/busy/error 조회
- 실제 창에서 기록한 두 오브젝트 Take를 Windows D3D11 게임으로 패키징해 스프라이트 리소스·독립 ID·재생/되감기/정지/서버 종료 확인

남은 범위: 생성 표시 복사본은 시각 에셋/등록 시각 컴포넌트만 포함한다. C++/BP 내부 상태·게임플레이 시뮬레이션·GPU 입자 상태·네트워크 재현 전체는 아님 / 녹화 시작 전 대상의 삭제/재생성·임의 native 배열/구조체·동적 재부모화와 거리/종류 소스 필터는 잔여. 두 표본 사이에 생성·삭제된 매우 짧은 객체는 샘플 FPS 특성상 놓칠 수 있음 / 생성 트랙은 기존 소유 시퀀스에 한정; UE root/external owner/class change/full sequencer parity 및 전문 PCM/시간코드/실기기 검증은 아님

근거: [ENGINE_WORK_211.json](research/ENGINE_WORK_211.json). 설치 검증은 별도 영수증에 기록한다.
