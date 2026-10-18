# HBEngine 현재 인계 — 511–538 구현 검증, 묶음 설치·누적 작업 계속

## 목표·보호
- 주인님/짚짱·해요체. 누적 엔진/렌더링 전체 작업을 계속해요. 작은 checkpoint로 최종 답변을 보내지 않아요. ENGINE_STATUS78은 등록 항목이며 UE/Unity 전체 분모가 아니고 전체본문/API gate는 미승격이에요.
- background only. 사용자창/탭/서버/원본/프로필로 검사하지 않아요. 고유 hidden editorWindowProbe/프로젝트/포트/PID만. heavy/install 전 activeInstalledVersions 확인. User는 전후 SHA 읽기만.
- Versions1·실행 중 버전 보호·수정 파일만 PreservedChanges·소유 재생성자료만 정리. 한글 commit/push, author/committer kirby47navercom-ai 동일, AI trailer 없음. agents 추가 없음.

## 설치/커밋
- 현재 사용자 설치510 그대로: C:/Users/kirby/HBEngine/Versions/bd5f13e0145bd55d/HBEngine.exe. USER_INSTALL510 정본,3363files/20owner/User10385/Versions1.
- 최신 소스 커밋4909e4ae9ad02e2fd248e2b4a64f7cfc6047e80b:511 캐시 분리. 아직 push 전. docs ENGINE_WORK514/원장/전체515–538 코드는 uncommitted. 설치/푸시 작업 남아요.
- 511 NativeHost 설치 캐시를 base/Cache/NativeModules/<owner>/<key>, Dependencies/nlohmann/3.12.0로 분리. 소스 native/build/plugins 및 키 유지. 최근32+lease/실행/빌드보호·퇴역정리·실패/중복/취소 생성자료 정리·정상 디버거 소스 보존·컴파일트리 취소·close 재사용.512cCAhE7/5135RrPeN/기존cache kmU68y/SDK293JLEUFg/전송 통과. 프레임IO0. 기존 설치캐시41414504B 원인 확인.

## 515–538 현재 구현
- texture-sampling-mode.js 공통 계약: auto/lod/bias/gradient,4형식,2D/array vec2와volume/cube vec3,조건부UI핀/숨은JSON연결보존/Undo/AI schema. GLSL·TSL·native일반표면 및광선 생성기/현재이전프레임 입력연결.
- IR oldflags0..11 유지,tag64..111,12..63 거절. slot a좌표/b레이어·legacycubeLOD/c LOD·bias·gradX/d gradY. native variant240,길이64register/4096instruction기존유지. LOD/gradient는auto footprint생성안함. GPU variant키1024stride+alpha4096 충돌제거. Bias는 clamp전 raw cone LOD+[-16,15.99],footprint0이면level0.
- gpu-texture-sampling.js:이프로젝트 소유 TextureNode에만 WGSL array layer 인자·3D/cube vec3 gradient 복구. dependency/globalbuilder파일 미수정. authored cube setupUV는 envMapRotation과분리; 실제536CWBNbQ 서로다른6색/회전0·90/4mode/GL·TSL 통과.
- gpu-volume-mips.js:소유RGBA8/sRGB volume업로드시 compute 면적평균,odd크기/depth최대축밉수/선형sRGB,작은임시chain제출후destroy,device별pipeline재사용,유휴재생성0.53139wYKR 1x1x17·3x5x3·8x8x2×sRGB2 전부validation0·독립평균/.02양자화·6생성6파괴.
- lightmap-texture-mips.js:베이크단위32MiB또는초과한체인1개,명시LOD/gradient+가져온2D밉,SRGB선형평균/odd가중치. CPU점샘플auto/bias는footprint없어level0. material-runtime CPU 기본UV/큐브normal 및scalar→vector입력은GPU와맞춤.524/537+기존225HUinH3 13체크 통과.

