# 머테리얼 속성·레이어·블렌드 — 076

2026-10-08. 075의 함수 에셋과 기존 에디터·CPU 평가·GLSL/TSL·C++/BP·파일 트랜잭션·배포 경로를 확장했다. 새 의존성이나 픽셀별 레이어 VM은 추가하지 않았다.

## 작성과 편집

콘텐츠 브라우저에서 Material Layer(`ML_`, `.hbmateriallayer.json`)와 Material Layer Blend(`MLB_`, `.hbmaterialblend.json`)를 만들고 별도 그래프로 연다. Layer는 공통 `input` → `result`, Blend는 `bottom`/`top` → `result`라는 고정 Attributes 경계를 사용한다. 이름은 바꿀 수 있지만 경계 ID·타입은 보호한다. 일반 함수에도 `attributes` 타입과 해당 미리보기 값을 추가했다.

Make/Set/Break/Get/Blend Material Attributes 노드는 기존 표면의 11개 필드(색·거칠기·금속·노멀·발광·불투명도·차폐·코팅·코팅 거칠기·투과·굴절률)를 묶거나 선택해 편집한다. Set/Get은 오른쪽 속성창에서 필드를 고른다. Blend는 Alpha를 0~1로 제한하고 선택적으로 노멀을 정규화하며, 서로 반대인 노멀의 합이 0이면 기본 노멀을 사용한다. Surface의 Attributes 모드 전환은 연결과 입력 리터럴을 보존하는 한 번의 Undo 작업이다.

Material Layers 노드의 스택은 같은 Layer 에셋을 여러 번 사용해도 각 항목의 안정적 ID와 파라미터를 구분한다. 배경은 첫 항목이며 켜진 상태로 유지하고 Blend를 붙이지 않는다. 위 항목에는 Layer/Blend 에셋·독립 값·표시·순서·복제·삭제를 설정한다. 숨긴 항목의 값도 편집할 수 있다. 항목 복제와 그래프 Ctrl+D/붙여넣기는 새 ID를 만들고 값은 복사한다. 여러 Layer 에셋을 드래그하면 선택한 스택에 추가하거나 새 노드를 만들고 한 번에 되돌릴 수 있다.

인스턴스는 부모 스택을 먼저 상속하고, 스택 재정의 체크 또는 개별 편집으로 자체 배열을 만든다. 재정의를 끄면 부모 순서·값·표시를 다시 사용한다. 부모 파일은 바꾸지 않는다. 명시적 `layerStacks`가 없는 인스턴스도 상속된 컨트롤과 파라미터를 표시한다. 노드는 짧게, 노드의 에셋·파라미터 편집은 우측에 두며 영어 기본 제목과 한·영 툴팁/검색을 유지한다.

## 실행·C++·AI

`resolveMaterialAsset`는 부모 체인을 원본 구조로 합친 뒤 Layer/Blend를 기존 함수 호출로 펼치고, Attributes를 기존 숫자·벡터 표현식으로 내린다. 공통 입력은 각 Layer에 전달하며 Layer가 필요한 필드만 수정할 수 있다. 정의 읽기는 해석당 경로별 캐시를 사용한다. 같은 정의를 반복한 항목의 값은 `layer.<항목ID>.layer.<이름>` 또는 `layer.<항목ID>.blend.<이름>`으로 분리한다. 중첩 일반 함수도 항목의 범위를 유지한다.

```cpp
auto name = hb::Materials::LayerParameterKey("upper", "Amount");
hb::Materials::SetFloat(actor, name, 2.0f);
auto mask = hb::Materials::LayerParameterKey("upper", "Alpha", true);
hb::Materials::SetFloat(actor, mask, 0.5f);
```

기존 `Set`/`SetFloat`와 BP `materialSet`/`materialFloat`를 사용한다. 같은 SDK 선언에서 순수 BP `materialLayerParameter`를 생성하며 ID·한글/영문 파라미터 이름을 JS와 C++에서 대조한다. WebGPU Float 갱신은 기존 uniform을 갱신하고 새 머테리얼을 만들지 않는다. WebGL2는 기존 재생성 경로를 유지하므로 그 비용 절감은 후속 작업이다. 714 BP·340 서비스·289 공통 API, 연결된 C++ SDK는 629개다.

AI는 `schema.material.attributes`/`layers`, 기존 에셋 생성, revision/dryRun/patch/Undo/Save와 `files.apply`/`undo`/`redo`를 사용한다. 여러 파일의 잘못된 입력은 전체를 거절한다. 저장/묶음 되돌리기는 렌더링용 에셋 캐시와 부모·레이어 UI 캐시를 갱신하고 실제 사용 중인 의존 머테리얼을 다시 적용한다. UI 비동기 조회는 문서·부모·갱신 세대가 달라지면 오래된 결과를 버린다. 묶음 갱신은 다른 문서의 저작 데이터와 Undo 기록을 자동 변경하지 않는다.

