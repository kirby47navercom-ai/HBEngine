# HBEngine AI 빠른 시작

Codex·Claude·다른 코딩 AI는 이 문서와 루트 `AGENTS.md`, 현재 `CODEX_HANDOFF.md`부터 읽어요. 처음부터 전체 연구·API 문서를 읽는 절차는 필요 없어요.

## 작업 위치를 먼저 찾아요

저장소 루트에서 실행해요. 편집기·서버·브라우저·패키지 빌드 없이 현재 소스와 확정 원장을 조회해요. 설치된 Node 외에 추가 의존성을 설치하지 않아요.

```powershell
node tools/hb.mjs context --compact
node tools/hb.mjs context "블루프린트 변수 드래그" --compact
node tools/hb.mjs context "머테리얼" --symbol "decodeNormalMap" --limit 6 --compact
node tools/ai-context.mjs "2D 스프라이트 입력" --compact
```

작업 중에는 `--compact`를 우선 사용해요. 소유자·심볼 발췌·읽은 파일/byte·검색 실패 모드·관련 잔여/근거·검사 후보·작업 경계를 유지하면서 공통 구조와 전체 분야 라벨·긴 과거 설치 설명·Git 경로 목록을 생략해요. 현재 설치 마커와 역사적 설치 영수증은 계속 구분해요. 더 자세한 설명은 같은 명령에서 이 옵션만 빼면 돼요. 응답 전달량을 줄이는 모드이며 디스크 탐색·컴파일 자체를 빨리 했다는 뜻은 아니에요.

`context`만 실행하면 짧은 구조·Git 변경·확정 설치·26개 분야 목록을 줘요. 작업명을 넣으면 관련 파일·원장 ID·최근 근거·검사 후보만 추가해요. 정확한 ID(`RND-06`)나 파일명도 검색할 수 있어요. `--symbol`은 대소문자를 구분하는 문자열 검색이며 경로·줄·열·짧은 발췌를 반환해요. 정확한 심볼이 focusRoutes 키워드로 등록되어 있으면 작업명에 해당하는 다른 경로보다 먼저 읽어요. 그 경로에서 심볼을 찾으면 해당 소유자만 읽고 `mode=focused-routes`와 확장 명령을 표시해요. 다른 호출처도 필요하면 같은 명령에 `--all`을 붙여요. 소유자에서 못 찾으면 `mode=focused-miss`, 등록된 경로가 없으면 `mode=unregistered-symbol`로 반환하며 자동으로 전체 검색하지 않아요. 미등록 심볼은 소스 본문을 읽지 않아요. `docs/ai-routes.json`의 `focusRoutes`(분야 목록 `topics`와 별도)에 실제 소유자를 등록하고 다시 조회해요. 전체 확장은 명시적인 `--all`에서만 일어나요. 명령은 어느 CWD에서 실행해도 자신의 엔진 루트를 기준으로 조회해요.

Git 정보는 실행할 때 읽고 원장은 `docs/research/ENGINE_STATUS.json`에서 읽어요. 거대한 영구 색인·벡터 DB·감시 프로세스·네트워크 서비스는 만들지 않아요. 캐시·빌드·스크린샷·사용자 프로젝트는 탐색에서 제외해요. 심볼 검색은 생성 헤더와 검사/예제를 제외하고 파일당 2MiB를 넘으면 건너뛴 경로를 보고해요. 최대 12개 결과까지만 반환하며 잘린 결과는 명시해요. 탐색 결과는 원문을 읽는 출발점이에요.

설치본에서 실행한 `context`의 `state.installation`은 그 폴더의 실제 설치 마커를 읽어요. 원장의 `latestInstallation`과 따로 표시하므로 패키지에 담긴 이전 영수증을 현재 설치 버전으로 오해하지 않아요. `integrityChecked=false`는 이 빠른 조회가 전체 파일을 다시 해시하지 않았다는 뜻이에요. 저장소에는 설치 마커가 없어서 `null`이에요.

## 코드의 연결

| 바꾸려는 것 | 먼저 볼 소유자 |
|---|---|
| 편집·문서·Undo/저장 | `prototype/app.js`, `asset-documents.js`, `document-snapshot.js`, 에셋별 편집기 |
| 플레이 월드·BP·서비스 | `prototype/player.js`, `play-world.js`, `blueprint-runtime.js`, `engine-services.js` |
| C++와 공용 노드 | `native/include/HBEngine/Game.hpp`, `Library.hpp` → `tools/generate-api.mjs` → `prototype/core-api.js`(생성 파일) |
| C++ 호출 전송·컴파일 | `prototype/native-channel.js`, `native-transport.js`, `tools/native-host.mjs` |
| 렌더러 선택 | `prototype/game-renderer.js` → WebGL/WebGPU 또는 `native-scene-renderer.js` → `native/desktop/SceneRenderBridge.hpp` → DX11 SDK |
| 제작 데이터·AI 편집 | JSON 에셋·공용 검증, `tools/editor-automation.mjs`, `prototype/automation.js` |
| 배포·설치 | `tools/build-game.mjs`, `build-web.mjs`, `build-mobile.mjs`, `install-editor.mjs` |

렌더링을 바꿀 때 `docs/GPU_SHADER_EDITING.md`를 추가로 읽어요. 생성된 `core-api.js`, `RayPrograms.hpp`, `ScreenEffects.hpp`는 직접 수정하지 않아요. 경로의 변경은 `docs/ai-routes.json`과 함께 갱신해요. `npm run test:ai-context`가 경로·CLI·출력 크기·오류 처리를 확인해요.

