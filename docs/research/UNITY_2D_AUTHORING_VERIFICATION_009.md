# Unity Sprite·Tilemap 분석 009 독립 대조

주인님, 짚짱의 선행 `/root/undo_mobile_evidence_audit` 담당은 분석 담당 `/root/sprite_tilemap_body_analysis`와 별도로 2026-10-04에 [분석 문서](UNITY_2D_AUTHORING_BODY_009.md), [분석 JSON](unity-2d-authoring-body-009.json), 공식 오프라인 **기술 본문 12개 전체**를 직접 읽고 비교했다고 이 MD와 인계에 기록했어요. 모든 표 셀·표시 선언·전체 예제·5개 IMG와 폰트 아이콘 19종, owner header 4개 부분 읽기까지 보고했지만 세션 중단으로 검증 JSON 저장이 끝나지 않았어요.

이번 `/root/finish_009_verification` 담당은 선행 담당의 읽기를 자기 읽기로 계산하지 않았어요. 별도 private 감사 기록이 없으므로 **12개 기술 본문 텍스트 전체를 실제 다시 읽고**, 원문 HTML에서 표·선언·예제·heading·link 구조를 재계산해 분석과 대조했어요. IMG 원본 5개와 glyph contact sheet 19종을 직접 보고 원본 CSS의 해당 glyph rule·font·codepoint·colored path 색/겹침을 읽었어요. owner header 4개만 부분 재확인하고, HB 코드는 아래 명시한 범위에서 다시 읽었어요. **한정된 본문 대 분석의 독립 대조 통과이며 원장 promotion·엄격한 verified 승격은 0**이에요.

## 실제 확인 범위와 고정 증거

| 확인 항목 | 독립 재계산 |
| --- | ---: |
| 기술 본문 전체 | 12 |
| 부분 owner header | 4 |
| 원본 h1–h6 / 기술 heading | 70 / 62 |
| 표 / 헤더 포함 행 / 셀 | 19 / 149 / 359 |
| 표시 선언 block | 10 |
| 전체 pre 예제 | 3 |
| IMG 전체 시각 확인 | 5 |
| CSS glyph 출현 / 고유 종류 | 21 / 19 |
| exact offline target·anchor 불일치 / 고유 URL·anchor | 13 / 9 |
| 최종 대조 실패 / 원장 승격 | 0 / 0 |

원문은 `native/build/reference-cache/unity-discovery/offline-6000.0/Documentation/en` 아래의 8개 Manual·4개 ScriptReference예요. private body/text/media/font/owner 기록은 `native/build/reference-corpus/unity-2d-authoring-batch`에 있어요. [검증 JSON](unity-2d-authoring-verification-009.json)에 최종 분석 MD/JSON pin, source/body/text hash, heading·표·예제 locator/hash, media와 glyph provenance, 실제 reader·날짜·범위를 고정했어요.

공식 ZIP은 392,108,580bytes·SHA-256 `cf07df16fbe4ca7d174cc15bfeb2503995cc4140b42368d0ae7bf17b7805b28f`로 다시 계산했어요. 12개 원문과 5개 이미지, `StaticFilesManual/css/icons.css` 및 두 WOFF를 ZIP의 동일 entry bytes와 각각 비교했어요. source/body/text hash 모두 실제 파일과 일치하며 body는 원본 첫 `<h1`부터 `_content` marker 직전까지의 exact bytes예요. 12개 canonical URL, Unity 6.0 (6000.0) header, job ID 76410965·2026-09-29 footer도 맞아요. 현재 온라인 최신판·engine patch·package compatibility를 새로 확정한 것은 아니에요.

private extraction SHA-256은 `89a092137e24939c8371cb4113d8f6ec6db61ae29ecd7388f39cc08706fba0a0`, font-media는 `1bb82b2cf83fc8f7383b55d5e53c78badf4f297655ddb3fa5a318394a06b0091`, owner-headers는 `34348c0019917d0ee70f1e7d9f5c6d8a88a1d4a69fa140bbf657796973422ee0`예요. 각 private record의 내부 hash도 다시 계산했어요. API publisher feedback의 Success/Submission failed 8heading은 raw body에는 보존되고 기술 heading에서만 제외돼요. 70을 기술 구역 분모로 사용하지 않았어요.

