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
