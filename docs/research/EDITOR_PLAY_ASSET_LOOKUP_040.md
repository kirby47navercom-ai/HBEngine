# 040 편집기 실행 중 반복 에셋 검색 제거

2026-10-07. 엔진_요청_프레임.md의 Test_Boss 78.2fps·simulation10ms·편집기 clientOperations 약160ms/0.3초 보고를 읽고 진행했다. 전체 FPS 목표 달성이나 전체 엔진 완료를 뜻하지 않는다.

## 원인과 공용 조회 방식

편집기 startPlay의 asset(name,kind)는 새 에셋 이름/자료형을 찾을 때마다 /api/project?recursive=1로 전체 디렉터리를 조회했다. engineOperations의 이름별 캐시가 있어도 새 클립은 animation 및 spriteanimation 자료형을 차례로 찾으면서 다시 요청했다. 패키지 Player는 쿠킹된 파일 목록으로 조회해 이 비용이 없었다.

실행 준비에서 읽은 목록을 preparePlayWorld의 Spawn catalog와 engineOperations의 animation·audio·material·scene 등 모든 이름 조회에 함께 사용한다. 기존 resolvePlayAsset의 자료형/경로 우선·이름 중복 오류를 유지한다. 한 Play/장면 준비 동안 목록을 유지하고 다음 Play/장면 전환 때 다시 읽는다. 실행 중 외부에서 새로 만든 파일은 다음 준비 때 조회 목록에 들어온다. 실제 에셋 데이터 읽기·취소/정리·오디오/애니메이션 이벤트 순서는 바꾸지 않았다. 새 라이브러리나 전역 캐시는 없다.

- [Unity Addressables2.0.8: Load assets by location](https://docs.unity3d.com/Packages/com.unity.addressables@2.0/manual/load-assets-location.html) 자체 본문/예제/서브오브젝트를 읽었다. 키와 자료형으로 위치를 먼저 찾고 그 위치로 에셋을 읽는 두 단계를 확인했다. 원시 본문/SHA는 native/build/boss-asset-sources-040이다. Addressables 전체를 구현했다는 뜻은 아니다.
- [Unreal5.8: Asset Management](https://dev.epicgames.com/documentation/unreal-engine/asset-management-in-unreal-engine)의 Asset Manager와 Primary/Secondary 구분을 읽었다. Editor와 패키지에서 관리 객체를 쓰고 발견/로드/감사를 나누는 구조를 대조했다. 이 특정 절을 전체 API 분석으로 계산하지 않는다. HB의 실행 목록 공유는 이 분리를 참고한 자체 구현이며 Unreal 코드를 복제하지 않았다.

## 실제 검증과 한계

원본에서 읽은773파일을 한 번 동결한 숨겨진 사본 Test_Boss(400오브젝트)로 검사했다. 이전/이후 모두 같은 파일 SHA였으며 원본 게임/검사기/프로필/사용자 창을 수정하지 않았다. 검사 중 원본 Source/TopDownShooter.cpp의 외부 변경을 감지했다. 이를 보존하며 되돌리지 않았고 최신 원본과 사본이 같다고 주장하지 않는다.

- 수정 전 DMmfT7: 실제 WebView2/300프레임, 명령 적용 최대399.8ms·평균5.7178ms, playAnimation 최대398.4ms·평균97.45ms. C++ 함수 최대1.2843ms.
- 수정 후 adB3Oh: 같은 사본/300프레임, 실행 중 폴더 재조회0회, 명령 적용 최대8.4ms·평균.3ms, playAnimation 최대7.2ms·평균2.4444ms, 오류0.
- 영구 회귀 도구 `node tools/check-auric-features-editor.mjs <격리 auric-spawn 사본> --boss-only`의6WJJfx는 실제 사용자 C++/300프레임·조회0회·오류0을 통과했다. 명령 적용 최대3ms·평균.1835ms, frontend 최대7.5ms. 기존 폭넓은 검사 경로는 유지하고 이번 수정에는6초 검사만 실행했다.
- CPU 프로필/명령별 측정은 검사 엔진 사본만 계측했다. 공개 엔진에 계측 오버헤드를 넣지 않았다. 증거 native/build/boss-asset-result-040.json, private editor-window별 JSON/CPU profile이다.
- 순차 측정의 OS 부하·전투 조작이 통제된 FPS 벤치마크는 아니다. 120fps/휴대폰60fps나 모든 주기 멈춤 제거를 주장하지 않는다. 남은 simulation 비용의 물리 접촉·네이티브 직렬화·UI 업데이트는 다음 조사 대상으로 남긴다. 모바일/패키지 실행 코드 불변으로 iOS·Android 빌드 및 긴 스트레스 검사를 반복하지 않았다.

- 2026-10-07 사용자 설치 완료: sourcec150496/bundled03c655dc25a2bb6, C:/Users/kirby/HBEngine/Versions/d03c655dc25a2bb6/HBEngine.exe.1786파일/변경24SHA와 실제 회귀 창의 app.js가 일치하며 모바일·패키지·네이티브 실행소스는478e610 검증본 그대로예요. 기존ff86 설치 manifest/프로필·adb14204 및 사용자 창을 보존했고 바로가기/HKCU 프로젝트 실행 경로를 갱신했어요. 다음 실행부터 적용돼요. 증거 native/build/boss-asset-user-install-040.json.
