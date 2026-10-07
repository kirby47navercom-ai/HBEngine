# 050 메인 씬 WebGPU 계산·그리기 연결

2026-10-07. 메인 게임 실행기에 선택형 WebGPU 렌더러를 연결했어요. 장면의 `runtime.renderBackend`를 `webgpu`로 지정하면 같은 카메라·깊이 버퍼에서 일반 스프라이트/기본 메시와 GPU 파티클을 그려요. 생략하면 기존 WebGL2를 사용하며 WebGPU 모듈도 실행 중에는 불러오지 않아요. 월드 설정의 **실행 렌더러**에서 선택하고 저장할 수 있어요. 편집기 미리보기는 WebGL2예요.

## 기존 함수와 실행 계약

- 기존 `hb::Particles::Play/Stop/Pause/Emit/GetCount`와 같은 블루프린트 노드를 사용해요. 별도로 DirectX/WebGPU 초기화 코드를 작성하지 않아도 돼요. GPU 파티클 대상의 C++ 호출은 기존 로컬 채널로 실행기에 전달되며 같은 함수 안의 정지→방출→개수 조회 순서를 유지해요. CPU 대상의 기존 명령 경로는 유지해요.
- 하나의 게임 렌더러/장치를 공유해요. 파티클별 위치·나이/속도·수명/생존 인덱스/간접 그리기 명령/출생 요청 6개 버퍼를 재사용해요. 이동, 중력, 힘, 감쇠, 죽은 슬롯 재사용과 생존 개수 계산은 컴퓨트 셰이더에서 처리해요. 생성 타이밍·형상·초기 랜덤 값은 기존 방출기를 공유해요. 시작/끝 색상과 크기는 GPU에서 보간해요.
- 매 프레임 생존 입자의 위치나 개수를 CPU로 회수하지 않아요. `GetCount`를 실제로 요청할 때만 5개 uint 명령 버퍼를 명시적으로 읽어요. 처음 할당하는 storage attribute에는 CPU 초기 배열도 있어요. CPU 메모리 할당 자체가 없다는 뜻은 아니에요. 새 입자가 없으면 출생 버퍼도 다시 업로드하지 않아요.
- 입자별 정렬 없이 생존 인덱스만 모아 간접 draw를 제출해요. 슬롯 배정 순서는 GPU 실행 순서에 따라 달라요. 로컬 입자는 이미터를 따라가고 월드 입자는 이미터가 이동해도 원래 월드 위치를 유지해요. 수명 종료·clear·컴포넌트 재생성·장면 전환에서 자원을 해제해요.
- UI의 기존 파티클 10,000개 상한은 제거했어요. 양의 안전한 정수인지와 실제 장치의 storage binding 크기를 확인해요. 메모리 부족/장치 오류는 실패로 보고해요. 실행 중 장면을 이동해도 렌더러는 시작 장면에서 선택한 것을 유지해요. 서로 다른 명시적 렌더러 설정으로 이동하면 현재 장면을 보존하고 오류를 반환해요.
- AI 스키마에 설정 경로, 기본값, 지원 백엔드, 함수와 제한을 추가했어요. 사람이 쓰는 월드 설정과 AI가 수정하는 장면 JSON을 같은 검증기로 검사해요.

## 실제 검증

`node tools/check-gpu-scene.mjs`와 `node tools/check-gpu-scene.mjs --webgl`은 원본 게임과 분리한 프로젝트·프로필·포트·숨은 Win32/WebView2 실행 창에서 검사해요. 최신 증거는 `native/build/gpu-scene-24G6Ni/acceptance.json`(GPU), `native/build/gpu-scene-XFO4wW/acceptance.json`(기존 WebGL2)이에요.

