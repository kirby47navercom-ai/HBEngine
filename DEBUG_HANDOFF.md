# 현재 진단 — 렌더링 지연과 거리장 LOD

2026-10-21. 최신 구현/설치는 CODEX_HANDOFF.md·docs/research/ENGINE_STATUS.json을 먼저 읽어요. 전체 누적 목표는 active이고 완료가 아니에요. 이전 긴 진단은 Git의3d83a96:DEBUG_HANDOFF.md에 보존돼요. 잘못된 옛 설치485 정보를 현재 버전으로 쓰지 않아요.

## GL 초기 준비

Complex141 주 경로의 약7–8초 지연은 남아요. 1287–1289에서 꺼진 곡면 가이드 분기의 정적 제외는 실제 제품에 채택했어요. 보조 가이드 관측6276.9→1859.1ms·제품1827.4ms이며 전체 raw-half 성분307200개가 비특화 기준과 같고 on/morph/off·타깃/노멀 재사용·disable 해제를 확인했어요. 주 경로 제품7169.2ms는 개선 성과로 세지 않아요. docs/research/GUIDE_PROFILE_1290.md. 일괄 제출·비렌즈/무광·공유 노멀·메타데이터/차분 절삭과 과거 실험을 대조하고 반복하지 않아요.

1086-ueGYSG: 현재 robust normal decoder로 맞춘 정확한 보유 GLSL에 레지스터 SSA/0초기화 제거 후보를 raw GL ABBA 대조. path7197.35→7125.40ms/guide5295.55→5233.40ms,74B만 감소. 캐시/부하 미통제의 약1%로 개선 입증 안 됨. 기본 렌더러 미채택. 보조 픽셀의 관측성 검증이 없어 promoted=false/pixelObservabilityVerified=false. 후보의 같은 값/실험 파일을 구현 성과로 세지 않아요. 다음에는 작은 SSA/초기화 실험을 반복하지 말고 실제 컴파일 비용 구조·새 가설을 세워요.

1300–1308: 불투과 분기2050B제외/고정4tap/적응2·4tap/HDRI명시LOD0/빈매질카메라배열제외는 전체307200raw-half차이0이나 기준7066.5 대비6757.8/7030.7/6786.8/6942.5/6832.1ms로 확실한 개선을 입증하지 못했어요. 제품 미채택·후보는tools의사설모음만. 1306 fresh primary HLSL 첫구역73893B/PathSample9144·TraceCone2882·실제Program2741B; 정상원시출력/GL오류0. 다음작업에서이5후보/1086반복금지. 자세한원인후보·실패·다음비용경계는 docs/research/PRIMARY_PREPARATION_1308.md.

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

1190설치확정: native CPU설정전용/4B공유index·65536영역768KiB절감·불량혼합원자거절/9구간정책. 영향native2gate+동일HLSL/raster증명으로노멀/브라우저반복검사생략. 설치CPP/BP4영역/밝기/복원 layout1불변/fast0→1→2·캡처/copy/공간재구성없음. Player1186한번빌드/Host재사용·3884명세/544SHA/CPP19/User/연결/Versions1. AI인계길이실패는축약후정적검사만재실행.

1201설치의Sphere패키징실패는scene에양수scale만허용한기존계약이원인. fixture음수비균일scale유지하고저장/편집/노드/CPP/생성/풀/저장/물리/복제/시퀀스및native면판정함께수정.1208설치3backend9상태통과·capture/copy불변. native48조건/Rapier2D·3D/구1040실행·동일브라우저수식재사용,Player1204한번.새기능이구1190설치에검증된것처럼표현하지말것.

1210–1217: Gate 실제 다중exec입력 제작에서usedInputs/connect가단일선만허용하는결함확인→data만단일·exec입력합류·모든선행Setter삽입수정. Promote가변수만추가하던것을Get/Set/체인연결수정. UI최초종료실패는dirty-own문서종료대화상자,문서save후정상. 최종sourceCPU1699/GUI/NativeCpp/기존VM과설치Windows5/8/8분기통과. binaries변경없어Player재빌드/GPU매트릭스없음. 복제installer의scope과거Sphere문구는원문보존후실제필드로정정.

