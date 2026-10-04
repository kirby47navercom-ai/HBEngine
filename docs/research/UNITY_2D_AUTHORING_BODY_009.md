# Unity 6000.0 Sprite·Tilemap 본문 분석 009

2026-10-04, `research_only`예요. 담당자는 `sprite_tilemap_body_analysis`예요. 공식 오프라인 영어 배포본의 기술 본문 **12개 전체**, 표 **19개·149행·359셀**, 표시 선언 **10개**, 전체 예제 **3개**, IMG **5개**와 CSS 폰트 아이콘 **21회·19종**을 실제 읽었어요. owner 확인용 class header **4개는 부분 읽기**이며 전체 타입 본문 수에 더하지 않아요. 독립 검증·원장 승격은 **0**이고 전체 corpus/API 분모·전체 완료를 주장하지 않아요.

## 고정 출처와 읽기 증거

배포본은 [Unity 6000.0 영어 공식 ZIP](https://cloudmedia-docs.unity3d.com/docscloudstorage/en/6000.0/UnityDocumentation.zip)이에요. 캐시 HTTP 기록은 200, `application/octet-stream`, 392,108,580바이트이며, 이번에 다시 계산한 ZIP SHA-256은 `cf07df16fbe4ca7d174cc15bfeb2503995cc4140b42368d0ae7bf17b7805b28f`예요. 기술 본문 12개의 원문 바이트를 ZIP의 동일 entry와 각각 비교했어요. 네트워크 재요청이나 현재 최신판 확인은 하지 않았어요. 각 HTML의 canonical은 요청에 대응하는 `6000.0/Documentation/...`이고, selector에는 Unity 6.0 (6000.0), footer에는 **job 76410965, 2026-09-29**가 표시돼요. 이는 engine patch 버전·패키지 호환 판본까지 입증하지 않아요.

원문은 `native/build/reference-cache/unity-discovery/offline-6000.0/Documentation/en/{Manual,ScriptReference}`에 있고, 추출·그림·owner header 증거는 `native/build/reference-corpus/unity-2d-authoring-batch`에 있어요. 추출은 첫 `<h1`부터 `_content` marker 직전까지의 원문을 UTF-8 HTML로 고정했어요. 실제 읽기는 텍스트 전체와 원문 표·선언·예제 구조, 각 IMG 원본, 원문 CSS/WOFF 아이콘의 정적 렌더에 연결돼요. API의 publisher feedback Success/Submission failed 8heading은 기술 의미 분모에서 제외했으나 body hash에는 원래 바이트로 남아요. **전체 h1–h6는 70개, 기술 heading은 62개**예요. 제목·부수 링크 존재를 읽기 완료로 계산하지 않아요.

파일·전체 source/body/text hash, heading/anchor별 coverage, 표 행·셀·내용 hash, 예제 hash, 각 media path/hash와 링크의 exact offline target 검사는 [기계 기록](unity-2d-authoring-body-009.json)에 있어요. 원문 전체 코드와 표는 private cache에만 보존했고 공개 기록에는 선언과 분석·수량만 적었어요. 공개 Markdown의 현재 hash도 기계 기록에 고정해요.

| ID | 본문 | 기술 heading | 표/행/셀 | 표시 선언 | 전체 예제 | 실제 시각 확인 |
| --- | --- | ---: | --- | ---: | ---: | --- |
| P01 | Sprite import settings | 2 | 1/26/52 | 0 | 0 | media 없음 |
| P02 | Cut out sprites | 8 | 0/0/0 | 0 | 0 | CSS Sprite 아이콘 1회 |
| P03 | Sprite Editor tab | 8 | 5/34/80 | 0 | 0 | IMG 4개 |
| P04 | Sprite Renderer | 4 | 3/17/34 | 0 | 0 | media 없음 |
| P05 | 2D rendering order | 2 | 0/0/0 | 0 | 0 | media 없음 |
| P06 | Sprite Mask | 3 | 2/15/35 | 0 | 0 | media 없음 |
| P07 | Tile Palette | 9 | 6/45/134 | 0 | 0 | IMG 1개, CSS 아이콘 20회 |
| P08 | Tile collisions | 7 | 0/0/0 | 0 | 0 | media 없음 |
| P09 | Sprite.Create | 10 | 1/10/20 | 7 | 2 | media 없음 |
| P10 | SpriteRenderer.maskInteraction | 2 | 0/0/0 | 1 | 0 | media 없음 |
| P11 | Tilemap.RefreshTile | 4 | 1/2/4 | 1 | 1 | media 없음 |
| P12 | TilemapCollider2D.ProcessTilemapChanges | 3 | 0/0/0 | 1 | 0 | media 없음 |

IMG는 Preview 눈 모양, Color RGB 블록, Mipmap 슬라이더, Sprite 선택 도해, Tile Palette A–D 도해예요. Sprite 선택 도해에서 A는 파란 원형 손잡이의 SpriteRect, B는 녹색 사각 손잡이의 9-slice border, C는 비어 있는 파란 원의 pivot임을 직접 확인했어요. Tile Palette 도해에서는 A 도구줄, B active target, C palette, D brush Inspector 배치와 Lock Z/Flood Fill 체크를 확인했어요. 도해의 예시 체크 상태를 API 기본값으로 승격하지 않아요.

`img` 개수만으로 media 분모를 닫지 않았어요. P02/P07의 `span.icon*` 21회에는 텍스트 추출에서 사라지는 glyph가 있어요. ZIP의 `StaticFilesManual/css/icons.css`, `UnityIcons.woff`, `UnityIconsColor.woff`를 고정하고 fontTools의 WOFF→TTF 변환 및 Pillow 정적 contact sheet를 통해 19종을 실제 봤어요. Sprite의 보라색 선택 테두리, Select 화살표, Move 네 방향, Paint 붓, Box Fill 사각 선택, Pick 스포이드, Eraser, Fill 양동이, 두 회전, X/Y 반전, target layer 겹침, 눈, target 원, 보라색 palette, pen, grid, gizmo를 CSS 지정 색상과 겹침으로 확인했어요. 이는 공식 glyph의 확인이며 실제 Unity GUI 실행이나 동적 탭 조작 검증은 아니에요. 기술 body에 video/iframe/object/embed/picture/source/inline SVG/script는 없어요.

## P01 — Sprite 가져오기와 메모리·좌표 계약

출처: [Sprite texture Import Settings](https://docs.unity3d.com/6000.0/Documentation/Manual/texture-type-sprite.html), 본문 전체와 Property 표 26행을 읽었어요.

Texture Type을 Sprite (2D and UI)로 바꾸면 Texture Shape은 2D로 잠겨요. Single은 한 sprite asset, Multiple은 지정한 영역을 texture의 여러 sub-asset으로 나누며, Polygon은 Custom Outline mesh에 맞춰 자르는 흐름이에요. PPU는 world unit당 이미지 픽셀 수예요. Mesh Type은 Single/Multiple에서만 표시되고 Full Rect는 quad, Tight는 alpha에 따른 윤곽이에요. 문서는 32×32보다 작은 sprite가 Tight를 선택해도 Full Rect를 쓴다고 명시해요. 한 축만 작은 직사각형에 적용하는 정확한 비교 규칙은 이 문장만으로 확정하지 않아요. Extrude Edges는 생성 mesh 주변 여백이며 Pivot의 importer 설정은 Single에서만 보여요.

Generate Physics Shape은 Single/Multiple에서 Custom Physics Shape이 없을 때 기본 윤곽을 만드는 선택이에요. isometric tilemap의 cell에 맞춘 충돌을 원하면 **tile asset의 Collider Type을 Grid로 선택**하라는 별도 조건이 있어요. Sprite의 표시 윤곽·물리 윤곽·grid 충돌을 한 데이터로 합치지 않아요. 2D Sprite package가 있으면 Open Sprite Editor, 없으면 Install 2D Sprite Package 버튼이 나타나요. 링크가 `@latest`인 것은 특정 호환 판본 근거가 아니에요.

sRGB는 gamma 공간 color texture 선택이며 정확한 값이 필요한 데이터 texture는 끄도록 설명해요. Alpha Source는 alpha 없음/Input Texture Alpha/RGB 평균으로 만든 alpha를 나눠요. Alpha is Transparency는 색상 채널 dilation으로 필터 경계 artifact를 줄이며 Remove PSD Matte는 PSD에서만 표시돼요. Read/Write는 기본 비활성이고 script 접근용 texture 복사본으로 해당 texture 메모리가 두 배가 된다고 설명해요. 이 비용을 전체 프로젝트 메모리가 두 배라고 확대하지 않아요. Sprite.Create 자체가 Read/Write를 요구한다고 이 페이지에서 추론하지 않아요.

Mipmap Limit 및 Group은 2D/2D Array에 표시되며 다른 shape는 모든 mip level을 써요. Group의 기본은 global limit 사용이에요. Box/Kaiser 필터, Preserve Coverage, Replicate Border, Fadeout to Gray는 Generate Mipmap 조건에 연결되고 Alpha Cutoff는 Preserve Coverage 조건에 연결돼요. Fadeout은 두 slider로 시작·완료 level을 정해요. Ignore PNG Gamma는 PNG에만 보여요. Wrap의 Repeat/Clamp/Mirror/Mirror Once와 U/V per-axis를 구분하며 일부 mobile에서 Mirror Once가 Mirror로 대체된다고 명시해요. Point/Bilinear/Trilinear는 확대 및 mip 사이 필터 차이이고 Aniso는 경사 시 품질/비용이에요. platform override의 세부 형식은 링크 대기예요.

**HB 설계 후보**: C++ import descriptor, 노드의 runtime sprite 생성, 사람 importer, AI asset command가 PPU·mesh·alpha·색 공간·physics shape를 같은 typed schema로 읽어야 해요. importer-only와 runtime 생성 가능한 필드를 구분해야 하며 무거운 Read/Write 옵션을 자동으로 켜지 않아요. 기존 프로토타입의 `nearest/linear`만으로 mipmap·platform fallback·sRGB 기능까지 구현되었다고 볼 수 없어요. API 범위·실패·리임포트 시 sub-asset ID 유지·플랫폼 override·32×32 비교 세부는 미해결이에요.

## P02 — 자르기·적용·되돌리기의 제작 흐름

출처: [Cut out sprites from a texture](https://docs.unity3d.com/6000.0/Documentation/Manual/sprite/sprite-editor/use-editor.html), 8heading과 Sprite glyph를 전체 읽었어요.

Project의 **texture**를 선택하고 Inspector에서 Sprite type을 확인한 뒤 Sprite Editor를 열어요. Scene의 sprite 선택만으로 편집할 수 없다는 조건이 있어요. Single은 전체 texture를 한 SpriteRect로 시작해 파란 손잡이·edge로 영역을 바꾸고 overlay 속성을 조정한 뒤 Apply로 저장해요. Multiple은 왼쪽 drag로 여러 SpriteRect를 만들거나 자동 Slice로 나눠요. child sprite asset 생성이므로 단순 runtime renderer 크기 조절과 다르며 Apply 전 편집과 저장된 결과를 구분해야 해요.

Automatic은 투명 픽셀 분리를, Cell Size는 동일 크기를, Cell Count는 행·열 수를, Isometric Grid는 다이아몬드 형태를 사용해요. Automatic 이외의 방식 또는 Slice 설정 변경에서는 빨간 윤곽 preview를 보이고 이미 자른 texture에서는 윤곽이 안 보일 수 있다고 설명해요. Slice 후 생성 영역은 다시 파란 손잡이로 조절해요. Apply/Revert 경고 설정은 **Edit > Preferences > 2D > Sprite Editor Window**의 Show Apply Confirmation/Show Revert Confirmation이에요. macOS 대체 메뉴·Undo grouping·취소 시 reference identity 복구는 이 본문에 없어요.

**HB 설계 후보**: 사람 drag·AI slice 명령·editor C++ 작업·노드가 동일한 SpriteRect 변경안을 검증하고, preview와 asset 저장을 분리해야 해요. 이미지 path만 분할 저장하는 현재 방식과 Unity child sub-asset 참조의 차이를 보존해요. 적용/되돌리기 경고는 editor preference이고 runtime opcode에 끼워 넣지 않아요.

## P03 — Sprite Editor 표·좌표·Slice 충돌 처리

출처: [Sprite Editor tab reference](https://docs.unity3d.com/6000.0/Documentation/Manual/sprite/sprite-editor/sprite-editor-window-reference.html), 8heading·5표·4그림을 전체 읽었어요.

공통 toolbar의 tab 선택은 Sprite Editor/Custom Outline/Custom Physics Shape/Secondary Textures/Skinning Editor를 나눠요. Preview는 Scene preview, Revert는 수정 폐기, Apply는 저장, Color는 color/alpha 표시 전환이며 Zoom과 mip slider는 보기 상태예요. mip slider는 mip가 있을 때만 나타나고 왼쪽이 낮은 해상도, 오른쪽이 높은 해상도예요. Polygon에서는 tab 이름이 Sprite Polygon Mode Editor로 바뀌고 Change Shape와 Sides가 활성화돼요. Slice와 Trim은 Multiple 조건이며 Trim은 선택 영역을 불투명 부분에 맞춰 줄여요.

Slice의 Column & Row는 Cell Count, Pixel Size는 Cell Size/Isometric, Offset과 Keep Empty Rects는 Automatic 이외, Padding은 Cell Size/Cell Count 조건이에요. Is Alternate는 Isometric에서 행을 stagger하고 첫 행의 첫 diamond가 왼쪽에서 반 픽셀 떨어져 시작한다는 가정이 있어요. 공통 Pivot은 custom 설정을 허용하며 label 우클릭으로 값 복사/붙여넣기를 제공해요. **Delete Existing**은 기존 제거 후 새 영역을 넣고, **Smart**는 겹치는 새 영역을 버리되 가장 알맞은 기존 영역의 위치·크기를 새 영역으로 바꾸고, **Safe**는 기존 모두 보존하며 겹치는 새 영역을 무시해요. Smart가 기존 sprite asset identity를 어떻게 유지하는지까지 이 설명으로 확정하지 않아요.

Sprite overlay의 Position은 X=왼쪽, Y=아래쪽, W/H=픽셀 크기예요. Border는 L/R/T/B의 픽셀 폭·높이이며 녹색 도해와 9-slicing 링크를 연결해요. Pivot Unit Mode의 Normalized는 bottom-left (0,0)부터 top-right (1,1), Pixels는 bottom-left 픽셀 원점이에요. Custom Pivot의 단위는 모드에 따라 달라요. Sides 값을 넣는 것과 Change로 polygon을 실제 재생성하는 것을 구분해요.

**HB 설계 후보**: C++/노드/AI의 rectangle 원점·border 순서·pivot 단위가 사람 overlay와 동등해야 해요. 현재 HB의 rect는 top-left이므로 명시적인 Y 변환 또는 schema origin tag가 필요해요. automatic/isometric slicing·empty rect·Smart/Safe 충돌 처리·polygon 편집은 현재 grid slice와 별개 요구예요. Skinning Editor의 `2D Animation@latest` 링크는 **판본 미고정·미독**이고 이 배치에서 animation package를 읽거나 호환성을 추정하지 않았어요.

## P04 — 표시 반전·9-slice·정렬 속성

출처: [Sprite Renderer component](https://docs.unity3d.com/6000.0/Documentation/Manual/sprite/renderer/sprite-renderer-reference.html), 4heading·3표를 전체 읽었어요.

Sprite 참조는 Project drag 또는 picker로 지정하고 Color의 white는 tint 없음이에요. Flip X/Y는 texture만 반전하며 **GameObject 위치를 이동하거나 반전하지 않아요**. Draw Mode의 Simple이 기본이고 Sliced는 center/edge를 늘리되 corners를 보존하며, Tiled는 새 크기를 반복으로 채워요. Sliced/Tiled는 9-sliced sprite에서 쓰라는 전제이고 Size는 두 모드에서만 표시돼요.

Tiled의 Continuous는 texture를 늘리지 않고 가장자리 tile을 crop할 수 있어요. Adaptive는 center를 Stretch Value 지점까지 늘린 뒤 반복하고 각 tile이 full texture를 써요. 본문은 Stretch Value=1에서 원래 두 배 크기에 center가 반복하고 낮은 값에서 덜 반복한다고 설명해요. 정확한 범위·수식·해당 문장의 실험 검증은 남겨요. 현재 HB tiled의 crop 반복을 Adaptive까지 구현된 것으로 표현하지 않아요.

Mask Interaction은 무시/겹친 안쪽만/겹치지 않은 바깥만 표시를 구분해요. Sort Point는 center 또는 asset pivot에서 카메라 거리 계산을 해요. Sorting Layer는 Tags and Layers 목록 순서, Order in Layer는 작은 값 먼저이고 Rendering Layer Mask는 URP 렌더링 layer 선택이에요. 둘을 draw order 하나로 섞지 않아요. 이 판본의 표는 기본 Material을 Sprite-Lit-Default로 적지만 pipeline별 material 차이·실제 프로젝트 기본값은 관련 URP 문서 확인 전 일반화하지 않아요.

**HB 설계 후보**: C++/노드의 render component 값, Inspector, AI component patch는 표시 반전·sprite sort point·sorting layer·rendering layer를 별도 필드로 다뤄야 해요. 단순 object scale 반전이 물리·child transform까지 바꾸면 원문 Flip 계약과 달라요. Sliced의 border 보존과 Tiled의 mode/threshold는 같은 asset과 runtime mesh 계약에 연결할 후보예요.

## P05 — 정렬의 우선순위와 보장되지 않는 동률

출처: [2D rendering order](https://docs.unity3d.com/6000.0/Documentation/Manual/sprite/sort-sprites/sort-sprites.html), 2heading을 전체 읽었어요.

먼저 그린 GameObject가 뒤에 보인다는 전제 아래, sprite·tile·sprite shape에 적용하는 순서는 **Sorting Layer → Order in Layer → material Render Queue → camera distance → shader/material grouping → 내부 순서**예요. 목록 위쪽 layer, 낮은 order/queue, 더 먼 객체를 먼저 그려요. distance는 camera Projection·Transparency Sort Mode·sprite Sort Point에 따라 달라요. 기본 sprite들은 같은 Default layer/order/queue이므로 설정을 바꾸지 않으면 distance가 첫 차이를 결정해요. 이 문장은 order/queue의 구체적인 숫자 기본값을 제시하지 않아요.

shader/material이 같은 객체를 group으로 그리고 group 간 순서는 보장하지 않아요. 모든 값이 같을 때 내부 render queue 순서는 보장되지 않고 제어할 수 없으며 project에 따라 달라질 수 있어요. 생성 순서·ID 순서 같은 안정 tie-break를 Unity 사실로 만들지 않아요. Sorting Group은 한 layer/sublayer에서 하나의 단위로 정렬하면서 내부 객체를 따로 정렬할 수 있고 prefab 인스턴스가 서로 섞이지 않게 해요. 내부 정렬·nested group 세부는 후속 문서가 필요해요.

**HB 설계 후보**: C++ sort key/노드 설정/사람 layer 관리/AI reorder가 우선순위를 공유해야 해요. HB가 안정 tie-break를 채택한다면 Unity의 보장이라고 쓰지 않고 HB 설계로 명시해요. 카메라 distance를 z 좌표 하나로 대체하면 perspective/custom-axis와 pivot 의미를 잃어요. 기존 `sortingOrder` 한 필드는 원문 전체 계약을 대표하지 못해요.

## P06 — Sprite Mask 입력과 Front/Back 경계

출처: [Sprite Mask component](https://docs.unity3d.com/6000.0/Documentation/Manual/sprite/mask/sprite-mask-reference.html), 3heading·2표를 전체 읽었어요.

Mask Source=Sprite는 지정 sprite texture를, Supported Renderer는 같은 GameObject의 Sprite Renderer/Sprite Shape Renderer/Tilemap Renderer에 붙은 sprite texture를 사용해요. source 선택에 따라 Sprite 또는 Supported Renderer 필드가 표시되고 sprite source일 때만 Center/Pivot sort point 선택이 보여요. mask 모양에는 opaque pixel, 외부에는 transparent background를 써요. Alpha Cutoff는 mask에 포함하는 최저 alpha이며 낮추면 더 투명한 픽셀까지 포함해요. 수치 기본값·허용 범위는 이 본문에 없어요.

Custom Range를 켜야 Front/Back layer/order 설정이 보여요. **Front는 영향받는 가장 높은 layer/sublayer이고, Back은 영향받지 않는 가장 낮은 layer/sublayer**예요. 예시는 Back layer 1, Front layer 2일 때 layer 2에만 적용된다고 설명해요. 따라서 경계를 모두 inclusive로 구현하면 예시와 맞지 않아요. layer/order의 세부 동일 경계 조합·잘못된 범위의 처리·Sorting Group 영향은 후속 API 대기예요. Rendering Layer Mask는 mask가 영향을 주는 rendering layer 선택으로 draw order와 달라요.

**HB 설계 후보**: typed mask source union과 지원 renderer 검증, 반개방 정렬 범위, render-layer bitset을 C++/노드·Inspector·AI에 똑같이 노출할 후보예요. collider mask와 sprite mask를 같은 field로 취급하지 않아요. SpriteMask 관련 API 본문·URP 구현·상호 마스크 겹침·draw-pass 비용은 미독이에요.

## P07 — Tile Palette 대상·브러시·Z·단축키

출처: [Tile Palette window](https://docs.unity3d.com/6000.0/Documentation/Manual/tilemaps/tile-palettes/tile-palette-editor-reference.html), 9heading·6표·도해와 CSS glyph 20회를 전체 읽었어요.

도구는 Scene의 tile 선택·move·paint·box fill·pick·erase·flood fill을 수행하며 Tile Palette Edit를 켜면 **대상이 Scene에서 palette 내부로 바뀌어요**. Select 후 Move를 선택해 drag하는 순서, Pick 후 Paint로 전환하는 상태 변화, palette에서 다중 tile을 drag 선택해 Paint/Box Fill/eraser footprint를 만드는 의미가 있어요. Flood Fill은 blank 또는 같은 tile 영역을 한 tile로 채우며 여러 tile 선택에는 사용할 수 없어요. paint tile rotation은 90도 단위이고 X/Y flip은 brush 상태예요.

toolbar shortcut은 Select S, Move M, Paint B, Box Fill U, Pick I, Eraser D, Flood Fill G, 회전 [ / ], 반전 Shift+[ / Shift+]예요. Active Tilemap에는 checkmark와 hide/ping, 새 tilemap 생성이 있고 From Tile Palette는 palette와 동일한 tile dimension으로 Grid/Tilemap을 만들어 맞춤을 유지해요. Rectangle, hex point/flat top, isometric, isometric Z as Y가 별도 선택이며 마지막은 tile z를 3D height로 사용해요. Brush Picks 및 Clipboard overlay 버튼이 있지만 하위 동작은 읽은 본문에 포함하지 않아요.

palette 생성은 Name, Grid 종류, hex orientation, Automatic/Manual Cell Size를 나눠요. Automatic은 **palette bottom-left tile의 크기**를 쓰고 Manual은 world unit으로 입력해요. Default Sort Mode는 camera Projection에 따른 perspective/orthographic, Perspective는 camera center와 tile 간 거리, Orthographic은 camera plane과 tile 간 거리, Custom Axis는 지정 벡터에 따른 depth예요. axis (0,1,0)은 높은 객체를 더 멀게 계산하는 top-down 예시예요. 투명 render pass라는 명칭 이유도 본문에 있어요. 일반 3D transform에서 z를 높이로 쓰는 것과 2D grid의 cell z를 혼동하지 않아요.

Brush Inspector는 Default/Line/Random/Game Object/Group brush 선택을 나열하지만 다른 brush 상세는 2D Tilemap Extras package로 넘겨요. custom brush는 Script로 정의해요. Flood Fill Contiguous Only를 켜면 연결된 tile만, 끄면 tilemap 전체의 같은 타입을 채워요. Lock Z는 선택한 tile z에 고정하며 끄면 Scene View Z Position과 Palette Z Position이 각각 표시되고 Reset은 0으로 돌려요. 문서의 추가 shortcut 표는 **−로 z 증가, =로 z 감소**, 다음 brush Shift+B, 이전 Shift+Alt+B라고 적어요. 키 방향을 익숙한 관행으로 뒤집지 않아요. focus 우선순위·키보드 layout·OS별 충돌·Undo/asset 저장은 이 페이지에 없어요.

**HB 설계 후보**: 사람 palette/Scene 포커스와 AI/C++/노드 tile command의 explicit target, brush footprint·brush transform·contiguous 옵션·cell XYZ·grid layout을 공통 모델로 정할 후보예요. image 단순 x/y layer index만으로 hex/isometric/3D height를 구현했다고 볼 수 없어요. `Tilemap Extras@latest`는 버전 미고정·미독이며 별도 package/API 분모예요. Color Preferences 연결 문서는 여기서 읽었다고 세지 않아요.

## P08 — tile별 충돌과 배치 갱신 순서

출처: [Enable collision detection for tiles](https://docs.unity3d.com/6000.0/Documentation/Manual/tilemaps/work-with-tilemaps/tilemap-collider-2d.html), 7heading을 전체 읽었어요.

tilemap GameObject를 선택하고 **Inspector > Add Component > Tilemap Collider 2D**로 component를 추가해요. 각 tile collider가 자동 생성되고 Scene에서는 녹색 윤곽을 보여요. 충돌 상대는 Collider2D component로 설명하며 3D Collider 계약을 여기에 포함하지 않아요. tile asset의 Collider Type=None이면 해당 tile 충돌을 끄고, Sprite이면 Sprite Editor의 **상단 왼쪽 dropdown > Custom Physics Shape**에서 custom shape를 사용해요. tile-level 선택과 renderer-level 표시를 분리해요.

neighbor collider 수가 많으면 Composite Collider 2D를 더해 이웃 tile shape를 병합하고 physics update 계산을 줄이는 흐름이에요. 정확한 composite operation·Rigidbody 의존성·extrusion·incremental/full rebuild threshold는 연결 reference 대기예요. 기본적으로 tile 추가·제거 변경은 **LateUpdate에 여러 건을 배치**해서 shape를 갱신해요. 즉시 반영은 ProcessTilemapChanges를 호출하고 필요 여부는 hasTilemapChanges로 확인하도록 안내해요. 이 본문의 단계 목록이 Process 후 check 순서인 점과, query-first를 선택하는 HB 최적화는 구분해야 해요.

**HB 설계 후보**: C++/노드 tile mutation, 사람 paint stroke, AI batch가 동일한 dirty-cell queue와 explicit collider flush를 사용하고 collision type을 tile asset에서 참조해야 해요. renderer refresh·collider rebuild·physics simulation step은 별도 단계예요. 관련 Learn 링크는 `version=6.5`라 이번 6000.0 근거로 읽지 않았어요.

## P09 — Sprite.Create의 표시 overload와 예제

출처: [Sprite.Create](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Sprite.Create.html), 기술 heading 10개·Parameters 10행·표시 선언 7개·예제 2개를 전체 읽었어요. C# owner는 Sprite이며, owner header 부분 읽기로 `UnityEngine`, `UnityEngine.CoreModule`, Object 상속을 확인했어요. C++ header는 C# API 본문에 해당하지 않으며 Unity native/IL2CPP ABI는 미확보예요.

표시된 7개의 signature는 모두 `public static Sprite Create`이며 `Texture2D texture, Rect rect, Vector2 pivot`를 공통 prefix로 해요. 해당 순서에 뒤따르는 추가 인수는 다음과 같고, **표시 선언에 optional default는 없어요**. 정확한 전체 signature 문자열은 JSON에 있어요.

| 표시 순서 | 공통 prefix 뒤의 인수 |
| --- | --- |
| 1 | float pixelsPerUnit, uint extrude |
| 2 | float pixelsPerUnit, uint extrude, SpriteMeshType meshType |
| 3 | float pixelsPerUnit, uint extrude, SpriteMeshType meshType, Vector4 border, bool generateFallbackPhysicsShape |
| 4 | float pixelsPerUnit, uint extrude, SpriteMeshType meshType, Vector4 border |
| 5 | 없음 |
| 6 | float pixelsPerUnit |
| 7 | float pixelsPerUnit, uint extrude, SpriteMeshType meshType, Vector4 border, bool generateFallbackPhysicsShape, SecondarySpriteTexture[] secondaryTextures |

입력 texture에서 Rect pixel 영역을 사용해 새 Sprite를 반환해요. Rect 예시 (50,10,200,140)의 x는 50→250, y는 **bottom→top 10→150**예요. pivot은 rect에 대한 normalized bottom-left (0,0) / top-right (1,1)이고, PPU를 100보다 낮추면 world 크기가 커져요. 이것은 생략 overload의 PPU 기본이 100이라는 선언 근거가 아니에요. extrude는 주변 pixel 영역, meshType은 FullRect/Tight, border는 pixel **X=left,Y=bottom,Z=right,W=top**, fallback bool은 기본 물리 shape 생성 선택, secondary array는 새 Sprite의 보조 texture 설정이에요. input null/rect bounds/PPU 유효 범위·실패 반환/예외·texture ownership·thread·파괴 방식은 미기재예요.

첫 예제의 Awake는 SpriteRenderer 추가·회색 tint·(1.5,1.5,0) transform 배치, Start는 texture 전체 rect·center pivot·PPU 100으로 sprite 생성, OnGUI button은 **이미 생성한 sprite를 renderer에 할당**해요. texture를 버튼 때 새로 가져오는 코드가 아니며 sample comment의 표현을 실제 실행 코드와 구분해요. 둘째 예제는 main/secondary texture를 각각 64×64로 만들고 이름이 다른 3개의 secondary 설정, zero pivot, PPU100, extrude0, FullRect, zero border, fallback=false로 생성한 뒤 secondary count를 가져와요. renderer 할당·texture 내용 채우기·resource 정리 코드가 없다는 사실을 남겨요. GetSecondaryTextureCount 호출을 이 페이지의 추가 formal declaration으로 세지 않아요.

**HB 설계 후보**: C++ runtime SpriteDescriptor 반환값·노드 asset handle 출력·사람 sprite 생성·AI create command가 origin/units/secondary array를 공유할 후보예요. editor import asset 생성과 runtime Sprite 객체 생성은 저장·수명이 다르므로 별도 계약이 필요해요. 생략 인수 기본값·native resource lifetime·alpha mesh/physics fallback 관계는 관련 API 또는 공식 source의 고정 판본을 후속 확보해야 해요.

## P10 — maskInteraction의 실제 표시 선언

출처: [SpriteRenderer.maskInteraction](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/SpriteRenderer-maskInteraction.html), 기술 heading 2개·선언 1개 전체예요. 표시 선언은 `public SpriteMaskInteraction maskInteraction;`이에요. 실제 getter/setter 선언이 없으므로 field-style 표시를 근거로 reflection field/property 분류까지 확정하지 않아요. owner header는 UnityEngine/CoreModule의 SpriteRenderer와 Renderer 상속을 부분 확인했어요.

기본 sprite는 mask와 상호작용하지 않아 겹쳐도 원래 visibility를 유지해요. VisibleInsideMask는 mask 안, VisibleOutsideMask는 반대 부분을 보이게 해요. enum의 underlying 숫자·허용/무효 값·접근 phase·thread·여러 mask 합성은 본문에 없어요. **HB 설계 후보**는 renderer의 typed enum을 C++/노드/사람 UI/AI에 동일하게 쓰는 것이고 숫자 pin을 임의로 확정하지 않아요. SpriteMaskInteraction type/enum 본문은 미독이에요.

## P11 — Tilemap.RefreshTile과 scriptable tile 의존 영역

출처: [Tilemap.RefreshTile](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Tilemaps.Tilemap.RefreshTile.html), 기술 heading 4개·선언 1개·Parameters 2행·예제 전체예요. 표시 선언은 `public void RefreshTile(Vector3Int position);`이고 owner header는 UnityEngine.Tilemaps/TilemapModule의 Tilemap, GridLayout 상속을 부분 확인했어요.

XYZ cell 위치의 tile을 refresh하며 rendering/animation 및 다른 tile data를 다시 받아 관련 component를 갱신해요. 화면 repaint만 하거나 tile asset을 자동 저장한다는 뜻이 아니에요. 빈 cell·범위 밖 좌표·component별 동기 갱신 시점·재귀 callback·thread·실패는 미기재예요.

예제 NeighbourTile은 **TileBase.RefreshTile(Vector3Int, ITilemap)**를 override하고 ITilemap.RefreshTile을 호출해요. 이것을 owner가 다른 Tilemap.RefreshTile의 두 인수 overload로 세지 않아요. y=-1,0,1 및 x=-1,0,1의 같은 z 위치를 순회하여 `tile != null && tile == this`인 cell을 refresh해요. center가 각 loop에 들어가므로 조건을 만족하면 두 번 요청될 수 있어요. GetTileData는 처음 spriteA를 넣고 네 orthogonal 이웃에서 같은 tile asset 참조를 찾으면 spriteB를 넣어요. diagonal 또는 같은 C# 타입의 다른 asset을 이웃으로 판단하는 예제가 아니에요. 반환 bool이 아닌 ref TileData 갱신은 sample callback의 의미이며 formal override API 계약은 후속 읽기가 필요해요.

**HB 설계 후보**: C++ tile provider/노드 data evaluation, 사람 paint, AI tile edit는 XYZ·tile asset identity를 유지하며 영향을 받는 이웃 data의 invalidation을 공유할 후보예요. 일반 tilemap refresh와 provider callback의 target·owner·pin을 분리해야 해요. 표시 갱신과 P12 collider flush의 phase를 별도 검증해야 해요.

## P12 — 즉시 collider 변경 처리의 enable 조건

출처: [TilemapCollider2D.ProcessTilemapChanges](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Tilemaps.TilemapCollider2D.ProcessTilemapChanges.html), 기술 heading 3개·선언 1개 전체예요. 표시 선언은 `public void ProcessTilemapChanges();`이며 인수·반환값은 없어요. owner header는 UnityEngine.Tilemaps/TilemapModule의 TilemapCollider2D와 Collider2D 상속을 부분 확인했어요.

변경이 있으면 collider 업데이트를 즉시 처리하고 보통은 LateUpdate에서 처리해요. **component가 enabled가 아니면 이 호출로 변경을 처리하지 않아요.** disabled component를 강제로 켜거나 physics simulation을 바로 진행하는 함수로 설명하지 않아요. 완료 bool·에러·thread·composite generation 시점·physics broadphase 동기화는 미기재예요.

**HB 설계 후보**: C++/노드·사람 편집·AI batch의 explicit flush에 enabled와 dirty 상태를 검증하도록 대응할 후보예요. Unity 반환값이 void이므로 HB의 처리 결과/실패 상세를 추가한다면 HB 설계라고 명시해요. 임의 runtime phase에서 무조건 호출 가능한 것으로 확정하지 않아요.

## 기존 HB 코드와 읽기 전용 대조

이번에는 수정·실행·테스트 없이 `prototype/two-d-assets.js:10,17,28,35,42,77,93`, `prototype/two-d-editor.js:57,117,165,187`, `prototype/scene-components.js:14`, `prototype/scene-rendering.js:41,44,45,54,56`, `docs/AI_ENGINE_API.md:135`, `native/include/HBEngine/Game.hpp:10`의 관련 범위만 읽었어요. 해당 파일 hash와 범위는 JSON에 고정해요. repository 전체에서 해당 기능이 없다는 부재 증명은 하지 않아요.

| 원출처 계약 | 읽은 현재 코드 | 향후 C++/노드·사람·AI 대응 요구 |
| --- | --- | --- |
| Unity rect는 bottom-left pixel, pivot은 normalized bottom-left | spriteImage는 top-left rect에서 bottom-left UV로 변환; pivot은 normalized; border는 left/bottom/right/top | origin·border order·pivot unit을 명시하고 import/export 변환과 공통 schema 검증 |
| Slice Automatic/Count/Isometric/Smart/Safe/empty rect | sliceSpriteGrid는 cell width/height·margin/spacing만 사용, 최대 1000 결과 | editor C++ transaction·노드·AI에 slice method/기존 영역 처리와 asset identity 계약 |
| Sliced/Tiled Continuous/Adaptive | spriteSlices는 border/PPU를 써서 sliced 또는 crop 반복 tiled를 생성 | mode/threshold를 공통 typed renderer 속성으로 연구하고 Adaptive 검증 별도 유지 |
| layer/order/queue/distance/pivot/group 및 ties 미보장 | renderer schema는 sortingOrder, scene mesh는 renderOrder에 적용 | C++/노드 sort key·layer UI·AI layer ID, camera-aware 거리·group·동률 설계 |
| Sprite mask 입력·range·enum | 읽은 SpriteRenderer schema에는 maskInteraction/source/range 필드가 없음 | typed source union·range 경계·render layer와 physics mask 분리, 실제 native 실행 계약 대기 |
| cell XYZ·hex/isometric·brush target/Z | 현재 tile asset은 x/y/index, rectangular width/height, layer별 배열; applyTileTool은 brush/erase/rectangle/연결 fill | 사람 target/focus와 AI explicit target, C++/노드 cell XYZ·brush footprint·grid layout 공통 모델 |
| tile-level None/Sprite/Grid·LateUpdate batch/flush | tileCollisionBoxes는 collision=true layer의 점유 cell을 rectangle로 병합, preparePhysics에서 BoxCollider2D 배열 생성 | tile asset collision type/custom shape/dirty queue/flush를 분리; enabled·phase·저장/재열기 검증 |

위 표는 연구 요구이며 네이티브 구현 완료 보고가 아니에요. 현재 `HB_FUNCTION/HB_NODE` metadata 존재만으로 Sprite.Create·Tilemap flush의 C++/node 동등성을 입증하지 않아요. UI의 crop·brush 작업은 공통 데이터/Undo/저장 계약을 유지하면서 전체 gate 이후 적용해야 해요.

## 미해결 링크·API·검증 대기

본문 링크는 모두 href·resolved URL을 기록했지만 본문 읽기는 이 배치의 12개와 owner header 4개만 인정해요. exact offline target 또는 anchor 불일치는 **13회·9개 URL/anchor**예요. 이는 온라인 HTTP 404를 새로 확인했다는 뜻이 아니에요.

- P01의 TextureImporter `#textureshape`/`#platform`은 해당 offline HTML에 anchor가 없어요. Scriptable Tiles의 `.html` 없는 링크는 P01/P08에서 같은 exact target이 없어요.
- P05 Sorting Group의 `sprite/sorting-group/use-sorting-groups.html`은 현재 page 기준 상대 해석 시 `sprite/sort-sprites/sprite/...`가 돼 exact offline target이 없어요.
- P06의 `../sprite-editor/open-sprite-editor` 2회, P07의 `./create-tile-palette`는 exact offline target이 없어요. P07 `#tile-palette-clipboard-overlay` anchor도 없어요.
- P11의 이전 Manual `class-Tilemap.html`/`Tilemap-ScriptableTiles-TileBase.html` 링크 4회는 exact offline target이 없어요. 이동·대체 canonical의 공식 확인은 대기예요.

읽지 않은 주요 연결 계약은 TextureImporter/isReadable/mipmap/platform override, sprite Custom Outline/Custom Physics Shape/secondary textures/9-slicing, Sorting Group/Camera transparency sorting, SpriteMaskInteraction enum 및 SpriteMask API, Grid/GridLayout/Tile/TileBase/ITilemap/TileData·cell 변환, TilemapCollider2D.hasTilemapChanges 및 collider reference/CompositeCollider2D, package의 고정 compatibility edition이에요. 외부 Wikipedia는 본문이 안내한 보조 링크로만 남기고 Unity 기술 분석 증거로 사용하지 않았어요. `2D Sprite/2D Animation/SpriteShape/Tilemap Extras@latest`는 판본 미고정·미독이고 기능·API 전체 분모에 포함되어야 할 대기 항목이에요. package를 안 읽은 것을 설치 불필요 또는 범위 밖 판정으로 바꾸지 않아요.

null/범위/실패·overload 생략 기본값·ownership/정리·thread·editor/runtime phase·Undo/dirty/asset reference 저장·reimport·composite flush/physics 동기화는 각각 해당 API/연결 본문에서 확인해야 해요. 이 배치는 원문의 일부 기능 계약을 구체화했지만 해당 누락과 독립 검증 대기 때문에 verified를 주지 않아요. `RESEARCH_STATUS.md`, manifest, ledger, 도구·엔진·GUI·테스트·커밋은 변경하거나 실행하지 않았어요.
