# 101 — 오브젝트 이동과 모션 벡터 모드

100의 TAA·카메라 모션 블러에 불투명 메시의 이전 월드 변환을 연결했어요. 카메라가 정지해 있어도 메시가 이동하면 그 표면의 이전 화면 위치를 사용해요. Mesh Renderer의 **모션 벡터**에서 `오브젝트와 카메라`, `카메라만`, `모션 없음`을 선택해요.

```cpp
hb::Components::SetString(actor, "MeshRenderer", "motionVectors", "perObject");
hb::Components::SetString(actor, "MeshRenderer", "motionVectors", "camera");
hb::Components::SetString(actor, "MeshRenderer", "motionVectors", "none");
```

기존 Components 문자열 노드·속성 편집·AI 컴포넌트 패치가 같은 선택지 검증을 사용해요. 장면 제작 상태에 저장하고 런타임 렌더러까지 전달해요. 이전 프로젝트의 기본값은 `perObject`이며 TAA/모션 블러를 켜기 전에는 이 GPU 자원을 만들지 않아요.

## 이력과 합성

뷰포트마다 약한 참조로 메시와 이전 변환을 소유해요. 이전 프레임에 보이지 않았거나 새 메시·정점/index 변경·전역 이력 초기화·실패한 프레임이면 해당 표면을 과거 색과 혼합하지 않아요. 한 프레임에 여러 머테리얼 슬롯으로 그려도 이전 변환을 유지하고 프레임이 성공한 뒤 다음 이력으로 옮겨요.

RGBA16F에는 이전 UV와 깊이, 현재 깊이/이력 유효 표시를 담아요. 합성 시 원본 깊이와 맞는 데이터만 사용하고 현재·이전 TAA 미세 투영 이동을 속도에서 빼요. `none`은 카메라 이동도 제거하며 `camera`는 기존 깊이 기반 카메라 이동을 사용해요. 원본 alpha와 자동 노출, 굴절·블룸·색 보정은 기존 순서를 유지해요.

DirectX는 기존 장면 draw의 네 번째 MRT 출력과 세 상수 버퍼를 재사용해요. 모션 텍스처는 추가 8바이트/픽셀이며 반사/GI만 켜면 만들지 않아요. WebGPU도 필요한 MRT 출력만 추가해요. WebGL은 ShaderMaterial override로 별도 모션 draw와 자체 깊이 버퍼를 만들고, 장면 override/background/clear/target 상태를 `finally`에서 복구해요. 추가 장면 draw 비용이 있어요. 모든 모드 변경·해제는 기존 뷰포트 자원 수명에 참여해요.

WebGPU 장면 패스는 HB 프레임마다 한 번 직접 갱신해요. Three의 별도 RAF 번호에 의존하지 않으므로 같은 RAF 사이의 수동 캡처에도 이전 월드와 원본 색이 갱신돼요. MRT 모션 그래프는 렌더러가 공유하고 현재 뷰포트의 이력을 주입해요. 기능 전환 뒤 이전 뷰포트의 uniform 콜백을 참조하는 문제를 막고 프레임 종료 시 뷰포트 참조를 해제해요.

## 묶음 검증

DirectX·WebGL2·WebGPU의 격리된 Windows 실행 창에서 실제 C++ 설정과 J 키 블루프린트 전환, 카메라가 정지한 상태의 메시 이동, 카메라만/모션 없음, 정지 영역 색상 보존을 확인했어요. 이전 098–100의 굴절·GI·후처리·카메라 TAA도 함께 통과했어요. 네이티브 전체 60종 머테리얼과 2D·뼈/모프·인스턴스·파티클·그림자 회귀, 이후 변경한 `none` 표시의 focused GPU 검사, 공용 AI·API·범위 검사를 기록해요.

RGBA8 캡처의 1단계 변환 차이는 RGB ±2까지 허용하고 alpha는 동일하게 검사해요. 이동 경계는 이 허용값을 넘는 변화가 있어야 하며, 무늬가 없는 영역은 별도로 색상을 보존해야 해요. 실패했던 검사를 통과 자료로 사용하지 않아요. WebGPU 생성 셰이더의 void 분기 변수는 블록 콜백으로 고쳤고, J 키는 준비 상태 대신 실제 컴포넌트의 변경을 기다려 확인해요. 카메라 검사 좌표도 부모 변환을 반영한 월드 위치로 보정했어요.

## 공식 설명과 실제 범위

[Unity 6000.0의 정의](https://docs.unity3d.com/6000.0/Documentation/Manual/urp/features/motion-vectors.html)에서 카메라와 오브젝트의 화면 이동, 불투명/알파 클립 지원을 확인했어요. [패스 설명](https://docs.unity3d.com/6000.0/Documentation/Manual/urp/features/motion-vectors-render-pass.html)의 후처리 이전 계산과 [세 선택지](https://docs.unity3d.com/6000.0/Documentation/Manual/urp/features/motion-vectors-reference.html)를 제작·실행 계약에 대응했어요. HB의 실제 이전 변환 지원은 **rigid 메시** 범위예요.

[Unreal 5.8의 이전 프레임 월드 오프셋 API](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/UMaterialExpressionMotionVectorW-) 자체 선언/필드/함수 요약은 읽었어요. Experimental 표시와 입력의 이전 프레임 의미를 보존했으며, 해당 사용자 정의 오프셋 노드를 구현했다는 근거로 쓰지 않아요. TSR 문서는 제목만 반환했고 부분 조회가 실패했으므로 본문 미독으로 기록해요. 전체 본문·API·엔진 등가성으로 계산하지 않아요.

이전 뼈/모프/개별 인스턴스·파티클·사용자 정점 애니메이션은 아직 카메라 이동 경로를 사용해요. `none`의 현재 뼈/모프/인스턴스는 기존 정점 변환을 사용하지만 이전 포즈 모션 검증은 별도예요. 투명 표면과 2D 전용 효과도 이번 rigid 모션 수신 대상에 포함하지 않아요. 자동 CPU GPU 읽기는 추가하지 않으며 실제 휴대폰/게임 FPS·전체 VRAM을 측정한 기록은 아니에요.

WebGL 모션 패스의 알파 클립은 기본 UV의 map alpha만 사용해요. 별도 alphaMap·UV 변환/채널·displacement 정점에 대한 정확한 재현은 이번 창 검사 범위 밖이에요. 깊이가 다른 표면의 모션은 합성에서 거부하지만 이 방식이 해당 정점/클립 지원을 대체하지는 않아요.

검사 파일 SHA·실패/보정·제품 해시·설치 결과는 [기계 기록](research/RENDERING_101.json)과 [설치 영수증](research/USER_INSTALL_101.json)에 남겨요.
