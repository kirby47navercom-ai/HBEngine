# 주 경로 준비 비용의 지정 진단

2026-10-22. 설치1298은 유지해요. 아래 후보는 제품 렌더러에 연결하지 않았고 속도 개선으로 세지 않아요. 실제 제품에 채택한 곡면 보조 가이드1290과 다른 범위예요.

같은 엔진 소유 Complex141 10파일·확산 수신벽·320×240·4표본 패키지 WebGL2 장면이에요. 기준1301-DVS0y3 주 경로7066.5ms. 기준 원시 half 전체307200성분을 재사용해 후보만 비교했어요. 각 후보의 전체 성분 차이는0이지만 캐시/부하를 통제한 속도 검증은 아니에요.

|후보|주 경로 준비 ms|판단|
|---|---:|---|
|1302-5rxn35 확정 불투과의 카메라 굴절 분기2050B 제외|6757.8|효과 불충분, 미채택|
|1303-CZ4Rlv bilinear 네 텍셀 호출을 고정4회 루프로 공유|7030.7|효과 불충분, 미채택|
|1304-tvyCxZ 보간 y가0이면 한 행만 읽는2/4회 루프|6786.8|효과 불충분, 미채택|
|1305-Ykorpg HDRI 수치 atlas를 명시 LOD0으로 읽기|6942.5|효과 불충분, 미채택|
|1307-57T3rV 빈 매질 카메라의16칸 배열/seed/경계 갱신 제거|6832.1|효과 불충분, 미채택|

1300-X0DLoc은 정적 패키지 의존성에 없는 사설 모듈을 동적 import한 검사 도구 오류예요. 1301은 기준 캡처를 마친 뒤 비활성화로 해제된 패스의 uniform을 기다려 시간 초과됐어요. 기준 캡처는 유효하고 실제 renderer에는 pipelinePreparation/rayGeometry가 null로 해제됐어요. 후보는 함수 소스를 검사에 직접 주입해 제품 패키지 구성을 바꾸지 않았어요. 실패를 통과로 바꾸거나 오차 기준을 완화하지 않았어요.

1306-vaSAxn은 새 프로그램이 처음 그려지기 전에 변환 HLSL을1회 읽었어요. GL 오류0, 전체 기준 출력 동일, 주 경로6877.1ms예요. 저장 파일은 초기 HLSL과 컴파일 입력을 포함하므로 두 번 세지 않아요. 첫 구역73893B에서 큰 함수는 PathSample9144B·TraceCone2882B·실제 머테리얼 프로그램2741B·VertexLoad2554B·VisibilityLod2489B·텍스처Kind0Filter8 2423B예요. 샘플/바운스 루프에는 ANGLE의 LOOP 매크로가 있고 16칸 매질 배열은 기본 폴백에도 남아요. 이것만으로 어느 최적화 단계가 시간을 쓰는지 확정하지 않아요.

`tools/primary-preparation-candidates-1300.mjs`는 부수효과 없는 사설 후보 모음이에요. 생성 GLSL·원시 출력·변환 HLSL·각 acceptance/failure는 `native/build/opaque-integrator-*`에 있어요. 전체 엔진·네이티브·다른 GPU·모바일 성능 증거가 아니에요. 다음에는 이 다섯 미채택 후보나1086의74B SSA를 반복하지 말고, 변환/최적화 단계별 비용이나 실제로 컴파일 단위를 나누는 설계를 근거와 비용부터 확인해요. 현재·이전 노멀/매질/수식·제품 품질은 이 진단으로 바뀌지 않았어요.

공식 소스 지정 조회: [ANGLE Renderer11.cpp](https://chromium.googlesource.com/angle/angle/+/refs/heads/main/src/libANGLE/renderer/d3d/d3d11/Renderer11.cpp)에서 소스 위치를 확인했지만 현재 파일에서 요청한 최적화 플래그/pragma 항목은 찾지 못했어요. [HLSLCompiler 검색 결과](https://chromium.googlesource.com/angle/angle/+/refs/heads/chromium/7436/src/libANGLE/renderer/d3d/HLSLCompiler.cpp)는 플래그 목록 발췌일 뿐 전체 본문 분석이 아니에요. 설치 WebView2와 원격 main의 버전이 같다고 가정하지 않아요. pragma나 브라우저 플래그는 제품에 추가하지 않았어요.
