# 090 — DirectX 뼈대 애니메이션·모프와 공용 함수

Windows `d3d11` 장면에 GPU 뼈대 변형과 모프를 연결했어요. 기존 임포트·클립·Animation Graph·몽타주·IK의 포즈 계산을 재사용하고, 같은 vertex shader를 본 화면과 alpha 컷아웃 그림자에 사용해요. 기존 2D/SVG·투사체·HLSL·HDR 경로도 유지해요. 사용자 설치본의 갱신은 누적 선행 작업 뒤에 진행하는 기존 순서를 유지해요.

## 제작과 실행

C++ `hb::Morphs::GetNames`, `GetWeight`, `SetWeight`와 블루프린트 `morphNames`, `morphWeight`, `morphSetWeight`를 같은 서비스에 연결했어요. 한글·영문 검색과 핀은 Game.hpp에서 생성한 기존 노드 카탈로그를 사용해요.

```cpp
auto names = hb::Morphs::GetNames(player);
hb::Morphs::SetWeight(player, "Smile", .5f);
float weight = hb::Morphs::GetWeight(player, "Smile");
```

같은 모프 이름이 여러 메시에서 발견되면 `mesh` 인자로 메시 이름을 지정해요. 애매한 대상이나 없는 이름, 유한하지 않은 가중치는 오류를 반환하고 일부 대상만 임의로 수정하지 않아요. 음수와 1을 넘는 유한 가중치도 그대로 전달해요. Unity의 0~100 표시와 달리 HB/Three의 기본 변형 가중치는 0~1이에요. 같은 속성에 애니메이션 트랙이 있으면 다음 애니메이션 틱이 직접 지정한 값을 덮어써요. 직접 제어할 때는 해당 트랙을 정지하거나 그래프 파라미터를 사용해요.

초기 로드와 포즈 갱신의 `gameplayDebug.morphs` 목록은 C++ 읽기·실행 진단·AI 상태 조회가 공유해요. C++에서 Set 뒤 Get을 같은 함수 안에서 호출할 때도 지정한 값을 읽어요. WebGL/WebGPU와 네이티브 서비스에 별도 게임 규칙을 복제하지 않아요.

## GPU 변형과 자원

- 정점당 네 뼈 인덱스·가중치 32바이트, 모프 대상당 정점 위치·법선·색상 델타 48바이트를 정적 구조 버퍼에 올려요. 상대/절대 모프는 공용 변환에서 델타로 맞춰요. RGB/RGBA의 기본 알파와 없는 기본 법선도 처리해요.
- 포즈는 `bindMatrixInverse × boneMatrix × bindMatrix` 행렬과 모프 가중치예요. 바인드 역행렬의 이동도 한 vec4에 담아 뼈 가중치 합이 1이 아닐 때 합성 행렬의 이동을 보정해요. 세 DEFAULT 구조 버퍼를 순환하고 변경된 포즈만 UpdateSubresource로 전송해요. 가중치 변경이 기본 메시를 재생성하지 않아요.
- vertex ID로 모프 델타를 조회하고 모프 → 뼈대 → 인스턴스 → 오브젝트 변환 순서로 적용해요. 법선은 Three의 선형 뼈대 혼합과 같은 행렬 경로를 사용해요.
- `deformations`, `deformationBufferBytes`, 누적 `poseUpdates`를 실행·AI 렌더 스키마에 노출해요. bytes는 버퍼 자료 크기 추정치이며 드라이버 VRAM이나 전체 RAM이 아니에요.
- 소유 장치, 자료 크기·stride, 뼈 인덱스·가중치, 유한 값, draw 정점 개수와 포즈 준비를 검증해요. 바이트 크기 곱셈은 먼저 나눗셈 경계로 검사해 넘침을 막아요. dispose·장면 reset·실행 종료에서 해제해요. 정상 프레임에 위치/이미지를 회수하지 않아요.

최소 실제 Windows 검사 모델의 버퍼 추정치는 608바이트예요. 모델 수를 500/1000개로 제한하는 규칙을 추가하지 않았어요. 장치의 실제 버퍼 크기·메모리 제한은 적용돼요.

## 검증

정확한 경로·SHA·통과 항목은 [증거 원장](research/NATIVE_DEFORMATION_090.json)에 기록했어요.

