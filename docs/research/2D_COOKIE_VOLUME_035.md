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

iOS950f4a9/run37471088488은 Mac의 기존 C++ 공용·새cookie·실제2AOT·프레임·전송·오디오·headless·runtime-feature 검사를 통과한 뒤 check-player-lifecycle의 Renderer 모형에 programs 필드가 없어 실패했다. 실제 Three.WebGLRenderer의 programs 배열을 Windows168GPU 검사가 사용했고 엔진 셰이더 실패로 계산하지 않는다. 검사 모형에 실제 필드를 넣고 healthy/failed 진단 보존을 단언한다. 같은 실행 소스는 이미 통과한 C++ 묶음을 반복하지 않고 남은6검사·모바일출력·Xcode·WKWebView를 수행한다. 최초 실패 로그 native/build/ios-37471088488-failure.txt는 보존한다.

후속 fed46d4/run37472250751: 공용기반/모바일출력/두SDK 컴파일/설치/launch는 통과했으나 실제앱0frames에서 layers.filter 오류가 발생했다. runtime.sortingLayers는 validRuntimeSettings에서 선택 필드이고 기본 장면에는 없는데, 새volume 정렬 코드가 항상 배열로 가정한 엔진 결함이다. 모든 호출자는 그대로 두고 TwoDRendering.prepare 진입에서 기존 defaultSortingLayers를 적용한다. 실제Windows Player wlEr8c170개/조명111개/errors0은 정렬설정이 없는 상태에서도 volume의 원래 RGBA 픽셀과 같은 결과를 확인했다. 초기 회귀9niVLI는 불투명 red 기준을 강도.5 volume에 적용한 검사 오류로 실패했고 기존 volume와 픽셀 동일성을 기준으로 바로잡아 보존한다.

CI 공용기반 재사용은 C++/native/API/VM/서비스/전송 코드가 같을 때만 허용한다. 이번 Renderer·컴포넌트 metadata/test 파일로 허용 범위를 명시하고 해당 runtime-feature/scene-system/particle-renderer 검사와 기존6개를 항상 실행하며 실제 모바일 출력/Xcode/WKWebView를 생략하지 않는다. 범위 밖 변경은 전체 검사를 요구한다. 이 재사용을 모든 실행 소스가 같다는 표현으로 바꾸지 않는다.


### 2026-10-06 — iOS 새2D 광원·파티클 실행 확인

- source76c2bf3의 실제 원격iOS run37474343475가 두SDK/독립iPhone SE3/실제WKWebView 실행/C++2AOT/동기물리/파일SHA·range·병렬SVG/오디오 신호·일시정지·복귀를 통과했어요. 오류0/보고960frames, Cookie65536bytes·볼륨visible/order8·9셰이더runnable/실제Points5개를 확인했어요. 파티클mask GPU 픽셀 비교는 Windows 증거이고 이번iOS 진단은 실제 생성/그리기와 셰이더링크 범위예요. 설치a84724c3bafa35be와 같은 실행소스예요.
- 성능창600frames는17.8269fps/work p50 39/p95 53ms로 모바일60 목표미달이에요. 기능PASS를 성능PASS로 바꾸지 않고 실물폰/서명/가청/8시간 확인칸을 그대로 둬요. iOS 요약 native/build/ios-76c2bf3-summary.json·원본zip/화면을 보존했어요. 이후 개별 입자 정렬·화면크기·적분 재사용 수정은 이source에 포함하지 않아요.