- 실제 NVIDIA WebGPU 백엔드, 블루프린트 입력→컴파일한 사용자 C++→GPU 방출, C++ 함수 안의 정지/방출/개수 질의 순서 PASS.
- 2D 직교/3D 원근 카메라, SVG 스프라이트, 실제 캡처의 입자 색상과 메시 깊이 가림, 이미터 이동 시 월드/로컬 공간 차이 PASS.
- 용량 65와 65,537, 부분 워크그룹 경계, 살아 있는 입자를 보존한 추가 방출, pause/clear/수명 종료 PASS.
- 반복 장면 전환 후 파티클 1개 시스템·6개 버퍼·4,440바이트 storage 계약, 지오메트리 3개/텍스처 5개가 시작과 동일해요. 65,537개 시스템의 storage 계약은 4,456,536바이트예요. 이 수치는 모든 GPU 할당/전체 RAM 사용량은 아니에요.
- 위치 자동 회수 없음, 명시적 개수 질의만 회수, 출생 요청이 없을 때 업로드 증가 없음, GPU 오류 0, 정상 종료 코드 0과 전용 서버 종료 PASS.
- 기존 CPU 방출기를 이전 커밋 `553e89b`와 32개 경우·2,560스텝으로 비교했어요. 형상 4종, 로컬/월드, 지연/버스트/반복/용량/일시정지/리셋 결과와 시드가 같아요. 증거 `native/build/particle-cpu-parity-050.json`.
- 기존 로컬 C++ 채널의 순서/프로젝트 범위/출처/중복 요청/끊긴 응답 재실행 방지 검사와 CPU 파티클의 C++·BP·AI 속성/렌더 버퍼 검사를 통과했어요. 장기 스트레스나 변경 없는 전체 검사는 실행하지 않았어요.

초기 검사의 메시 가림 위치/색 임계값과 서로 다른 순간의 canvas를 읽던 픽셀 검사를 바로잡았어요. 픽셀 검사는 저장한 동일 PNG를 디코딩해 비교해요. 이후 장면 전환에서 남던 PMREM 배경 BoxGeometry를 별도 진단으로 추적했어요. 설치 Three r180의 배경 박스가 생성돼도 소유 필드에 저장되지 않아 dispose에서 빠졌어요. 엔진 어댑터에서 소유권을 지정하고 실제 반복 전환에서 증가가 없음을 확인했어요. compute 전용/간접 storage 버퍼도 geometry가 사용하지 않는 속성까지 명시적으로 해제해요. r180의 내부 소유 API를 쓰는 두 구간은 Three 업데이트 때 재검증이 필요해요. 최초 실패 증거도 보존했어요.

## 확인한 근거와 적용 범위

[WebGPURenderer 자체 API 본문](https://threejs.org/docs/pages/WebGPURenderer.html), [StorageInstancedBufferAttribute 자체 API 본문](https://threejs.org/docs/pages/StorageInstancedBufferAttribute.html), [IndirectStorageBufferAttribute 자체 API 본문](https://threejs.org/docs/pages/IndirectStorageBufferAttribute.html)을 읽었어요. 자동 WebGL2 fallback과 간접 draw의 WebGPU 요구를 확인해, GPU 선택 시 실제 WebGPU 장치가 없으면 거부해요. 연결된 소스/상속 API까지 모두 읽었다는 뜻은 아니에요.

동일 설치 버전 `0.180.0`의 공식 소스에서 [Attributes](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Attributes.js), [WebGPUAttributeUtils](https://github.com/mrdoob/three.js/blob/r180/src/renderers/webgpu/utils/WebGPUAttributeUtils.js), [Geometries](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Geometries.js), [PMREMGenerator](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/extras/PMREMGenerator.js)의 업로드/파괴/소유 경로와 WebGPUBackend·WGSLNodeBuilder·ComputeNode·SpriteNodeMaterial의 dispatch/인덱스/빌보드 구간을 대조했어요. ComputeNode의 count 설정만으로 마지막 워크그룹의 범위 밖 실행을 막는다고 가정하지 않고 셰이더에 직접 범위 검사를 넣었어요. 본문 원본·SHA·읽기 구간은 `native/build/gpu-scene-research-050/manifest.json`에 있어요. 최신 웹 문서의 다른 버전 옵션을 설치 API에 그대로 적용하지 않았어요.

## 남는 경로

노드 머테리얼, 하늘/높이 안개/환경 캡처, 2D 조명·마스크·블룸, 입자 정렬, 픽셀 퍼펙트, 스프라이트 번쩍임, 투사체 배치 셰이더는 WebGL2 경로를 사용해요. WebGPU를 선택한 경우 해당 사용을 명시적으로 거부해 조용히 그림이 빠지지 않게 했어요. 단순 구름 메시·기본 PBR 메시·일반 스프라이트는 같은 GPU 장면에 들어가요. 기존 D3D11 SDK의 버퍼를 WebGPU로 공유한 구현은 아니에요. SDK의 직접 렌더·3개 프레임 슬롯은 별도로 유지해요.

모든 엔진 기능의 GPU 이식, 기존 게임의 렌더러 전환, PC120/모바일60 달성, 모바일 실기기·전체 RAM·장기 안정성, 공식 문서 전체/API 분석 완료로 세지 않아요. 머티리얼/조명/후처리 GPU 이식과 기존 누적 엔진 요구를 다음 작업으로 유지해요.
