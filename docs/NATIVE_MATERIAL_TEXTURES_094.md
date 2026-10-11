# 094 — DirectX 머테리얼의 큐브맵·배열·볼륨 텍스처

기존 텍스처 에셋과 머테리얼 그래프를 Windows DirectX 실행기로 연결해요. 별도 네이티브 에셋이나 전용 게임 코드를 만들 필요 없이 에디터·WebGL2·WebGPU에서 쓰던 같은 자료를 사용해요.

| 에셋 / 노드 | DirectX 실행 | 제작 입력 |
| --- | --- | --- |
| `.hbcubemap.json` / Sample Cubemap | TextureCube, 여섯 면, GPU mip 생성, SampleLevel | +X·−X·+Y·−Y·+Z·−Z 순서 이미지, 방향 벡터, LOD |
| `.hbtexturearray.json` / Sample Texture Array | Texture2DArray, 레이어 사이 혼합 없음 | 같은 크기 이미지, UV, `floor(index + 0.5)` 레이어 |
| `.hbvolumetexture.json` / Sample Volume | Texture3D, 슬라이스 사이 선형 보간 | 같은 크기 이미지, 순서가 Z 슬라이스, 3차원 UV |

기존 Texture Object/Parameter, 머테리얼 함수·레이어·인스턴스와 연결해요. 사람의 에셋 창과 노드 편집, AI의 `document.patch`·Undo·Save는 같은 저장 형식과 경로·자료형 검증을 사용해요. 새 편집 패널이나 사용 설명을 화면에 추가하지 않았어요.

```cpp
hb::Materials::SetTexture(actor, "Paint", "Assets/T_Sky.hbcubemap.json");
hb::Materials::SetTexture(actor, "Paint", "Assets/T_Array.hbtexturearray.json");
hb::Materials::SetTexture(actor, "Paint", "Assets/T_Volume.hbvolumetexture.json");
```

블루프린트는 기존 머테리얼 텍스처 설정 노드를 사용해요. 파라미터 자료형과 에셋 종류가 맞아야 해요. 교체는 기존 로드 준비·일괄 게시·취소 계약을 사용하고 머테리얼/셰이더를 다시 만들지 않아요. 같은 에셋 반복 지정은 디코드와 업로드를 생략하고 교체·장면 전환·종료 때 소유 자원을 해제해요.

## 자원과 검증

네이티브 공용 업로드는 RGBA8 및 기존 RG/RGBA float 자료를 사용해요. 큐브 이미지 에셋은 RGBA8이에요. 2D 자료의 행 반전, 배열/볼륨 각 슬라이스의 행 반전과 큐브 여섯 면을 기존 Three 자료에서 변환해요. 에셋 경로는 로컬 Assets 경로로 제한하고, 정사각형 큐브·여섯 면·동일 크기·슬라이스/자료 길이·유한 float·현재 D3D11 크기 한도를 검사해요. 3D 한도 2048은 장치 API 한도이며 장면 오브젝트 수 제한과 달라요.

색 공간 변환은 그래프의 기존 sRGB/linear 선택을 유지해요. 큐브 LOD용 mip는 업로드 시 GPU에서 생성하며 지원하지 않는 형식은 오류로 알려요. 배열/볼륨 에셋의 기존 단일 mip 정책은 유지해요. 네이티브 자료 API는 지원 형식의 mip 생성도 처리하지만 에셋 편집기에 새 mip 옵션을 추가했다는 뜻은 아니에요.

S/T/R 반복·미러·클램프와 point/linear 조합의 54개 작은 sampler state를 장치에서 재사용해요. 동시에 바인딩할 수 있는 sampler는 D3D11의 기존 16개예요. 2D 효과와 같이 쓰면 최대13개, 반사 프로브와 같이 쓰면 최대14개라는 기존 예약을 유지해요. 매 프레임 이미지 디코드·base64 전송·GPU 텍스처 생성을 하지 않아요.

`check-native-scene-render.mjs`는 실제 GPU에서 여섯 면·큐브 mip LOD·배열 반올림·볼륨 보간·독립 R 반복/클램프·sRGB와 자료 거부를 검사해요. 기존 2D·광원/그림자·파티클·스키닝/모프·블룸·반사 프로브도 같은 회귀에 포함돼요. 검사 실패의 대화상자 대기를 끄고 중복 샘플 셰이더 컴파일을 제거했어요. GPU 완료 시간이나 게임 FPS를 이 검사에서 측정하지 않아요.

`check-native-scene-window.mjs`는 격리된 실제 Windows 게임 창에서 기존 공용 texture parameter fixture를 사용해요. 네 종류의 빨강 → 사용자 C++ 호출로 청록 → 실제 T 키/블루프린트로 빨강을 확인했고, 같은 에셋 10회 재지정의 로드 횟수·머테리얼/프로그램 identity·소유 자원1개·메모리 개수 유지, 장면 전환과 종료 정리를 확인했어요. 사용자 설치본·열려 있는 창·게임 원본은 변경하지 않았어요.

최종 검사 경로와 소스/산출물 SHA, 선행 실패는 [기계 기록](research/NATIVE_MATERIAL_TEXTURES_094.json)에 있어요.

## 조사 근거와 남은 범위

Unity Shader Graph의 cubemap/array/3D 노드와 Unreal Texture Asset Editor의 기존 부분 분석은 [081 기록](research/MATERIAL_TEXTURE_FAMILIES_081.json)을 재사용해요. 이번 네이티브 연결은 Microsoft의 [텍스처 자원 구조](https://learn.microsoft.com/en-us/windows/win32/direct3d11/overviews-direct3d-11-resources-textures-intro), [SRV 자료형](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/ns-d3d11-d3d11_shader_resource_view_desc), [CreateTexture3D](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/nf-d3d11-id3d11device-createtexture3d), [3D 크기/설정](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/ns-d3d11-d3d11_texture3d_desc), [SampleLevel](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-to-samplelevel)의 직접 기술 본문/선언/표/예제를 대조했어요. 이미지와 연결 API·전체 엔진 문서를 모두 읽었다는 주장은 하지 않아요.

네이티브 코팅/투과 셰이딩·추가 후처리·미구현 GI와 다른 누적 엔진 세부는 다음 작업이에요. 압축/HDR 이미지 cube 에셋, 사용자 mip 가져오기, cube array 에셋, 가상 텍스처·추가 UV 채널은 이번에 구현하지 않았어요. 실물 모바일·전체 게임의 PC120/모바일60·장시간 메모리/발열은 이번 검증 범위에 없고, 큰 텍스처는 최초 로드 때 비용이 생겨요. 선행 렌더링 묶음 이후 설치본 갱신 순서를 유지해요.
