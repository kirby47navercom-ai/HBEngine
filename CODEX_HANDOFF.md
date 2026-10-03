# HBEngine 작업 인계 — 2026-10-03

- 누적 요구: Unreal/Unity의 전체 제작 흐름을 근거로 자체 C++/Win32/DX11 2D·2.5D·3D 엔진 구현. 사용자 사례로 범위를 줄이지 않는다. 사람에게 편한 전용 편집기와 AI의 구조화된 편집·실행 경로를 함께 구현한다.
- 2026-10-02 변경: 도킹 병합/분할과 브라우저별 탐색, 계층/다중 변환, 27종 컴포넌트와 고정 스텝 물리/게임 프레임워크, 실제 2D Sprite/Tile/Flipbook 제작/실행, 33노드 GLSL 머테리얼, C++ 서비스 19개, 에셋 ID/참조/재가져오기, revision 보호 편집 API/CLI, 같은 VM/C++를 사용하는 화면 없는 로직 실행기.
- 공식·원저자 자료 대조는 docs/ENGINE_WORKFLOW_RESEARCH.md, AI 계약은 docs/AI_ENGINE_API.md. 문서 전체 확인이나 상용 엔진 완성을 주장하지 않는다. DX11 renderer/HLSL, 정밀 물리, 자동 변환/cooking, 독립 게임 패키지 등은 연구 기록의 전체 작업 지도로 계속 관리한다.
- 기본 사용자 Projects/QuietGarden와 5173 서버는 건드리지 않는다. 별도 5181 서버는 native/build/integration-qa-1790942483241 프로젝트, 사용자 데이터 native/build/integration-user-data. 다음 UI 검증도 사용자 프로젝트 대신 이 독립 프로젝트를 사용한다.
- 통과: npm test, api:check, test:runtime, test:native, test:host, test:library, test:project, test:assets, test:server, test:windows, test:scene, test:2d, test:material, test:integration, test:headless, test:editor-api, test:launcher, test:hub-ui, test:session, desktop:build, test:desktop. 최신 관련 변경 후 해당 검사를 재실행했다. 실제 배포/루트 EXE의 WebView2 준비와 종료·소유 서버 정리도 통과했다.
- 실제 UI 확인: 타일 칠하기→Ctrl+Z→저장, Sprite atlas/crop/PPU/pivot, 머테리얼 100% 프레이밍과 프리셋 변경의 그래프/Inspector 동기화. 2D 전용 문서에서는 중복 전역 패널을 숨기고 도구·팔레트·캔버스·문서 속성을 사용한다. 화면 증거는 Git에서 제외한 native/build/ui-2d-integrated.png에 있다.
- 실제 편집기 API 확인: revision 충돌·잘못된 데이터 거부, Undo·저장·2D 플레이/일시 정지/복구, 실패한 Play 복구, 사용자 C++ 빌드, 2D→3D 장면 전환과 Stop 시 원본 복구. 서버는 현재 프로젝트 ID와 다른 이전 창의 automation poll을 거부한다.
- 장면 전환은 공통 play-world.js 준비 경로를 사용한다. BP Open Scene, C++ hb::Scene::Open, AI runtime.openScene과 화면 없는 실행기가 같은 검증을 거친다. 프레임 경계에서 이전 EndPlay(LevelTransition)·타이머·입력을 정리한다. EndPlay 하나가 실패해도 나머지 바인딩과 정리를 수행하고, 종료된 월드의 비동기 C++ 응답/장면 읽기는 버린다. 가산/스트리밍 장면은 남은 작업이다.
- 저장소 계정 kirby47navercom-ai만 사용하고 한글 제목·변경/검증 본문으로 체크포인트를 커밋·푸시한다. 전체 엔진의 남은 구현은 연구 기록의 작업 지도를 따른다. 텍스트 줄바꿈은 기존 HEAD와 같은 LF로 유지한다. 자동 생성물, 테스트 프로젝트, 스크린샷, dist/HBEngine, HBEngine.exe는 Git에 넣지 않는다. 종료된 하위 에이전트를 재개하지 않았다.

