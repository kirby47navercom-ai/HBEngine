# 현재 인계 — 위젯·AI·월드 비용 묶음 설치 확정

갱신: 2026-10-20. 최신 요청은 여러 구현을 모아 비용·반복 검사를 줄이며 계속 진행하는 것이에요.

## 시작

AGENTS.md → docs/AI_START.md → node tools/hb.mjs context "작업명". 정본 docs/research/ENGINE_STATUS.json. 큰 과거 인계/연구/API 전체를 선행 독서하지 않아요. 설치본은 context state.installation/로컬 HBEngine.install.json으로 실제 번들을 읽고 원장의 이전 영수증과 구분해요. context는 전체 파일을 재해시하지 않아요.

## 확정 설치

USER_INSTALL_1077.json: C:/Users/kirby/HBEngine/Versions/884e599a4157ab0e/HBEngine.exe. 3769파일/449소유SHA/CPP검사원본14·User10849읽기전후SHA/연결/Versions1 검증. native10 SHA 같아 Player1040/Host1041 재사용, 재컴파일0. 이전183490860B 정리·공유캐시삭제0/빈영수증없음. sync1076/install1077/finish1078은 완료 one-shot으로 재실행하지 않아요.

## 구현과 근거

- UI d9cc629/AI84a0e48, ENGINE_WORK_1070.json·USER_INSTALL_1072.json. 위젯 상속/기본값/슬롯노출·지역초기표시/소유자 lifecycle·복합행/바인딩/항목이벤트/전역예산·논리스크롤/입력키/공유FontFace·사람/AI/Undo/참조수집. WIDGET_CLASSES_AND_LISTS.md, research/WIDGET_BATCH_1069.md.
- UI 실제1067RFw5l3: 100000행/논리409600000px/물리4000000px/풀6·측정행 너비변경 끝앵커·2000복합항목 행7/노드28/FontFace1·행1999 이벤트·전역예산/해제·첫프레임전HUD. 동일 UI 소유자는1077에서 증거 재사용.
- 월드2d47b2e, ENGINE_WORK_1075.json·research/WORLD_DRAFT_1075.md. withWorldDraft 동기 소유초안으로 사람/AI 편집 전체복사2→1. 지형8/폴리지5연산·평활화 원래이웃/순수불변성/소유범위해제·실제edit 메서드/격리훅의 스트로크Undo·실패복원. 20003인스턴스 단일CPU 약64–79→23–34ms. 전체FPS/모든Undo비용으로 확대하지 않아요.
- 설치 실제1060yl9khC: 사람/AI/Undo/키/지형408B·폴리지64B 부분GPU·새버퍼0·읽기revision불변·정상종료. context 실제설치마커 대조.

## 이어갈 잔여와 규칙

첫 문서복사·Undo스냅샷·전체검증/변경비교·큰선택/브러시스캔·텍스처지형/GPU직접브러시, 디자이너 임의BP/C++샌드박스/별도native위젯객체·3D UI조명/깊이·양방향행자료/다중선택·실기기와 다른 누적목표는 원장에 남아 있어요. 복잡GL 초기지연·이전프레임 광학이력도 유지해요. 전체분석/엔진 완료율은 계산하지 않아요.

구현을 묶고 관련 검사만 마지막에, 같은 소유 코드의 실행파일·증거를 재사용해요. 고정이름 보고서를 다시 쓰기 전 과거 원장에 연결한 SHA 증거를 보존하고 새 실행을 별도 기록해요. 최신1059 회귀는 world-draft-1074-regression1059.json에 분리했어요. 백그라운드만·사용자창/서버/프로필 검사·종료금지·활성설치보호·Versions하나·캐시누적방지를 지켜요.
