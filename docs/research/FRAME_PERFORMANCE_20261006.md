# PC 120·모바일 60 프레임 요청과 실행 비용

기준 요청은 Auric_Loop의 `docs/엔진_요청_프레임.md` 전체예요. 기존 요청·측정은 삭제하지 않았어요. PC의 게임 루프 목표 120, 모바일 60, 엔진 고정 비용 4ms, 두 모듈의 시계와 사용자 C++ 호출 통합, 정적·잠든 물리 생략, 설치본의 게임 패키징 경로를 함께 다뤘어요.

## 실행 경로

- `Settings/BuildProfiles.json`의 `targetFrameRate`는 15~240 정수, `framePacing`은 `fixed/display`예요. 생략하면 Windows 120/fixed, Android·iOS 60/display예요. 기존 프로필·씬은 바꾸지 않고 실행 시 기본값을 해석해요. 편집기와 Game.exe가 같은 설정을 사용하고 물리 고정 간격은 1/60초를 유지해요.
- PC fixed 모드는 비동기 게임 단계가 끝난 뒤 다음 실제 시각의 마감 시간을 예약해요. 늦은 프레임을 연속 실행해 따라잡지 않아요. 편집기 렌더의 RAF와 게임 시계를 분리하고 종료·정지·모바일 배경 전환에서 예약을 취소해요. RAF는 디스플레이 주사율과 연결되는 API예요. [MDN requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- 같은 프레임의 모듈별 시계·타이머를 다음 사용자 호출의 `moduleFrames`로 묶어 프런트엔드 왕복 한 번에 보내요. 호스트는 각 모듈의 순서·수신 확인·기존 지연/타이머 계약을 유지해요. 모바일 AOT도 같은 묶음 계약이에요.
- Windows 편집기와 Player는 프로젝트·Origin·일회성 연결 주소를 확인하는 로컬 WebSocket을 재사용해요. 연결을 열기 전에 실패하면 HTTP를 사용하지만 이미 보낸 호출은 재전송하지 않아요. 압축은 끄고 메시지 4MiB·미응답 64개 상한을 유지해요. `ws`의 기존 서버 기능을 사용해요. [ws 서버](https://github.com/websockets/ws#simple-server)
- C++의 바뀐 행/필드만 되돌리고 동기화하며 변환 값을 캐시해요. 실제 변경된 오브젝트만 JSON 패치로 보내요. 직접 `bridgeWorld`를 수정하는 구형 C++ API도 변경 추적과 이전 수신값 복구를 유지해요. UI JSON은 값이 같으면 불변 객체를 재사용해요.
- 정적·잠든 몸체의 부모/포즈가 같으면 물리 동기화를 생략해요. 연속된 힘/속도 명령만 한 동기화로 처리하고 질의·생성·삭제·다른 명령 경계에서는 동기화해요. 부모 이동·텔레포트·힘에 의한 깨우기는 유지해요.
- 설치 폴더 바로 아래의 `HBPlayer.exe`도 패키지 제작기의 배포 런타임으로 찾도록 고쳤어요. A14에서 같은 공개 클래스 이름을 가진 별도 BP의 구현을 서로의 보조 cpp로 컴파일하던 충돌도 공용 소스 제작기에서 분리했어요. 파일 목록과 컴파일 대상 목록은 모두 캐시 키에 포함해요.
- Android 창에 프로필의 주사율을 요청해요. 이는 화면/기기에서 지원하는 실제 주사율 보장이 아니에요. [Android preferredRefreshRate](https://developer.android.com/reference/android/view/WindowManager.LayoutParams#preferredRefreshRate)

## 측정 결과

사용자 MD의 같은 부하 대조는 이전 설치본 `42bcd763ffa422e3` 중앙값18.9ms/p9524.1ms, `f39e8619a2936aff` 26.8ms/46.5ms예요. 별도 대조에서 이 증가폭은 재현되지 않았어요. 기록을 실패나 오측정으로 바꾸지 않아요. 같은 게임의 고정 사본으로 원래 비교 순서를 유지했고 원본 C++·에셋·검사기는 수정하지 않았어요.

최종 Windows release Game.exe는 설치본과 같은 루트 배치에서 제작했어요. `Test_Valen`의 고정 사본은 실행 오브젝트432개예요. 실제 Win32/WebView2 창에서 대기3초, F9 전투·마우스 공격6초를 측정했어요.

| 상황 | 실제 게임 FPS | 프레임 작업 중앙값 / p95 | 평균 엔진 고정 비용 |
| --- | ---: | ---: | ---: |
| 대기 | 118.67 | 6.70 / 8.20ms | 3.669ms |
| 전투 | 116.37 | 6.80 / 9.60ms | 3.957ms |

고정 비용은 FrameProfiler의 평균 simulation에서 같은 구간의 물리·AI·애니메이션 hook 시간과 hook 밖 사용자 C++ 함수 시간을 뺀 값이에요. 렌더 제출은 별도이며 대기 평균0.806ms/전투0.846ms예요. 전투 프로파일은 마지막600프레임이에요. 평균 비용이4ms 아래라는 결과이며 모든 프레임의4ms 상한이나 안정적인120fps를 입증하지 않아요. GPU 표시 지연·실제 휴대폰의60fps도 이 수치로 판정하지 않아요.

실제 패키지에서 스프라이트 이미지 로드·한글 HUD 텍스트·오류0·WebSocket C++ 수신과 HTTP native 호출0을 확인했어요. 새 폰트/모든 오디오/모든 코덱 검사를 대신하지 않아요. 이전 MD의 release 대기79~81fps/공격75~79fps와 측정 조건이 완전히 같다고 가정하지 않아요.

## 검증과 증거

- `node tools/check-frame-rate.mjs`: 기본값/검증, PC120 타이머, 144Hz 환경의 모바일60 제한, 늦은 작업·취소·실제 프레임 예산.
- `node tools/check-native-channel.mjs`: 접속 검증·프로젝트 변경·순서·중복·실패 후 재전송 방지·패키지 의존성.
- 공용 native-frame/concurrency/transport/world-patch/mobile-player 검사는 실제 C++·두 시계+호출 한 플랫폼 왕복·기존 직접 JSON 변경 복구·UI 공유를 확인해요.
- `node tools/check-physics.mjs`: 물리156항목, 부모 이동/정적/잠든 몸체/명령 경계와 실제 C++ 힘·각속도.
- `node tools/check-project-native.mjs`: 하위 폴더/보조 구현·캐시·같은 공개 클래스의 별도 구현/정적 상태·타일 묶음.
- Android `android-mobile-INkAIJ`: 실제 Java/DEX/JNI/C++ 두 CPU(arm64-v8a,x86_64), 16KB ELF/패키지 정렬·APK 서명·AAB 검증·60/display 설정·원본 보존 통과예요. 실제 휴대폰 실행·성능은 미검증이에요. iOS의 같은 소스 Xcode 결과는 설치 후속 기록에서 따로 확인해요.
- 로컬 상세 증거: `native/build/frame-regression-Y3u0Qb/package-performance.json`, `baseline-abba.json`, `final-abba.json`, `native/build/frame-mobile-proof.json`. 공개 요약은 [측정 값](FRAME_PERFORMANCE_20261006.json)이에요.

기존 사용자 창·프로필·ADB와 원래 8시간 검사 한 개는 변경하지 않아요. 이번 변경의 장시간·전체 엔진·Unity/Unreal 전체 분석 완료를 주장하지 않아요.
