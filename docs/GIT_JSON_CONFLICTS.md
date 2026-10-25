# JSON 에셋의 Git 충돌 해결

소스 관리의 **병합**에서 JSON 에셋은 엔진의 기존 구조 비교 화면을 열어요. 일반 코드·텍스트 파일은 기존 외부 편집기로 열어요. Git 스테이지의 기준과 현재 작업 파일의 충돌 마커를 읽고, 이미 합쳐진 공통 부분을 유지하면서 뼈대·노드·배열의 안정 ID를 기준으로 비교해요. 각 충돌을 선택한 뒤 **작업 파일에 적용**을 누르면 검증한 JSON만 저장해요. 스테이징·커밋·푸시는 자동으로 실행하지 않아요.

열린 문서에 미저장 변경이 있으면 먼저 보존해야 해요. 비교 도중 열린 문서가 바뀌면 적용을 거부해요. 저장 후에도 후속 문서 변경을 덮어쓰지 않으며, 변경이 없는 열린 문서만 기존 문서 편집 계약으로 갱신해요. Git 충돌 화면에서는 읽어 온 비교 원본을 고정하고, 일반 에셋 병합 화면에는 **충돌 파일 가져오기**를 추가해 수동으로 받은 JSON도 비교할 수 있어요.

지원하는 입력은 classic Git 마커와 명시한 기준 JSON, diff3/zdiff3 기준 구간이에요. 줄바꿈·BOM·7~64자 사용자 마커를 처리해요. 각 버전은 완전한 JSON으로 복원돼야 해요. 기준이 없는 classic 마커, 중첩·누락·길이가 다른 마커, JSON으로 복원할 수 없는 조각은 추측해서 합치지 않아요. 일반 코드의 줄 단위 병합이나 JSON 기준이 없는 추가/삭제 루트 충돌은 별도예요.

HTTP는 `/api/source-control/conflict`와 `/api/source-control/resolve`의 POST이고, AI CLI도 사용할 수 있어요.

```powershell
node tools/hb.mjs source.conflict.read @read-params.json
node tools/hb.mjs source.conflict.resolve @resolve-params.json
```

읽기는 `path`를 받아 기본적으로 `indexRevision`, `workingSHA256`, 마커/충돌 개수와 경로만 반환해요. `includeData:true`일 때만 기준 텍스트와 `workingText`를 반환하며 화면은 필요한 원본을 명시해서 받아요. 불필요한 stage2/3 원문은 생략하고 `includeStages:true`로 요청할 수 있어요. 해결은 `path`, `expectedIndexRevision`, `expectedWorkingSHA256`, `resolutions`를 받아요. `dryRun:true`로 검사한 `candidateSHA256`을 실제 적용의 `expectedCandidateSHA256`에 넣어요. 기본 응답은 본문을 생략하며 `includeData:true`일 때만 후보를 반환해요. 실제 화면도 검토한 후보의 SHA를 함께 보내요.

파일·Git index·검토 후보 중 하나라도 달라지면 저장을 거부해요. 기존 ProjectService 저장 묶음의 선택형 `expectedFingerprint`는 원본 바이트의 SHA를 비교하므로, 마커 때문에 아직 JSON이 아닌 파일도 보호할 수 있어요. 기존 정규화 JSON의 `expected`와 함께 쓰면 거부하며, 저장할 후보의 에셋·종속성 검증은 그대로 실행해요. 마커가 있던 원본은 기존 트랜잭션 기록에 남고, 저장 중 외부 변경은 동일한 복구 경로로 처리해요. 이는 실제 전원 차단이나 모든 외부 프로그램과의 파일시스템 잠금 검증을 뜻하지 않아요.

`hb schema --local --section gitConflictMarkers`에서 입력·검토·게시 계약을 읽어요. 사용자 프로젝트나 창을 사용하지 않은 격리 Git/파일 검사를 근거로 하며, 원격 VCS·임의 텍스트/이진 충돌·실제 UI 기기 품질은 별도로 남아요.
