# 누적 작업 원장과 현재 상태

최신 상태: [엔진 현재 원장](ENGINE_STATUS.md) · [공용 JSON 원장](research/ENGINE_STATUS.json). 2026-10-16에 과거 잔여와 이후 구현/검증 기록을 대조했다. 아래 초기 계획과 진행 로그는 변경 이력이며 현재 미구현 목록으로 사용하지 않는다.

등록된 각 행의 구현 범위·남은 동작·코드/검증 근거를 구분했다. 이미 구현한 2D 조명/마스크·골격/IK·리타게팅 기본·루트 모션·머테리얼 함수/레이어·독립 창·모바일 출력·웹 빌드를 통째로 미구현으로 다시 적지 않는다. 전체 UE/Unity API 대조 분모와 실기기 검증은 별도 유지한다.

작업 순서: 렌더링 준비 비용 → 원장의 구체적인 제작/실행 세부를 함께 구현 → 변경 묶음에 맞는 검사 → 사용자 설치 전환. AI 공용 API·가벼움·사용자 프로젝트/프로필 보존·Versions1은 모든 단계의 요구다.

<details><summary>2026-10-07 초기 계획 (과거 기록)</summary>

2026-10-07 사용자 지시: 앞서 남았다고 보고한 목표와 누적 요청을 먼저 끝내고 검증한 뒤 사용자 설치본을 갱신한다. 그다음 조사·분석에서 추가로 발견한 목표를 진행한다. 작은 기능 하나가 끝날 때마다 설치본을 바꾸지 않는다.

### 먼저 완료할 작업

- 메인 GPU 실행 연결: 기존 노드 머테리얼·인스턴스·런타임 파라미터, 하늘·환경 캡처·높이 안개, 2D 조명·그림자·마스크·픽셀 퍼펙트, 블룸, 입자 정렬, 스프라이트 효과, 탄환, 에디터와 모바일 실행 경로. 기존 BP/C++ 함수와 에셋을 함께 유지한다.
- 기존 게임의 PC 120 / 모바일 60 목표와 메모리 비용: 같은 게임·환경에서 전체 프레임을 측정한다. 설정값이나 별도 GPU 계산 시간으로 달성을 판정하지 않는다. 이전 장시간 검사의 메모리 증가 기록도 해결해야 한다.
- 앞서 남았다고 보고한 엔진 세부 작업: 2D 뼈대·조명·마스크·윤곽선·타일 충돌·파티클 마스크, Animation Graph/Blend Tree/레이어 혼합/IK/리타게팅/Root Motion/몽타주 슬롯, 머테리얼 함수·레이어·셰이딩 모델/GI/라이트맵/반사/후처리/네이티브 렌더러, 지형·폴리곤·LOD·스트리밍·임포트·프리팹 변형, 게임 프레임워크/행동트리/FSM/NavMesh/복제·RPC, C++ 다중 소스·코드 재적용·네이티브 디버깅, AI 원자적 문서 작업, 독립 창·도킹·탐색·Undo·단축키·UI 재사용·현지화·오디오 그래프, 모바일 에디터·배포와 누적 요구. 과거 기록의 완료 항목은 실제 코드·증거와 대조해 재작업을 줄인다.
- 내보낸 게임과 에디터의 Android/iOS 경로, 설치·업데이트·서명·SDK·진단과 검증. Android 실기기와 로컬 Mac/Xcode가 없다는 기존 답변을 유지한다. 시뮬레이터 결과를 실기기 발열·배터리·스토어 배포 성공으로 대체하지 않는다.
- Unreal/Unity의 제작·조작·API 세부 대조와 누락 구현. 문서 목록 수집, 일부 본문 읽기, 기능 이름 추가를 전체 분석 또는 동작 완료로 세지 않는다.

### 검증 뒤 사용자 설치 갱신

위 작업의 완료 증거와 아직 검증할 수 없는 항목을 구분한다. 사용 중인 창·프로젝트·프로필·기존 설치 버전은 보존하고, 검증한 버전을 불변 경로에 설치한다. 이 절 작성 당시 설치는 `C:/Users/kirby/HBEngine/Versions/7df780dd9a47cf5b`였으며, 이후 실제 설치 전환은 개별 USER_INSTALL 기록과 CODEX_HANDOFF 최신 구역을 따른다.

### 그다음 이어갈 조사 기반 추가 작업

`REFERENCE_COVERAGE.md`, `RESEARCH_STATUS.md`와 개별 조사 문서의 세부 누락을 현재 코드와 대조해 구현한다. 예: 임포트 하위 에셋·캐시·쿠킹, 월드 분할·폴리지, 추가 머테리얼 도메인·셰이더 변형, 이펙트 모듈·트레일·서브 이미터, Ability/태그/EQS/회피, Control Rig·Take Recorder, UI 목록 가상화·월드 UI, 오디오 믹서·가상화·DSP, 미디어 변환·동기화, 소스 관리·번들·패치, 프로파일러·크래시 진단, 확장 API·샘플 제작 흐름. 이 목록은 상한이 아니다. 이미 누적 요청 또는 앞선 미완료 보고에 포함된 항목을 이 단계로 옮겨 선행 완료 범위를 줄이지 않는다.


</details>

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

- 081: 큐브맵/배열/볼륨 에셋·순서 폼·아홉 typed 노드·함수/MI/레이어/미리보기·공용 CPU/GLSL/TSL·참조/수정 전파·생성 시 변환/실패 수명 연결. 최종 GPU Z9ZlyK/GL rCFmwH의 면6·슬라이스/보간·폼/Undo·35소스SHA/원본/오류0/종료0/서버 정리와 코어 통과. [상세](MATERIAL_TEXTURE_FAMILIES_081.md). 08045c632d 푸시 완료. sampler/mip/HDR/외부·런타임 texture setter와 전체 선행/설치 대기 유지.

- 082: 런타임 typed 텍스처 setter·C++/BP/공용 Play/Preview/Player·파라미터 원점/Layer 키·빈 기본값·atomic staging/실패/요청/해제·동일 에셋 no-op 연결. 최종 배포 GL8lWGnN/GPULvhZc4의 네 종류 실제 C++/BP 픽셀·실제 shader/pipeline identity·동일 에셋10회 loader 증가0·자원/원본/각51SHA·오류0/exit0/서버 종료 및 코어 통과. [상세](MATERIAL_TEXTURE_PARAMETERS_082.md). 0819f10fe5 푸시 완료. sampler/mip/HDR/도메인·전체 선행 세부/설치 대기 및 추가 조사 목표 유지.


- 083: 웹 정적 빌드·하위 주소·공용 Player/모바일 프로토콜·C++ WebAssembly·저장·터치·게시 도구를 연결한다. [웹 제작 흐름과 검증](WEB_GAME_EXPORT_083.md). 전체 051/추가 세부·전체 corpus·실기기/성능 목표를 유지한다.


- 083 완료: 정적 하위 주소/해시·기존 코어715/289·모바일 브리지·실제 C++ Wasm 2D/3D·키보드/마우스/터치/저장 통과. GitHub Pages 공개 주소에서도 실제 실행 확인(오류/HTTP 실패 0). 사용자 설치 dcc7dfb86fcb2208 갱신, production12 SHA/schema/웹 검사·바로가기 확인. 058–082를 포함한 현재 제작 코드가 새 설치에 반영됐다. 기존 원본/실행 창 보존; 전체 corpus와 051/추가 세부·실기기/성능 목표를 유지한다.

- 120 진행: 거친 코스틱·고정 메모리 점진 반경·WebGPU 그래프 변경의 원본 누적 보존을 함께 구현한다. 공용 속성·AI 원자 편집·소유권 검사와 네이티브 전체 및 실제 DirectX 회귀, 최종 WebGPU·WebGL 전체 묶음이 통과했다. 공용 HLSL의 마지막 광자 구역과 재빌드한 DirectX120도 통과했고 설치 전환을 진행한다. 첫 혼합 GL 준비 비용29.5초는 개선 잔여로 남긴다. [상세](RENDERING_120.md). 이후 코스틱의 혼합·추가 셰이딩 광속, 월드 교차 기록 공유, 이차 필터 세부와 이 문서의 누적 분야별 작업을 유지한다. 현재 기획의 오래된 WebGL 전용·블루프린트 비실행 표현은 현행 구현에 맞춰 바로잡았다. 전체 선행 목표를 이 세 가지 기능으로 축소하지 않는다.

- 121·122: 광자 후보 선별·역확률 보정·금속 코팅/sheen/비등방성/박막 공유, 기하/UV/법선 typed 포장. 실제 D3D/GPU/GL·네이티브117/118/120/121·CPU16 묶음과8배치 byte parity 통과. 설치 묶음 갱신과 이전 Versions 정리. 기존 누적 원장/다음 월드 교차 정점 공유·곡면 필터 등 유지. [121](RENDERING_121.md)·[122](RENDERING_122.md).

- 123: 모션 이전 정점 typed 포장·쓰기 전 값/범위 검증·실패 원본 보존·성공 이력 Map 재사용·오브젝트 교체 pruning. CPU8·기존8배치 byte parity·최종 actualD3D119 모션/이차 렌즈·CPP 통과. 실행파일 재컴파일 없이 검증된 스크립트 묶음 설치 갱신/이전 사본 정리. 누적 전체 계획 유지. [123](RENDERING_123.md).

- 151–155: GL KHR 준비/취소/래스터 fallback·ready 캡처·필터 소스 중복 제거·공용 진단,3D bind XYZ 제약·기존 속성/Undo/AI·공용 CPP/BP2노드/lazy 자원. CPU11·실제GL rPDp4r/Editor XB0xsQ/Player gl7SZW/profiler Xt60CZ 통과. [기록](RENDERING_151.md). 가이드 총 링크·전체 프레임/폰·다른 엔진 분야와 corpus gate는 유지. 검증 뒤 설치 전환.

- 151–155 설치 완료: a596df89fc3cc306·명세2252 전체SHA/17제품/바로가기/프로필 대조, 이전 사본 약164MiB 정리·Versions1개. [설치](research/USER_INSTALL_151.json). 전체 엔진 목표를 완료 처리하지 않으며 다음 무거운 가이드 준비·이전 애니메이션 노멀/mip·렌더링/제작/플랫폼 누적 세부를 유지한다.

## 156–164 — 2026-10-16 — 현재 원장과 렌더링·오디오·2D 제작 묶음

과거 잔여/완료 근거를 단일78행 원장으로 대조하고 사람이 보는 문서와 AI 로컬/HTTP 조회를 통일했다. 등록 범위 검증39/부분28/미구현8/미검증3이며 전체 분석/엔진 완료율은 계산하지 않는다. GL 동시 제출·가이드 특화, 가중 스냅샷·전환/파라미터 곡선·미리듣기/Undo·SDK/BP/AI,2D 리타게팅·매핑 폼/AI·기존8 getter 핀 불일치를 함께 구현했다.

CPU12+10·실제 GL·Editor·D3D11 release/development Player가 통과했다. 실제2D 변형 픽셀13676, C++/BP 오디오/파라미터 전환·revision/Undo/Redo/보존을 확인했다. GL 일반 가이드3817→1203ms의 지정 순차 측정을 보존하지만 첫 path7888/시간필터7384ms는 남긴다. [구체적 계약](ENGINE_WORK_156.md)·[검증/실패](research/ENGINE_WORK_156.json). 설치 전환 결과는 USER_INSTALL_156.json에서 이어 기록한다.

설치 전환 완료: 16e137715970d7cd. 명세2270파일·23기능 제품·두 바이너리/생성API SHA,바로가기2개/.hbproject,실제 설치 EXE/독립 프로젝트 시작과 종료/서버 해제,사용자 프로필·원본 보존이 통과했다. 이전 설치171842046B 제거/Versions1,검사 캐시574396713B 정리. [설치 검증](research/USER_INSTALL_156.json). 기능 커밋 a1ebc24를 공개 main에 푸시했다.


## 165 — 2026-10-16

기준2d563b7의 잔여39행 중20행에 제작·실행 구현을 추가했다. 단순 명칭이나 새 계획을 완료로 계산하지 않는다. 메시/지형/폴리지/LOD/내비·프리팹/쿠킹/패치·2D 리타게팅/규칙·베이크/녹화·GAS/EQS·지역화/ListView/DSP/VFX·공용AI 경로. 범위/검사/남은 세부: docs/ENGINE_WORK_165.md, docs/research/ENGINE_WORK_165.json, docs/ENGINE_STATUS.md. 설치 전환은 USER_INSTALL_165.json에 후속 기록한다.

설치 확인: ef759067d9303b95, 2307파일 해시와 격리 설치본 실제 실행 통과. Versions1·프로필10385파일 보존. 이전 설치172041922B 정리. 구현 da8e6e9; 영수증 docs/research/USER_INSTALL_165.json.

## 166 — 165의 세부 제작·실행 확장 (2026-10-16)

메시 간선/용접/노멀/UV, 지형 holes/stamp, 폴리지 개별 편집, 가중 자동타일, 커브 구동/블렌딩/C++ getter, 컴포넌트 Take와 복원, 위젯 디자이너 지역화/스타일, 패치 저널/서명을 묶었다. 세부/실행/검사/남은 범위는 docs/ENGINE_WORK_166.md와 research/ENGINE_WORK_166.json. 기존 20행 중 9행 추가이며 상위 전체 완료로 승격하지 않았다. 설치/Versions1은 research/USER_INSTALL_166.json으로 기록한다.

## 167 — 누적 전체 원장 기준의 추가 구현 (2026-10-16)

사용자의 전체 조사 구현 요구를 작업 번호/일부 목표 완료로 축소하지 않는다. 추가 레벨/거리 셀·다중 인스턴스·참조/물리/스크립트/생성 액터 수명·C++/BP/AI, 2D 계층/외부 IK 목표 베이크, 평면 NavMesh 포털 경로, Take 설명 재사용/온라인 축약을 구현했다. 상세와 실제 검사는 docs/ENGINE_WORK_167.md, research/ENGINE_WORK_167.json. 전체 원장은 ENGINE_STATUS.json/md이며 다른 남은 부모/세부를 유지한다. 사용자 설치 결과는 research/USER_INSTALL_167.json으로 기록한다.

167 설치 확인: 27ca4525cebc9468, 2332파일 명세·격리 실제 실행·프로필10385파일 보존·Versions1. 구현 d1cf994, 배포 중단점 수정 d2bd3c1. research/USER_INSTALL_167.json. 전체 누적 목표 완료로 승격하지 않는다.

## 168 — 프리팹 상속·2D 청크·C++ 전송 (2026-10-16)

원본/변형/중첩의 배치 인스턴스 live 갱신·3방향/축별 병합·사람 Apply/Revert/충돌/원자 Undo·AI6명령·Play/타입 참조, 직교/등각 렌더/충돌 청크·변경 자원 재사용·숨김 무재생성, 불변 타일/UI의 C++ 전송 재사용을 연결했다. CPU12군·실제 C++/물리·Editor·D3D11 dev/release·WebGPU와 기존165/166/167·2D·전송/코어 회귀 통과. 16청크 중 한 칸 수정에 기하1개/충돌1개 재생성, 기하15개 유지. 전체 기능/PC120/폰 성능의 완료로 승격하지 않는다. 상세 ENGINE_WORK_168.md/research/ENGINE_WORK_168.json, 설치는 research/USER_INSTALL_168.json에 후속 기록한다.

168 설치 확인: 1f2d1495906edcbf·2343명세파일 SHA·격리 설치 EXE/사람 Apply/Revert/AI/C++/Play 복원 통과. 프로필10385파일 보존·Versions1·이전 설치200756532B 정리. 구현 f6654d2, 영수증 research/USER_INSTALL_168.json.


## 169 — 제작 전반의 추가 구현 (2026-10-16)

확장/대칭 자동타일과 먼 청크갱신, NavArea 비용/마스크/이동장애물, 다중 IK 목표UI/C++/BP/AI, 구성/골격/오디오Take 및 시퀀스 복원, 메시 bridge/inset, 명시 프리팹 수정의도, 믹서 사이드체인, DirectX실선과 동일 SDK캐시 백업 정리를 함께 연결했다. CPU23군·실제 C++·숨김 Editor/사람/AI/Undo/실제오디오·D3D11 dev/release·WebGPU 및 관련165–168회귀 통과. 전체 누적 목표를 이 번호로 축소하지 않는다. 세부 ENGINE_WORK_169.md/research/ENGINE_WORK_169.json; 설치는 USER_INSTALL_169.json에 기록한다.

169 설치 확인: 5e97fbc46c607b17·2356파일 SHA·격리 설치 EXE169와168 프리팹 회귀 통과·프로필10385파일 보존·Versions1. 기능4e36205, 설치 근거 research/USER_INSTALL_169.json.


## 170 — 구조·UV·IK·오디오·2D 비용의 연속 구현 (2026-10-16)

프리팹 자식 구조/전체 Apply와 변형 안정 컴포넌트, 전용 UV 캔버스/섬 조작, IK 루트·회전·뼈 설정, 실제/가상 음성 예산·우선순위·시계·C++/BP, 반복 타일 조회 인덱스를 함께 연결했다. 사람/AI 제작·Undo와 실제 Editor/D3D11 개발/배포/WebGPU에서 확인했다. Native 시작 실패 진단과 검사 도구의 오래된 계수/정리도 바로잡았다. 범위/잔여/검사는 ENGINE_WORK_170.md/research/ENGINE_WORK_170.json. 전체 누적 목표의 완료로 축소하지 않는다. 설치는 USER_INSTALL_170.json에 기록한다.


170 설치 확인: 4d2deed78317a98e·2367파일 실행 후 SHA·격리 설치 EXE/사람/AI/Undo/C++/실제 PCM 소스 전환 통과·프로필10385파일 보존·Versions1. 기능58fcb8a, 설치 근거 research/USER_INSTALL_170.json.


## 171 — 누적 잔여의 제작·실행 연결 (2026-10-16)

네트워크 호스트/클라이언트·소유권/상태/RPC/재접속과 C++BP6, 공개 상태 유지 C++ 재적용·worker 해제, TreeView/명시 가변 높이, 다른 모프 이름 매핑/베이크, 능력/효과 Cue, 추정 비용 스트리밍, 별도 충돌LOD, UV 경계 좌표, DirectX 샘플러, 파일↔폴더 패치/중단 복구를 연결했다. 범위·미완료 경계·실행 근거는 ENGINE_WORK_171.md/research/ENGINE_WORK_171.json. 네트워크 전체/전용 서버·UE 전체 분석의 완료로 승격하지 않는다. 설치는 USER_INSTALL_171.json에 별도 기록한다.


171 설치 확인: 77c55df75ff751bc·2382파일 실행 후 SHA·격리 설치 EXE/사람/AI/Undo/C++/실제 PCM 소스 전환 통과·프로필10385파일 보존·Versions1. 기능4d87d64, 설치 근거 research/USER_INSTALL_171.json.


172: 안정 ID 3방향 병합·충돌 선택·Undo/AI, 프로젝트 Git 변경/diff/stage/commit·로컬 작성자·부모 저장소 보호. CPU13군/Win32 사람·AI 검증. ENGINE_WORK_172.md와 research/ENGINE_WORK_172.json. 설치는 다음 누적 구현과 함께 전환.


173: 복제 프리팹 생성/삭제·자식/호스트 풀·정적 삭제 표식·동적 바이트 회수·연결별 거리/소유자·late join/reconnect. CPU6군/기존18회귀·실제 D3D 출시/WebGPU 게임에서 호스트/클라이언트+C++ Spawn/Destroy. ENGINE_WORK_173.md/research/ENGINE_WORK_173.json. 다음 UI와 최종 설치 전환.


174: 재사용 Widget 참조/중첩 속성·이벤트·변수·사람 입력/Undo·SDK 경로, 오브젝트 투영 UI·크기/기준점/거리, UI Budget·async수명. CPU9군/실제 Win32 제작·D3D 출시/WebGPU 게임+172/173 회귀. ENGINE_WORK_174.md/research/ENGINE_WORK_174.json. 누적 잔여 유지, 최종 설치는 USER_INSTALL_174.json에 별도 기록.


172–174 설치 확인: 15669948df76f42e·명세2406파일 실행 후 SHA 일치·격리 설치 EXE의 병합/Git/사람 위젯 속성/Undo·오류0/종료0. 사용자 프로필10385파일 전후 SHA 일치. 바로가기/.hbproject 연결 확인, 이전 설치201448875바이트 정리, Versions1. 설치 근거 docs/research/USER_INSTALL_174.json.


175–176: 독립 관절 프레임/영점/힘제한과 RaycastVehicle 실제 제작·휠편집/Undo·물리/조종·렌더·C++/BP를 구현하고 묶음 검사했다. ENGINE_WORK_175/176 및 대응 JSON 근거. 설치 영수증 별도. 누적잔여 단일 원장의 PHY-02를 세분화했다.


175–176 설치 확인: a2c8c587c0dfb8ef·명세2426파일 실행 후 SHA 일치·격리 설치 EXE의 병합/Git/사람 위젯 속성/Undo·오류0/종료0. 사용자 프로필10385파일 전후 SHA 일치. 바로가기/.hbproject 연결 확인, 이전 설치173280443바이트 정리, Versions1. 설치 근거 docs/research/USER_INSTALL_176.json.


177: 목록/트리 자동내용높이·부분누적합·표시행풀·너비/글꼴/1.5배·키보드/비활성·C++자료교체선택·종료수명을 제작/실행에 연결했다. ENGINE_WORK_177.md/JSON 근거. 누적 잔여는 정본 원장을 유지한다.


177 설치 확인: 6ecfb60380268ecd·명세2434파일 실행 후 SHA 일치·격리 설치 EXE의 병합/Git/사람 위젯 속성/Undo·오류0/종료0. 사용자 프로필10385파일 전후 SHA 일치. 바로가기/.hbproject 연결 확인, 이전 설치173530766바이트 정리, Versions1. 설치 근거 docs/research/USER_INSTALL_177.json.


178: 모델 가져오기 전용 제작/미리보기·단위/축·FBX/중복이름 안정대응·미연결 수동연결/Undo·설정/원본 이름변경·일반 저장충돌·패키징·glTF C++ 루트모션을 연결했다. ENGINE_WORK_178.md/JSON에 실제 실행/경계와 조사한 본문 범위를 구별했다.