## 실행 중인 엔진을 다룰 때만

```powershell
node tools/hb.mjs clients --url http://127.0.0.1:포트
node tools/hb.mjs schema --section blueprint --url http://127.0.0.1:포트
node tools/hb.mjs schema --section commands --url http://127.0.0.1:포트
```

포트는 사용자가 쓰는 엔진 연결 정보로 정해요. 기본 5173을 실행 중인 엔진이라고 가정하지 않아요. `--section`은 점 경로로 필요한 응답만 출력해요. 전체 스키마는 요청하되 AI에게 전달하는 JSON을 줄이며, 서버의 스키마 생성 비용을 줄였다는 뜻은 아니에요. 없는 경로는 오류로 알려요.

문서 수정은 `document.get` → `expectedRevision`/`dryRun` → `document.patch` 또는 여러 문서 transaction → 명시적 저장을 사용해요. 여러 편집기가 있으면 `--client ID`를 지정해요. API의 세부 필드가 필요할 때만 `docs/AI_ENGINE_API.md`의 관련 절을 읽어요.

## 작업과 검증

최신 사용자 지시 → 현재 인계 → 관련 원장 행/소스 순서로 범위를 정해요. `verified`는 그 행의 적힌 범위만 검증했다는 뜻이에요. 전체 Unreal/Unity 구현 완료나 전체 문서 분석 완료라는 뜻이 아니에요. 원장과 미커밋 소스, 사용자 설치본의 상태를 구분해요.

기존 검사 증거는 재사용하고 여러 변경을 구현한 뒤 영향을 받는 검사만 묶어서 실행해요. `checkCandidates`는 파일명 기준 후보이며 실행 인자·비용·격리 여부는 해당 도구에서 확인해요. 성능 수치는 장치·경로·측정 범위 없이 FPS 개선으로 해석하지 않아요.

사용자 게임·`%LOCALAPPDATA%/HBEngine/User`·실행 중인 창/서버는 검사에 사용하거나 종료하지 않아요. 업데이트 요청 없이 설치본을 바꾸지 않아요. Versions는 한 개 유지하되 실행 중인 버전은 보호해요. 작업 종료 시 현재 인계만 짧게 갱신하고 긴 실행 이력은 증거 문서로 연결해요.

정확한 작업·명령·심볼에 연결한 docs/ai-routes.json의 focusRoutes는 넓은 분야 기본 파일보다 앞서 관련 구현을 보여줘요. 예: sequence.curve.keys/editAssetCurveKeys와 stateSerialization/SharedStatePackets. 전체 문서 선행 독서나 실행 검사는 추가하지 않아요.

큰 문서는 `document.get` 전체 응답보다 `document.read`의 pointer/offset/limit을 먼저 사용해요. 기본값은 형태와 짧은 ID/name만 돌려주고, 필요한 하위 항목에 values=true를 써요. 시퀀스 키는 sequence.keys.read도 지원해요. `schema --section documentQuery`, `--section sequenceKeyStorage`, `--section authoringStorage`로 해당 계약만 볼 수 있어요. 에셋 저장과 복구 상태 flush는 별도이고 editor.storage.flush로 후자를 확정해요. 상세 범위는 docs/LARGE_AUTHORING_STORAGE.md와 docs/DENSE_SEQUENCE.md에 있어요.

원장의 sourceHashBase와 changedSourceHashes는 tools/research-source-hashes.mjs로 합쳐요. 기본 CLI는 연결 경로·파일 수만 보여주고 --full은 해시 전체를 내보내요. 합성은 기록 조회이며 현재 파일·실행·설치 검증은 별도예요.

지면 IK·애니메이션 미리보기·변형체·질량 브러시·관절 프레임의 정확한 클래스/함수명은 선언 소유 파일에 연결돼요. 예를 들어 `--symbol DeformableWorld`는 deformable-physics.js만 읽어요. 호출부 파일 목록이 필요하면 --symbol 없이 “변형체 통합”, “천 소성 통합”, “질량 브러시 통합”, “애니메이션 그래프 로드 통합”으로 명시해서 넓혀요. 정확 조회에서 자동으로 앱·SDK·주변 도구 본문 전체를 읽지 않아요. 이 등록 범위를 엔진 전체의 최소 소유자 분해 완료로 해석하지 않아요.

WORK2930의 동일 현재 소스 비교에서 DeformableWorld는 11파일/1099151byte→1파일/10894byte, GroundProjectionIK는 13파일/449465byte→1파일/6212byte, ClothMassBrushStroke는 8파일/697307byte→1파일/11158byte를 읽었어요. 기준은 WORK2920의 경로 목록이며 조회기 본문과 현재 소스는 같아요. source body 읽기량 측정이며 모델 해석 시간·토큰 계정·FPS를 측정한 값이 아니에요.

스키마는 전체 대신 필요한 계약부터 읽어요: `node tools/hb.mjs schema --local --list` → `node tools/hb.mjs schema --local --section poleControl`. 서버 조회의 `--section`도 서버에서 그 계약만 만들고 전달해요. 예전 서버 연결은 호환 잘라내기를 사용해 전송량 감소가 없어요. [선택 스키마 조회](SCHEMA_SECTION_READS.md).