1219–1226: 기본월드C++형식이항상Actor여서2D/기존Character typed pin이null→Builtin class factory/한번생성/원래pose유지. User factory가GameInstance같은builtin에도unknown class→한스키마actor목록으로배제. Pawn2D CPU초기fixture는TopDown컴포넌트로Character2D를추론해잘못선언,명시클래스메타데이터로fixture수정. 실제preview toolbar canvas아래가림→flex별도행,직교회전잠금/동일방향수정시camera보존. 최종CPU50/실제GUI2x2Sprite·OBJ3정점/idle0·Spawn회귀·설치D3D11CPP2D게임통과. Player1223한번빌드,Host재사용. Versions1/User읽기SHA.

1228–1239: collapsed 소유flag로기존macro VM재사용, 순수macro가__deferred로빠지는조건수정·openpinliteral/default/단위scale보존·typedreroute Expand/새ID복제/주석watch. 선행exec합류collapse에서두번째선중복제거로누락→도착entry공유+양끝중복만제거, CPU/GUI E입력실행확인. 펼친helpers기존노드와겹침→기존placeHelperNode+선택focus. 상속authored proxy가필터배열반환→viewHint·부모scope보존/childserialize/readonlyguard, 실제설치child+parent동작확인. 모델42/배열6종·UI·기존flow1699/CPP·상속JS17·설치D3D11package+상속editor통과. Player1223/Host재사용, renderer matrix없음. 당시core VM후반변경없는성공재사용scope는batch1231에명시.

## 1266 GL 준비 지연: 읽기 전용 생성 구조 대조
보존된 complex141-980-sLKAfd의 path/lens GLSL에서 material 함수4441145는각1313B·texture호출1·정의포함참조3. path전체120707B/lens117593B이며 원본M_Complex141그래프는6노드예요. 함수복제/레지스터정리가 주원인이라는 근거는 없어요. 1086 SSA/zero-init실패재측정·GPU컴파일·셰이더제품편집은 하지 않았어요. 이 수치는 보존된 역사적소스의 구조진단이고 현재시간/FPS개선근거가 아니에요. RND-06의8/7초잔여를완료처리하지않아요. 다음실험은 실제분기/인라인fanout·드라이버단계비용을분리할설계가필요하며동일74B실험반복금지예요.

1320 검사준비 정정: vUvy0O는 임시프로젝트 BP parent와 기본 DoorController 원본 불일치,7YEBTS는 도구 인라인 quoting 실패로 새 Source 파일 누락. 명시적 ListController 원본/경로를 생성하여14JfLO에서 실제CPP실행 통과. pksver는 기능검사 뒤 수정한 클립 미저장으로 정상 종료 확인이 막힘; 저장 후 같은 영향gate만 재실행하여14JfLO 종료0.1323밀도 첫 fixture는 기존1024키 Sequence 예산을 잘못 가정했으며, 실제65536키를 지원하는 skeletalclip 소유자로 바로잡아ZdKkWn에서 데이터/선택/표시밀도/수명 확인. 실패를 성능·구현 성과로 계산하지 않음.
1337 재현 정정: Euler UI 검사가 두 번 같은 원본 회전을 보였지만 수학 모델7그룹은 통과했다. 별도 실제 창 KXclZh에서 회전 timeline 버튼이 display:none·rect 0임을 확인했다. 검사 click은 트랙을 바꾸지 않았고 위치 커브의 select에는 Euler option이 없었다. 커브 닫기→표시된 회전 선택→다시 열기에는 올바른 option이 있다. 반복된 선택 핸들러 가설 수정은 원인 해결로 계산하지 않는다. 다음은 보이는 곡선 트랙 선택기를 추가하고 동일 도구를 그 경로로 검증한다. Euler 수식/원장 gate/키 데이터를 임의로 바꾸지 않는다.
1337 Hg2Ln3: 보이는 곡선 트랙 선택기로 위치/회전을 전환하여 부분 베이크19키·Undo·AI 경계 거부·Euler UI/AI·실제 BP Play/Pause/Seek 위치[.5,1,0]/회전[0,91.5,0]까지 통과했다. 검사 생성 문자열의 따옴표 오류는 node --check에서 바로잡았으며 실행 성과로 계산하지 않는다.

