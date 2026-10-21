# 반사 영향 영역과 투영 영역

반사 프로브의 **영향 영역**은 어떤 표면에 반사를 적용하고 경계에서 얼마나 섞을지 결정해요. **투영 프록시**는 반사 방향을 방 모양에 맞춰 보정해요. 캡처 위치, 영향 영역, 투영 영역은 서로 따로 유지해요.

오브젝트 만들기에서 **Reflection Proxy Volume**을 배치하거나 기존 오브젝트에 같은 컴포넌트를 추가해요. 반사 프로브에서 **영역 투영**을 켜고 **영향 영역으로 투영**을 끈 뒤 **투영 프록시**와 컴포넌트를 선택해요. 여러 프로브가 같은 프록시를 참조할 수 있어요. 참조를 비우면 무한 영역으로 처리해요. 기존 프로젝트는 영향 영역을 그대로 투영에 사용해요.

- 상자는 오브젝트의 이동·회전·비균일/음수 크기와 로컬 중심·크기를 사용해요. 구의 반경은 월드 단위예요. 무한 모양에는 크기·중심 입력을 표시하지 않아요.
- 유한 프록시와 프로브 모양은 일치해야 해요. C++/노드 할당은 불일치를 거절해요. 공유 프록시를 편집하다 모양이 달라지거나 참조가 없어짐·비활성화·특이 행렬이 생기면 렌더러는 무한 투영으로 처리해 장면을 유지해요.
- 독립 프록시에서는 광선의 가장 가까운 앞쪽 교차점을 사용해요. 기존 영향 영역 투영의 내부 출구 방식은 유지해요. 영역 투영을 끄면 방향을 보정하지 않아요.

```cpp
hb::ReflectionProbes::SetProxyVolume(probe, roomProxy);
hb::ReflectionProbes::SetProxyVolume(probe, nullptr); // 무한 투영
hb::ReflectionProbes::SetUseInfluenceVolume(probe, true);
```

선택 인수 `component`, `proxyComponent`는 컴포넌트 ID·이름·타입을 받아요. 블루프린트의 **반사 투영 프록시 지정**, **반사 영향 영역 투영 사용**도 같은 서비스를 사용해요. C++ 호출 직후 Components 읽기 캐시도 갱신해요. 오브젝트의 위치를 덮어쓰지 않아요.

AI는 기존 `document.read/patch`, revision·dryRun·Undo를 사용해요. `ReflectionProbe`의 `useInfluenceVolumeAsProxy`, `proxyVolume`(오브젝트 ID), `proxyComponent`와 `ReflectionProxyVolume`의 `volumeShape`, `size`, `offset`, `volumeRadius`가 저장되는 원본이에요. 별도 AI 전용 장면 형식은 없어요. 오브젝트 복제 시 참조도 기존 ID 재매핑을 따라요.

## 렌더링과 비용

CPU 수집은 장면을 한 번 순회해 공유 참조를 찾아요. 투영만 바꾸면 캡처 이미지와 아틀라스 배치·영향 영역 공간 트리는 재사용하고 메타데이터만 전송해요. 기본 모드는 브라우저→네이티브 JSON에 추가 배열을 보내지 않아요.

직접 네이티브 `ProbeSettings`는 208바이트, 아틀라스는 14 float4·224바이트예요. 예전 아틀라스 9 float4·144바이트에서 프로브당 80바이트가 늘었어요. 네이티브 3슬롯 상수 버퍼는 CPU 캐시와 GPU 저장공간 각각 720바이트가 늘어요. 버퍼 개수·렌더 타깃·작업자·타이머는 추가하지 않아요. 낮은 수준의 SDK 사용자는 새 헤더로 다시 컴파일해야 해요.

공용 SDK의 `setProbeInfluenceProjection`, `setProbeInfiniteProjection`, `setProbeProjectionBox`, `setProbeProjectionSphere`는 잘못된 입력을 원자적으로 거절해요. `probeProjectionUsable`은 렌더 제출도 검사해요. WebGL·WebGPU·강제 GL과 DirectX의 직접/아틀라스 경로를 함께 구현해요.

수학은 독립 THREE Ray/Box/Sphere 교차 결과와 대조해요. 수치 커널, 실제 물리 머테리얼 렌더, 네이티브 래스터, 편집기 조작, C++·노드 게임 실행은 서로 별도 증거예요. 정확한 결과·소스 해시는 후속 ENGINE_WORK/USER_INSTALL 기록에 남겨요. 큰 장면 FPS나 모든 반사 기능 완료를 뜻하지 않아요.

[Unity HDRP 17.0.4의 프록시 설명과 속성](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.0/manual/Reflection-Proxy-Volume.html)에서 영향/투영 분리, 공유 프록시, 모양 일치와 무한 영역을 참고했어요. 교차 수식·저장 형식·비용 처리는 HB 구현이에요. 면별·노멀 페이드, 라이트맵 혼합과 추가 후보 계층은 별도 원장에 유지해요.
