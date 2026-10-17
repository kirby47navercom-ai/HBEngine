# 251 · 시퀀스 오디오 음성 소유권·지연 디코드

- 시퀀스/트랙별 고유 voice handle·같은 파일 두 트랙 독립 재생/seek/stop·명시 handle 정지는 그 음성만, legacy 이름 정지는 기존 파일 전체 의미 유지
- 임의 actor를 따라가는 시퀀스 소리는 AudioSource 컴포넌트 값과 분리·소스 객체 수명 검사·디코드가 늦어도 요청 시간/일시정지 상태를 적용
- runtime.audio voices에 handle/source·같은 파일 external AudioSource1+시퀀스2 실제 창/독립 D3DGL에서3개 유지, Stop 뒤 외부1개 보존·기존 audio source/capture 회귀

검증 근거: [기계 판독 기록](research/ENGINE_WORK_251.json).

남은 범위:

- 실제 창 음성 검사는 무음 PCM WAV이며 이 변경의 가청 품질/마이크/실폰 음향 검사 아님
- PCM sample-accurate mixing과 전문 멀티트랙 외부 동기화는 잔여
