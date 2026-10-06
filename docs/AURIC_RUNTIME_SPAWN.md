# 실행 중 생성·찾기·제거 계약 — Auric P0-4

## 공용 API와 제작

`hb::Scene::Spawn(assetOrClass, transform, actorId="")`, `Destroy(actor)`, `GetAllActorsOfClass(className, includeInactive=false)`, `GetActorsWithTag(tag, includeInactive=false)`, `FindActorById(id, includeInactive=false)`를 C++ 선언에서 BP 노드로 생성해요. Editor Play, headless, Windows Player, 모바일 AOT가 같은 에셋 해석·입력/출력 검증·실행 서비스를 사용해요. 기존 Spawn Actor/Destroy Actor와 미리 배치한 ActorPool API도 유지해요.

생성 대상은 BP 경로, Prefab 경로, 중복 없는 에셋 이름, 등록된 C++ Actor 클래스, 기본 Actor/Pawn/Character/도형이에요. BP는 P0-3 부모 해석과 명시적 기본값을 사용하고, Prefab은 자식·컴포넌트·로컬 변환을 복제해요. 선언된 오브젝트 참조만 새 ID로 바꿔요. 이름·태그·일반 문자열을 ID처럼 치환하지 않아요. Camera.followTarget, Controller.pawn 같은 컴포넌트 참조도 schema에서 구분해요. 공유 C++ 클래스 이름 충돌은 거절해요.

찾기는 활성 Actor만 반환하고 widget/component와 제거 중인 Actor를 제외해요. `includeInactive=true`이면 풀 안의 Actor도 반환해요. 클래스 검색에는 BP 이름/경로, BP 부모 계층, C++ 부모와 Actor/Pawn/Character 계층이 포함돼요. 태그는 정확히 일치해야 해요. 빈 검색은 빈 배열, 없는 ID는 null이에요. 전체 Actor를 순회하므로 매 프레임 다수 호출하는 인덱스 검색으로 표현하지 않아요.

```cpp
hb::Transform at;
at.position = {4, 5, 0};
auto* enemy = hb::Scene::Spawn("Assets/BP_Skeleton.hbblueprint.json", at);
auto* stats = dynamic_cast<EnemyStats*>(enemy); // 같은 C++ 빌드
if (stats) stats->MaxHp = 8;
auto cameras = hb::Scene::GetActorsWithTag("MainCamera");
hb::Scene::Destroy(enemy);
```

## 수명과 풀

BP Spawn의 생성 순서는 기본값·자식 등록 → Construction → 위젯/애니메이션 등 Actor 서비스 → 게임 시스템 → BeginPlay예요. BeginPlay에서 자신을 제거하면 Spawn은 null을 반환해요. 로딩 중 Stop/다음 실행으로 넘어가면 이전 생성 작업이 새 월드의 Actor를 지우거나 BeginPlay를 실행하지 않아요.

C++ Spawn은 worker 안의 **실제 사용자 클래스 객체**와 기본값을 먼저 만들어요. 같은 함수 안에서 dynamic_cast, 속성 변경, 검색, Destroy/재사용이 가능해요. BP Construction/BeginPlay는 C++ 호출이 끝나 생성 명령을 월드에 적용할 때 실행돼요. Unreal의 SpawnActor와 모든 수명 콜백 시점이 동일하다고 해석하지 않아요.

BP 루트에 **PooledActor** 컴포넌트를 넣고 `maxInactive`를 지정하면 Spawn/Destroy가 자동으로 풀을 사용해요. 재사용은 실제 Actor/C++ 객체 ID를 유지하고 선언된 기본값을 다시 적용해요. 풀 획득 실패는 이전 비활성 상태로 되돌려요. 보관 수를 넘으면 실제 제거해요. Destroy는 자식부터 EndPlay와 소유 Timer/Stopwatch·Delay·Timeline·입력·구독·AI·UI·애니메이션·오디오를 정리해요. 풀의 OnPoolAcquire/OnPoolRelease도 제공해요. null/없는 Actor/이미 반환한 Actor의 Destroy는 반복해도 안전해요.

BP object 변수/배열이 없는 Actor ID를 가리키면 해당 원소를 null로 바꾸고 실행당 ID별 경고를 한 번 출력해요. 원본 파일을 고치지 않아요. 타입 오류나 임의 C++/프로토콜 참조를 허용하는 규칙은 아니에요.

## C++ 모듈과 한계

