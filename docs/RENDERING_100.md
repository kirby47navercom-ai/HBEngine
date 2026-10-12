# 100 — 시간 재투영·카메라 모션 블러·화면 반사·간접광

Post Process Volume의 제작 속성, 공간 혼합, C++·블루프린트·AI 명령을 기존 경로로 연결했어요. DirectX 11·WebGL2·WebGPU에서 실제 장면 색·깊이와 머테리얼 표면 정보를 사용해요. 설치 결과와 검사 파일 SHA는 [기계 기록](research/RENDERING_100.json)과 [설치 영수증](research/USER_INSTALL_100.json)에 남겨요.

## 제작과 실행

| 속성 | 동작 |
| --- | --- |
| `antiAliasing = taa` | Halton 미세 투영 이동, 이전 view-projection으로 재투영, 로그 깊이 비교, 현재 3×3 색 범위로 이전 색 제한, 가중 이력 혼합 |
| `temporalFeedback`, `aaStrength` | 이전 색 가중치와 효과 혼합, 각각 최대 .95 / 1 |
| `historyVersion` | C++·노드·AI에서 값을 바꾸면 이력 초기화 |
| `motionBlurEnabled`, `motionBlurStrength`, `motionBlurClamp`, `motionBlurSamples` | 카메라 이동 기반, 화면 비율 최대 .2, 2–16 샘플, 깊이가 다른 전경은 섞지 않음. TAA 투영 미세 이동은 속도에서 제외 |
| `ssrEnabled`, `ssrStrength`, `ssrMaxRoughness` | 실제 불투명 표면의 노멀·거칠기·색·금속성으로 반사 광선, Fresnel/거칠기/화면 가장자리/광선 거리 감쇠 |
| `ssgiEnabled`, `ssgiStrength` | 표면 법선 반구의 네 광선으로 화면 색을 수집하고 기본색·비금속 비율로 확산 간접광 추가 |
| `screenRayDistance`, `screenRayThickness`, `screenRaySteps` | 월드 거리·허용 두께·8–64 단계. 화면 밖/미검출 광선은 기존 결과 유지 |

새 효과는 기본으로 꺼져 있어요. 관련 입력은 해당 효과를 켰을 때 보여요. `postOverrides`의 `aa`, `motion`, `reflection`, `indirect`가 공간/우선순위/가중치 혼합에 참여해요. 정수 샘플·단계·이력 버전은 혼합 뒤 반올림해요. 기존 프로젝트 필드는 그대로 읽고 새 필드에는 기본값을 사용해요.

```cpp
hb::Components::SetString(post, "PostProcessVolume", "antiAliasing", "taa");
hb::Components::SetBool(post, "PostProcessVolume", "motionBlurEnabled", true);
hb::Components::SetBool(post, "PostProcessVolume", "ssrEnabled", true);
hb::Components::SetBool(post, "PostProcessVolume", "ssgiEnabled", true);
hb::Components::SetFloat(post, "PostProcessVolume", "screenRaySteps", 24);
hb::Components::SetFloat(post, "PostProcessVolume", "historyVersion", 1);
```

동일한 Components 노드와 AI의 컴포넌트 원자적 패치를 사용해요. C++ float 경계가 JSON의 경계를 아주 조금 넘는 경우, 정확히 `Math.fround(경계)`인 값만 정상 경계로 맞춰요. 임의의 범위 초과 값은 계속 거부해요.

## 자원과 처리 순서

카메라·장면·크기·투영·이력 버전 변경, 시간 역행/250ms 초과 공백, 급격한 이동/회전, TAA 모드 변경 또는 실패한 프레임에서 이력을 버려요. 카메라의 제작 투영 행렬은 성공·실패 모두 복구해요. 네이티브 하위 뷰포트 위치 변경도 초기화해요.

원본 HDR/깊이 → 화면 조명·모션·시간 혼합 → 블룸 → 기존 색 보정/심도/음영 → 표시 변환/LUT/FXAA 순서예요. 자동 노출은 기존과 같이 블룸 이전 원본을 측정해요. 불투명 표면 정보 두 장은 SSR/SSGI에만 만들어요. 하늘·2D·투명 표면에는 반사 수신 표면 정보가 없어요. 표시 alpha는 원본에서 유지하고 이력 alpha에는 로그 깊이를 저장해요.

DirectX의 새 resolve는 Compute Shader이며, 상수 버퍼 세 장을 재사용해요. 프레임 크기/모드가 유지되면 텍스처를 다시 만들지 않으며, 끄기·장면 해제에서 프레임 자원을 정리해요. 자동 CPU 읽기 회수는 추가하지 않았어요. GL은 장면 원본을 교환 버퍼와 분리하고 모든 전체 화면 패스의 깊이 검사를 꺼요. WebGPU는 MRT 구성을 셰이더 캐시 키에 포함해 단일 출력 셰이더 재사용을 막아요.

