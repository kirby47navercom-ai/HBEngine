# BVH refit·분리 행 전송·구면 HDRI 필터

광선용 기하 GI와 경로 추적에서 삼각형 구성이 같으면 기존 BVH의 분할·삼각형 순서를 유지하고 경계만 갱신해요. 이동·버텍스 수정·인스턴스·모프·스키닝에 적용해요. 구성이 바뀌거나 정규화된 경계 면적 비용이 최초 구축의 1.5배를 넘으면 다시 구축해요. 잘못된 값은 기존 atlas와 BVH를 바꾸기 전에 거부해요. [Embree refit API](https://raw.githubusercontent.com/RenderKit/embree/master/doc/src/api/rtcSetGeometryBuildQuality.md)의 갱신 구분을 참고했으며, 자체 구현이에요.

기존 C++ 위치 변경과 블루프린트·AI 오브젝트 변경 경로에서 자동으로 적용해요. 별도 저수준 렌더링 코드를 사용자에게 요구하지 않아요.

```cpp
hb::Scene::SetPosition(actor, hb::Vec3{-4.f, -19.9f, -20.f});
```

DirectX 실행기에는 서로 떨어진 변경 행을 한 명령의 여러 구간으로 보내요. 변경되지 않은 행은 유한값 검사·base64 포장·전송에서 제외해요. 모든 구간의 자료형·정렬·범위·길이·유한값을 확인한 뒤 GPU를 갱신해요. 잘못된 뒤쪽 구간이 앞쪽 구간을 먼저 바꾸는 문제도 막아요. 이전 단일 구간 명령은 호환 경로로 유지해요. 원자성은 하나의 atlas 갱신 명령에 적용해요.

HDRI 밉에는 위도별 구면 면적을 사용해요. 경도 경계의 순환 보간, 극점 평균과 반 텍셀 영역 보간, LOD 사이 보간을 DirectX·WebGL·WebGPU에 연결해요. 극점의 정의되지 않은 `atan(0,0)`도 처리해요. 원본 중요도 PDF·alias 표와 `pathTracingHDRILOD=false`의 기존 동작은 유지해요. [PBRT 환경 광원](https://www.pbr-book.org/3ed-2018/Light_Sources/Infinite_Area_Lights)의 지정 구역을 대조했으며 전체 연결 본문을 읽었다고 계산하지 않아요.

검사는 CPU 교차점·경계·잘못된 갱신, native 분리 행·누락 행 보존·극점, 실제 C++ 이동, 기존 렌더링 묶음과 각 실행 경로의 오류·종료를 확인해요. 수치는 검사 장면의 작업량이에요. 삼각형 수집, 기본 포장과 JSON/base64 비용은 남아 있으므로 전송량 감소를 게임 FPS 향상률로 계산하지 않아요. 구면 필터는 비등방 원뿔 적분과 달라요.

검사 종료 시 복제 패키지·임시 WebView 프로필·개별 컴파일 캐시를 정리해요. 공용 컴파일 캐시는 최근 32개만 유지해요. 소스·원본 게임·세이브·SDK와 결과·재현 파일은 보존하며, 작업마다 대형 사본을 영구히 쌓지 않는 규칙을 [AGENTS.md](../AGENTS.md)에 유지해요.

[검증 기록](research/RENDERING_112.json)과 [설치 영수증](research/USER_INSTALL_112.json)에 실제 통과 범위와 설치 상태를 기록해요. 전체 게임의 120/60FPS와 휴대폰 검증, BLAS/TLAS·고급 광선 셰이딩·코스틱·추가 디노이저 등은 이 묶음의 검증 범위에 포함되지 않아요.
