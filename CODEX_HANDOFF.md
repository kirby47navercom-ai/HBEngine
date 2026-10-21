# 현재 인계 — 전역 반사·카메라·표면/누적 목표 계속

2026-10-21. 장기 목표 active. 전체 누적 목표 완료/정지 금지. 여러 구현 뒤 관련 검사를 묶어요. AGENTS.md→docs/AI_START.md→node tools/hb.mjs context "작업명". 정본 docs/research/ENGINE_STATUS.json. 과거연구/API전체를선행독서하지않아요. 실제설치는 HBEngine.install.json/context state.installation으로구분해요.

## 최신 구현과 근거

ENGINE_WORK_1131/1141.json·REFLECTION_PROBE_ATLAS.md·CAMERA_SURFACE.md·research/PROBE_ATLAS_1130.md·CAMERA_SURFACE_1140.md. 큰 메시/인스턴스의 전역픽셀두후보·혼합해상도HDR atlas·native컴퓨트이웃면/세면corner패딩·정지copy/전송재사용·밝기metadata·소유자/해제·GL/GPU/강제GL폴백RTcopy수정. 작은드로직접쌍·기존C++/BP/JSON/CAS/Undo유지. 임의개수상한없음,장치차원오류명시,추가메모리/선형순위비용공개.

후속native SceneFrame.viewDirection float4/기존3CB+48B·직교일정방향/원근시선·capture원근전환복원·ambient/hemi Lambert/금속확산. GL/GPU/native ViewDirection/defaultFresnel·native공용normal frame/화면Y·UV/큰유한값. Player1139재컴파일/Host1041불변재사용. native1136-V6hk8s view12/Fresnel12/ambient6/normal24·허용2byte. 1137-PwHAnF 세모드각view16/Fresnel16/ambient6·오차<8e-8/허용2e-5유지. nativeatlas1119-3bJumh 기존SH/GGX/coat/IOR/21방향오차1/허용2·정지패딩.실제CPP/BP1138-r61zgv카메라4상태×3픽셀·최종설치에서세실행기재확인.

## 설치

현재 확정 USER_INSTALL_1143.json: C:\Users\kirby\HBEngine\Versions\4940d1afed664464/HBEngine.exe. 3843파일/511소유SHA/CPP16·native13·Player1139·Host1041·User10849읽기전후SHA·연결·Versions1. 설치native54조건·GL/GPU/폴백각38조건·atlas각54gradient·실제CPP/BP세렌더러카메라4상태×3픽셀·AI실제마커검증. 이전184296040B정리·공유캐시{"deleted":0,"bytes":0,"receipt":null}. sync1142/install1143/finish1144 및 이전one-shot완료재실행금지.

## 이어갈 잔여

RND03 공간타일/클러스터가속·큰장면성능/메모리·픽셀중요도우선점유/작은캡처덮기·sphere/lightmap·임의shader변위/instance morph texture경계. WebGPU내장Physical 모델과 probe방사광/추가로브의직교off-axis시선일치(공용그래프/native와구분). native기본texture normal/다른tangent관례검증확대. RND06 GLComplex141약8/7초유지;1086 SSA/0초기화미채택반복금지. nativeatlasFXC9.69→4.24–4.48초관측은통제ABBA/FPS아님. RND08 전역거리장clipmap/타일·방향하늘/bentnormal/시간신뢰도·지형/변형/마스크·FBX/월드/다중LOD·편집기쿠킹/HWRT/방향베이크.다른78행누적목표유지·전체완료율미확정.1130지정본문/1140로컬Three본문만,전체gate미승격.

실패/검사fixture수정은DEBUG_HANDOFF와연구문서에구분.1138초기잘못된핀/도단위/가려진가장자리픽셀·큰clippedquad보간은도구수정이며오차완화없음. 새원인가설전반복실패기록확인.

백그라운드·소유임시프로젝트/프로필/포트만. User/게임원본검사·종료금지. 무거운검사/설치전activeInstalledVersions·사용중이면미뤄요. Versions1/전체백업쌓기금지·검사runtime/공유캐시정리. 한글동일author/committer커밋push. Android폰/Mac없음재질문금지.

## 후속1145~1149 — 설치 갱신 준비

GPU 내장 물리시선·원본/작성굴절·thinfilm XYZ/multis/0두께·폴백읽기READ/pack/PBO소유를 구현했어요. 1145-SQ1mnK 각vector24/physical16, 1146-VdoCCE 독립film31×2·raw/ownedvolume·읽기29/잔류0, 1117-kWTz3x 세모드각54gradient, 실제1147-WEhBN8 WebGPU CPP재질/BP복원·회전/CPP이동6상태×3픽셀 통과. static1149 API/스키마/AI통과. 원래허용오차유지. GPU_PHYSICAL_VIEW.md·research/GPU_PHYSICAL_VIEW_1148.md. 현재설치1143 유지; 다음1149원장/소유SHA확정·새sync1150/install1151/finish1152·설치게임3렌더러검사·Versions1·push. native13불변 Player1139/Host1041재사용. 기존원장잔여/전체연구gate미승격.