## 실제 증거
- 518 JSON/pins/GLSL/HLSL16cases/240variants;501legacyUVancestor.
- 최종 rawBias520nykRGl GL/TSL16mode-kind:현재time1/커밋이전time0·노멀독립정답/교차오차0. 최종5217BLnKZ D3D16같은조건오차0. 이전520IeJr9r/52178enWC는잠정bias규칙이라최종으로계산금지.
- 527Wct1ei 실제D3D일반표면16case:base255/coarse187.528RJuJSm GL/TSL 실제공용loader/일반표면16case:base1/coarse.498039. validation을추가한후발견된Array/cube/3D오류를위두helper로고침. 추후설치528에서는helper최신+gpuError null단언을확인해요.
- 532ppzYJl 실제에디터 상세모드/핀/숨은연결/UndoRedo/저장/캡처 통과; 캡처를 view_image로확인. 함수창이아닌material #material-graph가정확selector.
- build533완료 새PlayerSHA052f8aa28b6057066ee7cdf3a3c044f05ff83c55b0ff24f79a728f42d74d5b09(3049472B),Host4313f834... . generateRayPrograms현재SHA b76fbc50... . C++생성기이후변경없고후속JS는dist재동기화해야해요.
- source535 actualPackagedC++/BP native-preparation-window-496-czYlkJ:--mip-controls가소유복사본M_Complex141에Alpha→bias를추가,기존hb::Materials::SetFloat실제호출D3D11 parameters.Alpha=1; pending23frame/C++4.44ms/disable92.86ms/샘플0/workeridle0. 원본fixture수정안함.
- regression538.json 9gates완료:6material/CPU+501+old499+old500 통과. 새old499/500작업경로는JSON stdout에서찾아요. legacy4형식/기존normal계산보존.

## 바로 다음
1. Source515–538 코드 commit/문서 ENGINE_WORK538+연구원장/사용자문서/TEXTURE_SAMPLING538, refs538 snapshot/corpus이미완료. research문서본문작성·sourceHash와실패구분남음. MAT03 remaining에서명시LOD/Bias/Gradient통합제작은빼고HDR/압축/custom array-volume mips/streaming/normalvariance/raw자동import/subULP정밀은유지. 전체gate 미승격.
2. 마지막data sync+설치갱신(예:539 또는541)에만전환. 기존sync510/install510/finish510는완료one-shot 재실행금지. 새스크립트만. 설치528창검사(--executable지원추가필요)+496(--fixture VsRtt0,--mip-controls,--executable) 두검사면충분; source535/521/531/532근거와전체manifestSHA/User전후SHA/links/association/Versions1. installedTools496 owners에newRayPrograms/helperSHA추가또는fullmanifest로확인. installedtool 직접CLI는자체node가active분류되므로 source-owned process.argv+dynamic import패턴유지.
3. NativeCache설치검사:installedSDK게임빌드로Versions/native/build가생기지않고새 base/Cache/NativeModules가생기는지,게임끝난lease0/size보존. 유지최근32는게임objectcap이아니에요. 기존510퇴역시220MB정도사라지며공용cache는따로bounded.
4. 여기서최종checkpoint로끝내지말고남은normal variance/혼합normal441·곡면/매질/GI·초기GL/FXC·누적2D/애니/월드/game/editor/deploy계속. FXC전체는아직초단위. 초기지연해결/상용전체완료로포장금지.

## 도구·남긴 실패
- exec session은write_stdin, functions yieldedcell만wait. rg는디렉터리 + -g, wildcard경로금지. JS replace to callback(달러치환오염주의). Node-e 대신savedmjs. g++ -o repo상대. 파일LF/git diff --check.
- 512PS5중첩배열/JSreplace오염회복은DEBUG.515–538독립검사:parameter빈문자열→delete,1m평면span/큐브면경계가틀린정답,532함수창selector,536문자열regex/큐브경계mip보간/undefined오류필드정규화. 실패는증거에남기고완료성과에세지않아요.
- 현재 소유 running sessions 없음(종료결과받은27251는write_stdin으로최종소비가능). free약434.7GiB. no8hsoak/사용자창/실기기검사없음. Mac/Xcode/Android폰없음.

- 538 source6234e430902637697dca3b8262188012a9ae62ec 커밋완료. record538/refs538 완료(47ownerSHA/13gates), docs538/514/원장/CODEX 아직다음commit대기. preinstall539는source528에--executable선택만추가했고Work538SHA갱신. 다음sync/install541 2gates(528실제설치표면/496--mip-controls새게임),아직사용자510유지. 새Player052f8aa..,source535czYlkJ,최종현재이전520nykRGl/5217BLnKZ,volume53139wYKR,cube536CWBNbQ,legacy9gate538모두통과.

-541 설치/검증완료: C:\Users\kirby\HBEngine\Versions\c18dc18036317c46\HBEngine.exe /3391전체SHA/47owner/Versions1/User10385전후읽기SHA/links2/.hbproject. 설치528XMFmlU 실제GL/TSL16표면·496kvJTZj 설치SDK/packager/player C++Alpha→bias/22frame/5.61ms/중지92.90ms/샘플0/idleworker0. Source6234/38ee664까지push완료. commonNativeCache 41414995B/lease0,Versions native/build없음. 이전510 220378899B와probe2170688B정리. finish541·setup/sync/install541 one-shot 재실행금지. receipt/원장마지막commit/push한뒤끝내지말고normal variance roughness합성·준비지연등계속.
