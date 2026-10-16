# 166 — 월드 제작·커브·Take·위젯·패치 연결

2026-10-16. 기준 `7ab93a8`. 165의 20개 대상 중 9개 원장 행에 남은 세부를 추가했다. 여러 조작을 한 기능으로 뭉뚱그려 상위 행을 완료 처리하지 않았다. 실제 근거는 [검사 기록](research/ENGINE_WORK_166.json), 최신 잔여는 [단일 원장](ENGINE_STATUS.md)에 있다.

## 제작과 실행

| 분야 | 편집 경로와 결과 |
|---|---|
| 메시 | 메시 에셋의 간선 선택/분할, 선택 면 복제, 오차/UV 경계 옵션을 가진 정점 용접. 플랫/스무스/선택 노멀, 면별 UV 아틀라스 패킹. 기존 이동/압출/분할/충돌 청크와 저장 형식을 공유한다. |
| 지형 | 지형 브러시의 구멍/메우기/높이 스탬프. `holes`는 셀별 불 배열이며 렌더와 충돌이 같은 삼각형을 생략한다. 선택 영향 범위 안에서 브러시를 계산한다. AI는 `{resolution,values}` 높이 스탬프를 재사용할 수 있다. |
| 폴리지 | 산포/선택 모드, 안정 ID를 가진 인스턴스의 위치/회전/크기 변경, 복제/삭제. 인스턴스마다 Actor를 생성하지 않고 InstancedMesh 행렬과 선택 ID를 연결한다. |
| 2D | 규칙별 가중 랜덤 타일과 고정 시드. 변경 셀/8이웃만 타일 사본을 만들고 묶음 쓰기도 인접 해석한다. 규칙의 `sourceIndex`를 기준으로 변경을 판정한다. 디자이너도 회전된 타일을 표시한다. |
| 애니메이션 | 골격 클립의 커브 이름/시간/값/구동 종류/대상 편집. 커브는 포즈와 함께 가중 혼합되며 속성 값·이름별 모프·머테리얼 숫자 파라미터를 구동한다. step/linear 샘플러 버퍼를 재사용한다. |
| C++/블루프린트 | `hb::AnimationGraph::GetCurve(actor,"Heat")`와 `animGraphGetCurve` 노드는 같은 실행 값을 읽는다. 총 노드 747개. 기존 모프 트랙과 동일 바인딩을 쓰고 디버그 스냅샷에도 커브를 포함한다. |
| Take | Transform/표시에 더해 기본 컴포넌트의 숫자/정수/불/문자/벡터/색/에셋 참조를 녹화한다. 컴포넌트 녹화 선택, 바인딩 선택, 속성 키 편집, 실행/중지 시 원래 값 복원. 정수/선택 속성은 이산 재생한다. 재귀 호출을 쓰지 않는 키 축약과 객체 인덱스를 사용한다. |
| 위젯 | 디자이너의 문화권 입력과 런타임이 같은 문자열·스타일·override 해석기를 쓴다. 오래된 비동기 미리보기는 폐기하고 원본 위젯 값은 바꾸지 않는다. |
| 패치 | 변경 파일만 준비/백업하고 첫 교체 전에 저널을 디스크에 쓴다. 중단 후 다음 적용 또는 `patch.recover`로 원본 복구/이미 완료된 패치 정리를 한다. Ed25519 서명과 호출자가 신뢰한 고정 공개키를 사용한다. JSON 패치를 파일로 출력할 수 있다. |

## 사람과 AI

메시/지형 기존 전용 명령을 확장했고 `world.foliage.edit`를 추가했다. `{path,expectedRevision,settings,dryRun}`은 문서 검증·Undo·저장과 동일한 코드를 사용한다. 토폴로지/노멀/UV는 접이식으로 나누고 장황한 안내를 화면에 넣지 않았다. 새 종속성·상시 폴링·자동 GPU 읽기는 추가하지 않았다.

