# 반사 캡처·라이트맵 혼합

MeshRenderer의 **반사·라이트맵 혼합**을 켜면 베이크한 간접광의 국소 밝기를 반사 캡처의 간접 정반사에 적용한다. 기본값은 꺼짐이며 기존 장면 출력은 유지한다. 유효한 간접 라이트맵이 필요하고, 유효 강도가0이거나 런타임 GI가 베이크를 대체하면 혼합을 건너뛴다.

[Epic Reflection Capture Lightmap Mixing](https://dev.epicgames.com/documentation/unreal-engine/reflections-captures-in-unreal-engine?lang=en-US)의 간접광 전용 조건과 매끈한 표면의 혼합 감소를 참고했다. 아래 비율·백엔드 연결은 HB의 구현이며 Unreal 내부 알고리즘과 완전한 동등성을 주장하지 않는다.

## 제작과 공용 조작

메시 UV 1을 생성·저장하고 간접광을 베이크한 뒤 Receiver의 MeshRenderer 옵션을 켠다. 일반 컴포넌트의 저장·Undo/Redo와 상속/인스턴스 편집 경로를 사용하며 새 에셋 형식은 추가하지 않는다.

```cpp
hb::Components::SetBool(target, "MeshRenderer", "lightmapReflectionMix", true);
bool enabled = hb::Components::GetBool(target, "MeshRenderer", "lightmapReflectionMix");
```

블루프린트의 공용 컴포넌트 Bool 노드도 같은 속성을 사용한다. AI는 컴포넌트 스키마/JSON Patch와 기존 `files.apply`를 사용한다. 실행 진단은 `gameplayDebug.lightmap`의 `reflectionMixEnabled`, `reflectionMixEligible`, `valid`, `source`다. Eligible은 베이크 상태가 적용 조건에 맞다는 뜻이며 실제 캡처의 픽셀 점유를 보장하지 않는다.

## 수식과 적용 범위

거칠기0.1 이하는 기존 반사를 유지하고0.3 이상은 비율을 전부 적용한다. 중간은 선형으로 전환한다. 각 캡처의 기준 조도에는 그 캡처의 강도를 포함하고 diffuseIntensity는 포함하지 않는다.

`w = saturate((roughness - 0.1) / 0.2)`

`scale = lerp(1, min(1000, Y(baked) / max(0.0001, Y(capture))), w)`

휘도 계수는0.2126/0.7152/0.0722다. GL/TSL의 PMREM 참조는 radiance×PI, DirectX는 기존 SH irradiance를 사용한다. 원래 하늘 환경, 직접광·확산광과 굴절은 이 비율로 변경하지 않는다. 금속과 코팅, 두 후보 및 전역 아틀라스에서 같은 정책을 사용한다. Native 무라이트맵/강도0 경로는 명시 분기로 불필요한 라이트맵 샘플을 건너뛴다.

공용 수식 소유자는 `probe-lightmap-mix.js`이며 HLSL 헤더는 `generate-probe-lightmap-mix.mjs`로 생성한다. `prepareNative`가 생성과 불일치를 처리하고 동일한 파일은 다시 쓰지 않는다. `hb context`의 함수 검색은 수식/TSL 소유 파일 한 개로 좁혀진다.

## 검증과 비용

실제 GL·WebGPU·WebGPU의 GL 대체 경로에서 direct/atlas의 거칠기·금속·코팅을 비교했다. 알려진 상수 HDR 캡처와 실제 라이트맵을 사용한 최대 오차는약1.12e-8이다. D3D11의 같은10개 재질 경우는 디스플레이 바이트 오차0이었다. 강도0·캡처 밝기2배·diffuseIntensity0·무라이트맵을 별도로 확인한다. 이 수치는 통제된 픽셀 대조이며 게임FPS가 아니다.

편집기에서 UV 생성→Worker 베이크→옵션·Undo/Redo·저장→BP/실제 C++ Bool 호출→같은 저장 장면의 Windows D3D11 실행을 연결한다. Director의 기존 위치와 Stop 이후 원래 편집 값도 보존한다. 정확한 최종 설치/실행 지문은 후속 ENGINE_WORK/USER_INSTALL 영수증을 따른다.

워커는 페이지의 가져오기 맵을 상속하지 않으므로 밉 처리의 두 파일이 설치된 Three의 순수 상수 모듈을 상대 경로로 읽는다. 상수 복제나 전체 Three 로드는 추가하지 않는다. 실제 베이크와 기존 밉·공유·네 종류 텍스처 샘플링 검사를 연결한다.

새 캡처·조명 패스·텍스처는 추가하지 않는다. 켠 경우 브라우저는 선택한 캡처의 거친 기준 샘플을 사용하고 Native는 이미 계산한 SH를 재사용한다. 제어된 혼합/밝기 변경 검사는 캡처를 재생성하지 않았다. 이 Bool만 바꾸는 BP/C++ 실행은 시각 서명에서 다른 변경이 없을 때 기존 그룹·UV·페이지를 유지한다. 준비 중·머테리얼 교체 뒤에도 최신 값을 재적용하고 inPlaceMixUpdates로 확인한다. 다른 속성 변경은 기존 재구축 경로를 유지한다. 일반 컴포넌트의 추가 균일값 갱신 최적화는 별도 후속이다. 방향성/볼륨 베이크, 확산광 혼합의 추가 정책, 더 많은 후보 계층과 복잡 로브의 전체 에너지 동등성도 원장에 남긴다.
