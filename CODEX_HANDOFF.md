## Windows 네이티브 분할·다중 카메라·전용 에셋 · 2026-11-13

가로·세로 문서 분할과 크기 복원, 분리 그래프 속성 및 동일 문서 리비전 동기화, 게임 카메라 합성·영역 선택, 시퀀스 키·탄젠트와 플레이 녹화, 직교·아이소메트릭 타일맵, 스프라이트 애니메이션, 오디오 파형과 머테리얼 함수·레이어 편집을 연결했어요. 격리 Win32 검사 `native/build/native-authoring-YvFzVN/report.json`의 편집·저장·D3D12 플레이가 통과했어요. 머테리얼 함수·레이어 공용 검사도 통과했어요. 자세한 조작과 문서 명령은 [EDITOR_NATIVE.md](docs/EDITOR_NATIVE.md)를 참고해요.

## Windows 네이티브 탭 도킹·전이·곡선 · 2026-11-13

탭 순서 변경, 창 밖 드래그 분리와 탭 줄로 복귀, 상태 전이 조건·혼합 편집, 시퀀스 키 보간·범위·트랙 곡선 명령을 연결했어요. 격리 Win32 검사 `native/build/native-authoring-UYcsY1/report.json`에서 분리·복귀 입력, 전이 속성과 곡선 키 저장, D3D12 표시를 확인했어요.

## Windows 네이티브 상태 그래프·시퀀스·이미지 · 2026-11-13

중첩 상태 그래프와 상태별 포즈 연결, 시퀀스 샷·하위 시퀀스와 순환 검증, 스프라이트·텍스처 캔버스, 프로젝트별 독립 문서 창 복원을 연결했어요. 격리 검사 `native/build/native-authoring-3PditO/report.json`에서 Win32 창·D3D12 표시·저장·복원을 확인했어요. 애니메이션 그래프·몽타주 런타임과 시퀀스 구간 15개 검사도 통과했어요.

## Windows 네이티브 빌드·플레이·독립 문서 · 2026-11-13

`tools/build-desktop.mjs --native-editor-only`가 WebView2 SDK 없이 네이티브 실행 파일을 빌드해요. 공용 게임 런타임의 D3D12 플레이, 경로별 독립 문서와 충돌 검사, 몽타주·시퀀스 타임라인과 포즈·행동트리·상태 머신 그래프, 빌드 프로필 복제·삭제를 연결했어요. 다음 작업 범위와 격리 검사는 [EDITOR_NATIVE.md](docs/EDITOR_NATIVE.md)를 참고해요.

격리 검사 `native/build/native-authoring-kOW1Yw/report.json`에서 네이티브 EXE의 플래그 없는 시작, WebView2 미로드, 독립 문서 두 개, D3D12 장면·그래프·미리보기 및 패키징 없는 D3D12 4프레임 플레이를 확인했어요. 사용자 설치는 보류 상태예요.

## WebView 없는 Windows 장면·에셋 편집 · 2026-11-13

네이티브 문서 편집기에 D3D12 장면·계층·속성 편집, 애니메이션/커브 키 타임라인, 위젯 캔버스, 블루프린트 멤버·주석 생성, 에셋 가져오기, 저장 충돌 복구, 배치 복원과 빌드 프로필 선택을 연결했어요. `tools/check-native-authoring.mjs`가 화면 밖 Win32 창에서 장면 픽셀과 저장된 편집을 확인해요. 전체 도킹·전용 미리보기·편집기 내부 게임 실행은 [EDITOR_NATIVE.md](docs/EDITOR_NATIVE.md)의 남은 범위를 참고해요.

## WebView 없는 Windows 제작 경로 · 2026-11-13

`HBEngine.exe --native-editor`에서 프로젝트·문서 명령, 노드 편집, 에셋 속성과 문서 분리/합치기를 Win32와 공용 프로젝트 서비스로 연결했어요. 그래프·속성은 같은 D3D12 장치를 사용해요. 검사는 `tools/check-native-authoring.mjs`. 기본 편집기 전환에 앞서 장면 뷰포트·전용 에셋 편집기·전체 도킹과 나머지 대화상자 연결이 필요해요. 상세 기능과 실행 경로는 [EDITOR_NATIVE.md](docs/EDITOR_NATIVE.md)에 있어요.

