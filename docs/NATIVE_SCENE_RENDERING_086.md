# 086 — Windows 장면의 DirectX 렌더링

Windows 게임 빌드의 `화면 렌더러 → DirectX 11`을 선택하면 기존 장면·카메라·메시·스프라이트를 네이티브 D3D11로 그려요. WebView2는 입력과 HUD를 맡아요. 기본값인 `장면 설정`, 편집기의 WebGL2/WebGPU, Android·iOS·웹 실행 경로는 그대로예요. 현재 사용자 설치본에는 이 변경을 배포하지 않았어요.

## 연결된 동작

- 정적 삼각형 메시·메시 그룹, 월드/법선 행렬, 직교·원근 카메라, 프러스텀/레이어, 투명 정렬을 연결했어요. SVG·아틀라스·스프라이트 반전·발광·플래시도 같은 장면 제작기를 사용해요.
- 기본 색상·노멀·거칠기·금속성·발광·AO 텍스처, 텍스처별 UV 행렬, 반복/미러/클램프, 선형/최근접 필터와 밉맵을 지원해요. 직접광은 GGX 기반이며 Ambient·Hemisphere·Directional·Point·Spot을 처리해요. 하늘 그라데이션·태양 원반·선형/지수/높이 안개도 연결했어요. 기존 WebGL/WebGPU와 모든 픽셀의 일치를 보장하는 셰이더는 아니에요.
- 노드 머테리얼의 공용 자료형 검사·함수/레이어 해석·정렬 결과를 HLSL로 컴파일해요. 수학·벡터·UV·시간·2D 텍스처·Float 파라미터를 연결했고 기존 `hb::Materials::SetFloat`와 블루프린트 `materialFloat`가 같은 숫자 버퍼를 수정해요. 숫자 변경만으로 셰이더를 다시 만들지 않아요.
- 깊이 검사/쓰기, 알파 컷아웃, 불투명/알파/가산 혼합, 앞/뒤/양면, 화면 크기, 별도 scissor, 픽셀 카메라의 검은 여백을 처리해요. 한글 HUD는 기존 DOM UI를 사용해요.
- GPU 메시·텍스처·셰이더를 캐시하고 바뀐 드로우 정보만 보내요. 텍스처 바이트는 큰 숫자 배열 대신 base64로 한 번 전송해요. 교체/장면 종료/창 종료에 자원을 해제하며 정상 프레임에서 이미지나 위치 버퍼를 읽어오지 않아요.
- 기존 GPU Device·ParticleRenderer의 화면/깊이/스왑체인과 프레임 상수 버퍼 3개를 재사용해요. GPU 시간은 timestamp/disjoint 3슬롯에서 `DONOTFLUSH`로 지난 결과만 조회해요. 준비되지 않으면 대기 루프를 돌지 않아요.

## C++와 AI 편집

게임 코드는 기존 `HBEngine/Game.hpp`의 Scene·Materials·Input 함수를 계속 사용해요. 장면의 렌더러를 바꾸려고 게임의 이동이나 입력 함수를 DirectX 호출로 다시 작성하지 않아요.

엔진 쪽 직접 렌더 API는 `HBEngine/SceneRender.hpp`예요. 기존 창의 HWND를 빌릴 수 있고, 생략하면 화면 없는 타깃을 만들어요. 창의 생성/종료는 호출자가 맡아요.

```cpp
hb::gpu::Device device;
hb::gpu::SceneRenderer view(device, width, height, hwnd);
auto mesh = view.createMesh(vertices, indices);
hb::gpu::SceneMaterial material;
material.color = {1, .3f, .1f, 1};
view.begin(frame);
view.draw(mesh, world, normalMatrix, material);
view.present(0);
```

AI는 기존 `build.profile`의 revision·dryRun·저장 계약으로 `windowsRenderer: "d3d11"`을 지정해요. 별도의 장면/머테리얼 형식을 만들지 않았어요. `engineSchema().gameRendering.windowsBuild`에 지원 범위·오류 동작·SDK·자원/측정 계약을 공개해요. `gpuTimeMs`는 완료된 GPU 드로우 구간이며 CPU 로직·브릿지·HUD·Present 시간이나 전체 게임 프레임 시간이 아니에요. 처음에는 값이 없을 수 있어요.

## 확인한 범위