- 2026-10-03 구현: BB/BT/FSM/Montage/Sequence 독립 에셋·전용 에디터·실제 런타임, 14종 BT/11종 시퀀스, 표면 DecalGeometry, NavigationGrid/Agent/Obstacle·시야/소리/기억·계층 Tags·모듈식 CPU 파티클, 2D 탑다운 입력과 2D/3D AI/효과 프로젝트 템플릿. 합계 39종 컴포넌트, 444개 정적 BP 노드, 289코어+73실행 서비스 C++ API.
- 소스: gameplay-assets/runtime/editor/preview/templates.js, scene-systems.js와 기존 공통 scene/runtime/render/services 경로를 공유. Game.hpp 선언→BP 핀 생성→Bridge.hpp→실제 VM. trusted 코어 헤더는 각각 분석 후 병합해 사용자 헤더 100K 제한을 보존한다.
- 플레이 중 BB/BT/FSM/Montage/Sequence 읽기 전용 진단 창을 열고 실제 owner/node/state/value를 본다. 편집은 잠그고 동일 scene을 다시 열어도 runtime world를 덮지 않는다. 문서 복구에 마지막 scene 경로를 기록해 non-scene 에셋 활성 상태에서도 제대로 복원한다.
- 몽타주/시퀀스 preview는 실제 장면 GPU 객체와 world를 복제하고 공통 서비스로 시간 샘플링한다. CPU 파티클도 다시 계산한다. 에디터 원본 불변·이벤트/음향 muted·4,096 스텝 이후 큰 간격 한계. 실제 skeletal animation seek는 완료/일시정지 뒤 역방향 샘플도 검증했다. 실패한 몽타주 교체는 기존 재생을 보존한다.
- 추가 실제 검증: test:gameplay, test:systems의 C++ 명령 VM 재생/Actor[] 반환과 두 새 프로젝트 600프레임, 2D/3D 실제 Play, BT/FSM 강조/BB 실행 값, XYZ 편집→Undo revision 복원, 시퀀스 정·역 스크럽·재실행 장면 복원. 최신 desktop:build/test:desktop 통과. 화면은 native/build/ui-montage-integrated.png, ui-behavior-integrated.png, ui-sequence-integrated.png(ignored)에 보존한다.
- 남은 구현은 전체 지도 유지: DX11/HLSL·native 실행/게임 패키징, 다각형 NavMesh/경사/RVO, 계층 StateTree/EQS, animation bone blend/IK/리타깃/root motion, VFX graph/입자 충돌, terrain/foliage/LOD, UI 저작/audio mixer, import/cooking/build profiles, profiler/네트워크/플러그인. 완료와 메뉴 목록을 혼동하지 않는다. C++ 조회는 전달 snapshot이며 비동기 쓰기의 즉시 완료가 아니다.

## 이번 추가: 제작 조작·머테리얼·배치 / AI 공용 경로