## 대량 에셋 탐색 설치·정리 · USER_INSTALL3443 / 2026-11-10
9790ee757264eac2·5417files·80owner/편집기 PE/Node SHA. 격리 Windows 편집기12,000파일/1,500폴더/2,519자 경로·저장/외부 변경/재시작 복원 검증과 동일 소스. Versions1·소유 Engine 정리·재현 프로젝트/소스/증거 보존. 사용자 프로젝트/창/프로필 불변.

## 대량 에셋·긴 경로 탐색 · WORK3442 / 2026-11-10
전체 프로젝트 반복 스캔과 경로 1,000/2,000자 불일치 수정. 현재 폴더/하위 검색·취소·폴더 가상화·열린 문서 변경 확인. 실제 숨긴 편집기12,000파일·1,500폴더·2,519자 한글 경로 읽기/쓰기/외부 변경/재실행 복원, 대기 중 전체조회0. PE/SDK·사용자 프로젝트/창/보호3 불변. PROJECT_BROWSE_SCALE.md 및 WORK3442 참조.

## JSON 제한 수정 설치·정리 · USER_INSTALL3441 / 2026-11-05
2d39ca554b5790b2·5413files·68owner/PE SHA·설치11묶음:5000JSON/5000표·공용/네이티브어댑터/웹모바일HTTP512씩 통과. SDK/PE동일SHA재사용·Versions1·소유Engine정리·source/baseline/보고서 보존. 파일누적수제한제거·캐시LRU/메모리예산 유지·기존게임재패키징필요. 원본/금지3/사용자창/공유WIP 보호·예약/goal/agent0.

## JSON 누적파일 제한 제거 · WORK3440 / 2026-11-05
createPersistentQueries의256파일throw 제거·shared LRU/추정payload32MiB로보관·퇴출후재읽기/중복동시요청/스냅샷격리/실패재시도/세션clear 유지. 이전257번째실패재현·새5000JSON+5000표·공용/네이티브어댑터/웹모바일HTTP512씩·11묶음/기존에셋캐시 통과. SDK/PE변경0·실C++/휴대폰/GUI/FPS검사아님. 공유WIP/원본/금지3/사용자창 보호·예약/goal/agent0. RUNTIME_DATA_CACHE.md·WORK3440 및 후속설치 대조.

## 다중 카메라 설치·정리 · USER_INSTALL3439 / 2026-11-03
efed7aac955ad918·5410files·64owner/PE SHA·설치 계약45 통과. 실제DX11/WebGL/WebGPU는 소스/PE exact SHA 근거 재사용. Versions1·소유 Engine/검사package/프로필 정리·sources/보고서/캡처 보존·dist PE동기화. 게임 분할/PiP/입력/카메라별 이력·편집기 독립 카메라 선택/추가미리보기 연결. 보호player실행 때문에 전체편집기셸은 제외, 공용 미리보기/툴바 격리실행. 기존게임 재패키징 필요. 외부WIP4파일은 겹쳐 원본working 보존·우리 canonical만 index/설치. 예약/goal/agent0.

## 다중 카메라 · WORK3438 / 2026-11-03
게임 Camera 화면 분할/PiP/사용자 영역/순서·가장 위 출력 조준·편집기 카메라 선택/선택 카메라 추가 미리보기 연결. 장면/장치 공유·카메라별 후처리/이력·GPU 합성 후 Present1·미사용 해제. 실제DX11 11장면(5카메라/혼합투영/픽셀여백/TAA/resize/해제), WebGL21·WebGPU2·계약45·기존뷰포트413 통과. 전체 편집기셸은 금지player실행 때문에 로드하지 않고 공용 미리보기/툴바를 격리 실행. 전체 엔진 목표/성능 완료 아님. 공유외부WIP·원본·사용자창·금지3 보호·예약/goal/agent0. MULTI_CAMERA.md·WORK3438 및 후속설치 대조.

## 바이너리 렌더 설치·정리 · USER_INSTALL3437 / 2026-11-03
276176917dbd5c9e·5402files·48owner/PE SHA·설치실제8MB×12 pixels/legacy/8범위/33packing 통과. 최종PE ed926eee 원본4K패닉60.18초193.3200FPS·p99 7.4414ms·최장45.6160ms(uncapped/숨김/무음). Versions1·소유 Engine/4게임package/검사runtime 정리·sources/보고서/캡처/단일legacyPE 보존·dist PE동기화. 기존게임 재패키징필요. 전체 엔진/모든PC/무지연 완료아님. 공유WIP/원본/금지3/사용자UI 보호·예약/goal/agent0.

