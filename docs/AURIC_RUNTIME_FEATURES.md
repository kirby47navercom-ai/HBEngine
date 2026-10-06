# Auric 런타임 기능 변경

P1-6부터 P2-16까지 구현한 공용 경로와 검증 대상을 기록한다. 현재 문서는 구현 기록이며 검증 결과는 마지막 통합 검사에서 별도로 붙인다. 원본 Auric 프로젝트·검사 스크립트와 현재 사용자 설치본을 변경하지 않고 `native/build/auric-spawn-*` 사본에서 적용한다.

| 항목 | 구현 경로 | Auric 적용 |
|---|---|---|
| 소리 | C++ `Audio::Play/Stop/PlayMusic/StopMusic/PlayAt`, 비동기 로딩, 세션 음악 수명, 믹서 버스 | BP 소리 이벤트와 `AURIC_MUTE` 제거. 입력 전 음악 큐, 효과음 버림. headless는 요청을 기록 |
| UI | `UI::SetTexture/Position/Size/Rotation/Scale/Color/Opacity/Font/FontSize`, 방향별 ProgressBar, 애니메이션, 9-slice | 피로도 11장→세로 막대, 선택 테두리 5장→한 장 이동, 공격 그림 6장→한 장 교체. Actor BeginPlay 전에 위젯과 글꼴 준비 |
| 컴포넌트 | 정의의 자료형·범위를 검사하는 `Components` API, `Movement2D::SetSpeed`, `Camera::SetOrthoSize/SetFollow/Shake`, `Sprite::SetSize` | 감속을 컴포넌트 속도로 지정. 돌진 흔들림·귀환 확대 |
| 데이터 | `Data::Get/GetTable`, 실행 세션 캐시, 한글 행/열 편집, AssetType 선택기, 참조 이름 변경 | 실제 소스의 밸런스 필드, 방 5개와 등장 위치 7개, 대사 6곳을 에셋 3개로 이동. 표 변경에 C++ 재컴파일 불필요 |
| 입력 | 장치·키 가장자리 상태, 입력 소스 분리, 장면 간 같은 물리 상태, 터치 포인터 수명 | K키 우회 제거. TouchButton은 LeftMouseButton, 자동 조준은 최근 장치로 결정 |
| 편집 | 문서별 카메라, 깨끗한 문서 자동 재읽기, 수정 문서 디스크/내 것/비교, Source 메타데이터 캐시 | BP는 명시한 C++ 경로와 정규화 해시를 저장. 실행 시 Source에서 선언을 읽고, 빌드 결과는 문서 밖에 보관 |
| 2D | 원본 텍스처 tiled/sliced, 레이어별 Y 정렬, 발끝 기준, 정수 배율/레터박스, 스프라이트·화면 flash, C++ 애니메이션 | 합성 타일 PNG 대신 원본 바닥·벽. 640×360 기준 720p 2배·1080p 3배·2340×1080 양옆 여백 |
| headless | 같은 준비·서비스 경로, 음향/화면 요청 기록, 위젯 상태, nativeDefaults 덮어쓰기 | 원본 검사 9개와 추가 기능 검사를 함께 실행 |
| 모바일 | 공용 모바일 AOT, 가로/안전 영역/뒤로가기/수명, APK 빌드→지정 기기 설치 명령 | `node tools/run-android.mjs <hbproject> <profileId> <serial>` |
| 부스 | kiosk 빌드 설정, F12·무입력 리셋, 운영자 메뉴, 비정상 종료 감시 | `Kiosk.cmd`. 일반 종료는 재실행하지 않고 비정상 종료만 재실행 |
| 탄막 | 배열 적분·swept collider 질의·렌더 스타일별 인스턴싱, `Projectiles::Fire/TakeHits/OnHit` | 실제 Auric C++와 해골 30개를 둔 1,000개 검증 장면 |

## API 사용