패키징은 독립 Layer/Blend 파일과 저작 구조를 보존하고, 머테리얼·인스턴스의 참조/경계/순환/타입 오류를 출력 전에 거절한다. 원본 프로젝트·사용자 프로필은 검사에 사용하지 않는다.

저작 스택에 임의의 4개 제한을 두지 않았다. 10개 항목의 해석을 검사했다. 펼친 셰이더는 기존 1000노드/5000선 검증 예산을 적용하며 씬 오브젝트 수 제한과 다르다. 항목별 값은 128개 파라미터까지 검증한다. 항목이 많아지면 셰이더 연산·컴파일 비용도 증가하므로 이번 기능만으로 전체 게임 FPS 개선이나 무제한 비용을 주장하지 않는다.

## 검증

재현 명령:

```powershell
npm run test:material-layers
npm run test:material-layers-editor
npm run test:material-layers-player
npm run test:material-layers-player-gl
npm run test:material-functions
npm run api:check
npm test
```

코어 검사는 Attributes 리터럴·분기 보존·타입 거절·노멀·Layer/Blend 경계·중첩·독립 값·인스턴스 순서/숨김/복원·복제 ID·10개 항목·숨긴 값·참조 변경·잘못된 에셋 패키징·원본 보존을 확인한다. 최종 실제 에디터 `gpu-editor-WAJ76y`에서 독립 그래프·선택/Undo·스택 및 노드 복제·다중 드래그·부모 상속/독립 편집·dryRun·실제 다중 파일 저장/Undo·Surface 모드 전환을 확인했다. 저장 후 씬을 다시 열지 않은 실제 화면의 평균 밝기가 65.089→44.996으로 바뀌고 일반 저장 복원/묶음 Undo에서 65.089로 돌아왔다. 에디터 오류0·exit0·서버 종료와 fixture 원본 바이트 보존을 확인했다. 최종 배포 창 결과와 제품 SHA는 [증거](research/MATERIAL_LAYERS_076.json)에 기록한다. 비활성 별도 Win32/WebView2 창·고유 프로젝트·프로필·포트만 사용한다. 제품 변경이나 실제 실패가 있을 때만 관련 검사를 다시 실행하며 8시간 검사는 반복하지 않는다.

release Player `gpu-scene-K92uTA`(WebGPU)와 `gpu-scene-i24w02`(WebGL2)는 같은 Layer 반복·인스턴스·실제 C++/BP scoped 파라미터·배경 독립·숨김·패키징을 확인했다. 실제 픽셀은 `[2,2,2]`→`[245,245,245]`→`[2,2,2]`였고 WebGPU 숫자 갱신에서 같은 머테리얼 ID를 유지했다. 두 실행 모두 오류0·exit0·서버 종료·원본 보존·최종 소스 SHA 일치다.

이전 `Rgqp1M`은 저장이 JSON을 들여쓰기 형식으로 바꿨는데 compact fixture의 원본 바이트와 비교해 실패했다. 저작 데이터와 픽셀 검사는 통과했으며, 최종 검사는 처음부터 에디터 저장 형식의 fixture를 사용해 바이트 보존도 확인했다. 이전 에디터의 잘못된 에셋 kind 조건과 배포의 빠진 테스트 장면 참조도 수정했고 실패 증거는 남겼다.

## 대조한 자료와 남은 범위

[Unreal Using Material Layers](https://dev.epicgames.com/documentation/en-us/unreal-engine/using-material-layers-in-unreal-engine)의 독립 Layer/Blend와 인스턴스 스택 흐름, [Material Attributes Expressions](https://dev.epicgames.com/documentation/en-us/unreal-engine/material-attributes-expressions-in-unreal-engine)의 묶음/선택 편집을 대조했다. [Unity HDRP 17.0.4 Layered Lit](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.0/manual/layered-lit-material.html)와 [Inspector Reference](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.0/manual/layered-lit-material-inspector-reference.html)의 자체 본문을 읽었다. Unity의 해당 셰이더의 4개 제한을 HBEngine 전체 스택의 제한으로 적용하지 않았다.

네 자체 기술 본문의 읽기와 원문/SHA 보존은 연결된 API·패키지 구현·샘플·영상 또는 두 엔진 전체 분석 완료를 뜻하지 않는다. 전체 corpus gate는 false다. HDRP의 Height Blend·Main Layer Influence·Triplanar·Detail/Displacement와 모든 셰이딩 모델을 이번 기능으로 완료 처리하지 않는다. Texture Object/StaticBool 함수 포트, 선택 노드 함수 추출, 임의 표현식/썸네일 미리보기, 추가 도메인/GI/라이트맵·네이티브 렌더러와 051의 다른 누적 세부는 후속 작업이다. 선행 완료→검증→사용자 설치 갱신→조사 기반 추가 작업 순서를 유지한다.


077 후속: 위 076 당시 남은 WebGL2 Float 재생성 비용은 [077](MATERIAL_UNIFORMS_077.md)의 연결된 uniform 경로에서 줄였다. 인스턴스의 레이어 배치·아이콘도 보완했다. 바인딩 없는 변경 fallback과 나머지 누적 요구/설치 순서는 유지한다.
