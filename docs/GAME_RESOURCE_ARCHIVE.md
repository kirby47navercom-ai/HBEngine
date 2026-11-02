# 배포 리소스 묶음

Windows 네이티브·웹뷰 빌더는 게임 콘텐츠를 `game.hbdata` 하나에 기록해요. 완성된 배포 폴더에 원본 그림·음성·글꼴·장면·C++ Source 파일을 `Content/`로 따로 복사하지 않아요. 게임 EXE·공식 스크립트 실행기·컴파일된 C++ 모듈·셰이더·필수 라이선스는 별도 실행 파일 구조를 유지해요. 원본 제작 프로젝트의 파일은 변경하지 않아요.

64바이트 헤더 뒤에 에셋별 데이터를 쓰고, 마지막에 압축된 색인을 기록해요. 에셋마다 위치·원래 크기·저장 크기·SHA-256을 보관해요. JSON·글꼴·PCM 등은 Zstd 압축이 실제로 작아질 때만 채택하고, PNG·WebP·MP3·OGG처럼 이미 압축된 매체는 원래 바이트를 묶음 안에 저장해요. 불필요한 재인코딩이나 화질·음질 변경은 하지 않아요. 이것은 배포 컨테이너·무손실 압축이며 DRM이나 암호화는 아니에요.

실행기는 묶음 전체를 메모리에 풀거나 임시 폴더에 원본을 추출하지 않아요. 네이티브는 요청한 에셋만 읽고 해시·크기를 검증해요. 글꼴은 메모리에서 등록하고 glTF의 외부 버퍼도 묶음에서 읽어요. 웹뷰 서버는 기존 에셋 URL을 유지하며 HEAD·부분 범위·음원 스트리밍에 제한된 버퍼를 사용해요. 이전 `Content/` 패키지도 계속 읽을 수 있어요. 이미 만든 패키지는 다시 빌드해야 새 형식이 적용돼요. 정적 웹·Android·iOS 빌드는 이번 Windows 형식 변경 대상이 아니에요.

AI가 수정할 소유자는 `tools/game-resource-archive.mjs`의 `writeGameResources`, `openGameResources`, `streamGameResource`예요. 프로젝트 소비자는 실제 파일 경로에 의존하는 대신 `projectBytes`·`projectText` 또는 `project.read(...).readBytes()`를 사용해요. 네이티브 UI는 `pack.readBytes()`를 사용해요. `hb context --symbol openGameResources --compact`로 해당 소유자만 찾을 수 있어요.

검사: `node tools/check-game-resources.mjs [엔진 폴더]`, `node tools/check-native-game.mjs [엔진 폴더]`. 생성한 배포 파일에서 원본 파일 부재·바이트 일치·멀티 청크 입력·외부 glTF 버퍼·한글 글꼴·UI/SVG·음성·C++·입력·종료를 확인했어요. 웹뷰는 실제 PlayerServer의 HTTP 읽기를 확인했고 새 GUI 전편 검증은 하지 않았어요. 잘린 색인·손상된 에셋·경로 이탈·대소문자 충돌은 거부해요. 근거는 `ENGINE_WORK_3412.json`에 있어요.
