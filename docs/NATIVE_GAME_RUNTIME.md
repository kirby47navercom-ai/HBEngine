# Windows 네이티브 게임과 웹 배포

Windows 빌드의 기본값은 `windowsRuntime: "native"`예요. `target: "web"`은 기존 정적 웹 실행기를 사용해요. 편집기 UI는 WebView2를 계속 사용하지만, 네이티브 게임 패키지에는 WebView2 DLL·HTML 실행 화면·로컬 HTTP 서버를 넣지 않아요.

```json
{"target":"windows-x64","windowsRuntime":"native","targetFrameRate":120,"framePacing":"fixed"}
```

기존 WebView 실행이 필요한 프로젝트는 Windows 실행기에서 **브라우저 호환 · WebView2**를 명시적으로 선택해요. 자동 전환은 하지 않아요. 웹 빌드는 플랫폼을 **웹 · GitHub Pages**로 선택해요.

## 실제 실행 구조

- Win32 창·입력·D3D11 표시는 `HBNativePlayer.cpp`와 기존 `SceneRenderBridge`를 사용해요.
- 프로젝트별 이름으로 배포한 Node/V8 실행기가 기존 `runProject`·블루프린트·게임 서비스·물리를 실행하고, 미리 컴파일한 C++ 모듈을 호출해요. 게임을 새로 작성하거나 DirectX API를 직접 호출할 필요가 없어요. 게임 로직 전체를 C++로 변환하거나 자동 병렬화한 구조는 아니에요.
- 그림·SVG·글꼴·HUD는 네이티브 Skia, 오디오는 네이티브 Web Audio 구현을 사용해요. Web Audio라는 API 이름과 브라우저 실행은 별개예요. 기존 믹서·공간음·가상 음성·PCM 캐시를 재사용해요.
- 게임 ID별 실행 파일·저장 폴더를 사용해요. 저장 파일은 `%LOCALAPPDATA%/HBEngine/Games/<id>`에 원자적으로 기록해요.
- 초기 기본 셰이더 바이트코드를 함께 배포하고 내용 기반 캐시에서 재사용해요. 종료 때 공용 VM의 EndPlay·저장·리소스 해제를 먼저 완료해요.

## 현재 범위와 명시적인 제한

네이티브 패키지에서 실제 확인한 범위는 2D 물리·스프라이트/SVG 텍스처, 3D 기본 도형의 DirectX 표시, AOT C++ 호출, HUD·한글·이미지·버튼, Win32 키보드/마우스 입력, 저장, 공용 믹서의 PCM, 무음으로 연 Windows 오디오 출력, 정상 창 종료예요. 추가 DCC 모델·복잡한 머테리얼·대규모 게임 전체의 호환성이나 성능을 일괄 증명한 것은 아니에요.

현재 네이티브 검사에서 **사용자 목록 행/자동 행 높이/드래그 그룹, 월드 추적 UI, 키오스크, 스트리밍 오디오, 영상, 화면 주사율 동기화**을 쓰면 해당 파일/설정과 함께 빌드를 거절해요. 기능을 버리거나 WebView로 몰래 전환하지 않아요. 기본 목록/트리와 XInput 공용 키는 WORK3416에 연결했어요. 포인터 잠금·UI 고급 레이아웃의 완전한 브라우저 동등성도 추가 구현/검증 대상이에요. 에디터·웹·모바일의 기존 경로는 별개예요.

