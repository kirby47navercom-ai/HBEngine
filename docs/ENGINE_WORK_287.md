# 287 · 최신 렌더 모듈의 Android 패키지 대조

- 공용 SDK734와 복수 사용자 C++ 모듈을 arm64 AOT compile/link하고 서명 debug APK를 만들었어요.16KiB 정렬·패키지 ID·실제 렌더 모듈16개의 본문 SHA를 소스와 대조했어요. APK는6334763바이트예요.

범위와 한계:

- 실제 Android 휴대폰 설치/실행·발열/터치·iOS 컴파일/서명 검증은 아니에요. 기존 테스트를 새 플랫폼 기능 하나로 세지 않아요.

근거: [기계 판독 기록](research/ENGINE_WORK_287.json).
