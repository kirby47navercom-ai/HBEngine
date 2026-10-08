# 남은 작업과 설치 순서

2026-10-07 사용자 지시: 앞서 남았다고 보고한 목표와 누적 요청을 먼저 끝내고 검증한 뒤 사용자 설치본을 갱신한다. 그다음 조사·분석에서 추가로 발견한 목표를 진행한다. 작은 기능 하나가 끝날 때마다 설치본을 바꾸지 않는다.

## 먼저 완료할 작업

- 메인 GPU 실행 연결: 기존 노드 머테리얼·인스턴스·런타임 파라미터, 하늘·환경 캡처·높이 안개, 2D 조명·그림자·마스크·픽셀 퍼펙트, 블룸, 입자 정렬, 스프라이트 효과, 탄환, 에디터와 모바일 실행 경로. 기존 BP/C++ 함수와 에셋을 함께 유지한다.
- 기존 게임의 PC 120 / 모바일 60 목표와 메모리 비용: 같은 게임·환경에서 전체 프레임을 측정한다. 설정값이나 별도 GPU 계산 시간으로 달성을 판정하지 않는다. 이전 장시간 검사의 메모리 증가 기록도 해결해야 한다.
- 앞서 남았다고 보고한 엔진 세부 작업: 2D 뼈대·조명·마스크·윤곽선·타일 충돌·파티클 마스크, Animation Graph/Blend Tree/레이어 혼합/IK/리타게팅/Root Motion/몽타주 슬롯, 머테리얼 함수·레이어·셰이딩 모델/GI/라이트맵/반사/후처리/네이티브 렌더러, 지형·폴리곤·LOD·스트리밍·임포트·프리팹 변형, 게임 프레임워크/행동트리/FSM/NavMesh/복제·RPC, C++ 다중 소스·코드 재적용·네이티브 디버깅, AI 원자적 문서 작업, 독립 창·도킹·탐색·Undo·단축키·UI 재사용·현지화·오디오 그래프, 모바일 에디터·배포와 누적 요구. 과거 기록의 완료 항목은 실제 코드·증거와 대조해 재작업을 줄인다.
- 내보낸 게임과 에디터의 Android/iOS 경로, 설치·업데이트·서명·SDK·진단과 검증. Android 실기기와 로컬 Mac/Xcode가 없다는 기존 답변을 유지한다. 시뮬레이터 결과를 실기기 발열·배터리·스토어 배포 성공으로 대체하지 않는다.
- Unreal/Unity의 제작·조작·API 세부 대조와 누락 구현. 문서 목록 수집, 일부 본문 읽기, 기능 이름 추가를 전체 분석 또는 동작 완료로 세지 않는다.

## 검증 뒤 사용자 설치 갱신

위 작업의 완료 증거와 아직 검증할 수 없는 항목을 구분한다. 사용 중인 창·프로젝트·프로필·기존 설치 버전은 보존하고, 검증한 버전을 불변 경로에 설치한다. 현재 설치는 `C:/Users/kirby/HBEngine/Versions/7df780dd9a47cf5b`이며 이 문서 작성으로 설치가 바뀌지는 않는다.

## 그다음 이어갈 조사 기반 추가 작업

`REFERENCE_COVERAGE.md`, `RESEARCH_STATUS.md`와 개별 조사 문서의 세부 누락을 현재 코드와 대조해 구현한다. 예: 임포트 하위 에셋·캐시·쿠킹, 월드 분할·폴리지, 추가 머테리얼 도메인·셰이더 변형, 이펙트 모듈·트레일·서브 이미터, Ability/태그/EQS/회피, Control Rig·Take Recorder, UI 목록 가상화·월드 UI, 오디오 믹서·가상화·DSP, 미디어 변환·동기화, 소스 관리·번들·패치, 프로파일러·크래시 진단, 확장 API·샘플 제작 흐름. 이 목록은 상한이 아니다. 이미 누적 요청 또는 앞선 미완료 보고에 포함된 항목을 이 단계로 옮겨 선행 완료 범위를 줄이지 않는다.

## 진행 기록

- 051: 우선 순서를 기록하고 기존 메인 WebGPU 경로의 머테리얼·환경·블룸 연결을 진행 중. 설치 갱신 대기. 전체 목표 완료로 표시하지 않음.

- 051 완료: 실제 GPU/GL 머테리얼·환경·블룸 검증 및 커밋 e5f7983.
- 052 완료: 실제 GPU/GL 스프라이트/타일/입자 마스크·효과·픽셀 정렬 검증. 다음 2D 조명/그림자·입자 정렬·탄환/에디터/모바일과 누적 선행 목표를 계속하며 설치 갱신 대기.

