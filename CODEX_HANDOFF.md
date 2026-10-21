# 현재 인계 — 누적 구현 계속

2026-10-21. 주인님 지시: 여러 구현을 묶은 뒤 영향 검사 한번, 통과 검사·빌드 반복 금지. 먼저 AGENTS.md/docs/AI_START.md와 hb context만. 원장 docs/research/ENGINE_STATUS.json(78행, 전체UE/Unity분모·완료율미확정).

## 확정 설치

USER_INSTALL_1183.json: C:/Users/kirby/HBEngine/Versions/da1acaad81e62420/HBEngine.exe. 3882명세/544소유SHA/CPP19/native14·Player1173/Host1041·User10849읽기SHA·연결·Versions1. 이전184838887B정리. 최신마커는설치CLI가읽음. 원장뒤기록은저장소에서확인.

## 같은 턴에서 완료한 묶음

- ENGINE_WORK_1163/USER_INSTALL_1165: CPU broadphase·GL/TSL/HLSL stackless BVH/minRank·보수Float32 affine경계·16bit주소/정수ID·새이미지/패스/readback0. 선택기4096과전체HDR/FPS구분.
- ENGINE_WORK_1175/USER_INSTALL_1177: 기본normalMap 실제UV 접선/화면Y/양면·0/큰/작은/퇴화보호. native1344+8/GL유효72, 실제glTF PNG/C++BP 광원5상태 D3Dsource+설치GL/GPU. 공유HDR/nativeSH중복제거·영역별밝기144B구간전송·높은count65536(1HDR공유영역)/해제·진단. 실패fixture의surface전용API/Windows매크로만수정,허용오차완화없음. Player1173한번빌드.
- ENGINE_WORK_1181/USER_INSTALL_1183: 세브라우저table변경행·여러prepare누적/full우선/GLunpack복원·tableTransfers/schema v5. 두밝기288B 대조전체1008B·정지0. native14/CPP19/Player1173동일SHA재사용으로재컴파일/native게임재검사없음. 설치1179-tCOmnH 한검사로3모드. 프로브노멀다른관례/명시tangent는잔여.

## 현재1185–1187 검사·빌드

native atlas: 같은캡처/affine경계설정변경은배치/공간모양/전체packet생성건너뛰기,변경모두검증후적용·불량설정원자거절. 영역16Bstamp→4B고유sourceindex,65536영역786432B절감. metadataFastUpdates/layoutBuilds진단.
1185 batch native2gate통과: shared1171-gNFeY6(보유CPU20709360B,이전21495792B)·atlas1119-X2I026. HLSL원문과raster설정(진단getter제외)7ce5b51동일증명 metadata-reused-normal-1187.json. 노멀/브라우저검사재실행없음. Player1186한번빌드성공(재실행금지). static1187은AI 인계5KB초과로실패해현재인계축약,그검사만다시진행. 다음record1188→sync1189→install1190→finish1191,설치실제CPP/BP D3D4영역/밝기에서layout재구성0/fast진단확인. 아직1183이최신확정.

## 유지할 잔여

RND03 다수실제HDR캡처의통제FPS/CPU·GPU메모리·tile/cluster비교·중요도덮기·sphere/lightmap·임의shader변위/instance morph경계·임의로브/매질/기하/이력. RND06 GLComplex141약8/7초,1086미채택실험반복금지. RND08 글로벌거리장clipmap/타일·방향하늘/bentnormal/시간신뢰도·지형/변형/마스크·FBX/월드/다중LOD쿠킹/HWRT/방향베이크. 다른78행요구도유지.

## 운영

사용자창/프로젝트/User프로필검사금지. heavy/EXE/install전activeInstalledVersions(셸명령문에설치버전절대경로넣으면자기검출주의),사용중이면보류. owned hidden fixture·고유포트/프로필만. 각검사retain/prune·묶음끝cache정리,빈정리receipt금지. Versions1/전체설치백업금지. install전후명세해시·User읽기SHA/연결검증(1151all-zero원인미확정때문). one-shot1161/64/65/66/1173/76/77/78/1182/83/84/1186완료재실행금지. 한글동일author/committer commit/push. Mac/Android기기없음재질문금지.
