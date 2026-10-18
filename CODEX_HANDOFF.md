# HBEngine 현재 인계 — 551 설치 검증, 초기 준비·누적 목표 계속

## 보호와 작업
- 주인님/짚짱/해요체. 누적 전체 엔진 목표를 계속 구현해요. 작은 checkpoint로 최종 답변을 보내지 않아요. ENGINE_STATUS78은 전체 UE/Unity 분모가 아니고 전체 본문/API gate 미승격이에요.
- background only. 사용자 창/탭/서버/원본/프로필로 검사하지 않아요. 고유 hidden editorWindowProbe/프로젝트/포트/PID만. heavy/install 전 activeInstalledVersions, 사용자 프로세스 종료 금지.
- Versions1, 실행 중 버전 보호, 수정 파일만 PreservedChanges. User는 읽기 SHA만. 소유 재생성 자료만 경로/링크 검사 뒤 정리. 한글 commit/push, author=committer kirby47navercom-ai, AI trailer 없음. agents 추가 없음.

## 설치와 소스
- 설치551: C:\Users\kirby\HBEngine\Versions\68473fd495b977a3\HBEngine.exe. USER_INSTALL551 정본:3401전체SHA/64owner/User10385/Versions1. 공용cache8995953B/lease0. 이전541 179771490B 정리. 설치캐시는 Versions 밖.
- 549 source d6c7d8ba397da9c620ad337d4dd532ec1d893fb2 및 docs92742ff8까지 push. 551 receipt 커밋/push 남아요.
- PlayerSHA052f8aa28b6057066ee7cdf3a3c044f05ff83c55b0ff24f79a728f42d74d5b09 /3049472B, Host4313f834b9b14718b42e7cf89f0ec38d24c4e6b00bfb08ed92081450c4e47a39. RayPrograms b76fbc50dba8e35c808b6e72635fefdeb933494dcf629f467f3d59f65a799ad7. 새변경은JS/데이터라 native재빌드 불필요.

## 543–549 구현과 증거
- texture-composite.js: 가져오기 노멀 moment→roughness 등방 근사. composite.normalTexture/channel/power, 엄격 경로/충돌/AI 계약. unit 원본 평균, 축소 후 재정규화 안 함, NPOT/고해상도/topMip, 다른 채널/원본 보존, flat/0power 동일. HB식은 문서화, UE 수식 복제 주장 없음.
- 기존 단일 worker에 보조픽셀/transfer중복제거/보조detach 재디코드, self-source 이미지/픽셀 재사용. GPU 기존밉 재사용으로 새 프레임 uniform/샘플러/텍스처/합성0. peakMomentLevelBytes는 가장 큰 단일moment레벨, 실측 총메모리 정점 아님.
- texture2d 상세/밉/채널/UndoRedo/저장/AI dryRun, raw 또는2Ddescriptor 참조, material 해석/의존/rename/build, normal descriptor 변경 identity와 원자 runtime교체 연결. GL/TSL/native의 materialSource 리소스 누락도 공통 binding owner로 복원.
- 543 CPU독립정답181·4채널×2색공간/flat/0/NPOT/고해상도/소스/참조/rename/AI; regression549 8gate PASS.
- 544O7sQe3 실제 editor/GL·TSL6LOD/worker4jobs/기본·보조 transfer/alias/큰normal작은base/보조detach재시도/유휴0. 캡처 view_image 확인. 최종보고필드와 self-source loader는 설치5449BcjpA에서 확인했어요.
- 545gz05oh 실제 D3D3LOD137/219/219/340B; 467znGqs6 GL·TSL와468JUSclO D3D6contexts는 roughness/color/normal의 이전 moved/mirrored 기하/time/mipwidth를 기존4e-5로 통과.
- 548i2AR00 새 C++ SDK/packager/D3D 게임 Materials::SetTexture: 합성221→일반165→합성221. source/dependency/worker포함, 유휴upload안정/자동readback0. 재생성빌드·프로필은pruner정리.
- ENGINE_WORK549/사용자·연구문서/상태원장 갱신. supplemental549 UE짧은텍스트45행/Unity기하AA본문114–135 선택읽기·SHA. 도해/연결API/전체gate 미승격. MAT03에서 구현된 normal분산만 제거, 별도 기하AA/나머지포맷 유지. latestBatch549로 최신화.

## 바로 다음
1. finish551 완료. USER_INSTALL551/원장/소유정리 검증 후 receipt 커밋/push. sync/install/finish551 one-shot 재실행 금지.
2. 설치5449BcjpA 최종self-source/worker/GL/TSL/UI와548clLP7D 설치SDK/packager/player의 C++왕복, User전후읽기SHA/links2/.hbproject/Versions1/공용cachelease0/Versions-native-build없음 모두 통과.
3. 최종 checkpoint로 끝내지 말고 RND06 초기 GL/FXC 자원준비, MAT03 HDR·압축·custom array/volume mips·raw자동정책, RND05 곡면역해/거친로브/참여매질과 누적2D/애니/월드/game/editor/deploy 계속. 초기전체지연은 여전히 초단위, FPS/상용전체완료 주장 금지.

## 도구와 실패 구분
- exec session만 write_stdin, yieldedcell만wait. rg는 directory + -g, wildcard 경로 금지. JS replace callback, 복잡한 코드는 ignored mjs. g++ output repo상대, diff--check.
- 544 첫 selector 문자열/원본 pick R을 A로 착각/sRGB 인자 잘못 넘긴 것은 검사 오류. 엔진 출력에 맞춰 기준을 완화하지 않았어요. 없는 typed파일명은 기존check-material-typed로 수정.
- Mac/Xcode/Android폰 없음. 실기기 열/FPS/전체분석 완료 주장 없음. 541, record549, refs549, setup551, commit549-source는 완료one-shot 재실행 금지.
