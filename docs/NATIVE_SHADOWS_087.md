# 087 — DirectX 광원 그림자

Windows 게임의 `windowsRenderer: d3d11`에 Directional·Spot의 깊이 맵과 Point의 여섯 방향 그림자를 연결했어요. 086에 기록한 그림자 미연결 범위를 이번 변경으로 이어서 구현했어요. 기존 2D/3D 장면·광원·MeshRenderer의 생성/수신 설정을 사용하며 사용자 설치본에는 아직 배포하지 않았어요.

## 제작·실행 연결

광원 속성에 그림자 해상도, 깊이/법선 bias, 필터 반경, 강도, 근거리/원거리와 방향 광원의 범위를 추가했어요. 같은 필드가 속성 창·AI 스키마·저장·Undo·C++ `Components::SetBool/SetFloat`·블루프린트 컴포넌트 함수로 전달돼요. 새로 만든 광원의 기본 로컬 Y=1을 제거해 오브젝트 위치/방향을 그대로 사용해요. 이전 `kind: light`도 그림자 설정을 받게 연결했어요.

카메라 밖 caster도 광원 프러스텀 안이면 깊이 패스에 포함해요. 수신은 직접광에 적용하며 Ambient/Hemisphere와 unlit에는 적용하지 않아요. 일반 텍스처와 HLSL 머테리얼의 opacity/alpha 컷아웃을 같은 깊이 셰이더에서 처리해요. nearest 또는 9탭 PCF를 사용하며 기울어진 면의 자기 그림자 얼룩은 slope bias와 clamp로 보정해요. 과도한 bias의 그림자 이탈 가능성은 설정으로 조정해야 해요.

깊이 배열은 필요할 때만 만들고 해상도/층 수가 같으면 재사용해요. 물체·광원·텍스처·숫자 uniform이 바뀌면 갱신하고 정지한 장면에서는 기존 깊이를 사용해요. 시간 노드를 가진 caster는 시간에 맞춰 갱신해요. 장면 종료/그림자 비활성화 때 자원을 해제해요. 정상 프레임에서 깊이 이미지 readback을 하지 않아요.

현재 서로 다른 해상도는 가장 큰 크기의 배열 층을 공유해요. 변경 프레임은 모든 광원 그림자를 보수적으로 다시 그려요. `shadowTextureBytes`는 배열의 폭×높이×층 수×4 추정치로 드라이버 할당량이 아니에요. `shadowDraws`는 현재 프레임, `shadowPasses`는 누적 횟수예요. 실제 기기 한도를 검사하며 오브젝트 개수 제한을 만들지 않았어요.

## 확인한 결과

- `native-scene-lMZaDR`: 실제 D3D11 깊이/컷아웃/수신 토글/점 광원 방향/스포트/독립 광원 픽셀, HLSL 54종과 기존 렌더 픽셀 검사 통과. 2,049 드로우×12프레임의 새 업로드와 자동 readback은 0이에요. 약 4.23ms는 CPU 제출 시간이며 전체 FPS가 아니에요.
- `native-scene-window-OXEZfA`: 실제 격리 Windows Game.exe에서 세 광원 그림자, C++/BP 토글·opacity·이동, 작성 위치, 정지 맵 재사용, 배열 크기/해제, 기존 SVG·HLSL·HUD·장면 전환과 종료 검사를 통과했어요. 실패 기록도 보존했어요. 첫 컷아웃 실패에는 자기 그림자 얼룩이 섞였고 slope bias로 수정했어요. 이후 작성 위치와 실제 렌더 위치 차이를 공용 생성 코드에서 고쳤어요. 마지막 BP 검사는 제작 데이터 변경보다 늦는 렌더 완료를 함께 기다리도록 고쳤어요.
- 공용 컴포넌트 62종·렌더 자원 수명과 기존 웹 2D/3D 실제 화면/입력 회귀 `web-export-GAINwR` 통과. 사용자 게임·설치본·열린 창을 변경하지 않았어요.

## 근거와 이어갈 범위

Unreal의 [Shadowing](https://dev.epicgames.com/documentation/en-us/unreal-engine/shadowing-in-unreal-engine)에서 그림자 방식·광원 설정·품질/비용을 대조했어요. Unity의 [그림자 성능과 문제 해결](https://docs.unity.com/en-us/engine/6000.3/manual/lighting-overview/shadows/shadow-performance)에서 caster 깊이 패스, unlit 수신 제외와 bias 부작용을 확인했어요. Unity 6000.3은 기존 6000.0 전체 corpus와 별도로 보존했어요.

Microsoft의 [깊이 자원과 뷰](https://learn.microsoft.com/en-us/windows/uwp/gaming/create-depth-buffer-resource--view--and-sampler-state), [Depth Bias](https://learn.microsoft.com/en-us/windows/win32/direct3d11/d3d10-graphics-programming-guide-output-merger-stage-depth-bias)를 읽고 typeless 자원/깊이·샘플 뷰와 slope/clamp를 적용했어요. 설치 Three r180의 PointLightShadow 전체와 LightShadow/SpotLightShadow 지정 메서드를 대조해 실제 여섯 면 순서를 맞췄어요. 원문 SHA·읽기 경계·제품 SHA는 [087 증거](research/NATIVE_SHADOWS_087.json)에 있어요.

이 패스는 CSM/VSM·contact/baked/ray-traced 그림자가 아니에요. 네이티브 블룸/GI/IBL·스킨/인스턴스/모프·입자/2D 전용 광원은 다음 렌더링 작업으로 유지해요. 전체 문서/API 독립 검증, 전체 엔진 완성, 실제 게임 120/60fps, 모바일 기기·장기 메모리/발열과 합성 모니터 픽셀 검사를 합격 처리하지 않았어요.
