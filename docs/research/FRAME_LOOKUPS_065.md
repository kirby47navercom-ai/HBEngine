# 실제 프레임의 카메라·접촉 재검색 — 065

2026-10-08. 현재 코드의 실제 GPU 게임 TzoGrs를 짧게 CPU 샘플링했다. sample self 시간에서 native row 준비243.6ms/직렬화185.9ms/diff166.4ms, 물리 step187.7ms/sync173.7ms, 카메라 선택91.7ms/목록55.9ms, 접촉의 grounded 처리93.1ms를 확인했다. 이 수치는 해당9초 샘플 구간의 귀속 시간이며 전체 프레임 비용 합산이나 새 GPU 타이머가 아니다. 전체 profile은 native/build/auric-frame-TzoGrs/run-0/cpu-profile.json, 요약은 frame-profile-065-summary.json이다.

카메라 선택은 모든 객체의 임시 row/필터/정렬 목록을 만들지 않고 한 번 순회해 최고 priority의 유효 camera를 선택한다. 순서가 같은 tie·main/override·숨김/비활성/풀 반환·제거된 Camera·직접 속성 변경·렌더 camera fallback을 유지한다. 실제 component가 없는 객체의 rendered group 조회를 생략한다. 결과를 장면 전체에 고정 캐시하지 않아 런타임 변경을 즉시 반영한다. 432객체/1000회에서 group lookup432000→1000, 부분 중앙값 .01265→.011768ms였으며 전체 FPS 개선 수치가 아니다.

접촉 중점 계산은 상대 translation 배열을 세 축마다 다시 만들지 않는다. grounded는 이미 있는 collider object 참조를 쓰며, sync의 형상이 같아도 collider의 object/component 참조를 현재 객체로 갱신한다. 첫 초안의 참조 재사용만 적용했을 때 같은 ID 객체 교체의 2D grounded 실패를 재현했고, 공용 sync에서 참조를 갱신해 수리했다. body/형상 재생성 없이 최신 객체와 blueprint source를 유지한다. 프로토콜·좌표/형상/자료형 검증·접촉 수량을 잘라 비용을 줄이지 않았다.

## 검증과 측정 한계

런타임 기능 검사의 카메라 우선순위/tie/override/숨김/비활성/풀/제거/직접 변경, 픽셀 정렬·흔들림·projection 교체와 실제 C++ 컴포넌트 수정이 통과했다. 최종 물리는166항목(2D/3D 같은 ID 객체 교체 추가)·C++ 동기 질의/힘/HitResult, 접촉 BP→실제 C++의 삭제/재사용/Stay/Exit·배치 동일성 BRhYrf가 통과했다. 초안 실패 로그는 contact-reference-replacement-before-065.log로 보존했다.

GPU 전체 게임 BB3COB baseline/current/current/baseline4회는608파일 보존·sprite/HUD·오류0·종료0이다. current 공격117.71/112.19fps, p95 10.0/11.4ms, baseline119.86/119.62fps·p95 8.3/8.7ms였다. 순수 변경 효과나 개선을 단정하지 않으며 이 비교의 current 목표는 false다. 같은 ID 교체 수리 후 최종 ErfIpl은 대기120.04fps·p95 6.7ms, 공격119.35fps·p95 8.4ms라 전체 목표false다. 최종 포장된 game-camera/physics-world/blueprint-runtime을 포함한 SHA를 기록했다. 마지막 단일 실행을 앞선 대조 결과 대신 쓰거나 검증 조건을 낮추지 않는다. 장시간 RAM/모바일 실물/FPS 목표는 미승격이며 새8시간 검사를 하지 않았다.

[측정 요약/출처/소스 SHA](FRAME_LOOKUPS_065.json). 카메라·접촉의 불필요한 객체와 조회를 줄였지만 주요 native row 직렬화/diff·물리/제출·메모리 비용은 계속 다룬다. 사용자 창·원본·설치는 보존했고, 064 3a0046d 푸시 완료다.

## 출처와 읽기 범위

[Unity6000.0 Camera.main](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Camera-main.html)의 자체 선언·설명·cache 주의·전체 전환 예제를 새로 읽었다. Unity는 enabled/MainCamera tag의 첫 유효 결과를 고르며 내부 tag cache의 접근 비용을 설명한다. HB의 priority/main/override 정책과 같다고 주장하지 않고, 활성 상태/교체와 접근 비용을 따로 검사하는 근거로 사용했다. 연결 Tags/GetComponent API는 미독이며 원문/SHA는 native/build/camera-research-065/manifest.json이다. Epic APlayerController/GetViewTarget 자체 본문 시도는 웹 리더 Internal Error라 읽기 완료로 세지 않는다. 기존 전체 연구 gate는 유지한다.
