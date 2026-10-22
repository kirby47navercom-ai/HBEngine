# C++ 진입 파일과 include 변경

헤더·CPP 내용이 같아도 폴더마다 상대 include가 다르면 별개의 C++ 모듈이에요. 빌드 요청에 `headerPath`와 `sourcePath`를 함께 전달해 실제 진입 파일을 선택해요. 메타데이터 파서·컴파일 단위·에디터 실행 캐시·PC/모바일 패키징·사전 빌드 모듈 조회가 같은 경로를 사용해요.

`Source/A/Entry.h`와 `Source/B/Entry.h`가 모두 `"Value.hpp"`를 포함하는 경우, A와 B의 값이 섞이지 않아요. 내용만 보고 첫 파일을 선택하던 오류와 헤더·CPP 텍스트만으로 두 모듈을 합치던 오류를 수정했어요. 경로의 대소문자 별칭은 같은 키로 취급하고, 경로와 실제 원문이 맞지 않으면 빌드를 거절해요.

이전의 두 인자 모듈 키는 경로를 전달하지 않을 때 유지해요. 원문으로 진입 파일을 하나만 판별할 수 있으면 기존 도구 호출도 동작해요. 같은 원문이 여러 진입 파일에 있으면 추측하지 않고 두 경로를 요구해요. 새 PC 패키지는 `legacySignature`도 기록해서 예전 실행 요청을 대상이 하나일 때 연결해요. 모호한 요청이나 잘못 지정한 새 경로를 다른 모듈로 대체하지 않아요. 모바일 사전 빌드 조회도 같은 선택·이전 요청 호환 규칙을 사용해요.

## 에디터의 include 변경 확인

기존 문서 폴링에서 주 헤더와 CPP의 프로젝트 내부 quote include를 함께 확인해요. 리플렉션 선언이 없는 CPP 전용 헤더도 빌드 무효화 대상이에요. 아직 없지만 먼저 검색하는 후보 경로도 관찰하므로, 더 가까운 폴더에 새 헤더를 만들거나 삭제하는 경우를 잡아요. 읽는 동안 사람이 BP를 편집하면 그 준비 결과로 문서를 덮어쓰지 않아요. authored BP JSON을 include 감시 정보로 다시 쓰지 않아요.

한 번의 확인에서 중복 파일 읽기를 합치고, 다음 확인까지 경로만 보관해요. 별도 타이머·감시 데몬·전역 원문 캐시를 추가하지 않아요. 기존 Source512파일/개별500KB/합계8MiB 범위와 후보4096경로 검사를 유지해요. 크기 오류를 ‘찾지 못한 include’로 숨겨서 일부 결과를 성공으로 돌려주지 않아요.

이 확인은 프로젝트 내부의 문자열로 쓴 quote include를 대상으로 해요. 임의 전처리 매크로·조건부 활성 분기·시스템 include·생성 파일 전체의 컴파일러 의존성 추적과 실행 중 일반 코드 이관은 별도예요. SDK 헤더를 변경 감시 대상으로 전부 펼치지 않아요.

## 소유자

- `prototype/native-entry.js`: 경로 검증과 모듈 키 입력
- `tools/native-project.mjs`: 실제 진입 파일 선택과 컴파일 단위
- `tools/native-source.mjs`: 해당 진입 헤더 기준 메타데이터와 작업자 생성
- `prototype/native-source-watch.js`, `native-header-files.js`: include 원문 읽기·선행 후보·기존 폴링 연결
- `tools/build-game.mjs`, `build-mobile.mjs`, `player-server.mjs`, `prototype/mobile-player.js`: 패키징과 모듈 조회

빠른 위치 탐색은 `hb context C++ --symbol nativeEntryFiles`, `--symbol nativeModuleKey`, `--symbol readNativeSourceDependencies`를 사용해요. 진입 선택·쿠킹·조회 검증과 실제 C++/DirectX 게임 실행, 실제 모바일 기기 실행은 각각 구분해서 기록해요.
