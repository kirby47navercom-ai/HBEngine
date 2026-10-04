# Unity 연결 본문 분석 003: import 옵션·simulation mode·2D Scene

2026-10-04, `root`, `research_only`예요. 앞선 [8본문 분석](UNITY_AUTHORING_PHYSICS_BODY_002.md)의 후속 연결을 실제 Unity 6000.0 배포본에서 읽었어요. **4본문·12 heading·3개 표시 선언·6개 enum 값 표행·인수 표 1개·코드 예제 1개**예요. 이미지·다른 언어 탭은 없어요. 선언/표행 수는 전체 owner API 분모가 아니에요. 원문 hash와 출처별 의미 기록은 [기계 기록](unity-dependency-body-003.json)에 남겨요. 아직 독립 검증이나 원장 전체 읽기 상태로 승격하지 않았어요.

## ImportAssetOptions

[공식 enum 본문](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/ImportAssetOptions.html)의 h1/Description/Properties, header 포함 7표행을 읽었어요. Default, ForceUpdate, ForceSynchronousImport, ImportRecursive, DontDownloadFromCacheServer, ForceUncompressedImport의 여섯 값과 설명을 확인했어요. 기본 import·사용자 시작 import·동기 import·폴더 재귀·cache server 다운로드 생략과 전체 reimport·편집용 비압축 import가 각각 달라요.

숫자 값, bitwise 조합 허용/충돌, enum 특성 선언, 모든 옵션에서 스크립트 컴파일을 기다리는지와 오류·thread 계약은 이 표가 설명하지 않아요. 따라서 ImportAsset의 누락 options 설명을 발견한 사실은 유지하면서, 표에 있는 의미만 후속 근거로 추가해요. **HB 판단:** 사람·C++·노드·AI에 동일한 typed 옵션을 제공하되 임의 숫자·조합을 유효하다고 만들지 않아요.

## Physics.simulationMode와 Physics2D.simulationMode

[3D 공식 본문](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Physics-simulationMode.html)과 [2D 공식 본문](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Physics2D-simulationMode.html)은 각각 h1/Description 두 구역을 읽었어요. 표시 형태는 static `SimulationMode simulationMode`와 static `SimulationMode2D simulationMode`예요. 물리 simulation 실행 시점을 제어하고 각각 별도 enum에 연결해요.

setter/getter 허용성의 상세·default·전환 시 누적 시간/기존 Scene 영향·콜백/스레드·오류는 이 두 짧은 본문에 없어요. API 구문이 field처럼 보이는 것을 HB의 plain public field로 그대로 변환하지 않아요. **HB 판단:** 2D·3D 스케줄을 typed 계약으로 구분하고 자동/수동 실행 상태를 디버거·C++·노드·AI에서 공통으로 관찰해야 해요. enum 대상과 native binding은 후속 미독이에요.

## PhysicsScene2D.Simulate

[공식 본문](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/PhysicsScene2D.Simulate.html)의 h1/Declaration/Parameters/Returns/Description과 두 인수 행·전체 예제를 읽었어요. instance bool, `float deltaTime`, `int simulationLayers = Physics2D.AllLayers`를 표시해요. 지정 2D physics Scene을 전진시키며 실행 여부를 반환하고 물리 callback 중 호출은 실패해요. 레이어가 body/contact/joint/effector 처리에도 영향을 줘요. Play 밖에서는 객체 이동·접촉 생성과 script callback 억제 정책을 설명해요.

**공식 예제 불일치:** API owner는 PhysicsScene2D인데 예제 필드는 `PhysicsScene`이에요. 호출·설명에도 Physics2D/global Simulate 문장을 섞어 사용해요. 예제의 IsValid 검사와 accumulator 흐름을 읽었지만 이 예제가 올바른 2D Scene 실행을 입증한다고 처리하지 않아요. 선언·설명·예제의 Scene 타입 차이는 unresolved예요. invalid Scene 반환/예외·독립 Scene의 mode 영향·thread·입력 범위도 미확인이에요.

**HB 판단:** stable world/scene handle과 2D typed node/C++ ABI를 일치시켜야 해요. UI preview/AI headless simulation도 대상 world를 명시해야 하고, 임의 default world로 호출을 바꾸면 안 돼요. 공식 오류를 따라 복제하거나 고쳤다고 가정하지 않고 버전 고정된 구현/대체 공식 자료로 확인해야 해요.

## 남은 연결

표의 여섯 enum 멤버 개별 본문, SimulationMode/SimulationMode2D, PhysicsScene/PhysicsScene2D와 IsValid, scene 생성/소유·2D layer mask·auto sync, import/compile/cache/dependency 세부 계약이 별도 대기열이에요. 이 네 본문만으로 앞선 분석의 미해결 계약을 전부 해소하지 않았어요. 전체 엔진 누적 요구와 전체 corpus 선행 분석 순서를 유지해요.