1345–1346: standalone 키 복사/잘라내기/붙여넣기/Undo 통과 후 nested Sequence paste가2키만유지. 읽기진단WV3XcS는 첫 Timeline DOM이실제로보이는vec3임을증명하여숨은창가설배제. cF0xca가바깥스크럽2.00/내부curve.time0을증명: Gameplay.scrub/timelineTime가inner곡선시간을갱신하지않음. timelineTime→inner시간/표시(false sample) 및 inner sample→outer표시 동기화·바깥수동스크럽의inner재생정지로수정. 이후fixture의노드중첩/없던inspector버튼과생성문자열quoting실패는검사준비오류로분리하며성과계산안함. OS클립보드는검사전체에서private stub만사용.

1348 실제BP Timeline 결함: renderBlueprintGraph의삭제검사가구id timeline:<node>를새id timeline:<document>:<node>와비교해모든창을제거했다. openTimeline의getNode가doc.data사본을수정하고changed()가graphs.blueprint를직렬화해키변경도버렸다. DoJKxT/floating-state는키복사5회후Timeline창없음·본문2키를보존. 새문서/노드소유검사·dispose와active graphs실제노드편집/비활성쓰기거부로수정. 직접소유하지않은상속Timeline은원본편집안내. 기존단일Curve모델은반복검사대상이아니며해당실제GUI경로만다시검사.

1357–1359: 첫 GPU 실패는 구의부피113이기존상자96보다커져후보순위가바뀐fixture가원인,명시importance1로정정. 다음 실제WebGPU만 box복원시x4픽셀[0,0,2] vs[.25,0,1.75]가재현. WVSL36QujD는mod4/조건분기정상, CPU nodeUniform20[1,0,1,1]·lo[-3,-2,-2]/hi[3,2,2]도정상. Three0.180.0 sourceUniformsGroup319/build57317의updateVector4가offset+4와v.w비교해w-only7→1에서다음uniform.x1과같아전송을누락. 소비하는source/canonicalbundle를checked patch로offset+3수정. 3XP8cV의GL/GPU/forcedGL각2560pixel·legacy복원통과, wHcuUr의실제NodeUniform1→7→1/인접보존/정지skip·fakeguard통과. 추측mod수식/캐시불변식을임의변경하거나engine-wide FPS개선이라고표현안함. 별도검사준비: 미export nodePins→effectivePins,baseUniform→NodeUniform,native Win small/far 매크로와const Program인자수정은성과제외. Native9vIF5n 실제8192/최대1B·굴절8/오차0, Player1360한번24.67초·QCu2wJ C++/BP5상태/캡처4·copy150·layout1유지.

1366–1373: DirectX probe/2D CB는 같은 값도 draw마다 Map하던 비용을 슬롯별 성공 바이트 cache로 제거. 실제3000 draw: 각각3upload/2997skip, CPU1584B·GPU자원추가0, SRV만 red→green/강도/제거복원·기존2D mask/light/cookie/stencil픽셀 통과(lC4Plh). Player1369 한번24.65초; packaged1371 C++/BP/자원보존과 증가 skip실측. BP Timeline삭제 hook을 changed이전 현재graph에 적용·한Undo track/wire복원; rename후 close disposeMap은 editor동일성·disposeOnClose, 실제GUI A1goeS통과. context focusRoutes심볼hit는3파일169453B/151.29ms; --all891파일7309870B/348.17ms, miss자동fallback/범위명시. 초기 pure링크절대Korean경로/다중auto다른타입·GUI없는title에replace·검사이름일괄치환의노드오타는 fixture준비실패이고 제품성과제외. native bridge mainCB/전체FPS/주GL약7초 해결주장금지.

