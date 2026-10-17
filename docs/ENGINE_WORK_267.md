# 267 · 최신 SDK의 모바일 실행·arm64 패키지

- 모바일 공용 AOT에서 자동 수명주기와 CPP Tick 제어·종료·live 천 표면을 함께 실행
- 신규 SDK와 모듈 closure 포함 arm64 NDK 컴파일·링크·서명 debugAPK·16KiB ELF/ZIP 정렬·7333493B

근거: [기계 판독 기록](research/ENGINE_WORK_267.json).

검증 범위와 잔여:

- Android 휴대폰이 없어서 실제 설치/실행/음향/발열 미확인
- Mac/Xcode가 없어서 iOS 컴파일/서명/실행 미확인
