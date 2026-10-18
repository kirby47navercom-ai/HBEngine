# HBEngine 현재 인계 — 330–334 렌더링 검증·설치 준비

- 구현63924f6/검사839d0f1 839d0f1cd6171454fa6c8f7abcc08f7ccbf3b12c예요. 설치327(0d2a7b42112d229e) 이후 WebGPU sampler 공유를 만들었고 아직334 설치 전이에요.
- rayMaterialNode의 textureLibrary는 기존 Map/load/u를 전달해 current/prior sampler Fn을 재사용해요. 다른u/load/Map형식은 거부해요. 새 전역cache/GPU버퍼/유니폼/자동읽기 없음. previous geometry/normal/UV/time/mip는 독립이에요.
- J9Mfvr 실제17dual context 오차0·기존법선관측/문맥차, GQbcyT48family-filter/384표본 oldmodule6d4대조오차0·함수4→2, 실제sourceGPU CPP/BP5o6btx 통과예요. CPU274HatdIg/187lSBMXU 통과. 함수count 첫 실패는WGSL name뒤공백regex,333첫 실패는CDP20초한호출48개→4개씩12호출로고쳤고총48/384조건유지예요.
- GL실험 ray-program-context-sharing.js는미채택이에요. W9Gc5Y17GL/GPU출력통과·329Jfr2X9 full ABBA2024/1957/2026/1931ms로시간개선근거없음. 기본GL경로에연결하지않았고성능완료로세지않아요.
- 다음 sync334/install334/finish334 새marker를한번씩사용해설치331 --case worldPositionUV를확인해요. 바이너리/GL/DX는그대로여서재컴파일하지않아요. sourceGPUgate/player/변경sourceSHA와전체manifest·User읽기전용SHA·Versions1확인해요.
- 그후초기준비지연다음후보: 가이드의 current/differential/prior 노멀을같은호출지점에서mixed frame인수로평가해driver IR재확장을줄이는방식이에요. 아직구현하지않았어요. field3 program의 geometry preamble과 공통 graph본문분리 실험이기초이고 GL/WGPU/HLSL의단독출력/가이드/동작분기를확인해야해요.
- RND07투명분기/다른표면필드와엔진누적잔여는ENGINE_STATUS정본. source/installed 명세를고치지않고다음버전으로만전환·Versions1·사용자프로필시험사용금지·사용자창조작금지예요. 이전 one-shot은전부재실행하지않아요.