178 설치 확인: f93e39b28c8c3c3e·명세2449파일 실행 후 SHA 일치·격리 설치 EXE의 모델 단위/축·FBX·사람 설정·재가져오기/미연결 대응·Undo·오류0/종료0. 사용자 프로필10385파일 전후 SHA 일치. 바로가기/.hbproject 연결 확인, 이전 설치173638771바이트 정리, Versions1. 설치 근거 docs/research/USER_INSTALL_178.json.


179: RuntimeLOD의2D XY/2.5D XZ/3D 거리·히스테리시스·포즈 표시 간격/논리 시간 분리·공용 C++/문서/Undo, 명시 WorldCollision LOD 전환·취소/정리·32MiB 추정 캐시·AI 진단을 실제 제작/게임에 연결했다. ENGINE_WORK_179.md/JSON 근거와 남은 계산/골격/다중카메라 범위를 구별한다.


179 설치 확인: f95666ae3ee3a41f·명세2458파일 실행 후 SHA 일치·격리 설치 EXE의 실행 LOD 포즈 Hz·충돌 선택·사람 편집/Undo·오류0/종료0. 사용자 프로필10385파일 전후 SHA 일치. 바로가기/.hbproject 연결 확인, 이전 설치173816469바이트 정리, Versions1. 설치 근거 docs/research/USER_INSTALL_179.json.


180: C++ 질의 월드/형상을 gameSession 단위로 공유하고 승인·동시 스냅샷·직접 좌표 변경·reset/마지막 모듈/페이지 종료·유휴1개 보관을 검증했다. Windows/모바일/웹 배포의 공식 최소화 Three 파일을 공용 수집해 모바일 표본15.15→12.55MB, 라이브러리2592217바이트 절감. ENGINE_WORK_180.md/JSON 근거. 전체 FPS·실물 휴대폰과 장시간 메모리 결과로 확대하지 않는다.


180 설치 확인: 0553dc1c96d71485·명세2467파일 실행 후 SHA 일치·격리 설치 EXE의 실행 LOD 포즈 Hz·충돌 선택·사람 편집/Undo·오류0/종료0. 사용자 프로필10385파일 전후 SHA 일치. 바로가기/.hbproject 연결 확인, 이전 설치173934665바이트 정리, Versions1. 설치 근거 docs/research/USER_INSTALL_180.json.


181: NamedSlot 단일 자식·기본/교체/비움·중첩 이름공간·원본 불변/순환·예산 검사·Designer 선택/Undo·기존 C++/BP 이벤트·외부 Source 에셋 수집/이름 변경·AI schema sourceOnly 복구 — ENGINE_WORK_181.md/JSON 근거.
182: 서로 다른 정점 수의 두 폐곡선/열린 경로 연결·선형 길이 대응/시작 오프셋·평면 영역 인셋/구멍·오목 경계/UV색 보간·재삼각화·실패 선택 보존·AI dryRun/revision/Undo·실제 렌더/충돌 C++ — ENGINE_WORK_182.md/JSON 근거.
183: 위젯/메시 전용22명령 재지정·작업창/입력/IME/실행/비행 격리·기존 키 우회 차단·사용자 프로필 기본값 충돌 이행·우클릭 현재 키 표시·AI get/set revision — ENGINE_WORK_183.md/JSON 근거.


183 설치 확인: 3bffac6f21389589·명세2490파일 실행 후 SHA 일치·격리 설치 EXE의 실행 LOD 포즈 Hz·충돌 선택·사람 편집/Undo·오류0/종료0. 사용자 프로필10385파일 전후 SHA 일치. 바로가기/.hbproject 연결 확인, 이전 설치174065839바이트 정리, Versions1. 설치 근거 docs/research/USER_INSTALL_183.json.


184: 중첩 자식 구조 Apply·바깥 additions/removed·상속 확장 중복/앵커 교체·기본 컴포넌트 정규화·최종 빌드 검증을 실제 Inspector/원자 UndoRedo/C++ 게임에 연결. ENGINE_WORK_184.md/JSON 근거.


184 설치 확인: 7b716ddfe6174204·명세2497파일 실행 후 SHA 일치·격리 설치 EXE의 중첩 프리팹 적용·원본/장면 UndoRedo·키/슬롯/메시/LOD·오류0/종료0. 사용자 프로필10385파일 전후 SHA 일치. 바로가기/.hbproject 연결 확인, 이전 설치174323655바이트 정리, Versions1. 설치 근거 docs/research/USER_INSTALL_184.json.


185: Scene::GetInstanceActor/GetInstanceActors/GetInstanceLocalId 공용 C++·BP3개, 안정 로컬 ID와 inactive/삭제/인스턴스 격리·같은 함수 Spawn 직후/후속 호출·모바일 공용 AOT 검증. 서비스 분류/한글 핀 및 종료 뒤 늦은 C++ 응답 정리. ENGINE_WORK_185.md/JSON 근거.


185 설치 확인: 4c2fe681686c5505·명세2506파일 실행 후 SHA 일치·격리 설치 EXE의 새 공용 조회 노드 표시/Undo·중첩 프리팹 UndoRedo·키/슬롯/메시/LOD·오류0/종료0. 사용자 프로필10385파일 전후 SHA 일치. 바로가기/.hbproject 연결 확인, 이전 설치174446335바이트 정리, Versions1. 설치 근거 docs/research/USER_INSTALL_185.json.


186: 프리팹 격리 제작창·2D/3D/기즈모·계층/컴포넌트·복사/그룹/원본 탐색·AI 동일 제작 명령·CAS/dryRun/Undo·중첩 부모 구조와 implicit 안정 ID를 실제 제작/DirectX/WebGPU/C++ 실행까지 연결. 상세 ENGINE_WORK_186.md/JSON.


186 설치 확인: 0d173fc14c7b696a·명세2517파일 실행 후 SHA 일치·격리 설치 EXE의 프리팹 격리 제작/컴포넌트/2D/복사/Undo/원본 탐색·충돌 거부·키/슬롯/메시/LOD·오류0/종료0. 사용자 프로필10385파일 전후 SHA 일치. 바로가기/.hbproject 연결 확인, 이전 설치174602775바이트 정리, Versions1. 설치 근거 docs/research/USER_INSTALL_186.json.


187: 불투명 시간 노멀맵의 이전 절대 시간·GPU 표본/TBN 복원·실패/되감기 무효화·실제 DirectX/WebGL/WebGPU 픽셀 및 패키징 게임 검사. 기존 GPU 버퍼/프로그램 재사용. 상세 ENGINE_WORK_187.md/JSON. 이전 mip·월드/시점·투명 이전 분기는 현재 원장에 유지.


188: 9개 전용 제작 문맥 조작56개/총111 공용 단축키·프로필/AI·고정 키 우회 방지·실제 분리 창 입력/버튼·몽타주 focus와 late clipboard 소유권. 실제 제작/Undo/저장까지 검사, ENGINE_WORK_188.md/JSON.


189: 비시간 노멀 그래프의 이전 Time 계산 특화. WebGPU 소스144B 호출 제거, 실제 GL 전체 링크 두 순서·D3D 컴파일/장시간 Time·3백엔드 픽셀/새 DirectX 게임 검증. 같은 프로그램/버퍼/가이드 수 유지. Complex141 초기 지연과 전체 FPS를 별도 잔여로 유지. ENGINE_WORK_189.md/JSON.


187–189 설치 확인: 44a236f286ae030e·명세2538파일 실행 후 SHA 일치·설치 EXE 제작 조작/키 반복/입력·IME/Undo/분리 HWND/사용자 키와 독립 버튼·설정 복원 및 장시간 GL/GPU 시간 노멀 픽셀 PASS·오류0/종료0. 사용자 프로필10385파일 SHA 불변·바로가기2/.hbproject 연결·이전 설치174512983바이트 정리·Versions1. 근거 docs/research/USER_INSTALL_189.json.


190: 정적 UV 재질의 미연결 Time/Panner 때문에 기하를 다시 준비하던 비용 제거. 기존 캐시/실제 opcode로 연결 변경·마스크/물리 Time·월드/시점 보수성 유지. CPU5/기존7·실제 D3D/GPU 게임 및 전송/BVH 재사용. PC120/모바일60 전체 검증과 구별. ENGINE_WORK_190.md/JSON. 다음 기능과 묶음 설치 예정.


191: ORCA 로컬 회피 자체 수식/LP·2D/3D/층/이웃·공용 SDK/BP·Inspector/Undo·두 실제 게임 및 바이트/성능 표본. ENGINE_WORK_191.md/JSON.190과 묶음 설치 예정.


192: 실제 게임 믹스 PCM16 WAV·믹서 UI/게임 신호·AI 동일 녹음/저장·제한/수명/재시도·저장 에셋 재생·공용 worklet 배포 closure. ENGINE_WORK_192.md/JSON.190–192 설치 후 시간/예산 입력 포함 최종 확인 예정.


193: 이전 설치 런타임을 사용하는 외부 Android 빌드 발견→중단 없이192 새 사본만 정리/Versions1 복원. 이후 설치 전·복사 후 사용 검사와 명시 보류를 구현. 실제 자식 프로세스/복사 중 시작/정상 교체·기존 보존 회귀 통과. ENGINE_WORK_193.md/JSON.


190–193 설치 확인: 3a617ac1aed4378f·명세2560파일 실행 후 SHA 일치·실제 설치 EXE에서 ORCA 속성/Undo/저장·BP 표시, 믹스 녹음 시간12초/PCM1MiB 설정과 녹음 중 잠금·게임 레벨·WAV 스펙트럼/제한/일시정지/재시도/종료 저장/재생, GL/GPU 장시간 노멀 픽셀 PASS·오류0/종료0. 사용자 프로필10385파일 SHA 불변·바로가기2/.hbproject 연결·이전 설치439132589바이트 정리·Versions1. USER_INSTALL_193.json.


194: 표면 필드별 광선 프로그램 특화·기존 키/버퍼·3백엔드 픽셀/실제 D3D 게임·GL 두 순서 비교.195: 로컬 뼈/스프라이트 포즈 계산 생략과 시간/Notify 보존·속성/Undo·C++/실제 D3D/GPU.196: 비파괴 텍스처 채널/픽셀/면·슬라이스·줌/이동과 AI 공용 보기. 상세 ENGINE_WORK_194/195/196 및 JSON. 누적 잔여 유지·묶음 설치 예정.

194–196 설치 전환은 기존3a617ac1aed4378f의 사용자 Node/worker 사용을 감지해 보류했다. 배포2577파일/ba28555779515694a6896881f5c0973969f4b52197e95af7a8b25243d6076c2a 준비, Versions1/프로세스 보존. 설치 완료로 기록하지 않는다. UPDATE_196_PENDING.json.

197: 포즈 주기 안정ID 분산·선택형 한 주기 지연 보간·포즈 예산/해제. CPU5군/기존179·195 회귀 통과. 사용자193 런타임 사용 중이므로 무거운 실제 창/패키징/GPU 검사는 대기. ENGINE_WORK_197.md/JSON.196 배포 준비본은 유지·사용자 설치 전환 미실시.

198: 검사 Engine의 동일 Node 사본 정리·복원 명세·실행/변경/소스 보호·실제 자식 프로세스와 PowerShell 검증. 사용자 작업 중이므로 과거 전체 해시/정리와197 실제 실행·196 설치 전환은 대기.

199: NavMesh 투영 기존 기하 BVH/질의 작업 공간 재사용·동률/거리/필터·재진입 보존·읽기 전용 runtime.navigation. CPU6군/기존16711+16923 통과. 실제 창/C++브리지/패키징은 사용자 실행 중이므로 대기·도구/800삼각형 표본 준비.

197/199 실행 대기 해소: 사용자 구버전 런타임 종료 확인 뒤 격리 기본 표본(플레이어30FPS)으로 보간/분산 사람 편집·Undo·C++ 전환·D3D/GPU 픽셀과800삼각형4에이전트·실제 runtime.navigation을 검증했다. 최신 배포/설치 전환을 이어간다. 전체 스트레스·누적 목표 완료로 승격하지 않는다.

198 전역 정리: 동일 Node 검사 사본41개/논리3759470728B 제거, C: 관찰 약3.75GB 증가, 실패0/원본·재현 프로젝트·근거 보존. 최신 설치 전환을 이어간다.


194–199 설치 확인: d8258c4376678b5b·명세2589파일 실행 후 SHA 일치·실제 설치 EXE의 텍스처 채널/픽셀/면·슬라이스·줌/이동·원본 불변, 포즈 계산/보간/분산 사람 편집/Undo/저장, NavMesh800삼각형과 C++/runtime.navigation·오류0/종료0. 사용자 프로필10385파일 SHA 불변·링크2/.hbproject·이전 설치/생성 캐시251725633B 정리·Versions1. 근거 USER_INSTALL_199.json.

200–205: 대용량 공용 빌드/해시/게시·실제1.17GB 네 대상, 미디어 구간3서버78경우, 임시 스트림/131개·112MiB 실제 가져오기, 잠금 프리팹 문맥/격리 환경·Undo/저장/실행, 콘텐츠1만 가상 목록/키/AI 페이지, 종료 검사 Chrome 프로필 정리를 연결했다. ENGINE_WORK_200–205.md/JSON. 묶음 실행 근거를 보존했고 사용자 설치 전환을 이어간다.


200–205 설치 확인: 1fadf9f7d5c394c8·명세2614파일 실행 후 SHA 동일·실제 설치 EXE 프리팹 문맥/환경/잠금/Undo/저장/동기화/Play·131파일/112MiB UI·1만 콘텐츠17/13/50카드와 Alt뒤로·문자 탐색·재생성후1만선택, 오류0/종료0. User10385파일 SHA불변·링크2/.hbproject·이전 설치184807680B 정리·Versions1. USER_INSTALL_205.json.


## 206–209 — 2026-10-17

중첩 Apply 원본/구조/참조 CAS·파일 묶음 Undo, 문맥 gray/인스턴스 수정 투영/격자·표면·정점 스냅, 저장 전 동기화 장벽, 골격 모델 변경/제거 Take·구간 축약/현재시각 바인딩/Seek/복원을 구현했다. 실제 편집기와 WebGL·DirectX11 게임 EXE 및 기존169 CPU23군/기본·파일묶음 회귀를 검사했다. 원장 AST-04/ANM-06/AI-03/PRJ-03의 구체 구현/잔여를 대조 갱신했다. 다른 누적 잔여와 전체 분석 gate는 유지한다. 설치 전환/Versions1·사용자 원본 확인은 USER_INSTALL_209.json에 후속 기록한다.


206–209 설치 확인: e1016dd208e2307b·명세2637파일 실행 후SHA동일·실제 설치 EXE로 중첩 Apply/구조/원자UndoRedo·gray/수정투영/표면정점스냅·저장종료·모델골격교체 Take/Seek/복원/제작창 통과, 예외/콘솔오류0·종료0. User10385파일 SHA불변·링크2/.hbproject·이전설치175243449B 정리·Versions1. USER_INSTALL_209.json.


## 210–211 — 2026-10-17

선택 시각 포즈의 관측 ms 예산/최소Hz/보호 work·다중 카메라 구 경계·재사용/위상·C++/BP4함수와 Inspector 진단, 생성·삭제/풀 재사용 Take·2D/3D 시각 템플릿/계층·독립 ID·Seek/Stop/VM종료·BP 컴포넌트 미리보기/비동기 초기화 경합·AI 미리보기 조회를 구현했다. 실제 창/공용 C++와 Windows D3D11 게임, CPU/기존16923군/기본검사 근거는 ENGINE_WORK_210/211.json이다. 전역 상태/분석 gate는 유지하고 세부 구현/잔여를 대조 갱신했다. 설치는 USER_INSTALL_211.json에 후속 기록한다.


210–211 설치 확인: 757399520cda70d2·명세2654파일 실행 후 SHA동일·SDK 헤더 포함·설치 EXE의 예산 Inspector/Undo/C++와 생성 Take 설정/적용/Undo·독립 제작 미리보기/조회·CPP 재생/Seek/Stop 통과. 예외/콘솔오류0·종료0, 캡처3 직접 시각검토. User10385파일 SHA불변·링크2/.hbproject·이전설치175366600B 제거·Versions1. USER_INSTALL_211.json.


## 212–213 — 2026-10-17

C++ 공개 쓰기 속성·BP 변수/배열 Take, 타입/배열 길이/null/키 deep-copy/다중 값 사전검증/읽기전용·선언 변경 거부·실제 worker/BP Map·Seek/Stop 복원을 제작 UI/배열 키 편집/독립 미리보기/runtime.values에 연결했다. 실제 녹화본을 DirectX11 게임으로 패키징해 C++ scalar/배열 getter와 BP 값/복원을 대조했다. 선택 Inspector는4Hz leaf 반영과 구조 변경 시에만 재생성하며 실행 중 AI 선택·원본 불변·참조 핸들의 아웃라이너 분리를 추가했다. 근거/범위는 ENGINE_WORK_212/213.json, 설치는 USER_INSTALL_213.json에 후속 기록한다. 전체 잔여/분석 gate는 유지한다.


212–213 설치 확인: 85700fd5ac4494a6·명세2666파일 실행 후SHA동일·설치 EXE에서 typed C++/BP Take/배열 키/Undo·독립 preview·실제 C++ getter/Seek/복원·실행Inspector 값/새컴포넌트·가상핸들 제외·210 예산/C++ 현재값 회귀 통과. 예외/콘솔오류0·종료0·캡처3 직접 시각확인. User10385파일 SHA불변·링크2/.hbproject·이전설치194200685B 제거·Versions1. USER_INSTALL_213.json.


## 214–217 — 2026-10-17

프리팹 추가 전용 자식/다른 프리팹의 실제 문맥·읽기전용/2D3D/AI조회, 생성 Take의 반경/기준/평면/종류/클래스/컴포넌트 필터와 수명, 수동 C++/BP typed 변수·배열 트랙의 제작 UI/AI/Undo/preview/실제 D3D getter, 선택 EQS 단계 진단/실패 이유/점수·뷰포트/페이지·C++ 실행과 불필요한 전체 월드 복사 제거를 연결했다. 근거/범위는 ENGINE_WORK_214–217.json이며 전체 잔여와 분석 gate는 유지한다. 설치 후 User/Versions1/파일명세와 실제 설치창 근거를 USER_INSTALL_217.json에 기록한다.


214–217 설치 확인: 06ccb1d58c0eca3d·명세2689파일 실행후SHA동일·설치EXE 프리팹 추가/잠금/2D3D·생성 필터/실제 C++/Take·수동 변수트랙/검색focus/배열 키/Undo/CPP getter·EQS 단계진단/실제화면/겹침라벨/API페이지/종료 통과. 예외·콘솔오류0/종료0·캡처4 시각확인. User10385파일SHA불변·링크2/.hbproject·Versions1·이전설치194264932B 제거. USER_INSTALL_217.json. 작은 작업창에서 Take 설정 팝업이 잘리는 UI 문제는218에서 후속 수정한다.


## 218–220 — 2026-10-17

속성·시작 능력 세트 에셋/표/컴포넌트·원자 초기화·참조/풀 정리·실제 C++BP/게임, 실행 속성/능력/효과 Inspector·AI페이지와 작은pane Take 설정, XY2D EQS 생성/점수/Physics2D벽·구형 에셋UI/Undo·별도 D3D 게임을 연결했다. 근거와 명시 잔여는 ENGINE_WORK_218–220.json이다. 새 SDK ABI나 전체 엔진/연구 gate의 완료로 표현하지 않는다. 설치는 USER_INSTALL_220.json에 후속 기록한다.


218–220 설치 확인: 5c0ee1f531a80284·명세2707파일 실행후SHA동일·설치 EXE 속성/능력 세트 표/Undo·실제 CPP/BP 비용/효과·동적 Shield/수명 Inspector/AI 페이지·작은pane Take 마지막필터/가로바없음·구형 XY선택/Undo/실제2D벽·수동변수/검색focus/배열/CPP 복원 회귀 통과. 오류0/종료0·캡처3 시각확인. User10385파일SHA불변·링크2/.hbproject·Versions1·이전설치195784617B 제거. USER_INSTALL_220.json.


## 221–222 — 2026-10-17

능력 시스템에서 실제 값이 바뀌지 않는 프레임의 속성 집계/태그 생성을 재사용하고, 주기 효과 마지막 틱 누락을 epoch+정수카운터/시계 보상/경계 허용으로 수정했다. CPU 교대 표본의 계산 호출51000→0과 원본/실행 값 일치,0/1008/1e9초 및 실제 편집기/C++/별도D3D 게임을 검사했다. 근거/정밀도·성능 범위는 ENGINE_WORK_221/222.json이다. 설치는 USER_INSTALL_222.json에 후속 기록한다.


221–222 설치 확인: be51b1db8dde157a·명세2718파일 실행후SHA동일·passive속성/태그 집계 재사용·실제CPP/BP 주기3틱/Health147/Stat108·현재Inspector/AI·218속성세트/Undo/비용/효과/작은Take팝업 회귀 통과. 오류0/종료0·캡처3시각확인. User10385파일SHA불변·링크2/.hbproject·Versions1·이전설치194263160B 제거. USER_INSTALL_222.json.


223–224: 독립 UV1·xatlas Worker 자동 곡면 차트·겹침/퇴화 검사·사람/AI/Undo/저장·선택 Native UV 스트림·픽셀 출력 통과. 광선 베이크·재료/런타임 수신·패키징은 다음225로 이어 진행. 전체 베이크 완료로 표현하지 않음.


225–228: 독립 UV1 간접광 BVH 베이크·공유 Half/gzip 페이지·HDRI/하늘빛 반사·재료 sampler/trilinear·DirectX Half 전송·사람/AI 원자 저장과 Undo·세 렌더러 독립 게임 수신/이동 무효화/복원·바이너리 원본 SHA 가드 구현. CPU13군·DX픽셀·D3D/GL/GPU 게임 오류0/종료0·별도 에디터 API/Undo/가드 통과. 설치 검증 진행 전이며 전체 엔진 완료를 뜻하지 않는다.


