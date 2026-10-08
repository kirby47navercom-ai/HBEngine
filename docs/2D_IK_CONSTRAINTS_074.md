# 2D 관절 회전 제한 — 074

2026-10-08. 기존 SpriteSkin과 IK Manager 2D의 세 솔버·목표·가중치·편집기·공용 실행을 확장한다. 기존 리그에 새 필드가 없어도 그대로 읽는다.

## 제작과 계산

스프라이트 리그에서 솔버를 선택하고 **관절 회전 제한**의 추가 버튼으로 뼈·최소/최대 각도를 지정한다. 중복되지 않은 체인 뼈를 선택하며 삭제·수치 변경·Undo/Redo·저장은 기존 문서 작업을 공유한다. 선택한 솔버의 관절 범위는 캔버스에 부채꼴로 표시한다. 실행 중에는 작성 필드를 잠그고 실행 복사본의 범위를 표시한다. 루트/이펙터를 바꾸면 새 체인 밖 제한을 같은 Undo 작업에서 제거한다.

`rotationLimits: [{bone,min,max}]`는 안정적인 **뼈 ID**와 작성 바인드 포즈의 로컬 Z 회전 대비 각도를 사용한다. 단위는 도, 범위는 -180~180이고 min≤max다. 경계를 가로지르는 구간은 사용하지 않는다. min=max는 관절 잠금, 목록이 비어 있으면 자유 회전이다. 반복마다 제한을 누적하지 않는다. 주기 경계 밖의 각도는 원 위에서 가까운 허용 끝점으로 제한한다.

CCD는 각 관절의 회전 단계에서 제한하고 길이를 보존한다. FABRIK는 전방 점 복원 뒤 관절별 범위를 투영하고 반복한다. Limb는 기존 해석식을 시작 포즈로 사용한 뒤 제한을 투영하며, 필요하면 남은 반복 횟수로 제한된 CCD를 계산한다. **HB의 이 혼합 방식이 Unity 구현과 같다는 주장은 아니다.** Limb 제약이 있을 때 반복/허용 거리도 편집한다. 불가능한 목표는 도달 실패·남은 거리·반복/계산 한도를 반환한다.

양수 가중치 혼합 뒤에도 범위를 지킨다. 입력 애니메이션이 범위 밖이면 작은 양수 가중치에도 경계로 움직일 수 있다. 가중치 0은 입력을 그대로 보존한다. 같은 입력/목표/제약은 기존 캐시를 사용하고 배열은 재사용한다. 직선 체인 계산 시작의 작은 회전을 실제 관절 회전으로 바꿔 길이가 바뀌는 문제도 제거했다. 현재 O(n²) CCD/제약 투영 비용과 기존 반복 작업 예산을 유지하며 전체 FPS 개선으로 세지 않는다.

여러 솔버나 뒤의 애니메이션 레이어가 앞 솔버의 결과를 바꿀 수 있다. 이 제한은 해당 솔버의 출력 계약이며 전체 최종 골격의 전역 제약은 아니다.

## 공용 함수와 AI

`hb::IK2D::SetRotationLimit(actor,solver,bone,minimum,maximum)`와 `ClearRotationLimit(actor,solver,bone)`를 추가했다. 같은 선언에서 BP의 영어/한국어 검색 노드 `ik2dSetRotationLimit`·`ik2dClearRotationLimit`를 생성한다. C++는 잘못된 각도에 명령 발행 전에 오류를 내고 공용 서비스는 체인/ID/값을 검사한다. 계산은 기존 IK 단계에서 수행하며 C++ 호출 내부에서 즉시 뼈 계산이 끝났다고 간주하지 않는다.

AI의 기존 document.patch/dryRun/expectedRevision·검증·Undo를 그대로 사용한다. schema.spriteRig.ik.rotationLimits가 기준 포즈·자료형·범위·세 솔버의 계산·함수 계약을 제공하며 runtime.state.spriteSkin[].ik에는 실행 제한 목록을 공개한다. 매 프레임 새 스키닝/관절 시스템을 만들지 않았다.

## 확인과 근거

`test:sprite-ik`는 세 솔버의 제한된 목표 도달·관절 잠금·불가능한 목표·손끝 회전·양수/0 혼합·100회 비누적·캐시/배열·바인드 각도·주기 경계·잘못된 중복/ID/역순/비유한 값과 구형 리그를 확인한다. 직선 시작/원점/역방향 계산의 길이도 검사한다. 기존 3D IK·리타게팅·실제 C++ 스프라이트 리그·713 BP 노드·공용 API 생성 검사도 통과했다.

`test:sprite-ik-limits-editor`·`test:sprite-ik-limits-player`는 고유 임시 프로젝트/프로필/포트의 실제 비활성 Win32/WebView2 창에서 C++ 제한/거절/해제, BP 잠금/복구, 실제 뼈와 변형 스프라이트·한글 HUD·원래 배치, 작성/Undo/저장/잘못된 dryRun·실행 중 잠금을 확인한다. Editor `sprite-ik-limits-editor-fszJTj`, release Player `sprite-ik-limits-player-Tt6Pda`의 원본 보존·오류0·exit0·서버 종료·제품 SHA는 [증거 JSON](research/2D_IK_CONSTRAINTS_074.json)에 기록한다. 이전 Editor 실패는 검사 스크립트가 솔버 선택 후 뼈 속성 입력을 찾은 원인이며 검사 선택 흐름을 수정했다.

[Unity 2D Animation 13.0.6 2D IK](https://docs.unity3d.com/Packages/com.unity.2d.animation@13.0/manual/2DIK.html)의 자체 기술 본문 전체와 [CCDSolver2D](https://docs.unity3d.com/Packages/com.unity.2d.animation@13.0/api/UnityEngine.U2D.IK.CCDSolver2D.html)의 자체 Properties/Methods를 다시 읽었다. 목표 회전 고정이 관절 각도 제한과 다르다는 의미와 순서·가중치·반복·기즈모 제작을 대조했다. 문서가 언급하는 회전 제한의 실제 패키지 구현을 읽었다고 표시하지 않는다. 연결 페이지/영상·상속 API·패키지 전체는 이번 읽기 범위가 아니다. 원문/SHA는 `native/build/ik2d-constraints-research-074`에 보존했고 기존 출처 범위를 전체 읽기로 승격하지 않았다.

051의 다른 누적 세부와 FullBody/ControlRig·3D 축별 bind 제약·리타게팅의 남은 연산을 계속 남긴다. 사용자 설치, 전체 corpus 분석, PC120/모바일60·장시간 RAM·실기기 판정은 이 검사로 바뀌지 않는다.
