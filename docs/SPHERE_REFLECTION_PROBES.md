# 구형 반사 영역

Reflection Probe의 영향 영역을 구로 선택하고 반경을 지정해요. 반경은 월드 단위예요. 오브젝트 변환은 영역 중심 오프셋을 이동시키지만 구를 늘리지는 않아요. 상자는 기존처럼 크기와 오브젝트 변환을 사용해요. 선택한 모양에 필요한 크기 또는 반경만 속성에 보여요. 편집기에는 구의 세 원을 표시해요.

캡처 위치와 영향 영역 중심은 독립적이에요. 영역 투영을 켜면 표면에서 반사 방향으로 진행한 광선과 구가 만나는 위치를 구한 뒤 캡처 위치에서 그 교점을 바라보는 방향으로 큐브맵을 읽어요. 끄면 기존 방향을 그대로 사용해요. 안쪽 혼합 거리는 구 표면에서 중심 방향으로 측정해요. 기존 두 후보 순위·가중치·기본 환경의 남은 비율 정책은 유지해요.

```cpp
hb::ReflectionProbes::SetSphere(probe, 4.0f);
hb::ReflectionProbes::SetRadius(probe, 1.0f);
hb::ReflectionProbes::SetShape(probe, "box");
```

배치 메뉴의 구형 반사 프로브로 바로 만들 수 있어요. 같은 이름의 블루프린트 노드는 반사 구형 영역 지정·반사 영역 모양 지정·반사 영역 반경 지정이에요. SetSphere는 반경을 검증한 뒤 모양과 반경을 한 번에 갱신해요. 컴포넌트 JSON의 volumeShape와 volumeRadius도 같은 속성이에요. 같은 캡처가 계속 사용되는 모양·반경 변경은 큐브맵을 다시 캡처하지 않아요. 후보 순서가 바뀌어도 활성 캡처의 이미지 슬롯을 유지해요. 캡처 추가·제거·해상도 변경으로 실제 배치가 달라지면 이미지를 다시 배치할 수 있어요.

저수준 C++ 렌더 SDK는 setProbeSphereVolume(settings, worldCenter, radius, projection)을 사용해요. 캡처 원점인 settings.center는 별도로 설정해요. 구형 설정은 대칭 반경과 직교 단위 변환을 검증해요. 상자의 affine 변환을 구에 임의로 적용해 타원체로 만드는 설정은 받지 않아요. GPU에는 기존 9행·144바이트 레코드를 사용하며 이미지·패스·바인딩 슬롯을 추가하지 않아요. 브라우저 아틀라스의 faceScale.w와 native options.w는 투영 비트 0, 구 비트 1이에요. 브라우저 직접 바인딩 options.w는 활성 비트 0, 구 비트 1이에요.

검사와 설치 결과는 후속 ENGINE_WORK·USER_INSTALL 영수증을 확인해요. 검사 소스가 있다는 사실을 실행 성공으로 계산하지 않아요. CPU/GLSL/TSL/HLSL의 수식, 실제 아틀라스 이미지, C++·블루프린트 게임은 각각 대조해요. 우선 캡처가 뒤 캡처를 가리는 선택 기능은 [우선 캡처 덮어쓰기](PROBE_PRIORITY_BLEND.md)로 확장했어요. 독립 투영 프록시와 lightmap 혼합은 별도 잔여예요.

공식 참고 본문은 [Unreal Reflection Captures](https://dev.epicgames.com/documentation/en-us/unreal-engine/reflections-captures-in-unreal-engine), [Unity HDRP 17 Reflection Probe](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.0/manual/Reflection-Probe.html), [Unity Reflection Proxy Volume](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.0/manual/Reflection-Proxy-Volume.html)이에요. 두 엔진은 구와 상자의 영향 영역·투영을 설명하며 Unity는 독립 프록시도 구분해요. HB의 월드 단위 반경과 기존 두 후보 혼합 유지 여부는 이 엔진의 명시적인 설계 선택이에요. 이 구역을 읽고 구현한 사실을 두 엔진 전체 문서 분석 완료로 확대하지 않아요.