223–228 설치 확인: b632ce56672d0c14·명세2764파일 실행후SHA동일·설치본 자체 빌더의 D3D/WebGL/WebGPU 세 게임·UV1 저작/베이크/선형 Half 미리보기·원자 Undo/Redo·AI dryRun/원본SHA가드 통과. 오류0/종료0·캡처3시각확인. User10385파일SHA불변·링크2/.hbproject·Versions1·이전설치192727227B 제거. USER_INSTALL_228.json.


229–231: XY 삼각 NavMesh·평면별 경로/영역/장애물/EQS/단순회피·정점 seam 인접성 복구·지연 항법 표시와 P/AI 진단 구현. CPU7+4+4군·인간 bake/Undo/AI/P/EQS 창·CPP/BP 네 에이전트 D3D2D/WebGPU3D 통과. 임의 표면/동적 carving 등 잔여는 정본 유지. 설치 준비 중.


229–231 설치 확인: 6c37aa3d3466f4a5·명세2777파일 실행후SHA동일·사람 XY NavMesh bake/Undo·AI dryRun·P 지연 항법 표시/off해제·원자 에셋 영역색 변경/Undo 실시간 반영·XY NavMesh EQS 투영/화면표시·기존225 UV1/라이트맵/원자Undo/API가드 회귀 통과. 오류0/종료0·캡처2시각확인. User10385파일SHA불변·링크2/.hbproject·Versions1·이전설치176162580B 제거. USER_INSTALL_231.json.


232–235: 능력 세트 합성/상속·출처/재정의·참조 SHA 원자 저장/패키징, 종속 속성 DAG/실수 커브, 라이브 C++/BP/Inspector/AI 재적용, 큰 목록 제작/실행 페이지를 실제 편집기와 독립 D3D 게임에 연결했다. 정의/한계/근거는 ENGINE_WORK_232–235 및 ABILITY_WORKFLOW.md. 설치 검증 전이며 누적 목표 전체 완료가 아니다.


232–235 사용자 설치 b1c44f99c245d540 갱신·명세2802파일 실행후SHA동일·사람 커브 계산/읽기폭/상속 출처/재정의 Undo·C++/BP 세대 완료 재적용·AI/Inspector 재적용·1000속성/100태그·독립 D3D 패키지 오류0/exit0. User10385파일SHA불변·링크2/.hbproject·Versions1·이전설치176217655B 제거. USER_INSTALL_235.json.


236–238: 차량 동력계/자동수동변속·토크배분·제동 단위, 3D6축 관절/모터·공용 CPP/BP5와 사람 표/Undo·AI페이지, 런타임 숫자 배열셀 표시를 묶어 연결했다. 소스 실제 제작/CPP/BP/D3D/기존2D3D 회귀통과·설치확인예정. ENGINE_WORK_236–238과 PHY-02 최신 잔여를 우선한다.


236–238 사용자 설치 694d1f835c31d539 갱신·명세2821파일 실행후SHA동일. 차량 토크/기어 표·BP 컴포넌트 Undo·CPP/BP 변속과 RPM·독립 D3D 게임·6축 관절 모터 및 편집/AI 통과, 오류0/exit0. User10385파일 SHA불변·링크2/.hbproject·Versions1·이전설치202826405B 제거. USER_INSTALL_238.json.


239–242: 천/2D로프 제작·핀/물성/강체/충돌/재사용·공용SDK10/BP/AI/Inspector, DirectX 동적 정점전송/ring3/그림자cache, Android SDK경로/arm64서명APK를 연결·검사했다. 최신 단일 목록 ENGINE_STATUS.json의 PHY-02/RND-02/BLD-02/AI-03 및 ENGINE_WORK_239–242를 우선한다. 사용자 설치 검증은 후속 기록한다.


239–242 사용자 설치 ea1799af84bb0d85 갱신·2846파일 실행후SHA동일. 천/2D로프 Scene/BP/keyboard/Undo/라이브 제어·CPP/BP/AI·독립 D3D/WebGL 4게임 오류0/exit0. 동적 정점 ring3와 SDK10·Android arm64 서명 APK 검증. User10385파일 SHA불변·링크2/.hbproject·Versions1·이전설치204201887B 제거·배포 폐기 cloth-physics.js 제거. USER_INSTALL_242.json.


243–248: 효과 레벨/커브·공유 캡처와 원자 참조 저장, 천/2D로프 요청 입자 CPP/BP 조회, 부모연결 Take/Seek/복원·수명 보호/키 샘플 비용, 리타게팅/오디오 제작 키, 새SDK ARM64 APK를 연결·검사. 최신 목록 ENGINE_STATUS.json; 설치 검증은 후속 기록.


243–248 사용자 설치 e586f23febe4b3d5·2879명세 파일 실행후SHA동일·실제 숨김 editor4/독립D3D·GL게임6 오류0/exit0·효과/입자/부모Take/단축키 제작·CPP/BP/AI/Undo. User10385파일 SHA불변·링크2/.hbproject·Versions1·이전설치212367284B 제거. USER_INSTALL_248.json.


249–252: quaternion 회전 제작/실행·즉시 시퀀스 탐색/끝 포즈·독립 오디오 음성과 디코드/소유자 수명·늦은 Play 요청 무효화를 추가. 실제 CPP/독립 D3DGL/기존 Take·오디오 회귀 근거 ENGINE_WORK_249–252. 다음 설치에서 최종50ms 음성 Seek/최신소스를 묶어 확인한다.


249–252 사용자 설치 57aa766cccf7afc5·2893명세 파일 실행후SHA동일·실제 숨김 editor1/독립D3D·GL게임2 오류0/exit0·쿼터니언 제작/Undo·즉시Seek·독립 오디오3/지연 로드·50ms 탐색·소유 핸들 정지. User10385파일 SHA불변·링크2/.hbproject·Versions1·이전설치232785813B 제거. USER_INSTALL_252.json.


253–260: 렌더 SSA/시간 재컴파일 비용·CPU-only 매질 캐시, 효과 source/target capture/SetByCaller와 제작/실행 상세·CPP/BP, runtime named slot 교체/조작 수명, streaming 가상음성 해제/복구, Android 새 SDK 빌드를 연결. 정본 ENGINE_STATUS와 ENGINE_WORK_253–260의 범위/근거를 함께 갱신. 설치/최신 통합 검사는 후속 USER_INSTALL_260에 기록한다.


253–260 사용자 설치 7da0d214773220b7·2927명세 파일 실행후SHA동일·숨김editor4/독립D3D·GL게임2 오류0/exit0. source/target·인자CPP/BP/수동/AI·열린상세외부값갱신·CPP/BP 슬롯·Source streaming 해제/복구·커서/스크롤/release/애니메이션·GL/GPU픽셀/준비 통과. User10385 SHA불변·링크2/.hbproject·Versions1·이전설치195144609B 제거. USER_INSTALL_260.json.


### 2026-10-17 · 261–267

C++ 공용 물리7질의에 현재 천/로프 표면·권한/TOI합성, 명시적 C++ 생명주기10종·생성Start/선택Tick·재적용가드, CPP/BP 액터Tick4함수·float32경계보정, mobileBackend AOT 실제 실행과 최신 arm64APK를 연결했어요. 실제 에디터와 D3D/GL 독립게임, CPU기준/회귀를 확인했어요. 설치전환은 다음 통합 검증 뒤 기록해요. 전체 남은 범위는 최신 ENGINE_STATUS.json의 remaining을 유지해요.


261–267 사용자 설치 dcab5bc06a6db1c9·2958명세파일 실행후SHA동일·숨김editor2/독립D3D·GL게임4 오류0/exit0. 변형체7질의/CPP·BP·자동수명주기/센서진입이탈/배치위치·액터별Tick·동적간격·생성선택UI 확인. User10385 SHA불변·링크2/.hbproject·Versions1·이전설치196694054B 제거. USER_INSTALL_267.json.


### 2026-10-17 · 268–273

다중 시퀀스의 값 소유권·baseline/하위 인계·재진입/대상/binding 수명, BP/C++/컴포넌트 필드, 접근자 lazy 구성, 종료 유지/복원/강제 UI, 에셋/실행 우선순위 SDK2함수를 연결했어요. 실제 에디터·D3D/GL CPP/BP, CPU 기준/회귀와 최신 arm64APK를 검증했어요. 설치 전환은 다음 기록으로 남겨요. 새 공식 읽기에서 Shot/Sub-Sequence/가중 혼합 등도 잔여로 등록했으며 전체 조사 완료로 처리하지 않았어요.


### 2026-10-17 · 274–281

알파 광선 출력 절삭/필드별 호출, 큐브맵 LOD의 세 광선 경로, 2D 타일 비동기 수명/렌더 도중 편집 보존·불변 검증 재사용, AI용 타일 셀/페이지, 선택 원본색, 최신 Android 모듈 본문 검증을 연결했어요. 실제 CPP/BP·편집기·D3D/GL 게임·GL/GPU/HLSL 픽셀과 관련 회귀를 확인했어요. 새 공식 texture/LOD 본문과 관찰 잔여도 정본에 등록했어요. 설치/실제 WebGPU 원본색 확인은 후속 USER_INSTALL_281 기록으로 남겨요. 전체 잔여의 기준은 ENGINE_STATUS.json이에요.


### 2026-10-17 · 282–283

281 설치 smoke의 GPU RGB111/196/137 실패를 그대로 기록했어요. WebGPU 출력 원인을 고쳐 혼합 재질/알파/깊이/배경/사용자 fragment/컴파일·HDR 보존과 CPP/BP 독립게임을 검증했어요. 기대79/186/117을 유지하고 extra attachment는 사용 후 해제해요. 생성 라이선스 중복은 정확 SHA로만 제거해 수정 파일 보호를 확인했어요. 설치 결과는 USER_INSTALL_283에 기록해요. 누적 잔여와 조사 gate는 계속 ENGINE_STATUS.json이 기준이에요.


282–283 사용자 설치343086b6709d4d5a:3026명세파일 실행 후SHA동일·숨김 GL/GPU 캔버스·editor/독립WebGPU게임 CPP/BP·원본RGB·알파/깊이·HDR 보존 검사 종료0/오류0. User10385 SHA불변·링크2/.hbproject·Versions1. 이전281 설치492817087바이트 제거·사용자 수정본/프로필 보존. 기존271/272·알파/큐브/노멀 검사는 네이티브EXE와 관련 소유 코드가 두 설치 커밋에서 동일함을 확인해 재사용했으며283 재실행으로 표기하지 않았어요. USER_INSTALL_283.json.


### 2026-10-17 · 284–293

이전 노멀 Time 특화·CPU 매질 시간 의존성/부분 평가·렌더러 소유 불변 키·AI 준비 시간 진단·SDK 간접/생성/JSON 헤더 캐시 무효화·부분 Node 복사 안전 정리를 연결했어요. 실제 GL/GPU/HLSL 노멀/실시간 파라미터·매질·사용자 C++ GCC와 arm64 APK 원문을 확인했어요. 샘플러 인수분해/불투명 cutout/leaf-loop 실험은 개선 근거가 없어 제품에서 전부 되돌렸고 Complex141 첫 지연은 잔여로 유지해요. 전역 캐시 정리는 다른 빌드 때문에 보류했어요. 설치 결과는 USER_INSTALL_293.json 후속 기록으로 남겨요. 세부 근거는 ENGINE_WORK_284–293과 정본 ENGINE_STATUS.json이에요.


### 2026-10-17 · 294

주인님 설치본의 활성 에디터/CPP 프로세스를 확인해293 전환은 자동 보류했어요. 백그라운드에서 일반 파일/에셋 인덱스의 고유 wx·flush 교체를 보완하고 ENOSPC/EPERM·실제 소유 Node 중단/재열기7조건, 그룹 저장/복구17조건·효과 저장5조건을 통과했어요. 물리 전원 차단이나 파일+인덱스 공동 transaction 전체를 완료로 세지 않아요. 설치 준비는 새 소스가 포함된294로 이어가요.


### 2026-10-17 · 295

사용 중 엔진 때문에 전환만 보류하는 상태를 개선했어요. 종료 후 고정 배포본 단일 대기·SHA 변경 거부·중복/취소/만료·읽기 전용 상태/실제 CLI를 연결했어요. 설치193/보존 회귀와 native Complex141 실제 CPP 실행도 통과했어요. 사용자 앱은 종료하지 않았고 설치 경로 후속 검사는 전환 이후 별도 숨김 검사 기록으로 남겨요. 실제 전환 여부는 USER_INSTALL_295와 audit 상태를 확인해요.


284–295 사용자 설치5b3bfd90e1a8d716:3066개 명세파일·바로가기2/.hbproject·실제 설치 GL/GPU 현재/이전 노멀·live 파라미터/매질·원본색/HDR 검사를 통과했어요. 이전 설치712501087 logical bytes를 제거했고 수정 보관0·Versions1이에요. native Complex141은 EA 빌드 실제 실행 뒤 렌더/헤더/desktop 소유 코드와 설치 player 바이트가 동일함을 확인해 재사용했어요. 검사 뒤 다른 설치 프로세스가 시작돼 User 프로필의 배타적 전후 비교는 단정하지 않고 별도 현재 SHA 관찰을 기록했어요. 전체 캐시 정리는 다른 Node/g++/cc1plus 빌드 때문에 다시 보류했으며 그 프로세스에는 손대지 않았어요. 전체 잔여·연구 gate는 ENGINE_STATUS 정본에 유지해요.


### 2026-10-17 · 296–297

UV 표본의 동일 연산/offset을 유지한 공용 읽기, GL 주/미분 노멀 호출 위치 공유와 공용 삼각형 Frame을 연결했어요. 실제 GL/D3D/C++/변형/이전 노멀/해제 및 공유·비공유/삼선형 가이드 float32 대조를 통과했어요. 격리 한 순서의 path2.63→2.19초, 시간 가이드5.59→3.68초는 해당 표본만의 링크 시간이에요. 실제 Complex141 첫 path9.09초는 잔여로 유지하고 최초 HLSL 벡터 생성자 실패와 수정 후 근거를 구분해요. 설치 결과는 USER_INSTALL_297에 후속 기록해요.

296–297 설치 확인: af678ad1bf3da1a1·3071명세파일 실행 후 SHA 일치, 설치 EXE의 공유·삼선형/UV/렌즈off-on/main-aux 가이드 오차0·정상 종료, 바로가기2/.hbproject·Versions1을 확인했어요. source I3z8dy의 실제 D3D 게임 근거는 변경 없는 렌더 소스와 설치 player의 빌드 바이트 대조로 재사용했어요. User10385 파일 전후 SHA 동일·수정 보관0, 이전 설치375966480바이트 제거·추가 정리 대상0이에요. USER_INSTALL_297.json을 기준으로 봐요.


### 2026-10-18 · 298–305

삼선형 한 호출 위치/정수LOD 생략·48필터 미분 생략·확정 불투명 GL 분기/legacy key·인스턴스 노멀 수집과 bind/morph/interleaved 캐시 갱신을 실제 제작 데이터와 세 렌더러 실행에 연결했어요. 48변형 GL480/GPU384 표본 오차0·정수136표본 atlas684읽기 감소,3112삼각형5상태 atlas786432B 동일·normalMatrix9312→9예요. 실제 GL bh3bqL/GPU xKxboZ/D3D0nLrBW의 C++·변형·필터·자원 해제/재방문을 통과했어요.

격리 삼선형 path1941→98.5ms와 확정 불투명 camera1825→1472ms는 서로 다른 지정 fixture의 단일 비교예요. 실제 Complex141 GL6591/3770ms·GPU3667/2111ms·D3D5317/3394ms·D3D재방문198/183ms는 FPS 보장이 아니며 추가 절감을 유지해요. 303 고정 texel loop는 미채택이고, C++ 경고/검사 fixture 수정 이력을 DEBUG_HANDOFF에 보존해요. 정본은 ENGINE_WORK_305.json·후속 USER_INSTALL_305.json이에요.

306 추가: 현재 실행 위치의 설치 식별값이 포장 당시 원장의 이전 설치 기록과 혼동되지 않게 installation을 읽기 전용으로 분리했어요. 실제 marker 교체/잘못된 형식/JSON/디렉터리/호출자 변경/원본 보존을 검사했고 marker-only와 전체SHA 검증을 구분해요. 실물 파일 symlink 생성EPERM은 미검증으로 남기며 최종 설치/API 검사는 USER_INSTALL_306에 기록해요.

298–306 사용자 설치 확인: 31d1e9358b813be1·3084명세 파일 전체SHA·바로가기2/.hbproject·Versions1·User10385파일 전후SHA 동일을 확인했어요. 설치 actual GL/GPU48변형과 opaque camera/normal float32 오차0·정상 종료, API의 현재 bundleHash가 새명세와 일치해요. D3D 소스0nLrBW 근거는 렌더 소스/설치player 바이트가 동일한 것으로 재사용하고 두 번째 설치 native 실행이라고 하지 않아요. 이전 설치177402675바이트 제거·수정 보관0·별도정리0바이트예요. USER_INSTALL_306.json을 정본으로 봐요.


### 2026-10-18 · 307

DirectX의 불투과 확정 metadata·shader variant/define·기본요청/투과 fallback·AI 활성 진단을 연결했어요. 새GPU자원/상수버퍼 필드는 없어요. 실제장치 solid 및 alpha.45 출력차0·alpha1702성분 변화·variant2/캐시재사용/source1/8MiB예산·해제, 실제 yHkwNk C++/BP의 pathNoTransmission=true·변형·이전 노멀·필터·재방문이 통과했어요. 첫5187/3280ms·재방문190/221ms는 단일 전환이며 FPS가 아니에요. 그림자 회귀 fixture는 unlit/no-light 생략을 유지하고 실제 lit 수신자/광원/캐스터의 안정→pose 변경을 검사하도록 정정했어요. GL/GPU 공용 소유자는 그대로여서 통과 검사를 반복하지 않았어요. 후속 설치는 USER_INSTALL_307에 기록해요.

307 설치 확인: 534dae19145a0053·3088파일 전체SHA·바로가기2/.hbproject·Versions1·User10385파일 전후SHA 동일이에요. 설치 헤더 직접 컴파일/D3D 실행 tiFviq는 solid/alpha 오차0·source1/컴파일2/캐시/해제를 통과했어요. Q8oV9Q 실제 설치 창의 camera/guide/API bundleHash도 맞아요. 실제 게임 yHkwNk는 source/player 바이트 일치로 재사용하고 별도 설치 게임 재실행이라고 표현하지 않아요. 이전설치177509691B·생성CPP검사실행파일3112555B 정리·수정보관0이며 USER_INSTALL_307을 정본으로 봐요.


### 2026-10-18 · 308–318

이전 프레임의 실제 geometry/UV/world/view/smooth normal·mip·카메라 콘을 기존 버퍼로 연결하고 17머테리얼/포즈·8카메라 및 실제 GL/GPU/D3D CPP/BP 게임을 대조했어요. 2D256 제한과 면적 비례 편집/충돌을 제거하고 희소 맵·가상 편집·셀 이동·CPP/BP·생성 충돌과 AI 보기 API를 연결했어요. 텍스트 게시/인덱스 사이 종료에서도 작은 쓰기 의도로 같은 ID를 복구해요. 실제 종료/ENOSPC/외부 편집/경로 별칭12조건·기존 내구성7/트랜잭션17을 확인했어요. ENGINE_WORK_318에 원본SHA/증거/제한이 있어요. 설치 갱신 후 시퀀스 등의 누적 잔여를 이어가며 전체 완료로 처리하지 않아요.

318 설치 828c60b44c267db5·3106명세 전체SHA·바로가기2/.hbproject·Versions1·User10385파일 전후SHA 동일을 확인했어요. 실제 설치2D CPP/BP/포인터/Undo·stable ID, 설치 GL/GPU morph 이전 mip, 설치 헤더 D3D smooth normal을 확인했어요. 이전설치177476980B와 종료된 자체CPP probe2121553B를 정리하고 소스/패킷/보고서는 보존했어요. 이어서 시퀀스 복수 소유권 작업을 진행해요.


### 2026-10-18 · 319–327

308–318 설치 이후 작업을 계속해 부모/whole component/property/Transform 별칭·skeletal·animation clip의 공유 원본/우선순위/부분 구간 인계를 구현했어요. CPU13종·구조8/클립3/재진입·오류4조건과 실제 소스 편집기/DirectX·WebGL CPP/BP게임이 통과했어요. 소스게임 후 최종 guard 추가는 CPU327로 확인하고 설치 gate를 새로 진행해요. 공식 선택 자료의 읽기 범위와 링크/그림/API 미독을 별도 등록했으며 전체 분석 완료로 승격하지 않아요.

327 설치 0d2a7b42112d229e·3115전체명세SHA·바로가기2/.hbproject·Versions1·User10385파일 전후SHA 동일이에요. 최종 설치본으로 실제 편집기와 DirectX·WebGL 패키지를 다시 제작·실행해 CPP/BP/실제뼈/부모/컴포넌트/클립 인계를 확인했어요. 이전설치189534913B를 정리했어요. 원장의 다음 렌더링과 엔진 잔여를 이어가요.


### 2026-10-18 · 328–334

327 설치 뒤 렌더링을 계속해 WebGPU current/prior 텍스처 함수를 같은 바인딩의 기존 Map으로 공유했어요. 실제 두 문맥17포즈·4종12필터384표본 출력오차0, 텍스처 함수4→2·월드UV WGSL86,295→72,064자를 확인했고 CPP/BP 게임이 통과했어요. GL공통본문 실험은 출력/소스만 통과하고 시간 개선 근거가 없어 기본 경로에 적용하지 않았으며 성능 성과로 계산하지 않아요. 다음은 실제 설치 공유 검사와 초기 준비 지연의 공통 호출 지점 후보를 이어가요.

334 설치 55e1cb7c02adbcb9·3122전체명세SHA·바로가기2/.hbproject·Versions1·User10385파일 전후SHA 동일이에요. 실제 설치331 5GYkHu는 dual normal/guard/함수4→2/출력0을 통과했고 sourceGPU게임5o6btx의 prototype SHA와 설치파일도 대조했어요. 이전설치196484809B를 정리했어요. 다음 mixed-frame 단일 호출 지점 실험과 누적 잔여를 계속해요.


