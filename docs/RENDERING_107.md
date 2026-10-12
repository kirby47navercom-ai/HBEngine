# 107 — 중첩 매질·HDRI·경로 추적 디노이저

D3D11·WebGL2·WebGPU의 기존 경로 추적에 닫힌 매질 경계, HDR/EXR 환경 조명과 표시용 디노이저를 연결해요. 기존 머테리얼·PostProcessVolume 속성, C++·블루프린트·AI의 자료형별 속성 API를 사용해요. 기존 얇은 표면은 기본값 그대로 유지해요.

## 제작과 실행

머테리얼의 **닫힌 매질**을 켜면 해당 메시 인스턴스가 하나의 경계가 돼요. 투과율·굴절률·흡수 색·흡수 거리를 함께 설정해요. 광선은 경계 진입과 이탈에 따라 활성 매질을 바꾸고, 구간마다 Beer 흡수와 상대 굴절률·Fresnel·전반사를 계산해요. 카메라와 투과 그림자 광선이 매질 안에서 시작하는 경우도 역방향 경계 탐색으로 초기 상태를 구해요. 겹침은 마지막으로 들어간 매질을 우선해요.

PostProcessVolume의 **HDRI 환경**에 프로젝트의 `.hdr` 또는 `.exr` 파일을 지정해요. **HDRI 밝기·회전**으로 조명과 배경을 조정해요. 파일을 지정하지 않으면 기존 단색 환경광을 사용해요. 위도·경도 픽셀의 정확한 입체각과 휘도에 따라 alias 분포를 만들고, 환경 조명 샘플과 BRDF 샘플을 MIS로 결합해요. 회전·밝기·파일·장면 변경은 누적 이력을 초기화해요.

**노이즈 제거**는 법선·깊이·색 차이를 사용한 5×5 à-trous 필터예요. **노이즈 제거 세기**와 **필터 단계**를 조정할 수 있어요. 필터링한 영상은 화면 출력에만 사용하고 누적 원본에 다시 섞지 않아요. D3D11·WebGL은 필터 값만 바꿀 때 원본 샘플 수를 유지해요. WebGPU는 켜기/끄기·세기 0 경계·단계 수 변경 시 파이프라인을 다시 만들고 누적을 시작하며, 양수 범위의 세기 변경은 같은 파이프라인을 사용해요. 세기 0·비활성·경로 추적 종료 시 필터 자원을 해제해요.

```cpp
hb::Materials::SetFloat(glass, "ClosedVolume", 1.f);
hb::Components::SetBool(post, "PostProcessVolume", "pathTracingEnabled", true);
hb::Components::SetString(post, "PostProcessVolume", "pathTracingHDRI", "Assets/Studio.hdr");
hb::Components::SetFloat(post, "PostProcessVolume", "pathTracingHDRIIntensity", 1.f);
hb::Components::SetFloat(post, "PostProcessVolume", "pathTracingHDRIRotation", 90.f);
hb::Components::SetBool(post, "PostProcessVolume", "pathTracingDenoise", true);
hb::Components::SetFloat(post, "PostProcessVolume", "pathTracingDenoiseStrength", .8f);
```

기존 자료형별 API를 사용하므로 새 전용 C++ 함수를 외울 필요는 없어요. 실제 실행기 검사에서도 C++로 닫힌 매질·HDRI 파일·밝기·회전·디노이저 속성을 바꿔요.

## 자원과 가벼움

- HDRI는 BVH와 별도의 원본/버전 캐시와 GPU 텍스처를 사용해요. 오브젝트 이동으로 BVH가 바뀌어도 HDRI를 다시 포장하거나 업로드하지 않아요. 방사휘도와 PDF는 픽셀당 16바이트, alias 쌍은 8바이트이며 텍스처 패딩은 별도예요. 4096×2048 입력의 atlas는 192MiB이고, 디코드 원본과 분포 생성 중 임시 CPU 저장 공간은 추가로 필요해요. 작은 환경 이미지부터 사용하는 게 좋아요.
- 네이티브·WebGL 디노이저는 법선/깊이와 두 필터 대상에 합계 픽셀당 24바이트를 사용해요. WebGPU는 안내 영상과 필터 단계별 영상에 `(1 + 단계 수) × 8`바이트를 사용해요. 원래의 누적 이력은 별도예요.
- 기본 경로 추적과 디노이저는 꺼져 있어요. 닫힌 매질이 없는 장면은 매질 처리 셰이더를 제외하고, 사용하지 않는 디노이저 대상도 만들지 않아요. WebGL 일반 패스는 필터 함수를 제외하고, HDRI가 없는 장면은 단색 환경용 셰이더를 사용해요. 렌더 결과의 자동 GPU→CPU 읽기는 추가하지 않았어요. 검사에서만 명시적으로 캡처해요.

