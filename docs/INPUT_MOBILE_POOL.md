# 입력·모바일 UI·오브젝트 풀 구현과 실제 실행 검증

2026-10-04. 이번 기록은 사용자가 먼저 요청한 실행 입력·재사용·2D 방향·플레이어 찾기와 추가 모바일 UI, 그 뒤 실제 Player 검증을 다룬다. 이전 전체 엔진 요구와 연구 대기열을 대체하지 않는다. 전체 Unity/Unreal 문서 분석이나 엔진 전체 기능 완료의 증거로 사용하지 않는다.

## 제작과 실행

프로젝트 허브에서 **2D · 탑다운 슈터**를 선택한다. 일반 Scene, BP_TopDownShooter, Source/TopDownShooter.h/.cpp, W_TopDown 위젯 파일을 만든다. WASD 또는 모바일 이동 컨트롤로 이동하고, 마우스 조준·좌클릭 또는 모바일 공격 버튼으로 발사한다. BP Tick이 공개 사용자 C++ Update를 호출하며, 탄환 64개·적 12개를 배치하고 풀에서 꺼내거나 반환한다. C++ 파일은 기존 외부 IDE 흐름으로 편집한다. 배포에는 기존 빌드 프로필의 Windows Game.exe를 사용한다.

| 기능 | 편집 데이터와 실행 계약 |
| --- | --- |
| 마우스/키 | Input Event의 기존 `then` 핀은 Pressed, 새 `released` 핀은 Released다. Input Action의 기존 Started/Triggered/Completed도 공용 상태를 소비한다. |
| 위치/조준 | `hb::Input`은 위치·델타, 월드 ray, 지정 평면과의 교차, 키 눌림·축 값을 제공한다. 2D 정사영과 3D 투시 카메라를 사용한다. |
| 2D 방향/그림 | `hb::Sprites::SetFlip/GetFlip/SetSprite/GetSprite`가 노드와 C++에서 같은 서비스를 호출한다. 반전은 렌더 메시만 바꾸며 Actor scale·콜라이더는 유지한다. |
| 재사용 | `PooledActor.initiallyActive`와 `hb::ActorPool::Acquire/Release/IsActive`. 풀 소진 시 null, 반환 시 속도·충돌·Tick과 소유한 BP 지연 작업/타이머/타임라인·AI/FSM·애니메이션·UI·오디오를 정리한다. BP 사용자 이벤트 OnPoolAcquire/OnPoolRelease를 제공한다. C++ worker의 이름 기반 전역 타이머는 Actor별 소유 타이머가 아니다. |
| 플레이어 | TopDownMovement2D의 autoPossess도 제어권·GetPlayerPawn에 연결한다. BP에 추가한 컴포넌트를 먼저 설치하고 PlayerController의 명시적 pawn을 우선한다. |
| 화면 UI | UIWidget 컴포넌트의 위젯 에셋·인스턴스·시작 표시 속성으로 HUD를 실행하고 소유 객체 반환/장면 종료 시 정리한다. |

공통 서비스 API는 Game.hpp에서 노드 핀/자료형과 C++ 서명을 생성한다. 새 API만 화면에 표시한 것이 아니라 실제 worker에서 호출하고 반환된 서비스 작업을 공용 실행기에 적용한다. 현재 카탈로그는 **486 노드 / 코어 C++ API 289 / 서비스 API 115**다.

```cpp
hb::Vec3 aim;
auto* player = hb::Gameplay::GetPlayerPawn();
if (player && hb::Input::GetMouseWorldPosition({0,0,1},
        hb::Scene::GetPosition(player), aim)) {
    hb::Sprites::SetFlip(player, aim.x < hb::Scene::GetPosition(player).x, false);
}
```

포인터 좌표는 **캔버스 왼쪽 위 기준 CSS 픽셀**이다. 이미지 픽셀·데스크톱 절대 좌표가 아니다. 위치가 없거나 캔버스 밖이면 위치/ray의 성공 값은 false다. 조준 평면의 법선이 0, ray와 평행, ray 뒤쪽 교차이면 false와 영벡터를 반환한다. 델타는 프레임 끝에 지운다. 마우스 좌/중/우 버튼·휠을 받고 포인터 캡처/창 이탈·blur·취소·일시정지·장면 전환에서는 입력을 해제한다. 이전 비동기 입력 큐가 해제 뒤에 눌림을 되살리지 않도록 epoch를 검사한다. 분리된 에디터 창으로 캔버스가 이동하면 document 리스너도 옮긴다.

