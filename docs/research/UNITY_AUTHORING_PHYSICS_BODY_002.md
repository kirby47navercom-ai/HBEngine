# Unity 본문 분석 002: 가져오기·변경 기록·2D/3D 물리 호출

2026-10-04, 분석 담당 `root`, 단계 `research_only`예요. 공식 Unity 6000.0 영어 배포본의 실제 API 본문 **8개·32개 heading 구역·8개 표시 선언·7개 인수 표·8개 코드 예제**를 직접 읽었어요. 웹사이트 피드백 폼과 footer는 기능 본문에서 제외했고, 본문에 이미지와 다른 언어 탭은 없어요. 원문·추출 본문·분석 hash와 구역 대응은 [기계 기록](unity-authoring-physics-body-002.json)에 남겨요. 전체 API·관련 API·전체 corpus 완료와 독립 검증을 뜻하지 않아요.

출처는 `UnityDocumentation.zip`의 `Documentation/en/ScriptReference`예요. 원문 header는 Unity 6.0 (6000.0), footer는 job76410965/2026-09-29예요. ZIP SHA-256은 `cf07df16fbe4ca7d174cc15bfeb2503995cc4140b42368d0ae7bf17b7805b28f`예요. 원문은 `native/build/reference-cache/unity-discovery/offline-6000.0`, 별도 본문·snapshot/read/analysis는 `native/build/reference-corpus/unity-authoring-physics-batch`에 보관해요. 원문 전체·예제 코드를 공개 Git에 복제하지 않아요.

## AssetDatabase.Refresh

[공식 본문](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/AssetDatabase.Refresh.html)의 h1/Declaration/Parameters/Description과 인수 표·폴더 생성 예제를 확인했어요. 표시 선언은 static void, `ImportAssetOptions options = ImportAssetOptions.Default`예요.

마지막 갱신 이후 내용·설정·의존성이 달라지거나 추가된 에셋을 가져오고 삭제도 반영해요. 에셋 가져오기는 동기, 스크립트 컴파일은 비동기이며 unused asset 정리도 유발해요. 디스크 변경 자동 감지 때문에 일반적으로 직접 호출이 필요하지 않지만 Auto Refresh 비활성화나 외부 프로그램 변경이 호출 이유가 될 수 있어요. 예제는 디스크에 만든 세 폴더가 DB에서 조회되기 전후를 비교해요.

**HB 설계 판단:** 사람·AI의 외부 드롭, 폴더 감지, 재가져오기와 코드 빌드 상태를 별도 작업으로 기록해야 해요. 한 버튼 완료를 모든 컴파일 완료로 해석하지 않아요. 소스 본문은 옵션 조합·GC 수명·실패/스레드·원자성을 설명하지 않아 후속 확인이 필요해요.

## AssetDatabase.ImportAsset

[공식 본문](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/AssetDatabase.ImportAsset.html)의 네 heading·표·예제를 읽었어요. static void, 프로젝트 상대 `string path`, 선택 인수 `ImportAssetOptions.Default`예요. 인수 표에는 path만 있고 options 행이 빠져 있어요.

지정 경로를 가져오며 저장 전 처리와 import 후처리 콜백을 유발한다고 설명해요. 예제는 두 파일을 작성한 뒤 하나만 가져오고, 나머지 파일의 DB 반영은 갱신까지 미뤄짐을 보여줘요. 예제는 디렉터리 존재를 준비하지 않아서 어느 경로에서도 그대로 실행된다고 단정하지 않아요.

**HB 설계 판단:** 단일 파일 import와 전체 refresh 명령·작업 결과를 구분하고 C++·노드·UI·AI에서 같은 경로 규칙을 적용해요. 콜백 순서·실패·동기성·options 전체 의미는 이 본문으로 확정할 수 없어요.

## AssetDatabase.CreateAsset

[공식 본문](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/AssetDatabase.CreateAsset.html)의 네 heading·표·머테리얼 예제를 읽었어요. static void, `Object asset`와 프로젝트 상대 `string path`예요.

Unity native 에셋 형식만 생성해요. GameObject의 프리팹이나 임의 이미지·텍스트 생성은 다른 경로를 써야 해요. 같은 경로를 덮어쓰며, 잘못된 native 확장자와 StreamingAssets 위치는 콘솔 오류 대상이에요. 파일에 여러 객체를 추가할 수 있고 추가 순서는 root 객체를 정하지 않아요. import 중 생성은 일관성을 해칠 수 있어 경고해요. 예제의 Specular 셰이더는 모든 렌더 파이프라인 지원 근거가 아니에요.

**HB 설계 판단:** 콘텐츠 우클릭 생성, 외부 원본 import, 프리팹 저장은 각각 검증 규칙이 필요해요. 덮어쓰기·subasset ID·import 재진입·사람/AI 동일 생성 명령을 요구에 남겨요. 오류 방식의 상세·Undo·트랜잭션 원자성은 미확인이에요.

## Undo.RecordObject

[공식 본문](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Undo.RecordObject.html)의 네 heading·표·두 코드 예제를 읽었어요. static void, 변경할 `Object objectToUndo`와 Undo 메뉴 이름 `string name`을 받아요.

호출 이후 변경을 비교할 임시 상태를 만들고 프레임 끝에 binary diff로 변경 속성을 기록해요. 변경이 없으면 Undo 항목도 없어요. 부모 변경·컴포넌트 추가·파괴는 전용 API가 필요해요. 프리팹 인스턴스에는 별도 property modification 기록도 요구해요. 예제는 handle 결과를 얻고 실제 속성을 쓰기 전에 RecordObject를 호출하며, GUI change check는 기록 자체의 필수 조건이 아니에요.