## 렌더 픽셀 바이너리 전송 · WORK3436 / 2026-11-03
4.6–9.9MB 문자열 업로드35–85ms 경로를 바이너리/청크수신으로 교체. 최종8MB×12 중앙84.02→4.45ms·pixels/33packing/64청크42오류/8범위/61frame/수명/clock 통과. 실제 원본4K패닉 최종60.18초193.3200FPS·p99 7.4414ms·최장45.6160ms(uncapped/숨김/무음);118대 target120과직접비교금지·전체무지연/다른장면/모든PC완료아님. 원본/금지3/사용자UI/공유WIP 보존. 설치후속3437대조·예약/goal/agent0.

## UI 정규화 설치·정리 · USER_INSTALL3435 / 2026-11-03
4bb29909610aafbd·5395files·36owner/PE SHA·설치256값/Cpp full·delta wire 통과. PE/SDK 3433 exact SHA 재사용. Versions1·소유 Engine/실제게임 검사 package 정리·sources/단일 frozen 원본 보존. 성능 여유 합격 표시는 하지 않음. 현재 CPU 부하46.5%/가용RAM3.6→6.2GB 조건의 짧은97.49FPS는 앞 표본과 인과 비교 금지. 다음 소유자 native-transport::reconcileImmutableNativeJSON, native-ui-frame::encodeNativeUIFrame, NativeWidgetLayer.draw. 전체 엔진 잔여 유지·게임원본/사용자창/금지3파일/공유WIP 보호·예약/goal/agent0.

## UI 정규화 추가 감소 · WORK3434 / 2026-11-03
검증·동결된 자식 재순회/중첩 JSON 캐시 제거·root 캐시 보존. 실제 크기 CPU0.898→0.726ms(전체FPS 아님)·256값/완전동결/Cpp wire·실제UI48 pixels/hit/worker byte 동일·lazy/목록/worker 검사 통과. 120 초과 지속 여유 기준 유지. canonical source만 배포·게임/사용자창/금지3파일/외부 WIP 보존. 설치 후속3435 확인.

## 프레임·직접 UI 설치 · USER_INSTALL3433 / 2026-11-03
e6a3dd2a1e5c96f6·5393files·36owner/PE SHA·설치 clock/실제 직접 UI pipe·worker pixels/fallback/close 확인. Versions1·소유 Engine/중복 패키지20개 정리·변경 sources/원본 frozen/UI replay 보존. 120 이상 성능 여유·tail 개선은 계속 진행해요. canonical만 설치·공유 WIP/게임원본/사용자창/금지3파일 보존·새 예약/agent/goal0.

## 프레임 병렬·UI 직접 ACK · WORK3432 / 2026-11-03
scene/UI 순서 독립·UI worker direct binary ACK·stock framework clock 2→1RPC·불변 row delta·setter/검증/패킷 할당을 묶었어요. 기본120 pacing 보존/명시 uncapped. pixels/hit/실제 C++/수명/오류 묶음 통과. 숨김 무음 정상3장 일반10초138.3869FPS·p95 9.9993ms 관측, 120 이상 여유·꼬리 지연 확보는 진행 조건으로 유지. 게임 모듈/콘텐츠/원본저장/금지3파일/사용자창 불변. matrix 힌트/생성 copier 미채택. canonical source만 설치하고 공유 WIP 보존. WORK3432와 후속 설치 기록 대조.

## 설치·정리 · USER_INSTALL3431 / 2026-11-03
3f4771be4b2ecccc·5384files·30owner/PE SHA·설치 실제 글꼴5/목록1만행24frame·click-across-paint 통과. Versions1·소유 Engine/중복패키지3개 삭제·sources/원본 frozen 게임/UI replay 보존. WORK3430 기능 설치이며 전체120/총RAM/VRAM 검증은 아님. 공유 작업트리 layer 외부 변경은 보존하고 canonical만 배포. 예약/새agent/goal/게임원본/사용자창/금지3파일 변경0.

