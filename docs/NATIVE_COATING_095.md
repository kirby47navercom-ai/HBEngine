# 095 — 코팅층·분리 노멀·굴절률

2026-10-12. 기존 머테리얼 에셋·표면 출력·속성 묶음·함수·레이어·인스턴스와 `hb::Materials::SetFloat` / `Set Material Float`를 재사용해요. Windows DirectX 실행기가 코팅 머테리얼을 거부하던 경로를 실제 조명 계산으로 연결했어요.

## 제작과 실행

- `Clearcoat`는 코팅 강도 0~1, `CoatRoughness`는 코팅 거칠기, `IOR`는 기초 표면 굴절률 1~2.5, `AO`는 차폐예요. 기존 `Roughness`, `Metallic`, `Opacity`, `EmissiveIntensity`도 유지해요. 대문자 별칭과 저장 필드 이름을 사용할 수 있고, 연결된 그래프 값은 해당 Scalar Parameter 이름으로 조절해요.
- Surface의 `Normal`은 기초 표면, 새 `Coat Normal`은 코팅 표면의 tangent-space vec3예요. Texture Sample → Normal Map → 각 입력에 연결할 수 있어요. 속성 묶음·레이어 혼합·인스턴스 override와 AI schema도 같은 필드를 사용해요. 이전 문서에서 새 필드를 생략하면 `[0,0,1]`을 사용해요.
- DirectX는 별도 GGX 분포·상관 Smith 가시성·Schlick Fresnel로 코팅 반사층을 계산해요. 기초 표면의 직접광/프로브 F0에는 `((IOR-1)/(IOR+1))²`를 사용하고, 코팅층 F0는 0.04예요. 코팅층 Fresnel로 아래층 에너지를 줄이고 위층 반사를 더해요.
- 코팅 프로브는 기존 HDR 큐브/GGX mip/BRDF LUT·영역·가중치를 재사용해요. 추가 캡처나 별도 코팅 텍스처 버퍼를 만들지 않아요. 표면 상수 16바이트를 기존 세 프레임 상수 버퍼에 추가해요. 코팅 강도 0은 코팅 조명/프로브 샘플 경로를 건너뛰어요.
- WebGL과 WebGPU는 코팅을 쓰지 않는 기본 표면에서 기능을 켜지 않아요. 처음 켤 때 기능을 활성화하고 셰이더를 한 번 다시 만들 수 있어요. 이후 강도/거칠기/IOR/AO 변경은 같은 머테리얼의 uniform을 바꿔요. DirectX에서는 값 변경으로 머테리얼/프로그램을 재생성하지 않아요.

```cpp
hb::Materials::SetFloat(target, "Clearcoat", 1.f);
hb::Materials::SetFloat(target, "CoatRoughness", .3f);
hb::Materials::SetFloat(target, "IOR", 1.5f);
```

## 확인한 범위

실제 GPU의 60개 HLSL 프로그램, 코팅 직접광/거칠기/입력 거부, 프로브 코팅/굴절률과 기존 2D·그림자·파티클·스키닝·블룸·네 종류 텍스처 검사가 통과했어요. Windows 실행기와 WebGL2/WebGPU 배포 실행에서는 사용자 C++ `SetFloat`, 실제 C키 Blueprint, 분리 노멀과 IOR 변경을 확인했어요. 공용 서비스의 새 속성 거부를 발견해 수정하고 실패 기록을 보존했어요.

| 중앙 픽셀 R 채널 | DirectX | WebGL2 | WebGPU |
|---|---:|---:|---:|
| 코팅 꺼짐 | 7 | 7 | 7 |
| C++ 코팅 켜짐 | 225 | 219 | 219 |
| 코팅 거칠기 1 | 16 | 18 | 18 |
| 실제 C키 Blueprint 켜짐 | 225 | 219 | 219 |
| 기초 노멀만 기울임 | 225 | 219 | 219 |
| 코팅 노멀만 기울임 | 7 | 9 | 9 |

Windows 값 변경 동안 업로드 수는 4→4, 머테리얼 ID/버전/프로그램은 같았어요. 각 실행기 오류 0·종료 0·자체 서버 종료를 확인했어요. 마지막 인스턴스/CPU/레이어 혼합 보완은 해당 단위 검사로 확인했으며, 긴 부하 검사는 실행하지 않았어요. 명령·산출물/SHA·읽기 범위·초기 실패는 [기계 기록](research/NATIVE_COATING_095.json)에 있어요.

## 분석 근거와 차이

[Unreal Dual Normals](https://dev.epicgames.com/documentation/en-us/unreal-engine/using-dual-normals-with-clear-coat-in-unreal-engine)의 자체 설명·제작 절차·표를 읽었어요. Unreal은 주 Normal을 코팅층에, 별도 Bottom Normal을 기초층에 사용해요. HBEngine은 기존 Normal 계약을 유지하고 별도 Coat Normal을 위층에 추가해요. 이미지·다운로드·연결 문서/API는 이번 읽기에 포함하지 않았어요.

[Unity URP 17 Complex Lit](https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@17.0/manual/shader-complex-lit.html)의 Clear Coat·Mask·Smoothness와 인접 반사 옵션 구역을 대조했어요. Unity는 Smoothness가 클수록 매끈하고, HBEngine의 Roughness는 작을수록 매끈해요. 두 층 계산의 비용과 활성화 상태를 구분해요. 전체 URP 소스/매뉴얼을 읽었다고 승격하지 않아요.

고정 [Three r180 물리 조명](https://github.com/mrdoob/three.js/blob/r180/src/renderers/shaders/ShaderChunk/lights_physical_pars_fragment.glsl.js)의 GGX·Smith·Clearcoat 직접/간접 계산, [IOR/코팅 설정](https://github.com/mrdoob/three.js/blob/r180/src/renderers/shaders/ShaderChunk/lights_physical_fragment.glsl.js), [합성](https://github.com/mrdoob/three.js/blob/r180/src/renderers/shaders/ShaderLib/meshphysical.glsl.js) 해당 구역을 읽고 설치 소스 SHA를 대조했어요. 다른 셰이딩 모델·연결 구현과 전체 corpus gate는 열린 상태예요.

## 남은 경계

네이티브 투과/굴절 렌더 패스, anisotropy/sheen/iridescence/subsurface·추가 후처리/GI는 별도 작업이에요. Native에 plain Three clearcoat texture map을 바로 넣으면 오류를 내며, 공용 머테리얼 그래프의 텍스처 노드로 연결해야 해요. 브라우저 프로브의 코팅 전용 간접광은 이번 실행 검사에 포함하지 않았어요. 모든 각도·재질에서 세 렌더러의 수치가 동일하다는 보장은 하지 않아요.

사용 중인 설치본·원본 게임·전면 창은 변경하지 않았어요. 선행 렌더 묶음을 끝낸 뒤 설치 갱신을 이어가요. 전체 게임 PC120/모바일60·실물 모바일·장시간 메모리/발열은 이번 결과로 판단하지 않아요.
