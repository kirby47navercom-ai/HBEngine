# 몽타주 교체의 포즈 혼합 (045)

2026-10-07. `ANIMATION_MONTAGE_SLOTS.md`에 남겨 두었던 같은 그룹 교체의 outgoing pose 혼합을 구현해요. 기존 Stop 혼합과 별개의 누적 요구예요.

## 읽고 대조한 근거

- [Epic 5.8 Montage_Play](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UAnimInstance/Montage_Play): 자체 Description·선언·인자(0–30행). 재생/실패 반환과 재생 속도·시작 시간·전체 중단 인자를 구분해요.
- [Epic 5.8 Montage_Stop](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UAnimInstance/Montage_Stop): 자체 Description·선언(0–25행). 지정 시간/에셋 BlendOut과 전체 중단을 대조해요.
- [Unity 6000.0 Animator.CrossFade](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Animator.CrossFade.html): 자체 선언·인자·Description·추가 설명(229–291행). 상태 전환, 레이어와 정규화 시간, 초 단위 API의 구분을 확인해요.

원문 HTTP 응답·상태·SHA-256·읽기 범위는 `native/build/montage-replacement-docs-045/manifest.json`에 있어요. 이 세 API의 본문은 엔진 내부 구현, 교체 중 클립/Notify 평가의 정확한 순서, 전체 문서·연결 API를 제공하지 않아요. HBEngine의 아래 계약을 Epic/Unity 내부 코드와 동일하다고 표현하지 않아요. 앞선 슬롯/몽타주 편집기·마스크 분석은 기존 슬롯 문서와 함께 사용해요.

## 실행·제작 계약

같은 그룹의 새 Play는 이전 인스턴스를 즉시 버리지 않고 **교체 시점의 포즈·클립 시간을 고정**해 이전 에셋의 `blendOut` 시간/곡선으로 가중치를 줄여요. 새 인스턴스는 자신의 `blendIn` 시간/곡선으로 시작해요. 두 가중치 합이 1보다 작으면 기준 포즈가 나머지를 담당하고, 1을 넘으면 기여도를 정규화해요. 이전 BlendOut이 0이거나 현재 가중치가 0이면 기존 즉시 교체를 유지해요. 이미 중단 중인 동작의 남은 시간을 늘리지 않아요.

현재 인스턴스는 그룹마다 하나예요. 빠른 A→B→C 교체는 아직 기여하는 이전 인스턴스들을 각자의 종료 시점까지 유지해요. 그룹·슬롯은 그대로 구분하고, 새 몽타주에 없는 이전 슬롯도 남은 가중치로 페이드해요. 전신 단일 슬롯은 그래프 없이도 동작하고 여러 슬롯/그룹은 기존 연결된 Animation Graph를 사용해요. 벡터/스칼라 포즈와 Quaternion slerp는 기존 컴파일된 포즈 믹서를 재사용해요. 2D 스프라이트는 기존 최대 기여도 프레임 선택 정책을 유지하며 픽셀 자체를 교차 혼합하지 않아요.

교체 시작에서 이전 Notify State의 범위·BP 지연/타이머·네이티브 타이머를 정리해요. 이후 이전 클립의 Notify를 진행하지 않아요. 필요한 BlendOut 콜백을 한 번 전달하고, 포즈의 기여가 끝난 뒤 Interrupted→Ended를 `reason=replaced`로 전달해요. 다른 그룹의 알림/재생을 중단하지 않아요. Stop/StopGroup은 해당 명령 시점의 이전/현재 인스턴스를 모두 정리하고, 콜백이 나중에 만든 새 인스턴스는 보존해요. 콜백 실패 뒤에도 나머지 정리와 Ended를 시도해요. 비활성·오브젝트 해제·월드 종료는 페이드를 기다리지 않아요.

새 에셋·슬롯·바인딩·혼합 버퍼를 검증한 뒤 이전 인스턴스를 교체해요. 불법 에셋/누락 슬롯/혼합 버퍼 준비 실패가 현재 및 이전 재생 인스턴스를 제거하지 않아요. 공유 그래프에서 외부 프로그램의 바인딩 개수가 변하면 기존 연결표를 갱신해 누락된 뼈를 기준 포즈로 잘못 덮어쓰지 않아요.

