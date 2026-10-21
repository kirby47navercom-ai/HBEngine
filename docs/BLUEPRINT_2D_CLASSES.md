# 2D 클래스와 컴포넌트 미리보기

새 블루프린트와 C++ 클래스의 부모 선택에서 다음 클래스를 사용해요. 같은 class-types.js 정의를 생성 대화상자·속성·생성 카탈로그·C++ 생성기에 사용해요.

| 클래스 | 상속 | 기본 구성 |
|---|---|---|
| SpriteActor | Actor | Transform, SpriteRenderer |
| Pawn2D | Pawn | SpriteRenderer, BoxCollider2D, Rigidbody2D, TopDownMovement2D |
| Character2D | Character → Pawn | SpriteRenderer, CapsuleCollider2D, Rigidbody2D, CharacterMovement2D |
| TopDownCharacter2D | Character2D | SpriteRenderer, CircleCollider2D, Rigidbody2D, TopDownMovement2D |

이동 클래스는 Transform을 포함해요. 플랫폼 캐릭터는 중력·접지·점프를 사용해요. 탑다운 구성은 XY 이동과 중력 해제, 2D 회전 잠금을 기본으로 해요. 플레이어 지정은 기존 GameMode의 defaultPawn, PlayerController의 pawn 또는 이동 컴포넌트의 autoPossess로 해요. 일반 SpriteActor를 생성했다고 자동으로 플레이어로 지정하지 않아요.

새 Actor와 Pawn 블루프린트는 MeshRenderer를 강제 추가하지 않아요. 기존 파일에 저장된 컴포넌트는 그대로 유지해요. 부모 변경 시 사용자 컴포넌트를 자동 삭제하거나 다른 물리 차원으로 변환하지 않아요. 2.5D는 기존 SpriteRenderer·3D 변환·카메라와 원하는 차원의 충돌 컴포넌트를 조합해요.

GameMode의 2D 기본 플레이어 생성, 블루프린트 배치, 에셋·기본 클래스·사용자 C++ 클래스 Spawn이 같은 구성을 사용해요. 상속 클래스 조회는 기존 Actor/Pawn/Character 검색도 유지해요. C++의 hb::Character2D* 같은 포인터와 포인터 배열은 실제 월드의 기본 클래스 형식에 맞게 변환돼요. 사용자 코드에 붙은 객체의 작성 위치를 기본 생성자의 원점으로 덮어쓰지 않아요.

## 사람과 AI가 같은 미리보기를 사용해요

블루프린트의 **컴포넌트 뷰포트**는 공용 sceneRendering으로 실제 SpriteRenderer·모델·콜라이더를 표시해요. 가짜 상자 메시로 바꾸지 않아요. 기존 뷰포트의 카메라 조작, F 초점, 원근·직교 방향, 표시 모드·플래그·카메라 설정·북마크를 재사용해요. 컴포넌트 미리보기에는 해당 창에서 작동하는 메뉴만 표시해요.

기본 실시간 렌더링은 꺼져 있고 변경·카메라 조작·비동기 에셋 준비 때 다시 그려요. 입자·시간 머테리얼은 실시간을 켜서 봐요. 창을 닫으면 전용 렌더러와 리소스를 해제하고, 다시 열면 같은 문서의 카메라를 복원해요. 저장된 객체·게임 월드·물리 시뮬레이션을 미리보기에서 수정하거나 실행하지 않아요.

자동화는 기존 편집기 명령 채널을 사용해요.

    {"method":"blueprint.preview.open","params":{"path":"Assets/BP_Player.hbblueprint.json"}}
    {"method":"blueprint.preview.read","params":{"path":"Assets/BP_Player.hbblueprint.json"}}
    {"method":"blueprint.preview.view","params":{"path":"Assets/BP_Player.hbblueprint.json","settings":{"direction":"2d","focus":true,"presentation":{"realtime":false,"flags":{"collision":true}}}}}

read는 ready/error, 투영·카메라·보기 설정, 실제 스프라이트 이미지 크기와 뒤집기, 메시/정점 수, 그리기/재구성 카운터를 반환해요. 문서 편집은 기존 document.get/patch/save와 revision·Undo 경로를 사용해요. 보기 변경은 문서 데이터의 revision을 바꾸지 않아요. 잘못된 보기 설정은 적용 전에 함께 거절해요. window.close로 창을 닫을 수 있어요.

## 근거와 확인 범위

[PaperCharacter API](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/Paper2D/APaperCharacter)의 Character 상속·Sprite 하위 객체, [Paper2D 개요](https://dev.epicgames.com/documentation/unreal-engine/paper-2d-overview-in-unreal-engine)의 2D/3D 혼합과 Sprite·Flipbook 설명, [Paper2D 컴포넌트](https://dev.epicgames.com/documentation/en-us/unreal-engine/paper-2d-components?application_version=4.27)의 컴포넌트/3D 변환 설명, [Unity Sprite Renderer](https://docs.unity3d.com/6000.0/Documentation/Manual/sprite/renderer/sprite-renderer-reference.html)의 이미지·색·뒤집기·정렬·머테리얼 항목을 대조했어요. 각 페이지의 해당 본문을 읽은 범위이며 연결된 전체 API나 엔진 문서 전체를 분석했다는 뜻은 아니에요.

검사는 check-blueprint-2d-1219.mjs의 실제 Rapier 플랫폼/탑다운 이동·점프·클래스·생성·컴파일된 C++, check-blueprint-2d-1220-window.mjs의 숨겨진 전용 에디터·실제 에셋·수정·창 수명·idle, check-blueprint-2d-1221-player.mjs의 설치본 빌더와 Windows 게임 실행으로 나눠요. 성공 근거의 소유 소스 SHA가 같으면 다시 실행하지 않아요. 실제 결과와 설치 여부는 최신 작업·설치 원장으로 확인해요.