생성 직후 다른 빌드 객체에는 Native::Get/Set/Call을 사용해요. 생성 명령의 위치와 중첩 호출 영수증을 대조하여 Spawn → 다른 모듈 속성 변경/함수 → 물리 변경 순서를 보존해요. 모바일 NativeRouting도 같은 순서를 사용해요. 조작된 Actor ID/클래스/모듈 소유권은 거절해요. 생성한 Collider에 같은 C++ 호출 안에서 질의할 수 있어요.

실행 Actor 최대 2,000개, 생성 템플릿 최대 1,024개, 템플릿별 Actor 최대 128개, 전체 템플릿 Actor 최대 10,000개, wire context 최대 2MB예요. 처음 Spawn을 사용하는 월드는 생성 대상 BP/Prefab을 준비해요. 모든 에셋의 완전한 지연 로딩을 구현했다고 해석하지 않아요.

다른 모듈의 **중첩 피호출 함수 자체가 다시 Spawn**하는 경로의 catalog 전달/새 Actor 전파는 추가 대상이에요. 일반 함수에서 직접 Spawn한 다른 모듈 객체에 Get/Set/Call하는 경로와 구분해요. C++ 예외 시 공개 월드와 생성 명령은 적용하지 않고 이전 성공한 묶음 결과는 보존하지만, 사용자 private/static 필드·외부 파일 등 임의 부작용을 롤백하지 않아요. C++ 원시 포인터를 삭제 후 보관해 재접근하는 것은 지원하지 않아요.

## 원본 데모와 실측

검사는 `tools/prepare-auric-spawn.mjs`로 **격리 사본만** 바꿔요. 전체 장면의 미리 배치한 PooledActor 1,005개를 제거하고, 실제 게임의 SpriteRenderer/Collider/Rigidbody를 가진 Prefab으로 적·탄·골드를 Spawn해요. Hub도 BP_TopDownShooter를 사용하고 BP_Hub 사본을 제거해요. 카메라는 MainCamera 태그로 찾아요. 원본 `Auric_Loop/tools/check_demo.mjs` 바이트를 그대로 실행해요. 원본 검사 9개의 수치 동일성과 원본 게임 225개 파일 SHA, 검사 중 고정한 엔진 소스 SHA도 별도로 대조해요.

성능 사본은 원형 12발 두 번(0.5초 간격, 다음 쌍까지 3.5초), 수명 3초와 알레아 0.15초 간격(6.6667발/초), 원본 수명 1.6초를 동시에 실행해요. 시작 6초 뒤 PC Player 240개/Editor VM 120개/Android 180개 프레임을 측정해요. 실제 스프라이트·한글 HUD·숨김 이미지·viewport를 캡처해 확인해요. 처음 작성한 1.5초마다 두 링/플레이어 탄 3초 사본은 원본보다 큰 부하였으므로 별도 확대 부하 결과로 보존해요. 측정 조건 수정은 성능 최적화로 계산하지 않아요.

사용자 설치본/프로필/기본 ADB 서버는 변경하지 않아요. Android 에뮬레이터는 물리 기기·발열·배터리·음향 청취 검증과 구분해요. Editor의 VM 처리 빈도는 디스플레이 fps와 구분해요. CPU work/render submission은 GPU 완료 시간과 구분해요.

| 검사 | 결과 | 로컬 증거 (`native/build/` 아래) |
|---|---|---|
| 원본 데모 | 9개 결과 수치 동일, 원본 225개 파일/고정 엔진 SHA 보존 | `auric-original-ll0oi1` |
| 미리 배치한 풀 제거 사본 | 원본 checker 9개 통과, Hub/Dungeon 공통 BP, MainCamera 검색, 원본/고정 엔진 SHA 보존 | `auric-spawn-58vhJd/acceptance.json`, `original-checker.log` |
| 실제 Windows Game.exe | 242프레임 평균 60.5772fps, work 평균 4.7835ms/p95 5.6000ms, 활성 탄 최대 36 | `auric-spawn-58vhJd/player-window-UUw9bt` |
| 실제 Editor Play | VM work 평균 4.5331ms/p95 5.5000ms, 활성 탄 최대 35. VM 처리 161.47회/초를 화면 fps로 계산하지 않음 | `auric-spawn-58vhJd/editor-window-QI0UDC` |
| 실제 Android APK 두 번 | 58.7115/59.1043fps, work 평균 8.3086/8.1834ms, p95 11.7/12.4ms, 활성 탄 최대 37 | `auric-spawn-58vhJd/android-window-eZy69Q` |
| 공유 런타임 수명 | 상속/Construction/BeginPlay, 자동 풀/용량/실패 복구, Prefab 참조/계층, 자기 제거·로딩 중 Stop 8개 | `runtime-spawn-RVWD57` |
| 실제 C++ 생성 | 실제 클래스·같은 함수 내 검색/속성·포인터 재사용·24개 생성·소유 Timer 정리·생성 실패/묶음 복구 8개 | `native-spawn-GBvHY9` |
| 다른 C++ 모듈 | 생성 직후 Get/Set/Call·물리 질의/명령 순서·catalog 캐시·조작 참조 거절 | `native-spawn-modules-jg5PQs` |
| 모바일 C++ AOT | 실제 모바일 생성 소스 두 모듈을 호스트에서 컴파일해 NativeRouting/플랫폼 질의 경로 실행 | `native-spawn-aot-yd9upB` |
| 찾기 | 활성/비활성·상속·태그/ID/null·같은 함수 안 태그 변경, 실제 C++ dynamic_cast HP10 | `actor-find-TbsWdB` |