포즈 배열은 혼합 준비 때 할당하고 프레임마다 재사용해요. 페이드 종료에서 이전 프로그램/바인딩/버퍼를 해제해요. 전체 그래프의 기존 바인딩·값·64MiB 포즈 메모리 검증은 유지해요. 작은 JS 상태/스프라이트 맵의 프레임 할당까지 없다고 주장하지 않아요. 새 임의 오브젝트 개수 제한이나 의존성을 추가하지 않아요.

## 사람·AI·C++ 공용 경로

기존 `hb::Montage::Play`, BP Play Montage가 같은 실행기를 사용해요. 기존 에셋의 Blend In/Out/Curve로 설정하므로 중복 함수/노드를 추가하지 않아요. `gameplayDebug.montageGroups`는 현재 그룹, `montageTransitions`는 교체 혼합 중인 개별 인스턴스를 제공해요. `instance` 실행 일련번호와 `retiring`으로 같은 에셋의 연속 재생도 구분해요. 현재 인스턴스가 없고 이전 인스턴스만 중단 중이면 기존 그룹 조회에 그 상태를 유지해요.

몽타주 창은 현재/이전 인스턴스를 모두 선택·관찰하고 `교체 혼합`과 실제 가중치를 표시해요. 사람과 AI 모두 기존 실행 잠금·revision·document/runtime API를 사용해요. 제작 재생선/미리보기는 실행 시간으로 덮어쓰지 않아요.

## 검증

`npm run test:montage-replacement`: 실제 BlueprintRuntime/engineOperations/가져온 클립 포즈 경로에서 이전 위치·새 위치·중간 Quaternion, 일시정지 중 교체, 알림 범위 정리, 빠른 연속 교체, 포즈 메모리 안정·해제, 잘못된 슬롯/버퍼 준비 실패의 재생 보존, 여러 슬롯, 그래프 없는 전신, 2D 스프라이트, Stop 콜백 실패/재진입을 확인해요. 기존 몽타주 슬롯·Notify Window 검사도 통과해요.

실제 별도 Editor/내보낸 Player 검사의 증거와 설치 결과는 아래 진행 기록에 추가해요. 사용자 창/게임/프로필을 검사 입력으로 사용하지 않아요. Root Motion·Blend Profile·시간 보정·공유 Skeleton/Sequencer 연결은 이 변경의 구현 항목과 구분해 후속 목록에 유지해요.

## 실제 창 검증 — 2026-10-07

- 별도 Editor: `native/build/animation-montage-editor-otTWhz/acceptance.json`, 내보낸 release Player: `native/build/animation-montage-player-SIAnz3/acceptance.json`. 둘 다 실제 컴파일된 사용자 C++ Play→이전/현재 인스턴스·중간 뼈 포즈→Notify 범위/네이티브 타이머 정리→Interrupted/Ended BP에서 C++ 호출→BP Stop을 통과했어요. 종료 코드0·오류0·개인 검증 프로젝트 원본 보존·소유 서버 종료를 확인했어요. 실행 source5개와 검증 fixture의 SHA를 현재 파일과 다시 대조했어요.
- Editor는 이전 몽타주 문서를 계속 열어 둔 채 `교체 혼합` 표시/가중치를 확인하고 `montage-replacement.png`를 남겼어요. 각 runtime JSON에 실제 뼈/인스턴스/사용자 C++ 속성을 남겼어요. `--replacement`는 이번 동작을 집중 검사하며 변경하지 않은 모든 제작 조작을 반복 통과한 것으로 표시하지 않아요.
- 첫 fixture는 Source 파일보다 BP를 먼저 쓴 순서로 검증 단계에서 실패(1dGWmr)했어요. Source→BP로 고쳤어요. 오래된 광범위 검사(xX4x27)의 상태 표시 확인과 첫2초 교체 검사(43r2MO)는 시간 초과로 실패했어요. 두 실패를 보존하고, 활성 문서의 표시를 선택하며 외부 C++/검사 왕복 중 상태를 관찰할 수 있는10초짜리 검증 에셋으로 집중 검사했어요. 짧은0.4초 동작과 정확한 혼합 값은 코어 검사로 별도 통과해요. 제품의 혼합 시간을 늘리거나 실패를 성공으로 덮어쓰지 않았어요.
- 이번 증거는 Windows 실제 Editor/Player예요. 새 Android/iOS 패키지·실기기·전체FPS·전체 조사 합격을 뜻하지 않아요.