## 모바일 제작 UI와 입력

기존 위젯 편집기의 팔레트·계층·속성·Undo를 그대로 사용한다.

- Joystick: 원형 dead zone, 축 또는 WASD 매핑, 고정/터치 시작점 기준 이동, 손잡이 표시.
- DPad: 8방향, 대각선 정규화, 복수 포인터.
- TouchButton: 누르고 있는 동안 입력, 놓기/취소 이벤트, 키·마우스 버튼 매핑, Enter/Space 접근성 입력.
- TouchPad: 화면 이동량을 LookX/LookY 등 지정 축에 전달하고 프레임 끝에 초기화한다.
- 모바일 프리셋: 이동·공격·점프를 추가한다. 슈터 템플릿은 이동·공격만 사용한다.
- safeArea, adaptiveOrientation, touch/mouse/all 장치별 표시, Canvas 앵커/크기 배율, 가로·세로 화면 대응.
- 컨트롤마다 입력 source를 분리한다. 한 손가락을 떼어도 다른 손가락·키보드의 같은 키 입력은 유지된다. resize/orientation·숨김·비활성·blur·pause·제거 시 해제한다.
- Player의 일시정지·재개 메뉴도 터치 가능한 크기로 제공한다. 브라우저의 사용자 제스처 요구로 소리가 정지되어 있으면 시작 버튼을 제공한다.

이것은 공용 위젯/Player의 모바일 조작 지원이다. Android/iOS 앱 패키징, 실기기 GPU/입력 검증, 온스크린 키보드/IME, gamepad·진동·센서, 모바일 native 에디터는 별도 요구로 유지한다. CSS 안전 영역을 구현했지만 이번 화면 에뮬레이션은 실제 노치가 있는 기기 검증을 대신하지 않는다.

## AI 편집과 실행 계약

사람과 AI 모두 같은 JSON 파일·안정된 ID·스키마와 revision 검사를 사용한다. 기존 에셋/문서 명령에 더해 `widget.mobileControls`는 위젯 path, expectedRevision, Joystick/DPad 선택, dryRun을 받는다. 모바일 전용 별도 저장 형식을 만들지 않는다.

`runtime.input`은 키가 없는 포인터 갱신도 받는다. 예시: `{"key":"LeftMouseButton","value":1,"source":"aim-test","pointer":{"position":[600,100],"size":[800,400]}}`. `runtime.state`에서 keys와 pointer의 유효성·ray를 읽는다. value 0은 해당 source의 입력만 해제한다. 입력과 스냅샷의 크기·유한 값·벡터 길이를 검증한다. headless에서도 카메라 수학/입력/C++ 로직을 실행하지만 픽셀·폰트·음향의 성공을 대신 주장하지 않는다.

## 검증과 재현

```text
npm run test:input
npm run test:pool
npm run test:native-world
npm run test:headless
npm run test:player-lifecycle
npm run test:package
npm run test:player-acceptance
npm run test:player-acceptance -- --release
```

실제 Player 검사는 독립 임시 프로젝트/사용자 데이터/프로세스에 한정한 WebView2 디버그 포트를 사용한다. 창은 (-20000,-20000), SW_SHOWNOACTIVATE로 실행하므로 사용자의 기존 에디터·브라우저를 조작하지 않는다. 테스트 뒤 종료한다. PNG·CPU profile·acceptance.json은 ignored native/build/player-acceptance-*에 저장한다. 마지막 증거 경로는 native/build/player-acceptance-proof.json에 남긴다.

확인한 것은 다음과 같다.

- 실제 Game.exe에서 64×32 PNG의 두 색 구분/좌우 반전과 한글 HUD를 픽셀로 확인했다. DOM 텍스트·폰트 상태와 실제 렌더 texture 크기도 검사했다.
- 실제 마우스 메시지 → 공용 입력 → BP Tick → 컴파일된 사용자 C++ → 풀 발사·물리 속도가 연결됐다.
- AudioContext running, 실제 재생 시간 증가, Web Audio master bus의 0이 아닌 출력 신호를 확인했다. 물리 스피커 청음 성공으로 표현하지 않는다.
- 390×844/844×390 화면과 실제 두 포인터 입력으로 이동·공격 동시 동작, 손가락 해제 후 키 정리를 확인했다.
- 풀 100회 재사용과 소유 작업 정리, C++ object 배열/반환값을 검사했다. clock 분리·nested JSON Pointer·배열/필드 삭제·함수 오류·worker 재시작/장면 reset 뒤 전체 복구도 실제 C++로 검사했다.
- 공용 엔진/물리·충돌·저작·UI/오디오·게임플레이·패키지 회귀 검사를 수행했다. 별도 live 에디터 API/충돌 에디터 검사는 검증용 클라이언트가 없어 ECONNREFUSED였으며 통과로 계산하지 않는다.

