# Unity 새/기존 API 포털 본문 대조 004

2026-10-04, `root`, `research_only`예요. 새 공식 sitemap에 실제 있는 6000.0 경로 두 개를 HTTP로 가져와 `#page-content-container` 전체를 읽었어요. 공통 탐색·footer·RSC/sidebar 데이터는 API 본문과 분리했어요. **2본문·32 heading·7표시 선언·7예제**, 본문 이미지 0개예요. 두 host의 URL만 보고 같은 문서로 합치지 않고 본문 차이를 확인했어요. 원문 HTTP 시간/hash와 별도 body hash는 [기계 기록](unity-portal-alias-body-004.json)에 남겨요.

## Transform.Translate

[새 공식 본문](https://docs.unity.com/en-us/engine/6000.0/script-reference/unityengine/transform/translate)은 Definition에 Method/UnityEngine/UnityEngine.CoreModule을 표시해요. Vector3/float xyz × omitted/Space/Transform 조합 **6개**를 별도 heading·인수/remarks/example로 다뤄요. local/world/reference transform 이동·null reference의 world 기준·시간 곱셈은 [기존 본문](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Transform.Translate.html)의 설명과 대응해요.

기존 사이트는 네 설명/예제 블록에 여섯 선언을 모았지만 새 사이트는 여섯 overload로 나눠 예제 일부를 중복해요. 새 표시 구문은 `Space relativeTo`에 `= Space.Self`를 쓰지 않아요. 생략 overload와 Self 설명은 존재해요. 따라서 선택 인수 유무를 URL alias만 보고 덮어쓰거나 표시 선언의 default를 만들어 채울 수 없어요. source version이 고정된 실제 binding 확인이 필요해요. Module/namespace 표시를 추가로 얻었지만 native 구현·thread·예외·transform parent scale 계약이 해결된 것은 아니에요.

## PhysicsScene2D.Simulate

[새 공식 본문](https://docs.unity.com/en-us/engine/6000.0/script-reference/unityengine/physicsscene2d/simulate)은 Method/UnityEngine/UnityEngine.Physics2DModule을 표시하고 instance bool 선언에 `simulationLayers = -1`을 사용해요. [기존 본문](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/PhysicsScene2D.Simulate.html)의 표시값은 `Physics2D.AllLayers`예요. 새 페이지의 숫자 표시는 별도 근거이며 enum/constant 원문이나 native binding을 읽었다는 뜻은 아니에요.

실행 bool·callback 중 실패·layer와 body/contact/joint/effector·편집기 callback 억제·별도 FixedUpdate 설명은 대응해요. **예제의 `PhysicsScene` 타입 오류도 새 사이트에 그대로 있어요.** 새 포털이기 때문에 자동으로 수정됐다고 간주할 수 없어요. default mask 전체 값·Scene2D 대상·생성/소유·invalid handle·mode/thread 계약은 계속 미해결이에요.

## 기준본과 판정

두 요청 URL과 공식 sitemap 경로는 6000.0에 고정돼요. 가져온 실제 API 영역에는 namespace/assembly는 있지만 별도의 version 값이 없고, HTML에서 명시적인 현재 version control을 확인하지 못했어요. 요청 route를 실제 body version 증거로 바꿔 쓰지 않아서 이 묶음은 **엄격한 원장 snapshot/읽기/분석 승격 0**, `pending_version_and_independent_comparison`이에요. HTTP 200·5MB 이상 SSR 확보는 분석 완료 근거가 아니에요.

**HB 판단:** API identity에는 host/버전/owner/정규 signature·별칭 이력을 남기고, 중복 예제와 overload를 각각 구분해야 해요. 사람·AI·C++·노드의 default와 모듈 연결을 source별로 대조해 하나의 검증된 계약으로 정해야 해요. UI 메뉴가 있다는 사실이나 새 포털이 있다는 사실로 계약을 추정하지 않아요. 다른 API·판본·package/plugin·본문과 미해결 링크를 계속 조사하며 전체 요구를 줄이지 않아요.