### 2026-10-18 · 335–352

이전 문맥 GL mixed-frame 실험17포즈와 렌즈/가이드 출력 대조를 이어갔지만 성능 근거가 부족해 기본 경로에는 적용하지 않았어요. 선택 DirectX 렌더 패스에 8MiB 공용 디스크 캐시를 만들어 독립 프로세스21개 적중/재컴파일0·출력0·6안정프레임 캐시IO0, 실제 게임6개 저장→다음게임6개적중/저장0을 확인했어요. 공용 진단/AI스키마와 손상/경합/강제종료/잘못된shader종류 복구도 연결했어요. 전체 게임 검사 중 프로브 강도 변경의 재캡처를 고쳐 실제 C++/BP·2D/3D/HUD/텍스처/그림자/파티클/변형/Bloom/프로브/장면해제를 함께 통과했어요. 다음은349 설치 확인과 RND07의 이전 표면 필드·투명 분기예요. 전체 누적 완료로 보고하지 않아요.

349 설치 ae9f6eff3708ba45·3135개 명세 SHA·바로가기2/.hbproject·Versions1을 확인했어요. 설치350 tZcuO7의 실제 두 게임 프로세스6save→6hit/0save·정상종료와 배포/소스 소유자 SHA를 대조했어요. User10385파일의 검증 전후 및334영수증 SHA가 같고 시험/백업용으로 사용하지 않았어요. 최초 검증은 명령줄의 설치 경로를 사용 중인 앱으로 오인해 보류됐으며, 보호를 낮추지 않고 같은 검증기를 메모리 인수로 실행했어요. 이전 설치177676881B와 완료 fixture/바이너리를 정리하고 RND07 이전 표면·투명 경로를 계속해요.


### 2026-10-18 · 353–365

이전10표면필드·committed 시간/기하/UV/노멀/시점/밉을 공용IR로평가하고 opaque지원 시간graph의pose이력을보존했어요. 값/앞뒷면/TIR·코팅lobe거부와독립coating TBN복원을 GL/TSL/생성HLSL에연결했어요. static프로그램/미사용decoder/빈채널할당을줄이고 AI계약을추가했어요. 실제3경로CPP/BP의Complex141·138변형·134·125·128과DX131/warm전환을확인했어요. 수치10필드/7coat문맥·Snell192·lens8조건·실제motion185를분리검증했어요. 이전296 미활성좌표결과와보고서없는4KMUzC는성과에서제외했어요. 365설치확인후 이전투명BVH/중첩매질·전역곡면역해·복합산란/준비비용과누적분야를계속해요.

365 설치 0d31b38547f61c8e·3166개 명세 SHA와46개 변경 소유자·새 native player·바로가기2/.hbproject·Versions1을 확인했어요. User10385파일은 설치 직전부터 검사 후까지 읽기전용 inventory SHA가 같아요. 설치364 1uCjgT의 실제 GL/GPU lens8조건/유효motion과350 GVxBNM의두 native게임6save→6hit/0save·정상종료를 통과했어요. 이전설치 177782675B와완료검사/바이너리를정리하고다음렌더링작업을계속해요.


### 2026-10-18 · 366–370

준비 epoch 분리/선행 장치 초기화로 첫 WebGPU 프레임0→173을 직접렌더와오차0으로복원했어요. 이전 normal/coat의현재정점복원함수4개를제외하고기존flags/Nodecallback을유지했어요. 이전세계BVH를기존atlas선택suffix로연결하고마스크/불완전검색·이전가림/직교nearplane을세GPU실제63광선과full투명guide로검증했어요. shared144triangle추가4560B,opaque/committed없음0B예요. 실제CPP/BP D3D/GPU145·코팅검사를통과했어요. 병행prune부재경쟁을재현하여이미삭제된경로만skip하고권한오류/32최근/원본을보호해요. 선택Three/PBRT소스와AI계약을기록하고설치370을준비해요. 독립oldmedium/IOR경로·전역곡면역해/복합산란과누적분야를계속해요.

370 설치 1e50e6754649e3e1·3183명세 SHA/31개 소유자·새 player·바로가기2/.hbproject·Versions1을 확인했어요. User10385파일 설치직전/검사후 읽기전용SHA가 같아요. 설치369XmWGQF 원근/직교·GL/GPU투명guide,366zGE36A 첫173/direct오차0/coldinit/래스터,350vRsSV1 두native게임6save→6hit/0save·정상종료를 통과했어요. 이전설치 177941817B(파일논리크기)·own probe 2172753B를삭제하고후속매질작업을계속해요.


### 2026-10-18 · 371–376

이전 IOR 스택/굴절 방향을 현재와 독립적으로 재생하고 실제 이전 교차 불일치·전반사·앞뒷면·nonLIFO/overflow 이력을 거부해요. old state는 ID16+scalar IOR16이며 현재 RGB 소광은 보존해요. current/prior guide 광선 폭을 기존 적분기와 맞추고 세GPU 49개 Snell·18개 전이·전체 중첩 guide·실제 normal-map 밉/폭을 대조했어요. source CPP/BP D3D wy7K7b·WebGPU VOqQsx 실행/정상종료/서버해제를 확인했어요. 병행 prune의 내부 파일 선삭제 경쟁을 namedmutex로 직렬화하고 두 실제 PS/권한거부/32최근 보호를 검사했어요. AI 불변계약·PBRT 지정본문 대조·원장을 갱신하고 설치376으로 이어가요. 전체 누적 목표는 계속 진행해요.

376 설치 04201e5a3a6750d5·3207명세 SHA/34소유자·새 player·바로가기2/.hbproject·Versions1을 확인했어요. User10385파일의 설치직전/후 읽기전용SHA가 같아요. 설치375XxjF3v 전체GL/GPU 광선폭/실제노멀맵밉과3500tAxaJ 두native게임6save→6hit/0save·종료0을 통과했어요. 이전설치 178041752B(논리크기)·own probe 7259382B를 정리하고 누적 렌더링 작업을 계속해요.


### 2026-10-18 · 377–380

현재 하늘의 선형 천정/수평선·해질녘·태양/달·SkyLight tint/간접세기를 HDRI우선 worker snapshot으로연결했어요. 기존 화면 parameter는동결한apply본문20구성으로일치하고워커bareimport실패는실제moduleworker로재현후renderer의존제거로고쳤어요. DirectX일반하늘/캡처달을2vec4(32B)로추가하고옛packet/JSuniform기본값을보존해요. 실제GL/GPU10방향과DX5방향·인간UV1/베이크/UndoRedo/미리보기/AI가드·세GPU게임baseline/이동무효/복원·exit0을확인했어요. 실제Half atlas의상수바운드PI도대조해요. 새의존/베이크GPU자원/자동readback은없어요. source·AI계약·공식지정본문과잔여를기록하고설치380후다음렌더링을계속해요.

380 설치 be667218d6b12f61·3215명세 SHA/17소유자·새 player·바로가기2/.hbproject·Versions1을 확인했어요. User10385파일의 설치직전/후 읽기전용SHA가 같아요. 설치379QjO9mY 실제moduleworker와350Xexu4L 두native게임6save→6hit/0save·종료0을통과했어요. 이전설치 178155104B(논리크기)·own native probe 1162534B를정리하고누적렌더링을계속해요.


### 2026-10-18 · 381–390

HDRI 밉을 worker-safe 공용 소유로 연결하고 queried 단계만 유지해요. 6NPOT Float/Half 전체 패킹바이트·원본 불변과2800B/full699056B를 대조했어요. 환경 각도를공유다항식으로 바꾸고392조건×3GPU 최대2.4655e-6/기존4e-5를통과했어요. HDRI 선택우선과sun/moon 혼합PDF는 실제 인간베이크/워커/Undo/AI/미리보기/세게임으로 연결했어요. 추가 광선/GPU자원은없어요. GL 준비대기를실패로세어raw64표본을버리던문제를수정하고원본픽셀동일/광원reset/전체117·118·120 CPP/BP를확인했어요. NativeLens의identity원근검사입력은실제행렬로정정하고같은binary로118/117을재개했으며원래실패와120통과구역을보존해요. 지정NIST/PBRT본문과미독범위·원장/AI계약은갱신했으며등록78항목을전체엔진분모로세지않아요. 설치390 SHA검증/Versions1 이후누적목표를계속해요.

390 설치 a774f74aca97500f·3227명세/25소유 SHA·새player·바로가기2/.hbproject·Versions1을확인했어요. User10385파일의설치직전/후읽기SHA동일·설치인간sun워커/Undo/AI/미리보기 WHKAmz와두native게임6save→6hit/0save uRETgh를통과했어요. 이전설치178202975B·검사binary5424557B를정리하고다음렌더링을계속해요.


### 2026-10-18 · 391–395

실제확산필터를평가한HDRI휘도·정확구면셀면적·조건부2D CDF와코사인혼합PDF를기존베이크에연결했어요. 필요한첫반사에서1회/사용안하면생성0·추가광선/원본복사/새GPU자원0·CDF16648B상한/512원본밉2856B를확인했어요.12조건PDF/PI/회전/flip/불변·실제bake145.9778/독립146.4060·black차폐0과인간HDRIworker/UndoRedo/AI/미리보기/세게임을통과했어요. 처음탐색한4배MSE목표는false로남기고성능완료로세지않아요. 현재지정조건MSE12.8735→11.3237만측정값이에요. 원본CDF/flatten후보실패와고휘도AgX표시fixture를보존하고canonical잔여를유지해요. native관련owner/player가390과동일하여기존설치D3D gate를SHA로재사용하고새설치의HDRI워커/전체명세/User읽기SHA/Versions1을확인해요. 그후편집기GPU시간등누적목표를계속해요.

395 설치 cb187b8f7a0959e2·3232명세/15소유 SHA·새player·바로가기2/.hbproject·Versions1을확인했어요. User10385파일의설치직전/후읽기SHA동일·설치인간HDRI워커/Undo/AI/미리보기 SgCafe를통과하고동일player/관련소유SHA의395 이전nativecache gate는390 기록으로재사용했어요. 이전설치178272483B·검사binary0B를정리하고다음렌더링을계속해요.


### 2026-10-18 · 396–400

기존프로파일러에opt-in GL/GPU비동기쿼리·최근/평균/p95/완료sequence·명시범위를연결했어요. GL4query/GPU256slot·두2048B버퍼/한read상한·off새query/read/timer0·중지/deferred퇴역/stale거부·외부쿼리/overflow/오류를검사했어요. 실제두API픽셀동일·32render+1compute/독립정수출력·read진행중stop/최종owner0을확인했어요. 실제editor의인간record/clear·AIread/stop·메인/머테리얼·원본SHA/revision/exit0과같은폰트/원래가시성조건의두행전체를확인했어요. 주차profiler하단열기와GPU전용보기/숨긴CPU마크업생성생략도포함해요. GPUtimeline/pass합계는FPS/전체GPUbusy/coldcompile개선으로세지않고threadflow·할당/crash·누적렌더링원장을유지해요. handoff는최신상태만남기고과거증거는Git/정본을참조해요. source/nativeABI/player는재빌드없이동기화하고설치400두API UI/현재ownerNative350/fullSHA/User읽기SHA/Versions1을확인해요.

400 설치 aca3b432cab8636e·3240명세/15소유 SHA·동일player·바로가기2/.hbproject·Versions1을 확인했어요. User10385파일 설치 전후 읽기 SHA가 같아요. 실제 설치 GL wIN4qj/GPU nHEBHJ 인간 기록·지우기·AI 중지·메인/머테리얼 전체 행과 D3D 두 게임 MyUk0i의 캐시 저장6/재사용6·재저장0을 통과했어요. 이전 설치 178310047B를 정리했고 다음 RND06과 누적 렌더링을 계속해요.


### 2026-10-18 · 401–410

알파 미사용 필드/0폭 미분과 미사용TSL graph를 줄이고, 상쇄 노멀의 CPU·일반·광선·이전 디코더를 공유했어요. 실제 GL/GPU/D3D의 큰mip중립/작은mip원방향과 일반raster를 대조했어요. 이전 표면 공간 입력의 일괄미지원 생산자 표식을 정리하고 기존 이전 포즈/분기/값 검사로 연결했어요. 전체 세 API 가이드에서 같은 값 유지·변경 거부·복원을 확인했어요. NaN/Inf가 max 계산에서 숨는 실제52불일치를 채널별 비교로 고쳐 최종 세 API28cases×3판정0불일치예요. 첫 일반D3D helper누락 LwGvlA는 native-materials 선언을 보완했고 실제 패키지 nXXUre C++/BP·UV노멀·morph664채널·해제/캐시 검사가 통과했어요. GL source296B감소는2004.9→2011.6ms로준비시간개선을입증하지않았고Complex141 path4689/temporal4829ms는남은과제예요. 정본 ENGINE_WORK_410/도움말·선택본문 corpus410·AI 불변 normalDecode 계약에 기록하고 설치410에서동일소유SHA와User읽기지문/Versions1을확인해요. 전체목표완료로세지않고계속해요.

410 설치 a07a23a239e6b865·3255파일 fullSHA/28실행소유 SHA·새player·links2/.hbproject·Versions1을 확인했어요. 실제 설치 GL/GPU normal/raster/이전mip CDhjNf와 두 D3D게임 YCyRGS 저장6/재사용6/재저장0 통과예요. User10385설치전후읽기SHA 동일·이전설치178121187B와검사exe4363624B를 정리했어요. 누적RND06과다음렌더링작업을계속해요.


### 2026-10-18 · 411–415

큰월드1천만에서폭.3125가세계점더하기중사라져GL/GPU가넓은mip도0mip로고르는오류qC75cp를재현했어요. 상대삼각형모서리의affineUV차분으로수정해세API의큰mip중립/작은mip원방향과17기하·skin/morph/instance/smooth·이전UV조건을원래4e-5로확인했어요. 128독립수학조건도대조했고기본보간/IR/상수버퍼·GPU추가자원/읽기는유지했어요. native helper를쓰는UV/필터에만생성하고표참조전검증·standalone include를지켰어요. engineSchema의불변uvFootprint와도움말에남겼어요. GL준비한쌍2664.9→2576.6ms/source122B와실제C++/BP Complex141 path4615/시간guide4488ms는관찰이며개선율/FPS로세지않아요. 현재중간좌표graph/전역곡면/매질/원장잔여도이어가요. 설치415의실제큰월드/두native게임·전체SHA·User읽기보존·Versions1을다음검증해요.

415 설치 e72c7905b43515f1·3259전체명세/15실행소유SHA·새player·links2/.hbproject·Versions1을확인했어요. 실제설치큰월드GL/GPU u1oaX2와두D3D게임 jWVdIY의저장6/재사용6/재저장0 통과예요. User10385전후읽기SHA동일·이전설치178178806B/검사exe2908854B 정리. 다음중간좌표graph와누적렌더링을계속해요.


### 2026-10-18 · 416–420

큰 오프셋과 월드 위치 graph의 실제 GL/GPU 밉 소실을 재현하고 상대 변화량 전달로 수정했어요. 공유 곱·패너·타일링·보간·내적·외적과 UV/world 입력을 세 API에 연결했어요. 실제 20연산333조건(일반320·큰값12·정확유리수1), 이전17문맥, 48샘플러×8표본과 새 C++/블루프린트 DirectX 게임 etaijS가 통과했어요. 초기4458/4299ms는 관찰이며 개선율 주장이 아니에요. 새 GPU 자원·uniform·운영 읽기0이고 AI 계약/도움말에 근사와 남은 비선형·노멀 한계를 명시했어요. 정본 ENGINE_WORK_420에 소유 지문과 증거를 연결하고 단일 Versions 설치검증을 이어가요.

420 설치 73f3b3113b91e92e·3267전체명세/21실행소유SHA·새player·links2/.hbproject·Versions1 확인. 설치 Mcp9Iu/5BoRiz의큰그래프·월드 GL/GPU와zBEYST두DirectX게임 저장6/재사용6/재저장0 통과. User10385전후읽기SHA동일, 이전설치178208399B와검사exe4440556B 정리. 비선형좌표/노멀/렌더링잔여를계속해요.


### 2026-10-18 · 421–425

절댓값 등 비선형 sub-ULP 차분과 큰 월드 스무스 노멀 UV 밉 소실을 실제 재현했어요. 경계·주기·길이/정규화 수식과 성분별 조건 선택, 기본/offset 삼각형 무게 분리, C++ 이전 함수명 치환을 수정했어요. 실제 세API 28연산485조건(기존2e-5·새normalize1e-12), 큰 노멀넓은밉Z/좁은밉-X, 이전17pose, 새 C++/블루프린트 게임 YItc4H 통과. path4622/시간guide4339ms는 단일관찰이며 개선율/FPS 주장이 아니에요. 새GPU자원/uniform/운영readback0, AI계약·도움말과 남은fallback/전역곡면·매질/원장 유지. ENGINE_WORK_425에소유지문·실패와실제증거를연결하고설치검증을진행해요.

425 설치 f1bb52e5ec6cd6bf·3272전체명세/22실행소유SHA·새player·links2/.hbproject·Versions1 확인. 설치 gjg0C8의큰그래프·월드 GL/GPU와rMajLh두DirectX게임 저장6/재사용6/재저장0 통과. User10385전후읽기SHA동일, 이전설치178254084B와검사exe5167624B 정리. 비선형좌표/노멀/렌더링잔여를계속해요.


### 2026-10-19 · 426–430

WebGPU준비의post/필터직렬완료대기를독립descriptor먼저제출로바꿨어요. CPU와실제GPU첫완료전제출1→4·out-of-order/실패후늦은완료미게시·coldinit/syncthrow/cancel·실제raster/네출력색·epoch회귀통과. 실제C++/BP WebGPU he1eiy의path4990/시간guide4075ms는단일관찰이며속도개선율/FPS가아니에요. 인간·AI가제출/완료/전체단계수와겹치는시간을같이읽고새GPU자원/readback/worker/cache없어요. 425실행파일과native소스는그대로재사용해불필요빌드를피했어요. GPUWeb/MDN메서드·localr180선택읽기를corpus에등록하고W3C전체본문크기실패미독/gate미승격을유지해요. ENGINE_WORK430정본과단일Versions설치를이어가요.

430 설치 d5b4aa2697d1fdae·3279전체명세/8실행소유SHA·425동일player재사용·links2/.hbproject·Versions1 확인. 설치 WOtg08의실제WebGPU첫완료전제출1→4·네출력색/동시raster 통과. User10385전후읽기SHA동일, 이전설치178294439B와검사exe0B 정리. 비선형좌표/노멀/렌더링잔여를계속해요.

430 설치 인계의 오래된420경로와 템플릿의새player표시를 실제감사430에맞췄어요. 설치430은425동일바이너리와새WebGPU준비자료이며, 직전설치커밋본문의두DirectX게임문구는복사된설명오류예요. 실제430검사범위는USER_INSTALL_430의설치GPU1→4·네출력색/동시raster·전체명세·사용자보존이에요. 원본425의DirectX검증과구분해요.


### 2026-10-19 · 431–435

나눗셈·거리·회전·반사·눈UV의sub-ULP변화량을수정했어요. 실제세API33연산573조건·다섯fullgraph의현재/이전밉·10D3D패킷문맥과새C++/BP게임2qifvs가통과했어요. 분모epsilon/노멀/각도·중심·깊이/mask경계·교차항과기존오차기준유지. FXC벡터쓰기와genericloop충돌을4성분helper만unroll로고치고TSL눈UV중간변수로표현확장을줄였어요. 원오류가cleanup에가려진검사도고쳤고각실패를보존해요. 새GPU자원/uniform/운영readback0,35안정연산AI계약·잔여fallback/전역곡면·매질·원장유지. path4599/guide4460ms는단일관찰이며전체속도개선주장이아니에요. ENGINE_WORK435정본과단일Versions설치검증을이어가요.

435 설치 997f66eeeea8c9cb·3285전체명세/16실행소유SHA·새player·links2/.hbproject·Versions1 통과. 설치AkcNpd 다섯GL/GPU그래프와3rj7y6두DirectX게임 저장6/적중6/재저장0 확인. User10385전후읽기SHA동일. 이전설치178333286B와검사exe2945056B를정리했어요. 나머지좌표fallback와렌더링/엔진목표를계속해요.


### 2026-10-19 · 436–440

공유 좌표 보조 함수의 전이 의존을 기존 연산 목록에 연결했어요. 실제 D3DPreprocess12조건에서 기본UV/time/add/mul은10함수→0·보조라이브러리4580→254B. 실제 GL/GPU 다섯 full graph와 native10현재/이전 패킷·새Complex141 WQwSTE가 통과했어요. 전체 준비 ABBA full2617/2572ms guarded2636/2881ms로 지연 개선은 확립되지 않았어요. 같은 수식 몸체·573조건 알고리즘과 자원 예산을 유지하며 순환·누락·중복도 거부해요. 전체 엔진 완료로 승격하지 않고 현재/이전 노멀 호출 지연과 누적 렌더링 목표를 계속해요.

440 설치 f4230fbda13c3695·3292전체명세/11소유SHA·새player·links2/.hbproject·Versions1 통과. 설치 검사 coordinate-graphs-433-O6blds / shader-cache-window-350-syaNU7에서 다섯 GL/GPU 그래프와 두DirectX게임 캐시를 확인했어요. User10385읽기SHA보존. 이전설치178372339B와검사exe886750B를정리하고441 이후작업을계속해요.


### 2026-10-19 · 441–445

8추가비선형상대차분을세API에연결했어요. 40연산699조건·8실제graph·16native독립현재/이전패킷·새C++/BP게임VWxJFX가통과했어요. 기존573조건오차기준과새subULP1e-10·새큰6305출력한조건2e-3를구분. 보조함수20개전이선택·규칙이탈거부·AI43연산·추가GPU자원/uniform/운영readback0. 441혼합노멀은GL17pose×3오차0·한번ABBA원본2590/2592/혼합2448/2551ms이나기본미채택·세API/coat/전체guide후속필요. 초기준비path4797/guide4472ms단일관찰로전체속도개선주장없음. ENGINE_WORK445정본·설치와추가렌더링계속.

