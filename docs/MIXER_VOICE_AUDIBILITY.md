# 믹서를 반영하는 음성 선별

AudioListener의 **음성 선별**은 mixer(기본)·legacy를 선택해요. 같은 `voiceSelection` 필드를 속성창, AI 문서 편집, C++/블루프린트 Components SetString으로 바꿔요. 기존 Audio SetVoiceBudget의 두 숫자 인자는 현재 정책을 유지해요. `hb schema --local --section mixerVoiceAudibility`에서 계약을 읽어요.

기존 보호 음성·명시 우선순위·거리·소스/시퀀스 음량·안정 순서는 유지해요. mixer 정책은 가상화 가능한 음성에 엔진이 예약한 현재 제어값(첫 오디오 quantum 전에도 반영)으로 버스의 부모 라우팅, fader/mute/solo/duck gain, bypass/effect gate, pre/post-fader Send, 실제 DynamicsCompressor의 reduction을 더 반영해요. 완전히 음소거된 경로가 실제 음성 예산을 차지하는 일을 줄여요. **음소거 버스의 pre-fader Send는 여전히 들릴 수 있으므로 제외하지 않아요.** 강제 실제 음성(virtualize=false)은 이 추가 감쇠를 적용하지 않아요.

각 참조 그래프의 비순환 경로를 선별 호출마다 한 번만 계산하고 모든 음성이 공유해요. 병렬 경로는 진폭 합으로 보수적으로 추정해요. 새 AudioNode·미터·PCM·worker·timer를 만들지 않아요. 진단에는 selectionMode, mixerSilentActive와 음성별 mixerGain/estimatedAudibility가 있어요.

이 값은 라우팅 기반 입장 추정이에요. 필터·잔향·왜곡의 콘텐츠 응답, 지각 마스킹/LUFS, 음성별 독립 DSP 기여도를 추정하지 않아요. 공유 압축기의 reduction은 전체 버스의 현재 피드백이에요. legacy는 이전의 소스 기준 선별이에요. 운영체제의 코덱 메모리 회수나 모바일 실기기 품질 증거로 해석하지 않아요.

`tools/check-audio-audibility-3347.mjs`는 독립 경로 합, 이전 선택기 512사례, 1,000음성의 그래프 계산 공유, 공용 런타임 편집, 실제 OfflineAudioContext PCM·압축 감쇠를 묶어서 확인해요. headless 검사는 별도 소유 프로필과 임시 서버만 사용해요.
