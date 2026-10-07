# C++ 질의 월드의 중첩 검색 제거 (044)

2026-10-07. 042/043 개수 제한 제거 뒤 많은 오브젝트의 실제 처리 비용을 확인한 후속이에요.

## 원인과 수정

`Bridge.hpp`의 공유 `engineQuery`가 `bridgeSnapshot()`의 각 행마다 전체 월드를 다시 검색했어요. 일반 오브젝트도 snapshot에 포함돼 N행×N행 ID 비교가 발생했어요. 물리 질의뿐 아니라 이 함수를 사용하는 C++ 서비스·모듈 질의 준비에도 적용되는 비용이에요.

이미 월드 동기화/Spawn이 관리하는 `bridgeStateIndices`를 사용해 해당 행을 바로 갱신해요. 인덱스 범위와 실제 행 ID를 대조하고, 오래되었거나 없는 인덱스는 기존 검색으로 처리해요. 다른 오브젝트에 값을 쓰지 않으며 사용자 C++의 현재 transform/nativeProperties와 기존 월드 순서·추가 데이터를 유지해요. 새 캐시나 별도 자료구조는 만들지 않아요.

기본 경로의 ID 검색은 O(N²)에서 O(N)이에요. 월드 복사·snapshot·패킷 생성은 여전히 O(N)이며, 비정상 인덱스가 모두 오래된 경우의 검색 비용과 IPC·Rapier·렌더링 비용을 해결했다고 표시하지 않아요. C++ 질의 패킷의 기존 4MB 검증을 제거하거나 늘리지 않았어요.

## 같은 검사 입력의 실제 컴파일 비교

`node tools/check-query-world.mjs`는 별도 NativeHost와 실제 컴파일된 C++ 함수로 5,000행을 확인해요. 함수 내부의 snapshot/merge/패킷 생성 경과시간을 측정하며 콜백은 해당 패킷을 직접 확인해요. IPC·물리 solver·GPU·FPS 측정이 아니에요. 워밍업 1회 뒤 3회만 측정해요.

| 소스 | 증거 | 준비 시간 3회(ms) |
| --- | --- | --- |
| 수정 전 SDK | `native/build/query-world-Mf6P5m/acceptance.json` | 1,949.3 / 2,001.2 / 2,021.3 |
| 수정 후 SDK | `native/build/query-world-ZgeKee/acceptance.json` | 31.2 / 33.4 / 34.6 |

두 검사는 동일 도구·입력, 같은 컴퓨터에서 순차 실행했어요. 전체 시스템 부하를 고정한 FPS 비교가 아니에요. 5,000은 검사 입력이며 제품 상한이 아니에요. 이전/이후 SDK 해시를 각각 기록했어요.

현재 C++ actor transform 변경, 첫/마지막 행 ID·순서와 사용자 추가 값 유지, 인덱스를 잘못 가리키게 하거나 지운 경우의 안전한 검색도 실제 C++로 통과했어요. 재사용 전 원본 사용자 게임이나 설치 프로필을 사용하지 않았어요.

## 관련 검증

변경 후 `tools/check-physics-capacity.mjs`: `native/build/physics-capacity-12CXiy/acceptance.json` 10검사 통과. 2D/3D 각각 10,001충돌체/전체 겹침과 600관절, 8,001타일 충돌체, 실제 재컴파일된 C++ 1,201개 RaycastAll/OverlapBox 결과를 확인해요.

변경 후 `tools/check-physics.mjs`: 156 WASM 검사와 실제 C++ 질의/이동/충돌 설정·힘/각 충격량·BP 반환 핀을 통과했어요. 검증된 오브젝트 개수 제거 042/043과 AI 묶음 편집 041을 유지해요. 이번 수정으로 전체 엔진 분석/기능/PC120·실제 모바일60 합격을 보고하지 않아요.


실제 별도 worker와 Windows에서 만든 모바일 AOT C++ 모듈 간 동기 Get/Set/Call·인자 이름 충돌·writeback·형식/수명/순환 거절 검사: `node tools/check-native-module-query.mjs --cpp` → `native/build/native-module-RzTUIe`, 통과. 실제 Spawn/Destroy/Construction·기본값·이벤트/타이머 수명·실패 복구9검사: `node tools/check-native-spawn.mjs` → `native/build/native-spawn-MXspEq/acceptance.json`, 통과. AOT 검사는 Windows 호스트에서 실행했으며 새 Android/iOS 패키지/실기기 합격으로 쓰지 않아요. 전후 기록과 현재 SDK SHA를 `native/build/query-world-result-044.json`에 대조했어요.
