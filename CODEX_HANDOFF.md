# HBEngine — 166 — 2026-10-16

현재 요청: 165의20항목 남은 세부를 여러 개 묶어 제작/실행·마지막 검사·사용자 설치 갱신. AI 친화성/가벼움/Versions1 유지. 한국어 존댓말 주인님/짚짱. 한글 커밋·푸시, 사용자 창/프로필/게임 보호. 에이전트 추가 요청 없음.

166 구현: 메시 간선 선택/분할·용접/면복제·노멀/면별UV, 지형 holes/fill/stamp와 제한 영향 계산, 안정ID 폴리지 개별변환/복제/삭제, 가중 자동타일/인접 사본/회전프리뷰, 커브 편집/포즈혼합/속성·모프·머테리얼 구동 및 C++/BP GetCurve, 기본 컴포넌트 Take/속성 트랙/복원·비재귀축약, 위젯 디자이너 locale/style 공용resolver, Ed25519/복구저널 증분패치.

상세 docs/ENGINE_WORK_166.md + research/ENGINE_WORK_166.json. 165의20대상 중9부모행에 추가했으며 부모전체 완료0. 단일 원장 ENGINE_STATUS.json/md,78행 verified39/partial31/unimplemented5/unverified3. 전체 UE/Unity 분석 gate false/전체완료율 미확정. 지정 본문은 corpus supplemental166, 연결 API/미디어 미독 보존.

검사: 새12군/165회귀17군, core/native/UI-audio/gameplay/retarget/API. 실제C++ curveHeat, 숨김Editor12종/폴리지Undo/위젯en/컴포넌트Take, WebGPU/PCM, dev/release D3D11 Player. 소규모릴리스185frame 평균work2.53ms/p95 2.60ms,113.90fps(초기포함, 일반보장아님). 설치는 현재 전환 준비 중; 완료 뒤 USER_INSTALL_166.json과 이 문서 설치 경로를 갱신한다. 빌드와 실제EXE실행을 동시에 하면 dist runtime/node.exe 잠김; 순차로 실행한다.

소유자: mesh-topology/world-assets/world-rendering/world-asset-editor, sequence-properties/take-recorder/gameplay-runtime, animation-curve-sampler/animation-graph-runtime, widget-presentation/ui-editor/ui-runtime, tools/content-patch.mjs. schema/SDK/AI same owners. 새dependency·상시poll·GPU자동readback 없음. tools/check-batch-166[-runtime/-window/-player].mjs 재현. player --release --performance는 짧은185frame관찰, window --executable 경로 --smoke-only는 설치 실제 기동.

다음: 여전히 메시bevel/연속UV, 지형텍스처/GPU/부분전송, LOD/동적Nav, import/cook/prefab 세부, 다른모프mapping/고급리타게팅, audio/skeletal/구조체Take, ability network/GPU별입자event, 위젯world상속/nativeDSP, patch전원차단/원격/키배포/VCS 등 최신 원장 remaining. 작은완료범위를 전체완료로 보고하지 않는다. Mac/Xcode·Android기기 없음. 누적과 남은19행도 유지.
