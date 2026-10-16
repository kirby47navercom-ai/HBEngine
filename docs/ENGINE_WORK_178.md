# 모델 가져오기 제작·재가져오기·실행 연결

원본 모델의 **가져오기 설정**을 콘텐츠 우클릭 또는 원본 미리보기에서 연다. 배율·파일 단위·원본 위 축·앞 방향·이동/회전과 하위 메시의 표시/그림자를 일반 문서처럼 저장/Undo/Redo한다. 실제 3D 미리보기, 검색/종류 필터와 표시 구간만 재사용하는 하위 에셋 목록을 제공한다. 새 모델 드롭은 설정 sidecar를 만든다. 기존 설정 없는 모델은 좌표를 바꾸지 않고 기존 v1 설정은 단위 변환을 자동으로 켜지 않는다.

glTF/GLB의 parser association, FBX Model ID, OBJ 실제 기하 그룹을 원본 대상으로 사용한다. 예전 meshes→meshe 오기를 마이그레이션한다. 명시 ID·유일 이름·유일한 자기완결 내용에 따른 대응과 현재 원본 SHA를 구별한다. 이름 중복/편집으로 대응을 확신할 수 없으면 기존 오버라이드를 **미연결** 목록에 보존하며, 사용자가 새 대상으로 연결하고 Undo할 수 있다. 불확실한 중복 이름에 설정을 일괄 적용하지 않는다. 런타임 조회 표는 한 번 구축해 매 하위 에셋마다 전체 메시를 다시 찾지 않는다.

설정은 독립 루트에 적용하며 원본 정점·리그·애니메이션 트랙 이름을 다시 쓰지 않는다. 편집 미리보기/배치/게임과 C++ 조회용 glTF 헤드리스 로더가 같은 변환/메시 설정을 쓴다. 부모 배율이 루트 모션 이동량에 빠지던 문제도 고쳤다. 배치 렌더러가 하위 메시 표시/그림자 설정을 덮어쓰던 문제를 수정했다. 원본 SHA가 달라지면 재가져오기를 요구한다. 설정 파일의 원본 경로가 대상 모델과 다르면 저장 전에 거부한다.

원본 파일 이름 변경은 설정 파일도 함께 옮기고 양쪽 참조 리디렉션/안정 ID를 유지한다. 대상 충돌과 리디렉션 기록 실패 때 두 파일을 복구한다. 설정 저장은 일반 revision/CAS를 사용해 외부 수정 위에 덮어쓰지 않는다. 재가져오기는 배율·미연결 오버라이드 등 기존 메타데이터를 보존한다. 패키징은 Assets 밖에서 참조한 모델의 설정 파일도 포함한다.

AI는 modelimport.open으로 반환받은 문서 path/revision에 기존 document.get/patch/save·Undo를 사용한다. modelimport.preview는 GPU 읽기 없이 경계/메시 수/표시 수를 반환한다. 새 의존성·자동 GPU 읽기 0. 미리보기는 바뀔 때만 그리며 창 닫기 때 예약 프레임·관찰자·기하/재질/텍스처를 해제한다.

[17군 CPU 및 실제 Win32 제작·DirectX 출시 게임·WebGPU 게임 근거](research/ENGINE_WORK_178.json). 실제 FBX 메시/파일 단위, 사람 배율/표시/미연결 재연결/Undo, 게임 모델 표시와 같은 C++ 루트 이동 조회를 확인했다. 성능/FPS 또는 실제 휴대폰의 검증 결과로 세지 않는다.

대조한 범위는 [UE5.8 FBX Import Options](https://dev.epicgames.com/documentation/unreal-engine/fbx-import-options-reference-in-unreal-engine) 본문0–170과 [Unity6000.5 Model Import Settings](https://docs.unity.com/en-us/engine/6000.5/manual/assets-and-media/asset-types/models/importing/fbximporter-model) 본문183–319이다. 연결 API·Rig/Animation/Materials 문서·미디어·전체 corpus는 읽은 것으로 세지 않는다. FBX 전체 애니메이션의 C++ 헤드리스 지원, 재질 추출/대응, 임포터의 형식별 기하/노멀/UV/LOD 품질과 추가 코덱은 원장에 구별해 남긴다.
