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
