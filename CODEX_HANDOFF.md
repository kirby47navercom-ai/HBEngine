# HBEngine 현재 인계 — 설치450 검증·렌더링451 계속

## 목표와 현재 설치
- C++/Win32/DirectX11 자체2D·2.5D·3D 엔진, 사람이 쓰는 편집기와 AI의 동일 검증/Undo/텍스트 자산. 여러 누적 목표를 계속 구현해요. 정본 ENGINE_STATUS.json 등록78개는 UE/Unity 전체 분모가 아니고 전체본문/API gate 미승격·완료율 미확정이에요.
- 현재 설치450 C:\Users\kirby\HBEngine\Versions\4ce36135306357d5\HBEngine.exe /3310파일/Versions1. USER_INSTALL_450 정본.20owner/fullSHA·새playerb70a95a4698f228f38786e93114e351974bdb8546667c5a9ac52f0520afb8156·User10385전후읽기SHA·links2/.hbproject·설치 nonlinear-graphs-444-zopkYY / shader-cache-window-350-7Esfdl 통과.

## 현재 구현과 증거
- 445 설치4ffd07face0d2a99·3303파일·23owner·User10385읽기SHA·Versions1·ejw5lo8graph/VfeVjV두D3D게임6저장/6적중0재저장통과. 이전440설치178404828B·검사exe1773500B정리. USER_INSTALL445정본.
- 443–445 8비선형(power/exp/log/smoothstep/normalMap/Fresnel/두gradient)세API40연산699조건 C9uScy/native2uuUr6·8graph uc8LcF/16nativeKBwRDu·실게임VWxJFX 통과. 작은변화1e-10오차3.55e-15,기존573오차3.59e-6,새큰6305출력한조건2e-3기준(실제.00085). AI43연산,noise/checker잔여.
- 446 coordinate ancestry로보조함수선택·레지스터덮어쓰기/고정LOD/고정spatial제외·프로그램준비때만계산. GL/GPU8graph13nApw/nativecis6qV16패킷및C++metadata/JS일치. D3DPreprocessWiRBhR22조건·모든shade op있어도coordinate없으면helper0/divide만있으면1.
- 448–449 nativeGUIDE는같은GL생성기 no-lens기본/aux·lens공유노멀. lens bool을guide cachekey에포함. generic기본호환유지. 448 yH2hn7/oqDkqK 각6필드 이력변화/거부/복원통과(이둘은이전unbatched도구). 449 TI5wJN 실제16x16 8경우(base/coat×lens×primary/aux)generic과오차0·이력복원. 449는셰이더당3상수frame한compile·공통HLSL+조건SHA로중복보존감소.
- 450 JWCxie production ScreenEffectsPass.begin 실제GPU: 초기5compile·lens2만추가·해제cache2hit·stable추가0·sourceBuild1·target288B고정/release0·기존8MiBcache454294B·disk미설정. AI nativeGuides불변계약. 새GPU자원/uniform/readback없음.
- 448 실패OaV8rm은공통GLvec3(0)가HLSL생성자에맞지않아native생성때literal성분을명시해수정. 4504Wcycr은검사CPP경고를braces로수정. 449시간은미통제쌍측관찰(기본1178–1600→453–1148ms/aux2853–3548→2348–3104),FPS/전체지연해결주장아님.
- 혼합노멀441–442 실험 ray-mixed-normal-context 기본미채택유지:GL17×3오차0(9IIJ9N),ABBA9x9kg2원본2590/2592·혼합2448/2551ms(부하/캐시미통제). CPP/TSL/coat/전체guide/속도후속필요.

## 다음 실행 순서
1. 450 설치/전체지문/User읽기보존/Versions1/정리 확인. 완료one-shot재실행금지. 451 이후작업을계속해요.
2. 451 공식선택본문/API 새대조등록·캐시3문서347029/22567/15367B·TEXTURE_MIP_POLICY451. 현재 구현시작대상452: first-class texture2d JSON 이미지참조+별도import-policy, 역할/linear/sRGB·coverage/cutoff·하위normal정규화/flipGreen·topMip/maxSize·공통CPUcook→GL/GPU2D명시mip/DX명시mip/ray같은chain→상세UI/Undo/AI/재적용/패키지. 로컬Three r180 array/3D manual경로는같다고가정금지. 압축/variance-roughness/array-volume도원장유지. 원본이미지/기존raw참조호환·완료전승격금지. noise/checker·RND08·compile도이어가고최종checkpoint로중단하지않아요.
3. RND05/07전역곡면/변경투명경로/참여매질·나머지누적엔진목표계속. 전체gate/분모미확정 유지·실기기/iOS없는검증범위구분.

## 작업 보호
- 주인님/짚짱·해요체·한글commit·author/committer동일kirby47navercom-ai, AI trailer없음. 명시적추가위임없이어gents생성금지. 최종checkpoint로끝내지말고사용자가요청한누적작업계속.
- 배경만: foreground/CUA/browser변경없음. hidden owned editorWindowProbe·고유project/profile/port/PID만. User프로필읽기SHA만,복사/테스트사용금지. activeInstalledVersions 확인후heavy/install.
- rg --files로소유자확인,큰singleline bounded출력. PowerShell에서복잡node-e편집금지·apply_patch/savedmjs. execsession은write_stdin. 원본·증거·캡처·명세보존,재생성cache32+참조/활성보호,삭제없으면빈정리기록없음.
- 이전미달HDRI4배MSE목표false,385원native전체실패후수정resume한정,Mac/Xcode/실제Android폰없음을정본대로유지해요.
