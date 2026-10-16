# HBEngine — 168 — 2026-10-16

현재 사용자 지시: 지금까지 조사/계획한 전체 기능 구현. 번호/묶음 완료로 전체 목표를 축소하지 않는다. 주인님/짚짱·한국어 존댓말, 사용자 창/프로필/게임 보존, 묶음 검사·설치 업데이트·한글 커밋/푸시·Versions1. 새 에이전트 요청 없음.

168 구현: 연결 프리팹 원본/부모/중첩 live 갱신·3방향/축별 local 보존·충돌/속성 Apply/Revert/원자 Undo·AI6명령·Play 최신 해석·타입 actor 참조. 직교32×32/등각 대각 띠/개별 정렬·렌더/충돌 변경 청크 재생성·숨김 재생성0, C++ 타일/UI 불변 스냅샷/JSON 재사용. 소유 prototype/prefab-{instances,instance-ui,link}.js, tilemap-chunks/runtime.js, native-transport.js, scene-rendering.js, app.js, play-world.js, actor-references.js. 기존 노드753, 종속성/상시poll/자동GPU읽기 추가0.

검사 CPU12군·실제 C++/Rapier·숨김 Editor 사람 Apply/Revert/Undo·AI dryRun/원본 갱신·Play 복원, D3D11 dev/release·WebGPU. 16,384타일16청크 중 변경기하1/나머지15유지. D3D11 짧은119프레임 work평균5.96/p95 9.70ms·interval평균11.62ms이며 통제A/B/PC120/모바일60 증거가 아니다. 165/166/167·2D·native/transport/UIaudio/core/API 회귀 통과. 최종 설치 EXE로 추가 확인 예정, 영수증 USER_INSTALL_168.json. Build/copy와 실행 검사는 순차로 한다(runtime/node.exe 잠김).

원장 docs/research/ENGINE_STATUS.json → docs/ENGINE_STATUS.md + hb status --local/API.78등록행 verified39/partial32/unimplemented4/unverified3. 상위 전체 완료 승격0. UE/Unity 전체 본문/API gate false/분모·완료율 미확정;168 지정 계약만 대조, 연결/7000API/미디어 미완.

남은 전체 목표는 원장 remaining과 누적 요청을 유지한다: prefab 명시적 같은값 override/모든 구조Apply/세밀 variant/stage, 확장 타일규칙/맵 비용/2.5D 품질, 렌더 cold compile/정밀 transport/GI/HWRT, 월드 자동분할/HLOD/예산/동적Nav,2D제약/정지발/애니/Take,물리/게임/네트워크/UI/오디오,CPP확장/AI/디버그,모바일/배포/성능 등. 원장 일부를 전체 요구의 상한으로 삼지 않는다. Mac/Xcode·Android기기는 없다.

기존 설치27ca4525cebc9468·프로필10385파일. 개발 중 설치본 수정 금지. 검증 후 새 hash로 전환/이전 설치 자동정리, 사용 프로필은 검사에 사용하지 않는다. 실행 중인 사용자 PID는 종료하지 않는다.