최종 분석 MD SHA-256은 `4d0ccb2580d40c8783e9375db4e735ca421fc159f97ceeda49a9c20c7f25ec25`, 분석 JSON은 `6a71a2e89939d3b0f10e7c6e9747cb2d88fc17192b9793dd89132284c2dba2e4`예요. 두 파일을 바꾸지 않고 현재 bytes와 대조했어요. 검증 JSON은 선행 MD의 수정 전 hash·선행 담당의 주장 근거와 이번 담당의 실제 보완 읽기/재계산 범위를 분리해 고정해요. 이 MD의 최종 hash는 JSON에서만 pin하므로 상호 자기 hash를 만들지 않아요.

## 그림·폰트 아이콘의 실제 대조

Preview 눈 모양, RGB Color 블록, Mipmap 슬라이더를 원본 크기로 봤어요. Sprite 선택 도해의 A는 파란 원형 손잡이 SpriteRect, B는 녹색 사각 손잡이 border, C는 빈 파란 원 pivot이에요. Tile Palette 도해의 A 도구줄·B active target·C palette·D brush Inspector와 Lock Z/Flood Fill 체크 상태도 확인했어요. 그림의 예시 checkbox 상태를 default API 계약으로 올리지 않았어요.

P02의 Sprite glyph 1회와 P07의 toolbar/target/palette glyph 20회를 원문 `span.icon*`에서 다시 셌어요. Colorpicker와 TilePalette의 중복을 포함한 출현 21회·고유 19종이 맞아요. 원본 CSS에서 각 glyph의 font·codepoint와 colored path의 RGB·음수 margin 겹침을 읽고, contact sheet의 Sprite 테두리/점·선택 화살표·move 화살표·붓·사각 선택·스포이드·지우개·양동이·좌우 회전·X/Y flip·layer·눈·target·palette·pen·grid·gizmo를 실제 봤어요. monochrome glyph의 `#555`는 contact sheet 확인용 중립색이고 해당 glyph CSS rule이 지정한 색이 아니에요. 실제 browser의 상속색은 확인하지 않았어요.

원본 WOFF와 contact sheet에 사용된 TTF의 `cmap/glyf/hmtx/loca/maxp` table bytes가 두 font 모두 같았어요. 이는 정적 font glyph의 확인이며 실제 Unity GUI·브라우저 동적 탭·운영체제 font 렌더링 검증은 아니에요. 기술 body의 video/iframe/object/embed/picture/source/inline SVG/script는 없었어요. body에 없는 외부 media·package 내용을 읽었다고 세지 않았어요.

## 본문·API·예제의 의미 대조

**가져오기와 sprite 편집(P01–P03).** Texture Shape 2D 고정, Single/Multiple/Polygon, Single/Multiple의 mesh·physics shape 조건과 Single의 importer pivot, Tight를 선택해도 작은 sprite가 Full Rect가 되는 제한이 맞아요. 32×32 문장만으로 한 축 비교 세부를 만들지 않았어요. script Read/Write copy의 해당 texture 메모리 증가, alpha/sRGB·mipmap·format별 조건과 일부 mobile의 Mirror Once→Mirror 대체도 정확해요. Project의 texture를 선택해 Sprite Editor를 열고 Apply로 child sprite 결과를 저장하는 흐름, Single/Multiple 작업, Automatic/Cell Size/Cell Count/Isometric Slice, 빨간 preview의 예외와 Preferences 경고 메뉴를 확인했어요.

Sprite Editor의 공통 toolbar·Polygon/Multiple 표시 조건, Slice의 설정별 가용성, Delete Existing/Smart/Safe의 서로 다른 기존 영역 처리도 원문과 같아요. Smart의 asset identity 보장을 만들지 않았어요. **Position Y는 아래쪽 픽셀 원점**, normalized pivot은 bottom-left (0,0)에서 top-right (1,1), pixel pivot도 bottom-left예요. Editor의 Border L/R/T/B와 Sprite.Create의 Vector4 left/bottom/right/top 순서를 각각 기록한 점이 맞아요. 도해의 손잡이·pivot 색/모양은 이 좌표·border 분석과 대응해요.

