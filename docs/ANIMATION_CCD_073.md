# 3D CCD IK·관절 회전 제한·디버그 — 073

2026-10-08. 071의 입력 포즈·네 공간·Actor 목표·Alpha·Quaternion/위치 바인딩과 공용 서비스를 재사용해 `ccdIK`를 추가한다. 기존 Two Bone/FABRIK와 SpriteSkin2D의 Limb/CCD/FABRIK를 유지한다.

## 제작과 동작

Animation Graph의 골격 제어 메뉴에서 CCDIK를 만들고 루트·끝 뼈, 목표/회전/공간·Actor·가중치, 허용 오차/최대 반복, 끝/루트에서 시작하는 계산 방향을 편집한다. 기본 반복 상한은 32, 허용 범위는 기존 1~128이다. 오차에 도달하면 일찍 종료하고 제한/도달 불가 상태에서도 길이와 남은 오차를 공개한다.

회전 제한은 기본 각도와 뼈 이름별 0~180도 목록으로 지정한다. 이 목록은 인덱스 순서를 바꿔 다른 관절을 수정하는 일을 피한다. 중복·잘못된 이름, 체인 밖 뼈, NaN/범위 오류는 공용 검증에서 거절한다. 관절 추가·삭제·값 편집은 기존 문서 revision/Undo/Save/AI patch를 사용한다. 실행 중에는 편집을 잠그고 계산 상태를 읽는다.

HB의 제한 기준은 **현재 프레임 입력 포즈의 로컬 Quaternion에서 벗어나는 전체 각도**다. 매 반복의 허용각을 누적하는 방식이 아니다. 0도는 해당 관절 잠금이고 기본 180도는 제한 없는 회전 범위다. 마지막 목표 회전과 Alpha 혼합에도 같은 경계를 적용한다. 여러 노드와 뒤의 레이어가 바꾸는 최종 포즈의 전체 관절 제한 또는 인체의 bind 기준 hinge/twist 최소·최대 축 제한으로 해석하지 않는다.

직선 체인의 축 위 목표는 CCD의 정지점이 될 수 있다. 방향별로 움직일 수 있는 관절에 작은 로컬 회전을 넣어 계산을 시작한다. 입력 애니메이션/부모가 회전해 있어도 로컬 축을 사용하고 잠긴 관절은 움직이지 않는다. 제한 때문에 불가능한 목표에는 반복 상한과 오차를 반환한다.

벡터·Quaternion·계층·각도 목록은 준비 때 할당하고 기존 포즈 버퍼를 사용한다. 관절마다 계층 행렬을 갱신하는 기존 O(n²) 비용은 유지한다. 새 전체 FPS/장시간 RAM 개선으로 표시하지 않는다.

## 공용 함수와 표시

C++ `hb::AnimationGraph::SetIKRotationLimit(actor,node,bone,degrees)`와 BP `animGraphIKRotationLimit`는 같은 CCD 관절을 수정하고 그 노드의 제한을 활성화한다. 노드는 고유 이름/ID, 관절은 뼈 이름이다. 기존 목표/Actor/회전/Alpha 설정·Tip/Error 조회 함수는 CCD에도 그대로 쓴다. C++ 가중치/각도 범위는 명령 발행 전에 검사하고 체인/종류는 서비스 경계에서 확인한다. 다른 솔버에 CCD 제한을 지정하면 명시적으로 거절한다.

`gameplayDebug.animationGraph.ik`에 솔버 종류, 제한 활성 여부, 이름별 각도, 반복/오차/가중치/끝 좌표를 공개한다. AI schema에 같은 기본값·회전 제한 의미·함수를 등록했다. Getter는 기존 계약대로 최신 노드 계산 결과이며 최종 레이어 뒤의 월드 뼈 위치가 아니다.

