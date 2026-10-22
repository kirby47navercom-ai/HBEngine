# WebGL 초기 준비의 컴파일 단계 추적

`node tools/check-gl-compile-trace-1728-window.mjs`는 격리 프로젝트·프로필·자동 포트의 숨긴 실행기만 추적해요. 사용자 설치본이 실행 중이면 시작하지 않아요. 원본 게임·프로필을 사용하지 않고, 검사 후 재생성 가능한 빌드·WebView 프로필을 정리해요. 복잡한 머테리얼 fixture를 재사용하며 소스·품질·브라우저 옵션을 바꾸지 않아요.

`tools/cdp-compile-trace.mjs`는 소유 probe의 포트에서 브라우저 endpoint를 확인하고 `gpu.angle` 카테고리만 켜요. `Tracing.end`의 완료 이벤트 뒤에 스트림을 읽고 닫아요. 명령/완료 대기는 유한하며 원문은16MiB를 넘지 않아요. 원문은 검사 디렉터리에 gzip 한 개로 보관하고, 짧은 이벤트 목록에는 셰이더 본문 대신 길이·SHA를 남겨요. 제품에 상주 수집기·DB·추가 렌더 타깃을 넣지 않아요.

2026-10-23의 `gl-compile-trace-1728-nxXJ7S` 관측은 Edg155.0.4283.62예요. 실제 준비6개를 병렬 제출했고 path 준비6878.6ms 중 D3DCompile 한 건6836.439ms, 입력 HLSL74151바이트였어요. 같은 추적의 긴 GLSL 번역은46.89ms였어요. 보조 guide D3DCompile1692.173ms는 별도 스레드에서 겹쳤어요. 이 장면에서는 JS 제출/번역보다 픽셀 HLSL→바이너리가 주 병목이라는 실행 근거예요. GPU 실행 시간·FPS·완전한 cold-cache 측정은 아니에요.

별도 private `--fixed-records` 후보(`emcanL`)는 고정 가상 슬롯 읽기만 치환했어요. HLSL71530바이트, D3DCompile6492.499ms였어요. 각 한 번의 관측이고 캐시·부하를 통제한 반복 비교와 실제 카메라 출력 동등성 검사가 없으므로 제품에 채택하지 않았어요. 표준편차 밖의 개선이나 전체 해결로 계산하지 않아요. 도구에서 재현할 수 있어요.

원문 `D3DCompile::Error` 이벤트는 이 두 추적에서 경고를 포함했어요. 이 이름만으로 컴파일 실패나 재시도를 세지 않아요. 실제 링크 성공·GL error0·guide307200성분의 비영 출력·정상 종료를 별도로 확인했어요. `Tracing.getCategories`의 필터 목록이 비어 있어도 이 실행에서는 실제 `gpu.angle` 이벤트가 기록됐어요. 다음 진단은 동일 입력에서 실제 컴파일 단위를 나누는 비용과 프레임 실행 비용의 대조이며, 이미 효과 부족한 작은 문자열 정리를 반복하지 않아요.

절차는 [CDP Tracing](https://chromedevtools.github.io/devtools-protocol/tot/Tracing/)의 스트림 완료 계약과 [ANGLE HLSLCompiler 지정 브랜치](https://chromium.googlesource.com/angle/angle/+/refs/heads/chromium/7436/src/libANGLE/renderer/d3d/HLSLCompiler.cpp)의 D3DCompile 추적 지점을 참고했어요. 후자는 설치된 WebView 소스와 동일 브랜치라는 뜻이 아니에요. 설치 버전·실제 이벤트는 검사 영수증에 따로 기록해요.
