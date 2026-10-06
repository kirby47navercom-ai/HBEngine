# 2D 전용 그림자

근거 원문·버전·읽은 범위는 [2D_SHADOW_CONTRACT_030.md](research/2D_SHADOW_CONTRACT_030.md)에 고정했다. Unity 6000.0 / URP 17.0.4의 공식 Graphics 커밋 `feb4de2d9a93a4ae10d287d3a6d7003d08ea3e53`에서 그룹·형상 공급자·투영/자기 그림자/Unshadow·스텐실·조명 식을 확인했다. 엔진 코드를 복사하지 않고 HBEngine의 공용 Three 렌더 경로에 구현했다.

- Light2D의 그림자는 기본적으로 꺼져 있다. 비전체 광원에 강도·부드러운 경계·64/128/256/512/1024 해상도를 지정한다. 기존 3D 조명의 그림자와 별도다.
- ShadowCaster2D는 스프라이트 알파, 변형 중인 SpriteSkin 메시, 2D 충돌/타일 충돌, 직접 편집한 모양, None을 구분한다. Cast/Self/Both/None과 전체/선택 정렬 레이어를 설정한다. None은 같은 Composite의 Unshadow에 계속 참여한다.
- CompositeShadowCaster2D는 최상위 활성 부모를 사용한다. 부모의 가림/삭제·컴포넌트 활성·정렬 순서와 씬 교체를 반영한다. 그룹은 렌더 순서 오름차순, 구성원은 내림차순으로 처리한다.
- 공용 형상 편집기의 드래그·점 추가·키 이동·초안 Undo/Redo·적용 검증을 씬과 블루프린트에서 사용한다. 적용 전 원본을 변경하지 않는다.
- `hb::Light2D::SetShadows/GetShadows`와 `hb::ShadowCaster2D`의 13개 함수는 같은 C++ 선언에서 블루프린트 노드로 생성한다. C++ 내부에서도 쓰기 직후 같은 호출에서 읽을 수 있고, JS 실행기에서 다시 자료형·범위를 검증한다. AI 스키마에는 컴포넌트, 함수 서명, 배치 목록, 한계와 렌더 규칙을 함께 공개한다.
- 그림자 형상은 변경 시에만 계산한다. 광원/수신 레이어/그룹/변환이 같으면 GPU 패스를 다시 실행하거나 데이터 텍스처를 업로드하지 않는다. 같은 형상을 쓰는 정렬 레이어는 맵을 공유한다. 사용하지 않을 때 맵·스텐실·형상·머테리얼을 해제한다.

명시적 범위는 단순 모양64점, 외곽8,192선분, 원본 알파4,194,304픽셀, 아틀라스4,194,304픽셀이다. 초과하면 버리지 않고 오류를 반환한다. 원/캡슐 충돌은32선분으로 근사한다. 알파 경계 수축은 픽셀 사각형까지의 유클리드 거리를 쓰며 가로·세로 픽셀 크기가 다른 경우도 보정한다. 출력 경계는 원본 픽셀 격자로 양자화되며 벡터 Clipper/UTess의 연속 곡선 정밀도와 같다는 주장은 하지 않는다. SpriteSkin의 중복 면을 제거하고 공유 정점 외곽을 사용한다.

검증 기록(2026-10-06):

- `node tools/check-2d-shadows.mjs`: 구멍/비등방 거리 수축/중복 면/최상위 그룹/타일 충돌·검증 경계·실제 C++ 쓰기/읽기·JS 실행·BP 서명 통과.
- `node tools/check-2d-lighting.mjs`, API 생성 일치와 기본671노드 검사 통과.
- 실제 전체 에디터 `native/build/authoring-window-0wPgCZ`: 씬·BP 형상/레이어 편집, 원본 보존, Undo/Redo, 저장, GPU 통과.
- 마지막 렌더 보강 후 실제 에디터 `authoring-window-hfoGkE`, 실제 배포 Player `authoring-window-oAxqTM`: 각각116개 검사(조명/그림자67개), 오류0, Cast/Self/Both/None·None Unshadow·레이어·범위 제거·알파·Flip·충돌·부모 그룹·실제 뼈 변형·유휴 캐시/해제를 GPU 픽셀로 확인했다. Player의 실제 C++ 설정과 BP 순수 출력 핀은 verified/pinVerified=true,128×128그림자 아틀라스다.
- 개발 소스와 배포본의 렌더·컴포넌트·서비스·Game.hpp/Bridge.hpp6파일 SHA가 일치한다. 별도 `check-editor-api.mjs`는 기본5181 서버 부재로 ECONNREFUSED였고 통과로 계산하지 않는다. 위 실제 에디터 검사는 격리 프로젝트의 자동화 경로로 실행했다.

Sprite cookie, 조명 blend styles/overlap, 2D volumetrics와 나머지 렌더링/엔진 전체 요구는 이 그림자 구현의 완료 범위에 포함하지 않는다. 전체 문서/API 분석, Android 성능 예산, 실물 모바일, 자연8시간 안정성을 대신하는 증거도 아니다.
