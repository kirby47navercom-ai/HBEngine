# 관절 해제·파손과 재연결

3D/2D Physics Constraint의 **파손** 항목에서 앵커 간격(m)과 상대 회전(도)을 지정해요. 각각 0이면 검사하지 않아요. 상대 회전은 관절 생성 때 양쪽 강체의 상대 자세에서 최단 각도이며 누적 회전 수가 아니에요. 간격은 실제 양쪽 로컬 앵커의 월드 거리이고, 2D에서는 XY만 사용해 화면 표시용 Z를 제외해요. slider/spring 등 원래 움직임을 허용한 관절에서도 지정 간격을 그대로 비교해요. 힘이나 토크 단위의 반력으로 환산하지 않아요.

물리 substep의 전·후에 한계를 확인하고 넘으면 실제 solver 관절을 제거해요. 해당 컴포넌트와 양쪽 강체 수명이 유지되는 동안 파손 상태를 보존하므로 속성 수정/상태 조회가 자동으로 다시 연결하지 않아요. 컴포넌트 비활성→활성, 새 강체/새 컴포넌트 또는 명시적 재연결은 현재 자세·앵커를 새 기준으로 삼아요. 게임 중 파손은 작성 에셋을 변경하지 않아요.

BP **관절 해제·재연결**, C++ `hb::Physics::SetJointBroken(target,component,broken=true)`와 공용 `physicsJointBreak` 명령을 사용해요. `broken=false`로 재연결해요. 컴포넌트 ID/형식/이름은 기존 관절 명령과 같고, 대상이 없거나 비활성/query-only이면 거절해요. C++ 명령은 기존 queued 쓰기 경로로 전달하므로 다음 managed 명령 처리 뒤 실제 solver에 적용돼요.

기존 AI `runtime.physics.joints` 페이지의 각 행에 `broken`과 필요한 경우 `breakState {broken,reason,time,distance?,angle?}`를 복사해 반환해요. 이유는 manual/distance/angle/rearmed이고 마지막 상태만 유지해 이벤트 배열을 누적하지 않아요. 동일 정보는 `gameplayDebug.jointBreaks[componentID]`에서 볼 수 있으며 비활성/교체/월드 종료 때 정리해요. 기본 0인 기존 프로젝트에는 거리/각도 계산이나 복사 배열을 추가하지 않아요.

검사 `node tools/check-joint-break-2506.mjs`는 실제 Rapier 2D/3D와 BP 서명/공용 VM을 확인해요. 설치본이 비어 있을 때만 현재 SDK C++ worker를 한 번 컴파일해 실제 명령을 solver에 재생하며 해시를 남겨요. 사용자 창·설치본은 열거나 변경하지 않아요. 현재 Rapier JS에는 관절 반력 조회가 없으므로 **반력 기반 break force/torque**, plasticity, articulation은 여전히 별도 구현 대상이에요.

강성·감쇠가 모두 0인 spring은 원래 힘을 만들지 않아야 해요. Rapier의 해당 motor가 속도를 0으로 만들던 퇴화 경우를 실제 2D/3D에서 확인하고 impulse 상한을 0으로 지정해 자유 이동을 유지해요. 계수 수정 후에는 기존 새 관절 생성 경로로 일반 spring을 다시 구성해요.
