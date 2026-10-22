# 반사 경계·방향·노멀

Reflection Probe의 기본 혼합 거리와 기존 장면은 유지해요. 상자에서 **고급 경계 혼합**을 켜면 +XYZ/−XYZ의 혼합 거리, 반사 면 가중치, 노멀 억제 거리를 따로 편집해요. 끄면 숨겨진 값은 보존하고 기본 혼합 거리·노멀 억제 거리로 돌아가요. 구는 기본 모드와 단일 노멀 억제 거리만 사용해요.

- 혼합 거리는 각 경계면에서 안쪽으로 들어가는 월드 거리예요. 0은 해당 면의 단단한 경계예요. 회전·비균일/음수 크기·전단에서도 변환된 평면에 수직인 거리로 계산해요.
- 반사 면 가중치는 표면의 위치 대신 **샘플 방향**을 기준으로 축의 양·음 방향을 부드럽게 가려요. 0은 해당 방향을 지우고 1은 유지해요. 모든 방향이 1이면 기존 결과예요. 방향 벡터가 없는 위치 조회는 이 마스크를 적용하지 않아요.
- 노멀 억제 거리는 외곽 껍질을 만들어요. 안쪽에서는 기존 영향을 유지하고, 껍질에서는 캡처 위치의 바깥을 향한 노멀을 줄여요. 내적 0.2까지 유지하고 0.6부터 제거해요. 캡처와 같은 점이나 노멀 없는 조회는 방향 억제를 적용하지 않아요. 굴절 경로는 샘플 방향 페이드를 사용하며 별도 표면 노멀이 없으면 노멀 억제를 생략해요.

고급 아틀라스는 가중치가 0인 후보를 제외한 뒤 순위가 높은 두 후보를 선택해요. 첫 후보가 가려지면 세 번째 후보도 올라와요. 기본 설정에서는 기존 위치 기반 선택과 재사용 경로를 유지해요. 우선 캡처 덮어쓰기와 환경 잔여 가중치는 이 선택 이후에 적용해요.

```cpp
hb::ReflectionProbes::SetAdvancedBlend(probe, true);
hb::ReflectionProbes::SetBlendFaces(probe, {1,2,3}, {2,1,3});
hb::ReflectionProbes::SetFaceFade(probe, {1,1,0}, {1,1,1});
hb::ReflectionProbes::SetNormalBlendFaces(probe, {1,1,2}, {1,1,1});
// 기본 모드의 단일 노멀 거리는 다음 함수로 지정해요.
hb::ReflectionProbes::SetAdvancedBlend(probe, false);
hb::ReflectionProbes::SetNormalBlendDistance(probe, 1);
```

각 함수는 컴포넌트 선택 인수를 받아요. 면별 함수는 값을 지정하며 고급 모드를 자동으로 바꾸지 않아요. 대응 블루프린트 다섯 노드도 같은 서비스를 사용해요. 값 범위 검증·원자적 다중 필드 변경·즉시 C++ 읽기 캐시·기존 JSON/revision/Undo를 공유해요. AI는 ReflectionProbe의 `advancedBlend`, `blendPositive/Negative`, `fadePositive/Negative`, `blendNormalDistance`, `blendNormalPositive/Negative`를 편집해요.

투영 프록시·캡처 위치·이미지는 바꾸지 않아요. 가중치만 바꾸면 캡처·아틀라스 배치·공간 트리를 재사용하고 메타데이터만 전송해요. 기본 모드의 추가 배열은 네이티브 JSON에서 생략하고, 브라우저 테이블도 기본 상태로 초기화·복원된 선택 필드를 반복 포장하지 않아요. 새 상주 작업자·타이머·렌더 타깃은 없어요.

현재 직접 ProbeSettings는 304바이트, 아틀라스 레코드는 20 float4·320바이트예요. 1420의 208/224바이트에서 각각 96바이트가 늘었어요. 기존 3슬롯 상수 버퍼의 CPU·GPU 저장공간은 각각 +864바이트이고 CPU 상수 캐시는 3,168바이트예요. 버퍼 개수는 같아요. 낮은 수준 SDK는 `setProbeInfluence`와 `probeInfluenceUsable`을 사용하며 새 헤더로 다시 컴파일해요.

WebGPU의 일반 Three 머테리얼은 노드 변환 전 캐시를 조회하므로, 직접 바인딩과 아틀라스의 노드 ID를 원래 머테리얼 키에 더해요. 같은 바인딩의 값 변경은 키를 바꾸지 않으며 원래 키 함수와 복원 절차를 보존해요.

참고 범위는 [Unity HDRP 17.0.4 속성의 영향 영역](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.0/manual/Reflection-Probe.html), [공개 VolumeProjection의 영향 계산](https://github.com/Unity-Technologies/Graphics/blob/master/Packages/com.unity.render-pipelines.high-definition/Runtime/Lighting/Reflection/VolumeProjection.hlsl), [ImageBasedLighting의 노멀 페이드](https://github.com/Unity-Technologies/Graphics/blob/master/Packages/com.unity.render-pipelines.core/ShaderLibrary/ImageBasedLighting.hlsl)예요. 공개 master 소스와 문서 버전이 같다고 가정하지 않아요. HB의 변환·0거리 경계·순위·포장·공용 API는 자체 구현이에요. 전체 저장소/API 본문 분석 완료를 뜻하지 않아요.
