# HBEngine 현재 인계 — 설치430 검증·렌더링431 계속

## 목표와 현재 설치
- C++/Win32/DirectX11 자체2D·2.5D·3D 엔진, 사람이 쓰는 편집기와 AI의 동일 검증/Undo/텍스트 자산. 여러 누적 목표를 계속 구현해요. 정본 ENGINE_STATUS.json 등록78개는 UE/Unity 전체 분모가 아니고 전체본문/API gate 미승격·완료율 미확정이에요.
- 현재 설치420 C:\Users\kirby\HBEngine\Versions\73f3b3113b91e92e\HBEngine.exe /3267파일/Versions1. USER_INSTALL_420 정본.21owner/fullSHA·User10385전후읽기SHA·links2/.hbproject·설치Mcp9Iu/5BoRiz/zBEYST 통과.

## 현재 구현과 증거
- 426 WebGPU prep가post/각RTT 완료를직렬await하던순서를post의동기descriptorbuild→독립RTT전부제출→Promise.all로변경. r180 Renderer.compileAsync/Backend원본선택구간대조. 렌더러상태/epoch/devicehook즉시복원/0warmupdraw유지. 새GPU자원/readback0,worker/cache없음.
- controlledCPU baseline1→new4 첫완료전제출, out-of-order/실패후늦은완료무게시/sync제출throw/coldinit/cancel정리. actualGPU427 jCeTQi도nativepromise보류중1→4·별도raster색·네출력색정확. 인위보류시간은성능근거아님.
- 기존actual epoch366 Vo5q6Y: frozenold baselinevalid0/현재173/direct173/prepared-with-raster173,픽셀오차0·읽기/준비draw0·별도raster1. 145기존cancellation/drivererror/capture/profiler회귀통과. 취소시stage스냅샷보존,늦은완료는failed/cancelled진단미변경.
- source실제C++/BP WebGPU Complex141 gpu-scene-he1eiy 통과·path4990ms/시간guide4075ms 관찰. sourceUI/AI메타429는게임뒤추가했고핵심prep코드는그대로. 전체속도개선율/FPS나RND06완료주장없음.
- 429 인간profiler/AI가submitted/completed/total공유·단계중첩표시·순수불변pipelinePreparation계약. API/profiler snapshot/legacy/escaping/cancel1회CPU통과.
- source430등록: GPUWeb메서드단락·MDN기존145메서드재읽기·localr180선택구간 SHA. W3C4MiB본문fetch실패를미독으로유지. CORPUS전체gate/분모미확정,전체UEUnity분석주장없음.

## 다음 실행 순서
1. 430 원장/실제설치/정리/커밋검증완료. 완료one-shot재실행금지. 새작업431의초기컴파일·렌더링잔여를이어가요.
2. 이후초기compile/RND05/07전역곡면·매질/RND08기타렌더링·누적엔진계속. 비선형divide/power/reflect/noise fallback·작성UV/time/extreme범위유지. 전체완료허위선언/최종checkpoint금지.

## 작업 보호
- 주인님/짚짱·해요체·한글commit·author/committer동일kirby47navercom-ai, AI trailer없음. 명시적추가위임없이어gents생성금지. 최종checkpoint로끝내지말고사용자가요청한누적작업계속.
- 배경만: foreground/CUA/browser변경없음. hidden owned editorWindowProbe·고유project/profile/port/PID만. User프로필읽기SHA만,복사/테스트사용금지. activeInstalledVersions 확인후heavy/install.
- rg --files로소유자확인,큰singleline bounded출력. PowerShell에서복잡node-e편집금지·apply_patch/savedmjs. execsession은write_stdin. 원본·증거·캡처·명세보존,재생성cache32+참조/활성보호,삭제없으면빈정리기록없음.
- 이전미달HDRI4배MSE목표false,385원native전체실패후수정resume한정,Mac/Xcode/실제Android폰없음을정본대로유지해요.
