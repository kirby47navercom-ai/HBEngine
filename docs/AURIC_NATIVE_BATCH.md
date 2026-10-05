# Auric Loop: C++ 프레임 묶음과 실제 인스턴스

2026-10-06. Auric 개선 요청의 P0-1·P0-2를 구현·검증하는 계약이에요. 게임 원본과 설치본을 유지하고 격리 프로젝트·프로필·실행 파일로 검사해요. 이 문서는 Unity·Unreal 전체 분석이나 엔진 전체 완성을 뜻하지 않아요.

## 실행 순서

같은 C++ 빌드의 직선 호출을 한 요청으로 보내고, C++ worker는 원래 순서로 실제 클래스 인스턴스를 호출해요. 첫 요청은 월드 전체, 다음 요청은 변경분을 보내요. 반환값을 BP가 읽거나 분기·중단점·엔진 명령·C++→BP 콜백이 끼면 그 경계에서 처리하고 아직 실행하지 않은 뒤쪽의 인자를 다시 계산해요. 실패 호출이나 응답을 잃은 호출을 다시 실행하지 않아요.

| 경로 | 묶음 범위와 경계 |
| --- | --- |
| Tick·BeginPlay·FixedTick | 여러 인스턴스·여러 이벤트의 직선 호출, 이벤트별 Tick 간격 유지 |
| Construction·EndPlay | 원래 순서 유지; 종료 중 한 인스턴스 오류에도 나머지 종료 처리 |
| 키 Pressed/Released·Axis·충돌·사용자 이벤트 | 이벤트 데이터와 작업 scope 유지, 콜백 뒤 미실행 인자 재평가 |
| BP 함수·매크로 | 단일 exec 입력/출력, 반환값을 사용하지 않는 terminal wrapper, 단일 기본 자료형 인자; 배열·구조체 참조와 잠재 작업은 원래 경계 |
| C++ Timer | 실제 timerCallbacks의 owner·scope·순서 유지; 취소된 scope는 건너뛰고 다른 scope는 계속 처리 |
| Input Action | 입력마다, 프레임마다 owner별로 샘플링; 함수·매크로를 감싼 호출 포함. Hold/Release/Context 변경과 나중 owner의 상태를 앞당기지 않음 |
| 계산 입력 | 동일 공용 실행기로 수학·벡터·문자열·변환 입력 계산; RNG·월드 조회·C++ 반환 의존성은 원래 경계 |

## Input Action의 C++ 상태

새 worker의 `nativeInputBatch: 1`에서만 호출별 `actionUpdates`를 보내요. 실행 직전에 그 owner의 샘플 결과를 C++ 입력에 반영하므로, 앞 owner의 새 상태는 보이고 뒤 owner는 이전 상태로 남아요. 호출이 없는 owner의 입력도 다음 호출에 반영해요. VM 입력 맵은 실제로 실행된 prefix에서만 커밋해요. 이전 worker는 owner별 요청으로 실행해 호환성을 유지해요.

호출당 변경 배열과 전체 고유 owner/path는 4096개 이하예요. 알려진 owner·자료형·상태·시간·이벤트·중복 키를 검사하고 일반 단일 호출에는 actionUpdates를 허용하지 않아요. 다른 C++ 모듈을 동기 호출할 때도 현재 입력을 전달해요. Action 조회에서 전체 배열의 불필요한 JSON 복사를 없앴어요.

## C++ 클래스 객체

같은 빌드의 인스턴스는 해당 worker의 실제 클래스 객체여서 `dynamic_cast`와 속성·함수 접근이 가능해요. 풀 반환·재사용 동안 그 인스턴스 객체를 유지하고, 변경 속성을 BP 월드에 반영해요. 다른 빌드는 `hb::Native::GetFloat/SetFloat/Call`의 typed 질의 경로를 사용해요. readonly·자료형·수명·모듈 순환·질의 개수/깊이 제한을 검사해요.

## 검증

`tools/check-native-chain.mjs --cpp`는 50개 owner의 함수·매크로·여러 Tick·Timer, 취소 scope, 콜백/실패/중단점, 계산 입력과 RNG 경계를 원래 실행의 값·변수·trace·stack·depth와 대조해요. `tools/check-native-action-batch.mjs --cpp`는 100개 호출→1요청, 앞/현재/뒤 owner 상태·경과 시간·이벤트, Pressed/Released/Hold, 빈 owner, Context 변경, 늦은 자료형 오류, 함수·매크로와 이전 worker를 대조해요. `tools/check-native-module-query.mjs --cpp`는 별도 PC worker와 모바일 AOT에서 현재 입력 전달과 실제 클래스 접근을 검사해요.

실측은 격리 Auric 장면에서 C++ Tick 인스턴스 50개, 600프레임 ABBA를 사용해요. 편집기·배포 Player 추가 비용 2ms, headless 기본 대비 1.5배, Android 30fps를 각각 검사해요. 한 경로의 통과를 다른 경로의 통과로 계산하지 않아요. 최근 측정과 커밋은 CODEX_HANDOFF/DEBUG_HANDOFF 및 원본 요청 문서의 진행 기록에 연결해요.

원본 checker의 보스 기록 실패 `auric-original-5kHN33`는 보존했어요. 검증 도중 Bridge.hpp 변경 후 장면 전환 worker가 약 12초 동안 재컴파일됐고, 원본 게임의 10초 TEMP handoff가 만료되는 메커니즘을 따로 재현했어요. 따로 고정한 엔진 소스·프로필에서 원본 checker를 변경 없이 실행하며 9개 결과 수치와 프로젝트 파일 SHA를 비교해요. 게임의 TEMP 우회 자체는 P0-5에서 GameInstance로 교체할 대상으로 남아요.
