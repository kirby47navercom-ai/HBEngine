# 현재 인계 — AI 첫 탐색 개선

갱신: 2026-10-20. **최신 사용자 지시: 기존 렌더링/누적 작업은 멈추고, AI가 처음 엔진을 파악하는 시간을 줄인 뒤 이번 작업을 끝내요. 재개 지시 전 장기 작업을 이어가지 않아요.**

## 시작

- `AGENTS.md` → `docs/AI_START.md` → `node tools/hb.mjs context "작업명"`.
- 현재 Git·확정 원장·설치는 context에서 조회해요. 큰 문서/과거 인계를 전체 읽지 않아요.
- 과거 인계 원문은 `docs/archive/CODEX_HANDOFF_THROUGH_1049.md`로 이동했어요. 현재 사실보다 우선하지 않아요. DEBUG_HANDOFF.md도 과거 진단이며 새 첫 시작의 필수 독서가 아니에요.

## 이번 작업

- 오프라인 context: 26개 분야, 현재 소유 파일·원장 ID·최근 근거·검사 후보, 정확한 심볼의 파일/줄/열/짧은 발췌. Git 상태와 원장은 실행 시 읽어요.
- Codex/Claude 시작 안내를 같은 경로로 연결하고, 큰 API 응답은 `hb schema --section 점.경로`로 필요한 부분만 출력해요.
- 생성 헤더/캐시/스크린샷/사용자 프로젝트는 탐색하지 않아요. 서버/창/빌드/벡터 DB/백그라운드 감시를 시작하지 않아요.
- 배포 도구도 AGENTS.md/CLAUDE.md/현재 인계를 다음 빌드에 포함해요. 이번 작업은 사용자 설치본을 교체하거나 렌더링 코드를 배포하지 않아요.
- 확인 명령: `npm run test:ai-context`. 측정/결과는 `docs/research/AI_BOOTSTRAP_1058.json`에 기록해요.

## 보존한 이전 작업 — 재개 전 읽을 범위

- 확정 설치: USER_INSTALL_1048.json, Versions `3c8ee6dda5dbbcad` 하나. 새 Player1040/Host1041이며 이전 노멀/Float밉·실제 C++/BP 실행 검사는 영수증에 있어요.
- 미커밋 인스턴스 반사 경계: `prototype/reflection-probe-bounds.js`, `native-scene-renderer.js`, `reflection-probes.js`, `tools/check-probe-room-994-player.mjs`, `check-probe-instances-1050.mjs`, `instanced-probe-model-1052.mjs`. 이번 AI 탐색 작업과 섞어서 커밋/설치하지 않아요.
- 이미 끝난 증거: `native/build/probe-instances-1050.json`, `native/build/instance-gates1057.json`. CPU 100003 인스턴스·불변 프레임 재계산 0, glTF 인스턴스 실제 DX/GL/GPU 및 편집 가능한 foliage DX 검사가 통과했어요. 이유 없이 다시 실행하지 않아요.
- 남은 일: 이 변경의 문서/공식 읽기 범위·원장·통합 설치는 아직 확정 전이에요. RND-06 복잡 GL 초기 약 8/7초 지연 등 누적 잔여도 정본 원장에 남아 있어요. 작은 성공으로 전체 완료를 주장하지 않아요.

사용자 프로필/게임은 검사에 쓰지 않고 창/서버를 조작하지 않아요. 사용자 재개 요청 때는 미커밋 변경을 보존한 채 여러 구현을 묶고 마지막에 필요한 검사·설치만 진행해요.
