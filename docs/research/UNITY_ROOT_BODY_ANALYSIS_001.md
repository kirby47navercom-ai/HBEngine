# Unity 기준본 본문 분석 001

기준은 Unity 6000.0 영어 공식 배포본(job 76410965, 2026-09-29)이에요. 이 기록은 매뉴얼 6개와 `Transform.Translate` API 1개의 본문을 직접 읽은 결과예요. 전체 문서 분석 완료 기록은 아니에요. 각 페이지의 원문·추출 본문 hash와 읽은 구역은 `native/build/reference-corpus/unity-root-batch`의 snapshot/review/analysis 기록에 묶어요. 편집기 입구와 2D/3D 설정 두 본문은 별도 담당자의 독립 대조를 통과했고 나머지 5개는 검증 대기예요. 엔진은 수정하지 않았어요.

이 묶음은 공식 매뉴얼의 입구, 편집기 입구, 문서 확보 방법, 작업 공간, 2D/3D 기본값, 뷰포트 조작으로 이어지는 본문이에요. 다른 제작 영역을 제외하는 목록이 아니에요. 링크된 하위 문서·API는 별도 미독 대기열에 남겨요.

## 매뉴얼 입구: 제작 분야를 누락하지 않는 분류

[UnityManual.html](https://docs.unity3d.com/6000.0/Documentation/Manual/UnityManual.html)의 본문은 이 판본이 Unity 2023.1/2023.2와 6.0 Preview에서 이어지는 LTS라고 설명해요. 현재 최신 버전이나 모든 역사적 판본을 읽었다는 근거로 사용하지 않아요. 업그레이드와 새 기능 문서를 별도 비교 대상으로 유지해야 해요.

상단 6개 소개는 렌더링 성능, 멀티플레이 제작, 여러 플랫폼, Sentis를 통한 런타임 추론, 조명·프로파일링·Shader Graph·VFX Graph, ProBuilder·Cinemachine·UI Toolkit 등의 편집 생산성을 연결해요. 기능 이름이 있다는 사실과 각 기능의 세부 동작을 분석했다는 사실을 구별해요. AI 게임 행동과 머신러닝 모델 실행도 서로 다른 요구로 분리해야 해요.

본문의 14개 제작 분야는 애니메이션, 오디오, 2D, 조명, 멀티플레이, 패키지 관리, 물리, 플랫폼, 렌더링, 스크립팅, UI, 서비스, 시각 효과, XR이에요. 2D 설명에는 게임플레이·스프라이트·물리가 함께 있고, 애니메이션에는 아바타·클립·상태 머신이 함께 있어요. HBEngine에서도 메뉴 한 항목으로 해당 분야를 완료 처리할 수 없어요. 각각의 편집 데이터와 실행 계약을 후속 본문/API에서 확인해야 해요.

추가 자료는 지원 엔지니어의 모범 사례, 토론, Knowledge Base, 단계별 글·영상, Asset Store 도움말을 연결해요. 주인님이 요구한 조사에는 튜토리얼 이외의 운영·문제 해결·참조 자료도 포함돼요. 커뮤니티 글의 사실은 공식 계약과 구별하고 원글·버전·검증 근거를 유지해야 해요.

이 페이지의 20개 그림은 기능 분야를 소개하는 이미지예요. 원본 ZIP에서 추출한 모든 이미지를 확인했어요. 여기서 렌더링 품질·성능 수치, UI 세부 조작, 실제 네트워크 구현을 추론하지 않았어요. 이 페이지는 API 선언이나 함수의 기본값·수명·스레드 계약을 제공하지 않아요.

## 편집기 입구: UI 배치와 작업 모델을 함께 조사

[unity-editor.html](https://docs.unity3d.com/6000.0/Documentation/Manual/unity-editor.html)은 작업 공간을 제작·정리·관리의 중심으로 설명하고 7행의 분야 표를 제공해요. 탐색·단축키·검색·작업 관리, 주요 창, 배치·사용자 도구, 편집기와 프로젝트 설정, 분석 데이터, 문제 해결, 명령줄 실행이 각각 다른 문서 계열이에요. ‘Scene/Hierarchy/Inspector/Project 창이 있다’는 것만으로 편집기 전체를 조사했다고 할 수 없어요.

HB 적용 판단은 공통 작업 모델 위에 창·검색·포커스·단축키·설정·복구·명령줄을 연결해야 한다는 것이에요. 공용 AI 명령에는 안정적인 창/문서 ID, 포커스 문맥과 상태 저장이 필요해요. 이것은 HB 설계 판단이며 Unity가 제공하는 AI 인터페이스라고 주장하지 않아요. 이 입구의 표 전체와 추가 토론 링크를 읽었지만 하위 7계열은 이 페이지의 분석 상태를 상속받지 않아요.

## 오프라인 배포: 본문 확보와 읽기 상태를 분리

[OfflineDocumentation.html](https://docs.unity3d.com/6000.0/Documentation/Manual/OfflineDocumentation.html)은 공식 ZIP에 Manual과 Scripting API가 들어간다고 설명해요. 페이지의 용량 표시는 근사치예요. 실제 수집한 ZIP은 392,108,580 bytes이며 SHA-256은 `cf07df16fbe4ca7d174cc15bfeb2503995cc4140b42368d0ae7bf17b7805b28f`예요. 전체 CRC를 확인했지만 CRC 통과는 본문 읽기나 분석을 입증하지 않아요.

Manual/ScriptReference 예시 그림 2개를 원래 해상도로 확인했어요. 그림은 과거 외형의 예시이며 현재 버전의 창 구성을 규정하는 자료로 사용하지 않아요. 패키지·서비스·영상·모든 과거 판본이 ZIP에 들어 있다는 주장은 본문에 없어요. 이 계열을 별도 수집해야 해요.

## 작업 공간: OS 창·탭·분할·저장의 서로 다른 계약

[CustomizingYourWorkspace.html](https://docs.unity3d.com/6000.0/Documentation/Manual/CustomizingYourWorkspace.html)의 모든 본문 구역과 5행의 배치 표를 읽었어요. 메뉴에서 추가한 창은 새 탭으로 열리고, 탭 이름의 우클릭에는 최대화·닫기·탭 추가·Overlay 관리가 있어요. 제목 드래그로 위치를 바꾸며 대상 위치에 윤곽 미리보기를 표시해요.

하나의 floating OS 창에 여러 탭을 둘 수 있어요. FloatingWindows 그림에서 검색 창 2개가 메인 편집기와 별도의 OS 창을 구성하는 것을 원래 해상도로 확인했어요. DockZones GIF 105프레임 전부의 배치 이동을 접촉 시트로 확인하고 26/78프레임을 확대해 분할 위치 변경을 대조했어요. 확대 전 프레임에서 작은 메뉴 글씨의 세부를 판독했다고 주장하지 않아요. 메뉴의 기능은 본문의 표를 근거로 삼아요.

배치 저장은 현재 배치 저장/이름 지정/기존 배치 덮어쓰기와, 프로젝트 사이에서 쓸 파일로 내보내기가 구별돼요. 파일 가져오기, 기본·사용자 배치 삭제, 전체 초기화도 별도 동작이에요. 드래그의 구현 방식·파일 포맷·모니터 제거 시 복구 정책·Undo 여부는 이 본문에 없어요.

HB에는 OS 창마다 여러 탭과 분할 트리, 창 사이의 이동, 미리보기, 닫기/복구, 배치 저장/내보내기/가져오기가 함께 필요해요. 사람의 탭 드래그와 AI의 창 이동 명령은 동일 모델에서 검증되어야 하고 게임 월드 데이터와 편집기 배치는 다른 저장 책임을 가져야 해요. 현재 HBEngine에 해당 계약이 모두 구현됐다는 판정은 하지 않았어요.

## 2D/3D 설정: 보기 전환만으로 제작 모드를 구현할 수 없음

[2DAnd3DModeSettings.html](https://docs.unity3d.com/6000.0/Documentation/Manual/2DAnd3DModeSettings.html)의 시작 설명, 설정 단계, 비교 표의 모든 행, 추가 자료를 읽었어요. 새 프로젝트에서 모드를 선택할 수 있고 이후에도 `Edit > Project Settings > Editor > Default Behavior Mode`에서 바꿀 수 있어요.

| 비교 계약 | 2D | 3D |
| --- | --- | --- |
| 새 이미지 임포트 기본값 | Sprite로 간주 | Sprite로 가정하지 않음 |
| Scene view | 2D | 3D |
| 새 기본 객체 | 실시간 방향광 없음 | 실시간 방향광 있음 |
| 기본 카메라 위치 | (0, 0, -10) | (0, 1, -10) |
| 투영 | 직교 | 원근 |
| 새 Scene의 환경광 | Skybox 비활성화, Color (54,58,66) | 기본 Skybox, Skybox 환경광 |
| 문서의 GI/자동 빌드 표 | 실시간 GI 끔, 베이크 GI 켬, 자동 빌드 끔 | 실시간 GI·베이크 GI·자동 빌드 켬 |

표의 GI 기본값은 이 문서의 서술이에요. URP/HDRP/Built-in별 지원 여부와 현재 실제 설정을 이 표 하나로 확정하지 않고 관련 렌더 파이프라인/API의 적용 조건을 후속 검증해야 해요. 기존 Scene·임포트된 이미지가 전부 자동 변환되는지, 2D 물리와 3D 물리가 합쳐지는지, 투영을 바꾸면 게임이 2D로 바뀌는지에 대한 근거도 없어요.

HB의 2D·2.5D·3D는 동일 프로젝트 안에서 편집 뷰, 객체/컴포넌트, 임포트 정책, 게임 카메라와 물리 공간을 구분해야 해요. 예를 들어 직교 뷰에서 3D 월드를 편집하는 것과 2D collider를 실행하는 것은 다른 계약이에요. AI 프로젝트 생성도 이 기본값을 명시적인 데이터로 설정해야 해요. 2.5D의 정확한 실행·정렬 정책은 이 출처에서 제공하지 않으므로 HB 설계 판단과 추가 연구로 남겨요.

## Scene 조작: 포커스·입력 장치·투영별 조건

[SceneViewNavigation.html](https://docs.unity3d.com/6000.0/Documentation/Manual/SceneViewNavigation.html)의 10개 본문 구역, 2개 조작 표와 6개 그림을 확인했어요. 기본 조작 대상은 편집 Scene Camera이며 실제 카메라 컴포넌트를 조종하려면 별도 Cameras overlay 경로를 사용해요. 게임 카메라를 선택했다는 이유로 편집 시점 변화가 게임 데이터 변경과 같다고 볼 수 없어요.

Orientation overlay는 축 클릭으로 정면/측면/위쪽을 잡고 우클릭 방향 메뉴와 Free 복귀를 제공해요. 중앙 cube/아래 문구로 원근·직교를 바꾸고 Shift+cube로 보기 각도를 복귀해요. 회전 잠금 시 우클릭은 회전 대신 pan으로 바뀌어요. 2D에서는 overlay가 없고 XY에 수직인 보기로 제한돼요. Mac의 2손가락 zoom과 3손가락 방향 전환은 OS gesture 활성화 조건을 갖고 있어요.

방향키는 시선 앞뒤와 좌우 pan, Shift는 속도 증가예요. Q View tool에서는 drag pan, Alt/Option+LMB orbit, Alt/Option+RMB zoom이 있고 회전 잠금/2D에서는 orbit이 제한돼요. Flythrough는 원근에서 RMB+W/S/A/D/Q/E와 Shift를 사용해요. 직교에서 RMB 움직임은 orbit, 2D에서는 pan이에요. wheel은 flythrough 중 속도를 바꾸므로 평소 zoom과 포커스별 의미가 달라요.

3버튼 마우스에서는 MMB pan, Alt+LMB orbit, wheel 또는 Alt+RMB zoom을 도구 선택과 별개로 사용할 수 있어요. 2버튼 장치와 Mac의 한 버튼/트랙패드는 modifier 조합이 다르게 표기돼 있어요. Camera Speed는 View Options overlay에서 설정하며 backtick Overlay 메뉴로 해당 overlay를 찾을 수 있어요.

선택한 객체에 F를 쓰려면 Scene view에 포인터를 두어요. 이미 선택된 객체에는 pivot 중심의 zoom이 적용돼요. `Edit > Frame Selected` 메뉴도 있고 Shift+F/`Edit > Lock View to Selected`는 움직이는 선택 객체를 따라가요. 이는 프로젝트 메인 화면으로 되돌아가는 동작과 다르고, 뒤로가기 history의 계약은 이 페이지에 없어요.

HB는 주인님이 요청한 Unreal 기본 조작과 Unity의 제작 편의를 충돌 없이 정리해야 해요. 단축키→현재 창·투영·도구·pointer capture→편집 카메라 상태로 이어지는 조건표가 필요해요. AI는 키를 흉내 내는 방식 외에 같은 카메라 상태/선택/frame 명령을 사용하도록 설계해야 해요. 아직 문서 비교 단계이므로 Unity와 Unreal의 조작을 한 표에 섞어 실제 지원한다고 표시하지 않아요.

## Transform.Translate: 같은 이름의 6개 선언과 공간 계약

[Transform.Translate](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Transform.Translate.html)의 4개 overload 설명 묶음, 6개 선언, 모든 설명 문단과 4개 코드 예제를 읽었어요. 웹사이트의 feedback form은 API 본문과 구분했고 단일 overload로 축약하지 않았어요.

입력 형태는 Vector3 또는 x/y/z 세 float이고, 기준 공간이 생략된 형태, `Space`를 받는 형태, 다른 `Transform`을 받는 형태를 각각 제공해요. `Space` 인수의 표시 기본값은 `Space.Self`예요. 생략/Self는 대상의 로컬 축, World는 월드 좌표계 기준이에요. 다른 Transform을 받는 형태는 그 Transform의 로컬 축을 사용하며 NULL은 월드 공간이에요. 모든 선언의 반환은 void예요.

예제의 초당 이동은 호출 내부의 자동 시간 적분이 아니라 입력 이동량에 `Time.deltaTime`을 곱해 만들어요. 로컬 z 이동, 월드 y 이동, 카메라 기준 x 이동이 구별돼요. 매 호출 거리와 속도를 같은 핀/함수 이름으로 혼동하면 C++과 Blueprint의 결과가 달라질 수 있어요.

이 본문은 충돌 sweep·물리 solver 이동, negative/non-finite 입력의 실패 방식, 호출 스레드, 좌표 변환의 scale/부모 수명 처리까지 규정하지 않아요. Rigidbody 이동 함수와 동등하다고 가정하지 않아요. 연결된 `Transform`, `Space`, `Vector3`, `Time.deltaTime`, `Camera.main` 개별 계약은 별도 미독 항목이에요.

HB 대응에는 위치 변경, 거리 기반 translate, 속도×시간 이동, 로컬/월드/참조 Transform, 물리 body 이동을 구별하는 공용 C++/노드 계약이 필요해요. AI schema에는 단위·space·기준 객체와 잘못된 참조의 오류를 표현해야 해요. C# 선언을 C++ 선언으로 그대로 복사하거나 현재 HB 함수가 6개 overload와 동등하다고 주장하지 않아요.

## 다음 검증

위 본문의 직접 확인과 하위 계약의 완료를 분리해요. 개별 원문/API의 전체 overload와 링크, 패키지 호환 버전, 그림/동적 탭, 제한된 문서, 실행 단계와 오류 계약을 다른 분석 묶음에서 계속 확인해야 해요. 전체 gate는 닫힌 상태로 유지하고, 여기서 제안한 HB 대응을 구현으로 옮기지 않아요.
