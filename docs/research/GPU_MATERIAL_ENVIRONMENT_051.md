# 051 GPU 머테리얼·환경 연결

2026-10-07. [설치 순서](../WORK_ORDER_051.md)에 따라 선행 미완료 작업을 구현하는 중이에요. 이 묶음으로 사용자 설치본을 전환하지 않아요.

## 구현과 실행 계약

- 기존 머테리얼의 54종 카탈로그(53종 값/연산 노드와 Surface 출력), 저장 그래프·핀 자료형·검증·인스턴스 부모 해석을 재사용해 WebGPU의 TSL/물리 머테리얼로 연결했어요. 기존 WebGL2의 GLSL 경로도 유지해요. 기본 렌더러는 계속 WebGL2예요.
- 색상·UV·텍스처·수학·벡터·노이즈·그라데이션·Fresnel·법선과 PBR 표면 입력을 연결했어요. 코팅·투과는 실제 사용한 머테리얼에서만 해당 물리 기능을 활성화해요. 런타임 숫자 파라미터는 기존 GPU 머테리얼의 uniform을 갱신하며 UUID/텍스처/지오메트리를 재생성하지 않아요. 인스턴스 재정의 값이 런타임 변경을 덮어쓰던 문제도 고쳤어요.
- `hb::Materials::Set(actor,path,slot)`과 `SetFloat(actor,name,value)`를 기존 Set Material / Set Material Float 블루프린트 실행 경로에 연결했어요. 생성 API/노드 카탈로그와 C++ 응답 검증도 같은 선언을 사용해요. 사용자가 GPU 초기화를 직접 작성할 필요가 없어요.
- 게임 실행기의 머테리얼 Time을 게임 시간으로 갱신해요. 편집기는 기존 미리보기 시간을 유지하고, Play에서는 게임 시간을 사용해요. AI/개발용 검사 결과에 실제 머테리얼 ID·백엔드·파라미터·시간과 환경 캡처 수·크기를 제공해요.
- 환경 액터의 하늘·구름 메시·PMREM 캡처·실시간 갱신, 높이 적분 안개와 시작/종료 거리·최대 불투명도, 후처리 볼륨의 블룸을 같은 GPU 장면에 연결했어요. 독립적인 볼륨 구름 레이마칭을 구현했다는 뜻은 아니에요. 구름은 기존 메시 방식이에요.
- Three r180의 블룸 대상과 필터 머테리얼, 전역 ViewportTextureNode의 투과 프레임 복사 텍스처를 엔진의 장면/렌더러 소유 경로에서 해제해요. 다음 장면에서 다시 필요하면 생성해요. 스크린샷에도 최신 환경 액터 설정을 적용해 첫 프레임 대기 없이 변경을 확인할 수 있어요.

## 한 묶음으로 검증한 결과

- `node tools/check-gpu-scene.mjs --materials`: `native/build/gpu-scene-sH8prw/acceptance.json`. 실제 숨은 Win32/WebView2 배포 Player에서 기존 65,537개 GPU 파티클·C++·2D/3D 검사와 머테리얼/환경을 함께 검증했어요. 53종 값/연산 노드를 Surface까지 연결해 실제 GPU 컴파일·그리기를 확인했고, 코팅/투과 및 Fresnel/소멸/체커/이동 텍스처도 실제 실행했어요.
- 실제 키 입력→블루프린트 머테리얼 노드, 컴파일한 C++ `SetFloat/Set`, 인스턴스 초기값 .2→0→5 변경, 숫자 32회 갱신에서 동일 머테리얼 ID 및 자원 수 PASS. 중심 픽셀의 발광 변화, 안개의 빨간색 적용, 블룸의 외곽 밝기 증가, 하늘의 빨강/파랑 변화를 확인했어요. 환경 반사 캡처는 실제 타겟을 생성하고 실시간 설정 변경 뒤 갱신했어요.
- 블룸을 끄면 후처리 타겟이 해제되고, 환경/머테리얼/장면 전환 후 시작 장면의 지오메트리 3/텍스처 5로 복귀해요. GPU 오류 0, 검사 실행기 종료/서버 종료/분리 프로젝트 원본 보존 PASS. 전체 RAM 또는 장시간 누수 없음의 증명은 아니에요.
- `node tools/check-gpu-scene.mjs --webgl --materials`: `native/build/gpu-scene-pzP5Za/acceptance.json`. 기본 WebGL2에서도 C++·실제 블루프린트 머테리얼 변경·인스턴스·텍스처와 기존 파티클/스프라이트를 확인했어요. WebGPU 모듈 지연 로딩 유지 PASS.
- 기존 머테리얼 54종 계산/GLSL/인스턴스 검사, 환경 액터 34개 검사, 엔진 통합/자원 수명 검사 PASS. 변경한 경로의 최종 검증을 함께 수행했으며 장시간 전체 스트레스를 다시 하지 않았어요.

