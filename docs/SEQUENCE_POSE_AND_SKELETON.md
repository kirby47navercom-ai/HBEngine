# 골격 조회와 시퀀스 포즈

시퀀스 골격 트랙을 선택하면 속성 패널의 **현재 월드 골격**에서 로컬/월드 좌표계를 선택하고 뼈 이름을 쉼표로 지정할 수 있어요. 빈 입력은 전체예요. 16개씩 이전/다음으로 조회하며 새로고침은 현재 월드를 다시 읽어요. 자동 프레임 조회나 문서 편집·Undo 기록을 만들지 않아요. 편집 중에는 편집 월드, 게임 실행 중에는 실행 월드예요. 별도 프리뷰의 시간 포즈라는 뜻은 아니에요.

`runtime.sequencePose`는 `{target, offset?, limit?, boneNames?, space?}`를 받아요. 기본은 로컬, offset=0, limit=64이며 페이지 최대512예요. 필터는 모델 순서를 유지하고 알 수 없는 이름·중복 요청은 오류예요. total은 필터 결과, modelTotal은 해당 액터 골격 전체예요. 반환된 벡터·행렬은 독립 복사본이에요. 뼈 이름은 전체 모델에서 비어 있지 않고 고유하며 160자 이하여야 해요. 요청한 페이지 밖의 잘못된 이름도 거절해요. 다른 objectId를 가진 중첩 액터의 골격은 포함하지 않아요.

월드 조회는 선택된 뼈와 조상 경로의 최신 행렬만 갱신해요. 관련 없는 형제·하위 트리를 재계산하거나 GPU 데이터를 읽지 않아요. position/quaternion/scale과 column-major matrix16개를 반환해요. 비균일 배율과 회전이 합쳐져 전단이 생기면 TRS로 정확히 표현되지 않을 수 있어요. matrix가 정확한 affine 변환이고, trsExact=false이면 TRS는 정규화된 근사 분해예요. 특이 행렬에서 유효한 TRS를 얻지 못하면 오류예요.

공용 C++ `hb::Skeleton`의 여섯 함수와 같은 이름의 블루프린트 순수 노드를 제공해요.

```cpp
auto names = hb::Skeleton::GetBoneNames(actor, 0, 64);
int count = hb::Skeleton::GetBoneCount(actor);
bool exists = hb::Skeleton::HasBone(actor, "Hand_R");
auto local = hb::Skeleton::GetBonePosition(actor, "Hand_R");
auto world = hb::Skeleton::GetBonePosition(actor, "Hand_R", true);
auto rotationDegrees = hb::Skeleton::GetBoneRotation(actor, "Hand_R", true);
auto scale = hb::Skeleton::GetBoneScale(actor, "Hand_R", true);
```

HasBone은 올바른 형식의 이름이 없을 때 false이고 나머지 단일 뼈 getter는 누락을 오류로 알려요. 회전은 XYZ Euler 도 단위예요. 월드 회전·크기는 위 TRS 분해 기준이에요. 정확한 전단 행렬이 필요한 AI 도구는 runtime.sequencePose의 matrix를 사용해요. 이 함수들은 실제 호출 때 검증하고 조회하며, 골격을 매 프레임 복제하거나 상주 캐시를 만들지 않아요.

재생은 모든 활성 대상의 현재 키/뼈 바인딩을 준비·검증한 뒤 포즈를 쓰고, 중첩 대상은 상위 대상 루트에서 한 번 행렬을 갱신해요. 즉시 Seek는 반환 전에 행렬까지 반영해요. 잘못된 새 트랙 활성화나 복원 포즈는 뼈에 쓰기 전에 거절하며 기존 재생 항목을 잃지 않아요. 기존 모델 교체·빈 골격·역방향 Seek·Stop의 원본 모델/포즈 복원과 정수/분수 Take 메타데이터는 유지해요. 골격별 소유권 가중 혼합, 외부 Animation Graph/몽타주 내부 상태 복원은 별도 잔여예요.

공식 참고 범위: Unreal5.8 [USkinnedMeshComponent::GetBoneTransform](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/USkinnedMeshComponent/GetBoneTransform)의 index/name/space 오버로드와 누락 시 동작을 새로 읽었어요. HB의 단일 getter는 누락을 명시 오류로 처리해요. Unity6000.0 [Transform.TransformPoint](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Transform.TransformPoint.html)의 좌표계·배율·다중 점 처리 설명을 새로 읽었어요. 추가 대조 출처로 Three.js [Object3D.updateWorldMatrix](https://threejs.org/docs/pages/Object3D.html#updateWorldMatrix)와 [Matrix4.decompose](https://threejs.org/docs/pages/Matrix4.html#decompose)의 부모/자식 갱신 및 비균일 배율 제한을 읽고 이 문서와 WORK1861에 등록해요. 전체 API/본문 분석 gate를 승격하지 않아요.
