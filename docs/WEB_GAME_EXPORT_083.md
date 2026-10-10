# 웹 게임 내보내기 · 083

빌드 프로필에서 **웹 · GitHub Pages**를 선택하고 **모두 저장하고 빌드**를 누른다. 결과는 `Builds/<프로필>/<빌드>/index.html`과 정적 실행 폴더다. **게임 실행**은 이 폴더만 읽는 임시 HTTP 서버로 브라우저를 연다. **출력 폴더**에서 게시할 파일을 확인한다. 서버는 편집기 종료 시 정리한다.

C++가 없는 프로젝트는 추가 컴파일러 없이 내보낸다. C++가 있으면 **웹 C++ 도구 준비**를 한 번 실행한다. Emscripten 6.0.12로 기존 C++17 SDK·다중 소스·AOT 모듈을 하나의 WebAssembly로 컴파일한다. 실행하는 사람에게는 Python·Node·SDK·EXE가 필요 없다. 사용자 지정 SDK는 `HB_EMSDK_ROOT`, Python은 `HB_PYTHON`으로 지정한다. 도구 설치는 사용자 도구 폴더에서 수행하며 전역 PATH를 변경하지 않는다.

## GitHub Pages에 게시

새 게임용 GitHub 저장소를 만든 후 검증한 출력 폴더를 게시한다. 현재 예제는 엔진 저장소의 `gh-pages`에 게시하며 사용자 게임 원본을 사용하지 않는다.

```powershell
node tools/publish-web.mjs "C:/게임/Builds/web/빌드" "https://github.com/계정/게임저장소.git"
```

기존 Git 인증을 사용하고 `gh-pages`와 Pages의 루트 게시 설정을 연결한다. 비밀번호를 명령 인자·로그·파일에 쓰지 않는다. 기존 다른 Pages 설정이나 다른 게임의 브랜치를 덮어쓰지 않으며 강제 푸시하지 않는다. 파일 크기와 SHA-256·경로를 확인하고 패키지 파일만 게시한다. 로컬 `build-report.json`·검사 화면·빌드 임시 폴더는 게시하지 않는다.

수동으로 게시하려면 출력 폴더의 파일을 게시 브랜치 루트에 넣고 저장소 **Settings → Pages → Deploy from a branch → 해당 브랜치 / (root)**를 선택한다. `index.html`, `.nojekyll`, `Content`, `prototype`, `node_modules`, `licenses`, `game.hbpack.json`과 C++ 빌드의 `Binaries`를 함께 올린다. `node_modules`는 필요한 브라우저 런타임 파일만 담으므로 게시에서 빼면 안 된다. 파일을 더블클릭하는 `file://` 대신 HTTP/HTTPS로 실행한다. [GitHub 공식 게시 방법](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## 실행 구조

- 기존 Player·Blueprint VM·2D/3D 렌더·UI·물리·입력을 재사용한다. 에디터 전체나 Node 서버는 웹 게임에 들어가지 않는다.
- 상대 import map과 게임 기준 URL을 사용해 `/저장소/` 하위 경로, 공백·한글 에셋 이름과 redirect를 처리한다.
- 모바일 AOT의 JSON 프로토콜·증분 월드·모듈 라우팅·입력 검증을 공유한다. Wasm 호출은 인스턴스 전체에서 직렬화하고 Asyncify로 비동기 물리·저장·GPU 질의 응답을 기다린다. 실패 후 다음 호출의 큐를 복원한다.
- 브라우저 저장은 사이트 경로·프로젝트 ID를 기준으로 localStorage에 보관한다. 기존 SaveGame API와 프로젝트 저장 검증을 통과한다.
- 마우스 환경은 프로필의 PC 프레임 설정을 사용한다. 터치 환경은 최대 60 FPS·화면 주사율 동기화를 사용하며 프로젝트의 조이스틱·십자키·터치 버튼을 표시한다. 목표 FPS 설정은 실측 성능 보장이 아니다.
- 필요한 Three/Rapier와 C++ 런타임 라이선스를 포함한다. WebGPU는 기존 장면의 선택을 유지하고 지원하지 않는 브라우저에서는 기존 장치 오류를 표시한다.

## 검증

`npm run test:web`는 정적 패키지·해시·경로·브라우저 저장·Wasm 호출 큐를 검사한다. `npm run test:web-browser`는 Emscripten과 격리된 headless Chrome으로 실제 2D C++ 슈터·3D 게임을 빌드하고 렌더·키보드 이동·마우스/터치 공격·C++ 물리 질의·새로고침 저장을 검사한다. 테스트는 임시 프로젝트·별도 브라우저 프로필·임의 포트를 사용하고 사용자 창을 조작하지 않는다.

최종 증거와 출처 기록은 [083 원장](research/WEB_GAME_EXPORT_083.json)에 있다. 설치·게시 결과는 완료 후 같은 원장에 기록한다.

## 확인하지 않은 범위

실제 Android/iOS 기기와 Safari, 웹 네트워크 멀티플레이, 긴 성능·발열 검사는 실행하지 않았다. Win32/DirectX나 외부 네이티브 라이브러리를 직접 사용하는 사용자 C++는 브라우저용 이식이 필요하며 컴파일 오류를 그대로 보고한다. 현재 패키지는 동적 조회·C++ 바인딩 복원을 위해 에셋과 참조 C++ 원본도 포함한다. 웹에 게시하면 이 파일들도 내려받을 수 있다. 전체 엔진 기능·전체 문서/API 분석 완료를 뜻하지 않는다.


## 완료 기록

[공개 C++ 슈터 예제](https://kirby47navercom-ai.github.io/HBEngine/)는 WASD 이동·마우스 조준/좌클릭 발사와 터치 이동/공격을 지원한다. 해당 HTTPS 주소에서 실제 Chrome 실행·C++ 물리 질의·저장/새로고침·모바일 입력을 확인했다. 실제 휴대폰 검증으로 계산하지 않는다.

사용자 설치를 `C:/Users/kirby/HBEngine/Versions/dcc7dfb86fcb2208/HBEngine.exe`로 갱신했다. 바로가기와 .hbproject 연결도 새 버전을 가리킨다. 다음 실행부터 웹 대상이 보인다. 12개 제작/실행 소스의 SHA, 설치본 schema·격리된 프로젝트의 웹 빌드 검사와 SDK 준비 상태를 확인했다. 이전 설치본·사용자 원본·실행 중인 창을 보존했다.