## 읽은 근거와 추가 발견

[Unreal Material Instances](https://dev.epicgames.com/documentation/en-us/unreal-engine/instanced-materials-in-unreal-engine)의 자체 본문은 부모/자식 상속, 노출 파라미터와 런타임 인스턴스 변경이 셰이더 재컴파일과 구분된다고 설명해요. 해당 본문의 Scalar/Vector/Texture/Static/Constant/Dynamic 설명을 읽었어요. 4채널 벡터·큐브/플립북 텍스처·정적 스위치와 변형 관리도 추가 대조 대상으로 등록해요. 본문의 영상이나 연결된 전체 Expression API는 읽기 완료로 세지 않아요.

[Unity Shader Graph 17.0.4 Blackboard](https://docs.unity3d.com/Packages/com.unity.shadergraph@17.0/manual/Blackboard.html)의 자체 본문/표는 표시 이름·내부 참조·기본값·정밀도·노출, 범주·복사/붙여넣기·선택·드래그 생성과 스크립트 변경을 설명해요. 해당 본문을 읽었어요. [Property Node](https://docs.unity3d.com/Packages/com.unity.shadergraph@17.0/manual/Property-Node.html)는 문서 주소와 일부 헤더만 확인했으며 본문 읽기 완료가 아니에요. Keywords/Property Types/Precision/Virtual Texture/Graph Window 및 독립 Unity 실행 대조도 남아요. 사람이 편집하는 UI와 API 요구를 파라미터 변경 하나로 줄이지 않아요.

[Three MeshPhysicalNodeMaterial](https://threejs.org/docs/pages/MeshPhysicalNodeMaterial.html)의 자체 속성/메서드 본문과 설치된 Three **0.180.0/r180** 소스의 해당 머테리얼, NormalMapNode, NodeMaterial 위치/표면/출력·안개, Fog, BloomNode 크기/그리기/해제, PostProcessing, PassNode 해제, ViewportTextureNode 및 PhysicalLightingModel 투과 캐시 부분을 대조했어요. 현재 웹 문서의 새 속성을 설치 r180 지원으로 가정하지 않아요. TSL 전체 API 본문·전체 라이브러리·두 엔진 전체 분석 완료로 세지 않아요. 캐시/해시/실제 읽기 범위는 `native/build/gpu-material-research-051/manifest.json`에 기록해요.

## 보존한 미완료 항목

GPU 2D 조명·그림자·마스크·픽셀 퍼펙트·스프라이트 효과·입자 정렬·탄환, 에디터/모바일 GPU 연결과 앞서 보고한 엔진 전체 세부 작업을 이어가요. 전체 게임 PC120/모바일60, 실기기 발열/배터리/서명 배포, 전체 메모리 안정성, 전체 문서/API 대조는 이 검사의 완료 항목이 아니에요. 누적 요구와 조사에서 추가로 발견한 작업을 모두 유지하고, 선행 작업을 끝내 검증한 뒤 설치를 갱신해요.
