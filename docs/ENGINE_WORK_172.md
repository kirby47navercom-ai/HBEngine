# 에셋 버전 병합과 프로젝트 소스 관리

안정 ID를 가진 오브젝트·컴포넌트·노드와 시간 키를 3방향으로 병합한다. 서로 다른 속성·변환 축은 합치고 같은 값·삭제/수정·순서 충돌은 기준/현재/다른 버전 선택으로 남긴다. 기하 배열은 원자 값으로 다룬다. 원본은 변경하지 않으며 유효성·expectedRevision을 확인한 뒤 기존 문서 패치와 Undo로 적용한다.

파일/보기 메뉴와 명령 검색에서 전용 병합·소스 관리 창을 연다. Git 변경/스테이징 목록·텍스트 diff·선택 stage/unstage·커밋·프로젝트 로컬 작성자 설정을 지원한다. 부모 저장소 안의 프로젝트에서는 쓰기를 거부한다. 전역 Git 설정·원격 저장소·자동 push는 변경하지 않는다. 이름/이메일은 동일 author/committer로 사용하고 shell을 실행하지 않는다. 읽기/사전 검사는 에셋·index를 쓰지 않는다.

AI: document.merge {path,expectedRevision,base,theirs,resolutions?,dryRun?}, merge.open, sourcecontrol.open/status/diff/stage/commit/init/configure. 충돌 경로는 /nodes/@id=... 같은 안정 경로다. 충돌/검증 실패·dryRun은 적용하지 않는다. Git 쓰기는 status의 expectedIndexRevision을 요구한다.

[CPU13군·실제 Win32 편집기 사람/AI·Undo·Git 작성자 검사](research/ENGINE_WORK_172.json). 10,000행 병합 약48.8ms는 이 컴퓨터의 CPU 표본이다. 숨긴 격리 창/임시 저장소에서 검사했고 실제 사용 창과 저장소는 건드리지 않았다. 초기 종료 검사 두 번의 실패와 최종 저장 확인창 선택을 기록에 보존했다.

경계: Git 충돌 마커 파일은 외부 편집기로 연결하며 이 창은 정상 JSON 세 버전을 병합한다. 원격/잠금/시각 노드 diff·YAML 호환은 별도 잔여다. 장면이 저장 뒤 다시 dirty로 관측되는 기존 경로는 별도 추적하며 저장 성공만으로 종료 검사를 통과 처리하지 않았다. 전체 엔진·전체 문헌 분석의 완료가 아니다. 설치는 다음 네트워크 수명 변경과 함께 전환한다.

대조: [Unity Smart Merge](https://docs.unity3d.com/6000.0/Documentation/Manual/SmartMerge.html)의 기준/현재/다른 버전·안정 키 배열/제외, [Unreal Source Control](https://dev.epicgames.com/documentation/en-us/unreal-engine/using-source-control-in-the-unreal-editor)의 편집기 상태/비교/제출, [Git status](https://git-scm.com/docs/git-status)의 index/working tree·porcelain v1-z를 참고했다. 원 엔진 기능 전체의 동일 구현을 뜻하지 않는다.
