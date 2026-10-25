# 천·로프의 압축과 입자 질량

Cloth, 3D 로프, Rope2D의 기존 **물성**에서 두 설정을 사용할 수 있어요.

- **압축 시 느슨하게**(`tensionOnly`): 구조 연결이 늘어날 때 저항하고 줄어들 때는 느슨해져요. 기본 false는 기존 인장·압축 동작을 유지해요. 굽힘 주파수는 독립적이므로 완전히 유연한 케이블이 필요하면 함께 조절해요.
- **입자 질량 가중치**(`massWeights`): 입자 번호별 상대 가중치를 지정해요. 없는 번호는 1이며 모든 가중치를 기존 전체 질량으로 정규화해요. 비어 있으면 원래 균일 질량 경로를 사용해요.

```json
"tensionOnly": true,
"massWeights": [{"index": 0, "weight": 4}, {"index": 5, "weight": 0.5}]
```

장면과 블루프린트 속성 창에서 입자 번호·가중치를 입력하고 **지정/기본값/전체 초기화**를 눌러요. 선택한 번호와 키보드 포커스를 유지하고 같은 값은 다시 적용하지 않아요.

번호는 현재 입자 범위 안에서 중복 없이 지정해요. 가중치 범위는 0.001..1000이고 0으로 고정하지 않아요. 고정은 기존 고정 영역·입자 고정 기능으로 지정해요. 격자 번호는 `u * rows + v`, 로프는 시작점부터의 번호예요. 편집 폼에서 입자 수/형상을 줄이면 범위 밖 질량 항목도 고정 항목처럼 함께 제거하고, 일반 Undo로 되돌릴 수 있어요. 직접 잘못된 JSON을 주면 검증에서 거절해요.

두 설정은 물리 생성 시 적용돼요. 실행 중 변경하면 rest state를 새로 만들고 기존 실행 중 고정/부착도 기존 cold rebuild 규칙으로 재설정해요. 엔진이 지원하지 않는 hot 질량 변경을 힘으로 흉내 내지 않아요. 주파수·소성·마찰 등 기존 hot 설정은 같은 body와 질량 분포를 유지해요.

블루프린트는 기존 컴포넌트 논리값/JSON 지정, C++는 같은 공용 함수를 사용해요.

```cpp
hb::Components::SetBool(actor, "Cloth", "tensionOnly", true);
hb::Components::SetText(actor, "Cloth", "massWeights",
                       R"([{"index":0,"weight":4}])");
```

2D 로프는 컴포넌트 선택자를 `Rope2D`로 바꿔요. `runtime.cloth`·`runtime.rope` 입자 페이지는 요청한 입자의 실제 `mass`만 복사해요. 요약에는 `tensionOnly`와 가중치를 지정한 입자 수 `weightedParticles`가 있어요. AI 계약은 `engine.schema.deformableDistribution`이에요.

이 기능은 Rapier의 실제 인장 전용 구조 연결과 개별 입자 질량을 사용해요. 비균일 생성 때만 Float32 질량 배열을 만들고, 새 솔버 입자 순회·워커·전체 입자 IPC를 추가하지 않아요. 기존 동기화의 작성 속성 검증·서명은 sparse 항목을 읽으며, 빈 가중치는 추가 배열 할당을 건너뛰어요. 움직임 거리 tether, 연속 고정 가중치 브러시, 절단/파손은 별도예요.

검사: `tools/check-deformable-distribution-2824.mjs`는 실제 2D·3D 솔버에서 질량·충격 반응·압축/인장·hot 보존/명시적 재생성·공용 VM을 확인해요. `tools/check-deformable-distribution-2826-cpp.mjs`는 현재 SDK의 기존 함수를 컴파일해 세 종류의 실제 solver에 적용·복원해요. 새 GUI/GPU 픽셀·실기기·설치 검사는 수행하지 않아요. 사람의 두 속성 창과 실제 변경 핸들러는 `tools/check-cloth-mass-ui-2828.mjs`에서 따로 확인해요. 포인터 브러시나 실제 픽셀 검사는 아니에요. 확정 결과는 `docs/research/ENGINE_WORK_2830.json`에 남겨요.