리타게팅의 IK 선은 계산용 복제 계층에서 실제 모델 렌더 계층으로 옮긴다. 이전에는 숫자 상태만 읽을 수 있고 선이 장면에 연결되지 않았다. 프로필 변경·Alpha0·원본 비활성에서 지난 선을 숨기며 종료 때 실제 렌더 계층에서도 제거/해제한다. 별도의 디버그 도형 구현을 추가하지 않는다.

## 확인

`test:animation-ik`는 세 솔버의 수렴/길이·기존 네 공간/Actor·입력 포즈, CCD의 두 방향·직선/역방향/원점 목표·회전한 입력·전체 각도 제한·0 잠금·잘못된 중복/범위/뼈와 공용 실행을 확인한다. 초기 직선 체인의 시드가 첫 관절 계산에서 취소되는 사례와 루트부터 계산할 때의 정지점을 재현해 수정했다. 반복 수0도 현재 프레임의 Alpha0 상태에 맞춰 표시한다.

실제 격리 Editor/release Player는 가져온 glTF, Two Bone→CCD 입력, C++ 목표와 관절 제한·잘못된 각도 거절, BP 제한 잠금/복구·Tip/Error→C++ 일치, 실제 렌더 뼈와 배치 보존을 확인한다. 편집기는 관절 추가/각도/checkbox·Undo·저장·잘못된 dryRun의 revision 보존·별도 미리보기를 포함한다. [073 증거](research/ANIMATION_CCD_073.json)에 제품 SHA, 원본 바이트 보존·오류0/종료0/서버 정리를 기록한다.

리타게팅 코어는 선의 실제 부모/숨김/재활성/정리를 검사한다. 기존 SpriteSkin2D IK, 그래프·상태·Sync·공용 API와 711 BP 노드 검사를 유지한다. 새 2D 관절 각도 제한을 구현했다고 표시하지 않는다. 해당 제약과 다른 누적 2D 요구도 계속 남긴다.

## 읽은 근거와 경계

[UE5.8 CCDIK guide](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-blueprint-ccdik-in-unreal-engine)의 자체 58줄·제작/속성 표를 읽었다. 체인·공간·Alpha·회전 제한 제작과 실제 모델 상호작용을 대조했다. 표에는 관절 인덱스/계산 방향 설명의 혼동이 있어 HB는 이름과 계산 방향을 명시한다. 연결 이미지/영상/페이지와 실제 엔진 솔버 구현은 미독이다.

[FAnimNode_CCDIK](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/AnimGraphRuntime/FAnimNode_CCDIK?lang=en-US)의 자체 117줄 선언/필드/함수 요약과 [FRigUnit_CCDIKItemArray](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/ControlRig/FRigUnit_CCDIKItemArray)의 자체 73줄을 읽었다. N 관절·단일 이펙터·기본/뼈별 제한·반복/오차·재사용 상태를 대조했다. 실제 함수 구현·연결 항목은 미독이며 HB 제한 수학을 Unreal 구현과 완전히 같다고 표시하지 않는다.

설치된 Three 0.180.0 [CCDIKSolver 원본](https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/jsm/animation/CCDIKSolver.js)의 135~259줄에서 링크 공간 순환 회전·각도·Euler 제한·가중치 부분을 읽었다. 072에서 읽은 [SkeletonUtils 원본](https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/jsm/utils/SkeletonUtils.js)의 앞부분도 함께 고정했다. r180 공식 원문 SHA와 설치 파일 SHA가 일치하며 나머지 파일 본문은 미독이다. 고정 보조 출처를 전체 corpus 대상으로 등록하고 분모/검증은 열린 상태로 둔다.

Full Body IK/Control Rig, bind 기준 축별 관절 제약·자동 접지·목표 이동 기즈모, 2D 관절 제약/전용 리타게팅, 072의 남은 연산과 `WORK_ORDER_051`의 다른 누적 요구는 유지한다. 사용자 설치/전체 corpus·PC120/모바일60·장시간 RAM 상태는 이 검사로 바뀌지 않는다.
