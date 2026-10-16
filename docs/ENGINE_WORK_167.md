# 167 — 누적 원장의 레벨 수명·2D 리타게팅·녹화·경로 구현

2026-10-16, 기준 `e7f1e76`. 구현 대상은 지금까지 조사·계획한 전체 엔진 기능이다. 작업 번호나 일부 검사 통과를 전체 목표 완료로 바꾸지 않는다. [현재 전체 원장](ENGINE_STATUS.md)과 [실행 근거](research/ENGINE_WORK_167.json)를 함께 관리한다.

## 제작에서 실행까지

- 레벨 에셋을 뷰포트로 놓으면 `LevelStreaming` 오브젝트를 만든다. 속성에서 장면, 인스턴스 이름, manual/always/distance, 기준 액터, 진입·이탈 반경을 편집한다. distance는 기존 실행 틱에서 0.25초 간격으로 검사하고 서로 다른 반경으로 경계 왕복을 막는다. 셀이 없으면 추가 반복 작업은 없다.
- 추가 장면은 현재 월드·게임 프레임워크를 유지하며 별도 루트 아래에 합류한다. 같은 장면을 서로 다른 변환과 인스턴스 이름으로 여러 번 불러올 수 있다. 로컬 ID에서 결정적 런타임 ID를 만들며, 내부 부모와 타입이 명시된 액터 참조만 바꾼다. 문자열·태그를 임의로 변경하지 않는다.
- 시각 자원 준비 → 계층/물리·타일 충돌 준비 → Construction → 시스템 합류 → BeginPlay 순서를 사용한다. 레벨의 C++이 생성한 액터도 같은 레벨 수명에 속한다. 언로드 때 EndPlay, 입력/작업/타이머, UI·오디오·애니메이션, 충돌·렌더 자원을 정리한다. 외부에서 연결한 영구 자식은 월드 변환을 보존하며 분리한다. 실패·취소 때 추가한 내용만 정리한다.
- 중첩 레벨은 순환 참조와 과도한 깊이를 거부한다. 로딩 완료 전 취소, 두 인스턴스, 반복 출입, 콜백 실패와 외부 참조 정리를 검사했다. 레벨 안의 환경 설정은 영구 월드의 설정을 덮어쓰지 않는다.
- C++ `hb::Levels::{Load,Unload,IsLoaded,GetActor,GetInstances,SetVisible}`와 같은 여섯 블루프린트 노드를 추가했다. 총 노드는 753개다. `GetActor(instance,localId)`는 재진입 시에도 동일한 ID를 조회한다. C++ 변경 함수는 기존 서비스 명령 큐 계약을 따르므로 같은 C++ 호출 안의 조회는 처리 전 값을 볼 수 있다.
- 2D 리타게팅은 기존 정확 이름/수동 대응에 더해 선택적인 계층 이름 대응을 제공한다. 좌우와 부모를 확인하며 모호한 동점은 자동 선택하지 않는다. limb/CCD/FABRIK 외부 액터 목표, 목표의 변환 키, 원본·대상 리그의 월드 변환을 표본화하고 솔버가 움직인 뼈도 결과에 기록한다. 결과 클립은 기존 SpriteSkin/C++/블루프린트 재생 경로를 사용한다.
- 삼각 NavMesh 경로에 포털 funnel을 연결했다. 같은 평면의 경로에서 불필요한 중간점을 줄이고, 오프메시 입구·출구를 보존한다. 비평면 구간은 기존 표면 중간점을 유지한다. 포털 폭/끝점 축소는 정밀 경계 침식이나 swept-radius 보장이 아니다.
- Take는 컴포넌트 속성 설명을 매 표본마다 재검증하지 않고 대상별로 재사용한다. 변하지 않는 연속 구간은 녹화 중 두 끝점으로 유지하면서 값이 바뀐 최초 시각을 보존한다. 600프레임 일정 값/계단 변화에서 트랙별 5키 이하와 원래 변화 시각을 확인했다.

## 사람·AI·C++ 공용 계약

편집기 명령 `runtime.levels`, `runtime.level.load`, `runtime.level.unload`, `runtime.level.visible`는 같은 실행 서비스에 도달한다. 변경 명령은 현재 프레임을 기다리고 다른 명령·틱과 겹치지 않는다. 디버그 일시 정지 중에는 수명 콜백이 중단점에서 대기하지 않도록 재개 후 요청하라는 오류를 돌려준다. 레벨 조작은 저작 문서와 revision을 바꾸지 않는다. 실행 종료 뒤 원본 장면이 복원된다.

```cpp
hb::Transform at;
at.position = {100, 0, 0};
hb::Levels::Load("Assets/Scenes/Room.hbscene.json", "EastRoom", at);
// 후속 이벤트/프레임에서 처리 결과 조회
auto* door = hb::Levels::GetActor("EastRoom", "Door");
hb::Levels::Unload("EastRoom");
```