1378–1381: 곡선 임의 경계는 (time,value) de Casteljau·기존0..1 weight표현보존, 모양범위밖/수직핸들·키도메인밖은편집전체거절. source80case/292400scalar관찰/최대8.88e-15, 기존1336/1319회귀통과. Butterworth spectral FFT는등간격>=4/저고역/Hz/1..16차/강도·반사2duration/선형radix2재표본·키시간수유지/채널및선택밖값보존/원보간유지. analytic774/최대7.11e-15·65k약122ms편집CPU/재생FPS아님. 새runtime상주0/native불변. 사람우클릭/도구옵션·FFT/임의범위·Undo/AI revision/dryRun/stale·Sequence/skeletal/BPTimeline/실제Play2.5 source GUI통과. Chebyshev/비등간격직접필터/고급rig/Euler/다중curve잔여유지. 설치1376초기script괄호는nodeparse단계실패·실행전수정/성과제외.

1386–1389: Sequence트랙65536/기본총262144(종전256x1024최대보존)/총keyBudget<=1M, 개요8px첫끝/선택원인덱스·속성32키/번호점프·전체시간임시배열제거·공용clip예산. source10k샘플오차0·실창IiCQT1 204마커/32키입력/1063DOM·열기773ms·65535수정Undo/AI페이지/복사/저장·복구flush/Play통과. 첫O5el93는기존poll4MiB보다큰응답으로전송재시도→120s만료; 새16/14MiB배치·1회인코딩·RESULT_TOO_LARGE·8ms양보·동일timer/500ms실패재시도/stop늦은결과폐기. bo0UUf는복구localQuota/저장body8MiB(기준+새text)문제, 주복구32MiB·보조256KiB best-effort/oldstale삭제·에셋write32MiB·동일의미저장noBackup·원본충돌보호. GYz4Ii copied.result.clipboard wrapper 검사오타·script중복const 등준비실패는성과제외. Legacy session백업Quota는onBackupError기대로수정/주디스크에러보존검증. Node스토어LPIfnB9MiB/reload/변경1백업/noChange0·model1388UTF8/5MiB/분할/50/FIFO/늦은stop통과. Native불변·주GL지연/스냅샷Undo/일반대형문서부분조회잔여유지. 앞선진행설명1MiB는일반기본body값혼동, 실제자동화route구한도4MiB로정정.
1390–1391: SequenceEventIndex는event트랙4B/key만추가·이진구간/private후보4B/match·원배열순서/중복/initial/endExclusive/seek유지. 140predicatecases/재진입/키배열교체·실제headlessGameplay dispatch,65k/빈구간10000/시간접근320002/6.44ms·기존timeline/계층5/구간15회귀통과. OnSequenceCompleted를최종키로잘못기대한fixture는완료callback포함으로정정/성과제외. 범용document.read는ownJSONPointer/~1→/~0→~/기본형태/id/name·값복사/offset/limit1000/nextOffset·revision불변, 실제SaHnic큰문서/부분조회/저장/복구flush/Play통과. primaryStorage한도32M·NoChange백업0확인, shadow snapshotUndo와큰단일문자열분할은잔여. 실패dense프로젝트3개는완전SHA대조ZIP으로압축보존해14759587B회수(native/build/dense-fixture-compaction-1390.json); 사용자/성공소스/보고서보존.
1391 최종GUI Vl1Mi6: 키번호네비게이션을속성상단고정·선택행자동스크롤/강조, 마지막키value실제가시성검증,32키/204마커/1095DOM/열기797.69ms·부분문서/시퀀스조회·원본/복구저장/Play통과. CPU샘플값과창가시성은구분.

## 1396–1402 — 문서 이력 구조 공유와 시퀀스 다중 트랙

