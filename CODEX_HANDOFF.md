# HBEngine 현재 인계 — 298–307 설치 검증 완료

- 현재 런타임 소스 5c6cd128bef3a3ab81d6d0119d3592e20409eee9(307), 앞선588944d/3a0e30d/d13a5b0 포함 main push예요. 최종 검사/설치 문서는 후속 커밋에 남겨요.
- 현재 설치 534dae19145a0053 하나·3088명세 파일 전체SHA·바로가기2/.hbproject·User10385파일 전후SHA 동일을 확인했어요. 이전설치177509691B 제거·수정보관0이에요. 원본/보고서/입력/캡처를 남긴 자체 CPP probe만3112555B 정리했어요.
- 298–306 구현은 USER_INSTALL_306/ENGINE_WORK_305·306에 있고 설치306까지 확인했어요. sampler mip 단일 호출/정수LOD 생략·48필터 미분 절삭·GL 불투과·인스턴스 노멀/bind/morph/interleaved key·현재 설치 read-only 식별이에요.
- 추가307: SceneScreenEffects CPU noTransmission bool/strict JSON/자동packet·variantkey/define·AI pathNoTransmission이에요. 없는 요청 false/투과 fallback·GPU Constants/버퍼 ABI·8MiB 캐시/소스 공유를 보존해요. 실제 source yHkwNk C++/BP/변형/이전노멀/필터/해제·재방문 통과와 활성true를 확인했어요.
- 실제 설치헤더 tiFviq의 solid+alpha.45 바이트차0·alpha1702 RGB성분 관측·컴파일2/재사용/source1·81,824B/8MiB·해제, 실제 설치 창 Q8oV9Q의camera1024성분 차0/UV/guide/API 현재hash·정상종료 통과예요. Native 게임은 source gate/player 동일바이트로 재사용했고 두 번째 설치 게임 실행이라고 하지 않아요.
- RND06 잔여: 실제 Complex141 GL6.59초/시간3.77초·GPU3.67/2.11초·D3D5.19/3.28초 추가절감이에요. D3D재방문190/221ms. 모두 단일 전환이며 전체FPS/실기기 보장이 아니에요. GL/GPU 공용소유자를307에서 바꾸지 않아 해당통과검사를 반복하지 않았어요.
- RND07 다음소유자: path-guide-frames의 unsafe[3,4,5], path-curved-guide/previous-normal-gpu, rayProgram/field/normalTime의 현재point와 평가worldPoint 결합이에요. UV/barycentric 표본은 현재point를 유지하고 이전 평가point/normal/view를 별도 전달해야 해요. 기존 motion의 이전point/프레임/시각을 활용하고, WorldPosition이 texture coordinate ancestor인 경우 이전 mip footprint까지 같이 검증해야 해요. 아직 이 기능을 구현한 것이 아니며 현재 보수적 무효화를 유지해요.
- 전체잔여/분모는 ENGINE_STATUS 정본(78등록행/39verified35partial1unimplemented3unverified)이에요. UE/Unity 전체 분모나 문서전체 gate를 승격하지 않아요.
-309의 deformation fixture는 실제 lit receiver/광원/캐스터를 만들어 안정→pose dirty를 검증하고 unlit/no-light 생략도 확인해요.307커밋의 변형캐시 표현은 새캐시가 아니라 이 회귀 연결이에요. DEBUG_HANDOFF 참조예요.
- sync307/install307/finish307·record307·validate308/309와 이전one-shot들은 실행한 것이므로 재실행하지 않아요. 새시도는 새이름/marker를 사용해요. rootHBPlayer는없고 dist/HBEngine/HBPlayer.exe를 써요. 사용자창/프로필/프로젝트는 건드리지 않으며 고유 숨김창/프로필/포트로 검사해요.
- 생성CPP검사 probe.exe는 표준 pruner가 root 단독파일까지 지우지 않으므로 자체 검사 종료 시 생성경로/SHA를 확인해 별도로 정리해요. 원본CPP/재현입력/보고서/참조실행기/SDK/사용자파일은 보존해요.
