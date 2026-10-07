# GPU 2D 조명·그림자 연결 — 053

2026-10-07. 기존 2D 컴포넌트·BP·C++ 서비스를 유지하고 GPU 재질과 그림자 패스를 연결했어요. 설치본은 7df780dd9a47cf5b 그대로예요. 누적 선행 목표를 마친 뒤 설치하고, 그다음 추가 조사 목표를 이어가요.

## 동작과 실행 증거

- Global/Point/Spot/Freeform/Sprite 쿠키 광원, 대상 Sorting Layer, Accurate/Fast/Disabled 노멀맵, 네 블렌드 스타일의 곱/가산/감산과 RGBA/반전 마스크, 광원 순서·Alpha Blend, 볼륨 조명이 기존 공용 데이터 소유자를 사용해요.
- 기존 ShadowCaster2D/CompositeShadowCaster2D의 외곽·콜라이더·스프라이트 데이터와 캐시를 재사용해요. 자체 그림자·투사·내부·합성·스텐실 초기화 패스를 GPU에 연결하고, GPU clear가 scissor를 따르지 않아 아틀라스를 한 번만 초기화해요.
- 같은 재질의 데이터/아틀라스/쿠키/마스크 fallback은 서로 다른 바인딩을 유지해요. 장면마다 공유하는 fallback은 장면 종료 때 해제하고, 광원·외곽·쿠키·그림자는 변경될 때만 재생성하거나 업로드해요.
- C++ `hb::Light2D::SetIntensity`와 실제 L 키 BP `light2dSetIntensity`가 동일한 Light2D를 조절해요. 새 별도 API를 만들지 않았어요.

검사: `npm run test:gpu-lighting`, 기본 GL 대조 `node tools/check-gpu-scene.mjs --lighting --webgl`. 실제 분리 release Player/Win32 HWND/WebView2를 사용하고 사용자 창을 열거나 새로고침하지 않았어요.

최종 증거: `native/build/gpu-scene-7WAkd3/acceptance.json` (GPU), `native/build/gpu-scene-10vKc6/acceptance.json` (GL). 광원 종류·쿠키 방향·노멀 품질·C++·실제 BP·블렌드 스타일/마스크/대상 레이어/순서·3셀 2행 그림자 아틀라스·자체/투사/합성/해제·볼륨 픽셀 PASS. 변화 없는 프레임의 shadowPasses/lightUploads 증가 없음, 전환 전후 GPU 메모리 3 geometries/5 textures 동일, GPU 오류0/개인 검사 프로젝트 원본 보존/종료0/서버 종료 PASS. 공용 스프라이트 변경 영향도 `native/build/gpu-scene-xlTL92/acceptance.json`에서 052 마스크·입자·C++ 효과·픽셀 정렬·타일맵 검사 PASS. 최종 실행 소스 SHA는 `native/build/gpu-lighting-research-053/manifest.json` 작성 시 대조했어요.

## 실제 읽은 범위와 차이

아래 문서는 각 페이지 본문·자체 표를 읽었어요. 이미지와 연결된 다른 본문/API를 읽은 것으로 세지 않아요. 원문/설치 Three r180 소스 부분별 읽기/SHA 캐시: `native/build/gpu-lighting-research-053/manifest.json`.

- [Unity 6 2D 광원 생성](https://docs.unity3d.com/6000.0/Documentation/Manual/urp/2d-light-properties-explained.html): 레이어 지정·볼륨과 광원 Z 독립성, 타일 배칭 흐름.
- [Light2D 속성](https://docs.unity3d.com/6000.0/Documentation/Manual/urp/2DLightProperties.html): 종류·범위·형상 편집·스타일·순서·겹침·그림자·볼륨·노멀 표.
- [2D 그림자 생성](https://docs.unity3d.com/6000.0/Documentation/Manual/urp/2DShadows.html), [ShadowCaster2D 속성](https://docs.unity3d.com/6000.0/Documentation/Manual/urp/ShadowCaster2D.html): 형상·소스·자체/투사·레이어·외곽·알파·Composite 부모 흐름.
- [URP 14.0.12 Light Blend Styles](https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@14.0/manual/LightBlendStyles.html): 4스타일·마스크 채널·곱/가산/감산·커스텀 계수·내부 텍스처 배율. 17/6000 해당 URL은 접근 실패여서 읽지 않았어요.

HB의 현재 제약/차이도 유지해요: 활성 광원64·형상 정점64·그림자 아틀라스4M·쿠키256/64층은 기존 공용 구현의 한계예요. Unity의 동일 레이어/스타일당 Global 하나 제한, 현재 문서의 Trim Edge 비율 의미, 별도 shadow falloff·커스텀 블렌드 계수·스타일별 내부 텍스처 해상도와 완전한 Sprite Skin/윤곽선 편집 대조는 미완료예요. 기존 호환값을 문서와 동일하다고 표기하지 않았어요. 전체 문서/API/엔진 분석, 입자 정렬·탄환·에디터/모바일 GPU, 기존 게임 PC120/모바일60·장기 메모리 안정성·실기기 검증이 이번 검사로 완료되지는 않아요.
