# 접촉 수명과 물리 스텝 이벤트 — 064

2026-10-08. 앞쪽의 관계없는 Actor를 삭제했을 때 뒤쪽 접촉의 Begin/End가 다시 발생하는 실패를 실제 사용자 C++로 재현했다(기대14호출, 실제18호출). 접촉 키의 바인딩 배열 순번을 WeakMap의 바인딩 수명 ID로 교체했다. 삭제/풀 반환된 owner는 호출하지 않고, 살아 있는 owner의 종료 이벤트에서 삭제된 상대는 null로 전달한다. 재사용되어 새 바인딩이 생긴 Actor는 새 접촉으로 시작한다. 알 수 없는 collider type 두 개가 undefined라는 이유로 선택 컴포넌트에 매칭되는 경로도 막았다.

## 제작·실행 연결

- 기존 Begin Overlap / End Overlap / Event Hit의 처음 접촉 계약은 유지한다. 새 Overlap Stay, Collision Stay, Collision Exit를 같은 노드 카탈로그·검색·핀 검증·AI schema에 추가한다. Collider 상세의 여섯 이벤트 버튼과 노드의 대상 컴포넌트 선택이 같은 경로를 사용한다.
- Stay의 float delta는 화면 시간이 아니라 실제 고정 물리 스텝이다. Rapier advance의 after 콜백으로 전달하며 VM의 화면 프레임 fallback(delta=0)에서는 Stay를 반복하지 않는다. 첫 접촉에서는 Begin/Hit만 발생한다. 여러 물리 스텝이 진행되면 각 스텝에 Stay를 전달한다.
- Trigger Stay는 잠든 body여도 유지한다. solid Stay는 알려진 body 모두가 고정/수면 상태이면 생략한다. 깨어 있는 kinematic도 포함하는 HB 정책으로 Unity의 non-kinematic 조건과 같다고 주장하지 않는다. 이전 backend처럼 body 정보가 없는 접촉은 활성 접촉으로 처리한다.
- Collision Exit는 마지막 위치/수신자 방향의 법선을 유지한 HitResult에 hit=false와 현재 유효한 상대 또는 null을 전달한다. UE의 sweep Hit/NormalImpulse/전체 contact 배열과 같다는 뜻은 아니다. 직접 연결한 이벤트에서 hb::Actor*, hb::HitResult, float 인수를 받는 기존 HB_FUNCTION 사용자 함수를 호출하며 별도 DirectX 코드를 요구하지 않는다.

## 묶음 검증

`node tools/check-collision-dispatch.mjs` 최종 RmV9lk: 기존 이벤트 순서/정·역법선/컴포넌트/미연결 접촉, 삭제/풀 반환/재사용/알 수 없는 type, Stay/solid Exit/수면/null 상대, 비배치=배치 C++ 최종 속성, 실제 Rapier 2D·3D 각각 1/60·1/120·1/30 화면 시간에서 물리 스텝 수와 C++ float 전달을 통과했다. `check-scene-runtime.mjs`의62컴포넌트와 `check-physics.mjs`의164강체 검사·C++ 동기 질의/HitResult/배열/힘/각 충격량도 통과했다. 새 기능에 영향 없는 전체 게임/8시간 검사는 반복하지 않았다.

512바인딩·64미연결 접촉의 부분 dispatch 중앙값은 .6188ms다. 063의 .5478ms보다 수명 검증 비용이 추가되었고, 최적화 이전1.6947ms보다 낮다. 전체 FPS 개선 수치나 객체 상한으로 사용하지 않는다. 전체 PC120/모바일60·장시간 RAM 목표는 앞선 증거의 미통과 상태를 유지한다.

도구의 첫 추가 검사는 effectivePins의 인수 순서 오류로 실패했다. 다음 검사에서는 kinematic next-position 이동과 접촉 graph의 시점 차이로 Exit 기대가 실패했다. 독립 2D 탐침에서 이동 스텝의 접촉1/다음 스텝0을 확인했으며 solver를 몰래 바꾸지 않았다. 최종 고정 시간 검사에는 실제 dynamic sensor를 써서 같은 스텝의 텔레포트 종료를 대조했다. 실패 로그는 보존했다. 이는 기존 kinematic graph 정책에 대한 관찰이며 이동/접촉 전체 정확성의 완료 선언이 아니다.

## 직접 읽은 출처

[Unity6000.0 OnTriggerStay2D](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/MonoBehaviour.OnTriggerStay2D.html), [OnCollisionExit](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Collider.OnCollisionExit.html), [OnCollisionExit2D](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/MonoBehaviour.OnCollisionExit2D.html)의 자체 매개변수·설명·주의·예제 전체를 새로 읽었다. Trigger Stay의 물리 업데이트 기준, Exit의 Collision/Collision2D 데이터와 사용하지 않는 인수 생략, disabled behaviour 전달을 구분했다. HB의 중지/삭제 owner 정책과 네 필드 HitResult는 Unity 전체 Collision과 다르다. 링크된 Collider2D/Collision2D/Enter/Stay API 전체는 미독이다. 원문 SHA/읽기 범위는 native/build/contact-research-064/manifest.json이다.

[Rapier rigid bodies](https://www.rapier.rs/docs/user_guides/javascript/rigid_bodies/)는 body type·Position 구역과 next kinematic position의 지연 적용 설명을 읽었다. 다른 구역/링크 API 전체는 읽었다고 세지 않는다. 063의 Unity3D Stay/Epic Hit 자체 본문은 재사용한 근거다. 자료 수집과 전체 문서/API 분석 완료를 구분한다.

사용자 창·게임 원본·프로필·설치본은 보존했다. 063 2b86c0d 푸시 완료. 누적 선행 그룹의 전체 검증 뒤 설치 갱신 순서를 유지하며 다음 전체 프레임/메모리 비용과 남은 제작 세부를 이어간다.
