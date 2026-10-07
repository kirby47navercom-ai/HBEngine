# AI 에셋·C++ 묶음 편집 — 041

2026-10-07. 042 오브젝트 개수 제한 제거를 먼저 설치한 뒤 이어서 구현했어요. Windows 편집기의 프로젝트 파일 변경·뷰 갱신·Undo를 실제 연결했어요.

## 참고 본문과 적용 판단

- [Unity 6000.0 StartAssetEditing](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/AssetDatabase.StartAssetEditing.html), [StopAssetEditing](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/AssetDatabase.StopAssetEditing.html): 자동 임포트를 묶고 종료 시 다시 처리하는 메서드의 선언·설명·예제를 읽었어요. 중첩 호출과 finally 균형을 참고했어요. 파일 시스템 롤백 기능으로 해석하지 않았어요.
- [Unity RegisterCompleteObjectUndo](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Undo.RegisterCompleteObjectUndo.html): 단일/배열 오브젝트 상태와 한 Undo 항목을 참고했어요. 부모 변경·컴포넌트 추가·파괴의 별도 API를 일반 오브젝트 기록으로 대체하지 않았어요. 위 세 페이지 자체 본문만 분석한 기록/해시는 native/build/ai-atomic-pending-040/manifest.json 및 *.body.txt예요. 링크된 다른 API 전체를 읽었다고 합산하지 않아요.
- [Unreal 5.8 FScopedTransaction](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Editor/UnrealEd/FScopedTransaction): 자체 클래스 본문52줄의 범위 진입/종료, 생성자·Index·Cancel/IsOutstanding 목록을 확인했어요. 링크된 함수 본문 또는 외부 파일 롤백 보장까지 확인한 것으로 계산하지 않아요. HBEngine의 파일 복구 기록은 별도로 구현/검증했어요.

## 동작

`files.get`은 에셋·C++ 파일을 창 전환이나 Visual Studio 실행 없이 읽어요. 디스크 revision과 열린 문서의 editorRevision/editorData를 구분해요. Windows 대소문자·프로젝트 안 링크는 실제 파일로 정규화해 열린 문서 기준을 우회하지 못하게 해요.

`files.apply`는 data/JSON Patch/닫힌 파일 삭제 중 하나를 받아요. 각 파일의 디스크 revision과 열린 문서 revision을 확인하고, 부모·자식 BP와 C++ 공개 시그니처를 변경할 파일 전체가 반영된 보기로 검증해요. C++ 본문을 전체 컴파일하는 dryRun은 아니에요. dryRun은 파일·Undo·편집기 뷰를 변경하지 않아요. 실제 컴파일은 기존 native.build/게임 빌드에서 수행해요.

저장은 프로젝트의 기존 쓰기 대기열을 사용하고 원본·결과·해시·에셋 ID를 Saved/Transactions에 먼저 기록해요. 한 파일씩 임시 파일에서 교체하고 실패 시 묶음 전체를 복구해요. 저장 중 새 인간 편집/드래그/실행이 발견되면 인간의 문서를 유지하고 파일 묶음을 원래대로 되돌려 거절해요. 복구 중 제3자 변경을 발견하면 덮어쓰지 않고 복구 기록과 ID를 남겨요.

`files.undo`/`files.redo` 및 기존 편집기 Undo/Redo가 묶음 전체와 C++를 함께 처리해요. 새 편집이나 외부 변경이 있으면 다른 파일도 바꾸지 않아요. C++만 변경해도 당시 작업창의 Undo로 되돌릴 수 있어요. Blueprint의 저장/dirty 상태를 조작하지 않아요. C++ 파일은 계속 외부 IDE에서 편집하는 흐름이에요.

묶음 저장 직후 기존 문서와 BP/C++ 메타데이터·폴더 목록을 갱신해요. 실행·파일 감시와 저장이 엇갈려 오래된 문서를 덮어쓰는 경로를 막았어요. 기존 단일 문서 저장의 대기 중 새 편집 보존 수정은 042에 먼저 포함했어요.

## 범위와 검증

- 한 요청은 파일1~64개, 원본과 결과 합계8MB까지예요. 오브젝트 개수 제한과는 별도인 저장 요청의 바이트 예산이에요. 세션 Undo는 기존40개 범위를 유지해요. 다시 시작한 뒤에는 파일 복구 기록이 남지만 GUI Undo 메모리는 이어지지 않아요. 이전 기록을 직접 복구할 때는 보호된 `/api/asset/batch/undo`가 최신 transaction ID를 검사해요.
- 여러 파일 교체가 외부 프로그램에서 단일 순간에 보이는 파일 시스템 연산은 아니에요. 엔진의 읽기 경로는 쓰기 대기열을 기다리고, 오류/부분 적용/재시작 복구를 검증한 방식이에요. 전원 차단 실험으로 계산하지 않아요. 복구 기록과 외부 변경이 충돌하면 자동 덮어쓰기 대신 프로젝트 시작 오류와 기록을 보존해요.
- native/build/asset-transaction-Vj5W1F/acceptance.json: 실제 파일+실제 편집기 함수17검사 합격. 부모/자식/C++ 동시 변경, 미수정 BP 의존성, 새 파일 생성/삭제/ID 복원, dryRun, Undo/Redo, 외부 변경/중간 실패/재시작, Windows 별칭, 저장 도중 인간 편집과 전체 파일 롤백을 확인했어요.
- native/build/asset-batch-editor-5xq79Y/acceptance.json: 사용자와 분리된 실제 Windows WebView2 편집기7검사 합격. source-only Undo, 실제 BP 표시, C++ 재컴파일·Begin Play 실행 X=7→13, 그룹 Undo/Redo, 외부 변경 거절과 창 오류0개를 확인했어요. production app/서버/저장/명령 파일5개의 SHA가 이 검사 사본과 같아요.
- check-project/check-assets도 통과했어요. 원본 Auric 게임·검사기·사용자 창을 쓰거나 전환하지 않았어요. Android/iOS 편집기의 같은 API나 실물 휴대폰 실행을 이번 검사로 합격 처리하지 않아요. 렌더·게임 실행 코드가 바뀌지 않은 부분은 반복 빌드하지 않았어요. 전체 엔진이나 전체 공식 문서 완료로 계산하지 않아요.
