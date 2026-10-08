# 머테리얼 노드·출력 핀 미리보기 — 079

## 읽은 근거와 적용

[Unreal 5.8 Previewing and Applying](https://dev.epicgames.com/documentation/en-us/unreal-engine/previewing-and-applying-your-materials-in-unreal-engine)의 자체 기술 본문 전체를 읽었다. 우클릭으로 특정 expression을 표시하고 활성 노드를 구분하며 종료하면 표면으로 복귀하는 흐름을 적용했다. 같은 본문의 미리보기 메시·환경·Realtime 설명도 읽었으며 이 단계에서 모두 구현했다고 계산하지 않는다.

[Unity Shader Graph 17.0.4 Main Preview](https://docs.unity3d.com/Packages/com.unity.shadergraph@17.0/manual/Main-Preview.html)와 [Preview Node](https://docs.unity3d.com/Packages/com.unity.shadergraph@17.0/manual/Preview-Node.html)의 자체 기술 본문 전체(Ports/Generated Code 포함)를 읽었다. 같은 실행 경로를 미리 보고 입력은 그대로 유지하는 계약을 적용했다. HBEngine은 노드마다 새 Preview 노드를 저장하는 대신 편집기 view에 출력 선택을 보관한다. 연결 문서·이미지·영상·API·소스와 전체 corpus는 확인 완료로 승격하지 않는다. 원문 HTML/SHA/범위는 증거 JSON에 있다.

## 제작·AI 계약

- 노드 또는 출력 핀 우클릭 → 해당 출력 미리보기. 여러 출력은 채널별로 고를 수 있다. Ctrl+T는 선택 노드의 첫 출력 미리보기를 전환한다. 활성 노드에 파란 테두리/표시, 미리보기 창에 노드·핀 이름과 종료 버튼을 둔다.
- `material.preview {path,node?,pin?,reset?,expectedRevision?}`. node 생략은 현재 선택 조회, reset은 원래 표면으로 복귀한다. pin 생략은 첫 출력, FunctionOutput은 value 입력을 사용한다. stale revision/없는 노드·핀/Surface와 필수 함수 입력 오류는 기존 선택을 바꾸지 않는다. 인스턴스는 그래프가 없어 이 명령 대상에서 제외한다.
- 선택은 `doc.view.materialPreview`에만 저장한다. 원본 에셋·revision·dirty·Undo/Redo는 유지한다. 기존 view recovery 저장을 사용하며 실제 검증은 문서 전환까지다. 새 프로세스에서 복구되는지 별도 확인한 것으로 계산하지 않는다.
- 선택 출력의 upstream만 복사한다. 무관한 함수 파일은 읽지 않는다. 함수/레이어/블렌드/LayerStack과 typed 입력은 기존 resolver → numeric/attributes lowering → CPU/GLSL/TSL로 연결한다. 새 shader VM이나 프레임마다의 컴파일은 추가하지 않았다. 같은 미리보기 서명은 기존 머테리얼을 유지한다.
- 숫자는 발광 RGB로 표시한다. Float는 RGB 반복, Vec2는 XY0, Vec4는 XYZ, Texture2D는 RGB 샘플, StaticBool은 0/1, Attributes는 실제 PBR이다. 이미지는 기존 tone mapping과 미리보기 조명을 거친 결과다. FunctionInput의 Preview/default와 FunctionOutput의 연결 또는 literal도 지원한다. 원래 머테리얼 출력은 건드리지 않는다.
- 관련 오류도 수리했다. 함수 추출 모달의 X는 이름 validation을 우회해 취소하고, 레이어 파라미터 속성창은 Bool의 false override를 숫자 검증으로 버리지 않는다.

## 묶음 검증

`test:material-preview`는 84개 카탈로그 출력의 기존 GLSL 컴파일, RGB 투영, typed 값, 함수/레이어 경계, 무관한 dependency 제외, 원본 불변 실패, 레이어 false override를 검사한다. typed/function/layer/uniform1000/workflow/파일 묶음/API/main 검사도 한 묶음으로 통과했다. 노드68/BP714/C++연결629는 유지한다.

실제 소유·분리 Win32/WebView2 창 GL `gpu-editor-KtwBLs`, GPU `gpu-editor-PMw2yw`에서 사람 우클릭·Ctrl+T·종료, Texture RGB/Alpha/Object·StaticBool/분기·함수 출력·레이어·스택, AI 조회/오류/문서 전환·revision/dirty/history/future 불변을 확인했다. GL의 cyan/red 영역은 각각11661px, 함수 green11660px, layer/stack magenta7968/7967px다. 첫 cyan 검사의 비율 기준은 실제 pastel tone mapping을 잘못 거절해서 channel 차이와 밝기·red/green 대조군으로 수정했다. 제품의 렌더링 오류로 계산하지 않는다.

두 창의26개 파일 SHA가 최종 소스와 일치하고 원본 프로젝트·실제 BP/C++/viewport/중지·자원 정리, errors0/exit0/서버 종료가 통과했다. 사용자 창/프로젝트/설치본을 조작하지 않았으며 두 사용자 MD는 원문 byte prefix를 보존해 append했다. [실제 증거와 실패 기록](research/MATERIAL_PREVIEW_079.json), `native/build/material-preview-core-079.log`에 결과를 남겼다. FPS·RAM·장시간·모바일 실기기 측정으로 계산하지 않는다.

## 이어갈 세부

미리보기 메시·2D/3D 모드·Realtime/환경 조작과 inline thumbnail, Cube/Array/Volume/External 포트, 추가 shader domain·GI/lightmap/reflection/postprocess·층 height/influence/triplanar/detail/displacement, native 메인 렌더러가 남는다. 051의 애니메이션/게임·월드·C++·창/오디오·모바일·AI 세부 및 설치 선행 순서를 그대로 유지한다. 이 목록은 누적 범위의 상한이 아니다. 현재 사용자 설치7df780dd9a47cf5b는 갱신 대기다.
