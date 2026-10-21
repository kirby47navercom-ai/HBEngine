# 현재 진단 — 렌더링 지연과 거리장 LOD

2026-10-21. 최신 구현/설치는 CODEX_HANDOFF.md·docs/research/ENGINE_STATUS.json을 먼저 읽어요. 전체 누적 목표는 active이고 완료가 아니에요. 이전 긴 진단은 Git의3d83a96:DEBUG_HANDOFF.md에 보존돼요. 잘못된 옛 설치485 정보를 현재 버전으로 쓰지 않아요.

## GL 초기 준비

Complex141의 약8/7초 지연은 남아요. 일괄 프로그램 제출·비렌즈/무광 특화·공유 노멀·메타데이터/차분 절삭과 과거 실험을 먼저 대조하고 같은 경로를 반복하지 않아요.

1086-ueGYSG: 현재 robust normal decoder로 맞춘 정확한 보유 GLSL에 레지스터 SSA/0초기화 제거 후보를 raw GL ABBA 대조. path7197.35→7125.40ms/guide5295.55→5233.40ms,74B만 감소. 캐시/부하 미통제의 약1%로 개선 입증 안 됨. 기본 렌더러 미채택. 보조 픽셀의 관측성 검증이 없어 promoted=false/pixelObservabilityVerified=false. 후보의 같은 값/실험 파일을 구현 성과로 세지 않아요. 다음에는 작은 SSA/초기화 실험을 반복하지 말고 실제 컴파일 비용 구조·새 가설을 세워요.

## 거리장 LOD

1087–1093은 화면 footprint 기반 per-geometry 정밀도·낮춤250ms/기존 필드/예산/취소·WeakMap 정지 투영/TAA·0인스턴스 해제를 실제 제작/실행에 연결해요. 전역 clipmap·bent normal·방향성 하늘·시간 신뢰도는 별도 잔여예요.

1090 첫 VxQUI4의 reduced16 timeout: 실제 sphere/카메라를 근거 없이16으로 가정한 기대가 틀렸고 실제12·pending0·실패0이었어요. 엔진을 바꾸지 않았어요. 독립 투영 정답은1087, compiled C++ 전달값64/상한과최저 사이의 축소/복원·모드/실제 native 픽셀은1090으로 구분해요. postProcessSettings가 post-volume.js의 직접 export라는 초기 CPU 검사 import도 도구 오류였어요.

기존912 고정예산 업그레이드/이전 필드/예약/취소 회귀가55,15를 유지해요. 현재 확정 검사·설치 SHA는 ENGINE_WORK_1094.json 및 후속 영수증을 따르고 실패 자료는 통과로 세지 않아요.

## 실행/공간 규칙

백그라운드·소유 임시 프로젝트/프로필/포트만. 사용자 창/서버/프로필 검사·종료 금지. 무거운 검사/설치 전 activeInstalledVersions를 확인하고 사용 중이면 미뤄요. 같은 소스의 native Player/Host와 증거 재사용. Versions1·최종 묶음 검사·공유 캐시/임시 런타임 정리. 한글 동일 author/committer 커밋·푸시를 유지해요.

## 거리장 쿠킹1098–1102

정적 도형/OBJ/glTF/GLB 자동 패키지·기하/생성 소유 지문·결정 바이너리·손상 복구·shared CookCache128MiB/패키지32MiB·기존 소유 교체/예산/취소·세렌더러 연결. 1098 최신9BBG3v는9그룹,1100-6Ymv0a GL/GPU hit2→3/복원/직접광·GL프로그램/TAA,1090-vN91ge 실제 CPP/BP/D3D 최초hit2/workerStarts0·복원,1088-2gmKD3 소유/취소 회귀 통과. 초기 검사 binary를 텍스트 API로 쓰기·기본 프로젝트 포함 모델을 누락한 필드 개수·직사각형도 다시 읽는 bytesRead 가정은 검사 오류였고 엔진을 기대값에 맞추지 않았어요. GL초기지연/전역clipmap/다중LOD·FBX·월드·편집기 쿠킹/누적목표는 남아요. 고정 출력 ai-context-1058.json은 이번 검사기로 갱신됐으며 새 근거는 distance-cook-ai-context-1102.json에 별도 보존해요. 이전1058 파일을 과거 SHA의 새 검증으로 세지 않아요.

## 반사 혼합·포즈·노멀1106–1112

