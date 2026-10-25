# 천·로프의 영구 변형

Cloth(천 격자/3D 로프)와 Rope2D에 Rapier의 실제 edge plasticity를 연결해요. 기존 속성 창의 **영구 변형** 항목과 공용 componentGet/Set Float·String, AI 문서 편집을 사용해요.

- edgePlasticYield: 항복 변형률. 기본0은 비활성화예요.
- edgePlasticCreep: 항복 후 기준 길이의 변화 속도(/s). 기본1.
- edgePlasticMax: 원래 길이에 대한 누적 영구 변형률 상한. 기본1.
- edgePlasticFlow: both(인장·압축), tension, compression. 기본both.

물성 변경은 기존 body에 setMaterial을 적용해요. 입자 위치·속도·런타임 고정·강체 부착·초기화 세대를 유지하고 깨워서 다시 계산해요. 값이 같으면 물성을 재생성하지 않아요. 형상/질량 등 기존 cold 속성의 초기화 규칙은 유지해요.

실행 중 **영구 변형 복원** 버튼, BP `천 영구 변형 복원`/`2D 로프 영구 변형 복원`, C++ `hb::Physics::ResetClothPlasticity(target)`/`ResetRopePlasticity(target)`는 현재 body의 기준 변형만 복원해요. 입자 위치·속도나 고정/부착을 초기화하지 않아요. C++ 쓰기는 기존 queued 공용 명령으로 반영해요. 전체 천 초기화 명령은 별도로 유지해요.

기존 `runtime.cloth`/`runtime.rope`에 `view:"edges"`를 보내면 연결 번호·입자 쌍·현재/기준 길이·탄성/영구 변형률·굽힘 여부·직전 solver 충격량을 조회해요. 기본 particles 조회는 그대로예요. offset/limit(최대256)을 적용하며 연결 인덱스 복사는 body 세대마다 최초 조회에 한 번만 해요. 평소 프레임에 전체 변형률을 스캔하지 않아요.

이 기능은 관절 joint plasticity, 임의 스키닝 천/거리 tether/연속 가중치 paint, 절단·파괴·GPU solver를 구현했다는 뜻이 아니에요.

검사: `check-deformable-plastic-2773.mjs`의 실제 2D/3D solver에서 인장/압축 방향·변형 상한·0 비활성·복원·hot 상태 보존·페이지·공용 명령과 사람 버튼을 확인해요. `check-deformable-plastic-2774-cpp.mjs`는 현재 SDK로 두 C++ 명령을 컴파일하고 실제 solver에 재생해요. 새 GUI/렌더 픽셀·실기기·설치 검증은 없어요.
