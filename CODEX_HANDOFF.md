# HBEngine 현재 인계 — 설치400 검증 완료, 401 계속

## 목표와 현재 설치
- C++/Win32/DirectX11 자체 2D·2.5D·3D 엔진. Unity/Unreal 제작 기능·UI/UX·실행과 누적 요구를 계속 구현해요. 사람과 AI가 같은 검증/Undo/텍스트 자산/명령을 사용하며 가벼움·저장공간을 유지해요. 전체 원장은 docs/research/ENGINE_STATUS.json이며 등록78개는 전체UE/Unity 분모가 아니에요. 전체본문/API 분석 gate 미승격·완료율 미확정이에요.
- 현재 설치400: C:\Users\kirby\HBEngine\Versions\aca3b432cab8636e\HBEngine.exe ·3240파일·Versions1. USER_INSTALL_400 정본. User10385읽기 SHA 동일·15owner/fullmanifest·links2/.hbproject·설치 GL wIN4qj/GPU nHEBHJ·native MyUk0i 통과예요.
- native player736388910254701ed708b3ef723f668eb22d3fd3b46c7d99dd1fe78da2aea5e4와host e42dcb39c493590a8acc58181375ad2cfd2f3e5eaaf2ce38fd58bd55be4aa3fd는400에서도동일해요. 이번에는JS/UI/진단만바뀌어native재빌드가필요없어요. 생성HLSL/API --check도통과했어요.

## 396–400 구현과 검증
- gpu-frame-timing.js: 기록opt-in만GPUquery, GL4상한·availability/disjoint/corequery, GPU표준timestampWrites·256슬롯/두2048B버퍼·한 read in flight. 인코더/device 메서드hook을동기그리기후즉시복원해요. 비동기세대·외부쿼리/overflow거부·자원퇴역·renderer.dispose를지켜요. GPUtime은GPU timeline/pass합계이며CPU/FPS/busy율과같지않아요.
- RuntimeProfiler같은recording setter/onClear→모든renderer즉시중지/지우기. 메인/추가viewport와MaterialPreviewScene실제draw 연결. 기존nativeGPU query 메타데이터도같은표로조회하지만native수집정책은바꾸지않아요. prof.read rendering[].gpuTiming과root engineSchema.gpuTiming 불변계약.
- GPU보기는기존dropdown에추가·CPU차트/샘플/IPC마크업생성생략·같은폰트·표padding4px. 주차된profiler가다른workspace에서중앙을덮지않고하단재열기. 기존도킹/분리창유지.
- CPU396 자원/순서/오류/부정지원/null·398 같은UI/AI setter/clear/XSS/native메타데이터 통과. 기존C++profiler 검사도통과.
- 실제397 NdjjYb: 두API3표본/같은픽셀, WebGPU32render+1compute, compute정수출력독립대조. 실제map진행중stop→retiring1→소유자0·stale표본게시0, GPU/GLerror0/exit0. 값0도API정밀도결과일수있고미지원NULL과구분해요.
- 실제editor399최종 GL wa4lfO / GPU3FU0uH: 인간record/clear·AIread/stop·메인/머테리얼·두행전체가시성·원본revision/SHA/exit0. 캡처를직접봤어요. 마지막metadata/CPU숨김최적화는단위검사완료,설치400에서두API UI를다시확인해요.
- 최초397 Dy7tyE는fixture renderer→material 해제순서, uZI5hF는16그리기=16pass라는오입력(실제로HDR+output32). 제품변경/임계완화없이fixture를고쳤어요. UI nZaGgl 마지막행8.21875px잘림은패딩으로고쳤고원래가시성조건을유지해요.

## 다음 실행 순서
1. 400 source/원장/설치가 모두 검증됐어요. 완료 one-shot 재실행 금지예요.
2. 401 RND06 복잡 초기컴파일: ray-material-shader/context-sharing/history/liveness 소유자를 읽고 정적IR/중복의 구체 원인부터 확인해요. 변경 뒤에만 기존 Complex141 조건으로 묶어 검사해요.
3. 이전 머테리얼 입력·노멀·밉 및 나머지 누적 원장을 이어서 구현해요. 설치400은 개발 중 수정하지 않아요.

## 계속 유지하는 잔여와 경계
- RND05/07 전역곡면·변경투명경로역대응/거친복합로브·참여매질footprint. RND06 복잡첫shader준비. RND08 DFAO/HWRT/방향성lightmap/shadowmask/probe/chartmip/고급매질/분할저장/cloud기하/카메라·이방성footprint.
- HDRI391–395는actualworker/세게임/독립적분/차폐·16,648B CDF/2856B queriedmip를구현했지만4배MSE목표false예요. 현재지정32samples×64rotation MSE12.8735→11.3237만근거예요. docs/HDRI_IMPORTANCE_395.md와ENGINE_WORK_395를참조해요.
- DBG02 스레드flow·외부/prebuilt명령/패스별trace·할당/누수/crash, 나머지2D/월드/애니메이션/게임/배포/AI 누적원장도유지해요. Mac/Xcode/Android실기기없음은검증제약이에요.
- 385의원래native전체도구실패를통과로세지않아요. 같은binary의corrected118/117 resume+이전완료120구역만근거예요. 상세과거기록은Git이력/ENGINE_WORK390·395/보존native/build증거를봐요.

## 작업 보호 규칙
- 주인님/짚짱·자연스러운한국어존댓말. 한글commit과동일author/committer kirby47navercom-ai <228715038+kirby47navercom-ai@users.noreply.github.com>. AI trailer/다른계정변경없음. 사용자가여러분야길게지속요청했으므로최종checkpoint몇개로멈추지않아요.
- 배경만: foreground/CUA/browser변경금지. hidden owned editorWindowProbe·고유프로젝트/프로필/포트/PID만. User프로필은읽기SHA목록만·복사/검사사용금지. 사용자활성시heavy보류.
- source/증거/캡처/명세는보존하고tools/test-artifacts.mjs로Builds/runtime/profile만정리. cache32+참조/활성보호·없으면빈정리기록생성금지. recursive삭제는resolved범위확인. Versions현재1·변경파일만보존·전체백업금지.
- 모든완료one-shot(390/395/이전번호와 *.started)은재실행하지않아요. fresh 이름/wx로새단계를만들어요. 400 prepare도실행후재사용금지예요.
- rg --files로파일확인후읽기. 긴singleline은bounded출력. PowerShell에서복잡한node -e 문자열편집을하지말고apply_patch/저장mjs를사용해요. 실패array/전체base64를출력하지않아요.
- 기존HEAD EOL보존·새파일LF·git diff --cached --check. 최신기록원본만현재handoff에유지해토큰을쌓지않아요.
