# 269 · BP 변수·C++ 속성·컴포넌트 시퀀스 공유

- BP 변수/배열·C++ 공개 속성/배열·개별 컴포넌트 속성에도 동일 소유권/공유 원본/인계 적용
- 전체 값 사전 자료형 검증·복원 때 없는 객체 참조 null·교체된 BP binding과 같은 ID의 새 객체 보호
- 실제 CPP/BP 핀으로 배열을 전달하고 C++ 공개 값/Camera.fieldOfView getter와 런타임 결과 일치

근거: [기계 판독 기록](research/ENGINE_WORK_269.json).

범위와 잔여:

- 임의 C++ struct/중첩 컨테이너·componentState와 개별 속성의 교차 소유권은 미구현