- 실제 GPU: 뼈대 혼합 이동, 모프 위치·법선·색상과 음수 가중치, 모프 후 회전 뼈대의 순서, skin-only/morph-only, 변형 그림자, 12프레임 포즈/메시 재사용과 잘못된 자료 거부. 기존 54종 HLSL·광원/그림자·HDR·인스턴스 검사도 통과했어요.
- 격리 Windows 게임: glTF 모델과 포함된 클립을 Animation Graph로 재생하고 C++·H 키 BP로 뼈/모프 포즈를 변경했어요. C++ 모프 이름 조회·Set/Get과 J 키 직접 지정이 화면 픽셀까지 도달했고 장면 전환에서 bytes가 0으로 돌아왔어요. 기존 SVG/한글 HUD/입력·이동·그림자·블룸·2049 투사체/여백·종료 검사도 통과했어요.
- 공용 JS: Three의 실제 정점 변환과 결과를 대조했어요. 자료 경계·색상 알파/기본 법선·중복 이름·없는 대상·서비스/노드 생성·희소 포즈·정적 메시 재사용·수명을 확인했어요. 기존 애니메이션 그래프와 렌더 자원 소유권 검사도 통과했어요.

검사 준비 과정의 빌드 장면 목록 누락, 애니메이션 틱 전 캡처, 반환값 필드 오독은 실패 증거와 함께 남겼어요. 통과 결과를 대신한 임의 픽셀이나 프레임 수치를 만들지 않았어요.

## 읽은 근거와 차이

[Unity 6000.0 Skinned Mesh Renderer](https://docs.unity3d.com/6000.0/Documentation/Manual/class-SkinnedMeshRenderer.html)의 소개·Properties·Materials 구역에서 변형 종류, 뼈 영향 수, bounds/offscreen, 머테리얼 계약을 확인했어요. Unity의 최대 32 영향과 품질 선택을 HB에 모두 구현한 것은 아니며 이번 GPU 입력은 네 영향이에요.

[Unity Blend Shapes](https://docs.unity3d.com/6000.0/Documentation/Manual/BlendShapes.html)의 자체 기술 본문과 예제에서 임포트, 가중치 키 편집·미리보기·스크립트 접근을 확인했어요. 이번 변경은 기존 임포트/애니메이션 실행과 직접 함수를 연결하며 Unity 편집기 메뉴 전체를 복제한 결과가 아니에요.

[UE 5.8 FBX Morph Target Pipeline](https://dev.epicgames.com/documentation/en-us/unreal-engine/fbx-morph-target-pipeline-in-unreal-engine)의 자체 글에서 모프 제작·명명·export/import·Sequence/Curve·기존 데이터 덮어쓰기 설명을 읽었어요. HB의 기존 Three 임포터에 Unreal FBX 2020.2 호환성이나 전체 FBX 옵션 동등성을 부여하지 않아요.

[Microsoft semantics](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-semantics)의 system-value 구역과 [indexed vertex ID 설명](https://learn.microsoft.com/en-us/windows/win32/direct3d11/d3d10-graphics-programming-guide-input-assembler-stage-using)의 VertexID 구역을 읽고 인덱스 기준 변형 조회에 반영했어요. Three r180의 skin/morph shader chunk와 Skeleton.update 지정 코드도 대조했어요. 원문 SHA와 지정 읽기/미독 경계는 원장에 남겼으며 연결 API·미디어·전체 문서의 독립 검증은 승격하지 않았어요.

## 남은 경계

네 영향 초과 스킨 품질, dual quaternion/cloth, 인스턴스별 모프 텍스처는 별도예요. 뼈대가 bind pose bounds 밖으로 나갈 때 사라지는 문제를 피하려고 변형 메시의 camera/shadow frustum 제외를 보류했어요. 정확한 보수적 animated bounds/GPU culling을 연결하기 전에는 많은 offscreen 변형 모델이 draw 비용을 늘릴 수 있어요. 모프 GPU 자료와 포즈가 메시별로 있어 공유 형상/골격을 여러 인스턴스가 쓸 때 더 줄일 여지도 있어요.

네이티브 GI/반사·ParticleSystem·2D 마스크/광원·텍스처 계열과 누적 세부 요구는 계속 연결해요. 실제 전체 게임 PC 120/모바일 60fps, 전체 프로세스 메모리, 폰 발열/실기기·iOS·장기 실행을 이번 증거로 합격 처리하지 않아요.
