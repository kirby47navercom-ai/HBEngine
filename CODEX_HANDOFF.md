# HBEngine — 169 구현·설치 검증 기록 — 2026-10-16

사용자: 전체 누적 조사/엔진 목표를 여러 기능으로 계속 구현. 번호/일부검사/설치 갱신을 전체완료로 바꾸지 말 것. 주인님/짚짱·자연스러운 존댓말, 사용자 창/프로필/게임 원본 보호, 검사 숨김·격리·소유 PID만 종료. Versions1·용량 관리·한국어 커밋/푸시. 새 에이전트 요청 없음.

169 기능4e36205: 확장/대칭 자동타일·먼 역의존 청크dirty/UV, NavArea 비용/32bit마스크/volume·이동 obstacle SAT 보수적 삼각 차단/2D그리드·메뉴/helper, shared-pose 다중 CCD FullBodyIK·목표UI/오차·C++/BP4·AI, 구성/골격/오디오큐 Take·시퀀스 복원/slerp/축약·프레임장벽, 메시 bridge/개별face inset, 명시Prefaboverride 의도 보존, 버스RMS사이드체인 UI/C++/BP3, DirectX실선 기존삼각스트립/평면clip/픽셀폭/재사용·해제, 공식SHA SDK캐시만 반복백업제외/역사중복정리.

노드760/코어289. 새 종속성·idle폴링·자동GPU읽기0. CPU23군 engine-169-8ECl2s, 실제 C++runtime-f9BgVI, Editor human/AI/Take/audio hf1cnp, D3D11 dev pTlFoK/release aS01Kj, WebGPU IjmQtt PASS. 165–168/2D/IK/관절/native/전송/오디오/코어/API 회귀도 통과. frame0 LineSegments 실패 수정 및 sourceattribute교체/vertexColors CPU검증. 마지막 166회귀 MA8IYW12군/2D확장/생성API/코어 확인. 전체 scope docs/ENGINE_WORK_169.md와 research/ENGINE_WORK_169.json.

사용자 설치5e97fbc46c607b17·2356파일 SHA·Versions1·바로가기2개/.hbproject 일치. 설치 EXE169 GOAWjW의 사람 IK/AI dryRun Undo/실제 C++/Take/실제 무음 WebAudio 사이드체인 PASS,168 fQqMLy Apply/Revert/원자Undo/liveInheritance/타일청크/Play복원 PASS. 캡처3종 시각확인. 사용자 프로필10385파일 전후SHA 일치. 이전설치183607599B, 동일SDK 역사백업1907000B 제거. 다른 수정파일 보존. 검사빌드/브라우저프로필 자동정리 후 전체캐시 추가삭제0. 재현자료·보고·캡처 보존. USER_INSTALL_169.json.

정본 원장78행 verified39/partial33/unimplemented3/unverified3; ANM05만 미구현→부분, 상위완료0. 전체gatefalse/분모미확정. 다음 실제잔여: Prefab 구조적Apply/stage/변형컴포넌트, 대규모 sparse타일 인덱스/물리비용·2.5D품질, 메시 bevel/loop/UV섬, 내비 정밀carving/반경/RVO, IK 루트이동/늘이기/stiffness/회전/ControlRig stage, 임의native상태/액터 생성·PCM/DSP녹음/외부시네마틱, 오디오 voice가상화/nativeDSP. 그 외 렌더링RND05–08·프로파일러/플랫폼/PC120·mobile60/장기RAM 등 원장전체 잔여 유지. Mac/Xcode/Android실기기 없음. 일부분을 전체목표로 축소하지 말 것.

다음 세션은 원장 남은 기능을 여러 분야에 걸쳐 구현하고 마지막에 관련 검사를 묶어 갱신. 주인님 앱/서버를 닫지 말고, 동일검사 반복/불필요 전체native재컴파일/폴링 금지. 테스트와 dist복사는 node.exe 잠금 때문에 순차. tools/test-artifacts.mjs로 재생성 자료만 정리. 현재 진행중 테스트 PID없음. 설치 이후 문서의 insetFaces 입력명 distance 오기정정과 설치영수증은 후속 문서커밋; 제품 코드는 기능커밋과 동일.
