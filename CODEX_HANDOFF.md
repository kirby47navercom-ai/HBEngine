# HBEngine — 165 — 2026-10-16

현재 지시: 짧은 기능 하나로 끝내지 말고 누적 잔여를 큰 묶음으로 구현·검사·설치 갱신. 사용자 요구는 AI와 사람 모두 다루기 쉬운 가벼운 C++/Win32/DirectX 자체 2D·2.5D·3D 엔진. 한국어 커밋/푸시, 사용자 작업/프로필 보호, Versions1.

165 묶음은 기준2d563b7 잔여39행 중20행에 실제 제작/실행을 추가했다. 상위 행 전체 완료로 승격하지 않았다. 현재 등록78행: verified39 / partial31 / unimplemented5 / unverified3. 전체 corpus/API 분석 gate 미통과. 전체 기능 완료율은 미확정.

최신 단일 기준: docs/ENGINE_STATUS.md + docs/research/ENGINE_STATUS.json. 20행 범위·제약·사용 경로: docs/ENGINE_WORK_165.md. 계획/기계 검사: docs/research/BATCH_165_PLAN.json, ENGINE_WORK_165.json. 설치 전환 후 USER_INSTALL_165.json이 실제 버전을 기록한다. 이전 설치16e137715970d7cd는 새 전환 성공 후 정리한다.

추가 구현: glTF/GLB/OBJ 하위ID/override, 쿠킹 캐시, 프리팹 상속/중첩/override; 메시·지형·폴리지·LOD 전용 제작과 충돌; 삼각 NavMesh/링크/국소 군중 회피; 2D 계층 포즈 베이크/자동 타일; 모프/커브/notify 베이크 보존/Take; 능력/효과/속성/비용/쿨다운/태그/주기; EQS/일반 병렬; 지역화/스타일/가상 목록; DSP/send; GPU 시트/이미터 리본/하위 수명; AI 전용 명령; 오프라인 증분 압축 패치.

검사: check-batch-165 17검사군; runtime 실제 C++/BP/하위이미터 생성/해제; 숨김 실제 Editor10종/브러시 Undo/10만행 DOM11개/언어/실제 PCM/Take버튼; WebGPU 실제 파이프라인 CPU 입자/읽기0; D3D11 시트 적/청 실제픽셀; 개발/릴리스 독립 D3D11 플레이어와 릴리스 캡처차단. 기존 core/native/UI-audio/gameplay/retarget 회귀 통과. 상세 영수증 경로/SHA는 ENGINE_WORK_165.json. 원본 게임·사용자 창/프로필에 검사하지 않았다.

다음에는 원장의 parentScopeRemaining을 계속 구현한다. 메시 간선/용접/bevel·UV, GPU 대형 지형/holes/foliage개별편집, 애니메이션/충돌LOD, 동적 NavMesh/RVO, 전체 압축 쿠킹, 인스턴스 prefab override병합, network ability prediction, particle별 GPU events/ribbon, 전체 컴포넌트 Take, world UI/접근성, native DSP/sidechain, patch crash journal/VCS 및 원장의 다른19행도 남아 있다. 이미 추가한 작은 범위를 되풀이하거나 재조사만으로 완료를 만들지 않는다.

Android 실제 휴대폰 없음, Mac/Xcode 없음. 이전 PC/Android/iOS/Web 구현과 미검증을 구분한다. 새 업데이트는 user install tool로만 하고 사용자 설치를 개발 중 직접 수정하지 않는다. 무거운 중복 검사/프로필/빌드/버전을 쌓지 않는다. tools/test-artifacts.mjs 정리와 실행 중 경로 보호를 유지한다.
