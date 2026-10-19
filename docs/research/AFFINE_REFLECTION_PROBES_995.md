# 회전·비균일 크기·전단을 따르는 반사 영역

기존 프로브는 월드 AABB로 영향·투영을 계산해 회전한 얇은 방 바깥까지 반사가 새었어요. 저장된 오브젝트 Transform과 ReflectionProbe의 크기·오프셋을 그대로 사용하면서, 전체 affine 역변환으로 실제 여섯 면의 안팎과 광선 출구를 계산하도록 바꿨어요. 부모 전단·음수 크기·비균일 크기도 포함해요. 기존 월드 AABB는 표시·호환용으로 유지해요.

월드 위치와 광선은 같은 world-to-local 세 행으로 변환해요. 광선은 다시 정규화하지 않아 구한 t를 월드 위치에 그대로 적용할 수 있어요. 영향 페이드는 역변환 행의 길이로 각 면까지의 거리를 월드 단위로 환산해요. 평행 축·영벡터 광선·영 출구 방향도 정의하며, 특이·비유한·float로 표현할 수 없는 변환은 바인딩하지 않아요. CPU, GLSL, TSL, 최적화된 HLSL이 같은 계약을 사용해요.

캡처 위치나 캡처 입력을 바꾸지 않고 영역만 회전하면 기존 큐브맵을 재사용해요. 새 렌더 타깃·샘플러·상주 캐시는 없어요. 네이티브 ProbeSettings가 64→128바이트로 커지며 기존 세 상수 버퍼의 두 프로브 슬롯 합계 증가량은 렌더러당 576바이트예요. 기존 SDK 기본값은 항등변환이라 월드 축 정렬 입력이 유지돼요.

WebGPU 환경 로브에서 별도로 확인된 누락도 고쳤어요. 코팅은 기본 표면 대신 자신의 노멀·거칠기로 환경을 샘플링하고, 이방성 기본 로브는 bent normal을 사용해요. 설치된 Three r180의 정상 EnvironmentNode 경로와 대조했어요.

## 제작·AI·C++ 연결

사용자나 AI가 새 셰이더 행을 작성할 필요는 없어요. 기존 Transform 회전·크기, ReflectionProbe 크기·오프셋·blendDistance·boxProjection, C++ `hb::Scene::SetRotation(target,{0,0,45})`와 동일한 블루프린트 노드가 그대로 연결돼요. 파생 localX/localY/localZ/faceScale은 런타임 바인딩 데이터이며 에셋 작성 키가 아니에요. 원래 씬·컴포넌트 JSON 형식은 유지해요.

직접 SceneRenderer SDK를 쓰는 경우에는 ProbeSettings의 minimum/maximum을 로컬 경계로 두고 `hb::gpu::setProbeWorldToLocal(settings, worldToLocal)`를 호출해요. 잘못된 행은 예외를 던지며 기존 settings를 바꾸지 않아요. 기본 항등 행은 종전 월드 경계 호출을 유지해요. CB 구조가 바뀌므로 예전 실행기에 새 헤더만 섞지 않으며 Player1001/Host1002를 함께 새로 빌드했어요.

## 독립 수치·실제 렌더 검사

- 986은 순방향 변환한 꼭짓점·변의 외적으로 만든 독립 월드 여섯 면 정답 540종과 CPU를 대조해요. 회전·음수/비균일 크기·부모 전단, 평행/근평행/영 광선·페이드가 포함되며 최대 오차는 약 2.22e-15예요.
- 988-yorJsE는 실제 최적화 D3D11 컴퓨트 셰이더 540종, 989-fn0Xon은 실제 GL·WebGPU Float32 픽셀 각각 540종을 실행해요. 정답 대비 최대 오차는 D3D/GL 약 5.76e-7, WebGPU 약 7.61e-7이고 GL/GPU 차이는 약 2.38e-7이에요.
- 991-GdHMY5는 실제 D3D 여섯 면 캡처·필터·SH/GGX·코팅·두 프로브 혼합 경로와 SDK 행 변경을 실행해요. 회전 영역 바깥의 초록 반사가 꺼지고 항등변환으로 복구돼요. 특이 행·0 면 크기는 거부하고 리소스를 해제해요.
- 992-yNK6kh은 실제 물리 머테리얼의 기본·선명/거친 코팅·이방성 네 경우를 Three의 기준 WebGPU 경로와 대조하며 픽셀 차이가 모두 0이에요. 과거 코팅 계산만 사용하는 검사 대조군은 최대 0.299119 차이가 나요. GL/GPU 영역 내부 190픽셀·외부 66픽셀도 확인해요. 이 검사의 PMREM은 준비된 합성 여섯 면이며 실제 방 캡처 증거는 994에서 별도로 확인해요.
- 994-cSAcGD는 새 Player의 실제 SDK 게임에서 C++ 회전→블루프린트 복원→블루프린트 회전→C++ 복원을 실행해요. 메쉬 원점은 계속 영역 안에 두고 검사 픽셀만 영역 밖으로 나가게 해 전체 브리지 행·픽셀 바인딩을 확인해요. 기본 픽셀 [246,119,113]↔프로브 off 기준 [84,101,96]이 정확히 왕복하고 캡처는 계속 1회예요.
- 994-q6R2Od/994-o5hvtA는 같은 SDK 게임의 WebGL2/WebGPU 실제 여섯 면 캡처와 다섯 단계 왕복을 통과해요. 각 렌더러의 프로브 off 기준은 검정이며 캡처는 모두 1회예요. 서로 다른 렌더러의 색상 출력을 완전히 같다고 주장하지 않아요.