Android 조건은 SDK36 x86_64 에뮬레이터/실제 CPU0–3/720×1280 density240, NVIDIA RTX4070SUPER 호스트 GPU의 ANGLE이에요. RAM 요청2,048MB는 에뮬레이터 최소값2,560MB로 올라갔어요. `device.png`는 실제 가상 기기 화면 캡처로 바닥·캐릭터·탄환·한글 HUD·모바일 컨트롤을 확인했어요. CDP의 `runtime.png`에는 GPU canvas가 빠졌으므로 그 이미지로 실제 렌더 성공을 판정하지 않아요. Android 실기기/소리 청취/iOS 생성 탄막 창은 별도 검증 대상이에요.

확대 부하 사본 `auric-spawn-knAfFZ/android-window-QQ6F3L`은 활성 탄 최대83개에서 평균37.52/36.89fps지만 work p95 45.3/45.7ms로 33.333ms 예산을 넘었어요. 이 실패도 보존해요. P0-4 지정 발사 패턴의 통과를 P2-16의 1,000발/적30개 목표 통과로 확대하지 않아요. 위 검증과 함께 기존 native transport·native chain --cpp·58종 scene runtime·601개 노드/289개 공용 서명 회귀가 통과했어요.

## 참고 문서와 이번 읽기 범위

- [Unreal Actor Lifecycle](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-actor-lifecycle): 로딩/PIE/Spawn의 생성 순서와 Destroy/EndPlay/GC 절을 읽고 수명·재사용 계약을 대조했어요. HB의 worker/BP 콜백 경계와 GC 차이는 위에 명시해요.
- [Unreal Spawning Actors](https://dev.epicgames.com/documentation/en-us/unreal-engine/spawning-actors-in-unreal-engine): 생성 타입·템플릿/기본값·변환·Owner/Instigator·반환 객체를 읽었어요. 페이지의 오래된 파라미터를 현재 API와 동일한 시그니처로 옮기지 않아요.
- [Unreal GetAllActorsOfClass](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UGameplayStatics/GetAllActorsOfClass), [GetAllActorsWithTag](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UGameplayStatics/GetAllActorsWithTag): 두 개별 API 페이지 본문을 확인했어요. 빈 검색과 전체 순회 비용을 계약에 포함했어요.
- [Unity Instantiate](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Object.Instantiate.html): 기술 본문의 객체/컴포넌트·계층 복제·부모/좌표·generic 인자를 읽었어요. 모든 Awake/OnEnable 관련 문서를 다 읽은 것으로 계산하지 않아요.
- [Unity Destroy](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Object.Destroy.html): 기술 본문의 지연 제거·컴포넌트/자식·null 처리를 읽었어요. HB의 명령 적용 경계를 Unity의 프레임 끝 제거 시점과 구분해요.
- [Unity ObjectPool](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Pool.ObjectPool_1.html): 클래스 본문의 Get/Release/Clear/Dispose·활성화/비활성화·용량 초과 제거 예제를 읽었어요. 링크된 모든 메서드 페이지를 읽었다고 계산하지 않아요.
- [Unity FindObjectsByType](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Object.FindObjectsByType.html), [FindGameObjectsWithTag](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/GameObject.FindGameObjectsWithTag.html): 기술 본문의 타입/비활성/정렬·검색 대상과 태그 검색 조건을 읽었어요. HB는 Unity의 등록 태그 예외 규칙을 그대로 사용하지 않아요.

이번 범위 읽기/구현/실측과 전체 공식 본문·API 분석 gate는 별개예요. 전체 gate와 분모는 여전히 미확정이에요.
