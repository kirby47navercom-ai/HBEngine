# 재사용 머테리얼 함수 — 075

2026-10-08. 기존 머테리얼 편집기·에셋 문서·CPU 평가·GLSL/TSL 생성·씬 렌더링·배포 경로를 확장했다. 별도의 픽셀 실행기나 새 의존성을 추가하지 않았다.

콘텐츠 브라우저에서 `MF_` 머테리얼 함수(`.hbmaterialfunction.json`)를 만들고 독립 문서로 연다. 그래프에는 Surface 대신 Function Input/Output을 사용한다. float·vec2·vec3·vec4, 여러 출력, 입력의 값 또는 Preview 연결/JSON 리터럴, 기본값 사용/필수 입력, 이름·설명·표시 순서를 편집한다. 노드는 작게 유지하고 선택한 노드의 상세 설정은 오른쪽 속성창에 표시한다. 빈 곳 선택은 함수의 이름·분류·설명·목록 노출·미리보기 출력을 표시한다.

외부 함수의 Call 노드는 정의의 입출력 **노드 ID**를 연결 핀 ID로 쓴다. 이름·표시 순서 변경은 연결을 유지한다. 핀 갱신은 삭제되거나 타입이 바뀐 핀의 선·리터럴을 제거하는 한 번의 Undo 작업이다. 정의와 저장된 호출의 ID·타입이 다르면 로드 시 명시적 오류를 낸다. 로드된 호출 문서는 함수 저장 때 갱신되고 변경 사항을 별도로 저장할 수 있다. 미리 로드된 씬 머테리얼도 함수 의존성 목록을 이용해 다시 적용한다. 아직 로드하지 않은 호출 파일은 자동 덮어쓰지 않으며, 핀 구조 변경 뒤 해당 호출에서 갱신·저장해야 한다.

노출한 함수는 분류·이름·설명·경로로 검색하며 설명을 툴팁으로 표시한다. 콘텐츠 브라우저의 다중 함수 드래그는 한 번의 Undo로 삽입한다. 기존 우클릭 생성·타입별 연결·팬·확대·전체 보기·복사·붙여넣기·복제·삭제·문서별 Undo/Redo·저장·복구를 재사용한다. 입력/출력 복제는 이름을 구분하고 내부 선을 보존한다. 자기 자신을 직접 삽입하는 동작은 거절한다.

## 실행·C++·AI

`resolveMaterialAsset`가 의존성 그래프를 읽고 함수 호출을 기존 수학·벡터 노드로 펼친다. 정의는 한 번의 해석 안에서 경로별 한 번만 읽고, 호출별 내부 ID는 구분한다. 스칼라 입력을 벡터 포트로 보낼 때 함수 안의 계산 전에 벡터로 만든다. 필수 외부 입력은 선이나 리터럴이 있어야 하고 함수 자체 미리보기만 Preview 값을 사용한다. 중첩 순환과 깊이 16 이상, 잘못된 정의·서명·자료형을 거절한다. 기존 1000노드/5000선 그래프 검증 예산은 셰이더 컴파일 예산이며 씬 오브젝트 개수 제한이 아니다.

펼친 그래프를 기존 CPU 평가, WebGL GLSL, WebGPU TSL에 그대로 넘긴다. 함수 내부 Scalar/Vector/Texture Parameter는 기존 머테리얼 인스턴스와 공용 파라미터 경로를 쓴다. `hb::Materials::Set(actor, materialPath)`·`SetFloat(actor, name, value)`와 기존 BP `materialSet`·`materialFloat`로 해당 **머테리얼/인스턴스**를 적용하고 제어한다. 함수 자체를 표면 머테리얼처럼 Actor에 붙이지 않는다. 함수 편집·새 에셋 생성·JSON 문서 patch/dryRun·expectedRevision·Undo·다중 파일 작업은 기존 계약을 쓰며 `schema.material.functions`에 의미를 공개한다.

