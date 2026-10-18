# 515–538 텍스처 샘플 제작과 실행 대조

Unity Shader Graph 17의 [Sample Texture 2D](https://docs.unity3d.com/Packages/com.unity.shadergraph@17.0/manual/Sample-Texture-2D-Node.html)에서 모드별 LOD·Bias·DDX/DDY 입력과 표시 조건을 재독했어요. HB는 이 제작 흐름을 네 텍스처 형식에 적용하고, 숨겨진 연결을 보존해 모드 변경을 되돌릴 수 있게 했어요. Unity의 전체 노드·파이프라인 기능을 이번에 분석하거나 복제했다는 뜻은 아니에요.

Microsoft [SampleLevel](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-to-samplelevel), [SampleBias](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-to-samplebias), [SampleGrad](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-to-samplegrad)의 선택 서명·매개변수를 읽었어요. 배열의 레이어와 미분 차원을 구분하고 바이어스 범위를 적용했어요. HB의 광선 경로는 하드웨어 픽셀 미분 대신 기존 원뿔 변화량을 쓰는 자체 구현이며, 양의 값으로 제한하기 전에 원래 LOD에 바이어스를 더해요. 상수 좌표의 폭 0을 바이어스 1만으로 거칠게 만들지 않아요.

W3C WGSL의 [textureSampleGrad](https://www.w3.org/TR/WGSL/#texturesamplegrad), [textureSampleLevel](https://www.w3.org/TR/WGSL/#texturesamplelevel), [textureStore](https://www.w3.org/TR/WGSL/#texturestore) 서명을 선택해 읽었어요. 배열 샘플의 정수 레이어 인자와 볼륨·큐브의 Vector3 미분을 실제 검증 오류와 대조했어요. 현재 배포할 Three 소스의 관련 생성 함수와 볼륨 밉 뷰 생성도 읽었어요. 엔진 소유 샘플에만 어댑터를 적용하고 의존 패키지·전역 빌더 파일은 바꾸지 않았어요.

실제 일반 표면 검사에서 WebGPU의 배열 레이어 누락, 볼륨의 잘못된 2D 뷰, 큐브 미분의 Vector2 축소를 발견했어요. 어댑터와 볼륨 전용 업로드 컴퓨트 경로로 고쳤고, 환경 조명의 회전이 명시적인 큐브 방향에 섞이지 않도록 분리했어요. 홀수 크기·sRGB·깊이 축 17의 독립 평균과 유휴 상태·임시 핸들을 확인했어요.

광선 검사는 네 형식×네 모드에서 현재 시간 1과 커밋한 이전 시간 0의 노멀을 독립 밉 정답과 비교했어요. GL·TSL·DirectX의 최종 정답 오차는 0이었어요. 일반 표면은 8×8 원본/평균 밉의 실제 픽셀로 별도 확인했어요. 에디터의 핀·상세 속성·Undo/Redo·저장, CPU 베이크의 밉과 기본 입력, C++ 편의 함수를 호출한 새 패키지까지 연결했어요. 결과와 실패 구분은 ENGINE_WORK_538에 남겨요.

초기 검사의 잘못된 정답도 구분해요. 잠정적인 양의 LOD 바이어스 규칙은 폐기했어요. 원본이 1m인 평면을 2m로 가정하거나 큐브 면을 가로지르는 폭에 선명한 정답을 적용한 검사는 최종 근거에서 제외했어요. 함수창용 DOM 선택자를 일반 머테리얼창에 사용한 실패, 얼굴 경계의 하드웨어 밉 보간을 무시한 검사도 수정했어요. 허용 오차를 넓혀 통과시키지 않았어요.

새 읽기·재독·본문 미독 범위와 원문 SHA는 CORPUS_MANIFEST.supplemental538에 있어요. 명세 전체·연결 API 전체·UE/Unity 전체 분석 gate는 승격하지 않아요. HDR/압축·사용자 정의 배열/볼륨 밉·스트리밍·노멀 분산 거칠기·raw 가져오기 정책·유한 차분의 sub-ULP/불연속 한계·초기 컴파일 시간과 다른 누적 엔진 목표는 계속 남아요.
