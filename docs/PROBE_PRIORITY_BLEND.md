# 반사 우선 캡처 덮어쓰기

Reflection Probe의 **우선 캡처 덮어쓰기**를 켜면, 픽셀에서 선택된 첫 캡처의 경계 가중치만큼 뒤 캡처를 가려요. 우선순위가 같으면 작은 영향 영역을 먼저 사용하고, 같은 크기에는 안정적인 ID 순서를 사용해요. 기존 프로젝트의 기본값은 꺼짐이고 원래 정규화 혼합을 유지해요.

첫 가중치가 a, 두 번째가 b이면 켠 경우 두 번째를 b×(1−a)로 바꾸고 기존 정규화·환경 나머지 계산을 적용해요. 중심에서 a=1이면 뒤 캡처를 가리고, 경계에서는 점진적으로 섞여요. 반사 강도0도 영향 영역을 유지해서 뒤 광원이 새어 나오지 않아요. 우선순위가 높은 캡처의 영역이 실제로 픽셀을 덮어야 해요. 현재의 픽셀당 최대2후보 계약을 바꾸거나 모든 캡처의 무제한 계층 합성을 구현한 기능은 아니에요.

상자·구, 직접 두 후보·전역 아틀라스, 반사·간접광·코팅·굴절의 공통 샘플 경로에 적용해요. 모드만 바꾸면 캡처·이미지 복사·레이아웃·공간 트리를 다시 만들지 않아요. 실제 속성 데이터만 전송하고 새 렌더 타깃·텍스처·타이머·작업자를 추가하지 않아요. 모양 변경에 따른 영역/공간 트리 갱신은 별개예요.

```cpp
hb::ReflectionProbes::SetPriorityBlend(probe, true);
hb::ReflectionProbes::SetPriorityBlend(probe, false);
```

같은 서비스의 블루프린트 이름은 **반사 우선 캡처 덮어쓰기**예요. 컴포넌트 JSON의 priorityBlend 불리언과 일반 Components 속성 API, 기존 document.patch/revision/Undo도 같은 값을 사용해요. 네이티브 렌더 SDK는 setProbePriorityBlend(settings, true)를 사용해요.

1354–1362 당시 아틀라스는 9 float4/144바이트였어요. 독립 투영 추가 후 현재는 [14 float4/224바이트](PROBE_PROJECTION.md)예요. 브라우저 atlas faceScale.w와 native options.w에서 bit0은 투영, bit1은 구, bit2는 우선 덮어쓰기예요. 브라우저 직접 바인딩 options.w는 bit0이 활성 표시이며, 나머지 두 비트는 같아요. 구 여부는 하위2비트를 확인해 덮어쓰기 플래그를 구 모양으로 잘못 해석하지 않아요.

[Unreal Reflection Captures](https://dev.epicgames.com/documentation/en-us/unreal-engine/reflections-captures-in-unreal-engine)의 작은 캡처 우선 적용과 [Unity HDRP 17.0.4 Reflection Probe](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.0/manual/Reflection-Probe.html)의 영향 영역·경계 혼합·Importance 지정 본문을 대조했어요. 수식은 HB의 명시적 선택이고 두 엔진 내부 알고리즘과 완전히 같다는 주장은 아니에요. [Unity Proxy Volume](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.0/manual/Reflection-Proxy-Volume.html)의 영향 영역과 투영 영역 구분도 추가로 읽었으나, 독립 프록시는 후속 [투영 구현](PROBE_PROJECTION.md)에 연결했고 면별/노멀 페이드·라이트맵 혼합은 별도 잔여예요.

## Vector4 갱신 의존성 수정

동봉 Three 0.180.0의 UniformsGroup.updateVector4는 w의 변경 확인에 다음 칸을 사용해서 w만 원래 값으로 되돌릴 때 전송을 누락할 수 있었어요. tools/patch-three-uniforms.mjs는 실제 네 번째 칸을 비교하도록 소스와 엔진 import map/패키징이 사용하는 three.webgpu.js를 함께 수정해요. 새 dependency 설치의 prepare와 데스크톱 배포 빌드에 연결했어요. node_modules는 커밋하지 않으며 이 도구로 재현해요.

패치는 두 파일의 원래/수정된 구문을 모두 확인한 뒤 쓰고, 이미 수정된 파일은 바꾸지 않아요. 다른 버전의 코드나 엔진 밖 공유 파일을 임의로 수정하지 않아요. 원래 import map이 쓰지 않는 min/nodes 번들은 수정 대상이 아니에요. 런타임 우회 래퍼와 프레임별 작업도 추가하지 않아요. 실제 NodeUniform의 1→7→1 복원과 인접 값 보존, WebGPU·forcedGL의 실제 픽셀 복원으로 확인해요.

수치·실행·설치 근거는 후속 ENGINE_WORK/USER_INSTALL 기록을 확인해요. 큰 장면의 통제 FPS·메모리 검증이나 전체 연구·엔진 완성으로 확대하지 않아요.