- 053 완료: GPU/GL 2D 조명·노멀·쿠키·블렌드/마스크·3셀 그림자·캐시·볼륨·C++/BP·반환 검증. 다음 입자 정렬·탄환·에디터/모바일·누적 선행 목표. 설치 갱신 대기.

- 054 완료: GPU/GL 입자 정렬·빈 슬롯·정지 캐시·원근/월드/로컬·투사체 렌더·기존 BP/C++ 발사/충돌·반환 검증. 투사체 이동/충돌 CPU 비용은 유지. 다음 에디터/모바일 연결·전체 프레임/메모리·누적 선행 목표, 설치 갱신 대기.


- 055 완료: GPU/GL 에디터 메인·머테리얼 미리보기·공유 추가 뷰포트·보기 모드·BP/C++·저장 격리·PNG·자원 반환 검증. 모바일 연결과 전체 프레임/메모리·누적 선행 목표를 계속하며 설치 대기.


- 056/057: 모바일 공용 GPU 질의/검증과 빌드 렌더러 기록, 유휴 GPU 입자 제출·정렬 생략/재방출/만료를 구현·검증. Android 가상 기기는 GPU adapter null로 실제 GPU 미검증. 전체 프레임/메모리와 누적 선행 목표를 계속하며 설치 대기.


- 058: 실제 고정 게임 GL/GPU 패키지ABBA와 포즈/유휴UI/일반C++행 비용 절감. GL 대기119.52·공격119.81fps, GPU117.76·103.17fps 평균이며 실행 변동/공격p95로 목표 false. 164물리/실제C++·UI180프레임·SVG/장치전환 통과. [상세/재현](research/WHOLE_FRAME_058.md), 설치 대기·누적 선행 작업 계속.


- 059: GPU/GL 스프라이트 12회·C++/BP 교체의 Mesh/Material/동일 크기Geometry 재사용, 완료 프레임 렌더 통계와 에디터/소유권 검증 통과. 전체 게임 ABBA 8회는 변동/목표false, FPS 개선을 단정하지 않음. [상세/재현](research/SPRITE_RESOURCES_059.md). 058 30a82f5 푸시 완료; 설치 대기·누적 선행 작업 계속.


- 060: 믹서 RMS 샘플 배열 재사용(200회·신호/FFT/정리)과 실제 WebAudio 검증. 현재 GL/GPU 활성60초·장면/F12 각3회 자연GC 대조에서 자원수 반환/프로세스 증가를 함께 기록, 8시간 안정성/FPS 목표는 미승격. [상세](research/MEMORY_CONTROL_060.md). 059 980257d 푸시 완료; 설치 대기·누적 선행 작업 계속.


- 061: 공용 C++ 클라이언트/PC 호스트 대기 tail의 마지막 전체 응답 보관 해제. 전 코드2검사실패→실제 C++/동시성/타이머/복구4검사 통과. 현재 GPU 자연GC/전환/F12/오디오/종료 통과이나 RAM/FPS 목표는 미승격. [상세](research/QUEUE_LIFETIME_061.md). 060 b60f574 푸시 완료, 설치 대기.


- 062: C++ 호스트 실제 사용/확보 힙과 world·카탈로그 참조의 읽기 전용 진단·개발/release 경계·편집기/schema 구현. 실제 GPU 고정 게임 fCUCL4 608파일 보존/전환/초기화/오류0·종료0. Node heapUsed33.3→30.3MiB이나 heapTotal56.1→152.2MiB; 전체RAM/FPS/8시간 목표 미승격. [상세](research/HOST_MEMORY_062.md). 061 3036085 푸시 완료; 설치 대기.


- 063: 충돌의 미연결 async 대기/바인딩 재검색 절감. BP→실제C++ Enter/Exit/Hit/방향/컴포넌트/배치 동일성·62컴포넌트 검사 통과, 부분CPU1.6947→.5478ms. GPU 고정게임4회608파일 보존/오류0·종료0이나 공격p95 목표false. [상세](research/COLLISION_DISPATCH_063.md). 062 88599ff 푸시 완료; 다음 접촉 수명/누적 세부, 설치 대기.


- 064: 접촉 키를 바인딩 수명 ID로 교체하고 삭제/풀/재사용·null 상대·미상type 검사를 고쳤다. Stay/solid Exit·고정dt·Collider 상세와 실제 C++·Rapier2D/3D·164물리/62컴포넌트 통과. 부분CPU .6188ms, 전체FPS/RAM 미승격. [상세](research/CONTACT_LIFETIME_064.md). 063 2b86c0d 푸시 완료, 설치 대기.