```json
{"method":"runtime.level.load","params":{"path":"Assets/Scenes/Room.hbscene.json","instance":"EastRoom","transform":{"position":[100,0,0],"rotation":[0,0,0],"scale":[1,1,1]}}}
```

`rig.clip.retarget`는 `mapMode: "exact" | "hierarchy"`와 포즈 베이크용 `sceneTargets`를 받는다. `actors`는 `{id,transform,timeline?}`, `sourceTargets`/`targetTargets`는 `{solver,actor,offset?}` 배열이며 `sourceTransform`/`targetTransform`은 각 리그의 월드 변환이다. timeline은 기존 타임라인 형식의 position/rotation/scale vec3 트랙이다. 기존 expectedRevision/sourceRevision/dryRun/Undo 계약을 유지한다. 사람이 쓰는 폼은 현재 장면의 목표와 변환을 선택한다. 움직이는 목표 키 입력은 공용 데이터 명령에서 지원하며 별도 새 타임라인 UI를 만들었다고 계산하지 않는다.

빌드 프로필의 장면 목록에 추가 레벨도 활성화해야 한다. 제외된 장면 참조는 기존 빌드 검사에서 오류로 알려준다. 편집기·플레이어·화면 없는 실행기가 같은 바인딩 준비와 생성 카탈로그를 쓴다. 새 종속성, 상시 폴링, GPU 자동 읽기, CPU 입자 대체 경로는 추가하지 않았다.

## 검사와 발견한 문제

`check-engine-167.mjs` 11개 군, 실제 C++/BP 실행, 숨김 Win32 편집기의 컴포넌트/2D 폼·AI 명령·원본 보존, 개발/배포 D3D11 패키지를 검사했다. 기존 165/166 제작·UI/오디오·게임플레이·리타게팅·코어·생성 API 검사를 함께 대조했다. 상세 SHA와 경로는 실행 근거에 있다.

검사에서 추가 루트의 변환 적용 누락, 네이티브 사전 생성 액터의 레벨 수명 누락, 나중에 필요해진 생성 카탈로그의 편집기 갱신 누락을 발견해 수정했다. 디버그 일시 정지 상태의 수명 콜백 대기는 명령 전제조건과 프레임 직렬화로 처리했다. 과거 NavMesh 검사의 ‘중간점이 반드시 존재’ 조건은 경로 단축 동작에 맞춰 시작/끝·직선 통과·폭 거부·오프메시 보존 조건으로 대조했다.

이 구현이 남은 목표를 제거하지는 않는다. 월드 자동 공간 분할/HLOD/메모리 예산 기반 셀 스케줄링·큰 맵 검증, 동적 carving/NavArea/정밀 반경/RVO, 임의 2D 제약·정지 발 보존, 오디오·골격·배열/구조체·동적 컴포넌트 Take와 다른 원장의 남은 내용을 계속 유지한다. 전체 Unreal/Unity 본문·API 분석 완료나 엔진 전체 완료로 계산하지 않는다.

## 출처와 HB의 선택

[Unreal Level Streaming Overview](https://dev.epicgames.com/documentation/unreal-engine/level-streaming-overview-in-unreal-engine?lang=en-US)와 [Blueprint load/unload](https://dev.epicgames.com/documentation/unreal-engine/loading-and-unloading-levels-using-blueprints-in-unreal-engine?lang=en-US)의 영구 월드/추가 레벨·볼륨/명령 분리를 대조했다. HB의 distance 셀은 구형 진입/이탈 반경이며 Unreal World Partition과 같다고 계산하지 않는다.

[Unity Additive](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/SceneManagement.LoadSceneMode.Additive.html)와 [UnloadSceneAsync](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/SceneManagement.SceneManager.UnloadSceneAsync.html)의 현재 장면 유지·관련 오브젝트 수명과 자원 수명의 구분을 읽었다. [Unity 2D IK](https://docs.unity3d.com/Packages/com.unity.2d.animation@10.2/manual/2DIK.html)의 외부 목표·체인/솔버 계약을 대조했다. [Recast Detour findStraightPath](https://github.com/recastnavigation/recastnavigation/blob/main/Detour/Source/DetourNavMeshQuery.cpp)의 포털 경로와 오프메시 경유 계약을 확인했다. 연결 API/다른 버전/전체 매뉴얼과 원문 전체 독립 분석은 미완으로 구별해 corpus에 등록했다.

배포 게임의 추가 레벨과 생성 카탈로그에도 시작 장면과 같은 중단점 제거를 적용했다. 추가 레벨 모든 노드에 중단점을 지정한 D3D11 배포 패키지에서 시작/언로드/재진입이 멈추지 않는 것을 확인했다.