## 글꼴 공용 수명·목록 워커 · WORK3430 / 2026-11-03
프로세스 공용 Skia font 참조/내용 family·마지막 미사용 해제·빈/투명 지연 로드, 기본 한글 fallback 유지. List/Tree 메인 페인트 fallback 제거·worker 상태 revision/권위 입력/새 선택·scroll 보존. 글꼴5·1만행24·worker16·타이포96·실제 UI48 pixel/hit 일치. 실제 숨김 저장10초106.16/107.66 관측, UI p95 미개선·120/전체RAM/직접12 미합격 경계 유지. 금지3파일/게임원본/사용자창/예약/agent/goal 변경0. 설치 후속3431에서 확인.

## 설치 확인 · USER_INSTALL3429 / 2026-11-03
89aac7fbab369d30·5380files·27owner/PE SHA·실제 Skia worker16case 통과. Versions1·소유 Engine/중복 패키지11개 정리·재현 sources/단일 frozen 게임/UI replay 보존. WORK3428의 UI 최적화 배포이며 전체 FPS 합격으로 해석하지 않아요. 게임원본·사용자창/프로필·금지3파일 변경 없음.

## WORK3428 · 실제 UI 명령 재생 / 2026-11-03
게임 원본 불변·실제 UI48/합성128/타이포그래피96/worker16/첫 프레임 공용 API 통과. Skia 변환 순서 유지하며 leaf Text 상태·폰트/색·worker 자산/계층 재사용. 실제 UI 재생 중앙5.5092→5.1551ms, p95 6.6536→6.3346ms; 전체 FPS 아님. 느린 partial-readback/clip·JS 행렬·반복문 단독·scalar 실험 제외. frozen 재판/UI replay는 native/build/frame-cost-ijcsFT에 있고 원본·사용자창 불변. 남은 원장/PER-01/120 미해결은 그대로. 금지3파일/예약/agent/goal 변경 없음. 설치 기록은 후속 USER_INSTALL3429로 확인.

## 설치 후속 전환 · USER_INSTALL3427 / 2026-11-03
3e050d79e49e73f4·5377files·26owner/PE SHA·설치 실제 Skia/전역복원/오류 archive 해제 확인. 네이티브 PE/SDK는3424와 exact SHA 재사용,3426 반사 패킷 대조 연결. Versions1·소유 Engine 즉시 정리·sources 보존. 120/전체PC/직접12/장시간GC 합격은 여전히 아님.

## 자원 범위·반사 좌표 후속 · WORK3426 / 2026-11-03
설치3425 뒤에도 구현을 이어서, 디코딩된 픽셀 전체 재복사 제거·이전 전역 훅 descriptor 복원·host 종료 실패 뒤 hbdata 해제·동시 close 공유·조명/반사 위치 matrixWorld 재사용을 추가했어요. 실제 Skia pixels/독립 버퍼/오류 해제 및60lit×12frame/반사 probe/전체 패킷 일치·중복좌표720→0. Present0/highres timer 기존 경로 확인,60고정 가설 채택 안 함. 120/누적 목표 완료 아님. 설치 상태는3427 영수증/실제 마커로 대조해요.

## 사용자 설치 전환 · USER_INSTALL3425 / 2026-11-03
3a109a1720985855·5374files·26owner/PE SHA·설치 공용 API2개·Versions1 확인. WORK3424와 동일 SHA actual release C++/UI/입력/종료·DX12-11on12 HW/WARP/재판 근거 재사용. 소유 Engine/중복 패키지12개 정리, 재현 sources/보고서/캡처 및 단일 frozen 게임 보존. 41.8GB는 하드링크 논리합이지 물리 회수량 아님. 설치 후 다른 설치본 실행은 보호하고 GUI/부하 재검사 안 함. 120미합격/전체PC/직접D3D12목록/장시간GC는 후속. 게임원본·사용자창·프로필·금지3파일·예약·agent·goal 변경 없음.

