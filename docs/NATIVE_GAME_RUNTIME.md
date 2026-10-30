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

현재 네이티브 검사에서 **목록/트리 위젯, 월드 추적 UI, 키오스크, 스트리밍 오디오, 영상, 화면 주사율 동기화**을 쓰면 해당 파일/설정과 함께 빌드를 거절해요. 기능을 버리거나 WebView로 몰래 전환하지 않아요. 네이티브 게임패드·포인터 잠금·UI 고급 레이아웃의 완전한 브라우저 동등성도 추가 구현/검증 대상이에요. 에디터·웹·모바일의 기존 경로는 별개예요.

Windows 10/11 x64·DirectX 11 드라이버가 필요해요. 네이티브 오디오 모듈은 Microsoft Visual C++ v14 x64 런타임의 `VCRUNTIME140.dll`을 사용해요. 없는 PC에는 [Microsoft 공식 런타임](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist)을 설치해야 해요. 운영체제의 DLL을 임의로 복사해서 배포하지 않아요.

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
