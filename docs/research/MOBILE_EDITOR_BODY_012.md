# 모바일 에디터·C++ 바이너리·프로젝트 저장 분석 012

2026-10-04, `research_only`. 게임을 모바일에 내보내는 것과 **에디터 자체를 모바일 앱으로 제작해 프로젝트를 편집하는 것**을 각각 조사해요. 주인님의 추가 요구는 PC와 모바일 에디터, PC 실행 파일과 모바일 게임의 빌드→설치→실행→재배포 과정 모두이며 기존 누적 범위를 대체하지 않아요.

이 묶음은 Unity/Unreal 연구에 필요한 보조 근거예요. Godot 4.5의 실제 Android 에디터를 비교 사례로 사용하며 HBEngine을 Godot 기반으로 바꾸거나 전체 Godot 문서를 분석했다고 표시하지 않아요. Unity/Unreal의 실제 editor host·게임 target은 [011](BUILD_EDITOR_PLATFORM_RESEARCH_011.md)에서 별도로 대조해요. [기계 기록](mobile-editor-body-012.json)에 source/body/hash·읽은 구역과 언어 탭을 남겼어요.

## 실제 읽기 범위

| 공식 자료 | 실제 읽은 범위 | 미확인 |
| --- | --- | --- |
| [Godot 4.5 Android editor](https://docs.godotengine.org/en/4.5/tutorials/editor/using_the_android_editor.html) | 기술 본문 전체·지원/권한/조작/동기화/플러그인/제한, 기술 heading 5개·본문 이미지 0개 | 연결 설정 API·권한/버그/단축키와 다운로드 edition |
| [Godot 4.5 Android compiling](https://docs.godotengine.org/en/4.5/engine_details/development/compiling/compiling_for_android.html) | 기술 텍스트 전체·heading 16개·명령 예제 block 11개 | custom template 그림 1개는 실제 HTTP403으로 미독, 전체 media 완료 아님 |
| [Android NDK ABIs](https://developer.android.com/ndk/guides/abis) | article 전체·heading 21개·ABI 표 1개(5행/15셀)·예제 block 11개와 Kotlin/Java 둘 다 | 실제 NDK/compiler edition·연결 API/ISA 문서·기기별 실행 |
| [Android documents/files](https://developer.android.com/training/data-storage/shared/documents-files) | article 전체·heading 44개·예제 block 24개와 Kotlin/Java 둘 다, resources 목록까지 | 연결 sample/video/API·provider별 기능·아래 본문 불일치 |
| [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/#software-requirements) | **2.5 subsection 전체만** 직접 읽음(2.5.1–2.5.18 및 하위 조항), 전체 지침 아님 | 다른 조항/예외·OS/배포 방식별 해석과 승인 여부, badge 그림 미독 |

Android 원문 Last updated는 각각 **2026-05-15 / 2026-10-01 UTC**예요. Apple 페이지에는 별도 판본 날짜를 확인하지 못해 조회 시점·hash만 고정해요. Godot 문서의 title에 4.5 판본이 표시돼요. 기술 본문 heading 집계에서 Godot의 User-contributed notes와 Previous/Next 탐색은 제외하되 원본 bytes를 보존해요. 실제 전체 본문/media를 확인한 것은 세 article이고 compile은 전체 텍스트/그림 미독, Apple은 부분 조항이에요. formal API 전체 분석·독립 verified·원장 승격은 모두 0이에요.

## 원출처에서 확인한 조건

### 실제 Android 에디터

Godot 4.5 문서는 Android에서 2D·3D 제작/내보내기를 설명하며 early access라고 표시해요. keyboard/mouse와 기존 단축키, scrollbar touch area, 시각 코딩, Editor/Play 전환을 다뤄요. PiP Play에는 입력이 없어요. GDExtension은 Android용 native binary가 필요하며 Gradle/Android plugin·C#·외부 script editor 제약을 별도로 적어요. 광범위 파일 접근이 없어도 제한된 범위에서 작동해요. APK 설치/마이크 권한도 파일 권한과 달라요. 휴대폰 UX·Forward+ 성능·Activity 복원 문제를 숨기지 않아요. [실제 본문](https://docs.godotengine.org/en/4.5/tutorials/editor/using_the_android_editor.html)

HB 판단: desktop dock 배치를 작은 화면에 그대로 축소하지 않고 touch 선택/다중 선택/핀 연결/값 입력·가상 키보드·하드웨어 단축키·2D pan/3D orbit 조작을 같은 명령 모델에 연결해야 해요. PiP나 원격 화면을 완전한 로컬 Play 입력의 검증으로 계산하면 안 돼요. 모바일 에디터에서 프로젝트/에셋/그래프/머테리얼/애니메이션을 실제 저장·재열기할 필요는 그대로 유지해요.

### 에디터 바이너리와 게임 템플릿

Godot 문서는 template_release/template_debug와 **target=editor**를 구분해요. editor와 template은 같은 version/commit이어야 하며, 마지막 ABI 빌드 뒤에 Android binary 생성을 수행해요. custom module/C++ 코드는 Advanced Options에서 custom template을 지정하는 경로를 안내해요. export template APK/ZIP과 Android editor APK의 출력 위치가 달라요. ABI·라이브러리 위치·버전 불일치가 설치 또는 시작 실패로 이어질 수 있어요. JDK17 requirement와 troubleshooting의 JDK8 jarsigner 설명은 같은 본문 안의 미해결 차이예요. [실제 본문](https://docs.godotengine.org/en/4.5/engine_details/development/compiling/compiling_for_android.html)

HB 판단: Editor 앱 빌드, 게임 Runtime 빌드, 사용자 C++ plugin 빌드, 플랫폼 asset cook를 개별 산출물로 version/hash/target에 고정해야 해요. 에디터 APK를 만들었다고 사용자 게임 APK가 만들어진 것은 아니에요. Android 에디터가 native plugin을 로드하는 것과 기기에서 C++을 새로 컴파일·링크·패키징하는 것도 다른 능력이에요. on-device/PC/빌드 서버 toolchain 각각의 실제 실행·권한·호환 경로를 검증해야 해요.

### C++ ABI와 설치되는 native code

NDK 본문은 ELF·호출/정렬·name mangling·ABI별 long double 차이와 지원 ISA를 다뤄요. Gradle/ndk-build의 ABI 선택과 CMake의 ABI별 빌드를 구분하며 APK 내 `/lib/<abi>/lib<name>.so` 위치·device primary/secondary 선택을 설명해요. fat APK는 크기 tradeoff가 있고 bundle/split은 별도 방식이에요. PAC/BTI는 arm64 설정·구형 CPU 호환 및 혼합 object/DRM/구형 assembly 문제를 함께 다뤄요. 설치 성공만으로 native startup 성공을 입증하지 않아요. [실제 본문](https://developer.android.com/ndk/guides/abis)

HB 판단: 플랫폼별 C++ 객체 메모리를 프로젝트 파일 포맷으로 직접 쓰지 않고 타입/숫자 표현/참조를 명시한 portable 데이터가 필요해요. native library와 노드 callable signature·엔진 ABI·build target·확장 버전의 호환을 검사해야 해요. x64 PC worker 실행 결과를 Android ARM64 사용자 C++ 실행의 증거로 사용하지 않아요. Android packaging/reference API와 실제 device matrix는 후속 분석으로 남겨요.

### 프로젝트·에셋 저장은 폴더 이름만으로 해결되지 않아요

SAF는 사용자 picker가 반환한 URI로 create/open/tree 접근을 제공해요. Create는 같은 이름 파일을 덮어쓰지 않아요. Android11의 tree/root/Download/data/obb 제한, provider flags, 영속 권한과 moved/deleted URI 상실을 설명해요. 표시 이름은 실제 파일명이 아닐 수 있고 size는 unknown일 수 있어요. canWrite만으로 편집 가능 여부를 정하면 안 돼요. virtual file은 MIME 변환 경로가 필요하고 bitmap 읽기는 background thread를 안내해요. media URI 변환은 새 권한을 주지 않아요. [전체 article](https://developer.android.com/training/data-storage/shared/documents-files)

HB 판단: 사람의 드래그/Import/폴더 선택과 AI 파일 명령은 URI·provider capability·grant·stable asset ID를 보존하는 같은 저장 모델을 써야 해요. cloud/provider 지연·읽기 전용·취소·권한 상실·부족 용량·복원도 처리해야 해요. desktop의 rename/atomic replace가 모든 provider에서 된다고 가정할 수 없어요. 프로젝트 snapshot/외부 원본/캐시/빌드 출력의 위치와 재동기화 충돌을 세분화하고 중단된 import가 성공 에셋으로 나타나지 않게 해야 해요.

### iOS/iPadOS 로컬 에디터의 코드/파일 경계

Apple 2.5.2는 앱 bundle/container와 기능을 바꾸는 코드의 download/install/execute 제약을 다루며 교육 목적의 제한된 예외 조건도 적어요. 2.5에는 public API·background mode의 목적·네트워크·파일 선택/녹화 조항도 있어요. 이는 HBEngine C++ 에디터의 승인 보장이 아니며 이 조항만으로 모바일 에디터 전체를 불가능하다고 결론내리지 않아요. [확인한 subsection](https://developer.apple.com/app-store/review/guidelines/#software-requirements)

HB 판단: iOS 에디터의 local data/graph 편집, 사전 컴파일된 C++ node library, 별도 Mac에서 native 빌드, 기기에 배포하는 과정을 각각 검토해야 해요. 로컬 compiler/JIT·교육 예외·외부 plugin을 가능한 것으로 미리 약속하지 않아요. 원격 빌드도 프로젝트 데이터·source revision·취소/오프라인·결과 로그·서명 책임이 필요해요. 원격 제어만 제공하고 로컬 모바일 에디터 요구를 완료 처리하지 않아요.

## 세부 대기열과 검증 조건

- SAF 예제는 Kotlin의 persist flags OR와 Java의 실제 grant mask가 다르고, virtual file 설명의 Android7.0/API25 대응도 불일치해요. 해당 버전 reference API와 공식 sample을 대조해야 해요. metadata/virtual Java 예제의 null cursor/close 처리와 Kotlin의 nullable 결과도 실제 compiler/API 검증 없이 복제하지 않아요.
- source에 링크한 native API의 선언·overload·thread·파일 descriptor/stream/cursor 수명·예외·취소를 아직 전체 대조하지 않았어요. SAF guide의 호출 예제를 formal Android API 완료 수로 세지 않아요.
- graphics/backend와 shader cook·mobile GPU format·CPU/메모리/열·lifecycle 복원·IME/접근성·orientation/fold·외부 keyboard/mouse·window/Play focus·파일/네트워크 권한·플러그인 ABI·원격 빌드·SDK/서명/installer/update·저장 호환과 CI가 함께 필요해요. 각 항목의 추가 본문/API 대기열을 유지해요.
- 사람의 에디터→저장→빌드→설치→cold launch→플레이/입력/오디오→suspend/resume→종료/저장→업데이트·재열기와 AI의 동일 command/revision 경로를 PC/Android/iOS 각각 따로 검증해야 해요. 이번에는 SDK 설치·기기 연결·서명·빌드·앱 실행을 하지 않았어요.

원문과 예제는 private cache에만 두며 연구는 해당 bodyHash의 실제 읽기/분석 범위만 입증해요. 모바일 에디터 앱 또는 플랫폼 지원 구현 완료를 나타내지 않아요.
