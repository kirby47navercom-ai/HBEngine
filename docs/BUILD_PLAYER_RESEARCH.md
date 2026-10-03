# 빌드 프로필·독립 게임 실행 조사와 적용

기준일: 2026-10-03. 이번 조사 단위는 **프로필 작성 → 장면/콘텐츠 검증 → C++ 빌드 → 배포 폴더 생성 → Game.exe 실행 → 종료/재실행**이다. 에디터 실행 파일을 배포하는 흐름과 사용자가 만든 게임을 실행하는 흐름을 구분한다. 다른 엔진 분야와 그 세부 기능의 누적 요구는 [전체 조사 상태](REFERENCE_COVERAGE.md)에 계속 유지한다.

## 실제 읽은 공식 본문

| 자료 | 본문 확인 범위 | 제작에서 도출한 요구 |
| --- | --- | --- |
| [Unity 6000.0: Introduction to build profiles](https://docs.unity3d.com/6000.0/Documentation/Manual/build-profiles.html) | Profile types를 포함한 본문 전체 | File 메뉴에서 설정 창을 열고 독립 설정을 이름 있는 프로필로 보관한다. 플랫폼 공유 설정과 개별 프로필을 구분하고 버전 관리에 저장한다. |
| [Unity 6000.0: Manage scenes in a build](https://docs.unity3d.com/6000.0/Documentation/Manual/build-profile-scene-list.html) | 장면 추가·제외·제거·순서 변경 조작 표를 포함한 본문 전체 | 열린 장면과 Project 드롭으로 추가한다. 제외는 목록 삭제와 다르며 순서는 직접 바꿀 수 있어야 한다. |
| [Unity 6000.0: Build Profiles window reference](https://docs.unity3d.com/6000.0/Documentation/Manual/build-profiles-reference.html) | Asset Import Overrides, Build options, Build Data, Platform/shared settings, Player Settings Overrides 전체 | 빌드와 실행을 연결하되 콘텐츠 빌드/캐시·컴파일 기호·디버그/프로파일러·압축·Player 설정은 별도 속성으로 판단한다. |
| [Epic: Packaging Unreal Engine Projects](https://dev.epicgames.com/documentation/en-us/unreal-engine/packaging-your-project) | 열람 페이지의 UE 5.8 본문: Build/Cook/Stage/Package/Deploy/Run, cooking/chunking, 구성, 설정, 기본 맵, Windows 패키징/취소/진단/종료, UAT/Launcher/배포 | 코드 빌드와 에셋 변환을 같은 작업으로 표현하지 않는다. 시작 맵과 구성은 명시적으로 검증하며 로그·취소·독립 실행/종료를 제작 흐름에 포함한다. |

각 페이지에 연결된 API·플랫폼 매뉴얼·압축·Project Launcher·UAT 문서 전체를 읽었다는 뜻은 아니다. 세부 확인 기록은 [detail-audit.json](reference-index/detail-audit.json)에 개별 항목으로 남긴다. 이 표의 마지막 열은 확인한 본문에서 HB 제작 계약으로 도출한 판단이며 두 엔진과 같은 바이너리 구조라는 주장이 아니다.

## HB의 데이터와 조작 계약

`prototype/build-profile.js`, `prototype/build-panel.js`, `prototype/app.js`, `tools/build-game.mjs`를 대조한 현재 구현이다.

| 세부 항목 | 현재 저장/동작 | 구별해야 할 범위 |
| --- | --- | --- |
| 창 진입 | 파일 → 빌드 프로필, 명령 검색, `Ctrl+Shift+B`; 기존 도킹 창에서 열림 | Unity/Epic 원문에서 이 HB 단축키를 가져온 것이 아니라 기존 HB 키 문맥에 추가함 |
| 프로필 저장 | `Settings/BuildProfiles.json`의 버전 1·독립 ID·이름·설정; SHA-256 revision 비교 후 저장 | Unity의 개별 BuildProfile 에셋과 HB의 프로젝트 설정 JSON은 형식이 다름 |
| 관리 | 프로필 선택·복제·삭제; 하나 이상 유지·최대 32개 | 설치된 여러 플랫폼/SDK 목록과 플랫폼 공유 설정 계층은 미구현 |
| 값 편집 | 게임 이름, 개발/배포 구성, 초기 창 너비/높이; 프로필 포커스의 `Ctrl+S`로 저장 | 아이콘·회사/버전·창 모드·품질/해상도 선택 UI·Player 설정 전체는 추가 대상 |
| 장면 추가 | 실제 Scene 파일 선택·열린 장면 추가·콘텐츠 브라우저의 장면 드롭; 중복 경로 제외 | 최대 256개; 비장면 파일을 Scene으로 등록하지 않음 |
| 포함/제외 | 각 경로의 `enabled`; 체크 해제는 목록에 남고 빌드에서 제외 | 제외 장면을 포함 콘텐츠가 직접 참조하면 사전 검증에서 거부 |
| 순서/시작 | 행 드래그 또는 위/아래 버튼·목록 제거 버튼; 첫 활성 장면이 시작 장면 | 여러 장면을 순서대로 자동 실행하는 기능과 다름; 전환은 게임 로직이 요청 |
| 검사/빌드 | 검사, 모두 저장하고 빌드, 빌드 후 실행; 단계/성공/오류/취소 표시 | 검사는 디스크 내용을 확인하며 열린 미저장 에셋을 자동 적용하지 않음 |
| 결과 사용 | 성공한 게임 실행·출력 폴더 열기; 검증된 작업 결과의 Game.exe만 실행 | 임의 EXE/경로를 이 API로 실행하지 않음 |

프로필은 미리 정한 Windows x64 타깃에 적용한다. 이름이 같아도 ID로 구분하며 프로필별 장면과 구성을 공유하지 않는다. 재읽기는 디스크 상태를 다시 가져오며, 다른 작성자가 저장해 revision이 바뀐 경우 조용히 덮어쓰지 않는다. 에셋 저장과 빌드 프로필 저장의 오류는 별개로 처리한다.

## 코드·콘텐츠·패키지 단계

`tools/build-game.mjs:inspectBuild/buildGame`, `tools/native-host.mjs:build`, `tools/build-jobs.mjs`가 실제 작업 경로다.

| 단계 | HB가 수행하는 내용 | 판정/실패 기준 |
| --- | --- | --- |
| 사전 확인 | 프로필 형식, 활성 Scene 존재/형식, 알려진 HB JSON 에셋 형식, 저장된 파일 참조를 확인 | 없는 참조·빠진 장면·불일치 C++ 소스·순환/이탈 경로를 오류로 보고 |
| 포함 집합 | 활성 Scene과 모든 비장면 `Assets/` 파일; 참조한 프로젝트 내부 파일은 폴더 위치와 관계없이 재귀 포함하고 C++ header/source도 포함 | 런타임에서 문자열 에셋 이름을 만들 수 있어 미사용 에셋 제거를 보장하지 않음; 개별 원본 100MB/총 포함 콘텐츠 1GB 제한 |
| 구 참조 유지 | 프로젝트 redirect 기록을 패키지에 저장; 가장 긴 폴더 경로부터 해석 | Legacy 장면의 BP 이름은 유일한 에셋 경로로 복사본에서 정규화; 불명확한 이름은 오류 |
| C++ 빌드 | BP에 저장된 메타데이터/소스와 실제 Source 쌍을 대조하고 소스 서명별 worker EXE 생성 | 소스가 달라지면 BP에서 다시 빌드해야 함; 여러 번역 단위·임의 native plugin 빌드는 별도 대상 |
| 개발 구성 | 사용자 worker에 `-O0 -g -static`; 개발 Player의 실행 상태 보고 저장 | native 디버거 attach나 원격 Profiler를 자동 제공하는 설정은 아님 |
| 배포 구성 | 사용자 worker에 `-O2 -s -static`; 정기 개발 상태 보고를 저장하지 않음 | HB 배포 구성을 UE Shipping과 동일한 최적화/기능 제거 수준으로 해석하지 않음 |
| 콘텐츠 준비 | 원본 형식을 유지해 `Content/`로 복사; 상대 경로·GLTF sidecar 참조 확인 | 텍스처 압축·모델/음향 변환·BP bytecode cook·플랫폼 셰이더 cook를 수행하지 않음 |
| 실행 파일 구성 | Player 모듈 의존 경로, Three/Rapier, Node, WebView2 Loader, precompiled worker, 고지 파일 동봉 | `prototype/app.js`, 편집기 `tools/serve.mjs`, 프로젝트 descriptor와 `Saved/`는 게임 출력에 포함하지 않음 |
| 결과 확정 | `Builds/<profile id>/<unique build id>`에 생성; 보고서 뒤 최종 `game.hbpack.json` 기록 | 이전 결과를 덮어쓰지 않음; 실패/취소 폴더에 `build-failed.json`을 남기고 성공 manifest를 확정하지 않음 |
| 작업 관리 | 프로젝트당 하나의 실행 중 작업·취소 신호·컴파일 중단·프로젝트 경계 검사 | 현재 작업 목록은 서버 메모리; 재시작 뒤 영속 보고서는 출력 폴더에서 확인 |

이 출력은 **Windows 게임 패키지**다. `Game.exe`는 Win32/WebView2 창을 열고 동봉 Node의 Player 서버가 게임 파일과 이미 빌드된 C++ worker를 제공한다. 실제 렌더러는 Three/WebGL2이고 물리는 Rapier 2D/3D WASM이다. 사용자에게 별도의 Node/C++ 컴파일러 설치 없이 게임을 실행시키지만 WebView2 Runtime은 실행 환경에 필요하다. DirectX 11/HLSL 렌더러와 완성된 cook/installer는 별도 제작 항목으로 남긴다.

## 편집기와 Player가 함께 쓰는 실행 경로

`prototype/player.js`는 `preparePlayWorld`, `BlueprintRuntime`, `engineOperations`, `sceneRendering`을 사용한다. 편집기 도형과 환경도 `scene-primitives.js`, `scene-environment.js`로 공유하므로 배포 시 별도의 가짜 장면이나 로직을 대신 실행하지 않는다.

1. 패키지 파일 목록의 크기·SHA-256과 실제 경로를 확인한 뒤 세션·콘텐츠·저장 정보를 연다. 이 검사는 손상 발견용이며 코드 서명/배포 인증과는 다르다.
2. 시작 Scene을 읽고 Prefab/컴포넌트·게임 프레임워크·입력 에셋·BP 바인딩을 준비한다. 메시·스프라이트·타일·머테리얼 리소스와 물리를 준비한 뒤 BP/사용자 C++ 초기화를 실행한다.
3. 실제 프레임에서 native frame/timer → BP tick → Scene 전환 요청을 처리하고 카메라·파티클·데칼과 GPU 화면을 갱신한다. BP breakpoints는 배포용 복사본에서 제거해 에디터 디버그 대기 상태로 들어가지 않게 한다.
4. Scene 전환은 이전 BP의 EndPlay와 실행 서비스/GPU 리소스를 정리한 다음 새로운 월드를 준비한다. 에디터 열린 문서와 복구 상태는 Player 세션에 가져오지 않는다.
5. 기본 카메라는 2D Scene에서 직교, 3D Scene에서 원근이다. Scene 카메라/시퀀스 카메라가 있으면 같은 실행 카메라 선택을 사용한다. 2.5D의 구체적인 카메라/물리 조합은 Scene 설정과 게임 제작 검증으로 판단한다.
6. `Esc` 메뉴의 계속·전체 화면·종료를 제공한다. 입력칸의 입력과 게임 키를 구분하고 포커스를 잃으면 눌린 키를 놓는다. 종료는 진행 중 프레임을 기다린 후 EndPlay·서비스 정리·게임 저장 flush·창/소유 서버 종료로 연결한다.

게임 저장은 패키지 파일을 고치는 대신 프로젝트 UUID별 사용자 데이터에 기록한다. 기본 경로는 `%LOCALAPPDATA%/HBEngine/Games/<id>`이며 편집기 레이아웃/복구 키와 분리한다. `/api/native/build`는 Player에서 컴파일 명령이 아니라 패키지에 등록된 소스 서명→worker 조회다. 알려지지 않은 소스는 거부하고 편집기 에셋 생성/쓰기 API를 제공하지 않는다.

실제 2D 개발/3D 배포 Game.exe에서 AudioContext running·AudioSource voice playing, 컴파일러 없는 C++ 호출, EndPlay 저장 flush와 재실행 보존을 확인했다. 무음 WAV fixture로 재생 상태를 검사했으므로 사람이 실제 음질을 들었다는 뜻은 아니다. 브라우저의 자동 재생 제한이 있으면 게임 시작 버튼을 실제 입력으로 눌러 재생을 시작한다. Esc 일시 정지/계속에서 시간 고정과 AudioContext suspended/running도 실제 Player에서 확인했다. smoke 검사는 화면 밖의 보이는 창과 검사 전용 16ms clock을 쓰고, 일반 게임은 실제 RAF를 사용한다. 배포에 Chromium 진단 flags를 넣지 않는다.

## 사람과 AI가 사용하는 같은 빌드 설정

`tools/editor-automation.mjs:engineSchema`의 `build` 계약과 아래 API가 동일한 프로필을 사용한다. 빌드 API는 저장된 파일을 소비하므로 AI가 열린 문서를 편집했다면 문서 revision을 확인하고 저장한 뒤 시작해야 한다.

| 호출 | 입력/결과 의미 |
| --- | --- |
| `GET /api/build/profiles` | 프로필과 디스크 revision 조회 |
| `PUT /api/build/profiles` | `{version:1,profiles,expectedRevision}` 검증·충돌 검사·저장 |
| `POST /api/build` | `{profileId,expectedRevision,dryRun}`로 비동기 작업 생성 |
| `GET /api/build/job?id=...` | 프로젝트 범위의 단계·상태·오류/결과 조회 |
| `POST /api/build/cancel` | `{id}`로 실행 중 작업 취소 |
| `POST /api/build/open` | 완료된 `{id,action:"run"}` 또는 `"reveal"` |

CLI는 `node tools/build-game.mjs <project.hbproject> <profileId> --dry-run`으로 사전 검사하고, 같은 명령에서 `--dry-run`을 제거해 출력한다. `npm run desktop:build`로 Player shell을 먼저 준비해야 한다. CLI와 UI가 같은 `inspectBuild/buildGame`을 호출하며 UI 빌드 후 실행도 해당 결과 경로를 사용한다.

## 검증 근거와 후속 세부 기능

`tools/check-package.mjs`와 `npm run test:package`는 실제 Game.exe 실행, GPU draw, BP→C++ 호출, 컴파일러가 없는 PATH, 한글/공백 경로, 서버 종료를 검사한다. 프로필 revision 충돌·Scene 제외·취소·쓰기 API 차단·경로/출처 검사·game save·파일 손상 거부도 재현 항목이다. 구체적인 이번 실행 결과와 화면 검증은 [작업 인계](../CODEX_HANDOFF.md)에 기록한다. 테스트 파일의 존재를 모든 플랫폼/기능 통과 근거로 사용하지 않는다.

현재 출력 경로를 추가해도 다음 항목은 계속 제작/검증 대상이다.

| 분야 | 다음 완료 판정을 위한 세부 항목 |
| --- | --- |
| 프로필/편집 | 여러 플랫폼·SDK/아키텍처·기호/조건 컴파일·Player 설정 전체·프로필별 품질·초기 전체 화면/해상도 선택·키 재설정·빌드 설정 Undo |
| 콘텐츠/cook | import override·타깃 텍스처/음향/모델 변환·셰이더/variant cook·사용 참조 분석·DDC·증분/clean/scripts-only·압축·Archive/chunk/patch·언어별 콘텐츠 |
| 코드/실행 | native DX11/HLSL 렌더러·다중 C++ 번역 단위/DLL·별도 플러그인/모듈 타깃·native 디버거·런타임 오류 복구·입력 장치별 검증 |
| 검증/자동화 | CI 전체 빌드 그래프·target profiler/capture·crash dump/report·큰 프로젝트/장면 전환 장기 실행·성능/메모리/CPU/GPU 예산·확정적 재현 빌드 |
| 배포/운영 | 설치/업데이트·WebView2 설치/오프라인 전략·코드 서명·아이콘/버전 리소스·스토어/SDK 배포·기기 Deploy·DLC/저장 migration·여러 빌드의 사용자 데이터 호환 |

기존 모든 분야의 세부 제작 요구를 이 패키징 목록으로 축소하지 않는다. 독립 Player는 작성한 게임을 편집기 밖에서 검증하는 소비자를 추가하며, 다른 엔진 제작 분야의 누락을 대신 해결하지 않는다.