초기 994의 카메라가 바닥 기준 큐브 밖을 보던 실수와, 기본 환경광이 있는 DirectX 출력을 검정으로 기대한 검사 실수는 실패 증거에 분리 보존해요. 그 결과를 구현 성공으로 세지 않아요. 또 초기 989의 정수 좌표 floor/TSL 검사 입력 오류는 올바른 Float32 좌표로 고쳐 대조했어요.

## 근거·범위

[Epic Reflection Captures](https://dev.epicgames.com/documentation/en-us/unreal-engine/reflections-captures-in-unreal-engine)의 상자 영향·전이와 캡처의 근사 한계, [Box 컴포넌트 공개 API](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UBoxReflectionCaptureComponent)의 전이 거리·미리보기 항목을 읽었어요. [Unity6000.0 설정](https://docs.unity3d.com/6000.0/Documentation/Manual/class-ReflectionProbe.html)의 월드 크기·오프셋·box projection과 [Lagarde의 local 영향·OBB 투영 지정 구역](https://seblagarde.wordpress.com/2012/09/29/image-based-lighting-approaches-and-parallax-corrected-cubemap/)을 대조했어요. 설치된 Three의 EnvironmentNode.setup/createRadianceContext도 별도로 대조해요. 다섯 원문 SHA와 읽기 경계는 supplemental986/read-scope.json에 있어요.

이번 affine/월드 면 거리 구현과 기존 캡처 정책은 HB의 선택이에요. Epic의 Lightmass·구형 DX11 개수 제한이나 Unity의 선택/블렌딩 정책을 그대로 복제하지 않았어요. 브라우저의 한 개 선택 프로브, 네이티브의 두 개 혼합은 기존 범위이며 변형체/인스턴스 원점 밖 후보 검색·전역 픽셀별 다중 프로브·모든 캡처 정책의 완료로 세지 않아요. 전체 FPS·최초 컴파일·이전 프레임 광학 이력 전체 완료 주장도 없어요.

## 1010 큰 정적 메쉬의 후보 판정
정적 메쉬는 원점 대신 실제 월드 기하 경계와 affine 프로브의 15개 분리축을 대조해요. 메쉬 원점이 영역 바깥이어도 보이는 삼각형이 겹치면 후보로 남겨 픽셀별 영향 검사를 적용해요. 단순 월드 AABB끼리만 겹치는 거짓 후보도 제외해요. 위치 버퍼/버전/개수 변경 때만 로컬 경계를 다시 계산하며 월드 변환에는 여덟 꼭짓점만 적용해요. WeakMap으로 기하 소유를 붙잡지 않아요. 새 GPU 자원·에셋 키·제작 단계는 없어요.

1010의 독립 정답은 분리축 수식을 재사용하지 않고, 각 다면체의 포함 판정과 양쪽 12개 모서리를 상대방의 여섯 월드 면으로 클리핑해요. 일반/미세 영역 2,240종이 모두 일치하며 원점 방식의 누락 424건·AABB 거짓 후보 400건을 확인했어요. 100번의 동일 프레임은 경계를 재계산하지 않고 위치 버전 변경 때 한 번 갱신해요. morph가 실제 활성화되거나 skin/instance인 경우 현재 변형 경계의 소유 계약이 별도로 필요하므로 기존 원점 선택을 유지해요. 이를 변형체 전체 후보 검색 완료로 표시하지 않아요.

1011 최종 묶음에서 994-8z3Zoy(D3D11), 994-sMG5j9(WebGL2), 994-l0HrQ8(WebGPU)는 모두 --outside-origin 실제 SDK 게임으로 다섯 단계를 통과했어요. 기본 머테리얼/큐브맵을 실제 캡처하고 C++/키보드 블루프린트로 왕복했으며 캡처는 모두 1회였어요. 989-fn0Xon의 미세 영역도 통과했고 WebGPU는 0이 아닌 작은 blendDistance를 임의로 1e-6까지 올리던 제한을 제거해 실제 지정 거리를 따르게 했어요.
