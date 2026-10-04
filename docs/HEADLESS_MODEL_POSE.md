# 화면 없는 모델 포즈 검사

2026-10-05. AI가 프로젝트를 실행해 뼈·모프 값을 확인하는 경로예요. 같은 AnimationGraphPlayer와 Three GLTFLoader를 사용해요. 실제 화면·음향 검사와 전체 엔진 연구 완료를 대신하지 않아요.

## 근거와 구현

[Three GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html)의 기술 본문에서 parseAsync/register와 scene/animations 반환 계약을 읽었어요. 설치된 GLTFLoader의 플러그인 선택·loadNode/loadSkin/createNodeMesh/loadAnimation도 대조했어요. [Khronos glTF 2.0](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html)의 버퍼/BIN padding·희소 접근자·애니메이션 channel/interpolation·GLB chunk 순서 본문을 읽었어요. 문서 전체·확장 전체를 분석한 것으로 세지 않아요.

`tools/headless-model.mjs`는 glTF/GLB의 계층·뼈·스킨·노드 이름·트랙·보간기를 같은 로더로 해석해요. 화면용 mesh는 속성 바인딩 대상만 만들고 정점과 머테리얼/텍스처 이미지를 읽지 않아요. 접근자에서 요청한 bufferView만 프로젝트 내부 파일/data/BIN에서 읽고 같은 buffer는 공유해요. 네트워크 주소나 브라우저 ProgressEvent 전역 대체가 필요하지 않아요.

CUBICSPLINE 키는 값과 앞뒤 탄젠트를 함께 저장해요. 공용 AnimationGraphPlayer는 track 전체 원소 폭 대신 interpolant의 실제 출력 폭으로 속성을 바인딩하도록 고쳤어요. 실제 Editor·Player·headless가 같은 수정 경로를 사용해요.

## 실행과 결과

`npm run run:project -- <절대 프로젝트.hbproject> <시나리오.json>` 또는 `runProject(file, options)`로 실행해요. 장면과 Blueprint 클래스의 컴포넌트를 준비한 다음, 모델 포즈를 읽고 그래프를 시작해요. 입력·C++ 함수·파라미터·정지/재개는 공용 서비스를 사용해요.

결과 JSON의 `animation`은 실행 중 그래프의 actor/asset/slots를 포함해요. 각 slot은 현재 바인딩 name/type/value예요. 마지막 프레임의 실제 포즈를 읽고, 실행 종료 전에 복사해요. 매 프레임 전체 뼈를 JSON으로 복사하지 않아요. 현재 단일 Animator mixer의 전체 포즈 snapshot은 이 필드에 추가하지 않았어요.

모델 자원은 Actor 파괴·장면 전환·성공/실패 종료에 정리해요. 사용자 장면/모델/C++ 소스와 저장 슬롯 파일을 쓰지 않아요. plain OBJ/FBX의 화면 데이터는 종전처럼 로직 검사에서 생략하고, 그 모델에 AnimationGraph를 연결하면 glTF/GLB가 필요하다는 오류를 반환해요.

## 제한과 증거

원본/외부 buffer 각각64 MiB, 실제 읽은 원본+buffer128 MiB, nodes10000·깊이128·buffers1024·accessors/bufferViews16384·meshes10000·skins/animations1024예요. 접근자 최대 원소 메모리64 MiB, 메시별 primitives256·morph targets64를 제한해요. 순환·중복 부모·GLB 순서/길이·읽는 bufferView 범위·짧은 buffer·잘못된 base64·프로젝트 밖 경로를 거절해요. 전체 glTF schema 검증기는 아니에요. GPU instancing과 압축 포즈 buffer 디코더는 이 경로의 후속이에요. 실제 렌더 비용·프레임 속도를 새로 측정한 것으로 표시하지 않아요.

`test:headless-model`은 별도 프로젝트에서 외부/inline/BIN, LINEAR/STEP/CUBICSPLINE·희소 값·회전·정규화 정수 morph, 노드 weights, vertex/texture 미읽기, 범위/경로 실패, 중복 dispose, runProject 포즈/원본 보존을 검사해요. 선택 인자로 소유한 `native/build` fixture의 .hbproject를 주면 실제 Player acceptance의 같은 슬롯 값과 BP/C++ Set/Get·Pause/Resume도 대조해요.

최종 수치 단위 근거는 `native/build/headless-model-CwArCG`, 실제 release Player와 대조한 근거는 `headless-model-VKait2`예요. 실제 CUBICSPLINE 모델을 포함한 Player `animation-graph-player-FSFCTK`와 Editor `animation-graph-editor-f5atg7`는 포즈·핀/차트/미리보기·BP/C++·원본·정상 종료/소유 서버 정리를 통과했어요. Editor model-preview PNG의 글씨·뼈대 삼각형을 확인했어요. 기존 headless/runtime/integration/animation-graph/API 검사도 통과했어요. 실패 근거는 DEBUG_HANDOFF에 보존해요.
