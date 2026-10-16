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