- 사용자의 모든 누적 요구와 전체 확장 지도를 유지한다. 이번 완료는 상용 엔진 전체 완료가 아니다. 실제 자료 범위·적용/미구현은 ENGINE_WORKFLOW_RESEARCH 마지막 표에 기록했다.
- 이벤트 제목 실행 핀, 작은 Get 노드, 변수 핀 드래그 자동 Get/Set·실행선 보존·공용 C++ 변환, 역방향 연결/검색, 입력값 직접 편집·검색/접기/정렬/재배선, 검색형 컴포넌트 추가.
- placement-catalog의 38개 실제 조합, 2D/3D 평면 드래그·스냅, Q 선택·Space 도구 순환·CtrlSpace 창 최대화. collision-preview는 실제 solver bounds를 사용하고 부모/비활성/2D를 검사했다.
- 머테리얼 21종 추가(총 54): Fresnel/월드좌표/법선/시선/채널/벡터·절차적 패턴·수학, 4종 실제 노드 템플릿. GPU 컴파일 53종과 색상 픽셀 확인.
- API blueprint.connect / blueprint.variable.drop / scene.place는 revision/dryRun/원자성/Undo/저장과 UI 코드 공유. tools/check-authoring-editor.mjs는 authoring-qa 전용이며 실행할 때 새 검증 에셋을 생성한다.
- 실제 화면 검사에서 자동 노드 겹침과 inline input 반영 누락을 찾아 수정했다. 입력은 UI에서 7로 바꾼 뒤 document.get의 inputValues.value=7까지 확인. 배치 창에서 2D 스냅 드롭은 [2,-2,0] 확인. 머테리얼 템플릿 적용→Undo와 실제 파란 Fresnel 가장자리 확인.
- 회귀검증: npm test, test:authoring/runtime/scene/2d/material/integration/windows, test:library(실제 C++ 공용 함수 221종) 통과. Bridge.hpp Tags::Has의 기존 -Werror 괄호 경고 수정. 일반 test:editor-api는 기본 5181 서버가 없어 실행 전 실패했고 대신 이번 변경용 실제 authoring API 검사를 5182에서 통과했다.
- 사용자 Projects/QuietGarden과 5181 브라우저의 미저장 문서는 수정하지 않았다. 연결이 끊긴 5181 서버는 화면에서 확인한 동일 integration-qa-1790942483241 프로젝트와 기존 integration-user-data로 재시작했다. 사용자 탭은 새로고침하지 않았다. 테스트 파일은 native/build/authoring-qa와 authoring-user-data에 격리. UI 증거는 native/build/ui-authoring-blueprint.png, ui-authoring-material.png.

- desktop:build와 test:desktop(실제 EXE·WebView2·허브·한글 경로·자식 서버 종료), api:check까지 통과. Ctrl+K의 오브젝트 명령도 동일 배치 카탈로그 전체를 사용한다.

## 후속 추가: 전체 세부 요구 유지 / 위젯·오디오·참조·계측·2D