- 065: 실제 GPU CPU profile을 근거로 카메라 임시 목록/비대상 group 조회와 접촉 중점/grounded 재검색을 절감. 같은 ID 객체 교체의 collider 참조도 갱신. 카메라/C++·166물리·접촉 배치 검증 통과. GPU4대조 current공격117.71/112.19fps, 최종단일119.35·p95 8.4ms로 목표false 유지. [상세](research/FRAME_LOOKUPS_065.md). 064 3a0046d 푸시 완료, 설치 대기.


- 066: 일반 객체의 빈 C++ 속성 준비 생략. 실제 속성/변환/입력/수명 검증은 유지. 실제 C++ wire/host/worker의 잘못된 값·무등록 속성·NaN 거절/복구와 delta/reset/재시작 통과. 부분validation .03088→.02627ms, 전체FPS/RAM 미승격·동일 긴 검사 미반복. [상세](research/NATIVE_VALIDATION_066.md). 065 a15552a 푸시 완료, 설치 대기.


- 067: VM별 같은 스폰 카탈로그를 검증 후 불변 snapshot으로 공유, 실제 수정본 분리/호출자 격리/worker 재시작·다중 모듈 C++ 생성 검증 통과. WebGPU RzO5ok 원본608 보존/오류0·종료0, 맵 기록7개 유지·모듈당 실제 카탈로그1개. 이번 단일 PC 대기119.98/전투119.80fps·p95 6.4/8.2ms 통과이나 전체 RAM1085MiB·기존 장시간/모바일 목표 미승격. [상세](research/SPAWN_CATALOG_LIFETIME_067.md). 066 ffe3031 푸시 완료, 설치 대기.


- 068:14번째 포즈 노드 정수 선택·포즈별 시간/곡선·세 자식 갱신·독립 시계/중단·우클릭 입력/Int step/사람·AI schema·기존 BP/C++ 연동. 코어 및 실제 Editor2v0nuS/releasePlayerGW6cSH 검증 통과, 원본/종료/정리 확인. [상세](ANIMATION_INTEGER_SELECTION_068.md). 06737add40 푸시 완료, 전체 선행 순서·설치 대기/장시간·모바일 목표 유지.

- 069: Enum domain·기본/이름 핀·sparse 값·상태 전이·C++ enum Set/Get·BP wire·AI 계약을 공용 포즈 실행기에 연결. 실제 EditorU6Kc5a/releasePlayer5p7bBX·기존 검사/원본·정리 통과. [상세](ANIMATION_ENUM_SELECTION_069.md). 068a65b17c 푸시 완료, 선행 누적 순서·설치 대기. 다음 rootMotion 공식 본문 대조/실행 순서 확인, 구현 완료 미표시.

- 070: 루트 모션 클립/몽타주·네 모드/고정·혼합·2D/3D 물리/중력·BP/C++/AI·미리보기 연결. 코어/166 실제 물리·기존 회귀, 최종 Editor RkHfhj/release Player5ZENzn 원본/오류0/종료0/서버 정리·제품 SHA 일치 통과. [상세](ANIMATION_ROOT_MOTION_070.md). 069570b2f4 푸시 완료; 설치 대기·전체 선행 순서와 전역 FPS/RAM 미승격 유지. 다음3D IK/리타게팅 세부.

- 071:3D Two Bone/FABRIK·네 공간/Actor 목표·SDK/BP8·AI/미리보기·실제 뼈·재생/늘이기 보존·실행 중 선택/속성 정리. 최종 Editor animation-ik-editor-Xb2cNs/release Player animation-ik-player-KpvwcF·기존 회귀/705노드·원본/오류0/종료0/서버 정리/제품 SHA 통과. [상세](ANIMATION_IK_071.md). 07020c03b7 푸시 완료; 누적 선행 순서/설치 대기 유지. 다음 리타게팅 및 누적 세부.

- 072: 리그·프로필/기준 포즈·체인 매핑·다른 관절 수 FK/프로필별 IK·선행 원본 Tick·베이크 클립·SDK/BP5·AI·전용 편집기를 연결. 최종 Editor5FiN9K/releasePlayer29kNB1·코어/기존 회귀·710노드/625 SDK연결·원본/오류0/종료0/서버 정리/제품 SHA 통과. [상세](ANIMATION_RETARGET_072.md). 071391bc15 푸시 완료; 임의 Op Stack/LOD/Avatar/Muscle·커브/모프·2D 전용 리타게팅 등 세부와 전체 선행/설치 대기를 유지.

