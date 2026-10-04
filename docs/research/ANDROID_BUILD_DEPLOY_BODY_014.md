# Android 게임 빌드·서명·설치·시작 본문 분석 014

2026-10-04 기준 `research_only`예요. 공식 Android 가이드 **6개 전체 기술 본문**의 표·언어별 코드·그림을 직접 읽고 분석했어요. Unity·Unreal 전체 corpus나 Android SDK 전체 API의 분석 완료가 아니에요. Android ABI는 012와 같은 bodyHash인 본문을 다시 읽었으며 신규 고유 본문으로 더하지 않아요. **엄격한 독립 verified·원장 승격·기기 설치/실행은 모두 0**이에요.

이 분석은 [분석 규약](ANALYSIS_PROTOCOL.md), [게임 출력·에디터 누적 요구](EXPORT_EDITOR_REQUIREMENTS.md), [빌드·호스트 011](BUILD_EDITOR_PLATFORM_RESEARCH_011.md)에 연결해요. 공개 파일에는 자체 분석·구역 locator·hash만 남기고 원문 전체 본문·표·코드·그림은 Git ignored `native/build/reference-corpus/android-build-deploy-batch-014`에 보존해요. 자동 확보·추출은 읽기나 의미 분석의 증거로 계산하지 않았어요.

## 실제 읽은 제한본과 판본

