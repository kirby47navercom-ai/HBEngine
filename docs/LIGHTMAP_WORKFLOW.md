# 간접광 라이트맵 제작

메시 에셋의 UV 창에서 `UV 1`을 선택하고 자동 아틀라스를 생성해 저장한다. 레벨에서 정적 메시 오브젝트를 선택하고 Inspector의 **간접광 베이크** 또는 우클릭 메뉴를 연다. 저장 경로·수신 메시 해상도·샘플·반사 횟수를 정하고 **베이크 저장**을 누른다. 계산은 Worker에서 실행하며 저장 전까지 취소할 수 있다.

라이트맵 에셋을 열면 공유 페이지·노출·표시 채널·필터·확대와 원본 선형 Half 픽셀값을 확인한다. 장면과 라이트맵 저장은 하나의 Undo/Redo로 되돌린다. 메시의 MeshRenderer에서 라이트맵과 강도를 지정하거나 해제한다. 배치나 기하가 달라진 정적 메시의 이전 결과는 표시하지 않으며 다시 베이크한다.

베이크는 발광·그림자·확산 반사·마스크·노멀·재료 텍스처와 SkyLight HDRI/하늘빛의 **간접광**을 기록한다. 직접 조명과 primary 하늘빛은 실시간에 남는다. 실시간 geometry GI·SSGI·path tracing을 켜면 라이트맵 간접광을 끄고, 해당 경로를 끄면 유효한 라이트맵으로 돌아간다. 동적 수신체 probe·방향성 lightmap·shadow mask·굴절 매질 및 대형 분할 베이크는 후속 범위다.

## AI 명령

`document.get`의 최신 revision을 사용한다. 예시는 활성 레벨을 대상으로 한다.

```json
{
  "method": "lighting.bake",
  "params": {
    "path": "Assets/Scenes/Garden.hbscene.json",
    "expectedRevision": "document.get에서 받은 revision",
    "targetPath": "Assets/Lighting/LM_Garden.hblightmap.json",
    "objects": ["Receiver"],
    "settings": {"resolution": 128, "samples": 32, "bounces": 1},
    "dryRun": true
  }
}
```

`dryRun`은 결과를 계산하고 저장 조건을 확인하며 파일과 Undo를 바꾸지 않는다. 실제 저장은 `dryRun: false`로 실행한다. 참조 JSON 및 이미지·GLB·HDRI 원본이 바뀌면 전체 저장을 거부한다. 다른 문서로 전환하거나 사람이 새 편집을 만든 경우에도 기존 편집을 보존한다.

`lighting.read`는 `summary`, `pages`, `bindings` section과 `offset`, `limit`으로 조회한다. 압축 픽셀 문자열은 반환하지 않는다. 열린 라이트맵의 `texture.view`는 페이지 `index`·노출 `exposure`·채널·확대·`pixel: [x,y]`로 화면과 선형 원본을 함께 확인한다.

다른 제작 도구도 바이너리 참조를 보호할 수 있다. `files.fingerprint`의 `{path, revision, bytes}`에서 revision을 가져와 `files.apply.guards`에 `{path, mode: "binary", expectedRevision: revision}`으로 전달한다. 응답에는 원본 바이트가 없으며 저장 전후 원본 변경을 검사한다. 기존 텍스트 가드는 그대로 사용할 수 있다.
