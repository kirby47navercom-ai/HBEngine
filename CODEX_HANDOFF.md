# 현재 인계 — 위젯 제작·실행과 빠른 설치 식별

갱신: 2026-10-20. 최신 요청은 멈추지 않고 구현을 묶어 비용을 줄이는 것이에요. 작은 기능마다 전체 검사/설치를 반복하지 않아요.

## 시작

AGENTS.md → docs/AI_START.md → node tools/hb.mjs context "작업명". 정본 원장 docs/research/ENGINE_STATUS.json. 과거 인계 전체를 선행 독서하지 않아요. 설치본의 실제 폴더/번들은 context의 state.installation 또는 HBEngine.install.json으로 읽고, 원장의 이전 설치 영수증과 구분해요. context는 전체 파일을 재해시하지 않아요.

## 이번 소스

UI d9cc629, AI 설치식별84a0e48, 원장 ENGINE_WORK_1070.json. 위젯 부모/기본값/상속 슬롯·노출/지역 초기표시·소유자 lifecycle, 복합 행/자료/항목이벤트·전역 UI 예산·큰 논리스크롤·공유 FontFace·사람/AI 편집/Undo/이름변경/콘텐츠 수집. 자세한 계약 docs/WIDGET_CLASSES_AND_LISTS.md, 증거 docs/research/WIDGET_BATCH_1069.md.

1069 관련6검사 약19초: 100000행/논리409600000px/물리4000000px/풀6·측정행 너비변경 끝앵커·휠/합성터치/입력키. 2000복합항목 행7/노드28/FontFace1·행1999 이벤트·예산 초과 표시/다른 인스턴스 거절/해제0. 초기화 전 HUD·재진입·해제 부활/동시 생성 경합도 통과. 격리 1071 마커/AI 시작 회귀 통과. 네이티브10소유 SHA 동일로 Player1040/Host1041 재사용, 재컴파일0.

## 설치와 이후

1072 설치/검증을 확정했어요. USER_INSTALL_1072.json과 ENGINE_STATUS 최신 설치에 결과가 있어요. 패키지에 담긴 이 파일은 배포 준비 시점의 복사본일 수 있으니 실제 설치 식별은 로컬 마커를 우선 읽어요. sync1071/install1072/finish1073은 one-shot이며 started/영수증을 확인하고 재실행하지 않아요.

현재 남은 항목은 원장에 있어요. 디자이너 임의 BP/C++ 샌드박스/별도 native 위젯 객체·3D UI 조명/깊이·양방향 행자료/다중선택·실기기는 이번에 완료로 승격하지 않아요. 복잡 GL 초기 지연·이전 프레임 광학 이력·다른 누적 엔진 목표도 유지해요. 전체 분석/엔진 완료율은 계산하지 않아요.

백그라운드만, 사용자 창/서버/프로필을 검사에 쓰거나 종료하지 않아요. 활성 설치가 있으면 검사를 미루고 Versions 하나 유지·캐시 누적 방지·관련 증거/실행 파일 재사용을 지켜요.

확정 설치1072: C:\Users\kirby\HBEngine\Versions\412358fb4a17500d /3764파일/446소유SHA/CPP14·User읽기SHA보존·Versions1. 실제1067RFw5l3와 context마커 대조 통과. 이전183337859B 정리·재컴파일0. sync1071/install1072/finish1073은 완료했으니 재실행하지 않아요.
