# 충돌 형상의 제작·저장·실행 대조 — 2026-10-03

[전 영역 대조](REFERENCE_COVERAGE.md)의 물리/모델/조작 항목을 확장한다. 개별 페이지 확인 범위는 [세부 조사 기록](reference-index/detail-audit.json)에 남긴다. 아래 표의 분석과 설치된 API 대조를 구현·검증에 연결했다.

## 실제 자료 확인과 판단

| 본문 자료 | 확인한 의미 | HB 적용과 차이 |
| --- | --- | --- |
| [Unity 6000.0 Mesh Collider](https://docs.unity3d.com/6000.0/Documentation/Manual/class-MeshCollider.html) | 렌더 메시를 충돌에 사용하며 convex와 cooking의 비용·유효성·읽기 가능한 메시 조건을 구분한다. | 정점/삼각형을 명시적으로 생성·용접하고 저장한다. Convex는 실제 hull, Mesh는 정확한 삼각형 표면이다. Unity의 255 삼각형 상한·cooking 옵션과 동일한 구현이 아니다. |
| [Unity Polygon Collider 2D](https://docs.unity3d.com/6000.0/Documentation/Manual/2d-physics/collider/polygon-collider-2d-reference.html) | 닫힌 다각형 편집과 trigger/offset/composite/triangulation/layer 설정을 제공한다. | 오목한 단순 경로를 ear clipping으로 분할해 하나의 compound collider로 실행한다. 여러 경로는 각각 채워진 분리 영역이며 중첩·구멍·교차는 거부한다. Composite 연산·effector·auto tiling·Delaunay·세부 layer override를 동일 구현으로 표시하지 않는다. |
| [Unity Edge Collider 2D](https://docs.unity3d.com/6000.0/Documentation/Manual/2d-physics/collider/edge-collider-2d-reference.html) | 열린 선분, edge radius, 양 끝 adjacent point, 레이어와 접촉 통지를 구분한다. | 열린 zero-thickness polyline을 실행하고 직접 편집한다. 반경/adjacent normal/독립 send·receive·callback mask는 별도 구현 대상이다. HB의 edge/edge 접촉 의미를 Unity와 같다고 표시하지 않는다. |
| [Unity Edit Collider 조작](https://docs.unity3d.com/6000.0/Documentation/Manual/2d-physics/collider/edit-collider-mode-reference.html) | 점·선분 이동, 빈 선분 클릭으로 점 추가, Ctrl/Cmd 선택 삭제가 있다. | 점 드래그, 선분 클릭 추가, Ctrl 클릭 삭제, Shift 선분 드래그, 좌표 입력, 스냅, 이동/확대, Delete와 로컬 Undo/Redo를 연결했다. 모달의 적용 전 초안은 원본과 분리한다. |
| [Epic Simple vs Complex](https://dev.epicgames.com/documentation/unreal-engine/simple-versus-complex-collision-in-unreal-engine?lang=en-US) | 단순 볼록 형상과 상세 삼각형 검색을 구분하고 complex-as-simple의 시뮬레이션 제약을 설명한다. | 실제 hull/triangle 모드를 구분하며 움직이는 동적 몸체에는 convex만 허용한다. HB의 collisionMode는 query/physics/both이며 Unreal의 모든 simple/complex 조합 옵션을 복제한 것은 아니다. |
| [Epic 충돌 자동화](https://dev.epicgames.com/documentation/unreal-engine/setting-up-collisions-with-static-meshes-in-blueprints-and-python-in-unreal-engine) | UI와 편집 스크립트로 형상을 생성하고 별도로 저장한다. hull 분해의 품질/복잡도, 제거, 충돌 LOD도 구분한다. | UI와 AI `collision.bake`는 동일 생성 경로와 revision/dryRun/Undo를 사용한다. 현재 3D는 하나의 convex hull이며 다중 hull 분해·충돌 LOD·UCX import는 추가 대상이다. |
| [Rapier colliders](https://rapier.rs/docs/user_guides/javascript/colliders/) — Shapes/Mass properties | convex hull, trimesh, polyline, compound의 실제 형상과 질량 기여를 설명한다. | 설치된 0.21.0의 `ColliderDesc`/`Shape` 선언에서 2D compound, convexHull, polyline, 3D trimesh와 flags를 대조했다. 오목한 2D 형상은 정확한 삼각형 compound로 만들고 실제 면적·관성을 사용한다. |

## 데이터와 실행 계약

- `MeshCollider`: `mode: convex|mesh`, `sourceMesh`, `vertices: number[3][]`, `indices: integer[]`. 4,096 정점/8,192 삼각형까지, 유효한 비퇴화 삼각형을 요구한다. convex에는 비공면 입체 점이 필요하다. mesh는 고정/키네마틱 몸체에서 사용한다.
- `PolygonCollider2D`: `paths: number[2][][]`, 최대 16 경로/합계 512점. 시계/반시계 방향을 허용한다. 각 경로가 단순 닫힌 영역이며 연속 중복·역행·자기 교차·경로 간 교차/중첩/구멍은 거부한다.
- `EdgeCollider2D`: `points: number[2][]`, 2~512점의 열린 선분. 연속 중복을 거부한다. 고정/키네마틱에서 사용한다.
- 좌표는 소유자 로컬 m다. collider center와 장면 계층의 world pose/scale을 실행에 적용한다. 렌더 메시 생성은 자식 mesh pose를 포함하고 소유 actor의 world pose/scale을 제거한다. 다른 actor와 helper는 제외한다. 실제 메시의 삼각형이며 primitive bounding box로 대체하지 않는다.
- `sourceMesh`가 있으면 해당 OBJ/FBX/GLTF/GLB 모델을 현재 import 경로로 읽는다. 없으면 장면에서 준비된 렌더 group을 사용한다. blueprint는 sourceMesh를 선택한다. source 변경만으로 저장 형상이 자동 갱신되지는 않는다. **메시에서 생성 → 저장**은 명시적 작업이다. skinned/morph 변형 형상은 정적 메시로 오인해 생성하지 않는다.
- 물리·물리 검색·C++ 동기 검색은 저장된 동일 형상을 사용한다. 2D 경로의 빈 오목 영역은 빈 공간으로 유지한다. 내비게이션 grid는 형상의 보수적 AABB를 장애물로 사용하므로 물리 narrow phase와 같은 정밀도로 설명하지 않는다.
- 동적 삼각형/선분 조합은 Scene/BP 저장 검증, 형상 적용, 런타임에서 거부한다. 형상 모드/데이터가 바뀌면 편집 outline GPU geometry를 폐기한다.

## 사람과 AI의 편집 경로

Scene Inspector/BP 컴포넌트 상세에 점/삼각형 수와 `형상 편집`, Mesh에는 `메시에서 생성`을 제공한다. 큰 중첩 배열을 일반 vec3 필드로 펼치지 않는다. 2D 모달은 점·경로·좌표 목록, 3D 모달은 회전 가능한 형상 미리보기와 정점/삼각형 JSON이다. 잘못된 초안은 적용을 막으며 취소는 원본을 유지한다. Ctrl Z/Shift Z, RMB/MMB 이동, 휠 확대, 전체 보기, point/path 추가·삭제를 제공한다. 적용한 한 작업을 문서 Undo/Redo로도 복원한다.

AI는 `/api/schema`의 geometry와 컴포넌트 json 필드 계약을 조회하고 `document.patch`로 같은 값을 수정한다. `collision.bake`는 `path`, `expectedRevision`, `object`(Scene), `component`, `dryRun`을 받는다. dryRun도 실제 모델/렌더 삼각형을 읽지만 문서를 저장하거나 바꾸지 않는다. revision 충돌과 편집 모달/Play 중 명령은 거부한다. 저장은 별도 `document.save`다. sourceMesh는 의존성 조회와 이동/이름 변경 참조 갱신에 포함한다.

## 검증 증거

- `npm run test:collision-geometry`: 실제 Rapier WASM 67개 조건. hull·오목/분리 polygon·open edge·trimesh, 첫 step 전 exact ray/overlap/cast, 빈 영역, trigger/layer31, 질량/면적/회전, 중력 착지, 동적 금지, OBJ bake, 계층 pose/scale 제거, outline disposal, 내비 bounds를 검사한다. 실제 컴파일한 사용자 C++ 함수도 네 형상을 query하고 빈 영역을 구분한다.
- 브라우저 `/prototype/tests/collision-geometry.html`: 같은 실제 WASM 67개 통과, 오류 로그 없음.
- `node tools/check-collision-editor.mjs http://127.0.0.1:5182`: authoring-qa에서 실제 문서 revision/dryRun/bake/Undo/Redo, 잘못된 geometry/dynamic mesh 패치의 원본 보존, 저장/재열기, 2D/3D 착지, Pause/Stop 원본 복구, BP source OBJ bake 통과. 일반 사용자 프로젝트에 실행하지 않는다.
- 실제 GUI: 점 드래그로 [-0.1,0.1], 로컬 Undo, 선분 클릭 추가/Ctrl 삭제, duplicate point의 적용 비활성화, 두 경로 Apply→AI document 조회→문서 Undo/Redo→디스크 저장, 3D mode 전환과 미리보기, BP 컴포넌트 형상 편집을 확인한다. 스크린샷은 무시된 native/build UI 증거 폴더에 저장한다.