- 기존40개 문서 Undo가 작은 키 변경에도 매번 전체 JSON을 유지했어요. 일반 트리의 바뀌지 않은 부분만 과거 기록과 공유하고, 복원은 복사해 편집·기록을 분리했어요. 비JSON 그래프는 structuredClone으로 폴백하며 이름 변경의 과거/미래 참조 갱신을 유지해요. 파일 묶음 표시/충돌 형식은 바꾸지 않았어요.16x16384키 실측 유지힙49,018,776→7,344,992B, 생성289.06→162.09ms; 실제 애플리케이션 전체 메모리/FPS 수치가 아니에요.
- 시퀀스 개요는 행을 전부 만들고 모든 행의 키 밀도를 계산하던 경로를 보이는46px 행+overscan3으로 바꿨어요. 전체스크롤/원인덱스·포커스/드래그·선택·키페이지는 유지해요. 검색·중앙 재지정 단축키·AI 메타페이지/정확키 이동/예산 있는 이력 진단을 함께 연결했어요.
- 첫 window KFT0Tj는 검사 도구가 editor.undo에 필수expectedRevision을 빠뜨려 실패했어요. 제품 revision 가드를 완화하지 않고 도구를 고쳤어요. AJbceQ는 모든 UI/Undo/Redo/분기/저장이 통과한 다음 재생에서 가상 타깃 Ghost1이 없어 기존 엄격 검증이 거절했어요. 제품의 누락 타깃 검증을 제거하지 않고 검사 씬에255개의 실제빈타깃을 추가했어요. 둘은 완료 증거로 계산하지 않아요. 소유 실패 프로젝트2개는 모든ZIP entry 크기/SHA를 읽어 대조한 뒤 원본디렉터리만 제거해35,548,457B를 회수했어요. 재현ZIP/manifest/실패보고서는 남았어요.
- 최종 source Soyawj:256트랙/첫행10·348마커/맨아래6·96마커/전체높이11814/검색1행,65k마지막키 가시이동/8 UndoRedo/분기·읽기revision·저장·실제Play2.5. curve-filters Z13QF1은 실제Sequence/골격/BP Timeline·FFT/경계Bake/Undo/저장/Play 회귀를 통과했어요. source 이후 추가된 선택행 색/기본키 재지정과 입력 격리는 설치gate에서 확인해요.
- 잘못 추정한 도구명check-asset-shortcuts.mjs는 실행 파일이 없어 준비 단계에서 실패했어요. 실제 check-editor-shortcuts.mjs의153명령 회귀를 통과했어요. 성과나 제품 실패로 혼동하지 않아요.
- snapshot 전체 순회/복원·scene/BP 사전직렬화·변경대형배열, 큰클립/섹션/비고정행과 고급다중곡선은 남아 있어요. 임시후보를 채택했다는 주장이나 전체엔진완료 승격은 없어요.

## 1407–1419 독립 반사 투영과 네이티브 상수 공유

- 독립 프록시 외부 광선은 기존 내부 출구 수식과 달리 가장 가까운 앞 교차점이 필요했어요. CPU/GL/GPU/FXC를 같이 수정했고 독립 THREE Ray/Box/Sphere 2,211개 조건과 대조했어요. 회전·전단된 수치 경계는 부동소수점 분류가 불연속이므로 정확한 경계 표본은 identity/이진 구 조건으로 분리했어요.
- HLSL `point`는 예약어여서 컴파일이 실패했어요. 네이티브는 `worldPoint`로 수정했어요. 테스트의 잘못된 offset 기대값·혼합 auto 선언·braces·허용되지 않는 vec2/vec4 직접 surface 연결은 재현 코드 오류로 고쳤고 구현 성과로 세지 않아요. 그래프 자료형 검증을 완화하지 않았어요.
- 공유 프록시 모양을 바꾸면 참조 중인 프로브 일부가 달라질 수 있어요. 렌더 수집은 무한 투영으로 안전하게 돌아가고 서비스의 새 불일치 할당은 거절해요.
- player-iFEXpj 준비 timeout을 보고 scalar box loop를 의심했지만 vectorized slab/[branch]만 적용한 3eUccE도 81,683.60ms였어요. 이것을 근본 원인 해결로 주장하지 않아요. 원래 failure.json과 프로젝트는 SHA 확인한 repro.zip에 보존했어요.
- 머테리얼 5개의 HLSL을 비교해 발광색 literal만 달라도 전체 pixel/shadow 소스가 달라지는 것을 확인했어요. Native-only 직접 표면 상수의 uniform 승격과 레거시 같은 속성 wrapper 제거로 5→1 소스를 공유해요. 산술/명시parameter/정적 분기/원본/읽기전용 표면 setter 의미는 유지해요. 발광 문서당 값 +12B와 별도 CPU/GPU 비용을 기록해요.
- 새 고유 프로젝트/profile의 N0h1ta 29,401.78ms, ezzcMY 30,341.71ms 준비, shader queue9실제/8중복제거, 디스크0hit/10miss 관찰. ezzcMY 내부 shader preparation809.40ms와 전체 준비 시간을 구분해요. 통제된 CPU 부하 반복 실험·FPS·복잡한 GL 초기지연 해결 증거가 아니에요. 원래82초의 모든 시간 원인을 특정했다고 표현하지 않아요.
- ezzcMY 실제 DirectX 게임: 4방 중앙 픽셀 (194,0,0)/(0,194,0)/(0,0,194)/(194,194,0), C++/BP 6번전환 metadata만224B씩 증가·이미지4/copy150/layout1 유지·위치(6,0,2)·즉시C++값 캐시. 수치/브라우저 physical/raster/UI/기존2D·혼합은 projection-final-1419와 개별 receipt로 구분해요.
- 초기1418 검사는 private 실패 프로젝트에 의존했어요. 공용1120 fixture를 메모리에서 생성해 portable로 바꾸고 다시 통과했어요. AI context 검사는 임시 인계가5KB를 넘어서 실패했고 인계를3,949B로 줄여 기존 한계 그대로 통과했어요.

