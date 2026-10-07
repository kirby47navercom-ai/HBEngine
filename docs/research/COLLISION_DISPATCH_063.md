# 충돌 이벤트 대기 비용 — 063

2026-10-08. 모든 바인딩·접촉 조합에서 실행할 이벤트가 없어도 빈 async collisionBinding을 await하던 경로를 바꿨다. 접촉은 동기적으로 같은 Map에 기록하고 실제 핸들러가 있을 때만 기존 비동기/배치 경로를 실행한다. 이미 알고 있는 바인딩 인덱스를 넘겨 일치하는 접촉마다 배열에서 다시 찾는 일도 줄였다. 이벤트 순서·컴포넌트 필터·기존 Begin/End Overlap와 Hit 발생 계약은 유지한다. 자료형/객체 참조 검증을 생략하지 않았다.

## 재현과 검증

`node tools/check-collision-dispatch.mjs`는 직접 연결한 BP 이벤트→실제 컴파일 C++ Record와 비배치/배치를 대조한다. 여러 접촉의 순서, Actor 양쪽의 반대 법선, component source 필터, 지속 접촉의 Begin/Hit 중복 방지, 미연결 접촉의 추적, 끝/재진입, 두 실행 방식의 동일한 최종 사용자 속성을 통과했다. 최초 도구 fixture는 실제 contact의 collider blueprintSources를 빠뜨려 레거시 type fallback에 매칭됐다. 실패 로그를 보존하고 실제 contact 봉투와 같이 source를 넣어 비교했으며 기대값을 지워 검사를 통과시키지 않았다.

512바인딩·64접촉, 준비10회·5×60회 이벤트 없는 CPU dispatch 중앙값은 기존 updFpX 1.6947ms, 현재 2j7UAQ .5478ms다. 동일한128접촉 상태를 보존한다. 약67.7% 감소는 이 반복 dispatch 부분의 측정이며 물리 계산·GPU·모바일·전체 게임 FPS나 최대 객체 수가 아니다. `check-scene-runtime.mjs`도 62컴포넌트·2D/3D 중력/충돌·고정 업데이트·Overlap/Hit·스프라이트를 통과했다.

실제 현재 GPU 고정 게임 jbONo7은 062 fCUCL4 포장본과 baseline/current/current/baseline4회 대조했다. 모두608원본 SHA·실제 sprite/HUD·오류0·exit0을 유지했다. 현재 대기 두 실행은119.98/119.69fps, 공격119.06/119.82fps와 작업p95 8.9/8.4ms로 공격 목표false다. baseline 공격119.62/109.67fps·p95 8.7/12ms처럼 변동이 남아 전체 FPS의 순수 변경 효과로 단정하지 않는다. [세부 수치/소스 SHA](COLLISION_DISPATCH_063.json). 실제 게임 목표·장기 메모리·모바일 검증은 미승격이며 변경 없는8시간 검사를 반복하지 않았다.

## 원출처와 이어갈 접촉 수명

[Unity6000.0 OnTriggerStay](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Collider.OnTriggerStay.html)와 [OnCollisionStay](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Collider.OnCollisionStay.html)의 자체 매개변수·본문·주의와 전체 예제를 읽었다. Trigger의 물리 타이머/양쪽 전달/강체 조건, Collision의 접촉 정보/비운동 강체·sleeping 조건을 구분했다. 링크된 Collider/Collision/강체 API는 미독이다. [Epic5.8 On Component Hit](https://dev.epicgames.com/documentation/en-us/unreal-engine/BlueprintAPI/Collision/OnComponentHit)의 자체13줄 본문 전체를 읽었다. Sweep/물리 Hit와 Overlap 구분, 상대 이동에 따른 법선 방향, 물리 impulse와 sweep의0 impulse를 확인했다. 내부 물리 구현/링크 API·이미지는 읽은 것으로 세지 않는다. Unity 원문/SHA/읽기 범위는 native/build/collision-research-063/manifest.json이다. 이번 최적화는 기존 HB 이벤트 계약을 유지한 것이며 Unity Stay/Collision 전체 자료와 UE Hit 동등성을 구현했다는 뜻이 아니다.

다음 접촉 수명 조사에서는 바인딩 배열의 삭제/재배치가 인덱스 기반 pair key에 영향을 주는 문제, 삭제/풀 반환된 owner와 상대 참조, Stay/solid 종료와 물리 스텝 전달 정책을 실제 기존 코드에 연결한다. 이들도 누적 엔진 세부 요구이며 후순위 추가 기능으로 밀지 않는다. 사용자 창·원본·설치본은 보존했다. 062 88599ff 푸시 완료, 설치는 누적 선행 그룹 검증 뒤에 한다.
