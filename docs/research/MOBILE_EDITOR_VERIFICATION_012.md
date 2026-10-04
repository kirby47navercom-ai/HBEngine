# 모바일 에디터 연구 012 독립 대조

2026-10-04, `research_only`. 분석자는 `root`, 독립 대조자는 `/root/build_editor_platform_research`예요. [분석 MD](MOBILE_EDITOR_BODY_012.md)와 [분석 JSON](mobile-editor-body-012.json)을 실제 원문·추출 본문에 대조했어요. 지정된 분석 snapshot의 hash와 5개 source/body hash, 원문에서 동일 selector로 재추출한 bytes, private evidence 3개가 모두 맞아요.

**전체 기술 본문 3개, 전체 텍스트/미디어 미독 1개, 정책 부분 조항 1개**라는 구분이 정확해요. 범위 내 텍스트·표·예제와 분석의 의미 대조는 통과했고, 미디어·공식 API·연결 계약·문서 불일치가 남아 있어 엄격한 `verified`와 원장 승격은 0개예요. 전체 코퍼스/API 완료를 입증하지 않아요.

| 공식 본문 | 독립 대조한 범위 | 결과 |
| --- | --- | --- |
| [Godot 4.5 Android editor](https://docs.godotengine.org/en/4.5/tutorials/editor/using_the_android_editor.html) | 기술 heading 5개 전체, 권한·input/Play·sync·GDExtension·제한. User-contributed notes heading 1개는 기술 분모에서 제외. article media 0개. | 실제 모바일 editor이며 Android 5+/OpenGL3 조건과 early access·Gradle/C#/외부 editor·PiP 입력·UX/복원 제한을 숨기지 않았어요. |
| [Godot 4.5 compile](https://docs.godotengine.org/en/4.5/engine_details/development/compiling/compiling_for_android.html) | 기술 heading 16개 전체·pre 11개 전체. editor/template 타깃·ABI·동일 version/commit·출력 위치·ADB/logcat와 JDK 문구를 비교. | 그림 1개는 독립 재요청도 HTTP403이었어요. 전체 텍스트 비교만 통과하며 그림을 읽었다고 올리지 않아요. |
| [Android NDK ABIs](https://developer.android.com/ndk/guides/abis) | heading 21개·pre 11개 전체·표 1개 5행/15셀·Kotlin/Java 둘 다. publisher 2026-05-15 UTC. | 네 ABI·ELF/호출/정렬/long double·빌드 시스템·라이브러리 선택·PAC/BTI 조건과 설치/실행 구분이 맞아요. |
| [Android SAF](https://developer.android.com/training/data-storage/shared/documents-files) | heading 44개·pre 24개 전체·Kotlin/Java 둘 다·resources 목록. publisher 2026-10-01 UTC. embedded image/video/iframe는 0개. | URI·provider capability·persistent grant·metadata·stream/bitmap/edit/delete/virtual file과 예제 차이가 맞아요. resources 링크의 실제 sample/video는 읽지 않았어요. |
| [Apple Guidelines 2.5](https://developer.apple.com/app-store/review/guidelines/#software-requirements) | 2.5.1–2.5.18와 하위 2.5.11(i–iii)/2.5.16(a) 텍스트만. 전체 정책 미독. | bundle/container·code 실행·교육 예외·public API·background·Files/녹화 등과 승인 미확정 구분이 맞아요. badge 13개 인스턴스/고유1파일 pixels 및 바깥 applicability legend는 미독이에요. |

## 확인한 차이와 판단의 경계

- SAF `Persist permissions`의 Kotlin은 read/write flags를 OR하고 Java는 반환 intent flags로 mask해요. 코드가 실제로 다르다는 판단은 맞으며, 어느 권한이 허용되고 어떤 예외가 나는지는 해당 Android API와 실제 기기 검증이 필요해요. 예제 호출을 formal API 완료 수로 세지 않았어요.
- SAF `Open a virtual file`의 Android 7.0/API25 표기는 불일치예요. 공식 [Build.VERSION_CODES의 N metadata](https://developer.android.com/reference/android/os/Build.VERSION_CODES#N)에서 Android 7.0/Added API24/값24만 추가 읽어 대조했어요. N의 behavior 목록과 클래스 전체를 읽거나 API unit 완료로 세지 않았어요. virtual-file 지원의 정확한 최초 계약은 후속 API 대기예요.
- Godot compile의 요구 JDK17과 설치 실패 troubleshooting의 JDK8 jarsigner는 원문에 함께 있어요. 문맥이 서로 달라 어느 값을 임의 폐기하거나 한 JDK로 실행 가능하다고 확정하지 않는 분석이 맞아요.
- SAF Java metadata는 null 검사 뒤에도 finally에서 cursor.close를 호출하고 virtual-file Java는 null cursor를 검사하지 않아요. Kotlin의 nullable 처리·bitmap/descriptor·stream 예제도 compiler와 API 계약을 검증한 것은 아니에요. 이를 복제 가능한 HB 구현으로 표현하지 않았어요.
- 첫 분석의 custom module/C++을 template에 포함해야 한다는 표현은 직접 규칙보다 구현 추론에 가까워 보완을 전달했어요. 분석자는 이를 **Advanced Options에서 custom template을 지정하는 경로**로 고쳤어요. 수정된 분석 문장과 해당 본문을 다시 대조해 일치를 확인했어요. 전체 module-linking 계약은 여전히 대기예요.

Android editor 앱이 native GDExtension binary를 로드하는 것, PC에서 target=editor APK를 만드는 것, 기기에서 새 C++을 컴파일하는 것은 다른 능력이에요. Android 사례와 Apple 2.5 부분 조항으로 HB의 on-device compiler·전체 iOS editor 승인·모바일 기능 완료를 확정하지 않은 점을 대조했어요. 사람/AI 공통 URI·capability·revision·portable data·node ABI는 HB 설계이며 원엔진 구현 사실로 바꾸지 않았어요.

## 증거와 남은 일

자세한 재계산 heading/pre/table/media inventory와 각 hash는 [검증 JSON](mobile-editor-verification-012.json)에 있어요. 수정 뒤 다시 읽은 분석 artifact는 MD `7b9d20c25b0c2188c9e26346b09714b9aca4e29d451ccbc81b01739250f52121`, JSON `a7ff0bd3c954570b482a099785ce9c453f34c783963dc05869b734eb5f34b5a2`에 고정했어요. 이 두 파일이 바뀌면 검증도 재대조해야 해요.

원본 compiler 그림의403·Apple badge pixels/legend·전체 formal API의 overload/오류/thread/stream·cursor·descriptor 수명·정확한 버전·provider 구현·스토어/배포 계약은 남겨요. supplementary Android 7.0 가이드의 VPN 문단은 직접 API mapping 근거로 불충분해 버렸고 N metadata만 사용했어요. 새로 확보한 두 페이지의 나머지 본문·미디어는 미독이에요. 기기·SDK 설치·GUI·빌드·앱 실행·engine 테스트는 하지 않았어요.