445 설치 4ffd07face0d2a99·3303전체명세/23소유SHA·새player·links2/.hbproject·Versions1 통과. 설치 검사 nonlinear-graphs-444-ejw5lo / shader-cache-window-350-VfeVjV에서 여덟 GL/GPU 그래프와 두DirectX게임 캐시를 확인했어요. User10385읽기SHA보존. 이전설치178404828B와검사exe1773500B를정리하고446 이후작업을계속해요.


### 2026-10-19 · 446–450

실제좌표의존만보조함수에연결하고DirectX GUIDE를기존GL공통생성기의primary/aux/lens로선별했어요. 레지스터버전/고정LOD·필터·shade-only를구분하고프레임반복scan없음. 22전처리조건·GL/GPU8graph/native16패킷·실제16×16×8경우generic대조오차0·이전값변화거부복원통과. 실제production.begin은초기5/lens2compile·돌아오면cache2hit·sourceBuild1·target288B고정/release0·기존8MiBcache유지. 449검사는한shader3상수frame으로compile을묶고공통HLSL+조건SHA로중복보존을줄였어요(448두6필드실행은이전unbatched). 실제새C++/BP게임F8rVcn path4108/denoise699/시간guide3223ms·모프664·캐시·해제통과. 시간은단일미통제관찰로FPS/전체완료주장없음. AI불변정책·추가운영GPU자원/uniform/readback0. 설치450과다음noise/checker/MAT03/RND08작업을계속해요.

450 설치 4ce36135306357d5·3310전체명세/20소유SHA·새player·links2/.hbproject·Versions1 통과. 설치 검사 nonlinear-graphs-444-zopkYY / shader-cache-window-350-7Esfdl에서 여덟 GL/GPU 그래프와 두DirectX게임 캐시를 확인했어요. User10385읽기SHA보존. 이전설치178474194B와검사exe4702208B를정리하고451 이후작업을계속해요.


### 2026-10-19 · 452–472

가져오기2DJSON/정책·단일워커·선형영역밉·알파커버리지·녹색반전/노멀정규화·상위밉/크기를중앙미리보기/오른쪽상세·Undo/AI/참조/패키징·GL/GPU/DX/광선으로연결했어요. 실제D3D3LOD/84B·sRGB보간92·실제게임중간색두경우raw/가져오기오차0·런타임교체후유휴업로드안정. 실제GL/GPU와HLSL8문맥에서색상·노멀의이전기하와시간검사를기존4e-5로통과했어요. 가변알파는기존전역초기화대상으로시간재사용승격없이같은시간coverage를검사했어요. 상세증거/초기실패/남은항목은ENGINE_WORK472. 누적렌더링·엔진작업을계속해요.

472 설치 e300561444a0c707·3331전체명세/37ownerSHA·새player683a2796·User10385전후읽기SHA·links2/.hbproject·Versions1 통과. 설치된460n92LwC의상세창/GL/GPU와설치된packager의464Xa9lXa DirectX게임·두중간색오차0/교체/유휴업로드안정을확인했어요. 처음검사자체node를활성사용으로분류한문제와installed cleanup의workspace보호거절은검사프로세스/소유정리경로를분리해해결했고설치복제/교체를반복하지않았어요. 이전450 178639831B와소유검사exe 2791218B를정리해요.


### 2026-10-19 · 473–485

Noise/Checker 상대 변화량·셀 경계/음수/동시 배율 교차항·코너 잔차를 GL/TSL/HLSL에 연결했어요. Checker 축별 홀짝을 먼저 줄여 ±33554432와 ±1의 조합에서 이전0/수정1을 실제 대조했어요. 세API 새103조건(작은 경계1e-24), 기존699조건의 기존 기준, 두 실제 그래프의 이전 기하/시간/밉과 HLSL4문맥, 실제24전처리 조건이 통과했어요. 기존 큰 power 한 조건2e-3은 유지했어요. 새 C++/BP 게임 yILSCh의 모프664·캐시·해제가 통과했고 path4477/denoise842/시간guide3516ms는 통제하지 않은 단일 관찰이에요. 전체 초기 지연은 계속 줄여야 해요. ENGINE_WORK485에 증거와 잔여 항목을 기록하고 동기 컴파일러 잠금·백그라운드 준비와 누적 렌더링 목표를 계속 진행해요.

485 설치 52509e8a3c52d31f·3343전체명세/21ownerSHA·새playerd3eaca01742b9c4661841e94e1c2e4fe782ef5d88c273ab8b38551bed04761c5·User10385전후읽기SHA·links2/.hbproject·Versions1 통과. 설치477Z4Ph2j 두GL/GPU그래프와350k2CNuQ 새DirectX게임 두프로세스에서6저장→6적중/0재저장·유휴IO안정. 이전472 178748468B와 소유검사exe 3914836B 정리. 다음동기컴파일러대기/백그라운드준비와누적목표를계속해요.

496 ·source 2df9b9309218d3de46973ed66124747f4817c50d ·화면6단계 단일 워커/8MiB큐/유휴1초·공용캐시 잠금과 세대·래스터/C++진행·준비 전 샘플/이력 미승인·취소/캡처/오류·프로파일러/AI 계약 연결.489실제FXC/이전 소스와 대조·347동기 SDK/21캐시/장치거부복구·490/348/106/109·실제C++/BP141HqA6y7 22프레임/23Present/샘플0/C++4.21ms/중지62.65ms/변형664 통과. 전체FXC 시간 개선/FPS/전체엔진 완료와 구분하고 설치 검증을 이어가요.

496 설치 9937154a06b6e79d /3353전체파일·실행소유SHA·player9096bb2b287d80035ecc53f17e5f9503bccc3bf01c136a2fda73c098e0bb7a60·User10385전후읽기SHA·links2/.hbproject·Versions1통과. 설치된SDK/packager/player의 실제C++/BP DUEZpf pending22frame/C++5.87ms/중지93.77ms/샘플0/idleworker0와EYFCfI 두게임6저장→6적중/0저장 검증. 이전설치 178804974B·소유검사exe 2153593B정리. 초기검사 null진단/중첩요약키 오류는원인과회복근거를남겼으며설치전환은1회예요. 다음캡처전환·렌더링/엔진누적작업을계속해요.

510 ·source4cd4f0deb1a04f796a252dba9bb98f2725f31890 ·네텍스처형식UV상류차분/현재이전밉·노드표면샘플러충돌분리/C++createSurfaceProgram/AI계약. 이전496설치49977ArfC 폭차이0→현재499kQNLBO/500vlZrYh 폭차이1·현재이전/세API오차0(기존4e-5). 507ecNs0o 독립두필터188/0교환·실제두텍스처머테리얼C++/BP게임VsRtt0와전체기본실행기5AJdMC(2D/3D/SVG/HUD/그림자/파티클/변형/네형식교체/2D효과/해제)통과. 초기정답/검사그래프오류와실제s1충돌의발견수정은ENGINE_WORK510에구분했어요. 원장잔여와설치검증을이어가요.

510 설치 bd5f13e0145bd55d/3363전체파일·20ownerSHA·player17eb6030db3dbdd2abfdd71d1ba9dfbdf58beb8efd3edae3cbc0ad4f1f8e610a·User10385전후읽기SHA·links2/.hbproject·Versions1통과. 설치499l8ydFy 4형식GL/WGPU/이전밉과4967wxC50 실제두텍스처C++/SDK/packager/game pending24frame/C++4.62ms/중지93.55ms/샘플0/idleworker0통과. 이전496 220323155B와소유검사exe 1937831B정리. 다음설치캐시용량/명시적밉제작제어와누적목표계속.


514 ·source 4909e4ae9ad02e2fd248e2b4a64f7cfc6047e80b ·설치 C++ 모듈·의존 파일을 Versions 밖 공용 Cache로 분리. 기존 설치의 41,414,504B 캐시 원인 확인. 실제 격리 설치5135RrPeN GCC113/첫miss→hit·설치전체SHA 불변·실패/취소 소스 정리·컴파일 트리 취소·close 재사용·lease0. 512cCAhE7 최근32/복수참조/실행/퇴역·네프로세스80회 잠금·검사캐시 참조 보호 통과. 기존SDK293JLEUFg 내용/중첩/mtime대조와전송검사 유지. 프레임캐시IO/상주워커0. 설치510은유지하며명시적밉 제작 연결과누적목표를계속하고묶음끝에서갱신해요. ENGINE_WORK514정본.

538 ·source 6234e430902637697dca3b8262188012a9ae62ec ·네형식4밉모드 조건부핀/Undo/JSON·AI·세일반표면·현재이전광선·볼륨compute/CPU베이크 연결. 최종520nykRGl/5217BLnKZ 세경로 현재이전노멀 정답오차0,527Wct1ei/528RJuJSm 실제일반표면16case,53139wYKR odd/depth17/sRGB6case/유휴재생성0/임시6생성6파괴,532ppzYJl 실제편집/저장,536CWBNbQ 명시큐브환경회전분리,524/537/225HUinH3 베이크와기본입력,새C++/BP czYlkJ 실제Alpha→bias호출/23frame/C++4.44ms/중지92.86ms 통과.9개회귀통과. 설치검증과남은누적작업계속. ENGINE_WORK538정본.

541 설치 c18dc18036317c46/3391전체파일·47ownerSHA·player052f8aa28b6057066ee7cdf3a3c044f05ff83c55b0ff24f79a728f42d74d5b09·User10385전후읽기SHA·links2/.hbproject·Versions1통과. 설치528XMFmlU 4형식4밉GL/TSL실제표면과496kvJTZj 설치SDK/packager/player 새C++Alpha→bias호출/pending22frame/C++5.61ms/중지92.90ms/샘플0/workeridle0검증. Versions/native/build없음·공용native캐시41414995B/lease0. 이전510 220378899B·소유검사exe 2170688B정리. 다음normal분산/roughness·초기준비·누적렌더링/엔진목표계속.

549 ·source d6c7d8ba397da9c620ad337d4dd532ec1d893fb2 ·원본 보존 노멀 분산/거칠기 밉 합성·RGBA/강도·홀수/고해상도·평면/강도0 byte 일치·커버리지 충돌 거부·단일 worker 두입력/공유버퍼/보조detach 재시도·상세/밉/채널/UndoRedo/저장/AI·참조/교체 연결. 544O7sQe3 실제GL/TSL6LOD,545gz05oh DX3LOD(137/219/219),467znGqs6·468JUSclO 이전기하/시간/노멀/거칠기/밉,548i2AR00 새C++SetTexture게임221→165→221·유휴upload안정과8회귀 통과. 최종self-source/최신메모리보고는 설치544에서 확인 예정. 설치/초기준비/누적목표 계속. ENGINE_WORK549정본.

551 설치 68473fd495b977a3/3401전체파일·64ownerSHA·User10385전후읽기SHA·links2/.hbproject·Versions1. 설치5449BcjpA 최종self-source/worker4/6GL-TSL/편집,548clLP7D 설치SDK/packager/player C++SetTexture221→165→221/유휴업로드안정 통과. 이전541 179771490B와소유probe2663984B정리. 공용cache8995953B/lease0·Versions/native/build없음. 다음 초기GL/FXC·누적렌더링/엔진목표 계속.

560 ·source e6125aa3bf6471ce215be5c15c1a817544342460 ·일반 표면 PS/ShadowPS를 기존 공용worker로 분리하고 소유·입력/파라미터·취소/실패/재시도·pending shadow/probe/history/capture·AI/집계UI 연결. 5531CL2Re SDK대기중래스터/동기동일/idle0,5568sSaqI 실제hidden브리지/Present/status/reset/마지막pending제거,3474cqN70 별도프로세스21save→21hit/오차0/거부복구 통과. 전체558은미준비probe바인딩실패로완료세지않고 수정후559pifU9U probe와2D/해제 통과. 최종562의4967Qin7n C++준비중23frame/4.11ms/중지93.79ms/유휴0 및548M3Uli5 C++텍스처221→165→221 통과.5개회귀·두게임 통과. 전체최초지연/FPS완료주장없이설치와누적목표 계속.

564 설치 20b2e3b17134968f/3410전체파일·75ownerSHA·playerabed101f7c65a81448e49ab3ad6e18f47479597f9a5990fec499bda488b7256e·User10385전후읽기SHA·links2/.hbproject·Versions1. 설치559ilsjsc probe/2D 제작·C++/BP·자원해제와496ruSdLX 설치SDK/packager/player 복잡준비22frame/CPP3.66ms/중지93.23ms/캡처/유휴0 통과. 이전551 179843197B·소유probe8835848B정리. Cache196654644B/lease0·Versions/native/build없음. 누적렌더링/엔진목표와SDK빌드비용 계속.


### 572 · C++ 의존 캐시·광원 타일 준비
실제 GCC 전처리 결과/include를 함께 사용해 미사용 렌더링 헤더 수정의 C++ 재빌드를 피했어요. 최종293에서 수정 빌드10499ms→미사용헤더604.9ms, warm43.8ms의 단일 관찰이며 FPS 수치가 아니에요. 같은 크기/mtime 헤더 수정17→31을 실제 실행했고, existence-only 조건도 별도567에서 검사했어요. 32계획/2MiB·중단/실행중 임시영역 보존·기존모듈32/참조보호·디버그소스를 유지해요. 광원타일도 기존 한 워커로 준비하며513광원의 대기/카메라·광원수정/준비후 픽셀을 전체광원 기준과 대조했어요. GPU채택/해제/취소·재활성/유휴0 확인, build570 완료. 출처·지문·미독 범위·실험실패는 ENGINE_WORK572와 NATIVE_BUILD_LIGHT_PREPARATION572에 기록하고 실제 설치/게임 검증은 다음 기록에 연결해요. 누적 잔여 전체를 완료로 바꾸지 않아요.

574 설치 dfc9728395d44a2e/3418전체파일·83ownerSHA·User10385전후읽기SHA·연결·Versions1 확인. 설치571 실제C++571/캐시재사용과573 실제packager/player HDRI·96광원·C++속성/머테리얼·그림자 회귀 통과. 이전설치179925470B 정리, commonNativeCache15315803B/lease0·의존계획1096B. 계속할 다음작업은 캐시를 거치지 않던 Device.compile 일반Compute 커널을 기존 공용 bytecode캐시에 연결하고 잠금/호환/실실행을 확인하는 작업이에요.


### 579 · 일반 Compute/파티클 공용 커널 캐시
공통 플랫폼 선언만 분리한 전후65,537파티클·방출·3프레임 자원이 같은 결과였어요. Device.compile은 기존공용8MiB 캐시를 사용하고 파일/FXC는장치잠금밖, GPU생성만잠가요. 독립577에서 cold7write/8hit→warm15hit/0write, Source/Entry와 장치거부복구/미설정파일0/dispatch8회cacheIO0·비지원guard 확인. 기존GPU검사도 BP→CPP→실GPU·배치위치·전체레코드와Android두타깃헤더구문을 확인했어요. 최소15소유파일2D게임은 원래580무기록종료(미확정)를 통과로 세지 않고 같은빌드 회복검사bwmdxx에서 마스크/광원/쿠키/볼륨/파티클/C++/BP/resize/release·풀재생성3hit/새write0 통과. 578+최종579player build완료; 설치 검증은 다음기록. 누적목표는 계속.

582 설치 ee12e27c70470123/3424전체파일·88ownerSHA·User10385전후읽기SHA·연결·Versions1 확인. 설치577 실제Compute/파티클 캐시15적중/새저장0·장치거부복구·미설정디스크0과580 실제packager/player 2D/C++/BP/마스크/조명/쿠키/볼륨/파티클/크기변경/해제·풀재생성3적중/새저장0 통과. 이전설치179993083B 정리, commonNativeCache26792127B/lease0·의존계획2146B. 다음은 설치 경로 변경에 따른 C++ 모듈 재사용과 디버그 소스 보존을 함께 다루고 누적 렌더링/엔진 목표를 이어가는 작업이에요.


### 585–589 · 버전 간 C++ 재사용과 디버그 경로의 기반
캐시 소유 v2는 설치 기준으로 여러 SDK 버전의 lease/최근32/제거를 구분하고 기존v1 검사를 유지했어요. 아직NativeHost에 활성화하지 않았어요. GCC16.1 DWARF5/NDK LLDB19는 소스이름이 비었고 같은코드DWARF4는 소스가 보여서 Windows편집/개발은 전체-g와기존최적화를유지하며4를선택하고옵션을키에넣었어요. 실제함수42·warmhit·소스/인자/volatile로보존한지역변수정보를확인했어요(최적화로사라진일반지역변수를보장하지않음). SDK는include목록만아니라존재조건용파일까지모두보존해가상옛버전삭제뒤값43·SDK/사용자소스를확인했어요. NativeHost경로/semantic-index/툴체인·링크/실제버전교체 통합은진행할잔여예요. 설치는검증된582/Versions1.

### 591–595 · 설치 간 C++ 재사용 통합
8cb9463: NativeHost 관리 설치의 의미256/물리80 키·lease·완성 게시/중복 후보 제거를 연결했어요. 전체 SDK/컴파일 cwd를 보존하고 실제 툴/링크 지문과 사용 표준헤더 변경을 확인해요. 실제594 격리 설치A 삭제→B 미사용 렌더러 수정에서 동일worker·17 유지, 사용헤더31 새worker와 옛세션17 독립 실행을 확인했어요.593 편집/개발 링크·존재조건·LLDB 사용자/SDK 소스·취소/퇴출 복원을 검증했고 기존512/567도 통과했어요. 설치582는 아직 이전 코드이고 묶음 후 교체해요. 최초 일반 래스터 셰이더의 비동기 준비와 누적 목표를 계속해요. ENGINE_WORK595 정본.

### 596–600 · 기본 래스터 초기 준비·2D 보류 캐시
7c345e7/e4a3c0f: 기본 VS/PS/ShadowPS를 기존 한 워커로 준비하고 정점 레이아웃/장치 채택은 소유 스레드에 두었어요. 준비 중 clear/Present·그리기0·그림자/반사/시간 이력 보류, 대기 중 2D 마스크를 그린 것으로 캐시하지 않고 완료 프레임에서 재그림해요.596 실제 SDK/숨은브리지·동기 픽셀 일치/취소/실패/재시도/유휴와 기존553/556/555/2D/307을 확인했어요.598 배포 실행파일 빌드와580-Jzndh5 새 2D/C++/BP/해제·풀3hit0write 통과. 원장의 오래된 Noise/Checker 잔여는 기존485 근거와 대조해 정리하고 새 성과로 세지 않았어요. 다음 설치 검사와 누적 렌더링/엔진 구현을 이어가요. ENGINE_WORK600 정본.

602 설치 e8daf67648287193/3442전체파일·소유SHA·User10385전후읽기SHA/바로가기/.hbproject·Versions1 통과. 설치SDK 실제CPP602·관리캐시 재사용/디버그 소스와 설치packager/player 2D마스크·광원·쿠키·볼륨·파티클/C++/BP/해제, 복잡셰이더 준비 중 C++·중지·캡처·유휴를 확인했어요. 이전설치180026488B 정리; nativeCache91053220B/lease0·계획258694B; 소유probe7545310B 제거. 누적 목표는 계속해서 프로브 필터의 동기 컴파일과 이전 매질/발자국 이력 경로를 다뤄요.

### 605–613 · 프로브·C++ 비동기 Compute·캡처
프로브4단계 준비/소유채택/보류 이력, compileAsync/poll/take/cancel과 단일큐 종료순서·키 경계를 연결했어요.607 최종 cold3write→warm3hit0write·캐시거부/3프레임/IO0/exit-active/비지원,605 IBL동일·4거부복구,609 BP→CPP→GPU 결과9/배치/EndPlay,Android두타깃구문·기존577/489 통과.559 실제프로브/2D 통과.573 HDRI복구의 임시 캡처 회귀를 기본capture 준비대기/재그림으로 고쳐 최종nDtB97 초기/복구131/168/203·96광원·그림자/CPP 통과. 중간 문법 오류/잘못된fixture는 ENGINE_WORK610에 분리했어요.611/612 빌드완료, 설치614 검증을 이어가요.

614 설치 ecd3b4750e4e6711/3448전체명세·소유SHA·User10385전후읽기SHA·연결/Versions1 통과. 설치SDK BP→CPP→비동기Compute/세프레임결과9/배치/EndPlay와 설치packager/player HDRI96광원·캡처복구131/168/203·프로브/2D/C++/BP·해제를 확인했어요. 이전설치180150792B·소유검사exe8075543B 정리, nativeCache291018700B/lease0·계획650705B. 이전 머테리얼/노멀/밉 문맥과 남은 렌더링·엔진 누적 목표를 계속해요.

### 617 이전 머테리얼 입력·노멀·밉 후속

코팅·비등방성 field5의 zw 입력 이력 선택 누락과 비교 누락을 수정했다. 기존 xy 미러 분류는 유지한다. 실제 GL/WebGPU 전체 가이드의 비등방성/회전 변경 시 이력 거부 및 완전 복원, DirectX 렌즈 가이드, 3 API 비정상 값 33사례, 이동·반전 기하의 물리/색/기본·코팅 노멀 및 독립 밉을 검증했다. 근거: ENGINE_WORK_617.json. 설치614는 보존하며 다음 구현들과 묶어 갱신한다. 전체 누적 작업은 계속한다.

### 619–626 파티클 렌더 초기 준비와 설치 묶음

파티클을 쓰지 않는 장면의 렌더 셰이더 컴파일을 없애고 필요한 세 단계/선택 정렬 두 단계를 기존 작업자에 연결했다. 실제 D3D11 다섯 캐시 종류 거부/복구·동기 정렬 픽셀·일반 래스터/Compute 지속·취소/명시적 개수조회 한 번 제출을 검증했다. 최종 소유권/스타일 검사도 준비 전 유지한다. 기본 래스터/프로브 및 실제 2D/C++/BP 패키지 검사도 통과했다. 플레이어626 빌드 완료. 상세: ENGINE_WORK_623.json, PARTICLE_PREPARATION_619.md. 설치614를 수정하지 않고 다음 단일 배포본으로 갱신한다.