## 성능 시험 조건과 개선

Ryzen 7 7800X3D, 메모리 약 31.1 GiB, WebView2/Edge 154.0.4258.53, 1280×720에서 별도 EXE를 측정한다. 장면에 탄환 슬롯 **480개를 항상 미리 배치**하고 활성 수를 0/100/200/400/480개로 바꾼다. 작은 스프라이트, Rapier2D 동적 강체·CCD·센서·충돌 layer/mask가 있다. 속도 1로 계속 이동하며 각 측정의 모든 활성 탄환이 0.25 이상 이동했는지 확인한다. 작은 초기 속도가 절전으로 멈춘 선행 시험은 최종 성능 근거로 쓰지 않는다.

기본 시험은 탄환별 스크립트가 없다. C++ 시험은 같은 **480 슬롯 전체 상태**를 가진 장면에 BP Tick → 사용자 슈터 Update 한 번을 추가한다. 따라서 C++ 0/64 활성 행도 480 슬롯의 브리지 비용을 포함하며, 슬롯 64개인 실제 샘플과 다르다. 행별 0.4초 준비+2.2초 측정, 마지막은 480개 이동·5초마다 방향 전환·96회 반환/재획득을 30초 이상 유지한다.

프레임 수는 화면 밖 smoke의 16ms 타이머에서 **완료된 게임 루프 횟수**다. 모니터 표시 FPS가 아니다. work p95는 비동기 BP/물리/C++ 대기와 WebGL 제출 시간이며 GPU 완료 시간은 아니다. 특정 장면의 측정점이지 모든 탄막 게임의 최대치가 아니다.

개선한 경로는 읽기 기본값 캐시(편집 데이터 깊은 복사 유지), 루트 월드 좌표, 물리 변화로 렌더 자원을 재생성하지 않는 signature다. C++는 workerProtocol 2의 세계 JSON Patch·전체 복구·clock/reset 세계 전달 생략·지연 Actor 핸들·검증 ID 인덱스를 사용한다. 이전 패키지 worker의 프로토콜은 전체 요청을 유지한다. development는 -Og -g, editor는 -O0, release는 -O2다.

최종 개발·배포 측정과 지속 시험 값은 다음과 같다. 각 행은 마지막 한 번의 측정값이며 반복 실험의 통계적 평균이 아니다. 같은 PC의 앞선 배포 실행에서는 480개+C++가 7.7회/초였으므로 실행 간 편차도 존재한다. 최적화 구성만으로 편차의 원인을 확정하지 않는다. 현재 C++의 큰 장면 스냅샷/JSON·프로세스 왕복 비용은 남아 있다. 이 비용이 포함된 숫자를 생략해서 성능을 평가하지 않는다.

| 시험 | 개발 루프/초 | 개발 work p95 ms | 배포 루프/초 | 배포 work p95 ms |
| --- | ---: | ---: | ---: | ---: |
| 기본 슈터: 64 탄환 슬롯/12 적, 마우스 발사 | 60.5 | 15.1 | 60.2 | 13.2 |
| 480 슬롯 / 활성 0, C++ 없음 | 60.6 | 1.7 | 60.3 | 0.9 |
| 480 슬롯 / 활성 100, C++ 없음 | 60.6 | 5.7 | 60.4 | 3.6 |
| 480 슬롯 / 활성 200, C++ 없음 | 56.1 | 7.7 | 60.3 | 6.6 |
| 480 슬롯 / 활성 400, C++ 없음 | 52.8 | 26.6 | 60.7 | 12.9 |
| 480 슬롯 / 활성 480, C++ 없음 | 58.1 | 20.1 | 60.5 | 13.7 |
| 480 슬롯 / 활성 0, C++ Update/프레임 | 14.9 | 70.9 | 19.7 | 50.9 |
| 480 슬롯 / 활성 64, C++ Update/프레임 | 14.9 | 70.0 | 19.2 | 57.0 |
| 480 슬롯 / 활성 100, C++ Update/프레임 | 14.5 | 73.8 | 18.5 | 58.4 |
| 480 슬롯 / 활성 200, C++ Update/프레임 | 12.1 | 97.3 | 16.2 | 66.6 |
| 480 슬롯 / 활성 480, C++ Update/프레임 | 8.4 | 132.2 | 11.2 | 100.3 |

