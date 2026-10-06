# 2D 광원 순서와 겹침 처리

2026-10-06. Unity6000.0 매뉴얼의 Light Order/Overlap Operation과 URP17.0.4의 lightOrder·overlapOperation 자체 선언, OverlapOperation 타입·필드를 읽었어요. 고정 Graphics 커밋 feb4de2d9a93a4ae10d287d3a6d7003d08ea3e53의 실제 블렌드 상태와 셰이더도 대조했어요.

| 원문 | SHA-256 | 실제 읽은 범위 |
|---|---|---|
| [manual.html](https://docs.unity3d.com/kr/6000.0/Manual/urp/2DLightProperties.html) | 543cde196aed754af34615e6489e5491dbe7da76d5b7cd633c4ac0505755559a | technical body/table35–113 web reader; images and linked resources unread |
| [api.html](https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@17.0/api/UnityEngine.Rendering.Universal.Light2D.html) | a320bb69fcf42dca05e3507f2367ec43973812db9d0a62c44c8f615c32475b7b | own lightOrder649–672/overlapOperation749–772 HTML; inherited/link API unread |
| [enum.html](https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@17.0/api/UnityEngine.Rendering.Universal.Light2D.OverlapOperation.html) | 67a4d6afb70c471710ba39400e3d96c15e18e77259352bc14d07ebdf970d9bf6 | own declaration and fields118–150 HTML |
| [Light2D.shader](https://raw.githubusercontent.com/Unity-Technologies/Graphics/feb4de2d9a93a4ae10d287d3a6d7003d08ea3e53/Packages/com.unity.render-pipelines.universal/Shaders/2D/Light2D.shader) | ce7ad6cdfb9ddf82859b713079b29acd1fe5a032d5fd820b32ef0fcb6586df93 | whole260lines |
| [Light2DManager.cs](https://raw.githubusercontent.com/Unity-Technologies/Graphics/feb4de2d9a93a4ae10d287d3a6d7003d08ea3e53/Packages/com.unity.render-pipelines.universal/Runtime/2D/Light2DManager.cs) | 493c9a59824e1d8570222034cddae9f4ec12bb61219307886482872aafb8becb | whole134lines |
| [LightingUtility.hlsl](https://raw.githubusercontent.com/Unity-Technologies/Graphics/feb4de2d9a93a4ae10d287d3a6d7003d08ea3e53/Packages/com.unity.render-pipelines.universal/Shaders/2D/Include/LightingUtility.hlsl) | 22e017b1d3b535838e8faeed3ecc55bae593eb7f37d419af0f7eef9ca86a9edc | whole200lines; also previously captured030 |
| [RendererLighting.cs](https://raw.githubusercontent.com/Unity-Technologies/Graphics/feb4de2d9a93a4ae10d287d3a6d7003d08ea3e53/Packages/com.unity.render-pipelines.universal/Runtime/2D/Passes/Utility/RendererLighting.cs) | 4a8ad5d2ea9d1b590ea9fefe92a61067232ea3461a12893a49cc9c9249d5212e | partial196–320,656–743; original output196–320 truncated and201–208 reread below; remaining body not fully reviewed |

원문/응답/범위는 native/build/light-overlap-source-034/manifest.json에 보존해요. ShapeLight.shader 추정 주소는404였고 공식 디렉터리에서 Light2D.shader를 찾아 읽었어요. RendererLighting 전체743줄·연결 Core/lookup texture 생성·상속/연결 API·이미지·독립 Unity 실행을 모두 읽거나 검증한 결과는 아니에요. 발견 대기열6주소만 추가하고 기존27계열과 전체 corpus/API gate는 보존해요.

## 실제 처리 계약

공식 RendererLighting의 Additive는 One/One, AlphaBlend는 SrcAlpha/OneMinusSrcAlpha예요. Light2D.shader는 알파 혼합에서 거리/각도/형상의 감쇠를 알파에 넣고 강도를 RGB에 적용해요. 노멀 응답은 RGBA에 적용하고 그림자는 RGB만 줄여요. 따라서 그림자로 어두워진 광원이 같은 범위의 이전 조명을 다시 드러내는 처리는 달라요. HBEngine은 이 RGB/coverage 구분을 유지해요.

- Light2D의 lightOrder는 ±1,048,576 범위 정수예요. 낮은 순서부터 합성하고 동률에는 기존 씬 등록 순서를 유지해요. Global은 스타일 바탕을 먼저 만들며 저장된 order/overlap은 무시해요. 두 항목은 Global 속성에서 숨겨요.
- overlapOperation은 additive 또는 alphaBlend예요. 기본 가산은 기존 결과를 유지해요. 알파 혼합은 해당 스타일에서 먼저 쌓인 색만 덮어요. 다른 스타일·제외 레이어에는 영향이 없어요. 강도는 색의 밝기이며 덮는 범위를 바꾸지 않아요.
- 같은 스타일의 광원을 순서대로 합성한 뒤 표면 RGBA/반전 마스크를 한 번 적용하고, 공용 스타일의 곱셈·가산·감산을 합해요. 노멀/전용 그림자·기존 XY 감쇠 곡선은 유지해요. 새로운 화면 크기 렌더 타깃 없이 기존7 RGBA32F texels/광원, 최대64광원 데이터를 사용해요.
- C++ Light2D::Set/GetLightOrder·Set/GetOverlapOperation, 같은 선언의 BP4노드와 AI render2d.light2d.overlap 계약을 제공해요. 값 전체를 검증한 뒤 변경하고 같은 C++ 호출에서 getter에 반영해요. 씬/BP 속성 편집·저장·Undo는 기존 컴포넌트 경로를 사용해요.
- GPU uniform은 실행 상태라 머테리얼 복제의 JSON에 포함하지 않아요. 복제본에 독립 uniform을 만들고 원래 벡터/텍스처를 유지해요. 타일 머테리얼 복제에서 GPU 상태를 큰 JSON 사본으로 만드는 비용을 줄여요.

공식 Global은 같은 스타일/레이어의 중복에 오류를 내고 먼저 찾은 색을 써요. HBEngine은 기존 씬 호환을 위해 여러 Global의 가산을 유지해요. 기존 analytic XY falloff는 Unity lookup 곡선과 독립적이며 카메라별 URP Renderer Asset/볼륨/중간 RT/HDR 설정의 전체 동등성을 주장하지 않아요.

## 검증

- 기존 test:light-blends에 C++ getter/setter4개·인덱스/모드/정수 검증·실패 원자성·씬/BP/AI 노드·uniform 복제 독립성을 추가해 통과했어요. API 생성/차이 검사도 통과예요.
- 실제 Editor native/build/authoring-window-e9GUZT:143개/조명93개·오류0. Global 바탕·알파·강도·가산·음수/같은 순서·제외 레이어·마스크 후적용과 기존 노멀/그림자를 함께 통과했어요. 순서 혼합 픽셀[60,191,137,255], 이상적 중앙점 예상RGB[63,188,137], 허용오차3이에요. 실제 픽셀 중앙과 이상적 좌표의 차이를 구분해요.
- 실행 Player의 동일 변경 검사는 별도 후속 결과를 아래 기록해요. 기존 b93ad7f 설치/진행 중 iOS 결과를 새 겹침 처리의 증거로 바꾸지 않아요. 실물/서명/8시간/모바일 성능은 이 검사로 대체하지 않아요.

- 동일 변경의 실제 Game.exe native/build/authoring-window-BELCxX:143/조명93·오류0, 실제C++/BP 조명 속성과 핀 출력 verified/pinVerified true. uniform JSON 복제 제외도 최종 코드에 포함해요. 이전 e9GUZT는 그 제외 변경 전이며 구분해요.