브라우저 dual affine fade/base remainder·맵별CubeUV·GL172032B앵커/약한uniform bank·GPU stable sampler ID/분기전 normal/view·base intensity/rotation·필터/clone/refraction 수명·CPU skin/morph 현재경계/캡처전갱신을 연결했어요.1106-rsIzi5/1108-mxacl3/1107-PIVBqz 통과. UV없는 glTF 검정반사는 기존 hbNormal의 normalize(0): X7CU9x의실제map/uniform/binding/texel은정상이었어요. 공용GL/GPU 기본·코팅frame보호후1109-rog0AT 24조건씩·실제CPP/BP NativeFtfibr/GLQn5es9/GPU IWdwOu 통과. 오차완화/UV추가없음. 임시드로훅제거. 같은GPU geometry schema교체검사는Three캐시와충돌해독립geometry로검사하며schema교체완료미주장. 최종설치1114에서세백엔드실제CPP/BP모프와GL/GPU혼합·각24노멀조건통과. 확정USER_INSTALL_1114.json우선. 전역후보/우선점유·임의shader변형/instance morph textures·GL초기지연은잔여예요.

## 전역 반사 atlas1116–1131

PROBE_ATLAS_1130.md에 실패/수정/통과를 구분했어요. 1117 상수DataTexture만으로 놓친 WebGPU WebGL폴백 RT blit destination endpoint 오류를 소유FBO 어댑터로 고쳤어요. 실제gradient PMREM 각54조건/세모드 통과. Native 수동 corner per-lobe 전개가 FXC9.69초 관측: GPUborder padding4.45초/once-selection4.24초/최종4.37초. 통제ABBA/전체로딩/FPS미주장,GLComplex1418/7초와별개. 1120의잘못된BP핀/바닥피벗/legacyambient/invalidSkyLight16/HDRACES색역fixture수정과실제통과구분. 최종GLtShlaw/GPUJuyK49/D3DPpduDz 및 SDKRMzcPS(오차1/허용2·paddingStaticReuse). nativeorthographic off-axis view와ambientmetal/물리단위는별도잔여,현재중앙ambient0검사로증명하지않아요. 최종1133 설치에서GL/GPU/폴백각54gradient·직접쌍회귀·실제CPP/BP세실행기4영역/밝기복원통과. USER_INSTALL_1133.json확정. 이전one-shot재실행금지.

## 카메라·주변광1135 이후 작업 중

후속 변경은 확정1133 설치와 구분해요.1136의 큰 노멀 직값은 기존±10000 작성 제한으로 거부돼, 유효한 리터럴의 곱셈 그래프로 큰 유한 중간값을 생성했어요. 좌표 기본값 변경은 원인이 아니었어요. 검사 draw 인자/경고/잘못된 cbuffer 쓰기를 바로잡았어요. 공용normal GLSL→HLSL 변환의 st.s/t를 x/y로, 화면Y를 -ddy로 변환했어요. 실패를 통과 근거로 세지 않아요. native viewDirection float4/ambient Lambert·금속, GL/GPU graph ViewDirection/Fresnel은 검증 중이에요. 기존GL8/7초와 구분해요.

1138 실제카메라검사의R회전은기존Scene/BP API의도단위를라디안으로잘못작성했어요. world-visual-update/scene-environment의degToRad와대조해입력만180/π로수정했고렌더기대각도/허용2byte는유지해요. native/브라우저독립수식54/38조건과구분해요.

1138 ZB5FJR는회전후첫두픽셀이독립기대217/206/231과같았고세번째는배경39/47/52였어요. 가까운평면/넓은직교카메라를회전하면영상면의가장자리광선시작점이평면뒤로넘어가가림조건이달라져요. 실제평면을관측하는화면40/50/60%세지점으로fixture만수정하고기대방향/색곡선/2byte기준은유지해요. 실패정지시inspect도저장해다음추측반복을줄여요.

1143 최종설치 검증확정: native54조건·GL/GPU/폴백각38조건·atlas각54gradient·실제CPP/BP세실행기카메라4상태×3픽셀·전체소유SHA/명세/User보존/Versions1통과. USER_INSTALL_1143.json이최신. 작업중/미커밋으로기록한위단락은이후확정근거로해소됐어요. GPU내장Physical/probe전체시선·native기본맵경로는별도잔여예요.

## GPU physical view1145 이후 작업 중

현재설치1143과미커밋변경구분. builder-local PV변수에projection uniform으로직교상수를variant/lighting전에대입. rawlibrary/factory/clone를WeakSet으로장식하고dependency/globalTSL불변.1145-zCp4L5 실제GPU/강제GL폴백 각vector24/physical12·기존오차유지·정지평면불변0·이전오차.3재현. 초기vector검사광원의spec오프셋/시선공간기대오류는fixture수정.

Iridescence: Three TSL mat3는JS Matrix3 행우선,GLSL mat3는열우선인데동일배열이사용됨. 명시XYZ dot행의thinfilm으로교정. GL multis호출은이름F0인인자에film Fresnel을전달하며평균반사에도Fr사용,TSL은역Schlick F0/기본색평균이었다. Favg단독후보는불충분. model.start가super.start에서빛을소비하므로start후교체는효과없었고첫consumer전에owned필드를준비. 이변경후직접광이GL과일치했고간접광입력까지맞춰1145통과. 실패를성과로계산금지.

