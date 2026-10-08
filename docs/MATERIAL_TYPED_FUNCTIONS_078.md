# 078 — 머테리얼 함수 추출·텍스처 객체·정적 분기

078은 051의 선행 누적 작업을 이어가는 변경이다. 설치본은 `7df780dd9a47cf5b` 그대로이며 Auric_Loop의 Assets/Source/tools와 사용자 창은 건드리지 않는다. 전체 Unreal/Unity 문서·API·연결 콘텐츠 분석 gate는 false다.

## 조사와 선택

- [Unreal 5.8 Material Functions Overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-material-functions-overview)의 자체 기술 본문 전체를 읽었다. 함수의 typed Input/Output, TextureObject→TextureSample, StaticBool→StaticSwitch, Preview/필수 입력·파라미터·중첩·전파를 대조했다. TextureCube/Array/Volume/External과 개별 노드 미리보기는 이번 구현에 포함하지 않는다.
- [Unity Shader Graph 17.0.4 Create a Sub Graph](https://docs.unity3d.com/Packages/com.unity.shadergraph@17.0/manual/Create-Sub-Graph.html)의 자체 기술 본문 전체를 읽고 선택→우클릭→독립 에셋의 흐름을 대조했다. 연결된 stage/소스/영상은 읽지 않았다.
- [Unity Property Types](https://docs.unity3d.com/Packages/com.unity.shadergraph@17.0/manual/Property-Types.html)는 공통 속성·Boolean·Texture2D 구역만 읽었다. Unity Boolean은 shader float이며 이번 Static Bool은 Unreal 방식의 컴파일 시점 분기다. 텍스처 선택과 bool 체크박스는 기존 인스턴스/레이어 편집기를 재사용한다.

원문 HTML·최종 URL·바이트/SHA는 `native/build/material-typed-research-078/manifest.json`에 보존한다. 읽은 구역과 미독 항목을 구분하며 전체 corpus 완료로 승격하지 않는다.

## 구현 계약

- Material Function 포트: `float`, `vec2`, `vec3`, `vec4`, `texture2d`, `staticBool`, `attributes`. `schema.material.functions.types`가 같은 목록을 공개한다.
- Texture Object/Parameter는 에셋 경로만 전달한다. Texture Sample의 `textureObject` 핀에서 기존 샘플러에 연결하며 색 공간/반복은 Sample에서 편집한다. 샘플링 전 객체·bool 타입을 숫자 타입으로 암묵 변환하지 않는다. 빈 텍스처는 기존 흰색 fallback이다.
- Static Bool/Parameter와 Static Switch는 함수·인스턴스·레이어에 전달된다. 선택하지 않은 분기는 shader 코드/텍스처 할당에서 제외한다. 숫자·attributes·texture2d·staticBool 분기를 같은 lowering에서 처리한다. 픽셀마다 실행하는 새 VM/분기 루프는 없다.
- MI bool은 체크박스, texture는 에셋 선택기다. Layer/Blend의 stable entry ID와 독립 parameter scope를 유지한다. 기존 CPU 평가·GLSL·TSL·패키징에 연결한다.
- 함수 Input Preview/출력 Preview도 두 새 타입을 처리한다. texture 출력은 샘플 RGB, bool 출력은 0/1 roughness로 미리 본다. 외부 literal·경로 변경/이름 변경은 typed signature/default/inputValues 참조를 함께 갱신한다.
- 사람: 선택 노드 우클릭→머테리얼 함수로 묶기→이름 입력. 같은 폴더에 MF 에셋과 호출을 만든다. 출력·함수 경계·LayerStack·레거시 표면 노드는 보호한다. 기존 숫자/함수/속성 노드는 추출할 수 있다.
- AI: `material.extract {path, expectedRevision, nodeIds, targetPath, name, positions?, dryRun?}`. 순수 추출 함수는 원본을 변경하지 않으며 바깥 입력/출력의 ID·타입·fan-out과 내부 literal/파라미터/위치를 보존한다. 상수/파라미터 입력은 현재 값을 Preview에 복사한다. 계산된 입력은 타입 기본 Preview를 사용하고 호출의 실제 연결은 보존한다.
- 기존 `files.apply`로 생성 파일과 원래 문서 변경을 함께 저장한다. 새 경로 충돌/문서 revision/현재 shader 의존성·서명·순환을 먼저 검사한다. dryRun은 파일/문서/Undo를 바꾸지 않는다. Undo/Redo 한 번으로 양쪽을 복원하며 생성한 함수의 새 편집은 충돌 검사로 보호한다. 새 편집 없는 생성 함수 탭은 생성 Undo와 함께 닫는다.
- 렌더링 호출은 기존 `hb::Materials::Set`/BP materialSet과 Float API를 재사용한다. 정적 Bool은 인스턴스에서 작성하고 머테리얼/인스턴스를 적용한다. Float API를 Bool 쓰기로 사용하지 않는다. 이번 변경에 별도 SetStaticBool 함수는 추가하지 않았다.
- pin 이름은 간결한 영어, 설명/검색은 한글·영어를 유지한다. 벡터 literal은 다음 줄에 배치해 핀 이름이 한 글자씩 꺾이지 않게 한다.

## 검증

- 코어: typed 입력/분기/추출/Preview/rename/불변 실패·숫자 변환/Attributes/fan-out, 기존 함수/레이어/머테리얼/Float1000/파일 transaction/API/Main 검사를 통과했다. material nodes68, BP714, C++ 연결629를 유지한다.
- 실제 Editor `gpu-editor-BBInhr`: 우클릭 선택→이름→MF 파일/호출 교체, dryRun/보호 root/중복 경로 거절, 단일 Undo/Redo, 생성 함수 탭을 연 후 Undo, Bool/Texture 입력 UI·MI checkbox, 기존 viewport/BP/C++/수명 검사 통과. 텍스처 핀3·Bool 핀3·preview 선택기1·checkbox1. 최종 PNG를 읽어 이름과 벡터 배치도 확인했다.
- release GPU `gpu-scene-viFKGa`/GL `gpu-scene-PnhjVX`: false/red129600→true/cyan129600→반복 같은 색 영역, 실제 C++ `SceneGPU.ApplyMaterial`→기존 `hb::Materials::Set`으로 다시 red129600. 렌더링된 영역의 channel 차이를 검사했으며 화면 중심 샘플은 해당 fixture의 배경이므로 별도로 기록했다. PBR/tone mapping 이후 색이며 원본 RGB값 그대로라고 주장하지 않는다.
- 동일 상태 재방문은 geometry/texture 수를 유지했다. GPU inactive/active textures4/5, GL1/2로 사용하지 않는 텍스처는 하나 덜 할당한다. GPU의 기존65,537 입자·가림/수명·C++ 및 GL 기본 sprite/지연 로딩 검사도 통과했다.
- 세 실제 창 모두 final checked-file SHA 일치, 원본 보존, errors0/exit0/서버 종료. 증거와 이전 실패/수정은 [JSON](research/MATERIAL_TYPED_FUNCTIONS_078.json), 최종 `native/build/material-typed-core-final-078.log`/`material-typed-acceptance-078.log`에 있다. 두 사용자 MD는 원래 바이트 prefix를 그대로 두고 078 기록만 append했다. 장시간 스트레스 검사는 반복하지 않으며 shader branch/pixel 검사를 전체 FPS/RAM 목표로 세지 않는다.

## 남은 누적 세부

Cube/Array/Volume/External texture 포트, 개별 expression 미리보기/노드 thumbnail, 추가 shader domain·GI/lightmap/reflection/postprocess·층 height/influence/triplanar/detail/displacement, native DX11/HLSL 메인 렌더러는 남는다. Animation FullBody/ControlRig/Avatar·리타게팅 세부, NavMesh/복제/RPC, 월드/LOD/streaming/import·prefab variant, C++ 다중 소스/재적용/디버깅, 창·탐색·UI·오디오, 모바일 에디터/배포/실기기 및 AI 전체 작업은 051과 기존 분야 문서의 누적 요구를 유지한다. 작업 목록은 범위의 상한이 아니다.