628 설치 bcd8acedc03e95d8/3454전체명세·런타임117소유SHA/검사소스5·User10385전후읽기SHA·연결/Versions1 통과. 설치SDK 파티클5단계/복구/정렬/취소/count와 설치GL/WebGPU 비등방성·회전 이력 복원, 실제 설치packager/player HDRI96광원·프로브/2D/C++/BP/해제를 확인했다. 이전설치180223635B·소유검사exe17620288B 정리. 시뮬레이션 커널 준비와 원장 남은 렌더링·엔진 누적 목표를 계속한다.

### 631–636 첫 파티클 방출 전 준비

시뮬레이션/검색/탄생/Clear4커널을 기존 작업자로 준비하고 렌더/선택 정렬까지 기다린 뒤 에셋을 생성한다. 여러 풀은 GPU셰이더를 공유하고 상태/상수 링은 분리한다. 씬 세대·동시 준비·늦은 정렬·취소/오류를 연결했다. 실제 D3D11 수치/수명/첫탄생 컴파일IO0, Android문법2대상, 동기캐시호환, 실제2D패키지 첫표시/정렬/재열기/해제·프로브/C++/BP가 통과했다. ENGINE_WORK_638.json에 근거를 묶었다. 설치628을 보존한 채 다음 단일 배포본으로 갱신한다.

640 설치 cb8b8bdd2a13d7ba/3460전체명세·소유121SHA/검사소스6·User10385읽기전후SHA/연결/Versions1 통과. 설치SDK 시뮬레이션4커널/독립상수링/첫탄생컴파일IO0/취소와 렌더5단계/복구/정렬/count, 실제2D첫표시/정렬/재열기/해제·프로브/C++/BP를 검증했다. 이전설치180303824B·소유검사exe11689407B 정리. 남은 렌더링/누적엔진 작업을 계속한다.

642–654 source d679b6cd8b11665af85e4e42ac1bf3dacf7bc4d3: 작은 모델 수집·현재/이전/공유 좌표·밉·기본/코팅 TBN·조건별 노멀 snapshot·작은 삼각형 교차와 큰 인스턴스 평행 slab을 구현. 실제3GPU 독립 좌표/현재이전 180광선·3112삼각형5포즈 byte동일·큰월드/소유권 검사 통과. ENGINE_WORK_655에 성공/실패·소유 SHA·남은 곡면/매질/초기 지연을 구분. Player653, 설치 갱신 후 누적 작업 계속.

657 설치 d39948668c05956a/3472전체명세·소유147SHA/검사소스6·User10385읽기전후SHA/바로가기/.hbproject/Versions1 통과. 설치17포즈 GL/GPU tSu8YT·배율노멀YoeOdD·실제2D/파티클/프로브/C++/BP xfLxqs 통과. 이전설치180383810B·이번 소유검사exe8693411B 정리. 원장의 다음 초기지연/곡면/매질과 엔진 잔여를 계속 구현한다.

659–675 source 4351350e75b3b68772c4868eb3116e9d0db160bc: 렌즈 픽셀 기저와 현재/이전 기본·코팅 반사 footprint를 실제3GPU/특화·일반 경로에 연결. 독립 동적입력/전체거울가이드·굴절밉·비등방성 복원과 새Tsl수식의 노멀/공유로컬좌표 통과. 같은IR WGSL62499→61592B/정적좌표호출13→5이며 시간/FPS 개선으로 세지 않음. Player668 현재HLSL본문바이트 일치·불필요재빌드 생략. ENGINE_WORK_677 소유SHA/증거/잔여. 설치 갱신과 실제CPP/BP게임 후 다음 엔진 작업 계속.

679 설치 166ecc1b126c5a58/3487전체명세·소유162SHA/검사소스6·User10385읽기전후SHA/연결/Versions1. 설치662PKl3Pi/665VsMBe1 독립전체가이드·496EJDC4B 새실제CPP/BP/mip/비동기중입력·복원·idle0 통과. 초기wrapper오타는재설치없이원래User SHA로검사재개. 이전설치180489539B/검사exe9806220B 정리. CDP PNG는native색증거에서제외하고정식캡처·명시가이드실행을후속으로확인하며다음렌더링을계속한다.

681–686 source f3c31381a63f5507a4196ccfc136f6d521c7ea0d: 현재/이전 거친 유전체 폭을 실제 radiance 기능 분기에 맞추고 경계 변화의 이력을 거부. 682 GL/GPU30표본·683 특화/일반DX 각15표본 독립 정답/원래4e-5 통과. 기존375 노멀맵 밉·358 비등방성/회전 거부복원·365 decoder·652 수명 보존. 설치679 actual C++/BP10단계/fullguide hbCapture640×360 밝은90104픽셀;14509ms는 미통제 관찰. Player686 새빌드/현재shader본문 포함. ENGINE_WORK687 소유SHA·분리된 실패·잔여를 유지하고 설치와 다음 누적 렌더링 구현을 계속한다.

689 설치 2e756415918c8f40/3494전체명세/168소유SHA/6C++·User10385읽기전후SHA/연결/Versions1. 설치682yGf0Nx GL/GPU30표본·681TvMSy8 SDK/C++/BP fullguide10ready/hbCapture90104밝은픽셀 통과. 이전설치180591789B와소유검사exe3268740B 정리. 다음 배열/볼륨 사용자지정 밉의 제작·실행 연결과 누적 렌더링/엔진 작업을 이어간다.

691–699 source 73793ecc02f69b274d7d2e152bf3b504990c35a3: 배열/볼륨 사용자 지정 밉을 제작 UI/Undo/보기·공용 로더·3API 업로드·광선/베이크·버전 캐시/참조/패키징으로 연결했다. 693 CPU,694Cfp4NO28표본/사람·AI,695wbYaT014표본/10거부,696Qe0jxQ 실제 C++/BP/LOD/typed swap/idle,697OJJwrD+U8y6js 이전기하/시간/노멀(차이0),699한글redirect와460/461/531 회귀 통과. Unity 두API 본문/예제 범위를 기록하고 전체분석 gate는 승격하지 않았다. Player698 새빌드. ENGINE_WORK700 정본으로 설치 후 다음 엔진 작업을 이어간다.

702 설치 d6a3093567e86132/3506전체명세/180소유SHA/7C++·User10385읽기전후SHA/연결/Versions1. 설치694VvqUJH 실제GL/TSL28표본/밉UI/Undo와설치SDK/C++/BP696dFFpcB LOD3·타입교체·키복원·idle통과. 이전설치180670450B와소유검사exe6896842B정리. 다음 사용자지정 큐브/2D 밉·스트리밍과 누적 렌더링/엔진 목표를 계속한다.

704–717 source 7134dfd1a0a1d2cefcc1cc641396aaf6dcb2125a: 큐브/2D 작성 밉을 제작·세API·광선/베이크·원래가져오기정책·워커·C++/BP/패키징까지 연결했다. Cube705/6946HPzdY36표본/695xvWz7B18표본/696SZ96GZ49에셋/697FAMb1i+gLuKxY,2D712/694uOzOH4/695UYKp98/696fEJ13p19에셋/697IjHSRD+yrwyFq와714ZX7omd512제곱3작업/전달후실패복구 통과. 실제이전재현/GL-GPU차이0·기존4e-5/3byte 유지. 453자동worker와CPU회귀 보존. Player698 소유헤더/셰이더가동일해재빌드생략. ENGINE_WORK718 정본으로 설치후누적구현계속.

720 설치 67f3912fd6fcdb45/3515전체명세/187소유SHA/7C++·User10385읽기전후SHA/연결/Versions1. 설치694v0zeX4/OUTNTp36+6표본과정책UI/Undo,696WhytFJ/72TQ3M 설치SDK/C++/BP49+19에셋게임,7143lp8cA 워커3작업/전달뒤실패복구/idle0 통과. 같은도구도각gate마다새모듈실행으로실제검사했다. 이전설치180769323B/소유검사exe3453772B정리. 다음 큐브 픽셀 재포장 비용·남은 렌더링과 누적 목표를 계속한다.

722–732 fe1946a4296644fda87d921f1dd83dfb39f499d1: 이전 시각/노멀/밉을 보존하며 공간 상수 차분·큐브 중간 배열·자동 기본 float 밉 중복을 줄였다. 명시적 RGBA8 네 자료형의 부분 box를 세 API와 C++/블루프린트로 연결했다. 520Utgj28/521YFpj3s16조합,728XYVy6m/UzPSnL 실제 업로드/자원재생성,729bfSH1e24실패배치,696GxDzNY98에셋 각3회12B/추가텍스처0,4968IfeAV 실제 복잡한 광선/C++/준비/캡처/유휴0 통과. GL 준비 ABBA는 유의미한 시간 개선 미입증이며 전체 sRGB 수학식 오차와 부분/전체 일치는 분리했다. 설치 검증 뒤 컨텍스트 복구와 스트리밍/예산·광학 footprint·다른 누적 목표를 계속한다.

734 설치 da025ba0a8981a32/3528전체명세/205소유SHA/8C++·User10385읽기전후SHA/연결/Versions1. 설치728wQnUmA 네 자료형 부분 전송과 동일버전재생성,728Hg2PlJ flip/sRGB 부분/전체일치·하드웨어오차분리,696Wy4zkC 설치SDK/C++/BP98에셋 각3회12B/추가텍스처0/LOD/교체/복원 통과. 이전설치180853653B와소유검사exe4921778B정리. 다음 실제 GL컨텍스트 복구·상주예산/스트리밍과 남은 광학/엔진목표를 계속한다.

736–745 8b242a63f36977778c726be7e29945b302ed0f3b: 선택적 현재·이전 노멀 외피를 기본/코팅 반사·굴절·TIR와 가이드/실제 방사 경로에 연결했다. 738UPQ829/739geYtTj 독립 해석·이전 프레임,740qECd5l/741GxhLXk 전체 필터 폭,743hA7eGZ 32시드 실제 로브,496Ac1rzS 새744플레이어의 CPP·BP 모드/원복·샘플·캡처·작업자0,745 API/볼륨/비트/이력키 통과. 드라이버 atan 이차 폭 오차는 허용치·거리 변경 없이 반각 급수로 개선했다. 736AsXRN0 실제 GL손실/복구 네 자료형 통과. 전체 저장소 소유 캐시 정리 후보0/빈기록미생성. 설치 후 상주 예산·스트리밍과 전역 광학/나머지 엔진 목표 계속.

747 설치 395c41816742fe01/3544파일/227소유SHA/8C++·User10385읽기전후SHA/연결/Versions1 확정. 설치496ywn5AX 실제 SDK/Player744 C++와 BP Y/U 노멀 모드 5회/원복·샘플·캡처·유휴0 통과. 이전 설치180984602B 퇴역, 공용 소유 캐시 추가 정리 후보0. 이후 텍스처 스트리밍·상주 예산과 나머지 누적 목표를 계속한다.

749–752 b58fef35bb6ac6a0001e9c145e5abc60a24be2ef: CPU 광선 밉 변환 재사용에256MiB 기본 예산과 최근 사용/소유자 수명 퇴역을 연결했다. 749 바이트/공유/스냅샷/원자적 거부/명시GC,750Nz82qa 실제 UI·API3360→672→0B,751 16조합 현재·이전 atlas256MiB/보관끄기 SHA동일,496j7u7La 실제CPP/BP/모드·캡처/활성풀5712→0/유휴0 통과. Player744와 네이티브 소유자 SHA는 동일해 재컴파일하지 않았다. CPU 캐시와 GPU/활성 atlas의 예산은 구분한다. UE5.8/Unity6000.7Beta 스트리밍 본문을 추가 읽고 논리/resident 밉·임시 풀·요청/완료/취소/비스트리밍 흐름을 다음 GPU 구현에 등록했다. 설치 뒤 계속.

754 설치 42bd7f485e2671ad/3551파일/233소유SHA/8C++·User10385읽기전후SHA/연결/Versions1 확정. 설치496vQhTBV+750CiIsAn 실제 SDK/Player744 C++와 BP Y/U 노멀 모드 5회/원복·샘플·캡처·유휴0 통과. 이전 설치181143217B 퇴역, 공용 소유 캐시 추가 정리 후보0. 이후 텍스처 스트리밍·상주 예산과 나머지 누적 목표를 계속한다.

756–772 f0202fc7700dc094d451e2fb8fda8439c3e503b5: 실제 GPU 상주 view/원본 LOD와 영역 픽셀, 자동 머테리얼 페이로드 예산·카메라/UV/우선순위·전환 예약/취소·C++/블프 -1자동복귀·실제 UI/AI를 연결. 757/758 실제3API 할당,759 픽셀/UV 경쟁,760 광선,761/7620/4B부분전송,7671만 CPU계획,768두재질 예산,696EXzJIx 98에셋 실제Player769,77111z8HA CAS/Undo/Redo20→4→20→4,5202UwSnd/521bqbh7t 이전+Y/현재+Z resident노멀·기존16조합/10회귀 통과. GPU heap/디스크 IO·보조뷰/절차미분·전역 광학/초기 컴파일 및 다른 엔진 잔여 유지. 설치773 후 계속.

773 설치 5f363c3a4bd985da/3571파일/251소유SHA/9C++·User10385읽기전후SHA/연결/Versions1 확정. 설치771i8o7lc 실제프로파일러/AI/Undo/Redo20→4→20→4,696bfs0I7 실제SDK/Player769 C++와블프 네자료형 0/1/2상주·수동/자동복귀·0/4B영역수정·경로색 통과. 이전설치181219075B퇴역. 이후 디스크IO/글로벌광학/초기컴파일/누적엔진 작업을 계속한다.

775–786 0a1f5e224526df96d4f0c4887f46bb882694bd47: 생성 미사용 피연산자 제거·보수적 무광/굴절 가이드·이전 클록/입력/노멀/밉 검증·주프로그램 재사용. 실제 무광ABBA 일반4411.9/4270.0→3057.0/3073.7ms(약29%, cold/FPS/거울 전체 아님), GL/GPU8조건4e-5와9회귀. 검은781초기모드 기록은 시각완료 근거에서 철회; 첫 GLatlas에 CPU뒤행만 쌓여 BVH누락 원인 수정. 785실제전체Float32·행전송·dispose/샘플러/장치복구/다중renderer, 781l1k2U9 실제C++/BP6상태·표면/원시값·CPU/GPU일치와 PNG 확인. 설치787 뒤 디스크mipIO/복잡GL/전역광학·누적목표 계속.

787 설치 716790b7110b14dc/3585파일/266소유SHA/9C++·User10385읽기전후SHA/연결/Versions1 확정. 설치785C4DcTk 실제GPU전체Float32·행전송·실제장치복구·다중renderer,781xR2sHW 설치SDK C++/BP6상태와가시경로/원시표면/atlasCPU-GPU일치 통과. 이전설치181433986B퇴역. 디스크mipIO와누적잔여계속.

789–798 839aa7fd4d85f85e12d995bac6c36ea378ab2cdb: 사용자 지정2D 디스크꼬리 읽기·공유/취소·현재/후보pin과폐기·기존상주풀/C++/블프·미리보기기반버튼/CAS/Undo/Redo·불변AI계약 연결. queued/active worker·가져오기이미지취소와완료후보/해제view직접픽셀 정리. 12회귀+453기존worker/759네자료형,790실제HTTP/worker,792GL/GPU초기1이미지 decoded4→20→84→4→84B,793D3D8상태실제SDK/C++/BP/경로와14의존성,794실제UI/저장,795공유읽기/2abort·stage/source0,797NPOT세로바이트동일/크기실패원자성 통과. payload≠전체RAM/heap, 2D처리없는명시체인에한정. 설치799 뒤 다른디스크쿠킹/전역광학/복잡GL/누적목표 계속.

799 설치 ddbb6d5f0518e98b/3597파일/276소유SHA/9C++·User10385읽기전후SHA/연결/Versions1 확정. 설치794YE2BWa 실제UI·CAS/Undo/Redo/저장,795aO25FE 실제HTTP공유·2abort·미완료/완료후보와source0,793aI3iGv 설치SDK C++/BP·D3D래스터/경로8상태 통과. 이전설치181552763B퇴역. 다음 실제그래프/보조뷰수요·누적광학/엔진목표 계속.

801–807 9d2fdf4d37b2e28a93dffa188a70f68f343753c9: 같은 실제sampler/sourceNode·그래프 UV 선형계수/현재 파라미터/Time·LOD/gradient/bias 수요를GL/GPU/native연결. 비선형보수/예산·관련의존캐시유지. 실제GL/GPU22샘플 full원본차이0(4e-5), D3D SDK C++/블프0→3→1→0→3과래스터/경로동일, CPU독립계수12조건/13회귀/기존8풀조건. 예산/장면의owned IO취소·미제출0·새수동요청보존·3실제HTTP중단/source0. GL/native주프로그램유지만승격, WebGPU pipelineidentity 미계측표기정정. 화면bounds추정/비선형·삼각형·보조광학·쿠킹·복잡GL·누적잔여유지. 설치808뒤계속.

808 설치 dba5a88a0535ea83/3606파일/283소유SHA/9C++·User10385읽기전후SHA/연결/Versions1 확정. 설치803K7o6Fa 실제GL/GPU22픽셀수요오차0/GL프로그램,805jjLTGk 실제HTTP풀취소3·새수동보존·source/stage0,804KoI1m7 설치SDK C++/BP D3D0→3→1→0→3과래스터/경로동일. 이전설치181676627B퇴역. 거리장AO 구조 검토와원장렌더링/엔진목표 계속.

810–825 27bb97a7cac1552ac1e12cce57050eadb690251a: 화면 깊이 AO와 별도 실제 메시 거리장·worker 취소/유휴·기하/인스턴스 공유·BVH·강체prefix행과GL/GPU/D3D원뿔차폐. 810분석적1008점/813독립600점·1100인스턴스196608B, 실제두GPU조회64점3.17e-7·빈공간0, 817간접132→103/직접67유지, 818패키지CPP/BP[195,205,172]일치/직접[118,122,75]보존,822사람속성/Undo/Redo/CAS/저장,11회귀·27구문·738현재/이전노멀9조건3.73e-8. 예전304의샘플링표/중첩미분검사만정정,실패증거제외. 전역거리장·시간필터·방향차폐·큰메시한계/HWRT및전체누적원장유지. 설치827다음계속.

827 설치 4c2f71c37d2e13f9/3623파일/304소유SHA/9C++·User10385읽기전후SHA/연결/Versions1 확정. 설치817jMkoka 실제두GPU간접132→103/직접67동일,822DJktR2 사람속성/Undo/Redo/CAS/저장,818Wu5jwp CPP/BP D3D차폐일치/직접보존/강체복사0,804설치SDK UV5조건/래스터/경로원본일치. 이전설치181785374B퇴역. 전체원장작업계속.

830–839 7ba548916a57a502c3ad0d78c211060cccc41c49: 면/edge/대각선 검증 도형의 정확거리·일반볼륨보존·CPU삼각형3000점2.28e-13, 실제GL/GPU혼합72점4.76e-7·큰2000평면atlas352B/볼륨0/간접132→109·직접67, D3D CPP/BP[201,211,180]동일/직접보존. 예산1→2→1MB decoded0→1048576→0·실패진단/기본도형유지·worker유휴0. 바깥Float32 BVH경계 모서리독립대조, 기존worker취소/12회귀. 원장전체잔여유지. 설치841후복잡GL준비등계속.

841 설치 C:\Users\kirby\HBEngine\Versions\7c51d901e64e2b01/3630파일/309소유SHA/9CPP·User10385읽기전후SHA/연결/Versions1 확정. 설치831cyXre8큰평면352B/간접132→109/직접67,814XQpbqL혼합72표본최대5.12e-7,837DaNa1S예산1→2→1MB·볼륨0→1048576→0·유휴0,822m1duvB사람/CAS/Undo/저장,818FGXKWN CPP/BP/direct동일,804LH4RTt이전UV래스터/경로. 이전181947170B퇴역. 복잡GL준비와누적원장다음작업계속.

843–859 e74ffd1635f23e527cd0e18be798f2a2ad3e79d5: ANGLE 고정성분·이전BVH 공용경계, mirror/Time/큰UV ABBA4727.95→3825.05ms 한정관측/노멀변경0·353경계·3크기기하·직교가림·실제순서D3D매질1.63e-7. 843 IR공유후보 개선미입증/미적용. 합성FXC 역순/전체초기지연 등 누적잔여보존. 새Player854/Host855. 설치861후계속.

861 설치 C:\Users\kirby\HBEngine\Versions\813ffe31de904554/3642파일/321소유SHA/9CPP·User10385읽기전후SHA/연결/Versions1 확정. 설치847JBZqgH9노멀/수정전후0,849ZKvdQO353경계,369z3yuEL12가림,781nmmeIl실제CPP/BP GL6전환/화면,804eIbRVN실제D3D5밉수요/래스터·경로. 이전182034964B정리. 누적원장계속.

863–876 80f71529d5039a2d6ebb65776b9f6f17bb5a4898: 값/차분 고정채널·기존 동적형식/일반값수정/key호환, 실제GL/GPU18·D3D9/오차0/잘못된메타4거부. 현재이전normal/coat GL/GPU6·D3D12/해석4.79e-8. Split xyzw·in-place scalar/vector 밉수요 수정, 실제CPP/BP GL6전환과D3D밉0/3/1/0/3·래스터/경로.13회귀·Player871/Host872. GL3060.85→2475.95ms해당그래프관측;최초겹친측정제외. 설치878뒤계속.

878 설치 C:\Users\kirby\HBEngine\Versions\4f2e4bd66cd7c5b0/3654파일/332소유SHA/9CPP·User10385읽기전후SHA/연결/Versions1 확정. 설치864VZEKsm18채널/기존형식,866oxGaJv6노멀/수정전후0,781q43Lub --channels실제CPP/BP GL6전환/화면,804ivHDSn --channels실제D3D5밉수요/래스터·경로. 이전182144675B정리. 누적원장계속.

880–904 582c1c419d4995dba5e96c8a95ccbcb61377a71c: 기하별8..최대해상도 예산적합·보류재시도·0볼륨정확도형·55/15/8동시필드·예약/품질진단. CPU/GL/GPU/D3D 동률가지치기/0하한종료,논리읽기21502→40/4757→39값유지.2^24초과scalar정수주소6조건(128B단위증거).9CPU회귀·실제worker취소/재시도/idle0·편집/CAS/Undo·최종Player901/Host902·실제CPP/BP D3D adaptive818VFwhoO. 초기GL/FXC와전역클립맵등잔여유지. 설치906뒤계속.

