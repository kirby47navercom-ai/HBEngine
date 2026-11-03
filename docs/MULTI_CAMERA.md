# 여러 카메라 출력과 편집기 미리보기

Camera 컴포넌트의 **화면에 함께 표시**를 켜고 **화면 영역**을 지정해요. 두 카메라를 왼쪽/오른쪽 절반으로 지정하면 분할 화면이에요. 주 카메라를 전체, 보조 카메라를 오른쪽 아래 보조 화면으로 지정하면 작은 보조 화면이에요. 큰 **겹침 순서**가 나중에 표시돼요. 같은 순서에서는 주 카메라를 먼저 표시해요.

직접 지정은 왼쪽/위쪽/너비/높이를 0–1 비율로 저장해요. 경계 밖 부분은 화면 안으로 자르고, 실제 출력 픽셀 경계에서 반올림해요. 화면을 늘려도 비율을 유지해요. 투영/렌즈/추적/직교 픽셀 맞춤은 각 카메라 속성을 사용해요. 클릭과 조준 광선은 가장 위에 표시된 카메라 영역을 따라가고, 픽셀 맞춤의 검은 여백에는 광선이 생기지 않아요. HUD는 게임 화면 전체에 한 번 표시해요.

함께 표시를 사용하지 않으면 기존 게임 카메라의 main/priority 선택을 유지해요. 시퀀스 카메라 지정은 주 시점을 바꾸고 다른 출력 카메라는 유지해요. 카메라 수를 2개/3개로 고정하지 않아요. 카메라가 늘면 장면을 각 시점으로 그리는 비용과 켠 후처리의 이력이 추가돼요.

## 편집기

각 뷰포트의 **미리보기 카메라** 목록에서 볼 카메라를 고르세요. 자유 시점으로 돌아오려면 같은 목록의 **자유 시점**을 고르세요. 카메라를 선택하고 뷰포트 메뉴의 **선택 카메라 미리보기 열기**를 누르면 해당 카메라를 보는 추가 뷰포트가 열려요. 추가 뷰포트는 기존 도킹/분리 창 흐름을 사용해요. 두 뷰포트에서 서로 다른 카메라를 동시에 볼 수 있어요.

미리보기는 카메라의 월드 위치와 렌즈를 따라가며 게임의 화면 분할 설정을 다시 펼치지 않아요. 자유 시점 이동은 카메라 미리보기 동안 적용하지 않아요. 렌즈는 선택한 Camera 컴포넌트의 속성에서 편집해요. 주 뷰포트의 카메라 선택은 기존 뷰포트 환경설정과 함께 보존돼요.

## 공용 제작 계약

Camera properties: screenOutput(bool), screenRegion(full/left/right/top/bottom/topRight/bottomRight/custom), screenOrder(number), screenX/screenY/screenWidth/screenHeight(number). 기존 main/priority와 별도예요. 블루프린트 컴포넌트 속성과 일반 컴포넌트 설정 노드, C++ 공용 Components API가 같은 검증을 거쳐요.

C++ 예시(카메라 Actor 포인터가 camera, 컴포넌트 ID가 CameraComponent인 경우):

    hb::Components::SetBool(camera, "CameraComponent", "screenOutput", true);
    hb::Components::SetString(camera, "CameraComponent", "screenRegion", "right");
    hb::Components::SetFloat(camera, "CameraComponent", "screenOrder", 1);

## 소유자와 검증

선택/정규화/입력: game-camera.js, runtime-input.js. 공용 출력: camera-view-rendering.js, scene-rendering.js. 네이티브 명령 묶음/후처리 이력: native-scene-renderer.js. GPU 합성/한 번 Present: SceneRender.hpp, SceneRenderBridge.hpp. 편집기: app.js, viewport-presentation.js. 단일 카메라에서는 추가 합성 텍스처를 만들지 않아요. 다중 출력은 한 DirectX 장치와 장면 자원을 공유하고, 합성은 GPU 복사로 처리해요. 카메라 삭제/출력 해제/크기 변경 시 관련 상태와 합성 자원을 정리해요.

ENGINE_WORK_3438.json에 DirectX 실제 픽셀/혼합 투영/여백/5카메라/크기 변경/TAA 이력/Present/해제, WebGL 1.5배 출력/후처리·독립 미리보기·툴바, WebGPU 실제 출력 근거가 있어요. 전체 편집기 셸은 보호된 player.js 실행 금지 때문에 로드하지 않았고, 편집기 공용 함수와 실제 툴바를 격리 페이지에서 검사했어요. 장치별 성능이나 모든 고급 후처리 조합의 품질 인증을 뜻하지 않아요.