| ID | 공식 원문 | 원문 갱신일 UTC | heading / 표 / pre | 그림 회수 |
| --- | --- | --- | --- | --- |
| ABD014-01 | [명령줄 빌드](https://developer.android.com/build/building-cmdline) | 2026-02-26 | 22 / 2 / 21 | 0 |
| ABD014-02 | [앱 서명](https://developer.android.com/studio/publish/app-signing) | 2026-03-06 | 26 / 0 / 6 | 12 |
| ABD014-03 | [adb](https://developer.android.com/tools/adb) | 2026-09-25 | 34 / 4 / 40 | 4 |
| ABD014-04 | [logcat](https://developer.android.com/tools/logcat) | 2024-01-03 | 11 / 0 / 16 | 0 |
| ABD014-05 | [Android ABI](https://developer.android.com/ndk/guides/abis) | 2026-05-15 | 22 / 1 / 11 | 0 |
| ABD014-06 | [GameActivity 시작](https://developer.android.com/games/agdk/game-activity/get-started) | 2026-09-28 | 11 / 0 / 11 | 0 |

각 페이지는 `?hl=en` 영어 응답의 원본 bytes·실제 `.devsite-article-body` HTML·추출 텍스트를 별도로 고정했어요. 이 페이지들은 SDK 판본 selector가 없는 웹 가이드예요. 갱신일과 본문의 Android/ADB/AGP/GameActivity 조건을 구분하며 현재 SDK 전체 호환판본을 확정했다고 표현하지 않아요. 확보 시각, sourceHash/bodyHash/textHash, 모든 heading·표·pre·inline code·미디어 inventory, 실제 구역별 사실은 [기계 기록](android-build-deploy-body-014.json)에 있어요. 동일 anchor의 언어 heading도 ordinal로 구분해요. 제목의 collection 도구 글자는 기술 heading에서 제외했고 GameActivity의 본문 내부 h1을 두 번 세지 않았어요.

전체 **126heading·7표(83행/171셀)·105전체 pre block·16그림 회수/14종**을 읽었어요. pre에는 명령 구문·출력·설정·코드 예제가 섞여 있으므로 105를 API 선언이나 실행한 시험 수로 사용하지 않아요. Kotlin/Groovy, Kotlin/Java가 제공된 모든 탭을 읽었어요. 그림의 UI는 원문에 제공된 snapshot이며 현재 설치한 Android Studio의 실제 조작을 입증하지 않아요. 미디어 미독은 0이고 linked release·reference·sample은 별도 미독이에요.

## 산출물·서명·업데이트를 연결하는 분석

`APK`, `AAB`, AAB에서 생성된 기기별 APK 집합을 같은 artifact로 취급하면 설치 경로를 잘못 선택하게 돼요. **HB 판단**으로 profile의 `packageFormat`, build output과 install input의 형식을 분리하고 변환된 APK도 별도 hash·parent artifact로 연결해야 해요. 근거 구역은 ABD014-01의 `build_bundle`, `deploy_from_bundle`, `sign_manually`예요. `assemble`와 `install` 완료를 서로 대체하지 않아요.

**원출처 사실**은 debug 인증서, 업로드 인증서, 기기에 배포되는 APK 인증서의 역할이 다르다는 것이에요. ABD014-02의 `app-signing-google-play`, `upgrade_key`, `reset_upload_key`, `considerations`를 함께 읽어 단순한 ‘키는 절대 변경되지 않는다’ 문장을 키 upgrade의 OS 분기 없이 절대규칙으로 확대하지 않았어요. **HB 판단**으로 signing reference에 용도·인증서 fingerprint·배포 channel·lineage 확인 상태를 남기고 비밀값은 profile·로그·AI 응답에 넣지 않아요. upload key reset 성공을 installed app의 서명키 교체로 보고하지 않아요.

앱 identity도 project UUID, application ID/package, activity component, artifact version을 구분해야 해요. ABD014-02 `considerations`와 ABD014-03 `pm`은 업데이트·데이터보존·downgrade가 서로 다른 동작임을 보여줘요. **HB 추론**으로 debug/release flavor의 ID·서명 차이는 설치 방식과 저장 데이터의 연속성을 검사하는 입력이에요. applicationId/namespace 전체규칙과 versionCode 제한은 후속 원문을 읽기 전까지 미확인으로 남겨요.

## 설치·시작·플레이의 실패 경계

| 관측 단계 | 직접 사실의 locator | HB 설계 판단과 요구 |
| --- | --- | --- |
| 기기 연결 | ABD014-03 `Enabling`, `devicestatus`, `directingcommands` | capability snapshot에 serial·연결/승인·OS·ABI와 확인시각을 고정해요. 발견한 기기가 부팅완료·사용가능하다는 결론을 자동으로 만들지 않아요. |
| 설치 | ABD014-03 `move`, 표2 `pm` | APK 집합·user·test-only·replace/downgrade 옵션을 job 입력에 기록해요. 다중기기 모호성·끊김·기기 부적합·서명·공간·split 오류는 실패 stage와 원시 오류를 보존해요. 전체 error code와 숫자는 아직 미확인이에요. |
| Activity 시작 | ABD014-03 `am`, `IntentSpec`; ABD014-06 `android_manifest` | 명시 component와 시작 대기 결과를 report에 남겨요. install 성공·Activity 시작 완료·native runtime ready를 서로 다른 관측값으로 보존해요. |
| native 시작 | ABD014-05 `native-code-in-app-packages`, `aen`; ABD014-06 `implement-android-main` | native shared library와 모든 의존성의 ABI·manifest 이름·loadLibrary 이름·entry를 검사해요. 패키지가 존재하거나 설치됐다는 사실만으로 렌더·입력·게임이 시작됐다고 보고하지 않아요. |
| 로그·실제 플레이 | ABD014-04 `Overview`, `filteringOutput`, `alternativeBuffers` | stage·device·package·PID와 로그필터/시간 범위를 함께 기록해요. 필터 또는 빌드에서 로그가 제거됐으면 ‘로그 없음’을 실행 성공 근거로 쓰지 않아요. 실제 입력·오디오·저장·pause/resume·업데이트 플레이 검사는 구현 후 기기별로 남겨요. |

ABD014-03 전체 표에는 device policy·user/data 초기화·profiling·capture 등의 명령도 있어요. **HB 판단**으로 일반 설치 작업과 이 명령의 권한·의도를 분리해야 해요. 원문의 `testharness`, `pm clear`, 정책 owner를 연구 중 실행하거나 자동 오류복구에 적용하지 않았어요. `screenrecord` 영상만으로 오디오 성공을 판정하지 않는 요구도 남겨요.

## native ABI와 시작 코드의 API 한계

ABI는 CPU 이름 외에도 호출 규약·C++ 경계·binary 형식을 포함하므로 Windows C++ worker 성공을 Android `.so`의 성공으로 확대하지 않아요. **HB 판단**으로 runtime·사용자 C++ module·plugin의 native build를 target ABI별 artifact로 고정하고 shader/asset 포맷·Android shell을 함께 검사해야 해요. GameActivity 지원 API19와 엔진·NDK·store의 최소 지원조건은 별도 기준이에요. 이 제한본만으로 HBEngine의 지원 OS/ABI를 발표하지 않아요.

ABD014-06은 실제 `android_main` entry 예제와 별도 event thread·destroyRequested 처리·input buffer swap/clear 흐름을 제공해요. 그러나 이것은 **가이드의 예제**이고 모든 header/API 선언·overload·thread/ownership/lifetime/error 계약이 아니에요. 공식 reference 본문 확인은 0이며 entry의 표시 signature 1개만 별도로 기록했어요. Android app/buffer 포인터의 소유·유효기간과 callback thread는 임의로 확정하지 않았어요.

같은 본문의 code10은 `android_app_clear_motion_events`에 inputBuffer를, code11은 mApp을 전달해요. handler의 prose/code 이름도 달라요. **원출처 차이**로 남겨 실제 공식 header·판본 소스 대조 전에는 정상 overload 둘로 계산하거나 엔진에 복사하지 않아요. 서명 그림의 암호화 키 export 옵션 역시 본문의 deprecated 설명과 함께 읽었어요.

## 사람·C++·노드·AI의 공통 경로

현재 읽기 전용 대조는 `prototype/build-profile.js:1`의 Windows x64 계약, `tools/build-game.mjs:15`의 profile revision·`:64`의 buildGame·`:66`의 Windows host 제한·`:84`의 artifact manifest·`:85`의 report·`:86`의 실패파일과 [AI API](../AI_ENGINE_API.md)의 빌드 구역이에요. 현재 빌드는 디스크 에셋을 소비하고 공통 profile/job/cancel/report 경로를 제공하는 코드예요. 이 파일의 존재와 과거 PC 검사 설명을 Android build·install·play 증거로 세지 않았어요.

| 누적 요구 | HB 미구현 설계 후보 | 향후 확인할 완료 증거 |
| --- | --- | --- |
| HB-BUILD-COMMON, HB-AI-PLATFORM | 사람UI·C++서비스·노드·AI가 동일 profile revision과 project/source/content revision snapshot을 소비해요. preflight/dry-run은 build host·toolchain·device capability를 검사하고 실제 실행 job은 validate→compile/link→cook→stage→package→sign→install→launch로 기록해요. | 저장된 revision과 artifact hash를 재계산하고 stale profile/source·누락SDK·허용하지 않은 조합을 거부해요. 현재 `/api/build` 계약과 구분한 새 schema 검증이 필요해요. |
| HB-AI-PLATFORM | artifact는 형식·ABI·application identity·서명 fingerprint/reference·parent hash·build ID를 담고 report는 job ID·stage·원시오류·시간·로그·device snapshot·관측결과를 연결해요. AI도 같은 결과를 읽고 종료상태 확인 뒤 retry를 판단해요. | 취소요청/취소완료·부분artifact·설치중단·remotehost/network끊김·변경revision 재시도와 멱등성을 검사해요. shell문자열 임의연결 대신 타입검증된 입력을 사용해요. |
| HB-EXPORT-MOBILE | Android game runtime과 사용자 C++/노드가 같은 데이터 의미를 유지하되 portable OS/GPU/native shell·ABI·touch·lifecycle·저장은 기기에서 입증해요. | 새설치→cold start→2D/2.5D/3D 플레이→중단/복원→저장/업데이트를 debug와release·ABI별로 확인해요. |
| HB-EDITOR-PC, HB-EDITOR-MOBILE | PC와 모바일 editor 제품의 authoring·저장/재열기·C++편집·local/remote build를 별도 capability로 남겨요. editor-app artifact와 game-app artifact를 분리해요. | 모바일 기기의 실제 제작·IME·파일provider·오프라인 복원·공통UI/AI 편집 증거가 필요해요. 이 gameActivity 안내는 독립 모바일 editor 지원 증거가 아니에요. |

위 이름과 데이터 필드는 **HB 설계 후보**이며 Android나 Unity/Unreal의 공식 API 이름이 아니에요. 구현·서버API·공유 원장·status·엔진은 수정하지 않았고 SDK 설치·build/adb/logcat/emulator 실행·GUI·기기 검사를 하지 않았어요. 원문/hash 구조 재대조는 자료 점검이며 engine test와 독립 의미 검증을 대신하지 않아요.

## 남은 분석과 검증

미해결은 **9문제군**이에요. 판본호환/전체분모, formal native API·수명/thread/오류, guide 내부 인수차이, scheme/lineage·bundletool, identity/version·저장이전, ABI/STL/JNI/16KB·GPU/lifecycle, 설치 error registry·기기재현, 모바일 editor 제작능력, 독립검증을 기계 기록의 `unresolved`에 출처별로 남겼어요. 모든 발견 링크를 읽었다고 표시하지 않았고 `discoveryClosed=false`, 전체 corpus/API 분모는 `null`이에요. 전체 분석 gate와 engine 구현 재개 조건은 열지 않아요.
