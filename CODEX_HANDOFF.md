# 현재 인계 — 거리장 카메라 LOD·렌더링/누적 목표 계속

2026-10-21. 장기 목표 active. 전체 누적 목표를 완료/정지로 바꾸지 않아요. 여러 변경을 모으고 관련 검사만 묶어요.

## 시작

AGENTS.md → docs/AI_START.md → node tools/hb.mjs context "작업명". 정본 docs/research/ENGINE_STATUS.json. 긴 과거 연구/API 전체를 선행 독서하지 않아요. 실제 설치는 context state.installation/로컬 HBEngine.install.json을 읽고 패키지의 이전 원장 영수증과 구분해요.

## 새 구현/검사

2538277·ENGINE_WORK_1094.json·research/DISTANCE_CAMERA_LOD_1093.md·DISTANCE_FIELD_LOD.md. 기하별 화면 footprint 거리장 해상도/공유 최대 요구/화면 밖 유지·낮춤250ms/기존필드/오래된목표취소/이중예약/낮춤자료해제·WeakMap 정지/TAA 투영/0인스턴스해제. PostProcessVolume mode/pixel 속성·사람 조건부 상세/Undo·AI CAS·기존 CPP/BP Components 함수·같은 GL/TSL/native atlas. 고정 기본값 유지·전역clipmap/정밀도보장/전체FPS가 아니에요.

1087-Olpdhf 독립 투영/계획/설정/FP·TAA. 1088-61t0cP 실제worker 취소/기존필드/예산/공유/인스턴스0/버전/정지40/종료.1089-90AoO2 실제GL/GPU128KiB→2KiB→128KiB·복원픽셀/직접광·GL프로그램유지/TAA투영0.1090-fkxIfi 실제CPP mode/zoom/pixels64·BP·D3D AO/복원/해제.1092-09eVy5 상세/조건부필드/Undo/CAS/저장/schema.기존912-c2j3xS 55,15/이전필드·예약·정지/취소,913/API/문법도 통과.최종 설치 게이트는 새 소스에 대조해요.

1090 초기16 기대는 근거 없는 sphere 가정이었고 실제12·실패0.엔진을 바꾸지 않았어요.1089 TAA 두렌더러의 CDP20초 제한은 소유작업을 시작하고 같은 핸들을 관찰하는 방식으로 수정. 실패를 통과로 세지 않아요.

## 설치

현재 확정 USER_INSTALL_1084.json: C:/Users/kirby/HBEngine/Versions/67a9e17734d12595/HBEngine.exe. 새1096 갱신 준비 중. native10지문/Player1040/Host1041 그대로라 엔진 재컴파일0. 사용자CPP 실행fixture는 별도 실제 컴파일이에요. sync1095/install1096/finish1097은 wx one-shot으로 만들며 완료 후 재실행하지 않아요. 이전one-shot도 완료했어요.

## 이어갈 잔여

RND06 약8/7초 GL 초기지연 유지.1086-ueGYSG SSA/0초기화 제거는 raw ABBA 약1%/74B라 미채택·관측성없는픽셀비교통과계산금지.같은 작은 SSA/초기화 실험을 반복하지 않아요.DEBUG_HANDOFF.md에 현재 진단만 두고 옛 긴 진단은Git3d83a96에서 읽어요.

전역거리장clipmap/타일·방향성하늘/bentnormal/시간신뢰도·변형체/지형/마스크/쿠킹·HWRT/방향성베이크, 이전프레임복합광학, 지형GPU브러시·Undo/검증/큰스캔, UI트리/다중목록재부모화/터치·복합측정/접근성·디자이너BP/C++샌드박스/별도native위젯객체·3D깊이/조명 및 다른 누적목표는 원장에서 이어가요. 이전1082 목록/1075 월드·위젯/AI 근거는 보존해요.

백그라운드만·사용자창/서버/프로필 검사·종료금지. 무거운 검사/설치 전 활성설치 보호. User읽기SHA/Versions1/캐시·임시런타임정리. 고정 보고서 재작성 전 SHA 증거 보존. 한글 동일author/committer 커밋·푸시. Android폰/Mac없음을 다시 묻지 않아요.