Windows 10/11 x64·DirectX 11 드라이버가 필요해요. 네이티브 오디오의 Microsoft Visual C++ v14 x64 런타임은 Microsoft 정식 서명을 검사한 뒤 앱 안에 동봉해요. `runtime/`와 오디오 `.node` 옆에 배치하고 실제 앱 폴더의 DLL이 로드되는지 검사해요. 다른 PC에 Node·HBEngine·VC 런타임이 미리 설치돼 있다고 가정하지 않아요. 빌드 도구는 설치본에 포함된 재배포 파일 또는 Visual Studio의 정식 `VC/Redist`를 사용하며 `HB_VC_REDIST_DIR`도 지원해요. Windows System32 DLL은 복사하지 않아요. [Microsoft 배포 지침](https://learn.microsoft.com/cpp/windows/redistributing-visual-cpp-files).

## Windows 배포 서명 · 2026-11-01

네이티브·WebView 패키지 모두 게임 EXE와 `Binaries/*.exe`에 게임 버전 정보·실행 매니페스트를 넣은 **다음** SHA-256 Authenticode와 타임스탬프를 적용하고 서명을 다시 검사해요. 마지막 파일 기준으로 패키지 SHA를 기록해요. 공식 Node 실행 파일의 바이트·공급자 서명은 그대로 보존해요. 게임 소리 이름·그룹·아이콘은 자식 프로세스의 CoreAudio 세션에만 적용해서 다른 게임의 볼륨과 분리해요.

빌드 창의 **Windows 코드 서명**에서 CurrentUser/My 저장소에 있는 코드 서명 인증서의 40자리 지문을 지정해요. 인증서는 유효한 개인 키가 있어야 해요. AI/CLI는 빌드 프로필을 똑같이 편집하거나 `HB_CODE_SIGN_THUMBPRINT`를 지정할 수 있어요. 비밀번호·개인 키는 프로필에 넣지 않아요.

```json
{"configuration":"release","windowsSigning":{"certificateThumbprint":"인증서의_40자리_SHA1_지문","timestampServer":"http://timestamp.digicert.com"}}
```

코드 서명은 `development`·`release` 모두 선택 사항이에요. 인증서가 없어도 최적화된 `release` EXE를 만들고 다른 PC에 배포할 수 있어요. 이 경우 결과·UI·명세에 `state:unsigned`, `distributionReady:true`, `antivirusVerdict:not-tested-on-recipient-PC`를 기록해요. 인증서를 명시했는데 서명·타임스탬프 검증에 실패하면 무서명으로 몰래 대체하지 않고 오류를 알려요. 이전 WORK3406의 무인증서 release 중단은 Windows의 필수 조건이 아닌 과도한 엔진 제한이어서 WORK3408에서 제거했어요.

코드 서명은 게시자와 파일 무결성을 확인하는 절차이고 모든 백신 통과 보증은 아니에요. 무서명 EXE는 대상 PC의 SmartScreen 경고나 Smart App Control·조직 정책·백신에 의해 차단될 수 있어요. 실제 수신 PC의 탐지 재검사는 아직 확보되지 않았어요. [Microsoft SmartScreen 설명](https://learn.microsoft.com/windows/apps/package-and-deploy/smartscreen-reputation), [Smart App Control 설명](https://support.microsoft.com/en-us/windows/security/threat-malware-protection/smart-app-control-frequently-asked-questions).

C++ worker는 처음 링크할 때부터 버전·권한 매니페스트가 있어요. 패키지의 게임별 이름 갱신 때 Windows UpdateResource가 MinGW COFF 디버그 표를 잘라내면서 이전 포인터를 남기는 문제도 수정했어요. 표를 복원하고 포인터를 재배치해서 PE 분석·실행·디버그 심볼 수가 유지돼요. 이 결함을 실제 원격 백신의 유일한 탐지 원인으로 단정하지 않아요. 파일 누락·실행 차단은 경로와 확인할 보호 기록을 오류 창·로그에 표시해요. 백신 제외·비활성화는 하지 않아요.

## UI 표시와 갱신

공용 위젯 자산의 기준 크기·높이/너비 배율·안전 여백·줄 높이·이미지 fit 규칙을 네이티브에도 적용해요. 절대 배치, 수평/수직 fill, Grid, NamedSlot, 부모 변환·투명도, 변환된 버튼 hit test, 텍스트 줄바꿈, SVG 선택·실제 크기 재래스터, 9-slice를 연결해요. SVG 소스를 바꾸거나 화면별 PNG를 쌓지 않아요. 애니메이션 WebP는 압축 프레임과 합성 캔버스 하나를 보관하고 프레임 변경 시에만 UI를 다시 그려요. GIF/APNG 전체 지원을 뜻하지 않아요.

실제 Chrome DOM과 Skia 비교에서 100%·150%의 17개 사각형과 14개 이미지/배경 표본이 통과했어요. 글꼴의 픽셀 단위 안티앨리어싱까지 동일하다는 뜻은 아니고, 위 제한 목록의 모든 고급 위젯이 완료됐다는 뜻도 아니에요. UI 애니메이션·바인딩은 인스턴스별 한 번 갱신하고, 바뀌지 않은 다른 인스턴스의 불변 스냅샷을 재사용해요.

C++ 소스 번역 단위는 CPU·가용 메모리에 따라 최대 2개씩 컴파일해요. 취소·실패 시 작업을 모두 회수하고, 소스 수에 비례해 전체 시간 제한을 늘려요. PCH·무제한 병렬 컴파일을 도입한 것은 아니에요. AI 조회: `windowsSigningSettings`, `portableWindowsRuntime`, `compileNativeUnits`, `NativeGameAudioIdentity`, `NativeWebPAnimation`.

## 제작·AI·검사 진입점

```text
node tools/hb.mjs context "PC 네이티브 실행기" --symbol nativeGameMain --compact
node tools/hb.mjs context "네이티브 패키징" --symbol buildNativeGame --compact
node tools/build-game.mjs <project.hbproject> windows
node tools/check-native-platform.mjs
node tools/check-native-game.mjs
```

빌드 전용 `build-native-player.mjs`가 네이티브 실행기와 기본 셰이더를 준비해요. 게임 배포에는 C++ 컴파일러를 동봉하지 않아요. 자동 검사만 `--hidden --silent --frames 40 --report <소유 경로>`를 쓰며 첫 프레임 준비 파일·실행 보고서·RGBA를 기록해요. 일반 실행에서는 프레임별 진단을 수집하지 않아요. UI는 변경 시에만 다시 그리고 전송해요.

소유 검사는 `test-artifacts`로 빌드·실행 파일을 정리하고 보고서·재현 자료를 보존해요. 사용자 프로젝트·창·프로필을 검사에 사용하지 않아요. 설치 전 활성 버전을 확인하고, 설치 전환 후 Versions는 하나만 유지해요. 예약 작업은 만들지 않아요.

## 메모리와 장면 동기화 · 2026-10-31

Node 헤드리스와 네이티브 실행기는 필요한 차원의 Rapier부터 준비해요. 다른 차원의 오브젝트 생성·레벨 로드·명시적인 질의가 들어오면 추가로 준비해요. C++ 질의 전용 월드도 처음 질의한 차원만 준비해요. 직접 사용하는 `createRigidPhysics`의 기존 기본 동작은 유지해요.

HUD는 같은 캔버스를 재사용하고, 참조 중인 위젯이 없어진 그림과 교체한 그림을 캐시에서 해제해요. 이미지 전용 위젯에는 기본 한글 글꼴을 미리 읽지 않아요. 일반 게임 종료에서는 전체 오브젝트·뼈 정점·변수 사본을 만들지 않으며, 파일에 저장한 내용을 불필요하게 메모리 저장소에 중복 보관하지 않아요. 검사 보고서는 기존 전체 상태를 선택해서 받을 수 있어요.

검증된 엔진 JSON을 쓰는 `runProject`는 구조별 비교 함수를 재사용해서 변경 없는 행의 JSON 생성을 생략해요. C++에는 모든 기존 물체가 계속 보이며, 기존 필드 패치·실패 시 전체 복구·반환 상태 반영을 유지해요. 임의 JS 호출과 기존 브라우저 경로에는 이 소유권 가정을 적용하지 않아요. 비교 코드는 인용한 필드 이름만 사용하고 캐시는 실행 소유자별 16개, 구조 1,024값·깊이16·소스64KiB 이내예요. 큰 구조는 기존 JSON 경로를 사용하고, 엔진 소유 불변 UI/타일 데이터는 참조로 비교해요.

부모 없는 정적 충돌체는 위치·회전·크기·물리 컴포넌트·타일·충돌 활성·재질 구성이 같으면 설정을 재구성하지 않아요. 순간 이동·제자리 배열 수정·충돌체 교체·풀 비활성/재활성·부모가 있는 물체와 움직이는 강체는 정상 갱신을 유지해요. 화면 밖 물체를 자동으로 숨기거나 C++ 참조에서 제거하지 않아요.

소유 소형 장면의 새 프로세스 3회 중앙값에서 실행기 RSS는 2D 152.85→137.74MiB, 3D 158.72→141.77MiB였어요. GC 전 값을 사용했으며, 강제 GC 후 보관량은 별도 기록이에요. 500행 중 호출마다 2행을 바꾸는 120호출에서는 직렬화 행이 60,000→240개, 전송 준비 합계 중앙값이 151.63→81.21ms였어요. 186충돌체·8이동 강체의 120스텝은 108.80→88.35ms였어요. 장면 결과도 대조했어요. 이 수치는 해당 CPU/메모리 fixture의 범위이며 실제 Auric_Loop 보스전의 FPS·주기적 튐 해결 보증은 아니에요. 근거는 `ENGINE_WORK_3402.json`에 있어요.

## 프레임 구간 보고서

헤드리스 시나리오 JSON에 `"profile":true`를 넣으면 `profile.frames`가 최대 4,096프레임을 기록해요. 일반 실행의 기본값은 꺼져 있어요.

```json
{"frames":1500,"profile":true,"captureState":false}
```

네이티브 게임의 기존 `--report <소유 경로>`에도 `logic.profile.frames`와 `logic.profile.startupNative`가 포함돼요.

- `runtimeMs`: 프레임 대기를 제외한 입력·VM·C++·물리 작업의 경과 시간
- `native`: 호출 수, 실제 RPC 수, 행 직렬화/패치·호스트 검증·C++ parse/patch/sync/invoke/snapshot·왕복·질의 시간, 전송 크기, 실제 직렬화 행 수
- `physics`: sync/step/solver 시간, 정적 재사용/재구성 횟수
- 네이티브 `renderAndHUDMs`, `frameWorkMs`: 표시 작업과 이를 합친 프레임 작업 시간. 초기 셰이더 준비 시간도 첫 프레임에 들어가요.

내부 구간은 서로 포함 관계가 있고 병렬 RPC 시간도 겹칠 수 있으므로 모두 더하지 않아요. `stats.ms`의 기존 의미는 표시/HUD 시간으로 유지해요. `liveMemory`와 `peakSampledRSS`는 보고서 모드에서 30프레임마다 표본을 읽은 스크립트 프로세스 메모리이며, 전체 프로세스 트리·GPU 메모리나 완전한 최대값이 아니에요. 기존 `memory`는 종료 정리 시점이에요.

AI 진입점은 `runtimeDataMatcher`, `NativeWorldClient`, `createRigidPhysics`, `nativeGameMain`을 `hb context --symbol ... --compact`로 조회해요. 재현 검사는 `tools/check-native-memory.mjs`, `tools/check-runtime-sync.mjs`에 있어요. 이미 만든 게임 EXE에는 런타임이 들어 있으므로 새 엔진으로 다시 패키징해야 이 개선이 반영돼요.

### 실행 중 반복 타일 갱신

네이티브 실행기도 `sceneRendering.syncSprite`로 C++·블루프린트의 SpriteRenderer 속성 변경을 공용 타일 메시 생성에 연결해요. `Sprites::SetSize`와 컴포넌트 문자열/수치 변경 후 표시 갱신을 기다리고 다음 프레임을 그려요. `drawMode: tiled`, `pixelsPerUnit`, 크기, 잘라낸 영역, 반전, `tileOrigin`은 기존 공용 `spriteSlices` 규칙을 사용해요. 별도 타일 오브젝트나 반복 이미지는 필요 없어요.

원인은 DirectX의 UV 반복 샘플러 부재가 아니라 실행 중 속성 변경 뒤 메시를 갱신하지 않던 네이티브 표시 연결이에요. 이전 설치본에서도 최초 배치의 반복 타일은 통과했고, C++ 크기·모드 변경 두 사례가 실패했어요. 같은 픽셀 검사에서 수정 후 8사례·360좌표가 통과했어요. C++ 렌더러 실행 파일은 변경하지 않았어요.

AI 조회는 `hb context "네이티브 반복 타일" --symbol syncSprite --compact`, 검사는 `tools/check-native-tiled-sprite.mjs`와 `tools/check-sprite-visual-sync.mjs`예요. 후자는 변환만 바뀐 300회에 메시를 다시 만들지 않고, 크기 변경과 비활성화/재활성화·자원 해제를 확인해요. 기존 패키지는 새 설치본에서 다시 패키징해야 반영돼요.

입력·목록·긴 경로의 구체 계약과 검증 범위는 [NATIVE_INPUT_AND_LISTS.md](NATIVE_INPUT_AND_LISTS.md)에 있어요.


## DirectX 선택·자원 수명 · WORK3424

Windows native 빌드 프로필에서 `nativeGraphicsAPI`를 `d3d11`(기본), `auto`, `d3d12`, `d3d12-11on12`로 선택해요. 같은 선택을 CLI `--graphics-api`로 명시할 수 있어요. `d3d12`는 직접 D3D12 렌더러(`SceneMeshRenderer`, 명령 목록 직접 기록)로 그리고 진단에 `backend:D3D12`, `nativeCommandLists:true`를 표시해요. `d3d12-11on12`는 이전 호환 경로(실제12 장치 위 D3D11On12, `backend:D3D12-11on12`)예요. `auto`는 지금도 11On12 하드웨어를 먼저 시도하고 실패하면11 HW/WARP로 이어가요. 기본값 전환과 실제 게임 FPS 비교는 [D3D12_PORT.md](D3D12_PORT.md) 4-2단계 몫이에요.

UI worker와 엔진 main은 이미 분리돼 있고, 이번에는 불변 위젯 가지·입력 행렬·타일 버퍼·업로드 직렬화 비용과 삭제된 UI/월드/렌더러 참조를 줄였어요. 다른 월드가 쓰지 않는 C++ 모듈은 객체/spawn 세계 참조만 비우며, 실행 코드/정적 상태는 유지해요. C++ 종료는 실제 child close와 큐 종료를 기다려요. report에 실행 중 `ui`와 EndPlay 후 `finalUI`를 구분해요. 상세 [NATIVE_RUNTIME_COSTS.md](NATIVE_RUNTIME_COSTS.md).
