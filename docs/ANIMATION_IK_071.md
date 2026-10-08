# 3D IK 제작·포즈·BP/C++ 실행 — 071

2026-10-08. 기존 Animation Graph에 Two Bone IK와 FABRIK를 연결한다. 별도 계산 데모 대신 클립·상태·레이어가 전달하는 포즈를 받아 실제 모델의 뼈 바인딩에 출력한다. 기존 SpriteSkin2D IK는 유지한다.

## 제작과 실행

Two Bone IK는 루트·중간·끝의 세 관절, FABRIK는 연결된 루트~끝 체인을 사용한다. 루트/끝 이름은 모델의 뼈를 지정하며 중복 이름·끊어진 체인·겹친 관절은 거절한다. FABRIK에 임의의 체인 개수 제한을 추가하지 않는다. 뼈 계층의 크기는 양의 균일 크기여야 한다.

목표와 관절 힌트는 컴포넌트/월드/뼈/부모 뼈 공간을 선택한다. 오브젝트를 지정하면 좌표는 그 오브젝트의 로컬 공간이다. 이동하는 Actor·부모 변환과 같은 프레임의 Actor 애니메이션 입력도 반영한다. 삭제·풀 비활성 목표는 원래 포즈를 통과시키고 `missingActor`를 표시하며 재활성화하면 다시 계산한다. 시작 배치 위치를 덮어쓰지 않는다.

위치/회전/힌트 가중치, 초기 위치·회전 차이 유지, Alpha·Float 파라미터·Alpha 배율/바이어스를 편집한다. 위치 차이는 첫 평가의 컴포넌트 공간 차이이며 회전은 상대 Quaternion이다. Two Bone에는 늘이기 시작/최대 비율과 로컬 비틀림 축을 제공한다. FABRIK에는 오차와 최대 반복을 제공한다. 끝 회전은 로컬 유지/컴포넌트 유지/목표 회전이다. 도달할 수 없는 목표는 체인 길이를 유지하고 잔여 오차를 공개한다. 직선 체인의 내부 목표는 작은 평면 씨앗으로 특이점을 벗어난다.

솔버는 입력 포즈를 직접 바꾸지 않는다. 참조 뼈의 초기 포즈는 약한 참조로 유지해 같은 모델에서 다시 재생해도 최대 늘이기가 계속 누적되지 않는다. 계산용 계층·포즈·수학 버퍼를 재사용하고 디버그 선은 켰을 때 생성해 그래프 정리 시 해제한다. 비활성 IK용 렌더 자원은 생성하지 않는다.

속성은 목표/회전/힌트/길이·비틀림/계산 접이식 구역과 XYZ 입력으로 편집한다. 노드 선택 시 공통 그래프 설정은 접어 두고 선택 노드의 속성을 먼저 보여준다. 실행 중에는 속성 변경·노드 이동을 잠그지만 노드 선택과 오차/반복/가중치 확인은 가능하다. 미리보기는 모델·목표 Actor와 필요한 부모를 별도 월드에 복제하며 게임 스크립트를 실행하지 않는다.

## 공용 함수와 AI

C++ `hb::AnimationGraph`와 BP가 다음 8개 함수를 공유한다.

| C++ | BP ID | 값 |
| --- | --- | --- |
| SetIKTarget | animGraphIKTarget | 목표 Vec3 |
| SetIKHint | animGraphIKHint | Two Bone 관절 힌트 Vec3 |
| SetIKRotation | animGraphIKRotation | 목표 회전 Vec3, 도 단위 |
| SetIKWeight | animGraphIKWeight | 원래 Alpha, 0~1 |
| SetIKTargetActor | animGraphIKTargetActor | 목표 Actor, null은 해제 |
| SetIKHintActor | animGraphIKHintActor | 힌트 Actor, null은 해제 |
| GetIKTipPosition | animGraphIKTip | 마지막 노드 계산의 컴포넌트 끝 위치 |
| GetIKError | animGraphIKError | 같은 계산의 끝~실제 가중 목표 거리 |

노드의 고유 이름 또는 ID를 받는다. 이름이 중복되면 거절한다. C++ 명령은 기존 프레임 경계에서 적용하며 Getter는 최신 계산 결과를 읽는다. 뒤의 레이어/혼합이 최종 포즈를 다시 바꿀 수 있으므로 이 조회를 최종 월드 뼈 위치로 해석하지 않는다. 힌트 함수는 FABRIK에 적용하지 않는다. 벡터·가중치·오브젝트를 공용 경계에서 검증한다.

