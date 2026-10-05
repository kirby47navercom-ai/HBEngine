# 혼합 샘플 알림 정책 · 2026-10-05

[Epic5.8 Blend Spaces](https://dev.epicgames.com/documentation/en-us/unreal-engine/blend-spaces-in-unreal-engine)의 Asset Details119–122에서 All Animations/Highest Weighted Animation/None을 다시 대조했어요. [두 축 혼합](ANIMATION_BLEND_SPACE.md)의 본문/API 읽기 경계는 그대로이며 이 후속을 전체 문서/API 또는 몽타주 알림 완료로 세지 않아요.

1D/2D 혼합 노드의 `notifyMode`는 `all`, `highest`, `none`이에요. 예전 파일에서 생략하면 all이고 잘못된 문자열/자료형/null은 거절해요. 사람의 샘플 알림 선택·Undo/Redo·저장·독립 미리보기·실행 잠금과 AI document.patch/revision/dryRun는 같은 필드와 검증을 사용해요. schema는 실제 선택과 중첩/공유 계약을 제공해요.

포즈 기여도/시계/동기화와 알림 허용 기여도를 분리해요. all은 기존과 같고 highest는 현재 가장 큰 기여도의 **샘플 가지**만 허용해요. 동률은 2D의 저장된 샘플 순서, 1D의 낮은 임계값 쪽이에요. none은 해당 가지의 클립 알림을 막아요. 하위 혼합 정책도 함께 적용하며 상태 Enter/Exit 같은 클립 밖 이벤트를 막지 않아요. 공유 클립이 다른 허용 경로에도 연결되면 그 경로의 기여도는 유지하고 한 번의 시계/이벤트로 합쳐요. 최소 가중치와 payload의 weight는 허용된 경로의 합이며 전체 포즈 합으로 필터를 우회하지 않아요. Sync 리더/팔로워 필터는 이 이후에도 적용돼요.

선택에서 빠진 활성 구간은 filtered End를 내고 새로 허용된 구간은 현재 시간에서 Begin/Tick을 내요. 이미 지난 단일 알림을 소급해서 반복하지 않아요. 중지/교체/풀 반환/파괴/세계 정리와 전달되지 않은 Begin 취소는 기존 구간 수명 계약을 사용해요. `syncGroups[].participants[].notifyWeight`는 허용 기여도를, 2D `blendSpaces[].notifyMode/notifyInput`은 정책/선택 입력을 보여요. 이 값은 실행 상태이며 저장 에셋을 덮지 않아요.

all만 있는 그래프는 추가 정책 Map을 만들지 않아요. highest/none이 있는 그래프만 각 경로의 허용 기여도를 계획해요. 동일 클립/포즈와 Float 입력용 BP/C++를 재사용하고 새 알림 엔진이나 C++ 전용 필터를 따로 만들지 않아요.

- `test:animation-notify-policy`: 1D/2D3개 모드·동률·최소 가중치·구간의 filtered End/새 Begin·중첩/공유 DAG·포즈/리더/시계 보존·예전 생략 필드/불법 필드·all의 추가 Map 생략을 검사해요.
- 실제 Editor `animation-blend-notify-editor-R6GRXh`, release Player `animation-blend-notify-player-IZGIm1`: 처음 최고 샘플0의 인자 알림→BP→사용자 C++, C++/BP 두 축 변경 후 최고 샘플2의 알림/구간→사용자 C++, C++ Stop의 matching End/stopped·원본/exit0/소유 서버 정리가 통과했어요. Editor는 정책 선택/Undo와 기존 차트 조작/AI/미리보기/변하지 않은 DOM/실행 잠금도 검사했어요. 마지막 null 검증/불필요한 all 승자 계산 제거는 코어로 보강했으며 실제 fixture highest 경로는 유지해요.
- 포즈/혼합/상태/동기화/구간 알림·main/API/integration/runtime 및 실제 C++ 시작 위치/첫 HUD 회귀를 함께 검사해요. 정책 밖 기존 발동/콜백 취소 계약을 보존해요.
- `animation-notify-policy-cost-QiFMpW`: Actor1/클립3/단일 알림 각1, 준비100/5×1000Tick의 CPU 중앙은 all .0096086ms, highest .0082983ms, none .0089818ms, 포즈120bytes예요. 정책마다 전달/정리하는 작업과 JIT가 달라 순수 정책 비용 비교/우열이 아니에요. 전체 FPS/메모리/모바일·탄막/발열 검증으로 확대하지 않아요.

알림 정책을 추가한 뒤에도 격자/선호 삼각형·추가 축 보정/가중치 속도/뼈별 혼합·좌표 자동 계산/AimOffset과 몽타주 슬롯/동시 재생·공유 Sequence/Skeleton 메타데이터 등 남은 세부를 계속 구현해요. 다른 전체2D/렌더/월드/게임/C++/AI/UI/오디오/모바일/배포/가벼움 요구를 축소하지 않아요. 사용자 설치본/프로필/게임 원본/열린 창은 변경하지 않았어요.
