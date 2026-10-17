# 251 · 시퀀스 오디오 음성 소유권·지연 디코드

- 시퀀스/트랙별 고유 voice handle·같은 파일 두 트랙 독립 재생/seek/stop·명시 handle 정지는 그 음성만, legacy 이름 정지는 기존 파일 전체 의미 유지
- 임의 actor를 따라가는 시퀀스 소리는 AudioSource 컴포넌트 값과 분리·소스 객체 수명 검사·디코드가 늦어도 요청 시간/일시정지 상태를 적용
- runtime.audio voices에 handle/source·같은 파일 external AudioSource1+시퀀스2 실제 창/독립 D3DGL에서3개 유지, Stop 뒤 외부1개 보존·기존 audio source/capture 회귀

검증 근거: [기계 판독 기록](research/ENGINE_WORK_251.json).

남은 범위:

- 실제 창 음성 검사는 무음 PCM WAV이며 이 변경의 가청 품질/마이크/실폰 음향 검사 아님
- PCM sample-accurate mixing과 전문 멀티트랙 외부 동기화는 잔여


249–252 사용자 설치 57aa766cccf7afc5·2893명세 파일 실행후SHA동일·실제 숨김 editor1/독립D3D·GL게임2 오류0/exit0·쿼터니언 제작/Undo·즉시Seek·독립 오디오3/지연 로드·50ms 탐색·소유 핸들 정지. User10385파일 SHA불변·링크2/.hbproject·Versions1·이전설치232785813B 제거. USER_INSTALL_252.json.
