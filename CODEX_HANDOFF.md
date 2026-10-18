# HBEngine 현재 인계 — 298–306 설치 검증 완료

- 런타임 소스3a0e30df31d21471677bf168e090379ee8070291, 렌더588944d예요. 최종 설치/검증 문서와 API를 확인하는 테스트 추가는 후속 커밋에 남겨요. 테스트 파일 SHA/설치 일치는 USER_INSTALL_306.installedAudit.verificationScriptDelta에 있어요.
- 현재 설치 31d1e9358b813be1 하나·3084파일이에요. 전체명세SHA·바로가기2/.hbproject·User10385파일 전후SHA 동일·수정보관0·이전설치177402675바이트 정리를 확인했어요. 현재API installation.bundleHash도 새 marker와 일치해요. latestInstallation은 포장 당시 기록일 수 있어요. marker-only와 전체SHA audit을 구분해요.
- 구현: GL/HLSL/TSL 삼선형 단일 level 호출/정수LOD 생략,48필터 좌표 미분 절삭·nested/레지스터/native 동일 진리표, explicit false만의 불투명 GL과 legacy key, 인스턴스/정점/뼈 노멀 공유·비인덱스 Map 생략, bind/morph/interleaved 키예요. 새 GPU 타깃/이력/지속 캐시/자동 readback은 없어요.
- 최종 source validation306: GL bh3bqL·GPU xKxboZ·D3D0nLrBW actual C++/BP/변형/필터/해제·재진입 통과. 설치 p76qGy의GL480/GPU384 표본 오차0, jSfLTk opaque camera1024성분 오차0·현재 설치 API 일치·정상 종료예요. D3D는 소스 gate/player 동일 바이트로 재사용했어요. CPU106/109/274/157/304/305·marker BskanT·native cube YrALys·현재/이전노멀 RSpje5·normals FKJADk도 통과했어요.
- 실제 Complex141 첫 GL6591ms/시간3770ms·GPU3667/2111ms·D3D5317/3394ms·재방문198/183ms는 단일 전환이며 FPS/전 기기 보장이 아니에요. 격리 삼선형1941→98.5ms·opaque1825→1472ms는 각각의 지정 fixture 링크값이에요. 303 고정 texel loop는 미채택이에요.
- 다음: RND-06 GL 초기비용/불투명 특화의 네이티브 variant define 소유자를 이어서 조사·구현해요. RND-07 이전 world/view/mip 입력 소유자와 전체 나머지는 ENGINE_STATUS 정본을 유지해요. 이전 world input 지원은 현재 point를 UV/barycentric 표본과 평가worldPoint로 분리하고 기존 previous-point/frame/time을 공유하는 설계부터 검토해야 해요. 아직 구현한 API/기능이 아니에요.
- 연구/문서 전체 gate를 승격하지 않아요. 상태78행/39verified35partial1unimplemented3unverified는 등록 작업 범위이며 UE/Unity 전체 기능 분모가 아니에요.
- validate300 실패는 BVH순서 검사 오류, native NeLbDw는 생성 if 경고,305 CPU fixture/VM 의존 주입 수정 원인은 DEBUG_HANDOFF에 있어요. 설치 symlink 실물 생성EPERM은 미검증이고 lstat guard와 실제 디렉터리 검사만 구분해요.
- sync306/install306/finish306·record305·validate300/301/302/306·probe303/305는 이미 실행한 one-shot이므로 다시 실행하지 않아요. 새 시도는 새이름/marker를 사용해요. root HBPlayer가 없으므로 실제 dist/HBEngine/HBPlayer.exe 경로를 사용해요. 사용자 창/탭/프로젝트/프로필은 건드리지 않고 고유 숨김 창/프로필/포트만 사용해요.
