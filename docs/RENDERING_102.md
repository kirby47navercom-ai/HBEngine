# 102 — 광선 교차 정밀도·경계 감쇠·셰이더 반복문

화면 반사와 간접광의 깊이 교차 구간을 다시 나눠 계산해요. 적은 광선 단계에서 얇은 표면을 지나치던 경우, 교차 정밀 단계를 켜면 구간 안의 표면을 찾을 수 있어요. 화면 밖·깊이 불일치·반대 법선은 기존 환경/프로브 결과를 유지해요.

후처리 컴포넌트의 `광선 교차 정밀 단계`는 0–8, `광선 화면 경계 감쇠`는 0–0.5예요. 정밀 단계 0은 기존 거친 교차 경로이고 경계 감쇠 0은 가장자리의 추가 감쇠를 제거해요. 기본값은 4와 0.08이며, 화면 반사/GI 자체는 계속 기본 비활성이에요.

```cpp
hb::Components::SetFloat(post, "PostProcessVolume", "screenRayRefineSteps", 8);
hb::Components::SetFloat(post, "PostProcessVolume", "screenRayEdgeFade", 0.12f);
```

속성 편집·Components Float 블루프린트·C++·원자적 AI 패치는 같은 자료형/범위 검증을 사용해요. `ray` 공간 혼합 그룹을 추가했고 기존 `reflection` 오버라이드는 광선 설정도 계속 혼합해요. `indirect` 오버라이드도 이를 사용할 수 있으며 반사와 간접광을 같이 선택해도 가중치를 두 번 적용하지 않아요.

## 구현과 비용

GLSL과 생성 HLSL, WebGPU TSL 모두 기존 깊이/색/법선 버퍼를 사용해요. 깊이 앞→뒤 교차 후보를 발견했을 때 앞선 구간을 최대 8번 나누고, 최종 깊이 차이가 허용 두께 안에 있을 때만 채택해요. 경계 감쇠와 거리 감쇠로 기존 결과에 혼합해요. 깊이 불연속의 화면 실루엣을 실제 표면 교차로 잘못 채택하지 않도록 최종 두께 검사를 유지해요.

추가 텍스처·상수 버퍼·자동 CPU GPU 읽기는 없어요. 이미 쓰던 indirect 상수의 두 슬롯을 사용해요. 정밀 단계가 많을수록 후보 교차의 깊이 읽기가 늘어요. 최악의 논리 상한은 광선당 64×(1+8)회 깊이 확인이며, 반사 1개와 간접광 4개를 모두 켜면 그 비용도 늘어요. Hierarchical Z나 픽셀 DDA를 구현한 기록은 아니에요.

HLSL의 광선·정밀·간접광 반복에는 `[loop]`를 사용해 긴 반복문을 대량의 명령으로 펼치지 않게 해요. WebGPU에는 광선/정밀/이웃 X·Y 반복 변수에 서로 다른 이름을 부여했어요. 중첩 함수 안에서 같은 `i` 이름이 간접광 방향을 바꾸던 문제와 TAA의 이웃 X·Y가 같은 좌표로 계산되던 문제를 고쳤어요.

검사용 화면 캡처는 블루프린트/C++로 메시가 바뀐 뒤 기존 메시 준비 Promise를 기다려요. 아직 완성되지 않은 메시를 캡처해 모션 설정 결과를 오판하던 경쟁을 없앴어요. 게임 규칙이나 사용자 장면 위치를 변경하지 않아요.

## 참고 범위와 검증

[Unity HDRP 17.0의 SSR 설명](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.0/manual/Override-Screen-Space-Reflection.html)의 자체 본문과 [속성 표](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.0/manual/reference-screen-space-reflection.html)의 경계 감쇠·두께·단계·혼합 부분을 읽었어요. 연결된 전체 API와 모든 문서를 읽었다는 뜻은 아니에요. [Unity의 공개 SSR 셰이더](https://github.com/Unity-Technologies/Graphics/blob/master/com.unity.postprocessing/PostProcessing/Shaders/Builtins/ScreenSpaceReflections.hlsl)는 투영·DDA·깊이 교차 구간만 대조했어요. HB의 구간 분할은 기존 HB 광선 함수의 확장이며 해당 코드를 복사하지 않았어요.

[Unreal SSR 설명](https://dev.epicgames.com/documentation/en-us/unreal-engine/screen-space-reflections-in-unreal-engine)의 자체 본문에서 강도·품질·거칠기 설정을 확인했어요. [Microsoft 반복문 설명](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-for)의 컴파일 속성 부분도 확인했어요. 정확한 부분 읽기와 원본 SHA는 기계 기록에 남겨요.

얇은 깊이 교차를 놓치는 낮은 단계 장면과 교차를 회복하는 높은 정밀 단계 장면, 경계 감쇠, 간접광, 실제 C++·K 키 블루프린트 전환이 네이티브·WebGPU·WebGL2 Windows 실행기에서 통과했어요. 앞선 098–101, 네이티브 전체 60종 머테리얼/2D/스킨/모프/그림자/입자/프로브 회귀도 함께 통과했어요. 초기 90초 전체 네이티브 제한 시간은 충분하지 않아 최종 게이트는 120초 제한을 사용했어요. 이 변경과 `[loop]` 추가를 전체 게임의 프레임 성능 개선 증거로 해석하지 않아요. 장면 도형의 바닥 기준점을 반영해 교차 후보가 존재하도록 검사 장면도 보정했어요. 검사 경로·원본 SHA·실패 이력과 최종 결과는 아래 기계 기록에 남겼어요.

[검증 기록](research/RENDERING_102.json)과 [설치 영수증](research/USER_INSTALL_102.json)을 참고하세요. 화면 깊이에 없는 물체, Hi-Z/광선 가속 구조·광학적으로 정확한 GI·추가 고급 셰이딩·앞선 이전 포즈 한계는 남아 있어요. 실제 휴대폰·전체 게임 FPS/VRAM·장시간 스트레스 검증으로 해석할 수 없어요.
