# 모바일 실행 예산과 배포 검증

목표는 Auric 기본 방(약 130개 오브젝트, 적 7개, 탄 64개)에서 중급 Android 기기 30fps와 10분 안정 실행이다. 확장 목표는 실제 Auric 규칙·적 30개·투사체 1,000개다. 실기기 측정 전에는 이 목표를 성능 결과로 표기하지 않는다.

| 비용 | 초기 목표/제한 | 측정 기준 |
|---|---|---|
| 프레임 | 33.33ms 이하 | 실제 프레임 간격, 평균·p95와 30fps 미만 비율 |
| C++ | 같은 모듈의 독립 호출을 프레임당 묶음으로 전달 | 왕복 횟수·직렬화·patch·실제 작업 시간 |
| 오브젝트 | 기본 방 약 130개, 적 7개 | 활성/비활성 분리. 보스 스트레스 적 30개 별도 |
| 투사체 | 기본 64개, 확장 1,000개 | 엔진 배열·인스턴싱. 일반 Actor 1,000개와 비용이 같지 않음 |
| 음향 | 실행 상한 64개 동시 voice | 살아 있는/로딩 voice, decode 메모리, 중지 후 회수 |
| UI | 위젯 에셋당 최대 256개 요소 | 실제 화면 배율·노치·한글 글꼴·투명 그림·터치 충돌 |
| 렌더 | 도트는 nearest·정수 배율 | draw calls, 텍스처 메모리, 제출 시간과 실제 간격 구분 |
| 메모리 | 종료·장면 반복 뒤 자원 회수 | JavaScript heap, native/전체 프로세스, GL textures/geometries 추세 |

기기별 안전 한도는 장면·물리·텍스처 크기·화면 해상도·GPU에 따라 다르다. 오브젝트 개수만으로 30fps를 보장하지 않는다. 확장 측정에서는 기본 방과 같은 해상도·기기·열 상태에서 비교한다. 에뮬레이터 GPU가 호스트 PC GPU를 사용하는 결과는 실기기 결과와 별도로 저장한다.

```powershell
node tools/run-android.mjs C:/path/AuricLoop.hbproject android <adb-serial>
```

`android`는 프로젝트에 저장된 Android 빌드 프로필 ID다. 실기기는 arm64-v8a APK, x86_64 에뮬레이터는 별도 프로필을 사용한다. 지정하지 않은 기기나 사용자의 기존 앱을 임의로 선택·삭제하지 않는다. AAB는 스토어 제출 형식이며 위 명령의 기기 설치에는 APK 프로필을 쓴다.

실기기 기록에는 모델/SoC/OS·화면·앱 ABI·빌드 해시·주변 온도·배터리·충전 여부를 포함한다. 10분 동안 1분 간격 프레임·메모리·배터리 온도를 기록하고, 터치 누름→시각 변화 지연은 실제 장치 캡처나 장치 시각 정보로 측정한다. 원격 제어 통신 왕복을 터치 지연으로 계산하지 않는다.

iOS의 SDK 컴파일·시뮬레이터·오디오 신호 검사는 원격 macOS 작업으로 할 수 있다. 실제 iPhone 설치와 TestFlight에는 Apple Developer 팀, 해당 Bundle ID, 배포 인증서/프로비저닝 또는 App Store Connect API 자격이 필요하다. 비밀값은 프로젝트/커밋에 넣지 않고 CI secret으로 제공한다. 서명 자료가 없는 현재 환경에서 서명된 TestFlight 빌드를 만들었다고 기록하지 않는다.

## 2026-10-06 실제 에뮬레이터 측정

Auric 사본의 실제 APK(`android-window-GWQQIo/acceptance.json`)에서 1,000발·적30개·사용자 C++ 규칙·HUD·터치·오디오를 600프레임 실행했다. 평균40.9054fps, 게임 작업 평균21.0962ms/p95 32.8ms, 화면 간격p95 34.4ms이며 33ms를 넘은 작업은28/600프레임이다. 작업시간p95 예산을 통과해도 모든 화면 간격이33.33ms 이하라는 뜻은 아니다.

Android36 x86_64, 실제4가상코어(0–3), 720×1280/density240 요청, 가로 앱, 호스트RTX4070SUPER/ANGLE 조건이다. 실제 휴대폰의 SoC·발열·배터리 결과로 쓰지 않는다. 93개 생성/Construction/다음 프레임 포인터, 효과음16종·음악4곡의 비영 신호, TouchButton, HOME/복귀, Back 일시정지/재개도 같은 APK에서 통과했다. 실제 청취는 수행하지 않았다.

Android16/target36의 Back은 API33+ OnBackInvokedDispatcher로 받는다. 이전 기기는 onBackPressed 경로를 유지한다. [Android16 공식 변경](https://developer.android.com/about/versions/16/behavior-changes-16#predictive-back)을 근거로 연결했으며 실제 에뮬레이터 Back 입력 두 번으로 확인했다.