개발 지속 시험은 35.74초·96회 재사용·각 5초 구간 480개 전부 이동, 8.1회/초·work p95 133.6ms였다. 배포는 35.20초에 같은 조건으로 9.9회/초·p95 101.2ms였다. 배포 V8 heap은 약 71.2→36.6MiB, 종료 render geometry 481/texture 4였다. GC를 포함한 시작/끝 표본이며 프로세스 전체 메모리·GPU 메모리·장시간 무누수를 증명하지 않는다. 치명적인 Runtime.exceptionThrown은 0이었다. 큰 C++ 장면은 현재 60회/초 탄막 처리를 충족하지 못한다.

private 증거: 개발 `native/build/player-acceptance-yHpXFV/acceptance.json`, 배포 `native/build/player-acceptance-zjHAZa/acceptance.json`. 같은 폴더의 desktop/flipped/mobile-portrait/mobile-landscape/stress-480 PNG와 cpu-200.json을 보존한다. 최종 배포 검사에는 버튼 글자 중앙 정렬과 Enter 눌림/해제도 포함했다. 고립된 검증 프로세스만 실행했으며 기존 사용자 창은 새로고침하지 않았다.

## 후속 C++ 경량화 — 2026-10-04

가벼움을 전체 엔진의 계속 요구로 고정하고 [측정 기준과 전송 계약](PERFORMANCE_BUDGETS.md)을 추가했다. 기능·물리·슬롯 수를 유지하면서 browser→host 입력도 변경분으로 전송한다. 성공한 불변 스냅샷은 변경 경로만 복사하고, worker는 patch_inplace/달라진 Transform·공개 속성만 반환한다. 기존 worker와 전체 입력 도구의 계약은 유지한다.

변경 전 기준은 현재 작업 직전 `player-acceptance-pVE0Gf`, 최종 코드 검증은 `player-acceptance-WCjb5G`다. CPU·release·해상도·장면·모든 탄환 이동·96회 재사용 조건은 같다. 이 절은 위의 프로토콜 2 기록 이후의 결과이며 위 표/증거를 삭제하거나 덮어쓰지 않는다.

| 480 슬롯 + 매 프레임 C++ / 활성 수 | 변경 전 루프/초 | 최종 루프/초 | 변경 전 work p95 ms | 최종 work p95 ms |
| --- | ---: | ---: | ---: | ---: |
| 0 | 18.3 | 43.4 | 56.8 | 22.1 |
| 64 | 18.1 | 40.5 | 60.4 | 31.3 |
| 100 | 18.4 | 33.0 | 59.2 | 32.9 |
| 200 | 15.4 | 29.1 | 70.6 | 38.6 |
| 480 | 11.2 | 16.7 | 92.5 | 81.0 |

최종 480개+C++ 완료 루프는 **48.9% 증가**, work p95는 **12.4% 감소**했다. 35.6초·96회 재사용 시험은 9.5→15.1회/초였다. C++ 없는 480 활성은 60.4→58.3회/초다. 비교 검사의 10% 이상 처리 속도 회귀 기준은 통과했고, 모든 탄환이 계속 이동했다. 기본 64슬롯/12적 C++ 슈터는 60.0회/초였다. 이는 표시 FPS·최대 탄막 수 보장이 아니다.

앞선 성공 실행 `auhjKS`는 480+C++ 19.9회/초·p95 53.6ms·지속17.7회/초, 전송량을 줄인 중간 실행 `dP4TKh`는20.9회/초·p95 50.2ms·지속18.2회/초였다. 최종 실행의 CPU 대기와 렌더 제출 시간이 더 길었으며, 외부 부하와 실행 간 편차의 원인을 이 표본만으로 확정하지 않는다. 가장 좋은 실행만 채택하지 않는다. 깊은 JSON/undefined 배열의 전체 복구 경계를 추가한 최종 코드는 WCjb5G이며 대형 C++ 60회/초 목표는 미달이다.

