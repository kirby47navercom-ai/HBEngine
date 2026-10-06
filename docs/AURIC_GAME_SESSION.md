# GameInstance·저장·장면 인자 (P0-5)

한 Play 실행이 GameInstance 한 개를 소유해요. 장면 월드는 이 인스턴스를 빌려 쓰며, 장면 전환은 C++ 공개 속성·private 멤버와 BP 변수·JSON 상태를 유지해요. C++ `Init()`은 세션당 한 번 호출하고 Stop·새 Play·`Game::Reset()`에서 `Shutdown()` 뒤 새 세션을 만들어요.

프로젝트의 `.hbproject`에 `gameInstance`를 지정하거나, 장면이 참조하는 Game Config의 GameInstance 선택을 사용해요. 값은 `Assets/BP_Session.hbblueprint.json` 또는 `Source/Session.h#Session`이에요. C++ 부모는 `hb::GameInstance`를 사용해요. 헤더에 해당 파생 클래스가 하나면 `#Session`을 생략할 수 있어요. 배포할 장면들이 선택하는 클래스는 하나여야 해요. 엔진이 C++ 클래스를 실행용 BP로 감싸 cook하며 원본 소스에 가상 BP 파일을 만들지 않아요.

```cpp
HB_CLASS(Blueprintable)
class Session : public hb::GameInstance {
public:
    HB_PROPERTY(BlueprintReadWrite) int Runs = 0;
    void Init() override { Runs++; state["gold"] = 0; }
};

auto* game = hb::Game::GetInstance();
game->state["gold"] = 42;
hb::Save::Write("progress", {{"debt", 5000}, {"room", 2}});
hb::Json progress = hb::Save::Read("progress"); // 없는 슬롯은 null
hb::Scene::Open("Assets/Scenes/Hub.hbscene.json", {{"spawn", "DoorBottom"}});
auto args = hb::Game::GetArguments();
```

BP에도 GameInstance·게임 상태 JSON·장면 인자 JSON·JSON 저장/읽기/삭제·장면 열기와 인자·게임 새로 시작 노드를 제공해요. C++ `hb::Json`은 nlohmann JSON이에요. 구조체는 해당 라이브러리의 `to_json`/`from_json`으로 변환할 수 있어요. 다른 C++ worker에서도 공유 JSON과 노출 멤버 질의로 세션 상태에 접근해요. 다른 worker의 실제 파생 포인터를 로컬 `dynamic_cast`로 얻는 계약은 제공하지 않아요.

`spawn` 인자는 도착 장면의 PlayerStart ID·이름·태그를 찾고 실제 월드 위치에서 플레이어를 시작시켜요. 존재하지 않는 시작점이나 잘못된 JSON은 전환 전에 거절해요. JSON은 깊이32·256Ki 문자·10,000 값, 슬롯 이름은80자 제한이며 경로 이동·prototype 키를 거절해요.

PC 배포 저장은 `%LOCALAPPDATA%/HBEngine/Games/<프로젝트 UUID>/savegames.json`, 편집기 Play 저장은 프로젝트 `Saved/Editor/storage.json`의 프로젝트 UUID별 저장 키를 사용해요. Android·iOS는 앱 내부 저장소와 원자적 파일 쓰기를 사용해요. Save는 파일 쓰기가 완료된 뒤 반환하고 오류를 호출자에게 전달해요. 모바일 C++ worker의 저장 질의를 별도 저장 큐에서 처리해 같은 큐를 기다리는 교착을 피했어요.

장면 전환·프레임·모듈 간 호출에서는 최신 JSON 상태를 전달해요. 계산 없는 frame 응답으로 다른 worker의 낡은 상태를 덮어쓰지 않아요. 편집기 `runtime.state`와 개발 Player의 `hbPlayerDebug.game()`/진단 보고에도 세션 UUID·오브젝트 ID·JSON·장면 인자가 있어요. AI와 사람이 같은 저장 API와 수명 계약을 사용해요.

공용 확인: `node tools/check-game-session.mjs`. Auric 적용 사본은 `node tools/prepare-auric-session.mjs`, 변경하지 않은 9개 checker는 `node tools/check-auric-spawn.mjs <사본 경로>`로 확인해요. 원본 게임은 같은 명령에 `--original`을 붙여 검사해요. 실제 Windows 저장/두 장면/Init 한 번/F12/프로세스 재시작은 `node tools/check-auric-session-window.mjs <사본 경로>`로 확인해요. Android는 같은 사본을 `tools/check-auric-spawn-android.mjs`에 전달해 동일한 수명 동작과 HOME/재개·강제 종료 뒤 저장 복원을 확인해요.

기존 입력 해제 동작은 P0-5 설치본에서 유지해요. 장면 사이 입력 유지·장치 구분은 P1-10으로 분리해요. GameInstance 소유 BP Delay·Timeline·Timer를 장면을 넘어 계속 실행하는 스케줄러와 임의 private/static 부작용의 오류 롤백은 별도 범위예요. 이 문서와 현재 검사는 전체 Unreal/Unity 분석 gate나 누적 엔진 요구 전체의 완료를 뜻하지 않아요.
