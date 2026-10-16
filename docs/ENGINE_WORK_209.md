# 209 — 골격 교체 Take·현재 모델 재바인딩·되감기

- 다른 뼈 이름/수와 골격 제거를 한 Take에 기록; 구간별 독립 키 축약과 서로 다른 layout 경계의 step 처리
- 컴포넌트/모델 교체 완료 뒤 현재 재생 시각의 포즈에 바인딩; 이전/다음 Seek·빈 골격·Stop의 원본 모델/포즈 복원
- runtime.sequencePose 요청형 페이지와 development/smoke player 디버그 조회; 자동 매 프레임 스냅샷/추가 GPU readback 없음
- 실제 glTF A/B/제거/복원·BP 시퀀스 조작·실제 Take→제작창 dry-run/적용/Undo·Windows WebGL 및 DirectX11 게임 EXE·기존169 CPU23군

남은 범위: 모델 변경을 함께 기록하려면 구성 또는 컴포넌트 녹화 필요. 골격 포즈만으로 모델 에셋을 자동 추론하지 않음 / 임의 네이티브 배열/구조체, 액터 생성 녹화, 마이크/stem/PCM 시계 정렬·영상 결합은 잔여 / 큰 DCC 리그·복잡 모프/근육·모바일 실기기 품질/지속 성능 전체를 검증한 것은 아님

근거: [ENGINE_WORK_209.json](research/ENGINE_WORK_209.json). 설치 검증은 별도 영수증에 기록한다.
