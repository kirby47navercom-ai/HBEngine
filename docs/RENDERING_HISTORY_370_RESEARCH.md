# 준비 단계와 이전 기하 경계 대조

2026-10-18 지정 함수와 본문을 대조했어요. 원문 SHA·설치 소스 일치는 `native/build/reference-corpus/supplemental370/read-scope.json`, 등록과 미독 연결 범위는 `CORPUS_MANIFEST.json`의 supplemental370에 남겨요. 전체 Unreal/Unity 문서·API 분석 완료로 계산하지 않아요.

[Three r180 Renderer](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Renderer.js)의 `compileAsync`는 노드 프레임 번호를 임시로 증가시키고 복원해요. 실제 `_renderScene`은 `info.calls`에서 번호를 정하고 카메라 좌표계를 바꿔요. [Nodes의 updateGroup](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/nodes/Nodes.js)은 같은 렌더 번호의 renderGroup 재전송을 생략해요. 이 두 지정 함수의 관계를 설치 0.180.0 소스와 대조했어요. 나머지 Renderer/노드/장치 수명 API 전체를 읽었다는 의미는 아니에요.

HB의 실제 차가운 QuadMesh 검사에서는 준비와 첫 렌더가 번호 1을 공유했어요. 준비 때 저장한 GL 투영과 실제 WebGPU 투영이 달랐지만 전송이 생략되어 첫 화면이 비었어요. 준비에만 고유 음수 번호를 주고 동기 구역을 벗어나기 전에 복원했어요. 준비 중 래스터의 번호 진행, 실패·취소·장치 초기화, 두 준비 단계와 첫 실제 가이드 값을 확인해요. GPU 예열 그리기나 실제 호출 횟수 변경으로 우회하지 않아요. 이 결과는 속도 측정이 아니에요.

[PBRT4 BVH](https://pbr-book.org/4ed/Primitives_and_Intersection_Acceleration/Bounding_Volume_Hierarchies)의 도입·7.3.1 도입과 7.3.4 도입/LinearBVHNode 배치를 대조했어요. 하위 primitive를 포함하는 경계, 잎의 primitive 구분과 선형 배치의 의미를 확인했어요. SAH/HLBVH 구현 전체·그림·연결 교차 API는 이번 읽기에 포함하지 않아요.

HB의 현재 TLAS·공유 local BLAS는 현재 변환/포즈의 경계예요. 그 경계로 이전 세계 정점을 검색하면 누락될 수 있어요. 기존 median/refit BVH를 재사용하여 committed 세계 정점의 경계를 별도로 만들고, 잎에는 현재 프레임의 삼각형 ID를 기록해요. 정점 본문은 기존 motion 구역을 재사용하고 경계만 기존 아틀라스 뒤에 붙여요. 첫 motion 레코드의 사용하지 않던 두 w 성분으로 선택 구역의 위치와 노드 수를 전달해요. 기존 자료의 0은 미지원으로 남아요.

투명 시간 가이드에서 이전 가림을 검사하고, 검색이 끝나지 않았거나 다른 삼각형이 먼저 나오면 이력을 거부해요. 직교 카메라는 이전 VP의 가까운 평면에서 시작해요. 이 교차·가림 검사는 이전 중첩 매질의 독립 스택과 전체 굴절 경로 재생을 대신하지 않아요. 전역 곡면 역해·거친 복합 로브·산란 footprint는 계속 별도 항목으로 유지해요.
