# 195 — 표시 사이 애니메이션 포즈 계산 생략

Runtime LOD의 **표시 사이 포즈 계산 생략**을 켜면, 로컬 뼈/스프라이트 전용 그래프는 표시 프레임 사이에 트랙 보간·포즈 혼합·IK를 실행하지 않는다. 시간·파라미터 선택·Blend Space·Sync·Notify 계획은 매 프레임 진행한다. 다음 표시에서는 누적 델타를 다시 적용하지 않고 현재 계획 시각의 포즈를 계산한다. 기본값은 켜짐이며 기존 자료의 누락 필드는 기본값으로 해석한다. Runtime LOD가 없거나 외부 호출자가 명시하지 않으면 기존 전체 계산 경로다.

액터 Transform·곡선·상태 머신의 중단 포즈·슬롯·리타게팅·루트 모션·외부 포즈 이식은 보수적으로 전체 계산한다. 기존 물리·몽타주·리타게팅 원본·SpriteSkin 보호와 카메라 없는 조회도 유지한다. 표시 Hz를0으로 두거나 항상 포즈 갱신을 켜면 전체 프레임이다. 전체 계산으로 전환해도 별도로 설정한 표시 간격은 유지된다.

사람은 속성 창에서 체크하고 Undo·저장한다. AI는 동일 컴포넌트를 문서 revision/Undo 경로로 수정한다. 게임 C++·BP는 기존 공용 Components SetBool을 사용한다. 예: `hb::Components::SetBool(actor,"lod","reducePoseEvaluation",false)`. 진단은 `gameplayDebug.animationGraph.poseEvaluation`의 evaluated/skipped/lastEvaluatedFrame/reduced/trace다. 계획만 진행한 프레임의 trace는 planned-clips이며, active·weights는 계획에서 방문한 노드/클립 표시이고 평가한 포즈 가중치 전체가 아니다.

4초의30/60/120Hz에서 포즈 샘플120/240/480회가각20회로 줄고 Notify4회와 논리 시각은 같았다.256뼈60생략 프레임에서15360회 보간을 피했고 포즈 버퍼는 늘지 않았다. 실제 속성 편집/Undo/저장, 패키징 D3D·WebGPU의 C++ 전환·현재 포즈·색상 픽셀을 확인했다. [실행 근거](research/ENGINE_WORK_195.json).

대조 본문: [UE Animation Budget Allocator](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-budget-allocator-in-unreal-engine)0–227, [Unity AnimatorCullingMode](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/AnimatorCullingMode.html)237–253. 계산·표시·항상 갱신을 분리하는 판단에 사용했다. 자동 CPU-ms 예산, 포즈 보간, 레거시 Mixer/골격 수 LOD와 전체 상태 머신 계산 절감은 별도 잔여다. 전체 게임FPS·휴대폰 결과나 corpus 전체 분석 완료로 승격하지 않는다.


194–199 설치 확인: d8258c4376678b5b·명세2589파일 실행 후 SHA 일치·실제 설치 EXE의 텍스처 채널/픽셀/면·슬라이스·줌/이동·원본 불변, 포즈 계산/보간/분산 사람 편집/Undo/저장, NavMesh800삼각형과 C++/runtime.navigation·오류0/종료0. 사용자 프로필10385파일 SHA 불변·링크2/.hbproject·이전 설치/생성 캐시251725633B 정리·Versions1. 근거 USER_INSTALL_199.json.
