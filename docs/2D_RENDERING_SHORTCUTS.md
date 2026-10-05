# 2D 정렬·마스크·등각 타일과 편집기 단축키

2026-10-05 후속 [표면·노멀·그림자](2D_SURFACE_NORMAL_SHADOWS.md)는 이 정렬/마스크 경로와 같은 Sprite/Tilemap 재질을 사용해요. 새7개 C++/BP 설정/조회·normal 상속/미리보기·실제 Editor/Player GPU49개를 확인하며 전용 Light2D 후속을 유지해요. 아래 수량과 당시 창 기록은 이전 단계의 근거예요.

2026-10-05. 기존 전체 엔진 요구에 추가한 구현 계약이에요. 메뉴 등록과 실제 편집·게임 실행을 구분하며, 이 문서가 전체 Unity/Unreal 본문·API 분석 완료를 뜻하지 않아요.

## 참고한 동작과 읽은 범위

- [Unity 6000.0 SortingGroup API](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Rendering.SortingGroup.html): 묶음 내부 정렬, 중첩 그룹, 루트 정렬 동작의 본문을 읽었어요. HBEngine은 안정적 그룹 ID와 배열 순서로 정렬하고 `distance`/`y` 기준을 제공해요.
- [Unity 6000.0 SpriteMask API](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/SpriteMask.html): 알파 기준, 정렬 범위, 같은 정렬 그룹의 적용 범위 본문을 읽었어요. HBEngine의 inside/outside는 실제 GPU discard로 실행해요.
- [Unity 등각 타일맵 제작](https://docs.unity3d.com/6000.0/Documentation/Manual/tilemaps/work-with-tilemaps/isometric-tilemaps/create-isometric-tilemap.html): 격자·팔레트·텍스처 크기와 피벗·투명 정렬 본문을 읽고 HBEngine의 공용 격자 기준을 만들었어요. Isometric Z as Y는 이번 구현에 포함하지 않아요.
- [Unity Shortcuts Manager](https://docs.unity.com/en-us/engine/6000.0/manual/unity-editor/editor-navigating-managing/shortcuts-manager): 전역/문맥 명령, 충돌, 프로필 부분을 읽었어요.
- [Unreal 단축키 설정](https://dev.epicgames.com/documentation/unreal-engine/customizing-keyboard-shortcuts-in-unreal-engine?lang=en-US): 본문의 명령별 두 키·기록·충돌 덮어쓰기·가져오기/내보내기를 대조했어요. HBEngine 프로필은 자체 JSON이에요. Unreal ini 호환 형식으로 표시하지 않아요.

위 페이지의 이미지·영상·모든 연결 API까지 읽었다고 기록하지 않아요. 전체 연구의 원장·pin/hash와 미독 항목은 기존 `docs/research`에 유지해요.

## 사람의 제작 흐름

월드 설정에서 정렬 레이어를 추가하고 이름/순서를 편집해요. 이름과 별개인 ID가 스프라이트·타일맵·그룹·마스크에 저장되므로 이름 변경과 순서 이동이 참조를 바꾸지 않아요. Default는 삭제할 수 없어요. 삭제된 ID는 속성에서 미등록으로 보이고, 렌더링은 Default 순서로 처리해요. 최대 64개예요.

오브젝트 메뉴의 2D 배치에 Sorting Group과 Sprite Mask가 있어요. SpriteRenderer/TilemapRenderer의 속성에서 레이어·순서·마스크 없음/내부/외부·조명 없음/광원 적용을 선택해요. SortingGroup은 자식들을 하나의 묶음으로 정렬하며, 중첩 그룹과 `sortAtRoot`를 지원해요. 마스크는 가장 가까운 SortingGroup이 같은 렌더러에 적용하고 여러 알파 영역을 합쳐요. 사용자 범위는 앞/뒤 레이어와 순서를 포함해 판정해요.

광원 적용 스프라이트와 타일은 실제 표면 노멀을 사용하는 MeshStandardMaterial로 점/방향/스포트/환경광에 반응해요. 조명 없음은 MeshBasicMaterial이에요. Unity URP의 전용 Light2D나 그림자 캐스터 시스템과 동일한 구현으로 취급하지 않아요. PBR의 흰 반사광이 색에 더해질 수 있어요.

타일맵 문서의 격자를 사각/등각으로 바꿀 수 있어요. 칠하기·지우기·영역·채우기·스포이드가 같은 좌표계를 사용해요. 격자 밖 드래그는 가장자리 타일을 자동으로 칠하지 않아요. 위로 솟는 타일 그림과 다이아몬드 셀 위치를 구분하며, 그리는 순서는 셀 깊이로 결정해요.

편집 메뉴의 단축키 창에서 검색/범주/키 1/키 2/초기화/프로필 복제·삭제·JSON 가져오기·내보내기를 사용해요. 기본 프로필은 유지하고 수정하면 사용자 프로필이 생겨요. 같은 문맥에서 충돌하는 키는 거절하며, 사용자가 덮어쓰기를 선택하면 상대 명령의 해당 키만 제거해요. 좁은 도킹 창에서는 도구막대가 줄바꿈되고 표가 내부에서 스크롤돼요.

33개 등록 명령을 재지정할 수 있어요. 뷰포트와 블루프린트의 F 프레이밍은 문맥이 달라 같은 키를 사용할 수 있어요. 텍스트 편집의 Undo/복사·IME 조합, 뷰포트 비행, 게임 입력은 편집기 동작이 가로채지 않아요. 재지정 전 키가 옛 키 처리기를 통해 다시 실행되는 것도 차단해요. 아직 등록되지 않은 모든 마우스 제스처·타일맵 전용 키·방향키를 재지정할 수 있다고 표시하지 않아요.

## 런타임·C++·블루프린트

등각 셀의 기준은 다음과 같아요. `w/h`는 월드의 cellSize이고, 역변환은 floor를 사용해요.

```text
x = (cellX - cellY) * w / 2
y = -(cellX + cellY) * h / 2
cellX = floor(x / w - y / h)
cellY = floor(-x / w - y / h)
```

편집기·렌더링·VM·C++의 월드/셀 변환이 같은 기준과 부모 변환을 사용해요. 병합한 충돌 셀은 사각 격자에서 BoxCollider2D, 등각에서는 정확한 평행사변형 PolygonCollider2D가 돼요. AABB 모서리를 잘못 충돌시키지 않으며 `ProcessTilemapChanges` 직후 같은 C++ 함수의 물리 질의에도 갱신된 형상을 사용해요.

다음 10개 서비스는 C++ 선언에서 블루프린트 핀을 생성해요. 전체 노드 카탈로그는 514개예요. 개수는 전체 엔진 API 완료의 척도가 아니에요.

| C++ hb::Sprites | 블루프린트 키 |
| --- | --- |
| SetColor / GetColor | spriteSetColor / spriteGetColor |
| SetSize / GetSize | spriteSetSize / spriteGetSize |
| SetSorting / GetSorting | spriteSetSorting / spriteGetSorting |
| SetMaskInteraction / GetMaskInteraction | spriteSetMask / spriteGetMask |
| SetLit / IsLit | spriteSetLit / spriteIsLit |

```cpp
hb::Sprites::SetColor(this, {1, .5f, .25f, 1});
hb::Sprites::SetSize(this, {2, 1});
hb::Sprites::SetSorting(this, "default", 10);
hb::Sprites::SetMaskInteraction(this, "inside");
hb::Sprites::SetLit(this, true);
const auto size = hb::Sprites::GetSize(this);
```

SetSize는 실제 렌더링 크기 사용을 켜요. GetSize는 설정 크기를 반환해요. 색상 0~1, 크기 .01~10000, 정렬 ID/순서, 마스크 열거형은 JS와 C++ 양쪽에서 검사해요. 같은 C++ 호출 안의 변경 후 읽기는 대기 중인 쓰기를 반영해요.

## AI 편집·저장 계약

`GET /api/schema`에 정렬·마스크·조명·격자·컴포넌트·단축키 명령/기본값이 실제 정의에서 노출돼요. 장면과 컴포넌트는 기존 document.patch의 revision/검증/Undo/저장 경로를 사용해요. 정렬 레이어의 화면 이름을 ID로 쓰지 않아요.

`editor.shortcuts.get`은 명령·프로필·revision을 반환해요. `editor.shortcuts.set`은 전체 data와 expectedRevision을 받고 dryRun을 지원해요. 오래된 revision, 겹치는 문맥의 충돌, 알 수 없는 명령, 프로필/키 한도 위반은 변경 전에 거절해요. 동기 저장 거절 시 메모리 프로필도 이전 값으로 돌아가요. 단축키 프로필은 장면 Undo와 별개의 편집기 설정이에요.

프로필 JSON은 `hbengine.editor.shortcuts.project.<프로젝트 UUID>` 키로 프로젝트의 `Saved/Editor/storage.json`에 저장돼요. 클라이언트와 서버의 키 허용 목록이 같고 다른 프로젝트의 키는 거절해요. 디스크 기록은 기존 지연 저장/flush·실패 재시도와 로컬 백업을 사용해요. 비동기 쓰기 실패를 내구성 있는 저장 성공으로 보고하지 않아요.

## 비용·검증·남은 경계

3D만 있는 장면은 2D 정렬/마스크 경로를 빠져나가요. 마스크를 안 쓰면 마스크 렌더 타깃은 0개예요. 같은 실제 마스크 집합을 쓰는 렌더러는 타깃을 공유하고, 범위 밖의 빈 마스크는 1×1 투명 텍스처를 사용해 전체 화면 패스를 생략해요. 사라진 타깃을 해제하고 리사이즈·종료에서 수명을 정리해요. 타일은 레이어당 한 메시이며, 마스크를 쓰는 레이어만 재질 객체를 나눠 범위별 uniform이 섞이지 않게 해요.

서로 다른 실제 마스크 집합 수만큼 화면 크기의 RGBA 타깃이 필요해요. 많은 마스크 조합의 GPU 메모리·전체 장면 성능은 별도 측정 대상이에요. 이 구현으로 전체 엔진이나 모바일 메모리가 가볍다고 단정하지 않아요. 파티클 마스크, 2D skeletal animation, 타일별 provider/outline·Z as Y, 전용 Light2D, native DX11와 Android/iOS 제작·배포는 기존 누적 범위에 남아 있어요.

재현: `npm run test:2d`, `test:shortcuts`, `test:session`, `test:authoring-window`. 실제 별도 EXE의 GPU 픽셀 검사는 중첩 정렬/루트/레이어/Y 정렬, 알파 내부·외부/이동/범위/그룹, 마스크 해제/타깃 해제/빈 패스 생략/리사이즈/렌더러 상태, lit/unlit·광원 반응, 타일 레이어별 uniform을 확인해요. 실제 키 기록·새 저장 키 실행·옛 키 차단·revision 거절·디스크 재조회도 확인해요. 최신 성공 경로는 CODEX_HANDOFF에 기록해요. 기존 사용자 창을 조작하지 않아요.

최종 실제 창은 `native/build/authoring-window-z8UKVX`예요. acceptance.json의 GPU21개/예외0, pointer.json의 실제 지도 클릭, 등각0,0 칠하기/디스크 저장, isometric-editor/shortcuts-editor 스크린샷과 정상 종료를 확인했어요. sampler 참조도 null로 지워 폐기한 타깃을 재바인딩하지 않아요. 앞선 칠하기 검사 실패는 팔레트 canvas를 고른 테스트 선택자 문제로, 조사 기록과 함께 보존했어요. 실제2D·3D 배포EXE는 package-check-pRE4wk, 에디터의 C++/BP/재실행은 editor-api-window-mKpI6p, Player 회귀 표본은 player-acceptance-i3wHLE예요. 이 Player는 마스크 sampler null 변경 전의 비마스크 경로를 측정했고 그 경로는 이후 변경되지 않았어요.
