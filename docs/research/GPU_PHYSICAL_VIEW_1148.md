# GPU 물리 시선·얇은 막·명시적 읽기 — 1145~1148

2026-10-21. 1140 이후 지정 로컬 소스의 새 읽기와 재읽기예요. 전체 UE/Unity 문서·API 분석 gate는 승격하지 않아요. 아래 범위 외의 미독·누적 원장 잔여는 유지해요.

## 읽은 본문과 연결

설치된 Three 0.180.0의 `src/nodes/accessors/Position.js`, `AccessorsUtils.js`, `materials/nodes/NodeMaterial.js`, `MeshStandardNodeMaterial.js`, `MeshPhysicalNodeMaterial.js`, `renderers/common/nodes/NodeLibrary.js`, `nodes/core/VarNode.js`·`AssignNode.js`·`StackNode.js`, `nodes/tsl/TSLCore.js`의 소유·변환·시작 순서를 대조했어요. `PhysicalLightingModel.js`의 start가 상위 조명 시작 중 direct/indirect를 이미 소비하므로 start 반환 뒤 교체하는 방식은 유효하지 않았어요. 물리 모델의 첫 소비 직전에 빌더 소유 값을 준비해요.

`nodes/functions/BSDF/DFGApprox.js`, iridescence 함수, `ShaderChunk/iridescence_fragment.glsl.js`, `lights_physical_pars_fragment.glsl.js`, `lights_fragment_begin.glsl.js`, 공용 Schlick, `math/Matrix3.js`, `nodes/core/NodeUtils.js`를 대조했어요. TSL mat3의 JS Matrix3 숫자 생성은 행 기준이고 GLSL 생성자는 열 기준이에요. 얇은 막 분광 합의 XYZ→RGB를 명시적 dot 행으로 고쳤어요. GL 다중 산란 호출은 이름이 F0인 인자에 막 Fresnel을 전달하므로 호출부의 실제 값에 맞췄어요. 이것을 물리적 F0와 같다고 해석하지 않아요.

`ViewportTextureNode.js`, 공용 Renderer의 복사·읽기, `webgl-fallback/WebGLState.js` 및 `WebGLTextureUtils.js`의 copyFramebufferToTexture/copyTextureToBuffer를 읽었어요. 기존 읽기는 상태 캐시 밖에서 READ FBO를 바꾸고 복원하지 않아 다음 프레임 복사가 GL1282를 냈어요. 임시 PBO 해제도 빠져 있었어요. Float32 블렌딩 가설은 HalfFloat에서도 재현돼 기각했고, 실제 상태·소유 문제를 고쳤어요.

이 문서의 Three 경로는 `node_modules/three/src/` 기준이에요. 대응 [공식 r180 소스](https://github.com/mrdoob/three.js/tree/r180/src)와 [MIT 라이선스](https://github.com/mrdoob/three.js/blob/r180/LICENSE)를 참조해요. 포팅한 간섭 합의 저작권·허가문은 엔진의 THREE_MIT_LICENSE.txt에도 보존해요.

## 구현과 실제 근거

- 1145-SQ1mnK: GPU/강제 GL 폴백 각각 시선 24조건·물리 16조건. 이전 원본 노드 직교 시선 오차 0.3000000119를 재현한 뒤 수정 오차 4.18e-8 미만, 평면 불변 오차 0. 금속·코팅·sheen·이방성·얇은 막·IOR 및 막 두께0/0.001/가중치 제한을 GL 기준과 대조해 최대0.001628, 기존 절대0.002/상대0.006 기준을 유지해요. 환경은 양쪽이 공유하는 지정 gradient CubeUV이며 자연 환경 전체 검증은 아니에요.
- 1146-VdoCCE: 독립 배정밀도 분광 합 31조건씩, GPU 오차4.52e-7/폴백6.59e-7, 기존2e-5 기준 유지. 막 두께·입사각·기본색·전반사를 포함해요. 원본 굴절의 오차0.0433을 재현한 뒤 원본 DFG 기준0.001312/작성 레이어 Schlick 기준0.000333으로 기존0.002를 통과했어요. 두 에너지 정책은 통합하지 않았어요.
- 같은 1146의 폴백 읽기 29조건: byte/half/float·큐브0/3/5면·패킹 설정 복원·읽기를 기다리는 중 다른 렌더 실행·fence 실패를 포함해요. 성공/실패 뒤 임시 FBO/PBO 잔류0이에요. 생산 프레임에 새 읽기 호출이나 GL 오류 계측은 추가하지 않았어요.
- 전역 프로브1117의 현재 변환 훅과 실제 C++/BP1147·최종 설치 검사는 ENGINE_WORK_1149.json 및 후속 설치 영수증에서 별도로 연결해요. 미실행 경로를 위 소스 검사로 대체하지 않아요.

실패한 실험·검사 fixture 수정은 DEBUG_HANDOFF에 별도로 남겨요. 예상값은 독립 해석값·지정 환경·동일 GL 소스로 구분하며 임계값을 늘리지 않았어요. 실제 게임에서는 단일 방향광과 균일 평면의 화면 중앙 밖 불변성, C++ 이동/재질 편집과 BP 복원을 검사해요. 백엔드마다 다른 에너지·톤 곡선의 전체 동등성을 요구하지 않아요.

자원 비용: 추가 엔진 소유 GPU 버퍼/이미지/타깃·운영 readback·프레임별 재질 순회0. 기존 행렬의 단계별 uniform 배치와 간섭 셰이더 연산은 존재해요. 폴백 명시 읽기는 상태 조회와 기존 한 번의 readPixels·fence를 사용해요. 전체 FPS/초기 컴파일 개선의 근거는 아니에요. native13 소유자가 같으면 Player1139/Host1041을 재사용해요. 다음 조사 대상은 전역 프로브 공간 순위 가속과 큰 장면 비용, 임의 재질·기하 로브 조합/이력이며 전체78행은 그대로예요.
