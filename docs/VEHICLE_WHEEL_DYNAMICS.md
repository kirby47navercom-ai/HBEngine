# 차량 바퀴 관성·차동·ABS

RaycastVehicle의 구동 방식을 엔진·변속기로 두고 바퀴 회전을 독립 관성으로 선택해요. 기존 문서는 접지 속도(kinematic)를 기본으로 유지해요. 각 휠의 inertia는 kg·m²이고, 예전 휠에 필드가 없으면 1.2예요. 기존 휠 수 범위와 차량 수 정책을 바꾸지 않아요.

독립 관성은 토크로 바퀴 각속도를 적분하고 접촉점의 차체·노면 상대 속도를 맞추는 충격량을 구해요. 질량과 접촉점 회전 관성, 잠김 제동, 지면 법선, 조향 방향, 서스펜션 하중과 이미 사용된 측면 충격량을 고려해요. 동적 지면에는 반대 충격량을 적용해요. 공중의 바퀴도 회전하며 표시·RPM이 이 각속도를 사용해요. Rapier의 서스펜션·측면 접촉 해법은 유지해요.

차동은 기존 앞/뒤 구동 배분의 두 그룹(휠 로컬 Z가 양수면 앞, 나머지는 뒤)에서 동작해요. 개방은 그룹 안에 같은 기본 토크를 나눠요. 슬립 제한은 관성 가중 각운동량을 보존하며 바퀴 속도 차이를 완화하고, differentialCoupling과 differentialMaxTorque로 응답·전달 한계를 정해요. 임의의 축별 차동 기어 연결을 모델링한 것은 아니에요.

ABS는 기본 꺼짐이에요. absMinSpeed 이상에서 제동 중 잠김 방향 슬립이 absSlipThreshold를 넘으면 서비스 브레이크 비율을 absReleaseRate로 낮추고 absReapplyRate로 복원해요. 후진도 같은 부호 규칙을 써요. 주차 브레이크는 ABS를 우회해요. 휠 진단의 slip은 접촉 충격량 적용 전 정규화한 상대 표면 속도이고, absActive와 brakeFactor를 함께 읽을 수 있어요.

제작은 기존 컴포넌트 속성·휠 편집과 공용 document.patch/컴포넌트 명령을 사용해요. 추가 순수 BP 노드 physicsVehicleWheelRPM/Slip/ABS는 hb::Physics::GetVehicleWheelRPM/GetVehicleWheelSlip/IsVehicleWheelABSActive와 같아요. index 기본값은 0, 활성 차량의 범위를 넘으면 오류예요. 비활성 상태는 0/false를 반환하며 index 자체의 형식/0..255 검증은 유지해요. C++ 조회는 해당 호출에 전달된 gameplayDebug 스냅샷을 읽고 별도 물리를 실행하지 않아요. runtime.vehicle 페이지는 필요한 휠 행만 복사해요.

신규 소스 검사15개는 에너지/운동량, 제동 한계, ABS 전후진, 움직이는 지면의 반대 충격량, 기존 편집 속성·노드·서비스·Three 표시와 실제 Rapier 주행/공중/차동/후진/수명 전환을 확인해요. 별도 현재 SDK C++ 실행은 3함수·정상3/오류2 조회를 확인해요. 실제 GUI·장치·FPS와 실제 타이어 변형/고급 접촉/손상/네트워크 예측은 별도예요.