- 최신 사용자 요청은 Unreal/Unity 전 영역과 각 영역의 모든 내부 기능·필드·함수·조작·실행 규칙을 조사하고 추가하는 것이다. 예시는 범위 경계가 아니다. UI/audio 등 이번 변경을 전체 완료로 표시하지 않는다. 전 영역의 남은 작업은 REFERENCE_COVERAGE.md에 유지했다. 오래된 분야 표의 구현 상태를 갱신하고 초기 세부 표에는 당시 기록임을 표시했다.
- 실제 본문 확인 10개 추가 기록: docs/reference-index/detail-audit.json, AUTHORING_UI_AUDIO_RESEARCH.md. indexed/overview/detail/구현/검증을 구별한다. 실제 전체 매뉴얼/API/패키지를 다 읽었다고 하지 않는다. UE workflow 비교 본문의 버전 기준은 5.5.4/Unity6이며 최신 페이지 버전과 혼동하지 않는다.
- widget/ui-assets/editor/runtime/css: 14종 저작·단일 Canvas root·anchors/offset/alignment·레이아웃/스타일·해상도·계층/drag/resize·Ctrl C/X/V/D/Delete·하위 JSON clipboard·event/변수 name/ID binding·소유 BP custom event·32 instance/256 event 제한. 부모 disabled·TextInput submit 최신값·CheckBox click 최신값·소유자 파괴/Stop 정리까지 실제 DOM 검사.
- audio-mixer/editor: 64 bus/snapshot/128 exposed·routing·gain/filter/compressor·실제 Bypass 병렬 우회·snapshot/명시 override/Clear·HRTF/거리·source별 같은 clip·volume/비활성·late play 취소·preview/RMS. UI 9개+AudioMixer 4개 C++ 선언→생성 BP→Bridge→실제 서비스. 정적 BP 457개, 코어289+서비스86. blueprint-runtime의 생성 engineService dispatch 누락을 고쳤다.
- reference-viewer/assetRegistry: 한 번 registry scan→양방향 graph·별도 depth/breadth·중복/순환/누락·type/query dim·history·pan/Ctrl wheel/F/Ctrl F/R/D/L·copy/CSV. 삭제/재이름은 기존 redirect 계약을 유지한다. 저장 JSON을 자동 rewrite했다고 가정하지 않는다. Profiler: 실제 elapsed frame·BP/physics/AI/animation·C++ IPC·WebGL 제출/draw/triangles/resource 개수·bounded300 frames·기록/선택/검색/집계/JSON·AI read/record/clear. native CPU exclusive/GPU duration은 없다.
- Sprite 9-slice border[L,B,R,T]·editor 가이드·Simple/Sliced/Tiled 실제 BufferGeometry·cropped atlas UV·작은 target·continuous 반복/끝 crop. 기존 sprite 파일은 border/drawMode 생략을 허용한다. Adaptive/mask/sort layer/2D lighting 등은 남음.
- AI widget.add/reparent/duplicate/remove는 revision/dryRun·공용 계층 함수·실패 원자성/Undo·저장. 도구 스키마는 UI/audio/anchors/limits/exposed 계약을 함께 제공한다. C++ getter는 전달 snapshot이며 Show/Transition 비동기 즉시 완료를 가정하지 않는다. 헤드리스는 실제 DOM/audio가 필요하면 실패한다.
- 실제 검사 통과: npm test, api:check, test:ui-audio(실제 C++ -Wall -Wextra -Werror), scene/2d/integration/assets/windows/runtime/gameplay/library/systems/headless와 최신 desktop:build/test:desktop. test:server는 기존5173 서버가 없어 첫 실행은 실패했다. HB_SERVER_URL=5182 / HB_SERVER_ASSET=Assets/S_QA.hbaudioasset.json으로 전용 서버의 Range/CSP/Origin/header 검사를 통과했다.
- tools/check-ui-audio-editor.mjs(새 authoring-qa 파일만): widget dryRun/revision/원자성/하위 복제/삭제/Undo/Redo/저장·registry·실제 Garden play frame/render 통과. tools/check-audio-sources.mjs는 플랫폼 double로 수명/같은 clip/volume/late play를 검증한다. 실제 PCM/DOM/GPU와 혼동하지 않는다.
- prototype/tests/ui-audio.html 실제 브라우저 검사 통과: BP 버튼 event·submit/checkbox/disabled, PannerNode/listener, −6dB 비율0.5011869, mute/solo0, lowpass0.0022901, bypass0.7071176, GPU Sliced corner/center pixels·Tiled. 마지막 결과 native/build/ui-audio-browser.json, ui-audio-editor-evidence.json은 ignored. 개발 fixture는 사용자가 열던 문서를 수정하지 않는다.
- 위젯 vector 숫자 칸 폭·축 표시·고정/늘이기 offset 의미를 구분하고, 좁은 pane의 팔레트/계층을 별도 스크롤로 배치했다. 계층 선택 뒤 포커스·방향키의 늘이기 크기 보존·Undo를 실제 GUI로 확인했다. 값이 같은 change는 Undo를 추가하지 않는다. QA 탭도 dirty 상태의 reload는 beforeunload로 막힌다. QA 문서만 먼저 저장한 뒤 최신 모듈을 로드하며, 사용자 탭에는 적용하지 않는다.
- 사용자 5181 tab1/integration-qa-1790942483241 및 Projects/QuietGarden은 건드리지 않았다. 검증은 5182 authoring-qa / authoring-user-data / hbQaNewTab / hbRuntimeQaTab에 격리. PORT env로 server를 실행한다. 현재 own server exec56178(도구 세션 생존은 다음 턴에서 확인). 소스 최신 모듈을 포함한 루트 HBEngine.exe와 dist/HBEngine을 빌드했고 EXE 검사를 통과했다. 생성물/원문 cache/증거/QA 프로젝트는 Git에 넣지 않는다.
- 전체 남은 작업: native DX11/HLSL/game player/package, full import/cook/DDC, bone blend/rig/IK/retarget/root motion, precise physics/joints/CCD, NavMesh/RVO/EQS/계층 StateTree/Ability/network, world terrain/foliage/LOD/streaming, VFX graph/GPU/trails/collision, reusable widget/UI anim/font/localization/world UI/focus modes, audio sends/reverb/priority/native, native/GPU/memory/network profiling, XR/platform/plugins/version migration/source control와 모든 하위 매뉴얼/API의 조사·세부 구현. 새 큰 분야 하나를 추가했다고 나머지를 완료 처리하지 않는다.