**표시·정렬·mask(P04–P06/P10).** Flip이 GameObject 위치를 바꾸지 않는 표시 반전, Simple 기본과 9-sliced Sliced/Tiled 조건, Continuous crop과 Adaptive의 별도 stretching 설명이 맞아요. Stretch Value의 정확한 수식과 pipeline별 기본 material은 미확정으로 유지해요. 정렬 우선순위는 layer→order→material queue→distance→shader/material grouping→보장되지 않는 내부 순서이며 camera projection/sort mode/sprite sort point와 Sorting Group의 단위화를 확인했어요. 생성 순서·stable ID tie-break를 Unity 보장으로 채우지 않았어요.

Mask Source의 Sprite/지원 renderer 조건, source별 필드·sort point, alpha cutoff·rendering layer와 sorting layer 구분도 맞아요. **Custom Range의 Front는 영향받는 최고 경계, Back은 영향받지 않는 최저 경계**예요. Back1·Front2 예시는 layer2만 영향을 받으므로 양쪽 inclusive 해석을 하지 않은 분석이 정확해요. 동일 경계/order·잘못된 범위·Sorting Group 영향은 후속 계약으로 남아요. maskInteraction의 실제 field-style 표시만으로 reflection field/property를 확정하지 않았고, 기본 무상호작용·Inside/Outside 의미를 보존했어요.

**Tile Palette·충돌(P07–P08/P12).** Palette Edit에 따라 Scene과 palette의 편집 대상이 바뀌며 Select→Move, Pick→Paint, 여러 tile footprint와 단일 tile Flood Fill 제한이 맞아요. toolbar key와 90도 회전·flip, active target·hide/ping·palette에서 만든 grid dimension, rectangular/hex/isometric/Z-as-Y 구분을 읽었어요. Automatic Cell Size는 palette bottom-left tile 크기, custom sort axis·camera distance와 z-height 문맥, contiguous fill과 Z lock의 분리도 정확해요. 원문 shortcut 표의 **−로 z 증가·=로 z 감소**를 관행대로 뒤집지 않았어요. focus/OS/keyboard layout·Undo/저장은 본문 밖으로 남아요.

tile별 Collider Type None/Sprite와 custom physics shape, Composite의 이웃 shape 병합, 기본 LateUpdate batching을 확인했어요. manual의 Process 후 hasTilemapChanges check 목록과 HB가 선택할 query-first 최적화를 분리한 점도 맞아요. ProcessTilemapChanges는 변경이 있을 때 즉시 collider를 갱신하며 **TilemapCollider2D가 enabled가 아니면 처리하지 않아요**. disabled를 강제로 활성화하거나 physics simulation까지 즉시 진행한다고 만들지 않았어요.

**Sprite.Create(P09).** 7개 표시 C# overload의 순서·전체 type/name·static Sprite 반환을 비교했어요. default 표시가 없어 생략 PPU=100 등의 값을 만들지 않았어요. pixel rect는 bottom→top이며 normalized pivot과 PPU world 크기, extrude·meshType·pixel border 순서·fallback physics·secondary array 의미가 맞아요. 첫 전체 예제는 Awake renderer 준비→Start sprite 생성→OnGUI 버튼에서 이미 생성한 sprite 할당이에요. 버튼 때 texture를 새로 얻는다고 sample comment를 코드 동작으로 사용하지 않았어요. 둘째 전체 예제의 64×64 main/secondary texture·서로 다른 3name·zero pivot/border·fallback false·secondary count 조회와 renderer 할당/정리 부재도 확인했어요. sample 호출을 추가 formal API 선언으로 세지 않았어요.

