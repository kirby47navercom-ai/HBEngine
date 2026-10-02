# HBEngine UI 인계

- 기준: `docs/EDITOR_INTERACTION_SPEC.md`의 화면 정리 항목. 기존 DOM/SVG/도킹을 재사용하며 새 UI 라이브러리는 추가하지 않았다.
- 구현: 프로젝트 허브는 검색/선택 목록과 생성 대화상자, 콘텐츠는 목록/타일 전환. UI 스타일은 4개 원 CSS에서 관리한다. C++ 도구는 연결된 BP, 환경은 환경 패널, Inspector는 현재 선택을 따른다.
- 보존: 프로젝트별 문서 복구/dirty/사용자 배치를 유지한다. `hbengine.project.view` 키를 브라우저와 서버 저장소 양쪽에서 허용한다. `shadowEnabled`는 이전 파일에서 생략 가능하다.
- 검증: 자동 검사는 README 명령 표를 사용한다. 화면은 별도 `native/build/ui-qa` 프로젝트에서 검증한다. 로컬 전후 PNG는 `native/build/ui-*.png`에 있으며 생성물은 Git에 넣지 않는다.
- 범위: Win32/WebView2 편집기의 UI 개선이다. DirectX 렌더러, 전체 Unreal/Unity 기능, 독립 게임 패키징의 완료를 의미하지 않는다.
