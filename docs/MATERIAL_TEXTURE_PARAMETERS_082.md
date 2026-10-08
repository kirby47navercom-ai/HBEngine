# 런타임 텍스처 파라미터 — 082

## 읽은 근거

[Unity 6000.0 Material.SetTexture](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Material.SetTexture.html)의 자체 선언 네 개·파라미터 표·설명·전체 예제를 읽었다. 이름/ID 및 RenderTexture subelement 오버로드와 Shader keyword 활성화 조건을 구분했다. HBEngine은 이번에 이름과 프로젝트 텍스처 에셋을 사용하는 setter를 제공한다. ID·RenderTexture color/depth/stencil·모든 shader keyword를 구현했다고 계산하지 않는다.

[Unreal 5.5 SetTextureParameterValue](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/Materials/UMaterialInstanceDynamic/SetTextureParameterValue?application_version=5.5)의 자체 API 본문 0–26행을 읽고, [5.8 UMaterialInstanceDynamic](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UMaterialInstanceDynamic)의 setter/ByInfo 표 188–197행과 대조했다. 5.5 단독 API는 역사 보조 source로 따로 등록했다. 5.8 단독 setter URL은 접근 실패, 5.5 HTML은 403이므로 web 응답의 요약/SHA를 보존했다. 클래스 나머지 본문·연결 API·헤더/구현 소스는 읽은 것으로 계산하지 않는다.

설치 Three 0.180.0의 Pipelines 생성자 cache/program 필드와 RenderPipeline 생성/캐시 대입 부분, Pipeline/RenderPipeline 자체 파일 전체를 읽었다. 공식 [r180 Pipelines](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Pipelines.js), [Pipeline](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Pipeline.js), [RenderPipeline](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/RenderPipeline.js) 원문을 저장해 설치 파일과 바이트/SHA를 대조했다. 남은 Pipelines 메서드·import·backend 소스는 미독이다. 여섯 출처 발견 provenance를 원장에 기록했고 독립 검증/전체 corpus gate는 승격하지 않았다.

## 사용 계약

```cpp
hb::Materials::SetTexture(target, "Paint", "Assets/Cyan.svg");
hb::Materials::SetTexture(target,
    hb::Materials::LayerParameterKey("upper", "Paint"),
    "Assets/Sky.hbcubemap.json");
```

- 같은 SDK 선언으로 `materialTexture` / 머테리얼 텍스처 설정 BP 노드와 C++ 서비스 서명을 생성한다. target(object), parameter(string), texture(string)이며 실행기에서는 정확한 경로나 에셋 이름을 해결한다. 다른 종류/폴더에 동명 에셋이 있으면 정확한 경로를 지정한다. 기존 편집기 Play·Gameplay Preview·배포 Player의 공용 서비스에 연결했다. DirectX 초기화 코드를 사용자가 작성할 필요는 없다.
- 기존 `Materials::Set`으로 적용한 노드 머테리얼의 **사용 중인** Texture2D/Cube/Array/3D 파라미터를 바꾼다. 자원 종류·이름·Assets 경로를 검사한다. 숨겨진 정적 분기만의 파라미터, 수치 파라미터, 외부 URL, 없는 에셋은 오류를 반환한다. 자료형을 바꾸거나 StaticSwitch를 실행 중 다시 컴파일하는 API는 아니다.
- typed 함수/선택된 정적 분기를 낮출 때 원래 리소스 파라미터 키를 sampler에 보존한다. 레이어 키를 유지하며 빈 Texture2D 기본값도 흰 placeholder 바인딩을 만든다. 기존 scalar/surface Float 계약을 유지한다.
- WebGL uniform과 WebGPU TextureNode의 텍스처만 바꾸고 머테리얼/셰이더를 다시 만들지 않는다. 같은 파라미터의 모든 sampler·현재 적용된 머테리얼에서 로딩을 준비한 뒤 한 번에 적용한다. 실패/오래된 요청/Actor 삭제/머테리얼 교체 시 새 자원을 해제하고 기존 표시를 유지한다. 파라미터별 generation은 서로 다른 파라미터의 변경을 덮어쓰지 않는다.
- 교체된 이미지와 placeholder를 즉시 dispose하고 보관 집합에서 제거한다. 현재 사용하는 descriptor만 남긴다. 동일 경로/동일 descriptor 재지정은 디코딩·GPU 업로드를 생략한다. 새 생성·실제 다른 에셋 교체 시에만 이미지를 읽는다. 사용자 프로젝트 파일/원본 머테리얼은 쓰지 않는다.

## 검증

코어에서 범위 키·선택된 StaticSwitch 원점, 빈 파라미터, 40회 교체/20회 동일 에셋 재지정, 같은 ID/version/program key, 실패 후 원본/표시 보존, 복수 sampler 중 하나 실패의 부분 자원 회수, 느린 요청 취소·dispose 중 로딩·clone·장면/서비스·경로/종류 검증을 확인했다. 기존 typed 함수/레이어/77 머테리얼/715 BP/289 공용 계산 API와 엔진 통합 검사도 통과했다. 새 서비스 하나를 추가해 공용 C++ 연결은 core289 + service341 = 630이다.

최종 격리 Windows 배포 실행은 **WebGL2 gpu-scene-8lWGnN**, **WebGPU gpu-scene-LvhZc4**다. 네 종류마다 빨강 → 실제 컴파일된 사용자 C++ 호출로 청록 → 실제 T 키 입력/BP 노드로 빨강을 확인했다. 동일 에셋 C++ 호출 10회에서 loader 횟수가 늘지 않았고 마지막 실제 교체까지 총 3회였다. 실제 GL program 객체 및 GPU pipeline/vertex/fragment stage 객체 identity가 유지됐다. 각 머테리얼은 현재 텍스처 1개를 소유했고 renderer memory도 전후 동일했다. GL material version 1, GPU 0 유지; 오류0·exit0·원본 바이트 보존·전용 서버 종료·**각 51개 소스 SHA**가 최종 파일과 일치했다. PNG·빌드 JSON·acceptance 및 선행 실패/수정 기록을 보존했다.

```powershell
npm run check:material-texture-parameters
npm run check:gpu-scene:texture-parameters:webgl
npm run check:gpu-scene:texture-parameters
```

검사는 검사 전용 프로필/프로젝트/포트와 offscreen Win32/WebView2 게임 창만 사용했다. 사용자 창·Auric_Loop Assets/Source/tools·설치본을 건드리지 않았다. 실제 테스트 대상은 Cube/노드 머테리얼과 직교 게임 카메라다. 모바일 실기기·모든 Sprite shader domain·HDR/mip/sampler·RenderTexture/가상 텍스처·전역 PC120/모바일60 성능을 이 작은 테스트로 검증했다고 주장하지 않는다. 전체 선행 작업 → 일괄 최종 검사 → 설치 업데이트 → 추가 조사 작업이라는 051 순서를 유지한다.

원문/읽기 경계·소스/최종 증거와 MD prefix 보존은 [기계 기록](research/MATERIAL_TEXTURE_PARAMETERS_082.json)에 있다.
