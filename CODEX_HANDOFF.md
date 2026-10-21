# 현재 인계 — 누적 구현 계속

2026-10-21. 주인님 지시: 여러 구현을 묶고 영향 검사 한번, 통과 검사·빌드 반복 금지. AGENTS.md/docs/AI_START.md→hb context. 원장 docs/research/ENGINE_STATUS.json 78행, 전체UE/Unity분모·완료율미확정.

## 확정 설치

USER_INSTALL_1190.json: C:/Users/kirby/HBEngine/Versions/fc81d47f83b22276/HBEngine.exe. 3884명세/544소유SHA/CPP19/native14·Player1186/Host1041·User10849읽기SHA/연결·Versions1. 역사적성공. 실제1201전환 b9ebd4af551e13a1은Sphere패키징음수scale거절로검증실패;새수정설치대기.

## 완료한 앞선 구현

WORK1163: CPU/GL/TSL/HLSL 공간BVH/minRank·보수Float32/16bit주소/정수선택, 추가이미지/패스/readback0. 선택기4096과전체HDR/FPS구분.
WORK1175/INSTALL1177: 기본normal UV/화면Y/양면/0·큰·작은·퇴화보호·native1344+8/GL72·실제glTF CPP/BP3백엔드. 공유HDR/SH중복제거·144B구간전송·65536은1HDR공유영역.
WORK1181/INSTALL1183: 세브라우저table변경행/대기누적/full우선/GLunpack·두밝기288B대조전체1008B·정지0,CPP빌드재사용.
WORK1188/INSTALL1190: 같은source/affine 설정전용CPU경로·원자검증·16Bstamp→4Bsourceindex/65536영역768KiB절감. 설치CPP/BP4공간/밝기·복원 layout1고정/fast0→1→2. 동일HLSL증명으로노멀/브라우저재검사없음. Player1186한번빌드.

## Sphere1192–1199 최종 검사 통과·설치 준비

공식UE reflection-captures shape/Unity HDRP17 probe/proxy의영향영역·투영구역읽기, CORPUS_MANIFEST supplemental1192/Unity seeds등록(전체gate아님). SPHERE_REFLECTION_PROBES.md.
world volumeRadius/volumeShape·조건UI/배치sphereReflectionProbe/3원helper·CPU/GL/TSL/native fade/project. 반경은owner스케일불변,offset/capture는owner변환. C++/노드 SetSphere(원자1update)/SetShape/SetRadius·SDK setProbeSphereVolume. 활성source slot을순위변경에도유지. schema v6/9float4·144B불변. atlas faceScale.w/native options.w: bit0projection bit1sphere; 직접browser options.w: bit0enabled bit1sphere. nativefaceScale.w는count예약이므로shape넣지말것.
최종1196 CPU520/GPU3×520/native1040/box54·21/direct3×160통과. 최종1197b뒤1201전환은scene음수scale거절로실패,영수증보존. WORK1206: signedScale씬/편집/기즈모/복제/BP/C++/spawn/pool/save/physics/network/sequence·D3D월드/혼합instance면법선. native48/2D3D Rapier/CPU520/nativeSphere1040통과·API/AI/문법18. native시험dmdHkG,JS float경계3XtqWy(native재사용),sphereCPU qhiadq/native TwtOsg. 브라우저수식/패딩/테이블SHA동일재사용,광범위재검사금지. Player1204성공/Host1041재사용,CPP21/native16. 원래1195게임fixture의scale[2,.5,-1]유지·9상태×3backend최종설치예정. 다음sync1207/install1208/finish1209. one-shot1204완료재실행금지. 도구reuse-native는소유SHA일치때만.


## 잔여와 운영

RND03 다수실제HDR/FPS·tile/cluster비교·우선점유/작은capture override·독립proxy/lightmap·shader변위/instance morph경계·임의로브/매질/이력. RND06 GLComplex141약8/7초,1086미채택실험반복금지. RND08 글로벌거리장/타일·방향하늘/시간신뢰도·지형/변형/FBX/월드/다중LOD쿠킹/HWRT/방향베이크. 다른78행유지.

사용자창/프로젝트/User검사금지. heavy/EXE/install전activeInstalledVersions(셸명령문에설치버전절대경로넣으면자기검출),사용중보류. owned hidden fixture/고유포트·프로필,각retain/prune·끝cache정리/빈receipt금지. Versions1/전체백업금지. install전후명세·User읽기SHA/연결검증(1151 all-zero원인미확정). 완료one-shot1161/64/65/66/1173/76/77/78/1182/83/84/1186/89/90/91/1197/1197b 재실행금지. 한글동일author/committer commit/push. Mac/Android기기없음재질문금지.