- 073: CCD IK·양방향/직선 정지점 보정·이름별 전체 회전 제한·공용 SDK/BP1·AI/관절 UI/Undo·실제 리타게팅 IK 선과 수명 정리. 최종 Editoro1ggrE/releasePlayerFM13zf·세 솔버/2D IK/기존 회귀·711노드/626 SDK연결·원본/오류0/종료0/서버 정리/제품 SHA 통과. [상세](ANIMATION_CCD_073.md). 07227238e5 푸시 완료; 다음2D 관절 제약·FullBody/ControlRig/리타게팅 등 누적 세부, 설치 대기 유지.


- 074: 세2D IK의 bind 로컬 최소/최대·잠금/혼합/길이 보존·ID 검증·관절 UI/범위 기즈모·Undo/AI·SDK/BP2를 공용 실행에 연결. 최종 EditorfszJTj/releasePlayerTt6Pda·기존2D/3D/리타게팅/실제C++·713노드/628 SDK연결·원본/오류0/종료0/서버 정리/제품 SHA 통과. [상세](2D_IK_CONSTRAINTS_074.md). 073b71eed0 푸시 완료; 전체 선행/설치 대기 유지, 다음 머테리얼 함수·레이어 등 누적 세부.


- 075: 머테리얼 함수 독립 에셋·네 타입/다중 출력·Preview/필수 입력·검색/다중 드래그·우측 속성·핀 ID/갱신·Undo/저장 전파·공용 CPU/GLSL/TSL·기존 BP/C++/배포를 연결. 코어/메인·최종 EditorHRAwU2/GPUPlayerhbyOLC/GLPlayerOHr8zt·실제 픽셀·SHA/오류0/종료0/서버 정리 통과. [상세](MATERIAL_FUNCTIONS_075.md). 0742efc358 푸시 완료; 함수의 다른 포트/추출/미리보기·Layer/Blend 및 전체 선행 세부/설치 대기 유지.


- 076: Attributes/Layer/Blend·스택/독립 값·인스턴스 상속/복원·복제 ID·SDK/BP/AI·캐시 갱신/원자적 저장을 연결했다. 코어/714 BP·629 SDK·최종 EditorWAJ76y/GPUPlayerK92uTA/GLPlayeri24w02 실제 픽셀·원본/SHA·오류0/종료0/서버 정리 통과. [상세](MATERIAL_LAYERS_076.md). 0759d83d07 푸시 완료; WebGL2 Float 재생성 비용과 다른 누적 세부/선행 설치 순서 유지.


- 077: WebGL2 Float uniform/프로그램 키·레거시/표면/scoped 값·clone/수명과 인스턴스 레이어 배치/15px 아이콘을 연결했다. 1000쓰기로 ID/version/program 보존, 최종 GL EditorGVDL8F/releasePlayerQoBTLQ 실제 C++/BP 픽셀·동일 머테리얼/지오메트리/텍스처·원본/SHA·오류0/종료0/서버 정리 통과. [상세](MATERIAL_UNIFORMS_077.md). 0764d6b235 푸시 완료; 전체 선행/설치 대기 유지.


- 078: 선택 노드→독립 머테리얼 함수·typed texture2d/staticBool·정적 shader branch·MI/Layer·사람/AI 묶음 저장/Undo·생성 탭 수명·UI 배치를 연결했다. 최종 EditorBBInhr/GPUPlayerviFKGa/GLPlayerPnhjVX 실제129600픽셀·C++ 적용·sampler 차이/반복 자원·원본/SHA·오류0/exit0/서버 종료 통과. [상세](MATERIAL_TYPED_FUNCTIONS_078.md). 077885c879 푸시 완료; 전체 선행/설치 대기와 추가 포트·개별 preview 및 분야별 누적 세부 유지.


- 079: 노드/출력 미리보기·Ctrl+T·문서별 view·AI 조회/선택/종료를 upstream 임시 그래프와 기존 resolver/compiler에 연결했다. 84 출력·기존 코어와 실제 GL KtwBLs/GPU PMw2yw의 색 영역/단축키/문서·원본/Undo/SHA/errors0/exit0/서버 종료 통과. [상세](MATERIAL_PREVIEW_079.md). 078facc0eb 푸시 완료. 다음 preview 메시/표시·환경/Realtime 및 전체 선행 세부/설치 대기 유지.

- 080: 미리보기 기본 메시/프로젝트 모델·2D/3D 조작·문서별 카메라/배율·조명/환경/노출·Realtime과 AI material.scene 연결. 최종 GL KHG7gW/GPU YVTXYC의 실제 픽셀·정지 렌더·카메라/원본/Undo/30소스SHA·오류0/종료0/서버 정리 통과. [상세](MATERIAL_PREVIEW_SCENE_080.md). 0799b0f30e 푸시 완료. 추가 텍스처/도메인·뷰포트 세부와 전체 선행/설치 대기 유지.