예: `world.mesh.edit`의 `settings.operation`에 `weld`, `splitEdges`, `uvPack`, `flatNormals`, `smoothNormals`, `setNormals`, `duplicateFaces`를 사용한다. 간선은 정점 인덱스 쌍 배열이다. 폴리지는 `settings:{operation:'transform',ids:['안정 ID'],position:[x,y,z]}` 또는 rotation/scale/delta를 쓴다.

패치 CLI:

```powershell
node tools/hb.mjs patch.create '{"before":"기준 폴더","after":"새 폴더","out":"update.json","privateKey":"배포자 개인키 경로"}'
node tools/hb.mjs patch.apply '{"root":"게임 폴더","patch":"update.json","publicKey":"신뢰하는 공개키 경로"}'
node tools/hb.mjs patch.recover '{"root":"게임 폴더"}'
```

키는 저장소나 게임 에셋에 생성·포함하지 않는다. 공개키를 지정하면 서명이 필수다. 이전 unsigned 오프라인 패치 API는 명시적 로컬 용도로 호환한다. 복구 중 사용자가 변경한 파일이 발견되면 덮어쓰지 않고 기록/백업을 보존한다.

## 확인과 경계

새 공용 검사 12개, 기존 165 회귀 17개, core/native/UI-audio/gameplay/retarget/API 검사를 묶어 실행했다. 실제 C++ `GetCurve`, 숨김 편집기의 12종 제작 화면·폴리지 Undo·위젯 문화권·Take 버튼, WebGPU 시트/PCM, 개발/릴리스 독립 D3D11 플레이어를 확인했다. 자세한 경로와 SHA는 검사 기록을 따른다. 빌드/실행을 겹쳐 발생한 파일 잠금은 실행 종료 후 순차 빌드로 해결했다.

추가 범위는 남아 있다. 메시 bevel/연속 UV 섬, GPU 지형 브러시/텍스처 레이어/부분 전송, 큰 맵 렌더·충돌 청크 재생성, 서로 다른 모프 이름 매핑, 배열/구조체/동적 컴포넌트·골격/오디오 Take, 위젯 상속/월드 UI, 실제 전원 차단·디스크 장애/원격 패치/키 배포, 파일↔폴더 형태 전환은 이번 구현 범위에 포함하지 않았다. 폴리지 수백만 인스턴스/장시간 성능이나 모바일 실기기를 검사했다고 주장하지 않는다.

## 공식 문서 대조

[Unreal PolyGroup Edit](https://dev.epicgames.com/documentation/en-us/unreal-engine/polygroup-edit-tool-in-unreal-engine)의 선택 필터·면/간선 조작과 [Unity 지형 구멍](https://docs.unity3d.com/6000.4/Documentation/Manual/terrain-PaintHoles.html)의 브러시·구멍 계약을 대조했다. HB는 PolyGroup 전체나 텍스처 마스크 대신 삼각 메시/셀별 구멍을 쓴다.

[Unreal Animation Curves](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-curves-in-unreal-engine)의 속성/모프/머테리얼 구동과 [Take Recorder](https://dev.epicgames.com/documentation/en-us/unreal-engine/take-recorder-in-unreal-engine)의 Actor/컴포넌트 속성 녹화·키 축약을 대조했다. HB의 이번 Take는 현재 존재하는 기본 속성을 다루며 Spawnable·Live Link·마이크 녹화까지 제공하지 않는다. [Node crypto.sign](https://nodejs.org/api/crypto.html#cryptosignalgorithm-data-key-callback)의 Ed25519 서명 계약도 참고했다. 새/재조회 지정 본문과 연결 API·이미지·미디어 미독 범위를 corpus에 별도로 등록했고 전체 분석 gate는 승격하지 않았다.

릴리스 표본 185프레임(1.626초, 초기 프레임 포함)은 평균 작업2.53ms/p95 2.60ms, 관측113.90fps, 4draw였어요. PC120 설정과 자동 읽기0을 확인했지만 동등 기준 비교나 대형 씬/휴대폰 보장으로 계산하지 않았어요.
