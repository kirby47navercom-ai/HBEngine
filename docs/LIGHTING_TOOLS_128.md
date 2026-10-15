# 128–130 — 다중 광원·스카이라이트 HDRI·편집기 도구

## 제작 흐름과 공식 자료 대조

[Unreal MegaLights](https://dev.epicgames.com/documentation/en-us/unreal-engine/megalights-in-unreal-engine)의 고정 표본 수·광원 중요도 선택·확률 보정과 비용 분리를 참고한다. HB는 기존 소프트웨어 BVH를 사용하는 경로 추적·기하 GI에 이를 연결한다. UE의 HWRT/deferred renderer, 볼륨·전방 투명 조명·Far Field·전용 디노이저를 도입한 것과 구분한다. 일반 래스터 조명은 기존 경로를 유지한다.

[Unreal Sky Lights](https://dev.epicgames.com/documentation/en-us/unreal-engine/sky-lights-in-unreal-engine)의 장면 캡처/지정 환경맵과 수동·자동 갱신 흐름을 대조한다. 기존 HB 장면 캡처를 유지하고 HDR·EXR 지정, 회전, 여러 스카이라이트의 출처 우선순위를 확장한다. Lightmass·DFAO 구현으로 계산하지 않는다.

[Unity 사용자 EditorWindow](https://docs.unity3d.com/6000.0/Documentation/Manual/UIE-HowTo-CreateEditorWindow.html)의 독립 창·입력·재구성 흐름과 [Undo.RecordObject](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Undo.RecordObject.html)의 변경 전 기록 원칙을 대조한다. HB는 기존 도킹·문서·명령·Undo를 재사용하며 Unity API나 코드를 의존성으로 추가하지 않는다. 지정 본문 대조이며 연결된 전체 API·엔진 문서의 분석 완료가 아니다. 출처는 CORPUS_MANIFEST의 many-lights-editor-tools-supplement에 등록한다.

## 128: 광원 수와 표본 수 분리

오브젝트 배치의 **Mega Lights**는 경로 추적과 다중 광원 샘플링을 켠 PostProcessVolume을 만든다. 점·스포트·태양광은 기존 오브젝트를 그대로 배치한다. 직접 설정할 때는 `megaLightsEnabled`, `megaLightsSamples`를 사용한다. 기본은 꺼짐이며 1–64는 광원 개수 제한이 아닌 한 교차점의 표본 예산이다.

광원 수가 예산보다 클 때만 power CDF를 16B/광원으로 저장한다. 1% 균등 분포를 섞어 어두운 광원도 제외하지 않고 float CDF의 빈 구간은 균등 분포로 전환한다. 층화 추첨과 `1/(표본 수 × PDF)`로 기여를 보정한다. 꺼짐·소수 광원은 기존 전체 평가와 포장을 유지한다. 셰이더도 비활성 variant에서 이진 탐색을 생성하지 않는다. 별도 자동 GPU 읽기나 타겟을 추가하지 않는다.

기존 논리 atlas 주소·공유 정점 변환을 유지하며 CDF는 광원 뒤, 머테리얼 앞에 둔다. Native는 예산 범위·정수·atlas 경계와 머테리얼 시작 주소를 함께 검사한다. Native 필터 stage의 stride와 원본 stage의 광원 예산을 분리한다. 설정 변경은 원본/표시 이력을 갱신한다. 읽기 전용 `renderer.rayGeometry.analyticLights/lightBudget`은 설정된 비용을 보여 주며 GPU 시간/FPS 측정값은 아니다.

## 129: 기존 SkyLight 확장

SkyLight의 출처를 `scene` 또는 `hdri`로 선택한다. `cubemap`에는 프로젝트 HDR·EXR을 지정하고 `sourceRotation`으로 회전한다. 지정된 출처가 여러 개면 `priority`, 동률이면 안정적인 오브젝트 ID 순으로 선택한다. 기존 상·하부 주변광 합성은 유지한다.

환경맵은 장면 오브젝트가 소유하고 오브젝트 재구성·장면 종료 때 해제한다. 장면 캡처 모드로 돌아가거나 주변광을 끄면 HDRI 경로와 회전을 해제한다. WebGL/WebGPU 표면은 장면 환경맵을 사용한다. 경로 추적은 PostProcessVolume이 HDRI를 명시하지 않았을 때 선택한 SkyLight의 환경맵·회전·밝기를 사용한다. Native 경로 추적도 같은 포장을 사용한다. Native 일반 래스터의 전역 HDRI IBL 추가를 이 증거로 주장하지 않는다. 기존 ReflectionProbe와 장면 하늘 재캡처 기능은 유지한다.

## 130: 사람이 쓰고 AI가 편집하는 제작 도구

콘텐츠 브라우저에서 **편집기 도구**를 만들거나 **도구 → 새 편집기 도구**를 사용한다. `.hbeditortool.json`은 숫자·문자열·논리값·Vector3·선택 목록과 버튼을 정의한다. 기본 도구는 2D 스프라이트·큐브·점 광원·스카이라이트 배치를 제공한다. 기존 문서 탭·도킹·분리 창으로 열고 저장·Undo·외부 변경 갱신을 공유한다. 도구 편집의 정의를 적용하면 입력과 버튼을 다시 만든다.

버튼은 `scene.place`, `scene.select`, `document.patch`, viewport/window 명령을 호출한다. `$input`은 자료형을 검사한 입력, `$context`는 현재 장면/활성 문서/선택 ID, `$revision`은 호출 전 문서 revision을 결합한다. 장면 수정은 기존 명령의 검증·Undo를 거친다. AI의 `editorTool.run`도 같은 버튼 경로다. 임의 JS/HTML/shell 실행과 별도 문서 저장 통로를 만들지 않는다.

AI는 `document.get → document.patch → document.save` 또는 revision을 검사하는 `files.apply`로 도구 자체를 편집할 수 있다. C++/블루프린트의 기존 `Components.SetBool/SetFloat/SetString`은 새 광원 속성에도 적용된다. UI와 다른 AI 전용 엔진 상태를 만들지 않는다.

검증 수치·실제 실행 경로·설치 영수증은 `docs/research/LIGHTING_TOOLS_128.json`과 `USER_INSTALL_128.json`에 기록한다. 전체 엔진·게임 FPS·실제 휴대폰 성능의 완료 주장과 분리한다.
