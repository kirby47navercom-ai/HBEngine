# 098 — 화면 밖·중첩 굴절, 추가 셰이딩, 후처리와 다중 바운스 GI

2026-10-12. Windows DirectX 11, WebGL2, WebGPU의 공용 제작 경로에 네 렌더링 묶음을 연결했어요. 기존 머테리얼 그래프·속성 묶음·함수·레이어·인스턴스, 컴포넌트 속성, C++·블루프린트·AI 문서 패치를 재사용해요. 장면 파일을 새 형식으로 옮길 필요가 없고 새 셰이딩 가중치는 기본 0, 프로브 반사 횟수는 기본 1이에요.

## 제작과 실행

| 항목 | 사용할 입력과 동작 |
| --- | --- |
| 중첩 유리 | 기존 `Transmission`, `Thickness`, `IOR`, `Roughness`, 흡수·분산 입력을 사용해요. 투과 표면을 뒤에서 앞으로 그리고 각 표면 직전의 HDR 색·깊이를 복사해 앞쪽 유리가 뒤쪽 유리 결과를 굴절시켜요. |
| 화면 밖 굴절 | `ReflectionProbe`의 크기·캡처 위치·박스 투영으로 보이지 않는 주변을 캡처해요. 굴절 UV가 화면을 벗어나거나 캡처 깊이가 진입점보다 앞이면 프로브 방향 샘플로 전환해요. 프로브가 없으면 원래 화면 위치의 색을 사용해요. |
| 천 | Surface의 `Sheen`, `Sheen Color`, `Sheen Roughness`. `Cloth` 템플릿은 일반 파라미터와 Surface 노드를 만들어요. |
| 결 방향 금속 | `Anisotropy`, `Anisotropy Rotation`과 기존 노멀·거칠기. 회전은 라디안이에요. `Brushed Metal` 템플릿을 사용할 수 있어요. |
| 얇은 막 | `Iridescence`, `Iridescence IOR`, `Iridescence Thickness`(nm). `Thin Film` 템플릿을 사용할 수 있어요. |
| 반사 제어 | `Specular Intensity`, `Specular Color`. 색상 배열과 C++ 벡터는 선형 RGB예요. |
| 색 보정 | `PostProcessVolume`의 색 보정 활성화, 노출(EV), 대비, 채도, 색상 이동(도), 색 필터. 블룸 없이도 작동해요. |
| 화면 효과 | 같은 컴포넌트의 비네트 중심·세기·부드러움·색·원형, 색수차, 필름 그레인. 기존 블룸과 조합할 수 있어요. |
| GI | `ReflectionProbe`의 간접광 강도와 간접광 반사 횟수(`bounces`, 정수 1~8). 첫 바운스는 직접 장면을 캡처하고 다음 바운스는 직전 필터링 결과의 간접광을 사용해요. 한 반복의 모든 캡처를 끝낸 뒤 필터 결과를 교체해 서로 다른 프로브가 같은 반복의 새 결과를 먼저 읽지 않아요. |

Surface의 기존 16개 핀 순서를 유지하고 새 10개 입력을 뒤에 붙였어요. 파라미터 이름으로 연결한 입력은 그 이름으로 수정하고, 연결되지 않은 입력은 표면 별칭으로 수정해요. 기존 연결을 무시해 값을 덮어쓰지 않아요.

```cpp
hb::Materials::SetFloat(actor, "Sheen", 1.f);
hb::Materials::SetVector(actor, "SheenColor", hb::Vec3{1.f, .1f, .1f});
hb::Materials::SetFloat(actor, "AnisotropyRotation", 1.570796f);
hb::Materials::SetFloat(actor, "IridescenceThickness", 400.f);
hb::Components::SetBool(post, "PostProcessVolume", "colorGradingEnabled", true);
hb::Components::SetFloat(post, "PostProcessVolume", "postExposure", 1.f);
hb::Components::SetFloat(probe, "ReflectionProbe", "bounces", 3.f);
hb::ReflectionProbes::SetDiffuseIntensity(probe, 1.f);
hb::ReflectionProbes::Refresh(probe);
```

대응 블루프린트는 기존 `materialFloat`, `materialVector`, `materialColor`, `componentSetFloat`, `componentSetBool`, `componentSetColor`, `reflectionProbeDiffuse`, `reflectionProbeRefresh`예요. AI는 같은 에셋 JSON·스키마·원자적 패치를 사용해요. 사람이 보지 못하는 전용 값이나 별도 실행 함수 목록을 만들지 않았어요.

## 구현과 비용

DirectX 굴절 캡처는 HDR RGBA16F+mip와 R32 깊이, 브라우저도 HDR+mip와 깊이를 사용해요. 표면마다 복사하지만 동일 크기의 자원은 재사용해요. 크기 변경·장면 교체·렌더러 종료 때 해제해요. 프레임별 자동 CPU 픽셀 읽기를 추가하지 않았어요. 중첩 유리가 많을수록 화면 복사·mip 생성·투명 오버드로 비용이 늘어요.

WebGPU r180의 기본 mip 생성은 아직 제출하지 않은 프레임 색 복사보다 먼저 별도 큐에 제출됐어요. `gpu-refraction-copy.js`가 현재 프레임 인코더 안에 복사 다음 mip 패스를 기록하도록 보정해 첫 프레임과 현재 유리 층을 샘플링하게 했어요. r180의 private pass 유틸리티에 묶인 코드라 Three.js를 올릴 때 실제 창 검사를 다시 해야 해요. 의존성 설치 파일은 수정하지 않았어요.

