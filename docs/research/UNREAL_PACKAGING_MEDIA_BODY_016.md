# Unreal Packaging 그림·메뉴·상태 분석 016

2026-10-04, `research_only`. [011](BUILD_EDITOR_PLATFORM_RESEARCH_011.md)에서 텍스트만 읽고 남겨둔 Packaging 이미지 중 **정지 그림 29회·고유 bytes 27종**의 원본 pixels를 실제 보완 읽었어요. 새 웹 본문 29개를 읽은 것은 아니에요. GIF 2개와 본문 영상 1개는 계속 미독이에요. 011의 당시 미디어 미독 기록/분석 pin을 변경하지 않고 이 후속 기록으로 연결해요. 전체 Packaging media나 전체 corpus/API `verified`가 아니에요.

출처는 [Epic Packaging 본문](https://dev.epicgames.com/documentation/en-us/unreal-engine/packaging-your-project?application_version=5.8)이 제공한 원본 이미지예요. source/body hash와 이미지 URL/bytes hash·실제 읽기·GIF metadata는 [기계 기록](unreal-packaging-media-body-016.json)에 있어요. 2/6과 9/14는 각각 같은 pixels를 반복해요. 그림 자체에서 정확한 엔진 판본을 확인하지 못했으며, application_version=5.8 본문에 있다는 이유로 전부 5.8의 현재 UI라고 보장하지 않아요. 출력 폴더 화면 28의 파일 수정일 열에는 `5/8/2025`가 표시돼요. 날짜 형식과 screenshot 촬영일은 이 그림만으로 확정하지 않아요.

## 실제 시각 대조

| 이미지 ordinal | 읽은 사실 | HB 제작 계약에 연결할 판단 |
| --- | --- | --- |
| 0–1 | 제작·테스트·출시·후속 patch와 Build/Cook/Stage/Package, Deploy/Run을 구분하는 도식 | package 성공·install 성공·gameplay 성공을 별도 job 결과로 보관해요. |
| 2–3, 6–8, 16–18, 30 | Platforms 진입·target submenu·검색·SDK/device 상태·config/architecture·cook/package/launcher 흐름 | target 선택 뒤 사용할 host/toolchain/device를 확인하고, 미설치 SDK나 offline device의 원인을 사람이 볼 수 있게 해요. |
| 9, 14–15 | 검색/분류/접기·ini 저장 상태·Import/Export·복합 배열과 build/packaging 설정의 일부 | 세부 기능을 한 버튼으로 숨기지 않고 profile 문서·검증·공용 AI schema로 연결해요. screenshot의 값은 default 증거로 세지 않아요. |
| 10–13 | project template/source language/target 선택, Edit 설정 진입, editor 시작 map과 game 기본 map, 검색형 asset picker | 프로젝트 제작과 게임 시작 장면의 참조·validation을 구분하고, 자산 선택/clear/외부 변경을 같은 명령에 연결해요. |
| 4–5, 21–25 | Cook와 Package의 진행/완료·실패·cancel request·canceled 상태와 log 접근 | 실패·취소·완료 알림을 구분하고 원인/단계/log·재시도/산출물 확인을 연결해요. Cancel 클릭을 곧바로 canceled 완료로 처리하지 않아요. |
| 26–27 | Window의 여러 log와 layout 조작, Message Log의 Packaging Results 분류 | 에디터·빌드·기기 log를 분리하되 target/job와 연결하고, 결과가 비어 있는 화면을 성공 증거로 사용하지 않아요. |
| 28–29 | 실행 application 외에 Engine/Project/manifest가 함께 있으며 게임 console에 quit 입력 | exe 하나만 보낼 수 있다고 추론하지 않아요. 실행·의존 파일과 Shipping 종료 UI는 각 본문/API·기기 검증을 따라요. |

3/17의 SDK 값은 같고 layout/크기가 달라요. 두 screenshot의 allowed/installed SDK 표시는 예시 상태이며 현재 설치해야 할 정확한 SDK 계약은 011에서 확인한 본문/공식 requirements로 조사해야 해요. Build configuration 메뉴가 보여주는 선택, project setting 상속과 override를 확인했지만 모든 target 지원·SDK 자동 설치·추가 옵션의 정의/직렬화 API·메뉴 포커스/마우스 실제 동작은 이 그림만으로 확정하지 않아요.

## 사람·AI·모바일 제작에 적용할 설계

HB 판단: PC와 모바일 모두 profile/target/job ID를 공통으로 유지하고 UI는 해당 host의 조작 공간에 맞춰 제공해요. 장시간 import/compile/cook/package/install/run은 editor 문서를 계속 편집할 수 있는 작업 모델과 연결하며 중간에 source revision이 바뀌면 사용한 snapshot과 생성 artifact를 명시해야 해요. 저장·재열기·기기 선택·권한/서명 참조·진행·취소·log 찾기·실패 재시도는 사람과 AI에서 같은 결과를 가져야 해요.

이 기록은 실제 그림 관찰을 바탕으로 한 HB 설계이며 원엔진의 내부 transaction/atomicity/cancel cleanup 구현을 확인한 것은 아니에요. 그림 29회에 대한 독립 pixels/의미 대조는 아직 별도 대기이고 GIF 모든 frame/영상 본문, profile/launcher/log/packaging의 연결 전체 API와 window shortcut 문맥을 이어 읽어야 해요. foreground 창·Unreal/HB GUI·SDK·패키지·게임 실행 검사는 하지 않았어요. 원본 pixels는 무시 캐시에만 보존해요.
