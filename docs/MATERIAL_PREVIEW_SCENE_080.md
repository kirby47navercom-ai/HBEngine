# 머테리얼 미리보기 장면 — 080

## 읽은 근거

079에서 직접 읽은 [Unreal 5.8 Previewing and Applying](https://dev.epicgames.com/documentation/en-us/unreal-engine/previewing-and-applying-your-materials-in-unreal-engine)의 메시·환경·Realtime 설명과 [Unity Shader Graph 17.0.4 Main Preview](https://docs.unity3d.com/Packages/com.unity.shadergraph@17.0/manual/Main-Preview.html)의 메시 선택·드래그·휠 설명을 재사용했다. [Preview Mode Control](https://docs.unity3d.com/Packages/com.unity.shadergraph@17.0/manual/Preview-Mode-Control.html)의 자체 기술 본문 전체를 추가로 읽었다. HBEngine의 명시적인 2D/3D 카메라 선택은 Unity의 노드별 자동 Inherit와 구분한다. 연결 문서·영상·소스와 전체 corpus gate는 미승격이다. 원문/SHA/읽기 경계는 [증거 JSON](research/MATERIAL_PREVIEW_SCENE_080.json)에 있다.

## 사람·AI 제작 계약

- 미리보기 툴바에서 구·큐브·원기둥·평면 또는 프로젝트 모델을 선택한다. 모델은 기존 OBJ/FBX/glTF 로더를 사용하며 하나만 활성화한다. 기존 컴파일된 머테리얼을 공유하고 교체한 모델·geometry·원본 모델 머테리얼/텍스처는 해제한다.
- 3D 좌클릭 드래그는 회전, 직교 드래그는 이동, 휠은 거리/커서 기준 확대, F는 초점이다. 2D·상하좌우·앞뒤 카메라와 문서별 위치/배율을 복원한다. 본 장면 뷰포트의 입력 방식은 유지한다.
- 보기 메뉴는 Lit/와이어프레임/월드 노멀, Realtime(Ctrl+R), 자동 회전, 그리드, 배경 색, 환경 조명, 광원 배율, 노출이다. Realtime을 끄면 유휴 렌더와 시간이 멈추고 카메라·설정·머테리얼 변경은 표시한다. 079 노드/출력 미리보기에도 같은 장면을 사용한다.
- `material.scene {path,patch?,reset?,expectedRevision?}`는 조회/변경/기본값 복귀를 지원한다. 모델은 프로젝트의 안전한 Assets 경로만 허용한다. 범위·타입·미등록 필드/모델·revision 오류는 기존 view를 유지한다. view 설정은 원본 에셋·dirty·revision·Undo를 바꾸지 않는다.

## 실제 검증

최종 분리 Win32/WebView2 창의 WebGL2 `gpu-editor-KHG7gW`, WebGPU `gpu-editor-YVTXYC`에서 기본 메시 네 개와 OBJ 선택, 픽셀, 실제 직교 휠/드래그, 모든 방향, 세 보기 모드, 광원/환경, Ctrl+R, 문서 전환 후 비기본 2D 카메라/배율 복원, 실패 보존, 에셋/Undo 불변을 확인했다. 각 receipt의 30개 소스 SHA가 최종 코드와 일치하며 오류 0·종료 0·원본 보존·서버 종료가 통과했다. 재확인은 `node tools/check-gpu-editor.mjs --preview-scene-only [--gl]`로 관련 기능만 실행한다.

WebGL2의 정지 전후 frames=1526/time=25.5056, WebGPU frames=1509/time=25.3592로 각각 유지됐고 회전도 동일했다. 이는 유휴 작업 중단 증거이며 전체 게임 FPS/RAM 측정은 아니다. 기존 코어의 설정 32조합·뷰포트 수학 185·표시 228·expression 84·머테리얼 68·BP 714/C++ 연결 회귀도 통과했다. 직전 전체 창 검사 두 개와 카메라 재초점 실패/수리도 증거에 보존한다.

## 계속할 세부

OBJ는 실제 선택으로 검증했다. 에셋 드롭 및 기존 FBX/glTF 로더 연결은 구현됐지만 이 단계의 실제 드롭/각 형식 검증으로 계산하지 않는다. 새 프로세스 view 복구·동일 문서 비동기 모델 변경 경쟁·모바일 실물·장시간 메모리도 별도 검증 대상이다. Unlit·전체 셰이더 도메인·노드 썸네일·추가 텍스처 종류·장면 조명 제작 도구는 남은 누적 작업으로 유지한다. 사용자 설치본은 051의 선행 작업/설치 순서를 유지하며 아직 갱신하지 않았다.
