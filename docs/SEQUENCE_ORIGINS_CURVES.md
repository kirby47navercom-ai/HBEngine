# 시퀀스 변환 기준점과 커브

시퀀스 속성의 **변환 기준점**에서 위치·회전 또는 기준 액터를 지정해요. 기준점이 없는 기존 파일은 그대로 재생돼요. Transform 컴포넌트의 위치·회전 트랙도 같은 처리를 사용해요.

```json
"origin": {
  "mode": "actor",
  "actor": "Anchor",
  "position": [0, 0, 0],
  "rotation": [0, 0, 90]
}
```

`inherit`는 상위 시퀀스 기준점, `transform`은 상위 기준점에 합성한 위치·회전, `actor`는 해당 액터의 현재 월드 좌표를 기준으로 한 별도 프레임이에요. 회전은 XYZ 도 단위이며 쿼터니언으로 합성해요. 액터 모드는 상위 프레임을 대체하고 지정한 로컬 오프셋을 추가해요. 기준 액터의 배율은 적용하지 않아요.

기준 액터 자신의 변환 키를 먼저 평가해 다른 오브젝트가 같은 표본의 기준점을 따라가게 해요. 자신에게 기준점을 다시 더하지 않아요. 부모가 붙은 오브젝트의 로컬 키도 다시 변환하지 않으므로 부모를 통한 이동이 중복되지 않아요. 기준 액터와 동일 ID인 새 객체를 교체하면 재생 쓰기를 거부해요. 자신의 애니메이션 대상 아래에 기준 액터를 붙이는 피드백, 다른 자식 시퀀스에서 기준 액터를 애니메이션하는 구성은 거부해요. 유효하지 않은 새 재생 요청은 기존 재생을 먼저 종료하지 않아요.

연속 값 트랙에서 **커브 편집**을 누르면 기존 블루프린트 커브 편집기가 열려요. 위치·회전·크기, float·vec2·vec3·color 변수, 연속 컴포넌트 속성을 편집할 수 있어요. 키 이동·박스 선택·우클릭 보간 메뉴·중간/오른쪽 버튼 이동·휠 확대·F 맞춤과 숫자 입력을 공유해요. 변수를 가리키는 바인딩과 재생 설정은 커브 트랙으로 바꾸지 않아요.

`linear`는 선형, `constant`/기존 `step`은 계단, `auto`는 인접 키의 기울기, `user`/`break`는 진입·진출 탄젠트를 사용한 Hermite 보간이에요. 탄젠트는 초당 값이며 값과 같은 수/벡터 형식이에요. 키를 선택하면 핸들이 나타나고, 드래그하면 양쪽 기울기를 연결해요. Alt 또는 Break 모드는 한쪽만 바꿔요. 다른 축의 자동 기울기는 보존해요. Auto/Linear/Constant로 전환하면 저장한 핸들을 지워요. 쿼터니언 회전 트랙은 기존 slerp·계단 방식을 유지하며 cubic 탄젠트를 받지 않아요. 크기는 기존 부호와 역변환 가능한 최솟값을 유지해요.

사람과 AI는 동일한 에셋 검증·Undo·저장·공용 실행 서비스를 사용해요. `sequence.origin.edit`, `sequence.curve.edit`는 열린 문서의 `path`·`expectedRevision`·`dryRun`을 지원해요. `runtime.sequenceTree`는 요청할 때 기준점 설정을 보여줘요. 기존 C++/블루프린트의 LevelSequence 재생·탐색 경로와 PC/웹/모바일 공용 패키징 데이터에서 같은 에셋을 읽어요. 이번 실행 증거는 격리 편집기와 Windows D3D11 패키지이며 모바일 실기기 실행을 뜻하지 않아요.

재생 중 키는 한 번 정렬하고 이진 탐색해요. 기본 기준점에는 벡터·쿼터니언 작업 버퍼나 정렬 목록을 만들지 않아요. 선택한 기준점만 작은 작업 버퍼를 갖고, 기준 액터의 계층만 읽어요. 별도 월드 복사·워커·GPU 자원·셰이더 변경은 없어요.

가중 Bézier 핸들, 시간 재매핑, 클램프 자동 곡선, 스켈레탈 루트 모션의 기준점, 부모 문맥의 기즈모 편집과 가중 혼합은 별도 잔여 항목이에요.

이번에 읽은 공식 본문과 대조 범위:

- [Unreal 동적 Transform Origin](https://dev.epicgames.com/documentation/en-us/unreal-engine/creating-level-sequences-with-dynamic-transforms-in-unreal-engine): 기준 액터·런타임 이동·하위 시퀀스 상속을 대조했어요. HB의 actor 프레임 재정의와 부착 로컬 처리·금지 구성은 위에 명시한 자체 규칙이에요.
- [Unreal Curve Editor](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-curve-editor-in-unreal-engine): 개요·툴바·보간/탄젠트·편집 조작 구역을 읽었어요. 전체 툴바·고급 필터를 구현했다는 뜻은 아니에요.
- [Unity Timeline 1.7.7 트랙 속성](https://docs.unity3d.com/Packages/com.unity.timeline@1.7/manual/insp_trk_anim.html): 지정 변환과 현재 씬 오프셋의 구분을 대조했어요. Animator/아바타 마스크 전체를 이 구현에 포함하지 않았어요.
- [Unity 6.6 곡선 편집](https://docs.unity3d.com/Manual/EditingCurves.html): 키·탄젠트와 연결/분리 기울기 조작을 대조했어요. 연결 문서/API 전체 분석은 아니에요.