**Tilemap.RefreshTile(P11).** XYZ cell에서 rendering/animation/기타 data를 다시 받아 관련 component를 갱신하는 계약이 맞아요. 전체 예제의 owner는 TileBase override와 ITilemap callback으로 Tilemap의 두 인수 overload가 아니에요. 같은 z의 orthogonal 이웃·같은 tile asset 참조 비교, 양쪽 -1/0/1 loop에서 center가 두 번 요청될 가능성, GetTileData의 네 방향 이웃으로 spriteB 선택을 확인했어요. diagonal·같은 C# 타입의 다른 asset·저장/repaint 전용 API로 확대하지 않았어요.

10개 선언 block은 Sprite.Create 7개와 maskInteraction/RefreshTile/ProcessTilemapChanges 각 1개예요. API owner 확인용 Sprite/SpriteRenderer는 UnityEngine/CoreModule, Tilemap/TilemapCollider2D는 UnityEngine.Tilemaps/TilemapModule이며 상속 Object/Renderer/GridLayout/Collider2D를 원본 header에서 부분 읽었어요. 4개 header의 일치가 전체 owner 타입/상속 멤버의 의미 coverage를 대신하지 않아요.

## 링크와 HB 대조의 범위

원문 href를 다시 resolve하고 고정된 offline 파일·anchor 존재를 대조하니 실패 13회·고유 URL/anchor 9개가 분석과 같았어요. TextureImporter anchor 두 개, 확장자가 없는 scriptable tile/open sprite editor/create palette 링크, 잘못된 상대 Sorting Group 경로, 없는 Clipboard anchor, 이전 Tilemap Manual 링크가 남아요. 이를 온라인 HTTP 404·공식 삭제·완료로 바꾸지 않았어요. `@latest` package와 Learn `version=6.5`는 읽지 않은 후속 근거이며 이 6000.0 본문 완료를 상속하지 않아요.

현재 코드의 top-left rect→bottom-left UV, normalized pivot과 border order, cell-size grid slice/1000 제한, crop 반복 tiled, sortingOrder/renderOrder, 읽은 SpriteRenderer schema의 mask 필드 부재, x/y/index tile·직사각 layer 배열·연결 fill, collision layer의 점유 cell rectangle 병합과 BoxCollider2D 준비를 읽기 전용으로 확인했어요. 이번 보완 담당은 `prototype/two-d-assets.js` 전체, `prototype/two-d-editor.js` 57·81·117·120–122·144·165·187행, `prototype/scene-components.js` 14–15행, `prototype/scene-rendering.js` sprite/tilemap/preparePhysics 범위(41–56행), `docs/AI_ENGINE_API.md` 135행과 `native/include/HBEngine/Game.hpp` 첫 24행을 직접 읽고 hash를 다시 계산했어요. 원출처와의 차이를 future typed schema·C++/node/사람 UI/AI 요구로 분리한 판단이 맞아요. native metadata나 기존 JS 코드만으로 runtime/편집/Undo/저장 동등성이 검증됐다고 말하지 않았어요. 읽은 코드 범위·hash는 검증 JSON에 별도 남기며 repository 전체 부재 증명을 하지 않았어요.

표·코드·그림·API declaration의 일치는 실제 읽기 후 비교한 결과예요. 자동 추출·파일 존재·별도 agent identity만으로 의미 확인을 대체하지 않았어요. null/범위/default·실패/예외·ownership/resource 정리·thread·editor/runtime phase·Undo/dirty/reference 저장/reimport·physics/composite 동기화와 미독 package/API는 계속 남아요. 원문 본문·표·전체 예제를 공개 복제하지 않았어요.

선행 담당이 저장한 MD를 이번 담당이 범위·attribution을 보완하고 누락 JSON을 완성했어요. 이번 담당이 작성한 저장소 파일은 009 검증 MD/JSON 두 개뿐이에요. 분석 담당의 문서·private evidence·ledger/status·도구·엔진·GUI·네트워크·커밋은 변경하거나 실행하지 않았어요. 검증용 재계산은 읽기 전용 Python 처리이며 엔진 테스트가 아니에요. 원본 ZIP/source/body/media/font와 분석 pin이 바뀌면 이 검증은 stale예요. **한정된 독립 의미 대조 통과, 엄격한 원장 verified 0·전체 gate 미통과**로 남겨요.
