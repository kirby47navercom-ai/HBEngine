# 현재 인계 — 누적 엔진 구현 계속

2026-10-21. 주인님: 여러 분야를 구현 후 영향검사 묶음1회, 성공SHA 재사용, 반복빌드/3시간검사 금지. AGENTS/docs/AI_START→hb context. 백그라운드만. 한글동일author/committer commit/push.

## 현재 설치
USER_INSTALL_1217: C:/Users/kirby/HBEngine/Versions/771aa0ffcc7421e4/HBEngine.exe.3907명세/586소유SHA/CPP21/native16·Player1204 d86d57ac…/Host1041 재사용·User10849읽기SHA/연결/Versions1·이전185246846B정리. 설치builder Windows/D3D11 5/8/8동적분기·Promote/auto변환/중첩Transform/새모듈2개포함통과. 과거1208의Sphere3backend9상태성공도유지.


## 렌더·변환 완료와 잔여
WORK1163 BVH/minRank/보수Float32·16bit주소/정수선택. 1175 normal/UV/cotangent/SH·HDR공유.1181 부분행전송.1188 CPU설정fast/layout불변/4Bsourceindex·65536공유영역768KiB절감. 숫자65536은1HDR공유영역,4096은선택기/FPS아님.
1199 Sphere world반경·offset/capture분리·조건속성/helper·CPU/GL/TSL/native·SetSphere원자/Shape/Radius·rank slot재사용. metadata9float4/144B v6: browseratlas faceScale.w/nativeoptions.w bit0projection bit1sphere, directoptions.w bit0enabled bit1sphere; nativefaceScale.w는count예약.
1206 signedScale 씬/기즈모/복제/노드/CPP/spawn/pool/save/물리/network/sequence·D3D world/mixed instance면/법선. native48/Rapier2D3D/CPU520/nativeSphere1040통과. 구browser수식SHA재사용. shear/브라우저negativeInstancedMesh 완전지원은미주장.

## 현재1210–1214 구현·설치 확인
Feature727c36d. WORK1214: 동적Sequence/MultiGate/Switch·Default/Gate startClosed·exec입력합류/다중선행Setter·Promote Get/Set/연결·단위scale·recursiveSplit/Recombine/preview/VM·공유pin-values·C++ literalaggregate/array/escapedstring·AIroute.
최종batch1212 CPU flow-authoring-1210-csOmAS 1668핀/1699확인·실제C++/8출력/65case; UI1211-rSc3vk 우클릭/추가삭제/default/UndoRedo/AIpatch/Promote/Play; 기존runtime성공SHA재사용. static1213 문법14/API/AI26경로191.73ms(process,모델이해아님). 첫CPU실패는exec입력다중거절실제결함수정,첫UI실패는dirty문서종료대화상자→owned문서save후정상종료.
sync1216/install1217/finish1218완료재실행금지. native16/Player1204/Host1041동일로재빌드금지. 설치gate는새 check-flow-authoring-1215-player(flow-player-1215-2XMBwP통과): 동적5/8/8출력·Promote/convert/중첩Transform·moduleClosure·설치builder Windows package. sourceGUI통과SHA와설치명세대조로GUI/렌더매트릭스재반복없음. scope에남은과거Sphere설명은reportCorrections원문보존후정정.
CPP01 기존verified를partial로정정: customstruct/enum+Switchenum/name,SetMembers,CollapsedGraph/Expand 잔여. ENGINE_STATUS78행/전체분모·완료율null.

## 운영
heavy/EXE/install전activeInstalledVersions; inline셸문자열에설치EXE버전경로넣으면자기검출하므로스크립트저장후별도실행. 사용자창/탭/프로젝트/User테스트금지. User는설치전후읽기SHA만. ownhidden fixture/고유포트·프로필,각retain/prune·끝공유cache정리(0삭제빈receipt금지). Versions1/전체백업금지. *.started one-shot은모두재실행금지(특히1197/1197b/1200/01/04/07/08/09).
RND03 독립proxy/작은capture우선·perface/normalfade/lightmap·큰장면실제HDR/FPS/tilecluster·임의변형/instance morph. RND06 GLComplex141 8/7초,실패1086실험반복금지. RND08 글로벌거리장/지형/월드·HWRT/방향베이크. 나머지원장유지. Mac/Android기기없음재질문금지.

다음우선조사: 2D최상위Blueprint클래스/template·Actor/Pawn의강제MeshRenderer분리. class-types에는2D종류없고kind character2d를Character로매핑. SDKGame에는Actor/Pawn/Character뿐, tools/native-source builtin목록3곳고정. 아직변경하지않음;기존저장component보존하며create/spawn/place/CPP/player조회까지연결할것.