## 1424–1432 반사 영향·시간 진단·AI 조회

- CPU 독립 변환 평면/각도/노멀 껍질 5,400조건 오차1.11e-15. GL/TSL/native는 같은 구현을 oracle로 쓰지 않고 이 표본과 대조했어요. exact 회전 경계의 불연속은 identity 경계와 분리해요. GPU 수치와 실제 physical+clearcoat는 별도예요.
- 첫 GPU 검사 함수 문자열의 newline escaping, private server가 제공하지 않는 tools import, fake PMREM 함수의 다섯 번째 position 인수 누락은 검사 코드 문제였어요. 문자열 raw·oracle inline·올바른 인수로 고쳤어요. 공용 native 검사 driver의 출력4096 한도를 늘리거나 표본을 버리지 않고2chunk로 전체5400을 실행했어요. 엔진 객체 한도와는 관계없어요.
- TSL If 첫 분기의 implicit assignment 반환/다른 분기의 void가 `expected float` 진단을 냈어요. 둘 다 명시적인 void 블록으로 고쳤어요. 경고를 무시하거나 tolerance를 넓혀 통과시키지 않았어요.
- 실제 GPU physical에서 후보1을 지웠는데 파랑 후보만 남았어요. 디버그 WGSL은 아틀라스 table load 없이 기존 direct uniform source였고, 데이터 table과 advanced flag는 맞았어요. 일반 Three 머테리얼은 render-object key 조회 뒤 node material로 변환돼 envNode 변경만으로 이전 builder를 재사용했어요. GPU 바인딩 node ID를 원래 customProgramCacheKey 함수에 덧붙여 mode/owner를 구분하고 값 변경·복원은 유지했어요. 현재 실제3백엔드의 후보2/3승격·부분페이드·outward/inward·default복원으로 확인해요.
- 첫 physical oracle 비교의2.54e-3 차이는 검사 renderer에 실제 엔진의 installGPUCameraView가 빠졌기 때문이었어요. 같은 adapter를 설치한 뒤 허용오차1e-4로 강화했고 ikwWo9는 GL4.47e-9/WebGPU2.24e-8/fallback4.47e-9예요. 느슨한 이전 oIyrxR를 최종 근거로 승격하지 않아요.
- 기본 optional metadata 생략은 이전 record만 가정하면 count 증가 시 옛 BVH 영역을 새 레코드로 재사용할 때 틀릴 수 있어요. count 변경은 강제 초기화해요. 실제 CPU atlas/512행 typed-array Proxy2048읽기/0쓰기·byte복원/동일크기count성장/실제resize/reorder 검사를 통과했어요. fake GPU copy라 GPU시간/FPS로 확대하지 않아요. stub backend 누락은 검사 코드만 수정했어요.
- 준비 elapsedMS가 완료 poll마다 늘던 것을 고정하고 구간 합계/횟수·유휴 제외·취소·revision·실패를 연결했어요. 초기부터 ready만 관찰한 실제 게임은0구간으로 표시해요. 37.15초 전체 startup을 단독 shader시간0으로 해석하지 않아요. 이전29–32초보다 개선됐다고 주장하지 않으며 부하통제 실험도 아니에요.
- ipw9k1의 C++ dark pixel 뒤 metadata 통계는 capture 전 inspect 값이어서 한 frame 늦었어요. 최종 설치 검사에서는 capture 뒤 통계 증가를 기다리도록 강화해요. 실제 검정/노랑 및 C++ 즉시 cache는 원 실행도 확인했어요.
- 정확한 SetFaceFade 조회가 작업명과 맞는 수학 경로까지 합쳐5파일을 읽었어요. 등록된 exact symbol 경로를 먼저 읽도록 공용 context를 수정해3파일, 수학2파일/시간진단1파일로 제한해요. --all과 없을 때 전체 fallback은 유지해요. 모델 이해 속도나 전체 문서 분석 완료를 측정한 것은 아니에요.

