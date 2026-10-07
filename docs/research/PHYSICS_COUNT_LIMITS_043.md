# 물리 개수 제한과 전체 질의 결과 누락 제거 (043)

2026-10-07. 오브젝트 개수 제한 제거 042의 후속이에요. 숫자를 늘리는 대신 공유 물리 월드의 고정 개수 검사를 제거했어요.

## 근거와 재현

- Unity 6000.0 [Physics.RaycastAll](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Physics.RaycastAll.html): 두 선언, 인자, 반환, 설명, 예제, 주의사항을 읽었어요. 모든 교차 결과를 반환하며 순서는 정의하지 않아요. 시작점이 충돌체 내부일 때의 주의사항도 있어요.
- Unity 6000.0 [Physics2D.OverlapBoxAll](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Physics2D.OverlapBoxAll.html): 선언, 인자, 반환, 설명을 읽었어요. 영역에 들어오는 모든 충돌체를 반환하며 Z순 정렬과 배열 할당 비용을 설명해요.
- 원문/본문/해시: `native/build/physics-capacity-research-043/manifest.json`. 이번 두 메서드의 자체 본문 읽기예요. 링크된 NonAlloc/다른 API 구현이나 전체 문서 분석 완료로 계산하지 않아요. 두 공식 API를 누적 조사 대상으로 기록하며 전체 원장 검증 승격으로 계산하지 않아요.
- 수정 전 영구 검사에서 실제 Rapier 2D RaycastAll이 1,201개 중 1,000개만 반환하는 실패를 재현했어요.

## 변경

- `physics-world.js`: 차원별 충돌체 8,000·관절 512 검사, C++ 질의 스냅숏 총 충돌체 8,000·타일 충돌체 8,000 검사를 제거했어요. 계약의 해당 개수는 `null`이에요.
- RaycastAll/OverlapSphere/OverlapBox의 1,000개 절단을 제거했어요. HBEngine의 기존 거리/ID순 레이 결과, 오브젝트 ID 중복 제거·정렬, 레이어·트리거·ignore 필터를 유지해요. 단일 Raycast는 첫 결과만 변환해 전체 반환 배열을 만들지 않아요.
- `native-physics-query.js`: 복사한 스냅숏을 가변 인자로 펼치는 대신 반복해 추가해요. JavaScript 호출 인자 상한이 장면 개수 상한으로 바뀌지 않게 해요. 먼저 복사하고 기존 배열을 교체해 물리 월드의 배열 참조를 유지해요.
- ID·형상·변환·차원·레이어·경로 검증은 유지해요. C++ 호출당 질의 128회/질의 패킷 4MB, 개별 오브젝트 컴포넌트 100개, 부모 깊이 64와 도형 좌표/크기 검증은 이번 변경 대상이 아니에요. 통신 용량을 넘는 큰 C++ 질의는 명시적인 오류로 거절해요.
- 042의 객체/저장/프리팹/Spawn 개수 제한 제거와 041의 AI 묶음 저장/Undo를 유지해요.

## 최종 소스 검증

`node tools/check-physics-capacity.mjs` → `native/build/physics-capacity-BRW5lX/acceptance.json`, 10검사 통과. 실제 두 변경 파일 SHA를 기록했어요.

- 2D/3D 각각 1,201개 실제 레이 교차 전부 반환·정렬, 단일 최근접·ignore·레이어 확인.
- 2D/3D 각각 10,001개 실제 WASM 충돌체 생성, solver 한 프레임, 전체 영역 검사로 10,001개 모두 확인. 마지막 충돌체 비활성화 시 10,000개 확인.
- 2D/3D 각각 관절 600개 실제 생성과 solver 한 프레임.
- 한 오브젝트의 타일 충돌체 8,001개 생성·질의, 오브젝트 ID 중복 제거.
- 잘못된 형상·중복 ID 거절. C++ 질의 스냅숏 1,201개 결과와 잘못된 형상 거절.
- 실제 컴파일한 C++ `Physics::RaycastAll`/`Physics::OverlapBox`에서 각각 1,201개 확인.

`node tools/check-physics.mjs`: 기존 2D/3D WASM 검사 156개와 실제 C++ 동기 질의/반환 배열·이동/충돌 변경·힘/각충격량·BP 분할 핀 통과. 최종 변경 뒤 실행했어요.

10,001/8,001/1,201/600은 검사 입력이고 새 제품 상한이 아니에요. 준비·한 프레임·질의의 합산 측정이며 FPS/최대 수용량/모바일 실기기 성능 증명이 아니에요. 기존 사용자창·프로필·원본 게임과 기존 장기 검사에는 접근하거나 변화를 주지 않았어요. 새 모바일 패키지는 이 검사로 검증하지 않아요.


- 2026-10-07 사용자 설치 갱신(043/041/042 유지): sourceec694c1/bundle533b2b30a45cf205, C:\Users\kirby\HBEngine\Versions\533b2b30a45cf205\HBEngine.exe. 1794파일/9변경SHA와 최종 물리검사2productionSHA가 일치해요. 이전b9a10dd421646ed4 설치와 사용자창·프로필을 보존했고 바로가기/HKCU 프로젝트 연결이 새경로와 같아요. 다음 실행부터 적용돼요. 증거 native/build/physics-capacity-user-install-043.json. 새 창/장기 검사를 반복하거나 새 모바일 패키지를 빌드하지 않았어요.
