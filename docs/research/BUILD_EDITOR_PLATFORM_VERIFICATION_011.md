# 빌드·에디터 호스트 011 독립 본문 대조

2026-10-04, `research_only`. 분석 담당 `/root/build_editor_platform_research`와 별도로 `root`가 [011 분석 문서](BUILD_EDITOR_PLATFORM_RESEARCH_011.md)와 [기계 기록](build-editor-platform-research-011.json), 공식 source/body의 **12개 기술 텍스트 전체**·모든 표/선언/예제·구역별 finding을 직접 읽고 비교했어요. BuildProfiles/UAT 그림 2개도 실제 pixels를 보았어요. Packaging의 그림 31개(그중 GIF2)·영상1개는 읽지 않았고 그 페이지의 전체 body 완료를 보류한 기록이 맞아요.

집계는 source heading110개·heading 없는 VCam 도입1개, 표37개/172행/449셀, 전체 pre 예제·CLI 구문4개, BuildPlayer 표시 overload4개와 일치해요. API feedback heading2개와 생성된 OS tab heading14개를 source heading으로 세지 않았어요. Unreal hardware의5 switch/14 OS branch가 body에 전부 포함돼요. source/body/text hash 12개 묶음과 Unity exact source slice6개, Unreal 원본 SSR6개 및 모든 blocks의 body 재생성이 일치해요. **한정된 본문 대 분석 대조 통과**이며 전체 API/후속 계약·Packaging media 때문에 strict ledger 승격/verified는 0이에요.

## 고정한 증거와 실제 대조

- 분석 MD SHA256: `447f338e3cc4809f360197e74276254f73331a99d89cdfe0d986f580897b7cd5`
- 분석 JSON SHA256: `e3285b8f5307bd7f24f4475e0fbcd3d9f7cb41b11434ec50dfd3da1b9d7b2410`
- 원본과 추출본은 `native/build/reference-corpus/build-editor-platform-batch-011`에 있어요. [검증 기계 기록](build-editor-platform-verification-011.json)은 이 hash·페이지별 원문/body/집계·실제 읽기 범위를 연결해요.

Unity 웹 header6000.0/footer job76758565/build2026-10-03과 Unreal SSR applications5.8·revision을 비교했어요. Unity 오프라인 job76410965와 동일 source로 합산하지 않아요. sourceHash 일치만 보고 읽기를 인정한 것이 아니며 실제 body와 원문의 slice/SSR mapping·표·전체 예제·분석 finding을 함께 대조했어요. helper의 한글 경로/줄바꿈 정정 뒤의 최종 bytes를 기준으로 해요.

## 의미 판단의 대조 결과

프로필의 platform 공유 설정/장면과 독립 profile asset을 구분한 것이 맞아요. 실제 그림은 Project의 Assets/Settings/BuildProfiles 안의 Android/iOS 에셋 두 개를 보여줘요. 프로필 저장과 target 게임 설치/실행을 같은 결과로 취급하지 않았어요.

BuildPlayer4 선언과 두 전체 예제가 맞아요. 반환은 BuildReport이고 예제는 summary의 성공/실패·크기를 처리해요. 호출 뒤 GameObject 참조 재취득, define 변경의 domain reload 조건과 다른 target 호출만으로 바뀌지 않는 현재 symbol을 남겼어요. 빈 scene fallback은 구 scene-array overload 설명의 조건이며 새 profile 옵션의 기본값으로 확대하지 않았어요. callbacks/type fields/default/thread/cancel/예외는 후속 API 대기예요.

Android의 APK 기본·AAB 선택·Gradle export/내장 Build 경로, Run Device·OBB·개발 Profiler/CheckJNI·Ctrl+B/Cmd+B·debug/custom 서명·재시작 비밀번호 실패 조건이 일치해요. iOS의 Xcode project와 최종 앱2단계, Mac/cloud 분기, simulator/device·BundleID·Replace/Append 삭제 범위·같은 Unity iOS 판본·classes 보존·APP/FRAMEWORK suffix 표와 CLI 예제를 대조했어요. SDK 설치나 서명·명령 실행을 한 기록은 아니에요.

Unity Editor의 desktop native host 표와 Player의 mobile/desktop/console/server/web/XR/embedded 표는 다른 의미예요. ARM binary·lightmap·Linux import/window 조건도 읽었으며 현재 HB 지원표로 복사하지 않았어요. Unity Remote는 USB 입력/축소 화면을 desktop Editor에 연결해 실제 target 성능·독립 모바일 에디터를 입증하지 않아요. 여러 Android 기기 제한·JPEG/PNG·해상도 조건이 맞아요.

Unreal Packaging은 compile/cook/stage/package와 선택 deploy/run, cook 방식·참조 stripping·chunk·5개 configuration·game default map·실제 exe 종료 UI·취소 요청과 완료·로그 문맥을 구분해요. native Blueprint 문구/Pak 기본/추가 software 문구를 상세 현행 API 계약으로 확대하지 않은 판단이 맞아요. UAT의 reflection/BuildCommand·OS별 CLI·순차 commands·global/Perforce 표를 대조했어요. 실제 그림에는 UE4라는 제목이 있어5.8 현행 IDE 배치를 증명하지 않아요.

Unreal의14 OS branch 표와 Android/iOS SDK history를 대조했어요. 권장·최소·compile/install/target·과거 판본을 구분하고 Sequoia14/Sonoma15 명칭·번호, iOS5.5/A8 문단과5.8의 제외 경고, SDK15/16 shader-stripping 예외를 미해결로 남긴 것이 맞아요. 엔진 본문에 적힌 Google/Apple 제출 정책은 플랫폼 원문을 추가로 읽어야 해요. VCam의 camera modifiers/output·UMG·LiveLink·external devices·Multi-User를 전체 로컬 모바일 authoring으로 해석하지 않았어요.

## 검증의 경계

집계나 의미의 남은 비교 실패는 발견하지 않았어요. 이 결과는12개 고정 source에 대한 한정된 대조이며 SDK·서명/provisioning·BuildCookRun 전체 flags·asset cook/archive/chunk·stores·후속 API/media·모바일 local compiler/파일/OS 전부의 검증이 아니에요. 패키지 생성·설치·기기 실행/플레이·C++/노드/AI 구현 동등성을 이번에 검사하지 않았어요.

검증자는 source/engine/GUI·공유 원장을 변경하지 않았어요. source/body·분석 MD/JSON의 bytes가 바뀌면 이 검증도 stale로 처리해야 해요. 전체 분석 gate를 열지 않아요.
