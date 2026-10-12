# 099 — 공간 후처리·LUT·자동 노출·심도·접촉 음영·FXAA

`PostProcessVolume`의 기존 속성 편집기와 컴포넌트 명령을 확장했어요. DirectX 11, WebGL2, WebGPU가 같은 장면 데이터를 받아요. 추가 효과는 기본 비활성이고 이전 장면을 변환할 필요가 없어요.

| 제작 설정 | 실행 동작 |
| --- | --- |
| 전체 공간, 상자·구, 중심·크기·반경 | 카메라의 월드 위치와 오브젝트의 월드 변환으로 적용 범위를 판정해요. 상자는 회전·크기를 반영하고 구는 가장 큰 월드 축 배율로 반경을 늘려요. |
| 혼합 가중치·경계 혼합 거리·우선순위 | 낮은 우선순위부터 적용하고 경계 밖에서 거리만큼 선형 혼합해요. 같은 우선순위는 ID 순서예요. 비활성·숨김·풀 대기 오브젝트는 제외해요. |
| 효과 오버라이드 | 빈 배열은 모든 효과, 지정 배열은 해당 그룹만 덮어요. `bloom`, `color`, `vignette`, `chromatic`, `grain`, `lookup`, `exposure`, `dof`, `ao`, `aa`를 사용해요. 숫자·색은 연속 혼합하고 LUT 이미지 선택은 전환해요. 두 LUT 이미지 사이의 교차 혼합은 없어요. |
| 색온도·색조·암부·감마·명부 | 기존 EV·대비·채도·색상·필터에 RGB 균형과 lift/gamma/gain을 더해요. 색온도는 -100~100의 RGB 보정이며 물리적인 Kelvin 카메라 캘리브레이션은 아니에요. |
| LUT 이미지·세기 | N²×N 이미지의 가로 블루 슬라이스, 슬라이스 안 R 가로·G 세로를 삼선형 샘플링해요. N은 2~64, sRGB 디코딩·mip 없이 선형 필터를 사용해요. 톤 매핑 후, 화면 sRGB 출력 전에 적용해요. 실행 중 교체·경로 변경·해제를 지원해요. |
| 자동 노출·보정 EV 범위·기준 휘도·두 적응 속도 | 블룸 합성 전 HDR 화면 8×8 위치의 로그 휘도를 GPU에서 평균 내고 보정 EV를 제한해요. 이전 EV에서 `1-exp(-speed*dt)`로 적응해요. 처음 활성화·화면 크기/소유자 변경·시간 역행 때 기록을 초기화해요. 밝아지는/어두워지는 속도는 보정 EV가 증가/감소하는 방향이에요. |
| 심도·초점 거리·범위·최대 흐림 픽셀·세기 | 원근/직교 깊이를 선형화하고 12개의 원형 샘플을 혼합해요. 뒤쪽 표면의 흐림에 더 가까운 전경을 섞지 않아요. 초점 거리·범위는 장면 단위, 최대 반경은 화면 픽셀이에요. |
| 화면 공간 접촉 음영·거리·편향·세기 | 주변 8개 깊이를 읽어 가까운 표면의 접촉 음영을 합성해요. 원근·직교 투영의 화면 크기를 반영해요. 화면에 없는 형상이나 투명 표면의 깊이는 복원하지 않아요. |
| FXAA·윤곽 보정 세기 | 표시 색상의 윤곽을 샘플링해 계단 현상을 줄여요. GL/GPU는 설치된 Three r180 FXAA를 재사용하고 네이티브는 별도 표시 색상 패스를 사용해요. 세기 0은 원본과 같아요. |

```cpp
hb::Components::SetBool(post, "PostProcessVolume", "unbound", false);
hb::Components::SetVector(post, "PostProcessVolume", "volumeSize", {20, 8, 20});
hb::Components::SetFloat(post, "PostProcessVolume", "blendDistance", 4);
hb::Components::Set(post, "PostProcessVolume", "postOverrides", hb::Json::array({"color", "dof"}));
hb::Components::SetBool(post, "PostProcessVolume", "colorGradingEnabled", true);
hb::Components::SetVector(post, "PostProcessVolume", "gain", {1.2f, 1.f, 1.f});
hb::Components::SetString(post, "PostProcessVolume", "colorLookup", "Assets/LUT.png");
hb::Components::SetBool(post, "PostProcessVolume", "autoExposureEnabled", true);
hb::Components::SetBool(post, "PostProcessVolume", "dofEnabled", true);
hb::Components::SetFloat(post, "PostProcessVolume", "focusDistance", 12);
hb::Components::SetString(post, "PostProcessVolume", "antiAliasing", "fxaa");
```