**HB 설계 판단:** UI 드래그·C++ 편집 확장·AI patch가 같은 변경 전 상태와 변경 종류를 기록하도록 요구해요. 구조 변경을 일반 property Undo로 처리하면 안 돼요. Undo grouping·메모리 수명·Prefab 저장은 후속 계약이에요.

## PrefabUtility.RecordPrefabInstancePropertyModifications

[공식 본문](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/PrefabUtility.RecordPrefabInstancePropertyModifications.html)의 네 heading·표·예제를 읽었어요. static void, `Object targetObject`예요.

수정 뒤 프리팹 인스턴스의 property 변경을 기록하며 누락하면 저장·다시 열기 때 변경을 잃을 수 있어요. SerializedObject/SerializedProperty 사용을 권장하고 해당 경로는 Undo도 포함한다고 설명해요. 예제 순서는 Undo → scale 변경 → override 기록이며, 실제 Scene 저장 호출은 주석이에요. 선택이 없거나 persistent asset이면 메뉴를 비활성화해요. 본문의 Undo 관련 문장을 별도 RecordObject 없이 이 함수만으로 모든 Undo를 보장한다는 뜻으로 확대하지 않아요.

**HB 설계 판단:** 프리팹 기본값·인스턴스 override·Undo·dirty·디스크 저장을 분리하고, 사람/AI에 공통 property 편집 경로를 제공해야 해요. 중첩 프리팹·variant·재import·구조 변경은 아직 확인하지 않았어요.

## Physics.Simulate

[공식 본문](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Physics.Simulate.html)의 네 heading·표·예제를 읽었어요. static void, `float step`이에요.

Script simulation mode에서 수동으로 충돌 감지·강체/조인트 적분·물리 콜백을 처리해요. Simulate가 FixedUpdate를 호출하지 않으며 FixedUpdate 주기는 별도로 유지돼요. 가변 프레임 간격은 결정성을 낮추므로 일정한 작은 양수 step을 권장하고 0.03 초과는 정확도 저하 가능성을 경고해요. 예제는 Update에서 누적 시간을 fixedDeltaTime씩 소모하며 maximumDeltaTime 처리는 제외돼요. 고정 step만으로 플랫폼 간 bit-identical 결과가 보장된다는 근거는 없어요.

**HB 설계 판단:** C++/노드 이벤트 스케줄러와 물리 스텝을 분리하고 timestep·최대 catch-up·일시정지·재진입을 명시해야 해요. invalid step·thread·콜백 내 재호출·다중 Scene은 후속 계약이에요.

## Physics.SyncTransforms

[공식 본문](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Physics.SyncTransforms.html)의 세 heading 전부를 읽었어요. static void, 입력 인수는 없고 본문에 표·예제·이미지도 없어요.

Transform 변경을 물리 엔진에 반영해요. 변경된 Transform이나 자식의 Rigidbody/Collider가 위치·회전·크기 변화에 따라 갱신될 수 있어요. 이 호출이 물리 시간을 전진시키거나 FixedUpdate를 호출한다는 설명은 없어요.

**HB 설계 판단:** 편집·노드·C++의 transform 쓰기와 물리 질의 사이 동기화 지점을 계약으로 정해야 해요. 자동 동기화 조건·비용·2D 대응·콜백/스레드 허용 조건은 미확인이에요.

## Physics2D.Simulate

[공식 본문](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Physics2D.Simulate.html)의 다섯 heading·두 인수 표행·예제를 읽었어요. static bool, `float deltaTime`, `int simulationLayers = Physics2D.AllLayers`예요. 반환은 실제 실행 여부이며 물리 콜백 중 호출은 실패해요.

기본 물리 Scene을 한 번 전진시키며 레이어는 Rigidbody2D뿐 아니라 collider contacts·joints·effectors 처리도 제한해요. Play 외 편집기 시뮬레이션은 객체를 움직이고 접촉을 생성하지만 삭제로부터 Scene을 보호하기 위해 일반 script contact callbacks를 보내지 않아요. FixedUpdate는 별도이고 예제는 Script mode에서 fixedDeltaTime 누적 스텝을 사용해요. 예제는 bool 반환을 소비하지 않아요.

**HB 설계 판단:** 2D를 3D의 축 잠금만으로 대체하지 않고 2D world·레이어·contact·effector·반환/실패 계약을 따로 분석해야 해요. 편집 preview는 변경 복구와 콜백 정책이 필요해요. step 범위·단위 default 값·비기본 Scene·thread는 미확인이에요.

## 현재 HBEngine의 읽기 전용 대조

`prototype/physics-world.js:8`은 Rapier 버전·2D/3D·단위·질의·C++ 쓰기 대기열을 별도로 정의하고, `:222`의 step은 누적 시간에 최대 하위 스텝을 적용해요. `prototype/scene-runtime.js:28`도 timestep·중력·최대 스텝을 검증해요. 이 코드를 읽은 것은 Unity 실행 순서와 동등함을 검증한 결과가 아니에요. `prototype/asset-documents.js:26`은 게임 시작 설정을 정의하며 `prototype/app.js`의 현재 Undo/import 경로와 native C++ ABI 전체는 이번 본문 분석의 구현 검증 범위가 아니에요.

후속 전체 분석에는 ImportAssetOptions·Asset Pipeline refresh loop·후처리 콜백·native importer·SerializedObject/Property·전용 Undo 구조 API·Prefab override/apply/revert·2D/3D simulation mode·물리 Scene·sync/autoSync·Play 진입/종료 계약이 필요해요. 이 목록은 다음 연결 계약이며 전체 엔진 기능 목록의 끝이 아니에요. 누적 요구를 줄이거나 기능 구현을 재개하지 않았어요.
