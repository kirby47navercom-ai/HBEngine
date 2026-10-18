# HBEngine 현재 인계 — 설치415 검증 완료·416 계속

## 목표와 현재 설치
- C++/Win32/DirectX11 자체2D·2.5D·3D 엔진, 사람이 쓰는 편집기와 AI의 동일 검증/Undo/텍스트 자산. 여러 누적 목표를 계속 구현해요. 정본 ENGINE_STATUS.json 등록78개는 UE/Unity 전체 분모가 아니고 전체본문/API gate 미승격·완료율 미확정이에요.
- 현재 설치415 C:\Users\kirby\HBEngine\Versions\e72c7905b43515f1\HBEngine.exe /3259파일/Versions1. USER_INSTALL_415 정본. 15owner/fullSHA·새playerf1e1a2970cd512ce69f4e8fa0af702dbdd84cea0653eaf8882d760dcb22c5c71·User10385읽기SHA·links2/.hbproject·설치 u1oaX2/jWVdIY 통과예요.

## 현재 구현과 증거
- 상대 삼각형 모서리로 UV차분을 직접 계산해 큰 월드 위치에 sub-ULP 폭을 더하며 잃던 mip 미분을 보존해요. 기본UV 보간/IR/constant buffer/샘플러는 같아요. GL/GPU/HLSL 현재·이전 포즈 모두 연결했어요. TSL GPU 함수는기존ScopedCall수명을따르고 native helper는사용할UV/필터에서만포함해요.
- 새생산자generator는표범위참조전모든RayProgram을검증하고standalone<algorithm>을포함해요. legacy/dynamic opcode/출력주소검증유지. 새GPU목표/텍스처/uniform/readback0.
- 실제411 baseline qC75cp: GL/GPU 폭.3125도(-1,0,0)으로잘못고른 0mip. 수정qk29SF는두API 이전큰mip(0,0,1),작은mip(-1,0,0);native9T3FyC오차0. 큰월드좌표1천만·이동/반전기하·Float64x1normal검사예요.
- 412CPU128독립affine조건 오차4.34e-17, 명시F32 point10000001-width.3125 차이0/상대UV차이-.078125. engineSchema.raySurfaceHistory.uvFootprint불변계약.
- 실제이전context GL/GPU bg07Rp와D3D zoaPe5의17조건: skin/morph/instance/smooth/UV/world/normal/view·이전기준·mip폭·기존4e-5통과. 413header CPU ZL2gfn10layout/legacy cases통과.
- GL mip-normal pair IkLwm9 baseline2664.9/current2576.6ms,source86532→86410B. 한쌍/부하cache미통제로속도개선이나RND06완료로세지않아요. 이전334 factoring미채택도유지해요.
- 새nativeplayer 재빌드73830완료. 실제Complex141패키지9mIBhk에서 path4615ms/시간guide4488ms·C++/BP/morph/캐시/해제통과. 이전410값과유의미한개선율로비교하지않아요.
- 첫native QvH32p는GLSL vec2(0) scalarconstructor의HLSL변환누락→공유helper vec2(0,0)로수정. 413EM15l0는standalone<algorithm>누락→생성원본에include추가/ZL2gfn통과. 제품실패·미실행과구분해보존해요.

## 다음 실행 순서
1. 415 구현/원장/설치/정리까지확인했어요. 완료one-shot재실행금지.
2. 416 중간큰좌표 add/panner/worldPosition graph에서상대UV폭이다시소실되는지실제재현후대응해요. 현재는삼각형UV루트만수정했고모든좌표graph완료가아니에요. rX/rY가절대이동값이라큰값을더한뒤뺄때소실될수있어요. 기존nonlinear finite-difference와texture-driven0미분근사를지켜요.
3. RND06초기compile·전역곡면/매질·누적원장계속. 설치415개발중수정금지. 새source검증/전환후단일Versions와User읽기보존.

## 작업 보호
- 주인님/짚짱·해요체·한글commit·author/committer동일kirby47navercom-ai, AI trailer없음. 명시적추가위임없이어gents생성금지. 최종checkpoint로끝내지말고사용자가요청한누적작업계속.
- 배경만: foreground/CUA/browser변경없음. hidden owned editorWindowProbe·고유project/profile/port/PID만. User프로필읽기SHA만,복사/테스트사용금지. activeInstalledVersions 확인후heavy/install.
- rg --files로소유자확인,큰singleline bounded출력. PowerShell에서복잡node-e편집금지·apply_patch/savedmjs. execsession은write_stdin. 원본·증거·캡처·명세보존,재생성cache32+참조/활성보호,삭제없으면빈정리기록없음.
- 이전미달HDRI4배MSE목표false,385원native전체실패후수정resume한정,Mac/Xcode/실제Android폰없음을정본대로유지해요.
