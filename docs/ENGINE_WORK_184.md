# 184 — 중첩 프리팹 구조 적용과 상속

중첩 프리팹 안의 부모에 추가한 자식과 삭제한 자식을 바깥 프리팹에 적용한다. 안쪽 원본 자산은 수정하지 않는다. 기존 프리팹 Inspector의 적용 버튼과 scene.prefab.apply를 쓰며 원본/장면 CAS·파일 묶음 Undo/Redo를 공유한다.

바깥 자산의 additions에 추가 행을, removed에 한정된 로컬 ID를 기록한다. 중첩 확장 후 삭제를 자손에 전파하므로 나중에 원본에 생긴 하위 자식도 올바르게 제외한다. 추가 행 자체의 속성 적용도 지원한다. 존재하지 않는 부모·ID 충돌·순환·잘못된 필드는 해석/빌드에서 거부하고 외부 장면 자식이 붙은 부모 삭제도 원자적으로 거부한다.

상속된 중첩 앵커가 다시 펼쳐져 ID가 중복되던 경우를 고쳤다. 해석기가 계산한 resolvedAnchors로 기존 확장을 구분하며 앵커 원본을 바꾸면 이전 하위 확장을 정리하고 새 자산을 해석한다. 한정된 자식 속성은 새 확장 뒤 적용한다. 문서에서 준 resolvedAnchors 값은 신뢰하지 않는다.

원본 컴포넌트가 생략된 액터를 포함할 때 안정 ID로 기본 컴포넌트를 정규화해, 적용 후 가짜 컴포넌트 삭제 차이가 남지 않게 한다. 새 의존성·자동 GPU 읽기·전역 객체 제한을 추가하지 않는다.

실제 Inspector 적용/원본 보존·원본과 장면 동시 Undo/Redo, DirectX/WebGPU 게임의 C++ 프리팹 생성과 태그 조회를 확인했다. 기존 프리팹·UV·IK·UI·메시·차량·네트워크 회귀도 통과했다. [검증 근거](research/ENGINE_WORK_184.json).

Structure Apply writes the outer linked prefab. Choosing the inner source as a separate write destination, an isolated prefab editing stage and all Unity prefab modes remain separate.

The optional additions array contains authored actors whose parents may live in the resolved nested hierarchy. Local validation checks actor fields and partial hierarchy; final resolve/build validation checks actual parents, duplicate IDs, cycles and hierarchy limits. Raw resolvedAnchors metadata is ignored; the resolver computes it.

There is no new scene-object cap or global retained prefab cache. Large nested graph time/memory and every source replacement/variant combination require broader evidence. Existing source files without additions retain their behavior.

Physical phones, Xcode, hardware acceleration and whole engine completion are not established by these PC fixture results.


184 설치 확인: 7b716ddfe6174204·명세2497파일 실행 후 SHA 일치·격리 설치 EXE의 중첩 프리팹 적용·원본/장면 UndoRedo·키/슬롯/메시/LOD·오류0/종료0. 사용자 프로필10385파일 전후 SHA 일치. 바로가기/.hbproject 연결 확인, 이전 설치174323655바이트 정리, Versions1. 설치 근거 docs/research/USER_INSTALL_184.json.