## 엔진 비용·자원 수명·DX12 호환 · WORK3424 / 2026-11-02
UI 불변 가지/변경 키 재사용·Buffer 타일 탐색/독점 패킷 이전·비입력 글자 행렬 생략·세계 행렬 위치 재사용·순서 보존 묶음 업로드를 연결했어요. dirty view/렌더 이벤트/unused module world/queued CPP child 종료·cache lease·오류 뒤 전체 해제를 교정했어요. report 전용 GC/각 isolate 메모리·CPU·UI 단계 관측 추가. 실제12장치/queue/fence/3-buffer와 D3D11On12 호환 HW/WARP/재판 실행, nativeCommandLists=false·기본11 유지. 120미합격/모든PC/네이티브12전체/GC pause 합격 아님. WORK3420의 옛 QA FPS는 측정 중 layout/주기 출력이 켜진 표본이어서 일반 실행/새 훅 비교로 쓰지 않아요. 최종 숨김20초 60.853/69.840은 외부 부하 미통제 관측만. 설치 상태는 후속 USER_INSTALL3425와 실제 마커를 대조해요. 게임원본/사용자창/금지3파일/예약/goal/agent 변경0. 공유 WIP 보존·canonical 후보만 index/설치.

## 삭제 자원 GC 회수 · WORK3422 / 2026-11-02
설치59c56a17의 실제 모델/아틀라스/지연 이미지 소유 모듈을 검사했어요. 128인스턴스·16원본·304WeakRef 전부 회수·풀 픽셀 유지·cache source/lease0·dispose16 통과. 검사 자식에만 강제GC; 제품 변경/새 설치 없음. 장시간 게임/GC pause/C++ heap/GPU 메모리 전체 합격 아님. USER_INSTALL3421/Versions1·소유 중복검사37개 정리와 단일 frozen 재현본 보존 유지. 원본/사용자창/예약/agent/goal 변경0. WORK3422 및 NATIVE_RUNTIME_COSTS.

## UI·자원 수명·실행 호환성 · WORK3420 / 2026-11-02
USER_INSTALL3421/59c56a17eb91063a 전환·48owner/PE SHA·설치 actual SDK UI RPC 통과·Versions1. 소유 Engine/중복 패키지/검사 PE 정리·정확한 재현용 frozen baseline 하나 보존.
소유 Engine 후보에 UI worker/binary tile, frozen row 비교 코드 재사용, 전역 아틀라스 마지막 참조 해제, 풀 첫 준비/실제 삭제 presentation 정리, glTF 공유/숨긴 이미지 디코딩 지연, 오디오 장치/WARP fallback을 연결했어요. 일반 실제 재판 52.54→100.66FPS, Auric 같은 위치 114.35→116.08FPS. 목표120미합격·일반/계측 분리·입력 지속 시간이 다른 이동 후보/실패 실험 제외. 새 PE·SDK 실제 RPC·타일360pixel·UI16frame·수명/오류 검사 통과. 설치 요청 활성, 최신 설치 근거는 후속 USER_INSTALL3421에서 확인해요. 공유 작업트리 NativeWidgetWindow/native-widget-layer/native-ui-frame의 외부 변경은 그대로 보존했고 index/설치는 검증된 canonical snapshot만 사용해요. 금지3파일·게임원본·사용자창/프로필·예약/agent/goal 변경 없음. DX12·120·다른 물리PC/백신·누적 잔여 전체 완료로 표시하지 않아요. 상세 ENGINE_WORK3420/NATIVE_RUNTIME_COSTS.

## 게임플레이 읽기 비용 · WORK3418 / 2026-11-02
USER_INSTALL3419/3dcb5bd65c89553c 전환·8owner/PE SHA·설치 actual SDK RPC 통과·Versions1·소유 Engine/fixture EXE 정리 완료. C++ 게임플레이 조회의 전체행 dirty/다음호출 비교 제거.78조회·32기본값·10누락/범위·4모호성·mutable/setter 직후읽기/다음RPC복원 actual release worker 통과.500객체 조회+복원 p50 2.6762→0.6286ms,p95 3.6875→0.7585ms,p99 7.1393→0.8778ms·각512표본/4교대. IPC/물리/렌더/전체FPS 아님.40frame smoke 성능증거 사용금지. renderer PE/source unchanged exact SHA 재사용·새 SDK 실제 컴파일. 설치요청 활성·Versions1 유지. 금지3파일/게임원본/사용자창/WIP보존·예약/agent/goal없음. WORK3418·NATIVE_RUNTIME_COSTS.md.