rawvolume 시선도owned call의slot1을교체. call은VarNode로감싸질수있어최대4단계unwrap/15입력검사. 직접source바꾸지않고원래texture owner보존.1146은CPU독립spectral sum/기존rawDFG·authoredSchlick 투과정책을각각대조. 처음0광원은lighting model이생략되어0세기Ambient를명시,잘못된순수Schlick raw기대는실제DFG와대조해수정. 오차기준유지.

fallback readback뒤copyTexSubImage2D가GL1282. Float32blend가설은HalfFloat에서도실패해기각. gl개별call계측과실제copyTextureToBuffer본문으로READ FBO를직접bind/삭제후미복원, PBO미해제를확인. 현재새adapter는tracked READ복원/packalignment·PBO상태복원·fence전복원·PBOfinally삭제.1146재검증중. 임시계측은검사코드만,운영픽셀읽기추가없음. GPUPhysical/volume/보관source검사와최종설치완료전전체완료주장금지.

1147 첫 실제게임fixture는 기울어진 view에서 Roughness .35→.85의 차이가2byte라 가시변화>=4byte 조건에 실패했어요. C++ 호출 뒤 실제 픽셀변화와 상태보존은 관측됐으며 생산오류로 판정하지 않아요. 임계값은 유지하고 specular를 관측할 수 있는 초기 카메라에서 재질편집/복원을 먼저 검사하도록 순서만 바꿔요. off-axis 불변성은 모든 상태에서 유지해요.

1151 설치 검증 확정. 원래 install1151 job handle이없고해당실행프로세스도없어중단확인;이미통과한3gate를재사용하고새resume으로미완료게임만이어갔어요. 첫복구시빌드import구문오류는installed220파일의동크기all-zero손상;repo/dist정상/명세불일치,hardlink아님.원인미확정. repair1153이명세SHA바이트만원자복구·3857전체/독립Nodeimport불변·이후CPP/BP실제3렌더러/최종전체SHA/User보존통과. READ/PBO손상과파일손상의원인을혼동하지않아요. install/repair/resume/finish one-shot 재실행금지. USER_INSTALL_1151 최신.

1151 후속6gate는각각acceptance/정상exit로보존됐어요. 마지막프로젝트연결이이전4940경로라원래통과6검사재실행없이새resume1156에서격리프로필--register만실행·전체명세/소유SHA/User읽기SHA/링크/연결재확인통과. 새설치/버전추가없이복구,Versions1유지. 파일손상원인과등록되돌림원인은확정하지않았어요.

1157–1162: 공간/CPU 후보/정수표현/재사용을 먼저 묶은 뒤 batch1160으로 검사. CPU1157-Ip0jVb, selector1158-QAWPmx, atlas1117-EUpJpG, native1119-e7hLIO 통과. 첫 실패는 검사 GCC PATH, 정상 EOF판정, GPU기본Camera fixture이며 알고리즘 임계값완화없음. native unsigned count0 방어 뒤 해당gate만 재검사, 이전성공은소유SHA재사용. Player1161 한번빌드. 다음은API/AI/소유원장·신규설치 및 CPP/BP3실행기 확인. 이전1151파일손상원인은미확정으로유지.

1165 사용자설치 확정: 실제CPP/BP세렌더러4공간이동/밝기/복원과노드7/공간재구성불변·전체파일/소유SHA/User/연결/Versions1 통과. 선행묶음4gate는소유SHA로재사용,재실행없음. USER_INSTALL_1165 최신. 아직전체HDR/FPS/타엔진누적기능완료는아니에요.

1177 설치확정: 기본normal/D3Dsource·설치GL/GPU실제glTF C++/BP광원5상태·공유65536영역(1캡처)/144B부분전송·수명·소유진단. 5gate성공SHA재사용·Player1173한번빌드/Host재사용·3878명세/542소유SHA/CPP19/User/연결/Versions1. 처음fixture가surface전용API라normal을제거한것과Windows near/far매크로충돌은검사도구수정,허용오차완화없음. 전체캡처/FPS·명시tangent/임의그래프동등성은구분해요.

1183 설치확정: 프로브table변경행·대기변경/full우선·GLunpack복원·세렌더러픽셀/인스턴스/해제. 두밝기288B 대조1008B·정지0. C++소유14/CPP19/Player1173/Host1041재사용으로컴파일·게임반복검사없음. 3882명세/544SHA/User읽기SHA/연결/Versions1. 실제FPS와구분.
