# 접촉 Bool로 발 고정하기

애니메이션 그래프의 **Two Bone IK → 발 고정**에서 기존 Bool 파라미터를 선택해요. 빈 값이면 이전 IK 동작을 유지해요. Bool이 true가 되는 순간 입력 포즈의 발 위치·방향을 붙잡고, false이면 지정한 초 동안 원래 포즈로 돌아와요. 접촉 구간은 애니메이션의 Notify나 게임 로직에서 지정해요.

접촉 표면의 기본값은 **월드**예요. 움직이는 발판 오브젝트를 고르면 그 표면의 좌표에 고정되어 발판의 이동·회전을 따라가요. 표면이 사라지거나 같은 ID의 다른 오브젝트로 교체되면 이전 고정을 버려요. 속성의 기존 상태 줄에서 고정·해제 가중치, 없는 표면과 IK 오차를 볼 수 있어요.

```json
{
  "plantParameter": "LeftFootContact",
  "plantAnchorActor": "",
  "plantRotation": true,
  "plantRelease": 0.15
}
```

Bool은 같은 그래프 안에 bool 타입으로 선언해야 해요. 회전 고정에는 양의 균일 월드 크기가 필요해요. 비균일 크기·반사·shear가 필요한 표면은 회전 고정을 끄고 위치만 고정할 수 있어요. 입력 무릎의 pole, 기존 길이·관절 제한과 alpha/위치·회전 가중치를 유지하므로 닿지 않는 목표의 잔여 오차를 숨기지 않아요.

블루프린트는 기존 `animGraphSetBool`, C++는 기존 공용 함수를 사용해요.

```cpp
hb::AnimationGraph::SetBool(actor, "LeftFootContact", true);
```

설정은 일반 문서 패치·저장·Undo 흐름으로 편집해요. AI 계약은 `engine.schema.footPlant`에 있어요. 서로 다른 평가 문맥의 고정 이력은 분리하고 비활성 분기, 시계 되감기, alpha 0, 그래프 종료에서 정리해요. 포즈 예산 때문에 평가만 생략한 프레임은 비활성 분기로 취급하지 않아요.

자동 지면 검사·Stride/골반 보정·물리 접촉 해법은 별도예요. 이번 근거는 실제 Three 골격/그래프·공용 VM과 현재 SDK로 컴파일한 C++ Bool 제어예요. 사용자 창이나 실기기의 화면 검사는 실행하지 않았어요.

검사: `tools/check-foot-plant-2798.mjs` 14개, `tools/check-foot-plant-2804-cpp.mjs` 실제 C++ 2메서드·2조회. 정확한 결과 경로는 `docs/research/ENGINE_WORK_2820.json`에 있어요.