## 엔진 입력·목록·경로 · WORK3416 / 2026-11-02
입력/문자/포커스 발생 순서·마우스 이동 병합/다중 버튼 캡처·XInput4슬롯/공용키·기본 가상 목록/트리/C++ 이동·clip/변형 좌표·입력 scratch 수명·긴 경로 worker/PE 원자 기록을 묶었어요. 공용8/SDK실worker/90·298자 PE/실제 release40frame 통과. 전체FPS·컨트롤러 실기기·고급 행/포인터잠금은 별도. DEBUG_HANDOFF의 DLL 가설은 철회, 263자 실제파일 spawn ENOENT/확장경로 exit0과 긴PE API 원인을 반증했어요. 공유 WIP는3way 병합·검증 후보만 index/설치. 새 예약/agent/goal/게임채팅 위임/보호3파일 변경 없음. USER_INSTALL3417/d6a13f4a72854246 전환·17owner/PE 해시·설치 Node 입력/목록 통과·Versions1. 검사 staging 전체 제거·재현 소스/프로젝트/보고서/명세만 보존.

## 엔진 공통 비용 후속 · WORK3414 / 2026-11-02
사용자는 리소스 묶음만이 아닌 누적 엔진 성능/메모리/동기화 구현을 계속 요구해요. 이번에는 UI 변경 사각형·동일 픽셀 전송 생략·readonly C++ 입력/UI 조회를 함께 구현. codec35·SDK 값/복원·실제 매 프레임 한글 HUD40frame 통과. UI720p CPU p95 7.5092→4.5279ms, SDK getter2000회35.4179→5.6355ms(각 구간 수치·전체FPS 아님). USER_INSTALL3415/b7f3064130489c67 전환·11owner/PE 해시 확인·설치 Node 사각형/생략/공용UI 통과. Versions1·전체 staging 제거·변경 sources만 보존. 게임 담당에게 작업 위임/메시지 없음·예약/goal/agent 없음·금지3파일/원본/사용자창 보호. 공유 미검증 WIP는 계속 보존하고 검증된 후보만 index/설치.

## 엔진 직접 소유 · WORK3412 / 2026-11-02
최신 사용자 지시에 따라 게임 채팅에 보낸 엔진 인계·검토·추가 검사 요청 전부 취소. 엔진 수정·자체 검증·설치는 이 채팅에서 직접 소유. 설치8a 기반 격리 후보로 검증하고 설치 뒤 전체 staging을 제거했어요. 변경 소스는 native/build/engine-core-8BqsXn/sources에 보존했어요. UI720p CPU p50 43.6876→4.0705ms(즉시 ACK, 전체FPS 아님). Windows native/webview 콘텐츠를 game.hbdata에 묶고 직접/범위 읽기, 기존Content 호환. 생성 release40frame에서 packed SVG/한글font/음성/C++/입력/종료 통과. WORK3412·GAME_RESOURCE_ARCHIVE.md. 공유 WIP의 spans/zero-alpha/frame-RPC/DPI는 미채택·작업트리 그대로 보존. 금지3파일/게임원본/사용자UI 건드리지 않음. 새 예약/goal/agent 없음. USER_INSTALL3413/52715dc67932f379 전환 완료·31owner/PE SHA 확인·설치 Node UI/묶음/HTTP/glTF 통과·Versions1. 전체 게임 FPS는 별도예요.

## 공용 런타임 비용 · 2026-11-02 / WORK3410
이번 commit은 장면·그림자·2D 보조 패스의 숨긴 하위 순회 제외, 보이는 UI 실제 선택 그림/SVG만 준비·사용 종료 해제, 8MiB/32개 다중 크기 그림 캐시, 제한된 글자 측정 캐시, report UI 단계 계측이에요. 36+96 픽셀·8 완전 패킷·공용 WidgetSystem 첫 프레임/표시/해제 통과. 다른 채팅 C++/전송/스크롤/업로드는 partial index에서 제외했고 소유 HEAD 후보도 따로 검사했어요. 기존 PNG UI 13.291→12.696ms; 외부 Zstd 포함 작업 트리 1.747→1.206ms는 별도 근거예요. 전체 게임 FPS로 계산 금지. USER_INSTALL3411/8a9e0adc4d0beae2 전환·Versions1·설치 Node 공용 UI API 통과. 전체 게임 FPS는 별도. docs/NATIVE_RUNTIME_COSTS.md·ENGINE_WORK_3410.json.

