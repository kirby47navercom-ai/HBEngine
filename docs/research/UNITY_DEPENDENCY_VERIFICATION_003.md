# Unity 의존 본문 분석 003 독립 대조

주인님, 짚짱의 `/root/unreal_actor_body` 담당은 분석 담당 `root`와 별도로 2026-10-04에 [분석 문서](UNITY_DEPENDENCY_BODY_003.md), [기계 기록](unity-dependency-body-003.json)과 공식 Unity 6000.0 영어 offline 원문을 직접 읽고 대조했어요. **4본문·12heading·3표시 선언·6enum 값 행·인수 표1개·전체 예제1개**를 확인했어요. 기록의 표시 내용·hash·누락 해석은 원문과 일치하며, 공식 예제의 타입 불일치는 해결되지 않았어요. **제한된 독립 대조이며 전체 API/코퍼스 verified 승격은 0개**예요.

## 고정한 대조 대상

- `docs/research/UNITY_DEPENDENCY_BODY_003.md` SHA-256: `7536ecc5fc2773c8db9e764db0c465ca4f70277126b7272f9d2dcde7a398b759`
- `docs/research/unity-dependency-body-003.json` SHA-256: `d07ee5dca4b95dc4dc4d1995a730f24fa065ee69e41fe9bff22127e5ec4e62c2`
- 원문 경로: `native/build/reference-cache/unity-discovery/offline-6000.0/Documentation/en/ScriptReference/{API}.html`
- 추출 본문 경로: `native/build/reference-corpus/unity-dependency-batch/{API}.body.html`

아래 API 이름을 경로의 `{API}`에 그대로 대입해요. sourceHash는 실제 원본 HTML bytes, bodyHash는 실제 추출 HTML bytes의 SHA-256을 다시 계산한 값이에요. 분석 JSON의 값과 모두 같았어요. 각 원본의 Unity 6.0 (6000.0) header와 job76410965/2026-09-29 footer를 확인했어요. ZIP 전체 CRC·전체 목록·다운로드 authenticity를 이번에 새로 검증한 것은 아니에요. 대상 문서나 snapshot bytes가 달라지면 이 대조도 stale예요.

| API | 실제 sourceHash | 실제 bodyHash |
| --- | --- | --- |
| ImportAssetOptions | `d02edd8197e980c49028d882780d0d572603d2b5b5b38feaf72a8cc3b66d9e4a` | `0fb2435f62648daa4621b8baa7c47eba528b2b765859bcac623bdcd013cf9f07` |
| Physics-simulationMode | `c4c8b52049225903cf622f1db36cb7c3738a5069fe7b610b4633b9b41db4bde5` | `ebe2c27da5df4da7325bc77c62b268181c255acf5d497ce18a39e57b023f7835` |
| Physics2D-simulationMode | `a380c3e56a8a961ab5ee71dd1e2d96407de39cb1451f7c0b4a43e4b928bcf1a0` | `0a6b6e1bd55feea850fd150158031b0c63757150cd72788b1e9aa41c8102a98a` |
| PhysicsScene2D.Simulate | `2d1266019f44ba47b5da960589c90f6a758f888fbd12dcfab3c685865f3003db` | `cbe7aecb3978f163df71d3bfe214c0ba9e4f25491a510703f9e685db84bd53fa` |

## 실제 읽은 scope와 추출 확인

원본의 첫 technical `div.section`에서 웹사이트 `.suggest`·`.scrollToFeedback` UI만 제외하고 추출 body와 전체 정규화 text를 비교했어요. 모든 technical text·heading·선언·표 셀·예제를 직접 읽었어요. source와 body의 heading 이름/순서, 3개 선언의 static/instance·반환·인수·default 표현, enum 6개 이름, 표의 모든 cell, 코드 예제 전체 text가 일치했어요. source에 technical image가 없는 것도 확인했어요. 링크 이름을 읽은 사실을 대상 본문 읽기로 계산하지 않았어요.

ImportAssetOptions는 h1/Description/Properties 3heading, Physics.simulationMode와 Physics2D.simulationMode는 각각 h1/Description 2heading, PhysicsScene2D.Simulate는 h1/Declaration/Parameters/Returns/Description 5heading이에요. enum 페이지에는 enumeration marker와 빈 `.signature-CS` slot이 있어 실제 enum C# 선언으로 세지 않은 JSON의 `enumTypeMarkersWithoutDeclaration=1` 해석이 맞아요.

표는 2개·10행·20셀(헤더 포함)이에요. ImportAssetOptions의 `.section table[1]`는 헤더1+enum6행·14셀, PhysicsScene2D.Simulate의 `.section table[1]`는 헤더1+인수2행·6셀이에요. cell의 내부 whitespace를 단일 공백으로 정규화한 후 행/셀 순서를 보존한 UTF-8 compact JSON SHA-256은 각각 `abd26b7b86592628732c85a7b9c919f07eb5573c7f1879aa8d40a11a35b056d9`, `991985d9f4847a1b435dcd15a95399b00b31bcb794a75d69dad95ee53c690ba8`이에요. 원문과 추출 표의 cell 내용이 모두 같았어요.

