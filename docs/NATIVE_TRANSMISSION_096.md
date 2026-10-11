# 096 — 투과·두께·굴절

2026-10-12. 기존 `Transmission`·`IOR`를 Windows DirectX 11의 실제 장면 투과로 연결하고 `Thickness`를 공용 표면 입력에 추가했어요. 기존 함수·속성 묶음·레이어·머테리얼 인스턴스·C++·블루프린트·AI 에셋 형식을 그대로 사용해요.

## 제작과 실행

```cpp
hb::Materials::SetFloat(target, "Transmission", 1.f);
hb::Materials::SetFloat(target, "Thickness", .3f);
hb::Materials::SetFloat(target, "IOR", 1.52f);
```

같은 이름을 기존 `Set Material Float` 블루프린트 노드에 넣을 수 있어요. 그래프에 스칼라 파라미터를 연결했다면 그 파라미터 이름으로 값을 바꿔요. 연결된 핀을 표면 별칭으로 덮어쓰지 않아요.

- `Transmission`: 0~1, 표면의 확산광 대신 통과시킬 비율이에요. 알파/불투명도와 별도로 동작해요.
- `Thickness`: 0~10000의 로컬 길이예요. 객체의 월드 크기를 반영해요. 기본 0으로 기존 에셋을 유지하며, 두께가 생기면 굴절 방향으로 뒤쪽 장면을 읽어요.
- `IOR`: 기존 1~2.5 범위를 사용해요. Normal에 연결한 값·움직이는 UV/노멀과 함께 굴절 좌표를 계산해요.
- 인스턴스 표면 오버라이드·속성 분해/묶음·레이어·CPU 평가·GLSL/TSL/HLSL이 같은 Thickness 핀을 사용해요. AI는 기존 JSON `surface.thickness`, 표면 핀 `thickness`, 기존 그래프 연결/검증과 SetFloat 명령을 사용해요.

DirectX는 불투명 장면을 먼저 그리고, 동일한 HDR 장면에서 GPU 복사와 mip 생성을 한 번 수행해요. 굴절 표면을 그린 뒤 일반 반투명 객체를 그려요. 기본 Fresnel·금속성·직접/프로브 반사는 유지하고 확산광에 투과 비율을 적용해요. 코팅층은 그 위에서 합성해요. 거칠기와 IOR로 mip LOD를 조절하고, 화면 가장자리에서는 원래 화면 좌표로 부드럽게 되돌려요.

## 비용과 수명

투과를 쓰지 않는 기본 장면은 추가 HDR/굴절 텍스처를 만들지 않아요. DirectX에서 투과를 켜면 기존 Bloom의 HDR 장면을 재사용해요. Bloom을 끈 장면은 Bloom compute dispatch가 0이고, 최종 HDR 색 변환만 수행해요. Bloom을 함께 켠 조합도 별도 검사했어요.

640×360 실행에서 굴절 mip 버퍼는 **2,457,304바이트**, HDR 장면은 **1,843,200바이트**였어요. Bloom이 없던 장면의 추가 합계는 약 **4.10 MiB**예요. 해상도가 커지면 이 비용도 커져요. 투과를 끄면 두 버퍼를 해제하고, resize·scene reset·종료도 해제 경로를 사용해요. 연결된 투과 그래프는 0을 출력하더라도 잠재적으로 변할 수 있어 캡처를 유지해요.

값 변경 동안 DirectX 머테리얼/프로그램과 업로드 수 **8→8**을 유지했어요. 기존 draw constant buffer 3개를 재사용하고 32바이트 필드를 추가했어요. 위치나 색 버퍼를 매 프레임 CPU로 읽지 않아요. WebGL/WebGPU는 첫 사용에 투과 셰이더 기능을 활성화하고, 이후 값 변경은 같은 uniform을 사용해요. 웹에서는 활성화한 기능을 값 0만으로 다시 컴파일해 제거하지 않아요.

DirectX 굴절은 clamp sampler 하나를 프로브와 공유하며, 굴절 머테리얼의 그래프 텍스처는 최대 14개예요. 일반 머테리얼의 기존 16개 한도는 유지해요. 일반 Three 머테리얼의 transmissionMap/thicknessMap은 조용히 무시하지 않고, 공용 머테리얼 그래프 연결을 요구해요.