# 현재 인계 · 2026-11-01
최신 WORK3408/4a5805f7: 인증서 없는 release 차단은 Windows 요건이 아닌 과도한 정책이어서 제거. development/release 모두 unsigned 허용·명세 distributionReady=true·antivirusVerdict 별도·UI 서명 없음. 선택한 인증서의 실제 오류/서명/timestamp 검증 유지. 주인님 인증서 없음 확답, 수신PC 백신 재검사 미확보. USER_INSTALL3409/3b0ed24f230591fa 완료·6owner SHA·native binary 3ae7aeb1 재사용·Versions1. 설치빌더로 최적화 release 생성·40frame AOT C++/UI/한글/오디오/키보드/마우스/정상종료·app-local VC+System32 PATH·공식Node Valid·PEmanifest/누락진단 통과 native-game-OfB09B. Windows 보안 정책/SmartAppControl/백신 차단 가능성 별도이며 다른PC 검증으로 포장금지. WORK3406 PE COFF/의존성/UI/오디오 개선 근거는 유지, 서명 필수 정책만3408이대체. 기존게임재패키징필요. 예약/새goal/새agent금지·UPDATE_HOLD=false.
절대 read/edit/stage/run/test금지: prototype/player.js, tools/check-player-keyboard-release.mjs, docs/NODE_CATALOG.md. catalog CLI/updateLibrary금지. HBNativePlayer.cpp 외부 DPI_UNAWARE·center/fit hunks도 작업트리 보존, 우리코드만 partial index commit. 배포CPP는 commit 23a3359c 소스0d6602ca로 별도소유경로 컴파일·dist/설치소스 일치. 다음 sync도 working 외부hunk를 무단반영하지 않도록 주의(작업트리 원본 덮어쓰기 금지).
원장78행36verified/38partial/1unimplemented/3unverified·전체율null. sourceHashBase3400→3402→3404→3406 delta whitelist만. hb context --compact known symbol 집중경로·미등록owner등록. 사용자창/프로필/게임원본 금지·소유숨김검사만. Mac/Xcode/Android실기기없음. 무거운검사/CPP/cache/설치전activeInstalledVersions; 사용버전 교체/종료금지. retainTestEvidence·nativeCacheOnly32+protectedbinary·SDK/user보존·Versions전환후1. exactSDK/binary SHA만CPP근거재사용. 한글commit/push 동일kirby47navercom-ai author/committer·AI/coauthor0.

이전3061–3360: 각 WORK3080–3360 근거로 완료검사 재실행금지. 원장 remaining가 실제 후속 범위. GL1728 ANGLE6878.6/FXC6836.439ms 미해결·실패실험반복금지.
3361–3400: Windows native/web 분리·Win32/DX11+공용V8/BP/AOT C++·Skia HUD/한글/SVG·PCM/믹서·OS입력·정상종료/저장·shader seed. USER_INSTALL3401 기존467f5127f78c329a는역사기록; 3403/7a1a8f807f69bffa는역사기록; 현재3405/a471833cc0d4bff5. 에디터WebView유지·전체C++자동병렬화아님. 목록/추적UI/kiosk/stream/video/display 거절,gamepad/포인터잠금 추가필요. docs/NATIVE_GAME_RUNTIME.md.
3402: 필요한 Rapier차원+혼합/spawn/query 준비·C++query전용차원. HUD canvas재사용/미사용그림해제/이미지만이면기본폰트생략. 일반종료 전체스냅샷/파일저장중복메모리제외. runProject 엔진JSON구조별 bounded 비교, C++전행가시성/필드패치/실패복구 유지. staticCollider root변환/컴포넌트/타일/활성/material불변만설정재사용. opt-in profile4096 frame: runtime/native(workerparse/patch/sync/invoke/snapshot)/physics(sync/step/solver)/native render+HUD+합계. 내부시간겹침·기존stats.ms는renderHUD. liveMemory30frame표본/종료memory구분.
근거 native-memory-Hzfsfk 8case+3fresh*2dim, runtime-sync-4SQgzb6case+3fresh 500행/186충돌체. CPU 120회합계151.63→81.21ms·물리108.80→88.35ms(전체FPS아님). 실제C++transport/physics166+질의, headless장면전환, native-game-H7oeWs40frames·OS입력/종료·프로필通過. NativePlatform-TeeSP5 관련UI/audio. 일반재귀2후보느려미채택(DEBUG_HANDOFF). 실제AuricBoss 성능은미검증. SDK/NativeEXE변경0·설치빌더current4frame·7draw·profile확인, Versions1. 기존패키지는재패키징해야적용.
