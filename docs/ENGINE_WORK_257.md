# 257 · 스트리밍 가상 음성의 미디어 해제

- 선택 AudioSource.streaming(defaultfalse)·AudioRouting streaming+virtualize·공유 우선순위/실제 음성 예산·메타데이터 뒤 가상 음성 src 제거/load로 리소스 해제 요청
- 가상 시 논리 시간/loop/pitch/seek/pause·재승격 metadata 뒤 현재 위치 복구·취소 epoch/Stop/Dispose의 늦은 재생 차단·미디어 lease 재사용·PCM 캐시0
- runtime.audio decoderResident·실제 숨김 WebView/무음 sink에서 가상 시간 진행·.75초 탐색/재승격 약.774초·다시 해제/lease 정리 확인

검증 근거: [기계 판독 기록](research/ENGINE_WORK_257.json).

검증 범위와 잔여:

- preload는 힌트이며 OS/코덱 디코더 heap 실제 회수 시각/가청 품질·실폰/큰 음성 수 검증은 별도·AudioSource 게임 경로는 설치 통합에서 추가 확인


253–260 사용자 설치 7da0d214773220b7·2927명세 파일 실행후SHA동일·숨김editor4/독립D3D·GL게임2 오류0/exit0. source/target·인자CPP/BP/수동/AI·열린상세외부값갱신·CPP/BP 슬롯·Source streaming 해제/복구·커서/스크롤/release/애니메이션·GL/GPU픽셀/준비 통과. User10385 SHA불변·링크2/.hbproject·Versions1·이전설치195144609B 제거. USER_INSTALL_260.json.
