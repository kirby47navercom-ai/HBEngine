# 입력 액션·스프라이트 분할·실행 중 타일맵 구현

2026-10-05 후속: [2D 정렬·마스크·등각 타일과 단축키](2D_RENDERING_SHORTCUTS.md)를 실제 저작/렌더/충돌/BP/C++에 연결했어요. 아래 이력의 isometric/sorting group/layer/sprite mask 전체를 미구현으로 읽지 않아요. 지원한 범위와 남은 Z as Y/outline/provider/전용 Light2D 등은 새 계약에서 구분해요. 줌/DPI에 맞춰 격자 비트맵을 다시 그리고 논리 포인터 좌표를 유지하며, 최대 2048px 비트맵 한도를 유지해요.

2026-10-04. 누적 전체 엔진 제작 요구를 유지한 후속 구현이에요. 이 파일은 이번에 연결하고 검증한 세부 계약을 기록하며, 전체 문서/API 분석이나 전체 기능 구현 완료를 뜻하지 않아요. 이전 corpus manifest와 원문/hash 분석 기록은 변경하지 않아요.

## 대조한 근거

- [Unreal Enhanced Input](https://dev.epicgames.com/documentation/en-us/unreal-engine/enhanced-input-in-unreal-engine): 액션 값, 트리거 상태, 컨텍스트 우선순위/전환, 모디파이어와 조합 입력을 대조했어요.
- [Unity Sprite Editor](https://docs.unity3d.com/6000.0/Documentation/Manual/sprite/sprite-editor/use-editor.html), [자동 분할의 Smart/Safe 설명](https://docs.unity3d.com/cn/6000.0/Manual/sprite/sprite-editor/automatic-slicing.html): 분할 미리 보기/적용, 빈 영역과 기존 분할 처리를 대조했어요. 저장된 연구 009의 해당 분석을 연결했어요.
- [Unity SetTilesBlock](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Tilemaps.Tilemap.SetTilesBlock.html), [ProcessTilemapChanges](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Tilemaps.TilemapCollider2D.ProcessTilemapChanges.html): 실행 중 변경과 충돌 반영을 구별했어요. 저장된 연구 009의 충돌 변경 계약을 연결했어요.
- 연구 010의 no-op/Undo 문제를 반영해 공용 authoring 자동화에서 데이터가 같으면 빈 Undo 항목과 dirty 변경을 만들지 않아요.

아래 시간·좌표·분할 ID·적용 순서는 HBEngine의 명시적인 계약이에요. 두 엔진의 소스 구현 전체나 모든 트리거 조합과 동일하다고 주장하지 않아요.

## 입력 제작·실행

기존 JSON은 그대로 읽어요. 새로운 설정은 선택 필드예요.

| 설정 | 동작 |
| --- | --- |
| pressed / held / released | 기존 누르기 / 프레임 유지 / 떼기 계약 유지 |
| hold | holdTime 도달 후 발동, oneShot 설정 |
| holdRelease | holdTime 이상 유지한 뒤 떼면 발동 |
| tap | tapTime 안에 눌렀다 떼기 |
| doubleTap | tapTime 안의 두 탭, tapInterval 이내 |
| pulse | 처음 누를 때와 pulseInterval 주기로 발동 |
| chordAction | 다른 액션이 발동 조건을 충족한 동안 조합 허용 |
| modifiers | 순서대로 scale / negate / swizzle / normalize / exponential |

시작 Started, 평가 중 Ongoing, 성공 Triggered, 종료 Completed, 실패/컨텍스트 제거 Canceled와 elapsed 출력이 이벤트 노드에 있어요. 시간은 게임 프레임으로 진행해요. 일시 정지·종료·입력 해제 시 상태를 정리해요. 이벤트 플래그는 해당 게임 프레임의 Tick/C++ 호출 동안 읽을 수 있고 프레임 끝에 비워져요. oneShot이 성공한 현재 눌림의 조합 자격은 떼기까지 유지해요. 이 지속 자격은 HBEngine 계약이에요.

높은 우선순위 컨텍스트가 소비한 키로 하위 액션을 발동시키지 않아요. 컨텍스트 제거/소비로 평가가 끊기면 Tap/Released가 성공한 것으로 처리하지 않아요. 조합 순환은 거부해요.

Blueprint와 사용자 C++ 공용:

- hb::Input::GetActionValue(target, action): bool/float는 X, vec2는 XY, vec3는 XYZ.
- GetActionState / HasActionEvent / GetActionElapsed.
- AddMappingContext / RemoveMappingContext. 기존 액션 상태와 키 입력을 공용 평가기에 연결해요. C++의 변경 명령은 호출 후 브리지 적용 시 반영돼요.

UI에서는 트리거별 시간·단발 여부·조합 액션을 편집하고 모디파이어의 축/순서/지수와 처리 순서를 바꿔요. GET /api/schema도 실제 정의와 기본 시간을 제공해요.

## 스프라이트 시트

셀 크기, 열·행 개수, 투명도 자동 분할과 여백·간격·빈 셀 유지·알파 기준을 제공해요. 자동 분할은 알파를 만족하는 4방향 연결 영역의 경계를 찾아요. 알파 분석은 16,777,216 픽셀 이하, 분할은 1,000개까지예요.

미리 보기와 적용/되돌리기를 구별해요. 적용은 기존 문서 Undo에 들어가요. 선택 분할에는 이름·rect·pivot·border 편집과 투명 여백 자르기가 있어요. 이미지 rect는 좌상단 픽셀, pivot은 좌하단 정규화, border는 left/bottom/right/top이에요.

- Smart: 겹친 면적이 큰 기존 분할에 위치/크기를 반영하고 ID·이름·pivot·border·출력 에셋 참조를 유지해요. 같은 적용에서 기존 ID를 한 번만 갱신해요. 같은 면적이면 기존 목록 순서로 결정해요.
- Safe: 기존 분할을 보존하고 겹치는 새 분할을 제외해요.
- 교체: 기존 분할을 새 ID 목록으로 바꿔요. 제거된 ID를 참조하는 자식은 오류로 알려요.

에셋 만들기는 일반 .hbsprite.json을 생성해요. 자식의 sheet/sliceId가 원본 시트의 현재 분할을 해석하므로 Smart로 다시 잘라도 애니메이션의 자식 파일 경로를 바꿀 필요가 없어요. 원본에 기록한 asset 경로로 이미 출력한 자식을 재사용해요. 다른 파일의 ID를 가리키면 덮어쓰지 않고 거부해요. 필요하면 자식 편집기에서 독립 스프라이트로 전환해요.

파일 이동·이름 변경·의존성 조회·패키지 수집도 sheet/chordAction/context 참조를 알아요. 실제 렌더러와 headless의 자식 스프라이트 해석을 일치시켜요.

AI sprite.slice / sprite.trim은 동일한 알고리즘과 에셋 검증·expectedRevision·dryRun·Undo를 사용해요. 픽셀을 읽는 동안 문서가 변경되면 적용 전에 revision을 다시 검사해요. 분할 고유 ID를 화면 좌표 대신 사용해요.

## 실행 중 타일맵

원본 에셋을 깊이 복사한 runtimeTilemap을 준비해요. Construction 전에 준비하므로 C++도 처음부터 같은 데이터를 읽어요. 원본 파일을 Play 변경으로 덮어쓰지 않아요.

hb::Tilemaps 및 같은 Blueprint 노드:

- GetTile / HasTile / SetTile: 빈 셀은 -1, SetTile의 -1은 삭제.
- BoxFill / FloodFill / ClearTiles / SetLayerVisible.
- WorldToCell / GetCellCenterWorld: 오브젝트·부모의 이동/회전/크기를 포함. 셀 정수 좌표, X 오른쪽/Y 아래쪽. 중심 좌표는 로컬 (x+.5, -(y+.5))에 cellSize를 곱해요.
- RefreshTile / HasTilemapChanges / ProcessTilemapChanges.

수정/조회는 즉시 데이터에 반영돼요. 변경을 한 번 모아 렌더 자원과 병합 BoxCollider2D를 다음 물리 처리 전에 갱신해요. ProcessTilemapChanges는 화면·충돌을 즉시 갱신하며 물리 시간을 진행시키지 않아요. 가시성을 바꾸는 것과 collision 레이어의 참여는 구별해요. 타일 렌더 자원은 반복 갱신 시 해제하고, 풀의 재사용에는 대기 변경을 보존해요.

C++은 호출 안에서도 Set/Fill 다음 Get에 바뀐 값을 읽어요. 영역/연결 채우기는 셀 배열을 한 번 구성하고 반영해요. 브리지 요청과 물리 질의 스냅샷도 runtimeTilemap의 형태를 검증해요. C++의 ProcessTilemapChanges는 공용 충돌 생성기에 동기 요청해 로컬 질의 스냅샷을 갱신하므로 같은 함수 안의 다음 물리 질의도 배치/삭제한 충돌을 읽어요. 실제 Play 월드와 화면에는 함수가 반환된 뒤 기존 명령 순서대로 반영돼요. 동기 처리도 호출당 128회·질의 4 MB·충돌 8,000개 제한을 공유해요.

## 확인

- check-input-authoring: 시간 경계·단발/반복·취소·조합 순환·우선순위 소비·컨텍스트 전환·모디파이어·BP 이벤트·실제 사용자 C++ 값/상태.
- check-2d-authoring: 자동/행열/빈 셀/trim·Smart/Safe ID·자식 재해석·참조 이름 변경·저장·BP 타일 변경·C++ 영역/연결 채우기와 즉시 읽기·부모 좌표·충돌 갱신·같은 C++ 호출의 배치/삭제 후 충돌 질의·잘못된 스냅샷 거부.
- check-authoring-window: 별도 임시 프로젝트/프로필의 실제 HBEngine.exe를 화면 밖 SW_SHOWNOACTIVATE로 실행. UI 분할 적용·Undo/Redo·AI 수정/분할 dryRun/trim no-op·자식 출력/미리 보기·입력 편집 UI·Hold→타일 화면/충돌 제거·원본 보존.
- 최종 실제 창 private 증거: native/build/authoring-window-NGokoS/acceptance.json와 sprite-slicing/input-editor/blueprint-editor/tiles-before/tiles-after PNG. 앞선 AMoOvv/cJGxFE/Qn1WLD/qVOYKQ도 성공했어요. 초기 실패 Hr62qx/NtdxuS는 성공으로 계산하지 않으며 렌더 자원 초기화 누락을 고친 뒤 재검사했어요. 반복 출력의 파일/문서 revision 보존과 최종 버튼/선택 표시도 확인했어요. 실제 2D·3D 게임 EXE의 최종 패키지 증거는 package-check-I4PLwR예요.
- 기존 assets/headless/scene-runtime/gameplay/actor-pool/runtime-input/authoring/2d/main, desktop의 실제 2D·3D WASM과 EXE, package의 2D·3D 배포 EXE 검사도 통과했어요. 결과는 이번 동작 범위의 증거예요.

## 이어지는 누적 요구

이 구현만으로 기존 전체 분석 항목이 모두 들어간 것은 아니에요. 연구 009의 isometric/outline·sorting group/layer·sprite mask·tile provider별 충돌, 전체 C++/Blueprint 객체 수명·제작 시스템, 모바일 native SDK/게임 출력/제작 앱 등은 기존 범위에 남아 있어요. 전체 범위와 분석/검증의 미완료 상태는 REFERENCE_COVERAGE, CODEX_HANDOFF와 연구 원장에서 계속 유지해요. 이전 탄막 측정과 큰 C++ 장면 브리지 병목도 이 커밋으로 해결됐다고 보고하지 않아요.
