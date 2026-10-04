# Unreal Packaging 정지 그림 독립 대조 016

2026-10-04, `research_only`. `/root/android_build_deploy_014`가 분석자 root와 별도로 [분석 016](UNREAL_PACKAGING_MEDIA_BODY_016.md)의 원 PNG **29회·고유 bytes 27종**을 `view_image(original)`로 직접 읽었어요. 수정 대상 3/9/14/17/28은 다시 열어 대조했어요. 처음 읽기 29회와 수정 재확인 5회는 같은 자료에 대한 34회 도구 호출이며 새 그림 34종을 의미하지 않아요. GIF 2개와 영상 1개는 metadata만 확인했고 pixels/frame/음성/영상 내용은 읽지 않았어요.

초기 분석에서 발견한 관찰 오류 세 곳을 분석자가 수정한 뒤 다시 원 pixels와 대조했어요. **최종 고정 범위의 정지 그림 관찰·HB 판단 구분은 일치**해요. 전체 Packaging 본문·연결 API·모든 media 검증은 아니며 `strictVerified=0`, ledger 승격 0을 유지해요. 획득·해시·구조 추출은 의미 읽기로 세지 않아요.

## 분석 pin과 수정 이력

| 대상 | 초기 pin | 수정 후 독립 대조한 최종 pin |
| --- | --- | --- |
| 분석 MD | `e1e91ebaf579e3e70ae6bf800d020515e3e230630a52b17a9d639d00dc7015e3` | `f0670dc92603b1dfeb9d64ba6a0b8274ffdafd37ec8b44ba52efbd91a2e08d9a` |
| 분석 JSON | `43171f930cf440749a40a6ae21d1a98483bccb880ea55f6485112ffe79ec26bf` | `80cbb41348ef01ba9c5a7078d70371c98a29d8d57480f738a7e1349841e69ad5` |
| private media-review | `dccb7c9079c531ee80e17b4d6d6db5546a578cd89dc9a1cb3168c9bc35e821b2` | `3db4c777ce516c73b430c03779ef0e96543ed2ddc89c095a8f4fe2ff70591443` |

1. 그림 3/17: 처음 MD의 SDK 숫자가 다르다는 문장은 잘못된 관찰이에요. 두 그림은 같은 allowed/installed SDK 값을 표시하며 layout/크기가 달라요. 예시 설치 상태를 현재 toolchain 요구로 확대하지 않는 수정 후 제한은 타당해요.
2. 그림 9/14: 처음 JSON의 `shader denylist` 표현은 부정확해요. shader code 공유 항목과 **Ini Key Denylist / Ini Section Denylist**는 별도 행이에요. 수정 후 설명과 pixels가 일치해요. UI 배열 개수·체크 상태는 이 예시 화면의 값이에요.
3. 그림 28: `Date modified` 열에 `5/8/2025`가 보여요. 처음의 ISO 날짜 표현은 locale 해석을 포함했고 촬영일로 읽힐 수 있었어요. 최종 설명은 파일 수정일 문자열만 관찰 사실로 남기고 날짜 형식·촬영일을 미확인으로 구분했어요.

초기 세 오류는 수정으로 해결됐으며 최종 pin에서 남은 관찰 모순은 발견하지 못했어요. 초기 오류가 없었던 것으로 기록하지 않아요. [기계 대조 기록](unreal-packaging-media-verification-016.json)은 초기·최종 hash와 ordinal별 실제 범위·관찰·재확인 이력을 보존해요. 분석 011의 당시 pixels 미독 기록과 pin은 바꾸지 않았어요.

## 정지 pixels와 판단 대조