위 숫자는 저장 형식에 따른 산술과 재사용/해제 검증이에요. 실제 전체 게임 FPS·RAM/VRAM·휴대폰 성능 측정값으로 해석하지 않아요.

## 확인과 경계

[검사 기록](research/RENDERING_107.json)에 세 Windows 실제 실행기, 네이티브 하드웨어, 공용 계산·스키마·AI·생성 파일 검사와 기존 098–106 회귀를 함께 남겨요. 중첩 흡수/기존 얇은 표면, 매질 내부 카메라, HDR/EXR 디코드·C++ 파일 교체·회전·밝기, 누적 초기화, 노이즈 분산 감소·원본 보존·세기 0·자원 해제를 확인해요. 노이즈 분산 감소는 고정 검사 장면의 결과이며 모든 장면의 화질을 보장하지 않아요. 설치 결과는 [설치 영수증](research/USER_INSTALL_107.json)에 별도로 기록해요.

닫힌 매질은 법선 방향이 일관된 닫힌 메시가 필요해요. 활성 매질은 광선당 최대 16개이고 경계 탐색은 기존 투과 교차 예산 내 최대 64회예요. 초과하거나 경계를 확정할 수 없으면 보수적으로 기여를 중단해요. 이 값은 장면 오브젝트 개수 제한이 아니에요. 임의의 중첩 우선순위 지정과 산란하는 안개/참여 매질은 포함하지 않아요.

디노이저는 불투명하고 충분히 거친 1차 표면을 대상으로 해요. 유리·거울에 가까운 표면, 놓친 광선과 렌즈 심도 영상은 원본을 유지해요. 2차 반사/굴절 경계 안내, 모션 재투영·시간 분산 필터, 학습 기반 디노이저는 포함하지 않아요. 기존 광선 mip/LOD·정확한 피부/모발/코팅 로브·caustics·래스터 색 투과 그림자·2D 광선 BVH와 실게임 성능 경계도 남아 있어요.

## 읽은 근거

[PBRT 매질 경계](https://pbr-book.org/4ed/Volume_Scattering/Media), [dielectric](https://pbr-book.org/4ed/Reflection_Models/Dielectric_BSDF), [흡수](https://pbr-book.org/4ed/Volume_Scattering/Transmittance)의 지정 구역을 경계 상태와 상대 굴절률·Beer 구간 계산에 대조했어요. [환경광 샘플링](https://pbr-book.org/3ed-2018/Light_Transport_I_Surface_Reflection/Sampling_Light_Sources)과 [PBRT 4 환경광](https://pbr-book.org/4ed/Light_Sources/Infinite_Area_Lights)의 지정 구역을 읽었으며, PBRT 4의 equal-area 구현과 같은 구현이라고 주장하지 않아요. HBEngine은 자체 lat-long alias 분포를 사용해요.

[AMD edge-avoiding wavelet 설명](https://radeon-pro.github.io/RadeonProRenderDocs/en/rif/filters/edge_avoiding_wavelet.html)의 법선·깊이·색 안내 원리를 참고했어요. AMD 필터 라이브러리를 연결하거나 구현을 복사한 것은 아니에요. 설치 Three r180의 HDR/EXR 디코드와 TSL 함수 캐시·텍스처 좌표 행렬 지정 구역도 대조했어요. 14개 원문/설치 소스 SHA와 실제 읽은 구역을 기록하며, 나머지 본문/API와 전체 Unreal·Unity 분석 완료를 대신하지 않아요.