```cpp
hb::Audio::Play("Assets/Audio/Hit.hbaudioasset.json", 1.f, 1.f);
hb::UI::SetTexture(player, "HUD", "AttackButton", spritePath);
hb::Movement2D::SetSpeed(player, 4.5f);
auto row = hb::Data::GetTable("Assets/Data/DT_Rooms.hbdata.json", "Room0");
const bool mobile = hb::Input::GetLastDevice() == "touch";
hb::Sprite::PlayAnimation(player, animationAsset, true);
hb::Projectiles::OnHit("OnProjectileHit");
hb::Projectiles::Fire(hb::Json{{"mode","circle"},{"count",24},
  {"origin",{0,0,0}},{"speed",8},{"lifetime",5},
  {"targetTags",{"Enemy"}}});
```

`OnHit`은 소유 BP의 지정 Custom Event로 `hits` 문자열(JSON 배열)을 전달한다. 이 이벤트를 사용자 C++ 함수에 연결하면 최대 256개 충돌을 한 호출로 받는다. 직접 폴링하려면 `TakeHits()`를 쓴다. 등록 이벤트는 해당 묶음을 소비하므로 같은 충돌을 폴링과 이벤트 양쪽에 중복 전달하지 않는다. 피해 적용은 게임 규칙이 담당한다.

투사체 한 세션의 기본 용량은 8,192개, 한 번 발사는 최대 4,096개, 활성 패턴은 1,024개, 활성 렌더 스타일은 64개다. 읽지 않은 충돌은 4,096개로 제한한다. 이 값들은 저장·실행 한도이며 fps 보장 수치가 아니다. 2D 원/상자/캡슐과 3D 구/상자/캡슐을 대상으로 swept 질의를 한다. 비균일 크기의 충돌체에는 보수적인 반지름을 사용한다. 복잡한 메시/폴리곤 투사체 질의는 이 경로에 포함되지 않는다.

기존 경로 없는 인메모리 C++ 문서는 호환성을 유지한다. 실제 Source 경로가 있는 새 저장은 원문·클래스 사본을 제거한다. 저장 해시는 줄바꿈/BOM을 정규화한 변경 감지값이며, 배포·빌드의 SHA-256 콘텐츠 검증과 별개다. Source가 바뀌었을 때 현재 원문을 다시 해석하므로 예전 문서의 해시가 실행을 막지 않는다.

## 통합 검사

`tools/prepare-auric-features.mjs`와 `prepare-auric-projectiles.mjs`가 격리 사본을 만든다. `tools/check-runtime-features.mjs`, 기존 UI/오디오/입력/2D 검사, 원본 `Auric_Loop/tools/check_demo.mjs`, 실제 Game.exe/편집기/Android 검사를 마지막에 묶어 실행한다. 원본 검사에서 K로 표기한 옛 모바일 시나리오는 격리 실행 어댑터가 터치 LeftMouseButton 패킷으로 옮기며, 검사 파일의 바이트는 바꾸지 않는다.

8시간 메모리 유지, Android 실기기 발열·지연, iOS 실기기·TestFlight 서명은 실제 해당 실행과 자격 증거가 필요하다. 코드·에뮬레이터·용량 제한으로 이 항목을 통과 처리하지 않는다.

## 공식 근거

- Unity [Pixel Perfect Camera](https://docs.unity.com/en-us/engine/6000.5/manual/unity2d/2d-urp/2d-pixelperfect/ref): 기준 해상도·스냅·정수 확대·crop 동작을 구분한다. HBEngine은 현재 직접 렌더의 정수 viewport와 정점 스냅을 사용하며, Unity의 저해상도 임시 RenderTexture 방식과 동일하다고 주장하지 않는다.
- Epic [Sound Concurrency](https://dev.epicgames.com/documentation/unreal-engine/sound-concurrency-reference-guide): 동시 음향 제한과 해제 정책을 구분한다. HBEngine의 현재 상한은 세션 전체 64개이며, Unreal의 모든 경쟁 규칙을 구현했다는 의미가 아니다.
- Epic [Create Sound 2D](https://dev.epicgames.com/documentation/unreal-engine/BlueprintAPI/Audio/CreateSound2D): 반환된 오디오 객체의 수명과 완료/중지 정리를 구분한다. HBEngine은 재생 핸들·완료/중지 정리와 장면 간 음악 수명을 적용한다.

실측과 실패/환경 경계는 [통합 검증 기록](AURIC_VALIDATION_20261006.md)에 보존해요.
