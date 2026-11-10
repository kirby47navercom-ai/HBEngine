# 대량 에셋과 긴 경로 탐색

콘텐츠 브라우저는 현재 폴더만 열어요. 하위 폴더 검색을 켜면 선택한 폴더 아래만 탐색하고, 연속 검색·폴더 이동·창 닫기로 오래된 요청이 취소돼요. 왼쪽은 루트 폴더, 현재 위치의 상위 경로와 바로 아래 폴더를 보여줘요. 좌우 목록 모두 스크롤 위치의 항목만 화면에 그려요. 보이지 않는 항목도 스크롤 또는 키보드로 열 수 있어요.

에셋 선택기에 필요한 전체 카탈로그는 별도의 이름/종류 조회예요. 검색어를 바꾸거나 폴더를 열 때 이 카탈로그를 다시 읽지 않아요. 열린 문서의 외부 변경 확인은 `/api/project/stats`로 문서와 C++ 관련 파일만 확인해요. 쓰기 복구 알림과 기존 에셋 ID는 유지해요.

폴더와 파일을 찾을 때 에디터와 파일 서버가 같은 경로 검사를 사용해요. 기존 1,000자 서버/2,000자 브라우저 제한을 Windows 긴 경로 범위에 맞췄어요. 실제 파일 시스템이 허용하는 경로만 열 수 있고, 프로젝트 밖 경로와 링크는 계속 차단해요. 한글이 많은 긴 파일 URL도 처리해요. 일부 탐색 항목에 문제가 있으면 가능한 목록은 보여주고 오류 위치를 알려줘요.

소유자: `prototype/project-browser.js`, `prototype/project-path.js`, `tools/project-service.mjs`, `tools/serve.mjs`, `prototype/app.js::pollOpenDocuments`. 기본 `/api/project` 계약은 유지하며, UI는 `browse=1`, 에셋 선택기는 `catalog=1`을 사용해요. 실제 Windows 편집기 검증은 `tools/check-project-browse-scale.mjs`와 `docs/research/ENGINE_WORK_3442.json`에 있어요.