AI schema는 동일 노드 기본값·공간·가중치·함수·조회·수명 계약을 제공한다. 기존 document.patch/dryRun/expectedRevision·Undo/Save를 사용한다. 사람이 편집한 에셋과 AI가 편집한 에셋을 서로 다른 실행기로 처리하지 않는다.

## 확인

`npm run test:animation-ik`는 수렴/길이/특이점/도달 불가·늘이기 상한과 재생 반복·Alpha·힌트0·네 공간·목표 Actor·초기 offset·회전·실제 애니메이션 입력·동일 프레임 Actor 이동·참조 포즈 보존·자원 재사용/정리·오류 거절·공용 서비스·목표 비활성 수명을 확인한다.

실제 격리 Editor와 내보낸 release Player에서는 가져온 glTF의 두 솔버, C++ 목표/힌트/회전/가중치/Actor 설정, BP 목표와 가중치 변경, BP 조회→C++ 값 일치, 실제 렌더용 뼈의 위치/Quaternion 바인딩을 확인한다. 편집기는 XYZ/오차 편집·Undo·잘못된 dryRun의 revision 보존·별도 미리보기·원본 저장을 포함한다. 초기 검사에서 미등록 테스트 함수 메타데이터, 편집기 작업 잠금, JSON 저장 형식에 걸린 사례는 수정하고 증거를 남겼다. 실패 기록을 통과 기록으로 덮어쓰지 않는다.

최종 경로·제품 SHA·오류0/종료0/서버 정리·원본 바이트 보존은 [071 증거](research/ANIMATION_IK_071.json)에 기록한다. 기존 그래프·상태·Sync·Blend Space·몽타주·루트 모션·62 컴포넌트·705 BP 노드·생성 API 검사를 함께 유지한다. 이번 검사는 전체 FPS/장시간 RAM 성능 측정이 아니다.

## 직접 읽은 근거

[Unreal Two Bone IK](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-blueprint-two-bone-ik-in-unreal-engine)의 자체 41줄과 속성 표, [FABRIK](https://dev.epicgames.com/documentation/en-us/unreal-engine/fabrik-animation-blueprint-in-unreal-engine)의 자체 48줄과 속성 표를 읽었다. 세 관절/체인, 목표/관절 공간, 회전·늘이기·비틀림, Alpha·오차/반복·디버그를 대조했다. [FAnimNode_TwoBoneIK](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/AnimGraphRuntime/FAnimNode_TwoBoneIK) 자체 147줄, [FAnimNode_Fabrik](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/AnimGraphRuntime/FAnimNode_Fabrik) 자체 120줄의 선언/필드/메서드 요약도 읽었다. 연결된 C++ 메서드 본문·영상·이미지·원 논문은 미독이다.

[Unity Two Bone IK](https://docs.unity3d.com/Packages/com.unity.animation.rigging@1.4/manual/constraints/TwoBoneIKConstraint.html)의 자체 본문/표/자동 설정, [Rigging Workflow](https://docs.unity3d.com/Packages/com.unity.animation.rigging@1.4/manual/RiggingWorkflow.html)의 Animator 뒤 제약 적용·계층 순서·Rig/BoneRenderer 설명, [TwoBoneIKConstraintData](https://docs.unity3d.com/Packages/com.unity.animation.rigging@1.4/api/UnityEngine.Animations.Rigging.TwoBoneIKConstraintData.html)의 자체 선언/속성 설명을 읽었다. 문서가 실제 표시한 패키지 버전은 1.4.1이다. 연결된 API/미디어는 미독이다.

[Unity 공식 패키지 registry](https://packages.unity.com/com.unity.animation.rigging)에서 고정 버전 1.4.1의 소스를 가져와 TwoBoneIKConstraint/Job, ChainIKConstraint/Job 네 파일 전체를 읽었다. AnimationRuntimeUtils는 1~300줄의 Two Bone·삼각형·FABRIK 함수와 역계산 부분을 읽었으며 나머지는 미독이다. 지속 버퍼·목표 offset·가중 회전·캐시 갱신·Destroy를 직접 대조했다. 엔진에는 그 패키지나 패키지 에셋을 추가하지 않았다. 다운로드한 다른 파일을 읽었다고 계산하지 않는다.

7개 문서 URL의 원장 등록과 직접 읽기·패키지 소스 범위는 구분한다. 전체 corpus gate·리타게팅·Full Body IK/Control Rig·관절 각도 제한·자동 발 접지·IK 목표 드래그 기즈모를 이번 작업의 완료 항목으로 표시하지 않는다. 해당 누적 세부는 계속 유지한다. [051 순서](WORK_ORDER_051.md)에 따라 선행 묶음 뒤 설치 갱신을 진행한다. 사용자 설치본·사용 중인 창·원본 게임 코드는 변경하지 않았다.
