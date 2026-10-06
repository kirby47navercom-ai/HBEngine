# 036 파티클 렌더러 조작·내부 흐름 대조

2026-10-06. 이전 조사033~035의 조명에 이어 렌더러 자체의 세부 속성과 함수 목록을 대조한다. 관련 전체 문서·상속 API·Niagara 전체 기능의 완료를 뜻하지 않는다.

| 공식 자료 | 보존 SHA / 읽은 범위 |
|---|---|
| [Unity6000 Renderer 모듈](https://docs.unity3d.com/6000.0/Documentation/Manual/PartSysRendererModule.html) | 2bc3b8d7aa9f111cbebf1beda668d064c24a7863997196144690d6a2b7d5ff59. 자체 기술 본문·속성 표. 연결 문서·이미지 제외 |
| [ParticleSystemRenderer 자체 API](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/ParticleSystemRenderer.html) | b0e020859e114b177142c69a310a764ecc4577cf7acd7b1695b498d85abc478a. 자체 설명·속성/12메서드 요약, 각 연결 함수 본문·상속 제외 |
| [maskInteraction 자체 API](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/ParticleSystemRenderer-maskInteraction.html) | 08d20abef09ee7a1ad73b57244b571d2dc34f698b13fbc30bb38a13f2b347aad. 선언·본문·예제 |
| [SpriteMaskInteraction](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/SpriteMaskInteraction.html) | 484e00ce0d18e43618f65c81464ee25a48dceaff514f4f6b763966e4c30db7e2. 자체 설명·3값 |
| [UE5.8 Niagara Renderer](https://dev.epicgames.com/documentation/unreal-engine/render-module-reference-for-niagara-effects-in-unreal-engine?lang=en-US) | 9cd8a0d9d86d8ee59f5373cedc99a810ec8493e94abe795b53cdc85f63cdd28d. 웹 reader 응답 SHA(원시HTML 아님). Sprite 자체150~205행 설명·표. 다른 renderer 전체·이미지·연결/멤버 본문 제외 |

원본·reader 응답은 native/build/particle-renderer-source-036/manifest.json에 구별해 보존한다. 기존27계열에 발견 주소를 추가하고 discoveryClosed나 독립 분석/API/corpus gate는 올리지 않는다.

## 조작/데이터에서 실행까지의 결손 목록

아래는 이번 공식 표를 현재 코드와 대조한 결과다. 표시한 대기 항목을 완료로 계산하지 않는다.

| 조작·속성·함수군 | HBEngine 현재 연결과 남은 구현 |
|---|---|
| Renderer 전체 순서와 개별 파티클 정렬 | 레이어·레이어 안 순서는 이번 공유2D 순회에 연결. 개별 distance/depth/age/custom 정렬 및 sorting fudge는 대기 |
| Sprite Mask none/inside/outside | 이번 컴포넌트/공용 mask 타깃·셰이더·SortingGroup 범위에 연결 |
| billboard/stretch/horizontal/vertical/mesh/none | 현재 Points 카메라 평면 표시만 있음. 다른 모드와 속도/카메라 기반 늘이기는 대기 |
| mesh 배분·weights·GPU instancing | 전용 mesh 배열·가중치·GPU 실행이 없어 대기 |
| alignment/facing/roll/pivot/flip/크기 제한 | 카메라 투영 크기만 적용. 나머지는 전용 quad/mesh 렌더러와 계약 필요 |
| 머테리얼·trail material·vertex/trail streams | texture/color/alpha-additive만 연결. 사용자 머테리얼 입력/stream과 trail 구현 대기 |
| particle color space·normal·shadow/motion/probe/anchor | 자체 파티클 셰이더에는 해당 파이프라인 연결이 없어 대기 |
| SubUV·보간·속성 binding·cutout | Sprite sheet frame과 VFX 변수 공통 자료는 있으나 파티클 GPU renderer까지의 연결은 대기 |
| BakeMesh/Texture/TrailsMesh/TrailsTexture | 자체 API 요약 확인. 실제 snapshot/결과 에셋 계약과 각 함수 본문 분석/구현 대기 |
| active vertex/trail stream Get/Set·Meshes/Weightings Get/Set | 자체 API 요약 확인. 파티클 GPU layout·에셋참조·효과 속성 UI를 함께 연결할 후속 |
| Niagara의 component/light/mesh/ribbon/decal renderer | 이번 Sprite 설명에서 추가 renderer 발견. 전체 본문·속성/실행별 조사와 모듈 구현 대기 |

Unity의 시스템 전체 순서와 개별 파티클 순서는 별개다. Niagara도 emitter 표시 순서와 입자 sort/binding을 구별한다. 이번 정렬 레이어 연결을 개별 입자 정렬 완료로 표시하지 않는다.

## 구현·검사

- ParticleSystem Renderer에 sortingLayer와 기존 sortingOrder, maskInteraction을 공유 metadata로 제공한다. Scene/BP 같은 속성 편집기를 그대로 사용하고 AI도 같은 필드를 읽는다. hb::Components의 SetString/GetString/SetFloat/GetFloat와 대응 BP 노드로 실행 중 편집한다.
- 기존 Points가 objectId/draw2d에 등록되지 않아 공유2D 순회가 제외하던 곳을 연결한다. 파티클 fragment에 기존 mask hook의 표준 삽입 지점을 제공해 ShaderMaterial에도 동일 inside/outside 처리와 범위·group·타깃 해제를 적용한다. none이 기본이며 사용하지 않으면 mask 타깃을 만들지 않는다. perspective의 기본layer/order0·mask none·group없음 파티클은 Three의 기본 깊이 정렬을 유지하고, 2D 카메라 또는 명시한 layer/order/mask/group에만 공용 정렬을 사용한다.
- 렌더 버퍼 갱신의 입자별 Vector3·위치/색 임시배열, 프레임별 역행렬 clone을 재사용으로 바꾼다. local에서는 역행렬을 계산하지 않는다. emitter별 viewport Vector2도 재사용한다. 별도 효과 CPU/FPS 향상 수치는 측정하지 않았으며 시뮬레이터 내부의 모든 할당을 제거했다는 뜻이 아니다.
- tools/check-particle-renderers.mjs는 실제 C++의 같은 호출 Get/Set과 frontend 갱신3회·잘못된 mode/layer/order의 무변경 거절·BP/AI metadata, 최종 버퍼 world/local 좌표·원본 보존·색/알파 보간·viewport 재사용을 통과했다. 기존 check-scene-systems의 시뮬레이션/버퍼/실제 VM 검사도 통과했다.
- 실제Windows Player native/build/authoring-window-wlEr8c/acceptance.json은170개/조명111개/errors0/C++검증을 통과했다. 추가9개는 inside/outside·none 타깃해제·스프라이트 레이어/순서·SortingGroup 외부/내부 mask·셰이더 링크다. 최종 GPU에는 임시객체 재사용과 기본3D 파티클의 perspective/투명 오브젝트 깊이 순서 보존도 포함했다. CPU 버퍼·좌표·색/viewport 동일성 검사와 Scene/BP Renderer 필드 순서 검사도 최종 소스에서 통과했다.
- 앞 iOS 광원검사950f에는 이 파티클 변경을 포함하지 않는다. 새 파티클의 실제 모바일 실행/성능·발열은 따로 검증한다. 원본 게임·에셋·사용자 창은 변경하지 않는다.

새 모바일 예제에는 실제 ParticleSystem과 SpriteMask도 포함한다. 누락 정렬 레이어의 기본값은 공용 Renderer에 먼저 적용하고 같은 missing-field 조건의 volume GPU 회귀를 추가해 기본/구형 장면 모두 확인한다.

최종 모바일공용 native/build/mobile-player-uT5pYZ: C++2AOT/질의/시간·UI/오디오/새cookie·particle-mask 포함 iOS 프로젝트 출력 통과. 실제 WKWebView 결과는 해당 수정 커밋에서 별도로 기록한다.