PhysicsScene2D.Simulate의 `.section .codeExampleCS[1]` 전체 text는 CRLF를 LF로 통일한 784문자이고 SHA-256은 `16263b7b6b0b4ade9fead12a0bab91f34cbfc9c0716d67e132a833efcac16db4`예요. 원문과 추출의 전체 코드가 같았어요. 예제 전체·원문 표 설명은 이 공개 문서에 복제하지 않았어요.

## 의미·제약 대조

**ImportAssetOptions.** 여섯 값은 Default, ForceUpdate, ForceSynchronousImport, ImportRecursive, DontDownloadFromCacheServer, ForceUncompressedImport예요. 기본 import·사용자 시작 import·동기 import·폴더 내용 재귀·cache server 다운로드 생략과 full reimport·편집용 비압축이라는 설명을 구분한 root 분석이 맞아요. 숫자 값·Flags attribute·bitwise 조합·충돌 규칙은 표에 없어요. ForceSynchronousImport 이름과 설명만으로 모든 옵션의 script compilation 대기·thread·실패 계약을 확정하지 않은 판단도 맞아요.

**3D/2D simulationMode.** 표시 syntax는 각각 `public static SimulationMode simulationMode;`, `public static SimulationMode2D simulationMode;`예요. 두 Description은 simulation 실행 시점을 제어한다는 설명과 서로 다른 enum 링크만 제공해요. 상세 accessor·기본 mode·전환 시 accumulator 처리·기존 Scene 적용 범위·callback/thread 허용·오류는 이 두 본문에 없어요. field 같은 표시를 실제 plain-field storage나 모든 getter/setter 정책으로 확정하지 않은 root 판단이 맞아요. 이 속성의 application scope를 모든 independent Scene으로 확대할 근거도 없어요.

**PhysicsScene2D.Simulate 선언·인수·반환.** 표시 선언은 instance bool, deltaTime은 float, simulationLayers는 int이고 default는 Physics2D.AllLayers예요. AllLayers 숫자 값은 본문에 없어요. 두 인수 표와 Returns의 실행 여부·physics callback 중 항상 실패 설명이 root 기록과 같아요. 레이어의 body/contact/joint/effector 효과와 Play 밖 movement/contact·script callback 억제는 표시 본문에 있어요. 입력 범위·invalid Scene 결과·thread·mode 영향은 설명하지 않아요.

**공식 타입·호출 불일치.** root의 unresolved 판정은 타당해요. owner/heading과 선언은 PhysicsScene2D이지만 예제 field는 **PhysicsScene**이며 링크도 `PhysicsScene.html`이에요. Description의 첫 Scene 참조도 `PhysicsScene.html`로 이어져요. 이어지는 NOTE와 additional resources는 instance 메서드 대신 global `Physics2D.Simulate`를 반복해요. 이는 extraction이 만든 변형이 아니라 원본 HTML에도 있는 내용이에요.

예제는 IsValid 검사→누적 timer→fixedDeltaTime while step 흐름을 보여주지만 2D 타입의 올바른 호출·2D 반환 bool·independent Scene에 적용되는 simulationMode 관계를 입증하지 않아요. IsValid 검사 코드를 실제 API의 invalid Scene 반환/예외 보장으로 대체하지 않았어요. FixedUpdate 설명과 fixed-step 원칙은 본문에 있되 global 참조가 섞인 적용 범위는 별도 계약 대기예요. 공식 예제를 자동으로 2D 타입으로 고쳐 완료 처리하거나 runtime에서 검증했다는 주장도 하지 않아요.

## 유지한 open issues와 판정

root JSON의 여섯 enum 멤버 개별 본문·numeric values/bitwise 조합, SimulationMode/SimulationMode2D·native binding, PhysicsScene/PhysicsScene2D·IsValid·scene 생성/소유·layer mask·mode/sync 영향, script compile wait·thread·lifetime·실패·입력 범위의 대기 상태를 유지해요. 기존 ImportAsset 인수 표의 options 누락은 enum 후속 표를 읽었다고 없어지지 않아요. 표시된 Scene2D example와 global NOTE의 모순도 계속 unresolved예요.

HB의 typed 옵션·C++/node·사람 UI·AI 공통 world handle/검증 제안은 원출처 사실과 구분된 설계 판단이에요. 이것을 Unity 공식 AI 계약이나 HB 구현 완료로 표시하지 않았어요. 이번 감사는 **4개 표시 본문의 전체 읽기와 제한된 독립 의미 대조**이며, 관련 API 분모·모든 예외의 확인이 아니에요. root 원문 분석/JSON·공유 ledger/status·엔진·GUI·커밋을 수정하지 않았고, 승격 여부는 root의 증거 판단에 맡겨요.