## 검증

실제 숨겨진 Windows 실행기와 WebGL2/WebGPU 배포 실행기에서 사용자 C++ `SetFloat`, 실제 T키 Blueprint, 두께·굴절률·거칠기, ID/프로그램 재사용을 확인했어요. DirectX에서 투과를 끈 뒤 굴절 텍스처 0을 확인했어요. 각 실행기 오류 0·종료 0·자체 서버 종료를 확인했어요. 사용자 창과 설치본은 조작하지 않았어요.

| 중앙 RGB | DirectX | WebGL2 | WebGPU |
|---|---|---|---|
| C++ 투과·IOR 1 | 0,232,0 | 148,228,91 | 149,228,91 |
| 기울어진 노멀·두께·IOR 1.5 | 230,0,0 | 247,23,25 | 248,23,25 |
| 거칠기 1 | 218,10,13 | 226,10,31 | 226,9,31 |

서로 다른 백엔드의 정확한 색 일치는 검증 목표가 아니에요. 뒤쪽 녹색 띠가 보이고, 굴절이 빨간 배경으로 이동하며, 거칠기가 샘플을 바꾸는 조건을 확인했어요.

GPU 전체 회귀에서는 60개 HLSL 프로그램과 기존 2D·그림자·파티클·인스턴스·스키닝·프로브·텍스처·Bloom, GPU 없는 경로 거부를 확인했어요. 최종 추가 검사는 투과/Bloom 조합과 sampler 한도 거부만 좁혀 실행해요. 공용 uniform·파라미터/clone·연결된 투과 그래프·Thickness CPU/검증, 머테리얼 77종·레이어·API 검사를 함께 기록해요. 명령·산출물·SHA·초기 실패는 [기계 기록](research/NATIVE_TRANSMISSION_096.json)에 있어요.

## 조사 근거와 구현 경계

[Unreal Refraction](https://dev.epicgames.com/documentation/en-us/unreal-engine/using-refraction-in-unreal-engine)의 자체 본문·IOR 표·머테리얼/인스턴스/노멀/Panner 제작 절차·Depth Bias 설명을 읽었어요. 이미지·동영상·연결된 문서/API는 포함하지 않았어요.

[Unity HDRP 17 Screen Space Refraction](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.0/manual/Override-Screen-Space-Refraction.html)의 자체 본문·Volume 절차·Screen Weight Distance 표를 읽었어요. HBEngine은 화면 끝에서 원래 좌표로 돌아오며, Unity의 프로브/하늘 굴절 계층 전체를 구현한 것은 아니에요.

설치된 Three r180의 ray·로컬 두께/크기·IOR 거칠기·화면 투영·Fresnel/확산 합성 구역과 transmission fragment를 대조했어요. WebGPU `RenderList.push`가 transmissionNode 존재와 별개로 물리 transmission 속성을 보고 투명 목록을 결정하는 경로도 확인하고 고쳤어요. 원문과 설치 소스 SHA를 대조했어요.

[Microsoft GenerateMips](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/nf-d3d11-id3d11devicecontext-generatemips)와 [CopySubresourceRegion](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/nf-d3d11-id3d11devicecontext-copysubresourceregion)의 선언·매개변수·조건·포맷/예제를 읽고, HDR mip 생성 플래그와 같은 크기/포맷의 GPU 복사에 적용했어요. 연결 인터페이스/전체 API 본문은 미독이에요.

이번 DirectX 구현은 불투명 장면 한 번의 화면 캡처를 사용하는 근사예요. 중첩 유리의 재귀 굴절, 화면 밖 대상, 깊이 기반 ray march/전경 차폐 거부, 체적 흡수·분산·색 투과 그림자, 프로브 기반 굴절 대체는 별도 작업으로 남겨요. GPU/실행 성공을 전체 엔진·전체 corpus/API·게임 FPS·장시간 부하·모바일 실기기 완료로 계산하지 않아요. 남은 셰이딩·후처리·GI와 누적 세부, 선행 렌더 묶음 뒤 사용자 설치 갱신 순서를 유지해요.