| ordinal | 독립 관찰 및 대조 결과 |
| --- | --- |
| 0–1 | 개발 과정 중 packaging 사용 범위와 Build/Cook/Stage/Package의 괄호, 뒤의 Deploy/Run이 보여요. package/install/play 결과를 분리하는 것은 HB 설계 판단이에요. |
| 2/6 | 같은 Platforms 툴바 화면이며 bytes hash도 같아요. 메뉴 위치 관찰과 일치해요. |
| 3/7/8/16/17/18/30 | 검색, offline quick-launch 기기, platform 목록, cook/package 진입, on-the-fly 체크, config/architecture 선택, SDK 상태, Project/Legacy Launcher와 Device Manager가 보여요. 항목 존재를 모든 target 지원·기기 연결·설치 성공으로 확대하지 않았어요. 3/17의 SDK 값은 같아요. |
| 4–5/21–25 | cooking 진행/완료와 packaging 진행/완료/실패/취소 완료가 다른 문구·아이콘으로 표시돼요. 진행 알림의 Cancel과 Output Log, 완료/실패 알림의 log 접근을 확인했어요. Cancel 요청과 실제 canceled 결과를 분리하는 HB 계약은 합리적이지만 정지 그림이 내부 cleanup/atomicity를 입증하지 않아요. |
| 9/14/15 | Packaging 검색·분류·접기, ini writable 표시, import/export, 배열 및 설정 행, 별도 build config 부분 화면을 확인했어요. denylist는 ini 항목이에요. 9/14는 동일 bytes이며 같은 pixels를 반복해요. config의 Development 및 checkbox는 예시 값이고 default 전체 계약이 아니에요. |
| 10–13 | 프로젝트 분류·template·preview·Blueprint/C++ 선택과 target/quality/variant, location/name/create가 보여요. Edit 메뉴에서는 Project Settings와 비활성 Undo/Redo 이유가 보여요. editor startup map/game default map, 검색형 asset picker와 clear 항목도 구분돼요. 저장 성공·전체 command/shortcut 문맥은 그림만으로 확정하지 않아요. |
| 26–27 | Window 메뉴의 Device Output/Message/Output Log, layout 조작과 일부 shortcut, Message Log의 Packaging Results 분류를 확인했어요. 결과 영역은 비어 있고 Page/Clear는 비활성으로 보여요. 빈 log를 package 성공 증거로 세지 않는 제한이 맞아요. |
| 28–29 | Windows 출력 폴더에는 application, Engine/MyProject 폴더와 manifest들이 함께 보여요. console에는 quit 입력이 보이지만 실행 완료는 보이지 않아요. 폴더만으로 모든 파일의 배포 필수 여부를 정하거나 Shipping console 지원을 보장할 수 없어요. 날짜는 파일 수정일 표시예요. |

분석 MD의 source 관찰 열과 HB 설계 열, 이후 `HB 판단` 문단은 구분돼요. 공통 profile/target/job/revision/artifact/log/capability 경로, 편집 중 장기 작업·실패 재시도·사람과 AI의 동일 결과 요구는 HB의 제안이에요. 원엔진 내부 프로토콜·transaction·cancel cleanup을 공식 API 계약으로 확정한 것은 아니에요. PC 제작 그림에서 모바일 editor 호스트/Android native package/install/play의 동작 증거를 얻은 것으로 세지 않아요.

## 출처와 범위 제한

출처는 [Epic Packaging 본문](https://dev.epicgames.com/documentation/en-us/unreal-engine/packaging-your-project?application_version=5.8)의 011 캐시예요. source SHA `d82066c1d6472309ba2551f0f1405b5679f56456fa04840dc710027cd5e9e8de`, body SHA `8ee5a6e800dd901df3517a043490378f32f03cceead86f39fe36bde511c97007`가 일치해요. 원 획득은 `2026-10-04T05:26:31.442618+00:00`, SSR metadata의 문서 revision은 `maeoPE`, 갱신 시각은 `2025-11-05T16:54:15.867Z`이며 적용 목록은 5.6/5.7/5.8이에요. 요청한 판본 5.8과 각 screenshot의 정확한 촬영 판본을 동일하게 간주하지 않아요.

source/body/SSR와 분석 evidence를 포함한 파일 hash **39개**를 재산출해 모두 일치했어요. body의 img ordinal/URL/alt 31개와 원 파일 format/dimension/frame metadata 31개도 일치해요. 영상은 SSR `blocks[114].items[2][1]`의 Kaltura metadata 한 개이며 body HTML에는 미독 placeholder가 있어요. GIF는 330/9 frame metadata만 확인했어요. 이는 frame pixels 읽기가 아니에요. 영상 metadata hash는 canonical sorted compact JSON으로 별도 일치했어요.

이번 독립 범위는 분석 MD/JSON 전체, 29회 정지 pixels, media locators/metadata와 source provenance에 한정돼요. 원 웹 기술 본문 전체·표/코드 전체를 새로 읽었다고 세지 않아요. 남은 범위는 GIF 2개 전체 frame, 영상 1개 내용, screenshot 판본/default/날짜 locale, profile/launcher/log/packaging 전체 API 및 shortcut 문맥, thread/lifetime/failure/cancel/cleanup 계약, target별 최신 SDK·서명·배포 의존성, 모바일 editor/native startup와 실제 install/play 증거, HB 구현 검증이에요. 정지 그림 대조 완료와 전체 corpus/API `verified`는 구분해요.

원문 전체 pixels·코드·표는 공개 문서에 복제하지 않았어요. 이 대조에서는 foreground 창·브라우저·엔진 GUI·SDK 설치·패키지·게임·테스트를 실행하지 않았고, shared status/ledger/엔진 코드/commit을 변경하지 않았어요.