906 설치 C:\Users\kirby\HBEngine\Versions\3cc1a911d4cc8463/3665파일/341소유SHA/9CPP·User10385읽기전후SHA/연결/Versions1 확정. 설치8814TJCWi예산/보류/idle0,884Q5A0sx조회21502→40/4757→39값유지,886vWIUt7정수주소GL/GPU12조건,818xw8A0U실제SDK CPP/BP adaptiveD3D게임. 이전182255184B정리. 누적원장계속.

910–916 4b3f37375dea44a130817c7b827a486b7dd85fcc: 기존필드보존·이중페이로드예산 안의 자동품질교체,새기하우선,용량10%히스테리시스,최종작은단계/얇은레이아웃.실제912ALuwAg 55/15교체·정적40프레임새작업0·취소/idle0.913CPU4/문법5,881OaQXDW·822n2jUML유지.실제SDK CPP 표시변경→D3D25→53교체/같은CPP·BP픽셀818d8JGTA. native9소유/binarySHA동일로901/902재사용.911명시밉샘플후보3839.25→4160.95ms악화로미적용;초기지연잔여유지.설치918뒤계속.

918 설치 C:\Users\kirby\HBEngine\Versions\3fd112869f7d1713/3671파일/345소유SHA/9CPP·User10385읽기전후SHA/연결/Versions1 확정. 설치9125v5X0D원자교체/55·15/새기하우선/idle0,881iTolQL예산/재시도,822sJTUOK사람/AI/Undo,818SvPIZF실제SDK CPP 표시변경→D3D25→53승격/동일CPP·BP픽셀. 이전182376650B정리. 누적원장계속.

940–946 1a00e6abb6dedc79bb0391d2ca5a25c78715d341: Panner 기본Time의CPU closedVolume의존누락수정.직접평가false/true와캐시false/false불일치해결.940s3Fe5z6종/기하패킷/동일clock객체/정적프로그램재사용,941bjB5B9실제D3D스택/IOR/RGB12조건최대1.624e-7,866ry6NBo실제GL/GPU노멀6조건차이0,942회귀4종.930–937FXC역순추가조사후보전부미승격/오류잔여유지. Native9/binarySHA동일901/902재사용.설치948뒤계속.

948 설치 C:\Users\kirby\HBEngine\Versions\c006b922fb1c171a/3677파일/349소유SHA/9CPP·User10385읽기전후SHA/연결/Versions1 확정. 설치940TgsELo실제설치모듈6시계/패킷,941qg0flW설치SDK·셰이더/매질12조건,866D9bTpI설치GL/GPU노멀6조건차이0,818TuVShg실제SDK CPP/BP게임. 최초940검사정리함수의경로오류는안전규칙을유지한repo소유I/O복사로resume950에서동일설치본에이어검증/재설치없음. 이전182469721B정리. 누적원장계속.

951–966 c551b2798643715145aee4cf1064ad5b5088c732: CPU수집별선택그래프/문맥독립표면/머테리얼전용기하재사용·이전프레임보존.953전체패킷4조건,956문맥독립12조건,958시계분류/이동,960변형·슬롯·포즈·인스턴스등28상태,962회귀8종/128GC수거,941실제D3D매질12조건,781GL실제CPP/BP6상태,804D3D실제CPP/BP밉0/3/1/0/3+path.961최종전체CPUprepare ABBA864개5001.92→48.61ms/균일384개2225.07→13.91ms;게임FPS/초기GL/FXC개선주장없음. Native901/902동일9owner/binarySHA재사용.설치968뒤누적계속.

968 설치 C:\Users\kirby\HBEngine\Versions\7f0929f5ba72d5cd/3690파일/361소유SHA/9CPP·User10385읽기전후SHA/연결/Versions1 확정. 설치953UhzFUq 실제설치모듈패킷4조건/타이밍생략,941erS3gH설치SDK·셰이더매질12조건,781XECeT3실제SDK CPP/BP GL6상태,804tDWtmb D3D밉5상태+path. 이전182563796B정리. 누적작업계속.

970–976 2d41fdeb08a587b4ae8896007b3044a83bc4c684: DirectX일반래스터기하노멀차분→기본/코팅거칠기정책누락수정.970PWBD3G 실제최적화하드웨어래스터8종/독립픽셀쿼드오차0.001894/평면·unlit·발광차이0/곡면최대77.804WY4QYo새Player973 실제SDK CPP/BP밉0/3/1/0/3+path. 새Player973/Host974/9소유SHA/mtime뒤컴파일. UnityHDRP지정본문/함수와기존Three정책구분·미독등록;분산/방향성normal/pathAA전체완료아님.설치978뒤누적계속.

978 설치 C:\Users\kirby\HBEngine\Versions\b06eb627c57e8e78/3694파일/364소유SHA/10CPP·User10385읽기전후SHA/연결/Versions1 확정. 설치970hdJbkW 실제설치헤더/최적화래스터/수치및기본이미지소스동일·이전참조재사용으로중복컴파일절반생략,804i8NxDm 실제설치SDK CPP/BP D3D밉5상태+path. 이전182701518B정리. 누적작업계속.

980–1026 9e359245d31f57bf7561a51066e88c35e4d162f6: 실제Complex141 지연 구간과 미승격 후보4종 별도 기록. affine 반사 영향/투영·월드페이드·미세영역·코팅/이방성·큰정적메쉬경계 후보 구현. CPU/D3D/GL/GPU540·독립교차2240·100정적프레임경계캐시·물리4종기준픽셀차이0·세실제SDK CPP/BP5단계 캡처1회. 새Player1001/Host1002/10소유SHA·mtime. 사용자설치1028검증후누적진행;전체완료아님.

1028 설치 C:\Users\kirby\HBEngine\Versions\e2af582843d454f2/3719파일/388소유SHA/13CPP·User10849읽기전후SHA/연결/Versions1 검증. 설치9898Ajkvt GL/GPU540·992NfyWqI 물리4종기준0·설치994 실제SDK CPP/BP 원점밖메쉬5단계/캡처1. 이전182791975B 정리. 1029뒤이전노멀/머테리얼/밉이력의범위·안정정규화후속구현계속.

1030–1046 c39195998344d4cc9fa57123351fd07a14b25252: 변경전GL/GPU49중14실패각→최대성분 스케일 뒤 모두통과·독립CPU56/실제3GPU49·현재/이전 Float노멀밉·음수크기/움직임 대조. 실제세SDK CPP/BP 래스터/path30상태 동일기준픽셀·새Player1040/Host1041/10소유. Complex141 decoder만 ABBA path7575→7403/guide5479→5771ms(guide+5.3%가능성),성능최적화성공아님·전역초기지연잔여. 설치1048후누적계속.

1048 설치 C:\Users\kirby\HBEngine\Versions\3c8ee6dda5dbbcad/3728파일/399소유SHA/14CPP·User10849읽기전후SHA/연결/Versions1 검증. 설치1030Z0hRCb GL/GPU49·403pjGcX9 이전노멀/Float밉·1036kgr7OH 실제SDK CPP/BP 래스터/path10단계. 이전183008944B 정리. 1049뒤누적렌더링계속.

1050–1062 9aa5a345bd5b780bf6f8f42b35204dc66dc52c81: 인스턴스 경계/반사·지형408B/폴리지64B 실제부분업로드·GPU새할당0·격자500광선/최신요청/장면소유/공용15단축키/AI조회. 여러구현뒤한묶음검사, 기존1057 증거재사용, native10 SHA일치로 Player1040/Host1041 재사용. 설치1064전이며 전체FPS/모바일/엔진완료 주장없음.

1064 설치 C:\Users\kirby\HBEngine\Versions\8d6bbf025175ea5d 전체3748파일/423소유SHA/CPP14·User10849읽기전후SHA/연결/Versions1. 설치1060Gd7dHJ 실제GPU408B/64B·새버퍼0/Undo/AI/재지정,994hAXLVn 실제SDK CPP/BP5상태. native10 SHA일치로재컴파일0, 이전183129246B정리. 1065묶음완료;누적잔여는정본원장유지.

1066–1070 d9cc629b64b193ed0d1d0f5f834b4729fac7b35d: 위젯 상속/슬롯/지역 초기표시/런타임 생명주기·복합행/바인딩/문맥/공유예산·거대 논리스크롤/입력·공유 글꼴·사람/AI/Undo/콘텐츠 수집을 묶어 구현. CPU/실제숨긴창 관련6검사 약19초, 네이티브 재컴파일0. 설치1072 준비. 전체엔진/FPS/모바일 완료 주장은 없음.

1071 84a0e48cce39825f7dfb1cd8c256e13fb95fcb71: AI 빠른 시작이 실제 로컬 설치 마커와 원장 이전 영수증을 구분. 격리 마커/기존 CLI 검사 통과; 1066 위젯 묶음과 함께 한 번 설치1072 예정.

1072 설치 C:\Users\kirby\HBEngine\Versions\412358fb4a17500d /3764파일/446소유SHA/CPP14·User10849읽기전후SHA·연결·Versions1 검증. 설치 실제1067RFw5l3 위젯/목록/생명주기/공유폰트/스크롤/예산/AI/Undo 통과, context 실제마커 대조. 네이티브 재컴파일0·이전183337859B 정리. 남은 범위는 단일 원장 유지.

1074–1075 2d47b2ef90c0728f84d6bfbc94f62a33a0b6ff2c: 사람/AI 월드 편집의 중복 전체복사2→1, 지형8모드/폴리지5연산·평활화/Undo/실패복원. 20003인스턴스 샘플 CPU 약64–79→23–34ms. 전체 FPS 주장은 없음. 설치1077에서 실제 편집/GPU/AI/Undo 경로 검증 예정; UI1072와 native지문 증거 재사용.

1077 설치 C:\Users\kirby\HBEngine\Versions\884e599a4157ab0e /3769파일/449소유SHA/CPP14·User10849읽기전후SHA·연결·Versions1 검증. 실제1060yl9khC 월드 AI/Undo/공유편집·GPU408B/64B/새할당0·실제마커 대조. UI1072 동일소유 증거와 native10 지문 재사용·재컴파일0·이전183490860B 정리. 1078 확정.

1079–1082 목록 제작/실행 묶음: 94296c1420ae169439bc703c2b7bb6ffdde89cc0 · 선택모드/다중/범위/초점/입력격리·평면 재정렬/자료교체 드래그취소·행 양방향 형식보존 쓰기/원본불변·고정행 부분 refresh·사람 상세/AI/Undo/custom event. 1079 CPU5그룹, 실제1080RIUFur 100000선택/풀8/행수정/이벤트·1067bF77ML·1749/1816/2564 회귀. 전체JSON검증/직렬화·트리재부모화·터치·복합측정/접근성·GL초기지연 등 잔여 유지. 설치 갱신 대기; ENGINE_WORK_1082.json 참조.

1084 설치 C:\Users\kirby\HBEngine\Versions\67a9e17734d12595 /3777파일/454소유SHA/CPP14·User10849읽기전후SHA·연결·Versions1 검증. 설치 실제1080 목록100000선택/풀8·재정렬/형식보존행쓰기/재활용/이벤트·offset재구성0·편집Undo/정상종료와 실제마커. native10 지문 재사용·재컴파일0·이전183579323B 정리. 1085 확정. 누적 목표 active, 렌더링/엔진의 나머지 세부 구현을 계속해요.

1086–1094 거리장 렌더링 묶음 25382772fa28c88f51c0b2e97a1eecaad159b4b7 · 기하별 카메라 footprint LOD/보수적 공유·낮춤250ms/기존필드/취소/입력·교체예산·정지/TAA 투영메모/0인스턴스해제·사람/AI CAS/실제 CPP/BP/세렌더러. 표본128KiB→2KiB→128KiB·복원픽셀/직접광 보존. 초기 GL SSA 후보 약1%/74B는미채택·관측성없는픽셀비교통과계산금지. 전역clipmap·정밀도보장/전체FPS·나머지누적목표유지. ENGINE_WORK_1094.json/설치갱신대기.

1096 설치 C:\Users\kirby\HBEngine\Versions\f2302f2ab6c1a864 /3792파일/464소유SHA/CPP14·User10849읽기전후SHA·연결·Versions1 검증. 실제 설치 worker 취소/기존필드/예산/0인스턴스·GL/GPU128KiB→2KiB→128KiB/복원/직접광/프로그램유지/TAA투영0·실제CPP/BP/native AO·상세/Undo/CAS/저장·마커. 엔진native재컴파일0(사용자CPP fixture는실제컴파일)·이전183682748B 정리. 1097 확정. GL초기지연·전역clipmap 및 누적목표계속.

## 2026-10-21 거리장 사전쿠킹1098–1102

d003320584e6c4e632d1b1ca9d5a17a26ee3ea2b ·ENGINE_WORK_1102.json·DISTANCE_COOKING_1101.md. 도형/OBJ/glTF/GLB·외부버퍼/삼각형SHA·중복/결정 바이너리·공유128MiB 보관·패키지/목록32MiB·정상/취소/손상복구·세타깃 설정·runtime 검증/소유fallback·C++/BP/AI. 1098-9BBG3v 9그룹,1100-6Ymv0a GL/GPU hit2→3·복원/직접광/프로그램/TAA,1090-vN91ge 실제CPP/BP/D3D 초기workerStarts0,1088-2gmKD3 취소/예산/정지·포즈/API/탐색/문법 통과. 설치 전환과 최종 근거는 후속영수증. 글로벌/FBX·월드·다중LOD·편집기쿠킹 및 누적목표계속.

1104 설치 C:\Users\kirby\HBEngine\Versions\54c85d6c7b3cb9b8 /3802파일/476소유SHA/CPP14·User10849읽기전후SHA·연결·Versions1 검증. 설치 GL/GPU hit2→3·복원/직접광/프로그램/TAA·실제CPP/BP/native 최초workerStarts0/축소·복원·마커. 엔진native재컴파일0·이전183812964B 정리. 1105 확정. 전역거리장·초기GL지연 및 누적목표계속.

1106–1112: 5ce6990638ff9404f0a108edc23d228ff0ae5f01 반사 두후보/환경잔여·회전/해상도·자원수명·CPU현재포즈/캡처전컬링·UV없는기본/코팅노멀 보호. 실제GL/GPU독립혼합오차<1e-6,각24노멀조건·포즈/수명·SDK/AI탐색 관련묶음 통과. 최종설치1114에서세백엔드CPP/BP재확인예정. scope본문만읽고전체gate유지. 원장RND03잔여를전역후보/우선점유/임의변형으로정리;장기목표active유지.

1114 설치 C:\Users\kirby\HBEngine\Versions\a24629862c1045b8 /3817파일/489소유SHA/CPP14·User10849읽기전후SHA·연결·Versions1 검증. 설치GL/GPU 혼합/0→2후보/환경회전·해상도/프로그램/자원·각24노멀조건,실제CPP/BP모프/원점밖후보를D3D/GL/GPU red→ambient→red→ambient→red/캡처1로통과. 엔진native재컴파일0·이전183940914B 정리.1115확정;전역후보/GL초기지연및누적목표active계속.

1116–1131 전역 반사 후보/혼합해상도 HDR atlas·D3D 컴퓨트 이웃면/세면패딩·정지전송/밝기metadata·GL/GPU/강제GL폴백·실제CPP/BP4영역을 연결. ENGINE_WORK_1131.json에 소유SHA/CPP15/native13·API/AI·표본필터/실제세실행기 근거를 확정. 설치1114유지/1133전환예정. 공간가속/큰장면성능·우선점유/sphere/lightmap·native직교/ambient 및 누적78행 잔여유지,전체gate미승격.

1133 설치 C:\Users\kirby\HBEngine\Versions\c63f7ab57518b40d /3834파일/504소유SHA/CPP15·native13·User10849읽기전후SHA·연결·Versions1확인. 설치GL/GPU/강제GL폴백4영역/4인스턴스·각54gradient금속/코팅·직접쌍회귀와실제CPP/BP세실행기4영역/밝기복원·정지캡처/복사/패딩통과. Player1123재컴파일/Host불변재사용. 이전184080356B정리.1134확정;공간가속/우선정책·native직교/ambient·GLComplex141초기지연과누적목표계속.

1135–1141 카메라/주변광/공용그래프·native노멀을묶어구현. native54조건,GL/GPU/폴백각38조건·atlas기존회귀·실제CPP/BP넓은직교카메라4상태를독립기대값으로대조. ENGINE_WORK_1141.json에소유SHA/CPP16/native13·새Player1139·48B기존CBpayload기록.1133설치확정과후속1143전환예정구분.내장GPU전체Physical시선/추가로브·공간가속·GL초기지연및누적목표유지.

1143 설치 C:\Users\kirby\HBEngine\Versions\4940d1afed664464 /3843파일/511소유SHA/CPP16/native13·User10849읽기전후SHA·연결·Versions1확인. native54조건·GL/GPU/폴백각38조건·전역atlas각54gradient회귀·실제CPP/BP세실행기직교카메라4상태×3픽셀통과. Player1139새빌드/Host재사용.이전184296040B정리·1144확정.내장GPU전체Physical/추가로브·공간가속·GL초기지연/누적78행계속.

1145–1149 GPU물리시선/원본·작성굴절·막간섭XYZ/산란·명시읽기수명 구현.24시선/16물리·독립분광31×2·읽기29/잔류0·atlas세모드각54·CPP/BP실제GPU게임6상태×3픽셀·API/AI통과.원오차기준유지.현재설치1143,새설치1151준비.전체원장78행/연구gate미승격.

1151 설치 C:\Users\kirby\HBEngine\Versions\fe2c6e136bd7e741 /3857파일/525소유SHA/CPP16/native13·User10849읽기전후SHA·연결·Versions1확정. GPU/폴백각시선24·물리16·독립분광31·굴절·읽기29잔류0·atlas각54·실제CPP/BP세실행기6상태×3픽셀통과. Player/Host재빌드생략.기존184414405B정리·공유캐시{"deleted":0,"bytes":0,"receipt":null}. 설치손상220파일은명세SHA복원후전체명세/실제빌드검사.손상원인미확정.누적원장78행/전체연구gate계속.

1157–1163 CPU후보/세GPU·native공간BVH·rank/Float32/정수표현·재사용/소유진단 묶음구현. CPU/CPP2242점·CPU800조건·GPU세경로2242점씩 선택/가중치차0·기존atlas54/21방향통과. Player1161 한번빌드/Host재사용. 성공gate소유SHA로재사용;새설치1165준비. 4096은선택기검사이며전체캡처FPS아님.

1165 설치 C:\Users\kirby\HBEngine\Versions\4c985f883deb3b48 /3868파일/534소유SHA/CPP17/native14·User10849읽기전후SHA·연결·Versions1검증. 이미통과한CPU/GPU/atlas/native4gate재실행없이재사용. 설치본CPP/BP세실행기4공간이동·밝기/복원·노드7/공간재구성불변통과. Player1161한번빌드·이전184557150B정리·공유캐시{"deleted":0,"bytes":0,"receipt":null}.전체HDR/FPS·다른누적엔진목표유지.

1167–1175 기본texture normal/공유HDR·SH/144B부분전송/65536높은count단어/해제진단을함께구현. native1344+8·GL유효72·세브라우저공유2/4영역·기존54/21방향·실제glTF C++/BP광원5상태통과. Player1173한번빌드. 실패는fixture전용API/Windows매크로수정,허용오차완화없음. 통과gateSHA재사용. 설치1177예정,Versions1/User보호유지.

1177설치 C:\Users\kirby\HBEngine\Versions\7b49a6ca25d1389f /3878파일·542소유SHA·CPP19/native14·Player1173/Host1041·실제glTF노멀C++/BP5상태(D3Dsource동일Player/설치GL/GPU)·User10849전후읽기SHA·연결·Versions1확정. 선행5gate/D3D게임재실행없이재사용. 이전184711586B정리·cache{"deleted":0,"bytes":0,"receipt":null}.

1179–1181 세브라우저 프로브변경행/여러prepare대기변경/full우선/GL상태복원/진단을묶음구현. 두밝기288B 대조전체1008B·정지0·실제세렌더러픽셀/복원/인스턴스/해제통과. Player1173/Host1041·native14/CPP19동일SHA재사용으로빌드/native게임검사반복없음. static1180 API/AI통과,설치1183준비.

1183설치 C:\Users\kirby\HBEngine\Versions\da1acaad81e62420 /3882명세·544소유SHA·native14/CPP19·Player/Host재사용. 설치전용한검사에서GL/GPU/폴백변경288B/전체1008B·대기변경·경계전체갱신·정지0·픽셀/인스턴스/해제통과. User10849읽기SHA·연결·Versions1·이전184838887B정리. CPP/native게임재실행없이기존증거재사용. cache{"deleted":0,"bytes":0,"receipt":null}.

1185–1188 native설정CPU재포장생략·자료4B인덱스/786432B감소·불량원자검증·분리구간정책/진단 묶음구현. 영향native2gate만실행·HLSL/raster동일증명으로노멀/브라우저재검사없음·Player1186한번빌드/Host재사용. static1187 AI인계5KB실패는인계3535B축약후해당정적검사만재실행통과. 설치1190예정.

1190설치 C:\Users\kirby\HBEngine\Versions\fc81d47f83b22276 /3884명세·544소유SHA·CPP19/native14·Player1186/Host1041·설치실제CPP/BP4영역/밝기복원 layout1고정/fast0→1→2 확인. User10849전후읽기SHA·연결·Versions1·이전184934509B정리·cache{"deleted":0,"bytes":0,"receipt":null}. 영향native2gate만묶어서검사했고동일노멀/브라우저검사는재실행하지않음.

1192–1199 Sphere영향/투영·배치/조건속성/helper·C++/BP3함수·source순위slot유지·수치안정성을묶어구현. CPU520/GPU3×520/native1040/4HDR구/직접3×160·기존box54/21방향통과. source1197선행게임9상태는preliminary로분리,최종1197b/음수비균일Actor의설치3backend검사예정. 상대좌표·단위구·inside C보호로정밀도수정,오차유지. 공식읽기는특정구역/등록이고전체gate미승격.

