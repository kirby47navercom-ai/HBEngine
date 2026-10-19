# 기하 노멀에 따른 래스터 거칠기 보정

기존 WebGL·WebGPU 물리 머테리얼은 기하 노멀의 화면 차분으로 기본·코팅 거칠기를 넓혀요. DirectX 일반 래스터에는 그 계산이 없어 같은 기하에서 반사 로브가 더 날카로울 수 있었어요. DirectX에도 기존 래스터 정책을 연결했어요.

보간한 기하 노멀을 노멀맵·노드 노멀 적용 전에 보존해요. 화면 x/y 방향의 성분별 절대 차분 중 최대값을 기본 거칠기와 코팅 거칠기에 더하고 1에서 제한해요. 노드 그래프가 지정한 거칠기에도 적용하며, 노드가 셰이딩 노멀을 바꿔도 기준 기하 노멀은 유지해요. 기존 최소 거칠기·노드·에셋·C++ 구조체·바인딩 형식은 바꾸지 않아요. 새 GPU 텍스처·상수 버퍼·프레임 readback·UI 설정을 추가하지 않아요.

이 변경은 기하 노멀의 화면 내 반사 반짝임에 대한 기본 보정이에요. 방향성 노멀맵 사전 필터, 거친 복합 광학 경로의 시간 필터, Unity HDRP의 분산·임계치 제어와 같은 기능으로 표시하지 않아요.

## 근거와 대조

[Unity HDRP17.1 자체 문서](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.1/manual/Geometric-Specular-Anti-Aliasing.html)는 기하 굴곡에 따라 매끄러움을 줄이는 효과와 분산·임계치 설정을 설명해요. [Unity 공용 계산](https://github.com/Unity-Technologies/Graphics/blob/master/Packages/com.unity.render-pipelines.core/ShaderLibrary/CommonMaterial.hlsl)의 지정 함수도 읽었지만, 기존 엔진의 래스터 계산을 유지하므로 이 분산 방식을 그대로 넣은 것은 아니에요.

설치된 Three r180의 `lights_physical_fragment.glsl.js`와 TSL `getRoughness.js`는 최대 성분 차분을 기본·코팅 거칠기에 더해요. [현재 공식 소스의 해당 구역](https://github.com/mrdoob/three.js/blob/dev/src/renderers/shaders/ShaderChunk/lights_physical_fragment.glsl.js)과 [TSL 함수](https://github.com/mrdoob/three.js/blob/dev/src/nodes/functions/material/getRoughness.js)도 대조했어요. 원격 dev의 최소 거칠기는 설치본과 달라 이번 변경에 가져오지 않았어요.

원문·설치 소스 6개의 SHA와 읽기 경계는 `native/build/reference-corpus/supplemental970/read-scope.json`, 추가 출처·미독 대기열은 `CORPUS_MANIFEST.json`에 보존해요. 자체 본문·지정 함수 대조이며 연결 API·미디어·전체 엔진/버전 분석 완료가 아니에요.

## 실제 실행

`geometric-specular-970-PWBD3G`는 하드웨어 D3D11에서 최적화한 진짜 래스터 PS를 실행해요. 평면·곡면·그래프 거칠기·그래프 노멀·상한·unlit·발광·코팅 8종을 변경 전/후 기본 실행과 수치 출력 실행으로 대조해요. 이전 비교는 동일 헤더에서 새 보정 문장만 제거하며, 수치 출력 검사는 최종 출력 위치만 바꿔 실제 중간 rough/coat를 읽어요.

- 독립 픽셀 중심 보간·정규화와 2×2 쿼드 차분 계산의 수치 출력 오차는 최대 0.001894로 8비트 허용 1.1/255 이내예요.
- 평면·unlit·발광의 실제 기존/신규 픽셀은 완전히 같아요.
- 곡면 기본·코팅의 실제 광원 반사값은 바뀌며 최대 77/255 차이예요. 이 차이만으로 모든 장면의 앨리어싱 감소율을 주장하지 않아요.

이후 실제 새 Player·Host 빌드, SDK C++·블루프린트 머테리얼 변경·밉 전환·경로 추적 및 설치본 대조는 누적 작업·설치 기록에 연결해요. 게임 전체 FPS나 최초 셰이더 컴파일 지연을 해결한 것으로 계산하지 않아요.
