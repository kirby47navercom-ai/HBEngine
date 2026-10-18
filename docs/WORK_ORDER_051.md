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