최종 Windows 소유 프로세스 트리의 전용 커밋 표본은 준비584MiB/480+C++662MiB/지속시험 끝666MiB였다. working set 합계는734/887/894MiB이며 공유 페이지 중복이 있을 수 있다. 앞선 dP4TKh 표본의 전용 커밋은583/628/662MiB였다. Game/Node/WebView2/worker를 포함하고 GPU 메모리/피크가 아니다. 최종 V8 heap 종료 표본은26.3MiB였지만 이것을 전체 엔진 메모리로 표시하지 않는다. 변경 전 OS 전체 트리 표본이 없어 전체 메모리 감소를 증명한 것으로 계산하지 않는다. WebView2/Node의 기본 비용도 후속 경량화 대상으로 유지한다.

최종 `nativeTransport`는 이동 중 worker patch 약61KB/963작업, upstream 약61KB, C++ 미변경 객체 반환0·결과 약258바이트를 기록했다. 반복 전체 복사/중복 diff·미변경 Transform 적용을 줄인 경로다. arbitrary nested JSON·C++ 내부 물리 질의와 타일 갱신·input/풀 수명 의미는 유지한다.

검사: native-world/transport/host/headless/2d-authoring/pool/input-authoring/runtime-input/scene-runtime/physics/main/API 통과. 새 전송 경계 검사는 실제 C++ + JSON wire로 공유 token/불변 기준/순서/오류·유실 응답·ack 오류·장면 reset·worker 재시작·잘못된 경로를 확인한다. 최초 `9Sv81F`는 함수 이름 오타로 시작 실패했고 수정 후 실제 EXE에서 재검사했다. 성공으로 계산하지 않는다. 기존 배포 workerProtocol2 EXE도 신규 host/client의 clock/전체 요청/worker delta/기존 반환으로 대조했다.

private 증거: `player-acceptance-pVE0Gf/acceptance.json`, `player-acceptance-WCjb5G/acceptance.json`, `native/build/performance-comparison-2026-10-04-final.json`; 성공 실행 auhjKS/dP4TKh도 보존한다. 비교와 원자료는 native/build 아래이며 공개 문서는 수치/조건/제약을 담는다. 최신 HBEngine.exe/dist를 다시 만들었다. 기존 사용자 창은 조작하지 않았다.

실제 저작/자동화·패키지 회귀도 확인했다. `authoring-window-FshpAA`는 스프라이트 분할·Undo/Redo·AI·입력→타일 화면/충돌, `package-check-p6ymR2`는2D·3D GPU/BP/C++·컴파일러 없는 EXE·종료·무결성·원본 보존을 통과했다. 새 `npm run test:editor-api-window`는 고립된 실제 편집기에서 기존 전체 API 검사와 C++ BeginPlay→입력 재호출·다시 Play·원본 복구를 실행한다. 성공증거는 `editor-api-window-Ywixc6`다. 첫 wLg3Xr의 기능 검사는 통과했지만 검사 마지막 Undo 문서가 미저장 상태여서 종료 확인이 대기했다. fixture 원본을 저장하고 재검사했으며 첫 전체 실행은 성공으로 계산하지 않는다. 기존5181에 직접 실행한 검사는 ECONNREFUSED였고 사용자 창에 접속해 해결하지 않았다.

## 공식 근거

[Epic GetMousePosition](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/APlayerController/GetMousePosition)과 [DeprojectMousePositionToWorld](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/APlayerController/DeprojectMousePositionToWorld)를 마우스 위치/월드 방향 계약과 대조했다. [Unity ScreenPointToRay](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Camera.ScreenPointToRay.html)의 좌표는 왼쪽 아래 기준이므로 HB의 왼쪽 위 CSS 좌표 계약과 혼동하지 않는다.

[Unity SpriteRenderer.flipX](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/SpriteRenderer-flipX.html)의 렌더 반전과 [Input System On-Screen Controls 1.14](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.14/manual/OnScreen.html)의 가상 컨트롤/입력 매핑을 참고했다. HB의 저장 형식·source 합성·런타임은 자체 구현이다.

[Microsoft WebView2 디버깅](https://learn.microsoft.com/en-us/microsoft-edge/webview2/how-to/debug-visual-studio-code)과 [CDP Input](https://chromedevtools.github.io/devtools-protocol/tot/Input/), [Page](https://chromedevtools.github.io/devtools-protocol/tot/Page/), [Emulation](https://chromedevtools.github.io/devtools-protocol/tot/Emulation/)을 별도 프로세스 검증에 사용했다. 개발 worker의 -Og 선택은 [GCC 최적화 옵션](https://gcc.gnu.org/onlinedocs/gcc/Optimize-Options.html)의 디버깅 구성을 참고했다. 이 지정 자료 대조를 전체 문서/API 조사 완료로 바꾸지 않는다.
