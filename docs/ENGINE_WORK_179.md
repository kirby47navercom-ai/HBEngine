# 179 — 거리 기반 포즈·충돌 LOD

**Runtime LOD** 컴포넌트로 근거리/중거리/원거리와 경계 여유, 강제 단계, 중·원거리 포즈 Hz를 편집한다. 0Hz는 전체 프레임이다. 2D 스프라이트의 자동 기준은 XY여서 카메라 Z 깊이가 화면상 거리를 부풀리지 않는다. 일반 모델/빌보드는 XYZ를 쓰며 XY/XZ/XYZ를 직접 고를 수도 있다. 별도 총 객체 상한을 추가하지 않는다.

AnimationGraph의 시간·이벤트·곡선·액터 루트 변환은 매 프레임 진행하고 골격 바인딩 쓰기와 스프라이트 프레임 표시만 선택한 간격으로 갱신한다. 루트 모션·몽타주·리타게팅 원본·물리/스킨 연계는 항상 포즈를 갱신한다. 카메라 없는 C++ 헤드리스 조회도 포즈를 갱신하며 전달받은 충돌 단계를 유지한다. 기존 일반 컴포넌트 편집/문서 revision/Undo와 C++/BP Components 수치 함수를 공유한다.

World Collision에서 **실행 LOD 거리 단계**를 명시적으로 고르면 거리 단계에 따라 검증된 LOD 메시 충돌 청크를 교체한다. 표시 LOD와는 별도이며 고정 충돌이 기본이다. 동적 강체는 고정 충돌을 유지한다. 생성·재사용·삭제·비활성·종료와 비동기 준비 취소를 처리한다. 상위 LOD 자산의 단계 수가 적으면 마지막 단계로 제한하며 중첩 LOD는 자체 고정 충돌 설정을 사용한다.

공유 충돌 청크 캐시는 기본32MiB의 추정 예산으로 오래된 항목부터 정리한다. 캐시를 비워도 현재 액터의 형상 배열은 유효하다. 새 의존성·자동 GPU 읽기0. AI의 runtime.lod는 단계/표시 스케줄과 충돌 캐시 추정치/예산을 반환한다. C++ 예시는 hb::Components::SetFloat(actor,"RuntimeLOD","forcedLevel",2)이며 -1은 자동이다. 충돌 형상 변경은 다음 물리 동기화에서 적용한다.

[CPU10군·Win32 사람 편집/Undo·DirectX 출시/WebGPU 게임 근거](research/ENGINE_WORK_179.json). 30/60/120Hz의4초에서5Hz 포즈 쓰기가각20회였고, 실제 게임에서 포즈·2D 스프라이트 표시와 진행 시간, 보호된 루트 모션, C++ 단계 변경 후 대상 RaycastAll의 높이0.5→10.5를 확인했다. 이 결과를 게임 FPS나 실제 휴대폰 성능으로 계산하지 않는다.

대조한 본문: [UE5.8 Animation Budget Allocator](https://dev.epicgames.com/documentation/unreal-engine/animation-budget-allocator-in-unreal-engine)0–265의 등록·중요도·AlwaysTick·업데이트 간격/예산 구분, [Unity6000.7 Animator](https://docs.unity.com/en-us/engine/6000.7/manual/animation-section/animation-mecanim/class-animator)164–210의 시간/물리·포즈 쓰기 구분, [Unity6000.0 CullingGroup](https://docs.unity.com/en-us/engine/6000.0/manual/cameras/occlusion-culling/culling-group-api/api)182–208의 거리 구간/카메라 참조. 연결 API·플러그인 구현·미디어와 전체 corpus는 읽은 것으로 세지 않는다.

전체 애니메이션 계산 자체의 절감, 레거시 골격 Mixer·골격 수 LOD·보간·시야 가림·CPU-ms 예산 할당, 고품질 단순화/교차 페이드는 별도로 남긴다. 캐시 추정 예산과 실제 프로세스 RAM/VRAM 측정도 구분한다.


179 설치 확인: f95666ae3ee3a41f·명세2458파일 실행 후 SHA 일치·격리 설치 EXE의 실행 LOD 포즈 Hz·충돌 선택·사람 편집/Undo·오류0/종료0. 사용자 프로필10385파일 전후 SHA 일치. 바로가기/.hbproject 연결 확인, 이전 설치173816469바이트 정리, Versions1. 설치 근거 docs/research/USER_INSTALL_179.json.