이력 두 장은 16바이트/픽셀, 네이티브 표면 정보 두 장은 추가 16바이트/픽셀이에요. 네이티브 기본 HDR 8바이트/픽셀과 기존 깊이/블룸 비용은 별도예요. WebGL은 원본 한 장, 교환 두 장, 이력 두 장과 필요한 표면/깊이를 소유해요. 모든 효과를 켜거나 높은 광선 단계를 설정하면 GPU 비용이 커져요. 기본으로 실행하거나 모바일 기본 설정에 강제로 넣지 않아요.

## 검증

- CPU: 투영 복구/재투영 왕복, 카메라·크기·시간·모드·이력 초기화, 기본 비활성, 공간 오버라이드, 수치/float 경계·정수 거부, 기존 API·AI 원자적 패치·머테리얼 검사.
- DirectX GPU: 실제 재투영·카메라 모션 픽셀, 첫 프레임/리셋 거부, 노멀/금속 반사·거칠기 컷오프·확산 간접광, 품질 범위/이력 비용/끄기·해제. 전체 머테리얼 60종, 2D·스킨·인스턴스 2049·그림자·파티클·프로브와 098/099 회귀를 함께 검사했어요.
- 실제 숨긴 Windows 실행기 세 종류: 사용자 C++ 속성, 실제 H키 블루프린트, 화면 이동 두 프레임의 색 경계, SSR/SSGI 픽셀과 켜기·끄기, 기존 굴절/GI/후처리, 오류 0·정상 종료·검사 서버 종료. GL 최종 검사에는 경계에서 떨어진 색 유지도 포함해요. 다른 두 렌더러의 해당 색 유지 추가 assert는 최종 GL 검사와 별도 범위로 기록해요.
- 사용자 게임/프로필은 실행 대상으로 사용하지 않았어요. 정상 앱을 열거나 기존 창을 재시작하지 않고 새 고정 설치 버전과 바로가기/연결만 전환해요.

실패 기록도 보존해요: GPU 소유 접근 선언, HLSL 마커 삽입 위치, GI 광선에 맞지 않던 검사 배치, C++ float .2 경계, 무늬가 없던 모션 검사, WebGPU MRT 캐시, 네이티브 이전 프레임 통계 조회, GL 원본 버퍼 재사용에 의한 검은 픽셀. 초기의 GL 전체 행 색 변화는 모션 성공 증거로 채택하지 않아요.

## 확인한 출처와 한계

[Unity 6000.0 AA](https://docs.unity3d.com/6000.0/Documentation/Manual/urp/anti-aliasing.html)의 자체 본문121–203을 읽었어요. TAA 이력/이동 벡터·잔상과 모바일 FXAA 선택을 구분해요. [모션 블러](https://docs.unity3d.com/6000.0/Documentation/Manual/urp/Post-Processing-Motion-Blur.html) 자체 본문122–177은 소개의 camera-only 문장과 표의 camera-and-objects 항목이 함께 있어요. 이를 HB의 오브젝트 속도 구현 근거로 사용하지 않아요.

[Unreal SSR](https://dev.epicgames.com/documentation/en-us/unreal-engine/screen-space-reflections-in-unreal-engine)의 추출된 자체 본문0–11과 [보조 4.27 SSGI](https://dev.epicgames.com/documentation/unreal-engine/screen-space-global-illumination?application_version=4.27) 자체 본문0–54를 읽었어요. SSGI는 화면 조명의 보완 수단이며, 화면 밖·큰 가림 물체의 한계를 갖는다는 설계만 참고해요. 5.8 SSGI 주소는 도구가 제목만 반환해 자체 본문 미독이에요. 링크된 API·미디어·전체 문서와 구현 동등성은 확인하지 않았어요.

이번 속도/이력은 카메라 기반이에요. 이동 오브젝트·스킨·모프·인스턴스·파티클의 이전 포즈 속도는 남아 있어요. 같은 깊이에서 빠르게 이동하면 잔상이 생길 수 있어요. 광선은 고정 월드 단계이며 Hi-Z·교차점 이분 탐색·반사 cone mip·다중 bounce·투명 표면/G-buffer 전체는 구현하지 않았어요. 얇은 표면·거친 반사·가림 변화에 한계가 있어요. SSGI의 네 방향 수집은 물리적 에너지 적분이나 Lumen/DDGI/APV/베이킹을 대신하지 않아요. 피부·모발·눈/SSS·유색 투과 그림자·형상 ray tracing·물리 렌즈도 남아 있어요. 실제 휴대폰, 전체 게임 FPS/RAM, 전체 엔진·전체 corpus/API 완료는 이번 검사 범위에 포함하지 않아요.