1433 추가: 면별 setter의 벡터 배열을 호출자와 공유하지 않도록 복사해요. 실제 서비스 입력을 나중에 바꿔도 속성이 유지되고, 잘못된 두 번째 벡터는 첫 값도 반영하지 않는 것을 확인했어요. 생성 vec3핀/bool/float 검증·업데이트5회와 기존 우선 혼합401관찰을 통과했어요. 오래된1356의 ABI/계약 버전 단언은 현재320B/20행/v9로 갱신하고 수학 검사는 유지했어요.

1438–1443: Undo의 미변경 트리 결과 컨테이너를 지연 생성(ownedPrevious 내부 data-property 기록만); 기본 외부 getter 읽기·fallback/복원 격리는 보존. 몽타주 공용 행 탐색에서 row ID를 알림 ID로 고르지 않아 우측 속성이 비던 실제 실패 rkLB6c→defaultSelection 및 행 클릭 경로 수정. 3eFG6M은 테스트가 revision 없이 redo를 요청한 계약 오류→최신 revision 전달; production CAS 완화 없음. 최종4KZrbs 통과. 기존 montage-notify 단위 fixture는 runtime root-motion 인터페이스 extractRange가 없는 낡은 stub→루트 추출 없는 fixture용 noop 추가, runtime 수정 없음. 그룹1443 native17/test27/vendor2 SHA 동일로 재빌드/렌더러 재검사 생략. AI timelineRows2파일/143.87ms 관찰; 전체 엔진 해석/성능 보장 아님.

1450–1453: 시퀀스·몽타주 표시 범위는 view 전용으로 분리. 초/프레임 ruler, preview/runtime cursor, 키/클립/구간/드래그/trim/context의 같은 시간 투영과 clipped handle·범위 밖 표시 제외. 전체 키/구간은 유지. 실제960math와65536키 창 k54WSp의 Ctrl휠/Shift휠/RMB·MMB/AltShiftRMB/cancel/context/F재지정/키drag/section·montage trimUndo/save/Play 성공. 첫8MV2TS의F <.3초 기대는 fixture30fps(12프레임=.4초) 착오→fps계약으로 수정, production 줌 완화 없음. rows43상수도 실제 metadata42로 교체. 끝 키가 band overflow에 잘리는 새 회귀를 예방해 원래 예약 여백 접근과 selected z-index를 보존/실제 hit-test. 최종 교차문서 timeline drag→AI mutation/range/row/key navigation의 EDITOR_BUSY 장벽과 runtime커서 range투영 assertion은 설치gate에서 현재source로 확인.
소유 이전 fixture5개는 파일별 size/SHA를 ZIP에서 다시 읽어 일치시킨 뒤 프로젝트만 제거하여85073863B회수; 최종재현·보고서·스크린샷·사용자파일 보존. private PS5 도구의 UTF8 BOM/Get-FileHash/ZIP역슬래시/hashtable합계 차이를.NET stream hash/경로정규화/명시sum으로 고쳤고, 검증 전 삭제는 없었어요. group의 BOM receipt 파서는 UTF8 BOM을 제외하고 해시원본은 유지. native17/test27/vendor2와Player/Host동일, 재빌드·렌더러행렬 반복 없음.
