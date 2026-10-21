# 현재 인계 — GPU 물리 시선·누적 엔진 목표 계속

2026-10-21. 장기 목표 active. 여러 구현 뒤 관련 검사 묶기. AGENTS.md→docs/AI_START.md→node tools/hb.mjs context "작업명". 정본 docs/research/ENGINE_STATUS.json. 전체 UE/Unity 분석·전체엔진완료 미주장. 사용자 창/게임/User를 검사에 쓰지 않아요.

## 최신 구현·근거

ENGINE_WORK_1149.json·GPU_PHYSICAL_VIEW.md·research/GPU_PHYSICAL_VIEW_1148.md. GPU Physical 시선은 투영uniform으로빌더소유PV를먼저대입·금속/코팅/sheen/이방성/환경/원본·작성굴절공유·factory/legacy변환한번·capture원근보존. global/dependency수정없음. rawvolume r180 15입력slot1검사·원본DFG/작성Schlick정책유지. thinfilm XYZ dot행/GL실제multis Fresnel·평균·두께0/가중치clamp. start뒤교체무효,첫consumer직전준비. 폴백명시읽기READ/pack복원후fence·동시프레임보호·PBO/FBO성공/실패해제. 추가엔진GPU버퍼/타깃/readback/프레임순회0;uniformpacking은변할수있음. 새공용schema.cameraView/renderer.cameraView·AI경로·도움말/MIT보존.

1145-SQ1mnK 시선24/물리16×2, 이전오차.3→<5e-8·평면불변0·GL오차<.001628.1146-VdoCCE 독립분광31×2·원본/작성굴절오차<.001312/.000333·읽기29/잔류0.1117-kWTz3x 세모드각54gradient·정지재사용/인스턴스/해제.실제1147-WEhBN8 CPP SetFloat/SetPosition·BP재질/회전복원6상태×3픽셀.원래 허용오차유지.초기기울기에서roughness차이2byte라실패한fixture는초기시선에서편집하도록순서만수정·>=4byte유지.

## 설치

확정 USER_INSTALL_1151.json: C:\Users\kirby\HBEngine\Versions\fe2c6e136bd7e741/HBEngine.exe. 3857파일/525소유SHA/CPP16·native13·Player1139/Host1041불변재사용. 설치GPU/폴백각24시선/16물리·분광31·읽기29·atlas세모드각54·실제CPP/BP DirectX/WebGL/WebGPU각6상태×3픽셀·AI실제마커·User10849읽기전후SHA·연결·Versions1.이전184414405B정리·cache{"deleted":0,"bytes":0,"receipt":null}. sync1150/install1151/resume1151/resume1155/resume1156/repair1151/repair1153/finish1152 완료/소진,재실행금지.

설치검사도중원래job handle/프로세스가사라지고게임검사가미완료였어요.기완료3gate는그대로재사용.후속Node빌드import에서220설치파일이동크기all-zero/명세SHA불일치·repo/dist정상확인.사용중0에서명세와같은바이트만원자복원·3857전체/후속import/실제3게임/전체최종SHA통과.손상원인은미확정,엔진코드원인해결주장금지. native/build/install-1151-byte-repair.json 및 import-integrity.비0수정거부/User검사원본미사용.

## 이어갈 잔여

RND03 전역probe순위의공간타일/클러스터가속·큰장면비용·중요도우선/작은캡처덮기·sphere/lightmap·임의shader변위/instance morph texture경계·임의복합로브/매질·기하/이력전조합. native기본texture normal/다른tangent관례확대. RND06 GLComplex141약8/7초유지;1086 SSA/0초기화미채택반복금지. RND08 전역거리장clipmap/타일·방향하늘/bentnormal/시간신뢰도·지형/변형/마스크·FBX/월드/다중LOD·편집기쿠킹/HWRT/방향베이크. 다른78행누적유지·전체완료율미확정/연구gate미승격.

백그라운드·고유소유프로젝트/프로필/포트만. 무거운검사/EXE/설치전activeInstalledVersions·사용중이면미루기. 호출셸commandline에설치경로를넣으면검사자신을active로검출할수있어스크립트준비/실행분리. Versions1·전체백업금지·각검사runtime/마지막공유캐시정리.한글동일author/committer commit/push. Android폰/Mac없음재질문금지.

## 후속1157–1163 설치 준비

사용자지시:멈추지않고구현묶음후검사한번,이미성공한검사반복금지. CPU/GPU/GL/D3D rank보존 BVH·Float32오차경계·16bit주소·정수selection·CPU broadphase·정지/밝기재사용/진단 구현. batch1160 CPU1157-Ip0jVb/selector1158-QAWPmx/atlas1117-EUpJpG/native1119-e7hLIO 통과·Player1161 한번빌드/Host재사용. static1163 API/AI통과. 현재설치1151 유지. 다음ENGINE_WORK_1163·sync1164/install1165/finish1166 새one-shot·설치전체SHA+실제CPP/BP3게임만,이미통과한GPU/native행렬재실행금지. Versions1·User보호. docs/PROBE_SPATIAL_INDEX.md·research/PROBE_SPATIAL_1162.md. 누적전체목표미완료,목표도구상태와별개로최신사용자계속지시따라진행.