`native-scene-RCQyBT`의 실제 D3D11 검사에서 깊이·텍스처·독립 UV·Direct/Point/Spot/Hemisphere 조명·높이 안개·뷰포트 여백·scissor 픽셀이 통과했어요. 노드 54종을 실제 HLSL로 컴파일하고 그렸어요. 2,049 드로우 × 12프레임 동안 새 업로드와 자동 readback이 없었어요. 평균 4.20ms는 CPU 제출 시간이며 전체 FPS나 GPU 완료 시간의 성능 합격 수치가 아니에요.

`native-scene-window-kxEDl8`의 격리 Windows Game.exe에서 SVG 방향·HLSL 텍스처 픽셀·C++ 이동·물리 키 입력의 BP 이동·C++/BP 발광 값 변경·셰이더 재사용·한글 HUD·투명 WebView·화면 크기/픽셀 여백·텍스처 교체·반복 장면 전환·비동기 GPU 시간·정상 종료/서버 정리가 통과했어요. 잘못된 base64/바이트 수는 거절했어요. 네이티브 이미지와 WebView HUD 이미지는 따로 확인했으며, 두 화면을 합친 실제 모니터 픽셀 검사는 아니에요.

기존 2D/3D 웹 빌드 `web-export-n40BQH`에서 패키지 해시·하위 경로·실제 브라우저 화면/입력/저장 회귀가 통과했어요. Build profile·공용 머테리얼 자료형/Float uniform·기존 렌더 자원 검사도 통과했어요. 최종 파일 SHA와 구체적 결과는 [086 증거](research/NATIVE_SCENE_RENDERING_086.json)에 있어요.

## 이어서 구현할 네이티브 범위

이 D3D11 경로에는 아직 그림자·블룸·GI/라이트맵/반사/IBL, 코팅/투과, 스킨/인스턴스/모프, 큐브/배열/볼륨 텍스처, 게임 장면의 GPU 입자 어댑터, 2D 광원/마스크 셰이더를 연결하지 않았어요. 해당 geometry/texture/node shader는 오류로 알리고 숨은 렌더러 전환을 하지 않아요. 그림자/GI 패스도 실행하지 않아요. 이 범위는 기존 WebGL/WebGPU 전체에서 빠졌다는 뜻은 아니에요. C++ `drawParticles`는 기존 GPU 입자 렌더러를 재사용하지만 게임 VM의 입자 연결까지 끝낸 것은 아니에요.

다음 렌더링 작업은 그림자/후처리·환경광, 애니메이션/인스턴스와 입자·2D 광원의 같은 네이티브 실행 연결이에요. 이후 월드·물리·게임 시스템·편집/배포의 누적 세부 작업을 유지해요. 이 검사에서는 실제 게임 120/60fps, 모바일 기기, 장기 메모리/발열과 전체 엔진 기능을 합격 처리하지 않았어요.

## 이번에 확인한 공식 출처

Microsoft의 [D3DCompile](https://learn.microsoft.com/en-us/windows/win32/api/d3dcompiler/nf-d3dcompiler-d3dcompile)은 컴파일 결과와 오류를 별도 blob으로 받는 API예요. 구현은 system compiler의 `vs_5_0`/`ps_5_0`과 오류 메시지를 사용하며 외부 include는 허용하지 않아요.

[WebView2 배경](https://learn.microsoft.com/en-us/microsoft-edge/webview2/reference/win32/icorewebview2controller2?view=webview2-1.0.2849.39)의 투명 설정과 CSS 조건을 함께 적용했어요. [DXGI flip model](https://learn.microsoft.com/en-us/windows/win32/direct3ddxgi/for-best-performance--use-dxgi-flip-model)의 버퍼 수·출력 바인딩·HWND 혼용 조건은 기존 화면 렌더러와 대조했어요. 다른 API로 같은 백버퍼를 번갈아 그리는 구조를 추가하지 않았어요.

[GPU query](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/ne-d3d11-d3d11_query), [GetData](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/nf-d3d11-id3d11devicecontext-getdata), [DONOTFLUSH](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/ne-d3d11-d3d11_async_getdata_flag)를 읽고 timestamp 신뢰성/빈도·비동기 결과·반복 대기의 위험을 반영했어요. [샘플러 슬롯 상수](https://microsoft.github.io/windows-docs-rs/doc/windows/Win32/Graphics/Direct3D11/constant.D3D11_COMMONSHADER_SAMPLER_SLOT_COUNT.html)와 실제 SDK 정의의 16개 한도를 검사해요. 오브젝트 500/1,000개 제한을 추가한 것은 아니에요.

출처 7개는 위 페이지/지정 구간을 읽은 기록과 원문 SHA를 남겼어요. Windows 전체 API나 Unreal·Unity 전체 corpus의 독립 검증 완료로 승격하지 않았어요.
