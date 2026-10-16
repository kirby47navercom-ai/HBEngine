# HBEngine 누적 잔여 계속 — 172–174 설치 확인 — 2026-10-16

주인님 최종 지시: 남은거 다 하라고. 누적 전체 요구/조사 구현을 몇 개 묶음으로 대체하거나 전체 UE/Unity 분석/엔진 완료라고 말하지 않는다. 주인님/짚짱·자연스러운 존댓말. 실제 구현을 계속하고 마지막 검증/사용자 설치 갱신. 새 에이전트 허가 없으므로 spawn금지. 사용자 창/프로필/게임 보호, 숨긴 격리 EXE+고유 프로젝트만 검사. AI 친화·가벼움·Versions1 유지. 최종 답변 안 보냈고 계속 작업 중이다.

## 완료된 171–174

-171 feature4d87d64/receipt9eb803f 모두 이미 origin에 있음. 네트워크 기초+공개상태 C++재적용+Tree/명시가변높이+모프맵/Cue/스트리밍예산/충돌LOD/UV/샘플러/패치. docs/ENGINE_WORK_171.md/research JSON 근거. 옛설치77c55df75ff751bc는174로대체/정리완료. native binaries/SDK는171 빌드 뒤 CPP 변경 없으므로 174재빌드불필요였다.
-172 feature e31e6c1: 안정 ID JSON3방향병합/충돌선택/검증·revision·dryRun·Undo, 프로젝트Git status/diff/선택stage/unstage/commit/로컬작성자/부모repo쓰기보호. CPU13 xUCQ2e, Win32 7vjGj3 PASS. Git 충돌마커JSON은외부편집기, 정상JSON세버전만내부. remote/push/locking/graphvisualdiff 미구현. docs172.mjs 이미실행,재실행금지.
-173 feature6e76ea6: root/childstableID 로컬catalog network spawn/despawn, 호스트pool release/reacquire, static초기hide/restore+삭제표식latejoin, dynamic바이트회수, snapshot/reconnect, 거리/소유자범위, 128행4패킷perflush(총객체상한아님), client무권한create/destroy/descriptor변조거부. 같은 C++Scene::Spawn/Destroy/BP. CPU6 NJAfCZ/171회귀18 yXuGwo; 실제 D3DreleaseSSOFaF/WebGPU1o4CdI. 최종guard까지174플레이에서재확인. 노드773/코어289. 호스트키를공개에셋에넣지말것. Dedicated authoritative rules/prediction/replay/host migration/scene generations/attachment·refs/interest spatial acceleration/client pool 미완료. docs173.mjs 완료재실행금지.
-174 featureb35a17a8d7e8a98ec116395097510462e3f26d56: 재사용Widget/중첩override·event·binding/namespace/style/localization/순환·깊이16·펼친10000budget/readcache. WidgetEditor 참조선택/요소별보통입력/초기화+고급JSON·미리보기Undo. UIWidget tracked는카메라향하는화면투영DOM이며lit/depthUI mesh아님; worldoffset/drawsize/pivot/range/perspective·ortho size/offscreenhide/inputreset. UIBudget 기본2048instances/100000nodes 설정가능(기존32상한제거). async show교체/취소/actor·generation/동시예산/실패시기존UI보존. CPU9 TRMmiE; UIlayout/statecache/UIaudio 회귀; 실제D3Drelease wux60x·WebGPU5I6b2x. 실제좌표click→mappedBP→C++nestedText/이동/숨김복원 +173network양쪽role/C++spawn/despawn 모두PASS. world-ui.png 전체 시각 확인. Editor JvlGMJ 쉬운input/preview/Undo+172Git/merge PASS, widget-editor.png 시각확인. docs174.mjs 실행완료재실행금지.

## 174 사용자 설치/현재 Git

