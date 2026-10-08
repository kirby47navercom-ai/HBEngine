# WebGL Float 갱신·인스턴스 레이어 배치 — 077

2026-10-08. 076 배포 증거에서 WebGPU Float 변경은 머테리얼을 유지했지만 WebGL2는 다시 만들었다. 기존 공용 SceneRendering.materialFloat의 updateFloat 경로를 WebGL2에도 연결했다. 별도 실행기·새 의존성·새 SDK는 추가하지 않았다.

`compileMaterial(data)`의 기본 정적 결과는 유지한다. 실제 WebGL 머테리얼 생성만 `uniformParameters:true`를 사용해 연결된 Scalar Parameter와 필요한 표면 Float를 uniform으로 만든다. 같은 파라미터 이름은 같은 바인딩을 사용하며 Layer/Blend의 scoped 이름은 구분한다. Roughness·Metallic·Opacity의 연결되지 않은 기본값, 구형 Roughness 노드와 EmissiveIntensity도 기존 SetFloat 이름으로 갱신한다. 셰이더 코드/바인딩 구조가 같은 머테리얼은 값이 달라도 같은 프로그램 키를 사용한다. 구조·리터럴·텍스처 선언이 바뀌면 해당 키는 달라진다.

기존 C++ `hb::Materials::SetFloat`·BP materialFloat와 LayerParameterKey를 그대로 사용한다. updateFloat는 같은 uniform 객체의 값과 실행 머테리얼의 진단 데이터를 갱신하며 needsUpdate를 올리지 않는다. clone은 현재 값으로 새 머테리얼/텍스처와 독립 uniform을 만든다. 잘못된 Float와 비숫자 파라미터를 거절하고 삭제된 머테리얼은 갱신하지 않는다. 출력에 사용하지 않는 Float 또는 대응 uniform이 없는 구조는 기존 재생성 fallback을 유지한다. Vector/Texture 변경·새 동적 API·전체 프레임 목표 완료를 이번 작업으로 세지 않는다.

인스턴스 편집기는 빈 전역 파라미터 영역을 숨기고 레이어 스택을 표면 재정의보다 먼저 표시한다. 공용 레이어 스택의 SVG 아이콘 크기를 고정해 우측 속성창과 중앙 인스턴스 폼에서 동일하게 표시한다. 기존 부모·표면 설정·상속/재정의·Undo/저장 기능을 유지한다.

## 검증과 근거

`npm run test:material-uniforms`는 실제 Three MeshPhysicalMaterial과 ShaderLib.physical에서 생성한 uniform 참조에 1000회 값을 쓰고 머테리얼 ID·version·프로그램 키 보존, 0값·NaN/자료형 거절·원본 보존·표면 별칭·clone 격리·같은 Layer 반복/Blend Alpha 독립·중복 dispose를 확인한다. 기존 material workflow/functions/layers·api:check·메인 검사를 함께 실행한다.

최종 실제 분리 Win32/WebView2 에디터 `gpu-editor-GVDL8F`의 PNG에서 인스턴스 배치와 15×15 아이콘 크기를 확인했다. 첫 캡처에서 발견한 확대 SVG를 고친 뒤 필요한 짧은 에디터/배포 검사를 다시 확인했고, release WebGL2 `gpu-scene-QoBTLQ`에서 실제 C++·BP Float 변경의 픽셀 `[2,2,2]`→`[245,245,245]`·동일 머테리얼 ID·텍스처/지오메트리 수 보존을 확인했다. 에디터와 배포 모두 오류0·exit0·서버 종료·fixture 원본 바이트 보존·최종 제품 SHA 일치다. 최종 경로·제품 SHA·오류/종료·원본 보존은 [증거](research/MATERIAL_UNIFORMS_077.json)에 기록한다. 고유 프로젝트/프로필/포트·비활성 창만 사용하며 사용자 설치와 게임 원본은 바꾸지 않는다. 이 검사는 전체 FPS/RAM·장시간 안정성의 새 측정이 아니다.

[Three Material API](https://threejs.org/docs/pages/Material.html)의 needsUpdate/version·onBeforeCompile·customProgramCacheKey·clone/dispose 구역과 [Uniform](https://threejs.org/docs/pages/Uniform.html)의 자체 본문을 확인했다. 설치된 Three 0.180.0의 Material/Uniform 및 WebGLRenderer의 uniform upload·material 변경·render 종료 구역과 대조했다. 웹 문서의 신규 API를 설치 버전에 있다고 가정하지 않았다. 원문/로컬 소스 SHA는 native/build/material-uniforms-research-077에 보존한다. 전체 Three/API·Unity/Unreal corpus 분석으로 승격하지 않으며 051의 남은 누적 세부와 설치 순서를 유지한다.
