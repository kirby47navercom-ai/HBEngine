# 유휴 GPU 입자 계산 비용 — 057

2026-10-07. 새 방출마다 최대 수명의 보수적인 상한을 유지하고, 이미 빈 효과에서는 GPU 계산·정렬을 생략해요. 방출 시각·지연·거리 방출·버스트의 기존 CPU 시간 계산은 계속해요. 재방출하면 계산을 재개하고, 일시정지는 수명을 진행시키지 않아요. 최대 수명을 지난 후 마지막 간접 draw count를 지워 GPU float 누적 오차로 잔여 입자가 남지 않게 해요. 살아 있는 위치/개수의 자동 readback은 추가하지 않았어요.

실제 GPU Player ighUFn / GL nKF0Rn, GPU 에디터 quotp5 최종 PASS와 소스 SHA는 `native/build/gpu-idle-research-057/manifest.json`에 있어요. 빈65슬롯 효과의 제출1/정렬0을 유지한 채 emptySkips14→30을 기록했고, 31개 새 방출/최대80ms 수명 후 count0 및 다시 유휴 제출 고정이 통과했어요. 여섯 정렬·빈 슬롯·정지/카메라·월드/로컬·BP/C++ 투사체/충돌·머테리얼/추가 뷰포트·PNG·자원 반환/오류0/원본 보존/종료도 통과했어요. 검사의 수명 설정 복원 순서가 최소>최대를 만든 T8oBs0 실패는 최대부터 복원하도록 고쳤어요.

[Unity IsAlive](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/ParticleSystem.IsAlive.html)의 자체 서명/인수/반환/설명과 [StopBehavior](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/ParticleSystemStopBehavior.html)의 설명·두 enum 표를 읽었어요. 방출 정지와 기존 입자 제거를 분리해서 유지해요. 연결된 전체 Particle API/withChildren/stop action/종료 콜백을 이 최적화로 구현했다고 표시하지 않아요.

전체 게임 PC120/모바일60이나 장기 RAM 해결의 증거가 아니에요. 모바일 GPU device는056에서 adapter null이었고 이 최적화의 실제 모바일 GPU 검증은 남아 있어요. 누적 선행 목표 완료 뒤 설치하는 순서를 유지해요.
