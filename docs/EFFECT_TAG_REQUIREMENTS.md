# 캡처 태그로 효과 조건 만들기

효과 편집기의 **효과 적용 태그 조건**은 효과 전체의 적용을, **변경 항목 태그 조건**은 개별 속성 변경의 연산을 걸러요. 출처·대상·발동자·원인마다 모두 필요(`all`), 하나 이상(`any`), 차단(`none`), 정확한 태그(`exact`)를 편집해요. 역할 사이는 AND예요. 빈 `any`는 제한이 없고, 기본 계층 매칭에서 `State.Alive.Ready`는 `State.Alive`를 만족해요. 정확한 태그를 켜면 전체 문자열을 비교해요.

```json
{
  "source": {"all": ["Weapon.Fire"], "none": ["State.Silenced"]},
  "target": {"any": ["Armor.Light", "Armor.None"], "exact": false}
}
```

효과의 `applicationRequirements`와 `modifiers[i].tagRequirements`에 같은 형식을 사용해요. 각 태그 목록은 최대32개이며 중복·잘못된 태그·알 수 없는 역할/필드는 저장 전에 거절해요. 효과 전체가 거절되면 핸들·부여 태그·적용 Cue를 만들지 않고 불필요한 속성 캡처도 읽지 않아요. 개별 불일치 항목은 원래 순번을 유지하면서 add/multiply/override 연산과 숫자 캡처·실시간 의존 연결을 생략해요. 불일치 override를 0으로 적용하지 않아요.

태그는 적용 시점의 문자열 목록을 캡처해요. 이후 태그 변경·효과 레벨/인자 수정·실시간 숫자 갱신으로 판정을 바꾸지 않아요. 같은 효과를 다시 적용해 중첩을 갱신하면 새 문맥으로 판정해요. 순간·지속·주기 효과가 이 규칙을 공유해요. 동적인 지속 조건/면역·네트워크 예측·과거 매 주기의 입력 재구성은 별도예요. 편집기 수치 미리보기에 네 역할의 태그를 넣어 조건 일치 여부를 볼 수 있어요.

조건 추가는 효과 문서를 `version:2`로 같은 Undo 안에서 확장해요. 기존 조건 없는 v1은 그대로 동작하고 이전 엔진은 v2를 거절해요. 조건을 지워도 v2를 유지하며 모든 적용/항목 조건을 제거한 뒤에만 명시적으로 v1로 내릴 수 있어요. 런타임 `qualified`는 계산 결과라 저작 파일에는 허용하지 않아요.

AI는 `effect.tags.edit({path,expectedRevision,modifier?,requirements?,clear?,dryRun?})`를 사용해요. `modifier` 생략/null은 효과 전체, 정수는 항목 순번이에요. 제거는 `clear:true`만 지정해요. 기존 저작 트랜잭션의 검증·revision·Undo·저장을 공유해요. `schema.effectTagRequirements`가 데이터 계약이에요. C++/BP `ApplyEffectSpec`는 같은 에셋과 기존 역할 인자를 사용해요. `runtime.effect`는 항목별 `qualified`, 조건과 캡처 문맥의 분리된 복사본을 반환해요.
