# 2D IK 목표·솔버·공용 실행 · 2026-10-05

## 실제 읽기와 적용

Unity 2D Animation 13의 [2D IK](https://docs.unity3d.com/Packages/com.unity.2d.animation@13.0/manual/2DIK.html) 기술 본문을 읽고 목표점·체인·가중치·순서·미리보기·기즈모를 대조했어요. 반환된 판본은 13.0.6이에요. [IKManager2D](https://docs.unity3d.com/Packages/com.unity.2d.animation@13.0/api/UnityEngine.U2D.IK.IKManager2D.html), [Solver2D](https://docs.unity3d.com/Packages/com.unity.2d.animation@13.0/api/UnityEngine.U2D.IK.Solver2D.html), [Limb](https://docs.unity3d.com/Packages/com.unity.2d.animation@13.0/api/UnityEngine.U2D.IK.LimbSolver2D.html), [CCD](https://docs.unity3d.com/Packages/com.unity.2d.animation@13.0/api/UnityEngine.U2D.IK.CCDSolver2D.html), [FABRIK](https://docs.unity3d.com/Packages/com.unity.2d.animation@13.0/api/UnityEngine.U2D.IK.FabrikSolver2D.html)의 각 클래스 Properties/Methods 선언·설명·인자·반환·override 본문도 읽었어요. 원문·SHA를 `native/build/ik-docs-NalnfP`에 보존했어요. 상속된 모든 UnityEngine API, 링크된 다른 페이지·이미지·패키지 전체를 읽었다는 기록은 아니에요. 기존 전체 연구 gate를 승격하지 않아요.

HBEngine은 이 제작 흐름에 자체 데이터·계산·편집기를 연결해요. Unity 소스 구현/수치·등록된 C# solver subclass ABI까지 동일하다는 의미는 아니에요. Unreal의 3D IK Rig/Control Rig 전체와 이 2D 솔버를 동일한 구현으로 세지 않아요.

## 사람의 제작 흐름

스프라이트 리그의 뼈를 선택하고 왼쪽 IK 솔버에서 CCD/FABRIK/Limb를 추가해요. 솔버를 선택하면 루트·이펙터·목표 XY/회전·가중치·활성·기준 포즈 복원·회전 고정·반복/허용 거리·굽힘 반전·기즈모 색/표시를 편집해요. 목표 기즈모를 드래그해 포즈를 잡고, 목록 드래그 또는 위/아래 버튼으로 처리 순서를 바꿔요. 생성·삭제·수치/목표 드래그·재정렬은 문서 Undo/Redo·저장을 공유해요. Shift+I는 IK 목표 도구예요.

Limb는 루트·중간 관절·이펙터 **세 뼈의 관절 원점**을 사용해요. Bone.length의 끝을 자동 이펙터로 쓰지 않아요. CCD/FABRIK는 루트에서 이펙터까지 이어진 2~64개 관절이에요. 중간 관절이 겹치거나 부모가 끊어진 체인은 거절해요. Limb의 중간 뼈 분할로 관절 수가 늘면 먼저 CCD/FABRIK으로 바꾸도록 오류를 알려줘요. 종류를 몰래 바꾸거나 잘못된 리그를 저장하지 않아요. 하위 뼈 삭제는 관련 솔버를 함께 제거해요.

IK 미리보기와 작성 바인드 포즈는 달라요. IK 도구에서 뼈 속성의 위치/회전/크기는 실제 계산 포즈를 표시하고 읽기 전용이에요. 작성 값은 뼈 도구에서 편집해요. 실행 중에는 실제 연결 Actor의 목표·포즈·도달 거리/반복/계산 한도 값을 표시하고 작성 필드를 잠가요. 리그 메타데이터는 접는 영역에 두고 뼈/속성 패널을 타임라인 옆까지 확장해요.

리그를 배치할 때 솔버가 있으면 SpriteRenderer·SpriteSkin에 IKManager2D를 추가해요. 기존 Actor에는 IKManager2D를 직접 추가할 수 있어요. 컴포넌트는 활성·전체 가중치·숨겨진 오브젝트 갱신을 조절해요. 현재 숨김 판단은 Actor.visible이며 카메라 frustum visibility와 같지 않아요.

## 실행 의미와 비용

애니메이션·게임 시스템·물리 갱신 뒤, 솔버 배열의 앞에서 뒤 순서로 적용해요. 앞 솔버의 결과를 다음 솔버가 읽어요. Manager×Solver 가중치를 곱하고 각 로컬 관절 회전을 혼합해요. 가중치 0은 입력 포즈를 보존해요. restorePose=true는 바인드 포즈에서 다시 계산하고 false는 현재 애니메이션/직전 포즈에서 계산해요. Limb는 굽힘 방향을 바꾸는 해석식, CCD는 끝에서 루트로 회전, FABRIK는 전후방 점 조정이에요. CCD.velocity는 이번 구현에서 반복별 회전 적용 비율 0~1이며 초당 이동 속도로 표현하지 않아요. 0이면 움직이지 않아요.

목표는 rig-local XY/회전 도예요. Actor 목표를 연결하면 그 Actor의 로컬 offset을 월드→리그 평면으로 변환하고 목표 회전도 따라가요. 평면 밖 Z는 XY 계산에 쓰지 않아요. Actor 자체의 이동/회전/비균일 크기는 역변환으로 제거해요. 체인 내부 뼈의 XY 크기는 양의 균일 크기여야 하고 전단/비균일 포즈는 명시적 오류예요. 아직 관절 각도 한계·stretch·pole/힌트·이동 target spline·3D IK·Control Rig 프로그램은 제공하지 않아요.

scratch 점/길이/각도/이전 행렬 배열을 재사용해요. 입력 포즈·목표·설정이 같은 결과는 재계산하지 않아요. 복원하지 않는 미도달 포즈와 계산 한도에 걸린 솔버는 다음 갱신에서 이어 계산해요. 솔버32·체인64·반복64, 반복 내부 점 조정 예산8192를 사용하며 limited 상태를 조회할 수 있어요. 이 예산이 전체 CPU 연산 수나 FPS 보증은 아니에요. 솔버 완료 뒤 스키닝을 한 번 갱신하고 종료 때 솔버/뼈 참조를 해제해요. 외부 의존성을 추가하지 않았어요.

## 블루프린트·C++·AI

`hb::IK2D`의 Set/GetTarget, Set/GetTargetRotation, SetTargetActor/ClearTargetActor, Set/GetWeight, SetEnabled/IsEnabled, Set/GetMasterWeight 12개가 같은 실행기에 연결돼요. BP 검색의 영어/한국어 이름과 자료형은 C++ 선언에서 생성해요. 전체 BP 카탈로그는545개예요.

C++ setter 직후 getter는 같은 요청의 지정 목표·회전·가중치·활성 값을 읽어요. 뼈 포즈 계산은 실행기 IK 단계에서 이루어져 그 C++ 함수 내부에서 이미 계산됐다고 간주하지 않아요. Actor 연결/해제는 큐로 적용되고, 연결 해제는 마지막 목표를 유지해요. 위치/회전을 직접 지정하면 Actor 연결이 해제돼요. 목표 Actor가 사라지면 오류를 숨기지 않아요.

schema.spriteRig.ik는 실제 종류·한도·관절 의미·좌표·컴포넌트·표시 계약을 제공해요. `rig.ik.add/remove/reorder`와 document.patch는 안정적인 솔버/뼈 ID·expectedRevision·dryRun·검증·Undo/Redo를 사용해요. source rig.solvers 배열은 작성 데이터, runtime.state.spriteSkin[].ik는 실행 복사본이에요. 이 값은 조회 시 snapshot이며 clock/reset 요청에 전체 리그를 매 프레임 보내지 않아요. headless도 같은 솔버를 사용해요.

## 검증

`test:sprite-ik`는 세 솔버 도달/미도달·일직선 안쪽 목표·가중치·가시성·굽힘·목표 회전·Actor 월드 변환·고정 입력 캐시·배열 재사용·겹침/잘못된 ID/값·Limb 분할 보존·삭제·계산 한도/재시도를 검사해요.

`test:sprite-ik-editor-window`는 고유 임시 프로젝트/프로필/포트의 화면 밖 비활성 Editor에서 목표 물리 드래그·사람 솔버 생성·AI 생성/재정렬/dryRun·Undo·저장·배치·시작 위치/HUD·실행 중 실제 포즈·공용 BP/C++·원본 보존·정상 종료/서버 정리를 검사해요. `test:sprite-ik-player-window`는 실제 release Game.exe와 같은 프로젝트의 headless 결과를 대조해요. 최종 Editor `native/build/sprite-ik-editor-wbOkUc`, release Player `native/build/sprite-ik-player-jYGbhc`가 통과했어요. 양쪽 오류 배열은 비었고 원본 보존·exit0·서버 종료를 확인한 뒤 acceptance.json을 기록했어요. 실제 PNG의 한글 HUD와 변형 메시를 확인했고 Player GPU에서 마젠타 픽셀4704개를 읽었어요. 코어 sprite-ik와 sprite-rig-WRn0j7, main545·API 생성 대조·integration·runtime·시작 상태 회귀도 통과했어요. 사용자 설치본/게임 원본/창은 변경하지 않아요.

이 기능 뒤에도 2D 조명/그림자·입자 마스크·타일 충돌, 상태/혼합/동기화 애니메이션·몽타주, 머테리얼·월드·네이티브 렌더·게임 프레임워크·C++·모바일/배포·성능을 포함한 전체 누적 작업을 유지해요.