블루프린트는 대응 `componentSetBool/Float/Vector/String/Json` 노드를 사용해요. AI도 동일 속성 스키마·에셋 참조·원자적 문서 패치를 사용해요. 런타임 에셋 교체 명령은 시각 자원이 준비될 때까지 기다리도록 편집기·실행기 업데이트 반환값을 연결했어요. 잘못된 LUT 크기·EV 범위·중복 그룹·NaN·경로는 거부해요. 네이티브도 LUT 자원의 소유 장치·차원·전달된 크기를 확인해요.

## 자원과 계산 비용

효과를 모두 끄면 후처리 파이프라인을 해제해요. 기존 투과 표면이 HDR을 요구하는 경우는 유지해요. 블룸을 끈 후처리는 블룸 mip/blur dispatch를 만들지 않아요.

자동 노출 기록은 뷰포트마다 RGBA16F 1×1 두 장(16바이트)을 사용해요. DirectX는 한 스레드 compute dispatch, GL/GPU는 1×1 GPU 패스로 처리해요. 프레임별 CPU 픽셀/휘도 읽기는 없어요. 심도·접촉 음영은 기존 HDR 색과 깊이를 재사용해요. GPU에서 블룸 합성 결과의 임의 위치 샘플링이 필요하면 HDR RTT가 추가돼요. FXAA는 별도 표시 색상 타깃이 필요하며 네이티브는 4바이트/픽셀 타깃을 활성화할 때만 만들어요. 같은 크기는 재사용하고 효과 종료·장면 교체·렌더러 종료 때 해제해요.

네이티브와 GL의 심도·색 보정·LUT 수식은 `post-processing.js`에서 `ScreenPost.hpp`로 생성해 드리프트를 줄여요. `generate-screen-post --check`와 실제 셰이더 컴파일로 대조해요. TSL은 같은 수식의 노드 구현이에요. 백엔드 톤 매핑과 FXAA 구현에 따른 픽셀 차이는 남아 있어요.

## 묶음 검증과 근거

[기계 기록](research/RENDERING_099.json)에 소스 SHA, 실제 실행 증거, 실패/보정과 검사 범위를 남겨요. 임시 프로젝트·숨긴 Windows 실행 창에서 C++ 호출, H키 블루프린트, LUT 교체·항등 LUT·세기 0, 자동 노출 적응, 심도 켜기/끄기, 음영 픽셀과 FXAA 윤곽 변화·세기 0을 확인해요. 기존 098의 중첩/화면 밖 굴절·추가 셰이딩·GI와 함께 검사해요. 사용자 게임·프로필·실행 중인 창을 검사 대상으로 쓰지 않아요.

공간 혼합은 [Unity Volume](https://docs.unity3d.com/6000.0/Documentation/Manual/urp/Volumes.html)과 [Unreal Post Process](https://dev.epicgames.com/documentation/en-us/unreal-engine/post-process-effects-in-unreal-engine), 심도 제작 설정은 [Unity DOF](https://docs.unity3d.com/6000.0/Documentation/Manual/urp/depth-of-field-volume-override-reference.html), LUT는 [Unity Color Lookup](https://docs.unity3d.com/6000.0/Documentation/Manual/urp/post-processing-color-lookup.html), Basic 로그 휘도/적응은 [Unreal Auto Exposure](https://dev.epicgames.com/documentation/en-us/unreal-engine/auto-exposure-in-unreal-engine)의 지정 읽기 범위를 참고했어요. 본문·구역·API 미독 범위는 원문 저장 사실과 구분해요.

## 남아 있는 렌더링 범위

접촉 음영은 최종 색을 어둡게 하는 깊이 기반 근사예요. 간접광만 분리해서 적용하는 SSAO/GTAO, 노멀 G-buffer, 화면 밖 가림은 별도예요. 심도는 물리 렌즈·조리개/보케·투명체 심도가 아니고, 자동 노출은 64빈 히스토그램·노출 마스크·EV100 물리 카메라가 아니에요.

이 기록은 이번 묶음에 해당해요. TAA/시간 재투영·오브젝트 속도와 모션 블러·SSR/SSGI, SSS/피부·모발·눈, 유색 투과 그림자·형상 ray tracing, Lumen/DDGI/APV·라이트맵 베이킹은 완료로 바꾸지 않아요. 실제 휴대폰·전체 게임 FPS/RAM도 이번 픽셀 검사의 합격 범위에 포함하지 않아요.