실제설치 C:/Users/kirby/HBEngine/Versions/15669948df76f42e/HBEngine.exe, full bundle15669948df76f42eb0b4045ea4bd767c2a740d94ac43d79ddffbf2d853457763. sourceb35a17a,2406manifest파일 실행후SHA확인. installed Editor engine-174-installed-rzP8Kj: UI쉬운입력/preview/Undo·병합사람/AI/dryRun/Undo·Gitstage/diff/commit/동일작성자, errors[]/exit0. merge/git/widget3captures 실제시각확인. 프로필10385파일 전/후/검사후 SHA 동일46024720c91a2d2eff0661b5c35304fb8acbbc646062762ae8cf492664443d26. 두바로가기/.hbproject 새EXE확인. 이전설치201448875바이트삭제, Versions1. USER_INSTALL174·WORK172/173/174설치영수증 갱신완료. globaltestcache정리 삭제0. finish174.mjs 완료, 재설치불필요.

172 e31e6c1/1736e76ea6/174b35a17a main 커밋했고 아직 origin push가다음단계(현재새영수증문서커밋전). 한글커밋·같은author/committer kirby47navercom-ai, AI트레일러없음. worktree에남은수정은174영수증/인계문서만(추가제품코드없음). 이를commit/push한뒤다음누적구현을계속한다. 설치후문서영수증은개발원장에있고설치본불변manifest를다시쓰지않는다.

## 실패/미종결 경계

172 최초종료9HKKLp/W9BNMd는fixtureGarden dirty저장확인창대기. 명시적인임시docdiscard로최종종료0. 저장뒤Garden이또dirty되는경로는아직미종결(DEBUG_HANDOFF). 저장대기만늘리는가설반복금지, 사용자doc로재현금지.
174 최초D3Ddev sXLXmF UI위잘림(recty-64),offset0이어도y-28; 실제fixture카메라16,-16확인하고UIAnchor y-8로고침. 최종wux60x/5I6b2x 화면경계/물리좌표click PASS. BKjaHq는검사selector가과거JSONtextarea에일반문자열을넣어거부/previewtimeout,최종JvlGMJ올바른input PASS. 제품UIvalidation낮추지않음.
Native간헐NavigationCompleted시작실패의근본원인은미확정. 이후표본통과를전체해결로표현금지. 실제Androidphone없음,Mac없으나이전remoteiOSsimulator근거있음. 실제기기열/배터리/음질/Apple서명스토어전체는미검증.

## 남은 원장/바로 다음

docs/research/ENGINE_STATUS.json latest174/78행 verified39 partial34 unimplemented2 unverified3. 각행정의범위만verified이며전체분모·완료율미확정/exhaustiveUEUnityfalse/corpusgatefalse. 전체remaining은이JSON이나node native/build/remaining175.mjs(읽기전용)로확인. 새문서read는primary공식본문구역을대조하고supplemental에미독/실패별도등록.

다음175후보 PHY02 독립관절프레임/기준각도(2D+3D) 조사시작. prototype/physics-world.js syncJoints113–139·scene-components.js constraint필드읽음. 현재 anchorA/autoanchorB 및 현재상대자세로fixed frame2·hingeaxes를만들고 slider는동일localaxis한개뿐. 새코드아직없음. Rapier d.ts예상 dynamics경로없음: rg --files로실제위치찾고공식joint문서와대조. cloth/vehicle/destruction도전체미완료이며독립프레임만추가해행전체완료승격금지. 그외UI자동내용높이/클래스상속/명명slots/litUIplane, WLD고급mesh·nav·LOD, RND08DFAO/lightmap/HWRT 등많은누적잔여계속.

## 실행/저장공간

exec_command.session_id는write_stdin으로, functions.wait는cellID에만. 도구출력이없어도새검사중복실행말고artifact/PID/session확인. 비멱등 native/build/write/wire/fix/docs 스크립트재실행금지. native/build는무시된임시작업스크립트/근거; 보고서/소스/캡처/명세보존, 생성Builds/WebView2/cache만tools/test-artifacts.mjs정리. PowerShell삭제는리터럴절대경로범위검증후네이티브cmdlet사용. 사용자앱/공유node/worker무차별kill금지. getCim으로지금검사의고유PID확인. 승인정책never: sandbox_permissions쓰지않음. 새의존성추가없고지금까지자동GPU읽기추가0.
