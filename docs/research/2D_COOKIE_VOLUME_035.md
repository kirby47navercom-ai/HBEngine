# 2D Sprite 광원과 볼륨 빛

2026-10-06. 기존 조명 조사에서 미구현으로 남긴 Sprite cookie와 volumetric 계약을 실제 공용 렌더러에 연결했다.

| 원문 | SHA-256 | 이번 읽기 |
|---|---|---|
| [Unity6000.0 Light2D 매뉴얼](https://docs.unity3d.com/6000.0/Documentation/Manual/urp/2DLightProperties.html) | 1b445c07eb7d6ad866b5e04da4c361f385a1e0d6710c53094cd9ee4bd4c1c42c | Sprite266–288, Volumetric370–397 본문·속성 설명. 이미지·연결 문서 전체는 제외 |
| [URP17.0 Light2D API](https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@17.0/api/UnityEngine.Rendering.Universal.Light2D.html) | a320bb69fcf42dca05e3507f2367ec43973812db9d0a62c44c8f615c32475b7b | lightCookieSprite, volumeIntensity, shadowVolumeIntensity, renderVolumetricShadows 자체 설명·선언. 상속 API와 연결 타입은 제외 |
| [고정 Graphics Light2D.shader](https://raw.githubusercontent.com/Unity-Technologies/Graphics/feb4de2d9a93a4ae10d287d3a6d7003d08ea3e53/Packages/com.unity.render-pipelines.universal/Shaders/2D/Light2D.shader) | ce7ad6cdfb9ddf82859b713079b29acd1fe5a032d5fd820b32ef0fcb6586df93 | 이전034의 파일 전체259줄 재읽기. Sprite RGBA·additive alpha, volume opacity, volume의 normal 제외와 독립 shadow 처리를 대조 |

원본 응답·hash는 native/build/light-cookie-source-035/manifest.json. 같은27계열에 발견 주소를 등록했고 discoveryClosed/full corpus/API gate는 승격하지 않았다. 이번 작업이 두 엔진 전체 문서나 기능의 완료를 뜻하지 않는다.

Sprite Light는 스프라이트 모양과 색/알파로 빛을 만든다. 스프라이트의 crop·pixelsPerUnit·pivot을 실제 투영 영역에 사용한다. 볼륨은 광원의 빛을 빈 공간에도 보이게 하고, 표면 normal을 적용하지 않으며 독립 강도로2D Shadow Caster 가림을 처리한다. Unity의 원본 셰이더/렌더 파이프라인을 복사한 엔진은 아니며 계약에 맞춰 HBEngine의 공유 렌더러를 확장했다.

## 구현과 비용

- Light2D에 sprite 타입, cookieSprite/cookieTexture, 원시 이미지 너비·높이, volumetric/volumeIntensity/volumeShadowStrength를 추가한다. Scene/BP 속성은 종류와 활성 여부에 맞춰 보이고 AI는 동일 component metadata를 읽는다.
- hb::Light2D와 블루프린트가 같은7개 cookie/volume API를 호출한다. 입력을 먼저 검증하고 서로 전환할 때 이전 sprite 또는 texture 경로를 지운다. 빈 경로는 모양 지우기다. 기존 일반 컴포넌트 JSON 편집도 유지한다.
- 사용 중인 cookie만 하나의 WebGL2 texture array로 묶는다. 같은 이미지/잘라낸 영역/필터는 공유한다. 정적 프레임은 재그리기·업로드하지 않는다. 최대64개, 각256×256 RGBA8(배열 CPU16MiB/GPU16MiB 상한); 큰 원본은 이 투영 해상도로 축소한다. HDR cookie·point cookie 별도 타입·Unity의 exact mesh/tight sprite parity는 미구현이다.
- 볼륨을 켠 지역 광원에만 투명 평면 하나를 만든다. 기존 감쇠·cookie·그림자 atlas와 같은 shader를 재사용한다. 화면 전체 추가 렌더 타깃이 없다. 순서가 가장 높은 대상 정렬 레이어의 마지막에 표시하고 상위 레이어는 위에 그린다. Global에서는 비활성이고3D 깊이 볼륨 산란이 아니다.
- cookie 경로를 에셋 참조 키로 등록해 Assets 바깥의 프로젝트 내부 이미지·스프라이트도 PC/모바일 출력에 포함한다. 사용자 게임/설치본의 자료를 검사에서 바꾸지 않는다.

CPU/C++/동기 Get·Set/자료형/참조 의존성 검사는 tools/check-light-cookies.mjs, 기존 블렌드·그림자 검사와 API 생성 검사가 통과했다. 실제 Windows Player native/build/authoring-window-wd42dX/acceptance.json은 160개(2D 조명110개), C++ 실행·핀 검증, 오류0으로 통과했다. 실제 GPU RGBA/회전/배율/crop·pivot, 정적 재업로드 없음, 불필요한 배열 해제, 빈 공간의 볼륨·독립 그림자·정렬·광원 표시 토글을 확인했다. cookie 하나는 4096바이트/업로드1회, 광원 데이터는 행당144바이트다. 새 기능의 iOS SDK/시뮬레이터 실행은 별도 결과를 남긴다. 물리 모바일 실행·발열·FPS는 기기가 없어 여전히 미검증이다.

모바일 공용 native/build/mobile-player-uav3wz는 실제2AOT C++/Rapier/소스분리와 cookie 배열 모듈이 포함된 iOS 프로젝트 출력을 통과했다. 실제 앱 검사는 Sprite Light와 volume을 같은 예제에 배치하고 WKWebView의 cookieBytes/volume 정렬/셰이더 링크를 기록한다. 개발 PlayerDebug에만 이 진단을 제공하며 릴리스 프레임마다 추가 조회하지 않는다.
