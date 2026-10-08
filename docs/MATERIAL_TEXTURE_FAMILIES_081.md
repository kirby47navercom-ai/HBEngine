# 큐브맵·텍스처 배열·볼륨 텍스처 — 081

## 읽은 근거와 적용

[Unity Shader Graph 17.0.4 Sample Cubemap](https://docs.unity3d.com/Packages/com.unity.shadergraph@17.0/manual/Sample-Cubemap-Node.html), [Sample Texture 2D Array](https://docs.unity3d.com/Packages/com.unity.shadergraph@17.0/manual/Sample-Texture-2D-Array-Node.html), [Sample Texture 3D](https://docs.unity3d.com/Packages/com.unity.shadergraph@17.0/manual/Sample-Texture-3D-Node.html)의 자체 본문·표·생성 코드 전체를 읽었다. 큐브는 월드 방향/LOD, 배열은 UV/인덱스, 볼륨은 3차원 UV로 샘플링하는 계약을 적용했다. 배열 문서의 일부 표/설명에 3D라는 이름이 섞인 오류는 구현 타입으로 복사하지 않았다. 연결 문서·미디어·Unity 구현 소스는 이 단계에서 읽었다고 계산하지 않는다.

[Unreal 5.8 Texture Asset Editor](https://dev.epicgames.com/documentation/en-us/unreal-engine/texture-asset-editor-in-unreal-engine)의 자체 본문 중 에셋 종류·편집기·DDS 면 순서·슬라이스·LOD·압축·텍스처 설정(Mip Load Options까지)을 읽었다. 원본 이미지 목록을 에셋으로 관리하고 DDS의 +X/−X/+Y/−Y/+Z/−Z 순서를 적용했다. 후반 본문과 연결 문서/미디어는 미독이다. HTML 가져오기는 403이라 web 응답 발췌/SHA를 보존했다.

설치 Three 0.180.0의 [CubeTextureNode](https://github.com/mrdoob/three.js/blob/r180/src/nodes/accessors/CubeTextureNode.js), [Texture3DNode](https://github.com/mrdoob/three.js/blob/r180/src/nodes/accessors/Texture3DNode.js) 자체 파일 전체 및 [TextureNode](https://github.com/mrdoob/three.js/blob/r180/src/nodes/accessors/TextureNode.js)의 level/depth 메서드를 읽고 공식 r180 원문과 바이트/SHA를 대조했다. TSL의 큐브 X 방향 변환을 보정해 두 렌더러가 동일한 DDS 면을 선택한다. 새로운 보조 source 계열과 발견 provenance를 원장에 등록했으며 전체 corpus gate는 false다.

## 제작·실행 계약

- 콘텐츠 브라우저에 큐브맵(`.hbcubemap.json`), 텍스처 2D 배열(`.hbtexturearray.json`), 볼륨 텍스처(`.hbvolumetexture.json`)를 추가했다. `version/name/dimension/images`가 사람이 읽고 AI가 수정하는 공통 데이터다. 전용 폼에서 면/슬라이스 이미지를 지정하고 배열·볼륨 목록을 추가/삭제/이동한다. 작성 중 빈 슬롯은 허용하며 렌더할 때는 모두 지정해야 한다.
- Sample/Object/Parameter 각 세 노드, 총 아홉 노드를 추가해 머테리얼 카탈로그는 77종이다. `texturecube/texturearray/texture3d` 핀은 서로 섞이지 않는다. 함수 입력·출력·추출·미리보기·Static Switch·MI·레이어 파라미터와 공용 CPU/GLSL/TSL 경로를 사용한다. 에셋 드롭은 기존 2D 이미지까지 여러 샘플 노드를 한 편집으로 추가한다.
- 큐브는 월드 노멀을 기본 방향으로 삼고 연결/리터럴 방향 및 LOD를 받는다. 배열 인덱스는 가장 가까운 정수 레이어를 선택한다. 볼륨 UV는 이미지 순서에 따라 보간한다. 각 샘플의 sRGB/Linear, Repeat/Clamp와 RGBA/RGB/R/G/B/A 출력을 유지한다.
- 큐브 면은 같은 크기의 정사각형, 배열·볼륨은 같은 크기의 이미지여야 한다. 안전한 로컬 Assets 이미지 경로, 실제 GPU의 차원/레이어 한도를 검사한다. 배열/볼륨 변환은 한 이미지씩 진행하고 RGBA 버퍼와 텍스처는 생성 시 업로드한다. 매 프레임 파일 읽기/변환을 추가하지 않는다.
- 텍스처 에셋과 하위 이미지가 의존성/이름 변경/기존 배포 경로에 들어간다. 수정·저장이 머테리얼 캐시를 무효화한다. 새 종류의 로딩 실패는 기존 미리보기/장면 머테리얼을 유지하며 실패 후보 자원을 해제한다. 기존 `hb::Materials::Set`로 이 머테리얼을 적용하는 경로를 사용하며 C++에 새 텍스처 교체 함수가 생겼다고 표현하지 않는다.

## 검증과 계속할 세부

코어 묶음은 타입·함수/추출/정적 분기·MI/미리보기·CPU/GLSL·참조/이름 변경·실패 보존·장치 한도·예전 그래프 없는 머테리얼을 확인했다. 기존 함수·typed·108 출력 미리보기·77종 머테리얼·문서/에셋·BP 714/공용 C++ 서명 회귀도 통과했다. 에셋 검사 harness가 새 전역 DOM listener까지 잘라 실행하던 경계를 실제 문서 닫기 함수들로 고쳤다.

분리 WebGL2/WebGPU 창에서는 여섯 큐브 면의 서로 다른 색, 배열 0/1, 볼륨 앞/뒤 및 가운데 보간, resource 노드 미리보기, 이미지 순서 폼, 잘못된 패치 보존, Undo 후 원상복구와 소스 SHA·원본 바이트·오류/종료·서버 정리를 검증한다. 결과/실패 기록과 각 코드 기준은 [증거 JSON](research/MATERIAL_TEXTURE_FAMILIES_081.json)에 있다. 검사는 `npm run test:material-texture-families`, `npm run test:material-texture-families-editor[-gl]`이다. 배포 플레이어/C++ 적용을 이 단계에서 새로 실측한 것으로 계산하지 않는다.

Sampler State 노드·배열/볼륨 mip chain·외부/HDR/압축 컨테이너·텍스처 전용 채널/mip/3D 검사 뷰·런타임 텍스처 파라미터 교체·색 공간 보간의 정밀 대조는 후속 세부다. 모바일 실물·전체 게임 FPS/RAM·장시간 안정성과 누적 선행 목표도 유지한다. 설치본은 051 순서에 따라 갱신 대기다.