새 네이티브 셰이딩 상수는 기존 CB3에 64바이트를 더해요. 가중치 0이면 해당 추가 계산을 건너뛰어요. GL/TSL/HLSL 파라미터 변경은 기존 typed uniform·structured buffer를 수정해요. WebGPU r180의 `setupSpecular`가 선언된 새 specular 노드 입력을 사용하지 않아 공용 입력을 실제 F0/F90 계산에 연결했어요. 프로브용 머테리얼 복제도 이 계산과 굴절 자원 소유권을 유지해요.

후처리는 HDR 색 보정·효과 뒤에 톤 매핑을 한 번 적용해요. 새 효과는 기본 비활성이고 블룸 pass는 블룸을 쓸 때만 생성해요. WebGPU는 기본 HDR 출력 경로를 사용하며 색수차가 필요할 때만 추가 샘플링 타깃을 만들어요. DirectX의 후처리만 켠 장면에서는 블룸 compute dispatch가 0이에요.

프로브는 바운스마다 6면 캡처·필터링을 해요. DirectX는 기존 GPU GGX 필터·SH9, 브라우저는 PMREM을 재사용해요. 브라우저는 입력 타깃을 읽으면서 덮어쓰지 않도록 다음 반복 타깃을 따로 만들고 전체 캡처 완료 후 교체·해제해요. `once`/`manual`/`onChange`와 범위·갱신 번호 키를 유지하고 정적 프레임에서 다시 캡처하지 않아요. 프로브 캡처에는 불투명 3D 메시를 사용해요.

## 묶음 검증

결과·소스 SHA·읽은 범위·실패와 보정 기록은 [기계 증거](research/RENDERING_098.json)에 있어요. 사용자 원본 게임을 수정하지 않은 임시 프로젝트와 숨긴 실행 창을 사용했어요.

- `check-rendering-098`, `check-material-volume`, `check-material-uniforms`, `check-material-workflow`, `check-engine-integration`, API 생성 대조 통과. 세 머테리얼 백엔드의 typed 값, 범위·NaN·정수 거부, 프리셋, clone·다중 슬롯, 반복 변경의 프로그램 재사용을 확인했어요.
- 전체 네이티브 GPU 검사: HLSL 60종 노드, 새 sheen·이방성 회전·막 두께·후처리 픽셀, 두 번째 바운스의 녹색 간접광, 블룸 없는 후처리, 기존 2D 마스크·조명·파티클·변형·인스턴싱·그림자·프로브 회귀와 unavailable guard 통과.
- 굴절 집중 검사: 전경 깊이 거부, IOR·두께·거칠기 mip·흡수·분산, HDR·crop/scissor·재사용·크기 변경·해제 통과.
- 실제 DirectX/WebGL2/WebGPU 실행기: C++ 호출·T/V키 블루프린트, 두 유리 층에서 뒤쪽 층을 숨긴 비교, 화면 밖 굴절을 끈 비교, 셰이딩 값 변경, 후처리 EV·효과 변경, 3바운스 캡처와 정적 재사용 통과. 자바스크립트/console·GPU 오류 0, 종료 코드 0, 검사 서버 종료를 확인했어요.

화면 밖 시험은 직접 specular와 diffuse GI를 끈 유리와 화면 밖 양쪽의 발광 메시를 사용해 투과 켜기/끄기를 비교해요. 백엔드 사이 노멀/TBN 방향이나 픽셀이 완전히 동일하다고 주장하지 않아요. GI 두 번째 바운스의 에너지 전달은 네이티브 GPU 시험에서 따로 검증하고, 세 실행기의 통합 시험은 3회 캡처·색 결과·정적 재사용을 검증해요.

## 적용 범위

중첩 굴절은 정렬한 래스터 표면과 화면 깊이·캡처 프로브 방식이에요. 실제 형상에 대한 재귀 ray tracing·교차 투명체 해석·자동 뒷면 두께·유색 투과 그림자는 별도 작업이에요. 새 천·금속·박막 모델은 Charlie/Neubelt, 이방성 GGX/Smith, RGB 세 파장 박막 근사이며 Unreal의 Substrate·모발·눈·SSS 전체 모델과 같지는 않아요.

후처리는 우선순위가 가장 높은 활성 컴포넌트를 사용해요. 공간 볼륨 혼합, LUT·자동 노출·DOF·모션 블러·TAA·SSAO는 이 묶음의 구현이 아니에요. 색상 이동은 선형 RGB의 축 회전 근사이고, DirectX 색수차는 장면 RGB를 이동한 뒤 이동하지 않은 glow를 합쳐 브라우저의 합성 결과 샘플링과 차이가 있어요.

GI는 갱신하는 HDR 프로브의 다중 바운스 캡처 간접광이에요. Lumen·DDGI·APV·라이트맵 베이커를 구현했다는 뜻이 아니에요. DirectX는 두 프로브 혼합, 브라우저는 선택한 한 프로브를 사용해요. FPS·전체 게임 메모리·장시간 실행·실제 휴대폰 성능 합격은 이 검사에서 측정하지 않았어요.

Unreal·Unity 자체 본문과 Three r180 지정 소스 구역, Filament 공식 설명의 지정 부분을 읽었고 원문 SHA를 저장했어요. HDRP10.5 보조 자료는 과거 버전으로 구분해요. 원문을 저장한 사실을 전체 본문·연결 API를 모두 읽었다는 증거로 쓰지 않아요. 전체 엔진 문서 corpus/API·누적 기능 완료 상태는 별도 기록으로 유지해요.
