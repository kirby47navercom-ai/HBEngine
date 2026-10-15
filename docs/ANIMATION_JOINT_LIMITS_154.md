# 기준 포즈 XYZ 관절 제한

각 Two Bone/FABRIK/CCD 노드의 속성창에서 **기준 포즈 XYZ 제한 → 관절 추가**로 체인의 관절을 고르고 최소·최대 각도를 입력한다. X/Z는 -180..180°, Y는 -90..90°이며 축별 최소는 최대 이하여야 한다. 같은 관절을 중복 지정할 수 없다. 최소와 최대가 같으면 해당 축이 고정된다. XYZ 순서의 canonical Euler 범위로, 주기 경계를 가로지르는 범위와 swing/twist 타원체는 별도 계약이다.

기준은 가져온 골격의 bind 로컬 Quaternion이다. 현재 입력 포즈 Quaternion을 bind 역행렬에 상대화해 XYZ를 제한하고 bind 회전을 복원한다. 관절 길이·Actor 배치와 원본 클립은 바꾸지 않는다. CCD는 반복 중 제약을 적용하며 지정된 관절의 XYZ 제약이 기존 입력 포즈 기준 cone 제한을 대신한다. 다른 관절은 예전 cone 제한을 유지한다. Two Bone/FABRIK는 기하 해를 관절 회전에 적용하는 단계와 최종 포즈 단계에서 제약한다. 불가능한 목표는 강제로 길이를 바꾸지 않고 실제 잔차를 표시한다. 기존 노드 Alpha와 후속 그래프 혼합은 제한된 포즈와 입력 포즈를 혼합한다. Alpha가 1보다 작으면 혼합 결과를 hard constraint로 보장하지 않는다.

기존 파일의 `jointLimits` 생략은 빈 제한과 같아 마이그레이션이 필요 없다. 노드 저장·Undo/Redo·AI revision/dryRun 검증은 기존 Animation Graph 소유자를 쓴다. JSON 항목은 `{bone,minimum:[x,y,z],maximum:[x,y,z]}`다.

```cpp
hb::AnimationGraph::SetIKJointLimit(actor, "LegIK", "Knee",
    {0, 0, 0}, {0, 0, 120});
hb::AnimationGraph::ClearIKJointLimit(actor, "LegIK", "Knee");
```

같은 C++ 선언에서 BP `animGraphIKJointLimit`·`animGraphIKClearJointLimit`를 생성한다. C++는 잘못된 숫자/범위를 명령 발행 전 거절하고 공용 실행기도 검증한다. `engine.schema.animationGraph.ik.jointLimits`가 같은 계약을 제공하며 runtime의 `animationGraph.ik[].jointLimits`는 적용 중인 제한을 공개한다. Set/Clear는 다음 포즈 계산의 제한을 바꾸며 C++ 함수 안에서 뼈 계산을 동기로 완료했다는 뜻이 아니다.

실제 축 제한은 O(제한된 관절 수)의 재사용 수학 버퍼를 사용한다. 무제한 노드에는 추가 회전 수학 버퍼가 없으며 제약 생성/해제 때만 배열·맵을 수정한다. 매 프레임 새 제약 목록이나 GPU 자원을 만들지 않는다. 기존 2D IK 각도 제한은 별도 2D 계약을 유지한다.
