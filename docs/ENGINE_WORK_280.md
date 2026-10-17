# 280 · 최신 Android 패키지와 모듈 본문 검증

- 최신 사용자 C++와 공용 SDK를 arm64 NDK compile/link하고 서명 debug APK·16KiB ELF/ZIP 정렬을 확인했어요.
- 새 광선/타일/색상 모듈을 포함한 의존성 closure뿐 아니라 APK 안7개 JS의 원본 SHA도 대조해요.

검증 근거: [기계 판독 기록](research/ENGINE_WORK_280.json).

검증 범위와 잔여:

- 배포 검증이며 새 제작 기능 수로 계산하지 않아요. 실물 기기 설치/실행/음향/발열·iOS는 확인하지 않았어요.
