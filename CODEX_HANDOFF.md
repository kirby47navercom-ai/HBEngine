# HBEngine 현재 인계 — 머테리얼 이력 구현·검증, 설치410 준비

## 목표와 현재 설치
- C++/Win32/DirectX11 자체2D·2.5D·3D 엔진, 사람이 쓰는 편집기와 AI의 동일 검증/Undo/텍스트 자산. 여러 누적 목표를 계속 구현해요. 정본 ENGINE_STATUS.json 등록78개는 UE/Unity 전체 분모가 아니고 전체본문/API gate 미승격·완료율 미확정이에요.
- 현재 설치400 aca3b432cab8636e/3240파일/Versions1, USER_INSTALL_400 정본. User10385 읽기 SHA 동일·15owner/fullmanifest·links2/.hbproject·GL wIN4qj/GPU nHEBHJ/native MyUk0i 통과. 설치410 전까지 불변이에요.

## 현재 구현과 증거
- GL 알파가 사용하지 않는 필드/width0 좌표 미분 그래프를 생성하지 않아요. 큐브 명시LOD 유지. TSL 알파 graph는 필요할 때 생성해요. CPU40148variants와 기존274 liveness/109 mips 통과. 실제cube GL/GPU lJ9Dup·D3D qqCocC 통과.
- normal-map.js 공유 decode: 길이0→중립탄젠트[0,0,1], CPU·일반GL/GPU/D3D와광선GL/GPU/생성HLSL에연결. engineSchema.raySurfaceHistory.normalDecode 불변계약. CPU40228cases·GL/GPU Drz3va의일반raster/이동·반전이전필드/큰mip중립·작은mip(-X)·D3D t4cNKo 통과.
- guideFrames의 지원되는비정상필드world/normal/view 입력 일괄 -2표시를정리. legacy -2 decoder와누락포즈/퇴화거부유지. CPU40530field/op조합·동적reset12cases cOjYWU·전체GL/GPU AvODAv/전체D3D J1PA6V 공간입력 roughness/color/coat 동일·변경·복원 통과.
- max감산으로NaN이숨는실제52불일치(BQWH0I)를채널별비교로수정. GL/GPU g0Wef1·D3D bnEStl 각28케이스×3판정이CPU와일치. coat미관찰zw는무시유지. GPU목표/읽기/프레임별추가pass0.
- 초기GL fullguide/path 비교 ukwapo는baseline source81408/program21839→81112/21543 bytes. 준비2004.9→2011.6ms 한쌍, 부하/cache미통제. 속도향상/RND06완료로세지않아요.
- 실제D3D패키지Complex141 nXXUre: C++/BP·노멀UV graph·morph변화·disable해제·두nativecache상한 통과. path4689ms/시간guide4829ms이며여전히추가절감대상이에요. 첫LwGvlA는일반DirectX helper누락을발견했고native-materials.js에공유선언을추가해고쳤어요. 최초실패를통과로세지않아요.
- 마지막desktop재빌드48817은완료됐고406공유HLSL 포함. 이후native-materials.js는JS선언만변경되어새native재빌드없이data sync해요. 최초403정수GLSL literal/중립점두width조건·405핀타입·406standalone helper/vector lvalue fixture실패는증거보존. 기준/마감/허용오차완화없어요.

## 다음 실행 순서
1. source/EOL/한글commit→record410/sourceHashes/원장/MAT03·RND06/07·AI03→한글record commit.
2. source/dist data sync410(새nativeplayer유지), 실제설치403양API normal/mip/raster와350두D3D게임·fullmanifest/owners/player/links2/association/User읽기SHA/Versions1 확인. 사용자활성이면보류/queue해요.
3. receipt/한글commit/push, own재생성프로필·Builds·probe.exe만경계검사후정리. 설치이전사본은하나만남겨요. 완료one-shot과*.started재실행금지.
4. 누적RND06의복잡GL/native/GPU초기컴파일및전역곡면/투명경로·고급셰이딩/매질·나머지엔진원장을계속해요. 이번부분을전체목표완료라고하지않아요.

## 작업 보호
- 주인님/짚짱·해요체·한글commit·author/committer동일kirby47navercom-ai, AI trailer없음. 명시적추가위임없이어gents생성금지. 최종checkpoint로끝내지말고사용자가요청한누적작업계속.
- 배경만: foreground/CUA/browser변경없음. hidden owned editorWindowProbe·고유project/profile/port/PID만. User프로필읽기SHA만,복사/테스트사용금지. activeInstalledVersions 확인후heavy/install.
- rg --files로소유자확인,큰singleline bounded출력. PowerShell에서복잡node-e편집금지·apply_patch/savedmjs. execsession은write_stdin. 원본·증거·캡처·명세보존,재생성cache32+참조/활성보호,삭제없으면빈정리기록없음.
- 이전미달HDRI4배MSE목표false,385원native전체실패후수정resume한정,Mac/Xcode/실제Android폰없음을정본대로유지해요.
