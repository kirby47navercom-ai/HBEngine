# 377–380 하늘 베이크·DirectX 달 — 검증 후 기록/설치 단계

- 설치37604201e5a3a6750d5/3207/Versions1은유지해요. source WIP377–380을이제commit→work380기록→data sync→설치380으로진행해요. 새host/player47179빌드성공, 이후JS/test/docs변경만이라추가컴파일불필요예요. root/dist player새NativeSceneCB moon32B포함.
- sky-radiance.js 공용선형돔설정/CPU방사휘도·해질녘/태양/달·SkyLight tint/indirect, HDRI우선. 기존worker에숫자snapshot만전달하여기존Half/gzip/Undo/저장/빌드사용. scene환경parameter extraction은 frozen8ab8563 apply본문과20설정정확일치예요.
- DirectX SceneRenderMaterial/CB 끝2float4 moonDirection/moonColor추가·PS원반·JSON optional기본black/캡처tint·JS옛skyuniform fallback. 기존prefix순서유지. AI schema.skyBake 불변계약/한계등록.
- CPU3771uG7uG최종20설정+legacy nativeMaterial fallback/schema동일성·상수하늘diffuse PI 기준. 378lJpqPT actualGL/GPU10방향 최대1.3711e-4(float normalization/pow감도16ulp범위;HDRfloat/전체화질동등주장아님). native2hByzZ SDK 실제PS5방향sRGB8오차0·NaN거부.
- 379worker: de1QU7은barethree importmap미상속실패재현(구현완료근거아님), sky모듈Three의존제거/기존linear preset상수사용후Z3AO4Q 실제moduleworker통과. 수정후377frozen20재통과.
- 실제제작379 lightmap-workflow-225-zEz9ng --procedural-sky: 인간UV1/베이크/저장/UndoRedo/미리보기/AI dry/stale 거부, source보존, package3backend·map있음/이동무효/복원·exit0/errors0 모두통과. CPU225KOLAlU13/228Rgf2bC·환경actor34/API/362도통과예요.
- 두초기379실패: p0Zn85는제품worker bareThree import실패. HYFj20은테스트SkyLight.intensity0→indirect0의올바른제품동작을밝게기대한fixture오류라intensity1로정정. test기준/deadline/실행코드완화없음. CPU상수PI초기probe는수신기하가return sky를가렸으므로원래fixture목적대로receiver contributeGI false설정.
- supplemental380 Unity6/현재UE5.8 선택환경광/Skylight 본문/SHA·연결미독등록. docs/SKY_BAKE_380·연구manifest. 전체corpus/전체엔진완료로계산하지않아요. 구름geometry 베이크capture·narrowdisk중요표본·directional/mip/DFAO/HWRT와전역경로역대응·컴파일비용/누적원장이어가요.
- 376/370/365/349등이전record/sync/install/finish는모두one-shot완료재사용금지. 다음380새marker. User읽기만/privatehidden/사용자활성heavy보류/Versions1/PID소유보호계속해요.

# 설치376 검증 완료 — 후속 렌더링 계속

- 설치 04201e5a3a6750d5/3207파일/Versions1·USER_INSTALL_376 정본. 코드a16ab7b/입력b3b1196 mainpush. Player e104371a2939be23b653298527f7759c3a4790d27f98fa86dd28e4ee308d9588·User10385 읽기SHA동일·34owner/fullmanifest/links2/.hbproject 통과. installed375XxjF3v·3500tAxaJ 통과예요.
- 376record/sync/install/finish 모두실행완료재사용금지. oldVersions 178041752B·ownprobe 7259382B 정리했어요. 구현 끝을 선언하지 않고 전역 곡면/복합 경로 대응·RND08베이크와 RND06비용 등 누적 원장을 계속해요.

# HBEngine 인계 — 371–376 구현·검증, 설치370 유지

- 계속 작업 중이에요. 사용자 목표는 누적 엔진 전체이며 이 묶음으로 끝내지 않아요. 다음은 RND05 전역 곡면/변경 경로 대응과 RND06 준비 비용, 다른 원장 세부예요. 전체 Unreal/Unity 분석·엔진 완료율은 미확정이에요.
- 현재 설치370 1e50e6754649e3e1/3183/Versions1, USER_INSTALL_370 정본. HEAD0b1ff16 이후371–376 구현을 커밋/푸시하고 새376 설치할 단계예요. record/sync/install/finish370 및365/349/334/327/318 one-shot 재실행 금지예요. 새376 이름을 사용해요.
- 독립 이전 IOR 스택: path-media-gpu의 기존 seed/change 재사용·고유 Fn prefix·old IDs16+scalar IOR16·lazy first-glass seed·별도 absolute prior time/old BVH. 현재 RGB extinction 유지·thin disabled 배열 제외. old physical0 단일 평가/oldEta/oldDirection 보존·entry/nonLIFO exit/TIR·앞뒷면·unknown/overflow/incomplete failclosed·다음 old ray가 mapped point를 실제 지나는지 확인해요. 글로벌 역해를 해결한 것으로 세지 않아요.
- 기존 radiance integrator와 같은 국소 ratio/cosine cone 갱신을 current/prior guide에 연결했어요. reflection/TIR 유지·.01 floor/1.57cap. full curved/anisotropic/rough/참여매질 footprint는 별도예요.
- 371 최종 trQwz9 GL/GPU20조건·96XWjM DX10조건: old/current nested IOR와 current RGB 소광 보존. 373 t3DYw0 GL/GPU18·SORwne DX18 전이/독립Snell. 374 R67NZa 세GPU49퍼짐조건. 375 D1MErP GL/GPU·Y4iuc1 DX 전체guide독립width+실제normal-map mip/old-unbent 비교통과예요.
- 374뒤372최종0NagVH GL/GPU8조건/GkkVcM DX4조건: baseline0b1ff16의잘못된oldcamera-medium 이력을 새계산만거부·static유지. 369 X9UNA3 thin/직교/이전가림12조건 통과예요.
- 새desktop/player재빌드완료. 실제C++/BP145 source D3Dwy7K7b·WebGPUVOqQsx 통과·종료0/서버해제. 비통제전환DX4.81/4.91초,GPU4.13/2.62초는FPS/전후개선율아니에요. 이후PS/contract/doc/test전용변경이므로최종data sync만필요해요.
- 캐시376: 실제동시prune에서target dir가아직있는데내부PostDriver.h가다른프로세스에먼저삭제되는경쟁재현. build-root별namedmutex로파괴정리직렬화·획득후process재조회·abandoned소유회복/timeoutfail·finally해제. MlvQ3N 두실제PS프로세스부분삭제/대기통과·3708ylL5z 권한/부재4조건통과. 앞선 실패c1e45afc...result는성과가아니며보존해요.
- AI previousMedium/opticalSpread 불변계약·remaining갱신. native308 harness probeCount/dispatchCount/standalone은privateGPU kernel검사재사용이며legacy기본도371/372/375에서사용해요.
- supplemental376 PBRT4선택본문/SHA와미독연결등록. 전체corpus gate미승격. native/build/reference-corpus/supplemental376/read-scope.json 참조예요.
- 방해금지: hidden owned probe/private project/profile/ports만. activeInstalledVersions 전제·User읽기inventory만·원본게임/사용자프로세스 불변·Versions1·프로브/완성Build/프로필/중복Node는SHA/evidence후정리해요. no Mac/Xcode/Android기기 제한은실행검증에남아요.
- 한국어 커밋·author/committer kirby47navercom-ai / 228715038+kirby47navercom-ai@users.noreply.github.com·AI trailer없음·main push 유지예요.