1201설치 전환 후 Sphere 패키징에서 scene 음수scale 거절 실패를 보존. 1203–1206은 씬·편집·복제·BP/C++·생성/풀/저장/물리/네트워크/시퀀스와 D3D 월드·혼합instance 반전 면/법선을 함께 수정. native48/Rapier2D·3D/CPU520/nativeSphere1040·4HDR/문법18·API/AI 통과; 마지막JS float경계는CPU만재검사/native성공재사용. 동일브라우저수식반복없음/Player1204한번빌드. 후속설치3backend9상태예정.

1208설치 C:\Users\kirby\HBEngine\Versions\dbe05b234ccf2a71 /3899명세·571소유SHA·CPP21/native16·Player1204/Host1041·실제D3D/GL/GPU각9상태통과·4HDR capture/copy불변·User10849전후읽기SHA·연결·Versions1·이전185156718B정리.1201실패보존후수정으로해결;가짜성공아님.

1210–1214 블루프린트 출력·실행입력합류·변수승격연결·중첩핀값·C++ 기본값·AI경로를 함께 구현. CPU1668핀/1699확인·실제C++·8출력/65case·실제GUI 추가/삭제/UndoRedo/AI/Promote/Play/기존VM통과. sourceSHA동일VM성공재사용·Player1204/Host재사용,렌더전체검사없음. CPP01의customstruct/enum·SetMembers·CollapsedExpand 미구현3군을원장partial로바로잡음. 후속1215실제설치패키지검사예정.

1217설치 C:\Users\kirby\HBEngine\Versions\771aa0ffcc7421e4 /3907명세·586소유SHA·CPP21/native16·Player1204/Host재사용. 실제설치builder Windows패키지D3D11에서5/8/8동적분기·승격Get/Set·기존실행선유지·자동int변환·중첩Transform·새모듈2개포함통과. User10849전후읽기SHA·연결·Versions1·이전185246846B정리. cache{"deleted":0,"bytes":0,"receipt":null}. 과거Sphere설명복제문자열만scope정정(원문보존),실제검증필드변경없음.

1219–1224: 2D 네 부모 클래스·Actor/Pawn 강제메시 해제·생성/배치/Spawn/GameMode·C++ 형식/배열/원래 위치·실제 에셋 컴포넌트 뷰포트/공용 조작/AI/닫기 해제 함께 구현. 실제 Rapier 점프·탑다운XY·CPP/Spawn50확인, 실제 GUI Sprite2x2/OBJ3정점·수정·투영·설정원자성·닫기재열기·idle추가 draw/build0, 기존Spawn/공유nativeworld·AI26경로·변경17JS/API통과. SDK변경후Player1223한번빌드·Host1041재사용. 설치패키지는1226예정, 반복렌더매트릭스없음. 기존누적잔여/CPP01구조체·SetMembers·CollapsedGraph유지.

1226설치 C:\Users\kirby\HBEngine\Versions\832bf441d776a979 /3917명세·600소유SHA·CPP21/native16·Player1223단1빌드/Host재사용. 설치builder 실제WindowsD3D11 게임에서2D GameMode·C++typedSprite/원래Pawn[3,4,0]/witness[3,42,0]·키보드XY이동·모듈포함통과. User10849전후읽기SHA·연결·Versions1·이전185382122B정리. cache{"deleted":0,"bytes":0,"receipt":null}. sourceGUI/CPU/회귀/API/AI 성공SHA재사용, 전체렌더매트릭스없음.

1228–1232: 접힌 그래프 독립/중첩·문서간 복제·함수/매크로/그래프 펼치기·타입 reroute/기본값/단위scale/분할/배열·주석/관찰·순수preview/VM·지연·선행exec합류·Exec터널추가삭제/Undo/AI를함께구현. 42핵심확인+6형배열·실제GUI우클릭/더블클릭/Exec/Undo/dryRun/복제삭제/E합류실행·상속17회귀·기존1699핀/실제CPP·VM·변경12JS/API·AI조회통과. 후반합류수정은현재CPU/GUI확인,이전VM/flow는해당실행owner불변근거로재사용. Player1223/Host1041/native16불변으로네이티브재빌드·렌더매트릭스없음. 설치패키지1234예정. CPP01잔여는customstruct/enum·SetMembers·Timeline/wildcard/외부참조확장으로구체화,다른원장잔여유지.

1234설치 C:\Users\kirby\HBEngine\Versions\b86864f151e2861e /3925명세·607소유SHA·CPP21/native16·Player1223/Host1041재사용. 설치builder Windows D3D11 실제접힌/독립복제/펼친/순수/Delay흐름 Actor[5,6,7]/Witness[9,8,7]통과. User10849전후읽기SHA·연결·Versions1·이전185523991B정리. cache{"deleted":0,"bytes":0,"receipt":null}. 재빌드/전체렌더반복없음.

1236–1237: 최종경계검토에서상속authoredGraphContext가매번필터배열을반환해view추론불가/부모scope중복가능확인. 명시view·부모노드/edge/comment보존·자식thin저장/parentfold편집거절·부모내부graph숨김보완. 모델UrHGWe및현재42/배열6종XicC16통과. VM/preview/pin값/native16/Player/Host불변으로이전실제패키지성공재사용. 설치1239의상속자식실제GUI/Play만추가확인,렌더전체나네이티브재빌드없음.

1239설치 C:\Users\kirby\HBEngine\Versions\cd3ef798dbdc6e3f /3928명세·608소유SHA·CPP21/native16·Player1223/Host재사용. 실제설치에디터에서자식우클릭접기/얇은저장·부모접힌BeginPlay와자식E모두실행·AI펼치기/부모문서보존통과. 이전D3D11게임패키지성공은불변VM/native근거로재사용. User10849전후읽기SHA·연결·Versions1·이전185661498B정리. cache{"deleted":0,"bytes":0,"receipt":null}. 해당경계만확인, 재빌드/렌더전체반복없음.

1241–1245: 기본5구조체 Make/Break/선택 Set Members·비노출 보존·변수/중첩/배열/함수/접힌호출 참조·같은함수후속읽기/무작위인덱스고정·10종+배열Select·Switch고정값/순서/Name/구형호환·C++Struct.hpp/AI2명령/스키마연결. 묶음syntax/API/모델53/CPP/flow1708/접기42/상속/AI/실제에디터통과. 속성선택변경스크롤보완은설치GUI에서확인. native16/Player/Host불변재사용·전체렌더/FPS반복없음. 사용자구조체/enum·일반native참조와기존누적잔여유지.

1247 설치확인: Versions/67bedf32e5d1c172·3937명세/615소유SHA·기존native16/Player1223/Host1041재사용. 설치GUI Tz5WE0 필드/우클릭/Undo/AI/선택scroll초기화/Play, 실제D3D11패키지im5Hub 위치[10,20,30]통과. User10849파일SHA보존·바로가기/연결·Versions1·이전185757267B정리·빈캐시receipt없음. 전체엔진완료아님/누적원장잔여유지.

1250–1255: 구조체/C++/분기1247설치후멈추지않고Shot/SubSequence추가. 구간localtime/offset/rate/loop·Shot상위row·누적priority·자식채널복원/seek/stop·이벤트cut/loop경계·취소/순환/원본보존·drag/trim/context복제삭제/원본열기·실제preview대상fit/follow·AI2명령·공용패키징검증. 모델15/기존load4/priority4/completion3·AIcontext·실제최종GUI V94xOn 통과. native16/Struct.hpp/Player/Host불변재사용. 원점/timewarp/가중blend/부모문맥/Take/썸네일등잔여유지.

1257 설치확인: fbe3037f251ced44 · 3944명세/623소유SHA. 이전구조체/C++기능보존·최종sourceGUI재사용·실제설치D3D11패키지부모1.25초/소스offset으로위치[7.5,0,0]통과. native16/Player/Host재사용·User10849파일읽기SHA보존·연결/Versions1·이전185902069B정리. 전체누적잔여유지,원점/timewarp/부모문맥/혼합/Take/썸네일을완료로계산하지않음.

1259–1262: 시퀀스1257설치후네트워크관심위치전수순회축소. 가변반경3D버킷·전역/소유자·known이탈숨김·루트자식재색인/부모변경구링크정리·같은셀재사용/빈목록회수·요청통계/AI. 모델oracle100질의/10만희소자료32질의후보1/실제socket11+기존6검사약2초통과. 게임FPS/밀집RAM측정아님. 기존게임/UI/네이티브소유불변이므로재검사없이설치서버socket만확인.

1264 설치확인: 91fb64b56b370689·3949명세/627소유SHA. 설치서버sockets-only 5검사: 원본모듈은설치경로에서로드하고초기/interest/root재지정/owner/delete/빈메타확인. 10만oracle는이전소스검사SHA근거로재사용·설치에서재실행하지않음. 기존게임/UI/CPP/native16소유불변·User10849읽기SHA·연결/Versions1·이전186035699B정리·빈캐시receipt없음.

1266–1270: 시퀀스 변환기준점·이동액터/상속·부착local·수명/복원·공용Hermite/커브/탄젠트drag·타축auto보존·AI2명령을실제제작/Play로연결. 모델17·기존시퀀스30·sourceGUI MjRTWI/배치입력검사·AI context성공. 초기GUI관찰축/기울기기준과CSS클리핑실패는보존하고수정경로만재검사. native16/Struct.hpp/CPP21불변으로기존빌드/CPP근거재사용;설치D3D11게임1회대기. GL1313B/6노드읽기는시간개선성과아님/RND06잔여유지.

1272 설치확인: 0247274dedde87b2·3960명세/640소유SHA·실제설치D3D11패키지 RyNmLm: curvedchild/sourceoffset/중첩회전기준점 [10,7.328125,0] 확인. User10849읽기SHA/연결/Versions1·이전186143448B정리. native16/CPP21/Struct.hpp/Player/Host불변재사용·전체렌더/GL컴파일/FPS/모바일재검사없음.

1274–1278: 가상Tree재부모/같은group목록간가지·중복원시값이동·양쪽선검증/동시반영뒤VM이벤트·선택/초점text/자료교체·거부원자성·Alt들여쓰기/내어쓰기·창탐색capture충돌수정·상세/Undo/schema. pure11·기존1079/1749/1816·최종GUI M5yWOV/같은창1080(10만/pool8/복합입력)통과. 초기키보드실패는보존·영향경로만재검사. native16/Struct.hpp/CPP21/Player/Host불변재사용·설치D3D11UI1회대기. 터치/외부창/전용CPP이동API잔여유지.

1280 설치확인: 0905a17245e24ec7·3969명세/648소유SHA·실제설치D3D11UI V9hTcI: BP UI::Show 생성목록에서가지a/b→q→r와평면중복값이동·양쪽게임스냅샷확인. User10849읽기SHA/연결/Versions1·이전186285111B정리. native16/CPP21/Struct.hpp/Player/Host불변재사용·렌더행렬/초기GL/FPS/실기기터치반복없음.

1282–1290: 꺼진곡면WebGL가이드정적특화·켜짐/기본·공용수식보존·준비키/취소/이력/AI진단·기존노멀/타깃재사용. pure7/16조합·실제QLNCoo전체307200raw-half차이0·제품IKzoLx on/morph/off119451변화/해제통과. 보조관측6276.9→1859.1ms/제품1827.4;주경로7169.2ms잔여·전체cold/FPS주장없음. 실패도구/관측0기준거부보존. native16/CPP21/Struct.hpp/바이너리불변·설치WebGL1회대기.

1292 설치확인: 0fe30fb4d3910392·3974명세/651소유SHA·실제설치WebGL2 7POqXU 전체가이드기준동일/on·morph·off/노멀·타깃재사용/해제성공. 첫 DS7Nrz는격리WebView탐색실패(webError0)·CDP연결실패로보존후해당설치게임만재시도·재설치/광범위검사없음. User10849읽기SHA/연결/Versions1·이전186424054B정리. native불변/주경로지연잔여.

1294–1296: 공용가중Bezier·축별0..1/기본1/3/비가중연산동일·시간역산·BP/애니/Sequence재생·실제핸들길이/기울기/다른축/반대길이/Undo·AI검증/낮은창축글자왜곡수정. pure9/240독립표본·기존1266 17·GUI lKaCSM 실제입력/드래그/중첩BP위치[10,4.125,0]통과. 초기부동소수테스트결합/변경없는쓰기revision가정실패보존후도구만수정. 공식지정본문등록supplemental1294·전체gate상승없음. native불변재사용·설치D3D11게임1회대기.

1298 설치확인: f35ec9cbe6b653b5·3979명세/654소유SHA·실제설치D3D11게임 LUYlOd에서BP Play/Pause/Seek·축별가중곡선/중첩기준점/소스오프셋→독립위치[10,4.125,0]통과. User10849읽기SHA/연결/Versions1·이전186535112B정리. native16/CPP21/Struct.hpp/Player/Host불변재사용·렌더행렬/실기기/FPS반복없음.

1300–1308 주경로진단: 기준7066.5ms·5후보6757.8/7030.7/6786.8/6942.5/6832.1,전체307200raw-half차이0이나확실한속도개선미입증·제품미채택/구현성과0. fresh변환HLSL73893B첫구역/지정함수크기·GL오류0보존.1300동적사설모듈/1301해제패스대기도구실패보존·기준재사용후후보만검사.같은5후보/1086반복금지.설치1298유지·재설치/전체행렬없음.

1309–1312: 곡선pre/post 유지/선형/반복/오프셋/왕복·음수/경계/가중매핑·키복제없음·세샘플러·골격clip범위UI/cubic·가중검증/실제AnimationGraph·key생략AI/Undo/맞춤. 모델9 eRDXlL·가중9/240·기존시퀀스17/retarget·GUI AblPc4 실제범위입력/핸들/Undo/AI/중첩BP [10,44.125,0]통과. 공식지정Infinity본문/Unity API발췌 supplemental1310·전체gate상승없음. native불변·설치D3D게임1회대기. 주GL진단1308은제품미채택유지.

1314 설치확인: b0360f510260b375·3987명세/663소유SHA·실제설치D3D11게임 LUYlOd에서BP Play/Pause/Seek·축별가중곡선/2오프셋반복/중첩기준점/소스오프셋→독립위치[10,44.125,0]통과. User10849읽기SHA/연결/Versions1·이전186651678B정리. native16/CPP21/Struct.hpp/Player/Host불변재사용·렌더행렬/실기기/FPS반복없음.

1316–1326: 곡선ClampedAuto/선택평탄·각도정렬·인접기울기·값필터·affine·베이크/축약·골격그래픽·AI/Undo/단축키와 대형키 이진조회/스트리밍맞춤/표시밀도를 연결. 실제65536키 전체선택/표시3101 유지·10모델/15600표본/가중9·240/Infinity9/실제AnimationGraph/GUI 14JfLO·ElP4hN 통과. 공용C++/BP목록API5·실제CPP실행/2단계검증·정적삭제전송2000개/관심32회0B·기존socket5+6 통과. 공개SDK Game/Bridge 변경에 따라Player1321 한번26.2초빌드·다른14native/CPP21/Host불변. 전체연구/엔진완료아님·주GL잔여유지·설치검사대기.

1327 설치확인: 295e05b305710815·4003명세/678SHA/CPP21. 설치패키지 실제D3D11 BP Show→새 SDK 사용자C++ 조회/평면이동/재부모/두종류전송, 설치서버 실제소켓 삭제2000/관심32회0B·late/resume/redelete 통과. Player1321/Host1041·User10849읽기SHA/연결/Versions1, 이전186775022B 회수. 바뀌지 않은 렌더행렬·실기기 반복 없음.

1329–1331: 같은state청크의broadcast지역직렬화공유·연결별증가번호가드·UTF8최대1MiB·동일row참조비교/메타진단. 실제9연결129상태에서JSON생성3/재사용24·혼합owner/번호순서·1MiB초과전송/공유peak936502B, 삭제7·기존관심5·network6·AI경로통과. native16/CPP21/Player1321/Host불변·C++/GUI/렌더재빌드반복없음. 변경된설치서버소켓검사1회대기.

1333 설치확인: 2722c0ef1812c5fd·4007명세/680소유SHA·설치서버9연결/129상태 생성3·재사용24/혼합view·순서/공유936502B 상한 통과. native16/CPP21/Player1321/Host불변·1327의실제D3D11CPP/UI근거재사용. User10849읽기SHA/연결/Versions1·이전186956860B 회수. 새컴파일/프로필/캐시누적없음.

1335–1338: 선택기존키경계 베이크/외부보간·범위밖·가중/Clamped끝기울기 보존, XYZ등가Euler/360연속화·회전semantic·키총예산/정렬/FP끝점·골격scalar/null복원. 모델9/외부808/방향1000·기존10/15600·가중9/240·Infinity9·GUI YJbmUq 실제UI/Undo/AI/BP 위치[.5,1,0]/회전[0,91.5,0] 통과. 곡선트랙선택기/축행/재생줄가림·Clamped라벨수정. 원인진단KXclZh로숨은timeline버튼0rect확인·잘못된수정가설/검사quoting은성과제외. native불변·설치게임1회대기.

1340 설치확인: 84b0673742812b68·4012명세/683SHA·설치helper의 부분베이크/Euler키생성과 실제D3D11 BP Play/Pause/Seek 위치[.5,1,0]/회전[0,91.5,0]통과. native16/CPP21/Player1321/Host불변. User10849읽기SHA/연결/Versions1·이전187062310B회수. 전체연구·누적완료선언없음.

1342–1350: typed 단일곡선키copy/cut/paste/상대시간·전체shape/핸들·정밀동일시간교체·예산/원자성, 공통재지정/입력분리, Sequence상하playhead동기화, BP Timeline실제graph저장/문서소유id/창유지/UndoRedo갱신/삭제해제, typedAI revision/dryRun/Undo+focusRoutes, relay관심/숨김/pending중간배열제거. 모델11·기존10/15600·GUI Tv1Oj7 실제BP[1,2,0]·owner401KLs·socket7/7/5/6·late430/136·AI9관찰. native16/CPP21/Player1321/Host불변·설치영향gate대기. 전체누적목표/전체분석완료처리안함.

1352 설치확인: e89f44cf0549b010·4020명세/689소유SHA. 설치helper키붙여넣기→실제D3D11 BP[1,2,0], 설치BP창저장/UndoRedo/삭제해제, 설치relay10연결/430snapshot/136hide 통과. native16/CPP21/Player1321/Host불변. User10849읽기SHA/연결/Versions1·이전187182096B회수. 누적목표/연구전체완료로처리안함.

1354–1362: opt-in 우선캡처/부분경계/환경나머지/구·상자/직접·atlas/반사·굴절공유, 기존9행144B·캡처/복사/layout보존, SetPriorityBlend·공용bool노드·Inspector/Undo/AI. Three0.180 Vector4 w비교를source/소비bundle 재현패치로수정(prepare/배포검증), 중복전송/복원누락해결·unused bundle비대상. CPU401·sphere520·실제3backend각3200/오차7.71e-7·D3D8192/오차1B·굴절8/오차0·실제CPP/BP5상태/4캡처150copy1layout·GUI/스키마/AI통과. Player1360 한번24.67초/새55bd14…·Host불변, 4native소유변경/old21검사재실행주장안함. cache145415411B기존정리확인. source커밋b94ed98/ffe0258·설치영향gate대기, 다른잔여/전체분모null유지.

1364 설치확인: 629220bbab426e05·4031명세/698소유SHA/22repository검사/2vendor. 설치실제GL/GPU/fallback각3200오차7.71e-7, 설치패키지D3D11 CPP/BP5상태·캡처4/copy150/layout1, 설치Inspector/Undo/AI 통과. Player1360 55bd14…/Host재사용/4native변경. User10849읽기SHA/연결/Versions1·이전187330829B회수. SourceNative8192+굴절8/오차1B/0 및cache145415411B정리근거유지. 전체렌더러·엔진·연구완료처리안함.

1366–1374: DirectX probe/2D 상수3슬롯성공cache·실제3000draw각3upload/2997skip·CPU1584B/GPU추가0, SRV만이미지교체/강도/제거·2D mask/layer/blend/cookie/freeform/stencil통과. Player1369 한번24.65초/da86f16d…/Host불변·native2변경1신규; 실제C++/BP5상태와캐시진단·2D typedPawn/좌표/XY입력통과. Timeline Undo후현재track/wire동시삭제/한Undo·실제F2rename/close/reopen. AI focusRoute3파일169KB vs전체891파일7.31MB, missfallback/--all/범위·schema. 기존잔여유지/전체분모null. source6a7b6de·설치영향검사대기.

1376 설치확인: 065f943a22f4e5fb·4040명세/705소유SHA/25repository검사/2vendor. 설치실제CPP/BP5상태/캐시skip증가·2D typedPawn/좌표/XY입력·Timeline graph교체/트랙배선한Undo/F2rename/close/reopen통과. 설치context3소유파일/마커일치. Player1369 da86f16d…·Host불변. User10849읽기SHA보존·연결확인·Versions1·이전187482137B회수. 전체분모/잔여null정책유지.

1378–1382: 키 사이 Bézier부분베이크·외부기울기/가중보존·범위밖/수직형식원자거절,80case292400관찰/8.88e-15; Butterworth FFT 저고역/Hz/차수/강도·등간격/키수시간/채널유지·774해석값/7.11e-15·65k121.56ms편집CPU. 실제우클릭/옵션유지/Undo/AI dryRun/stale/Sequence·skeletal·BPTimeline저장·Play2.5→1.1477749통과, 기존9/808/1000Euler+10/15600회귀통과. 정확owner5파일54KB·schema. Native17/CPP검사25/Player/Host/vendor불변재사용·무재빌드. Epic지정재독/전체분모null·다중curve/Chebyshev/rig잔여유지. sourcef9fae1f·설치대기.

1384 설치확인: e2d58e23b010e60a·4047명세/710소유SHA/25native검사/2vendor. 설치실제우클릭FFT/임의경계/Undo/revision/dryRun/stale/Sequence·skeletal·BPTimeline/저장·실제Play, 설치helper로패키징한D3D11 위치1.1477749147734875통과. Native17·Player1369/Host SHA불변/재빌드0. User10849읽기SHA/연결보존·Versions1·이전187619526B회수. 전체잔여/분모null유지.