패키징은 함수 파일과 실제 프로젝트 파일 참조를 포함하고 원본 함수 구조를 유지한다. 머테리얼/인스턴스의 함수 의존성은 패키징 전에 해석해 누락·순환·서명·필수 입력 오류를 검출한다. 실행 중 함수의 별도 VM을 픽셀마다 호출하지 않는다. 여러 함수의 같은 파라미터 이름은 기존 전역 머테리얼 파라미터 규칙을 따르므로 서로 다른 설정에는 구분한 이름을 사용한다.

## 검증

`npm run test:material-functions`는 네 타입·다중 출력·Preview 핀/AI 리터럴·필수 외부 입력·스칼라 벡터 변환·중첩/읽기 캐시·내부 ID·순환/깊이·인스턴스 파라미터·핀 이름/타입 갱신·100자 이름 복제·클립보드 원자성·경로 변경·원본 보존·실제 빌드 사전 검증을 확인한다. 기존 머테리얼 검사와 메인 713 BP·289 공통 API 검사도 통과했다.

최종 실제 비활성 Win32/WebView2 Editor `gpu-editor-HRAwU2`에서 전용 그래프/속성창·선택·Undo/Redo·저장 전파·잘못된 dryRun·한글 검색·다중 드래그·자기 호출 거절·PNG·수명 정리를 확인했다. 이 고유 검증 프로젝트의 두 함수 파일만 의도적으로 편집·저장했으며 나머지 fixture 파일과 주인님의 프로젝트는 수정하지 않았다. 이전 실패 `hmMTNV`는 검사 클라이언트가 파일 폴링 중 `EDITOR_BUSY`에 즉시 실패한 것으로, 같은 명령을 Busy일 때만 제한 시간 안에서 재시도하도록 검사 흐름을 보완했다.

release Player `gpu-scene-hbyOLC`(WebGPU)와 `gpu-scene-OHr8zt`(WebGL2)는 중첩 함수·네 타입의 실제 셰이더·인스턴스·실제 C++ 숫자 변경·BP 숫자 변경·어둡고 밝은 실제 픽셀·씬 교체·원본 보존·오류0·exit0·서버 종료를 확인했다. GPU의 숫자 갱신은 같은 머테리얼·텍스처·지오메트리를 유지했다. WebGL2 경로는 GPU 모듈 지연 로딩도 유지했다. 최종 검사 파일 SHA와 로그/SHA는 [증거](research/MATERIAL_FUNCTIONS_075.json)에 있다. 제품 수정 뒤 필요한 짧은 검사만 수행했고 8시간 안정성 검사는 반복하지 않았다.

## 문서 대조와 다음 세부

[Unreal Material Functions Overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-material-functions-overview)의 자체 기술 본문 전체와 [Unity Shader Graph 17.0.4 Sub Graph](https://docs.unity3d.com/Packages/com.unity.shadergraph@17.0/manual/Sub-graph.html)의 자체 기술 본문 전체를 읽고 독립 에셋·입출력 경계·미리보기/기본값·라이브러리·중첩·파라미터·전파의 의미를 대조했다. 원문과 SHA는 `native/build/material-functions-research-075`에 보존했다. 연결된 노드/API·전체 참조·영상·샘플·엔진 구현까지 읽었다는 의미는 아니며 전체 corpus gate는 false를 유지한다.

Texture object/StaticBool/MaterialAttributes 포트, 선택 노드 함수 추출, 임의 식 미리보기/노드 썸네일, 머테리얼 Layer/Blend 에셋과 인스턴스 스택은 별도 남은 구현이다. 이 항목을 완료로 세지 않는다. 051의 선행 누적 세부와 설치 갱신 순서를 유지한다. 이번 결과는 설치 갱신·전체 FPS/RAM·실기기·상용 엔진 전체 기능/동등성 완료 판정을 바꾸지 않는다.


076 후속: 위 075 당시 미구현 목록 중 Attributes 함수 포트와 Layer/Blend 독립 에셋·인스턴스 스택은 [076](MATERIAL_LAYERS_076.md)에서 구현·검증했다. 나머지 포트·추출/개별 미리보기와 전체 누적 선행 목표는 유지한다.
