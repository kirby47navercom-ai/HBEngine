# HBEngine 현재 인계 — 설치410 검증 완료·411 계속

## 목표와 현재 설치
- C++/Win32/DirectX11 자체2D·2.5D·3D 엔진, 사람이 쓰는 편집기와 AI의 동일 검증/Undo/텍스트 자산. 여러 누적 목표를 계속 구현해요. 정본 ENGINE_STATUS.json 등록78개는 UE/Unity 전체 분모가 아니고 전체본문/API gate 미승격·완료율 미확정이에요.
- 현재 설치410 C:\Users\kirby\HBEngine\Versions\a07a23a239e6b865\HBEngine.exe /3255파일/Versions1. USER_INSTALL_410 정본. 28owner/fullSHA·새playerd2993edee253aad9599de5d0a7538b2a285f70926cf02f89435eb603b3de920b·User10385읽기SHA·links2/.hbproject·설치 CDhjNf/YCyRGS 통과예요.

## 현재 구현과 증거
- GL 알파가 사용하지 않는 필드/width0 좌표 미분 그래프를 생성하지 않아요. 큐브 명시LOD 유지. TSL 알파 graph는 필요할 때 생성해요. CPU40148variants와 기존274 liveness/109 mips 통과. 실제cube GL/GPU lJ9Dup·D3D qqCocC 통과.
- normal-map.js 공유 decode: 길이0→중립탄젠트[0,0,1], CPU·일반GL/GPU/D3D와광선GL/GPU/생성HLSL에연결. engineSchema.raySurfaceHistory.normalDecode 불변계약. CPU40228cases·GL/GPU Drz3va의일반raster/이동·반전이전필드/큰mip중립·작은mip(-X)·D3D t4cNKo 통과.
- guideFrames의 지원되는비정상필드world/normal/view 입력 일괄 -2표시를정리. legacy -2 decoder와누락포즈/퇴화거부유지. CPU40530field/op조합·동적reset12cases cOjYWU·전체GL/GPU AvODAv/전체D3D J1PA6V 공간입력 roughness/color/coat 동일·변경·복원 통과.
- max감산으로NaN이숨는실제52불일치(jVnxjW)를채널별비교로수정. GL/GPU g0Wef1·D3D bnEStl 각28케이스×3판정이CPU와일치. coat미관찰zw는무시유지. GPU목표/읽기/프레임별추가pass0.
- 초기GL fullguide/path 비교 ukwapo는baseline source81408/program21839→81112/21543 bytes. 준비2004.9→2011.6ms 한쌍, 부하/cache미통제. 속도향상/RND06완료로세지않아요.
- 실제D3D패키지Complex141 nXXUre: C++/BP·노멀UV graph·morph변화·disable해제·nativecache상한 통과. path4689ms/시간guide4829ms이며여전히추가절감대상이에요. 첫LwGvlA는일반DirectX helper누락을발견했고native-materials.js에공유선언을추가해고쳤어요. 최초실패를통과로세지않아요.
- 마지막desktop재빌드48817은완료됐고406공유HLSL 포함. 이후native-materials.js는JS선언만변경되어새native재빌드없이data sync해요. 최초403정수GLSL literal/중립점두width조건·405핀타입·406standalone helper/vector lvalue fixture실패는증거보존. 기준/마감/허용오차완화없어요.

## 다음 실행 순서
1. 410 구현·원장·설치·정리까지 검증됐어요. 완료one-shot(410/r1포함) 재실행 금지예요.
2. 411 누적 RND06 및 다음 렌더링을 계속해요. GL factoring334는 준비 시간 이득이 없어 기본 경로 미채택이었고 같은 실패 실험을 반복하지 않아요. 초기 컴파일의 인라인 호출/실제 사용 경로에서 다른 구체 원인을 확인한 뒤 수정해요.
3. 전역곡면/투명경로·고급매질·MAT03/나머지엔진원장도유지해요. 설치410은개발중수정하지않고다음검증/전환후이전사본정리예요.

## 작업 보호
- 주인님/짚짱·해요체·한글commit·author/committer동일kirby47navercom-ai, AI trailer없음. 명시적추가위임없이어gents생성금지. 최종checkpoint로끝내지말고사용자가요청한누적작업계속.
- 배경만: foreground/CUA/browser변경없음. hidden owned editorWindowProbe·고유project/profile/port/PID만. User프로필읽기SHA만,복사/테스트사용금지. activeInstalledVersions 확인후heavy/install.
- rg --files로소유자확인,큰singleline bounded출력. PowerShell에서복잡node-e편집금지·apply_patch/savedmjs. execsession은write_stdin. 원본·증거·캡처·명세보존,재생성cache32+참조/활성보호,삭제없으면빈정리기록없음.
- 이전미달HDRI4배MSE목표false,385원native전체실패후수정resume한정,Mac/Xcode/실제Android폰없음을정본대로유지해요.
