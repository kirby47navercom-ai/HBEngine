# 게임 UI 배율·안전 영역·SVG — 2026-10-05

HUD의 모서리 배치·1280×720 기준·높이 배율·소수 배율 SVG를 기존 위젯 제작기와 배포 Player에 연결했어요. 전체 엔진/문서 연구 완료가 아니며 사용자용 설치본·프로필·게임 원본은 수정하지 않았어요.

## 실제 공식 참고 범위

- [Unity Canvas Scaler](https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/script-CanvasScaler.html)의 기술 텍스트·옵션 표를 읽었어요. Inspector 그림은 미독이에요.
- [CanvasScaler API](https://docs.unity3d.com/Packages/com.unity.ugui@2.0/api/UnityEngine.UI.CanvasScaler.html)의 matchWidthOrHeight 설명·수치 예제를 읽었어요. 전체 타입/연결 API 분석은 아니에요. 너비/높이 비율을 로그 공간에서 혼합하는 의미를 반영했어요.
- [Unreal DPI](https://dev.epicgames.com/documentation/en-us/unreal-engine/dpi-scaling-in-unreal-engine)와 [UMG Safe Zones](https://dev.epicgames.com/documentation/en-us/unreal-engine/umg-safe-zones-in-unreal-engine)의 기술 텍스트를 읽었어요. 그림·장치별 DPI 곡선·전체 UMG 구현은 이번 범위가 아니에요.
- [MDN zoom](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/zoom)의 zoom/transform 배율과 레이아웃 설명을 확인했어요. 전체 문서·브라우저 호환 표·구형 WebView 검증은 아니에요.

## 사람과 AI의 공용 계약

`.hbwidget.json` version 1을 유지하고 새 필드는 선택적이에요. 기존 데이터는 새 기본값을 강제로 저장하지 않아요.

| 필드 | 의미 |
|---|---|
| `scaleMode` | 기존 constant/scale |
| `referenceSize` | 기준 크기, 기본 1280×720 |
| `scaleRule` | fit/width/height/match/cover |
| `scaleMatch` | match 높이 비중 0~1, 기본 0.5 |
| `safeAreaPadding` | 추가 위·오른쪽·아래·왼쪽 여백; 화면 CSS 픽셀 |
| `safeArea` | 장치 안전 inset 사용 |
| `adaptiveOrientation` | 방향이 바뀌면 기준 크기의 두 축도 교환 |

너비 비율 x, 높이 비율 y이면 fit=min(x,y), cover=max(x,y), match=x^(1-m)×y^m이에요. 명시적 height는 전체 화면 높이를 기준으로 크기를 정하고 안전 프레임 안에 배치해요. scaleRule 없는 구형 문서는 안전 프레임 크기를 기준으로 fit하던 동작을 보존해요.

상단 배율 메뉴와 루트 Canvas 속성에서 설정해요. Image·Button·TouchButton 속성은 `texture/vectorTexture/imageFit/imageRendering`을 제공해요. SVG도 텍스처 목록에 나오며 보조 이미지에는 SVG만 선택해요. fit은 contain/cover/fill/none/scale-down, 필터는 auto/pixelated예요.

`GET /api/schema`의 `ui.scaling/images`가 같은 규칙을 제공해요. document.get → revision 보호 document.patch/dryRun → Undo/Redo → document.save를 공유해요. vectorTexture도 이름 변경·의존성 수집·Assets 밖 참조 패키징에 포함해요. SVG 소스는 프로젝트의 텍스트 쓰기로 편집해요.

## 렌더·비용

UI 배율×devicePixelRatio가 정수가 아니고 vectorTexture가 있으면 SVG를 선택해요. 정수이면 원래 texture로 도트를 유지하며 texture가 없으면 SVG를 항상 사용해요. SVG를 PNG로 바꾸지 않고 원본 img로 전달하고 auto 필터를 사용해요. Canvas는 CSS zoom으로 좌표·크기를 같이 조절해요. 이미지 URL은 선택한 소스가 바뀔 때만 갱신하며 종료 때 observer/listener를 해제해요. 버튼 라벨 갱신이 이미지를 삭제하지 않아요.

두 서버는 SVG의 style을 허용하는 별도 CSP와 원래 MIME를 제공해요. 스크립트·외부 네트워크는 허용하지 않으며 외부 URL/글꼴에 의존하는 SVG 전체 지원을 뜻하지 않아요.

## 검사·증거·한계

- `test:ui-layout`: 다섯 배율·방향·구형 기본값·SVG/DPI 선택·참조 이동·스키마/패치/원본 보존 통과.
- `test:ui-editor-window`: 최종 `native/build/ui-editor-window-f9MmIh`에서 활성 배율 메뉴·안전 여백·SVG 선택/표시·AI dryRun/충돌·Undo/Redo·디스크 저장·Scene 원본 보존·예외0·정상 종료 통과. PNG를 보존해요. 초기 b8WOvr는 disabled 메뉴에 synthetic change하던 fixture 한계가 있어 실제 해상도 맞춤/안전 영역 버튼을 먼저 누르게 보강했어요.
- `test:ui-render-window`: release Game.exe의 별도 WebView2에서 1280×720, 1920×1080, 1600×900, 2560×1080, 1080×1920, 1280×720 DPR1.25를 검사했어요. 화면·DPR은 CDP 에뮬레이션이며 물리 기기/OS DPI는 아니에요.
- 최종 `native/build/ui-render-window-hUn4pE/acceptance.json`과 PNG 여섯 개예요. 1.5배의 폭300픽셀 줄무늬 한 줄을 같은 크기의 직접 SVG와 비교해 평균 절대 차이0, 흰/검정 각150, 중간값0이었어요. 알려진 동일 진단 그림을 사용해 제품 경로의 래스터 확대/스타일 누락을 확인한 것으로 모든 SVG/UI 키트 전체를 보장하지 않아요. 캡처를 직접 읽었어요.
- HP 좌상단·공격 우하단 좌표/안전 여백, 실제 클릭→BP 텍스트, TouchButton 키 눌림/해제, 위젯 원본 바이트·예외0·Player/소유 서버 종료 통과.
- assets/UI-audio/main/input-authoring 회귀도 통과했어요. assets의 구형 전체 응답 가정은 현행 C++ 변경분을 원래 세계에 합쳐 검사하도록 수정했어요. 초기 SVG 쓰기 거절, 대문자 입력키 assertion, 에디터 selector 문법 오류, 기본5173 서버 접속 거절은 성공으로 세지 않아요. 원자료·원인을 DEBUG_HANDOFF에 보존해요.

실제 Android/iOS inset·OS 글꼴/접근성 배율·회전·발열/배터리, 글꼴 에셋·다국어·재사용 위젯/스타일·세계 공간 UI·가상화·UI 애니메이션은 누적 후속 작업이에요. 전체 연구 원장은 승격하지 않았어요.
