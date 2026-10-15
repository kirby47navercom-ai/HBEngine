# 131–133 — DirectX 래스터 HDRI·광원 타일링·그림자 갱신

SkyLight의 HDR·EXR 출처를 일반 DirectX 11 래스터에도 연결한다. 경로 추적을 켤 필요가 없다. 기존 SkyLight의 `cubemap`, `sourceRotation`, `intensity`, `indirectIntensity`, `captureResolution`을 사용한다. 사람의 속성 편집, Components Get/Set C++·블루프린트, revision을 검사하는 AI 문서 변경이 같은 컴포넌트를 수정한다.

## 131: HDRI 환경광과 반사

GPU가 위경도 환경맵을 여섯 면으로 변환하고 기존 ReflectionProbe의 GGX 거칠기 밉·SH9 확산광·BRDF 적분을 재사용한다. 새 라이브러리나 CPU 픽셀 읽기를 추가하지 않는다. 원본과 해상도가 같으면 필터를 재사용하고 회전·밝기는 상수만 바꾼다. SkyLight의 회전·밝기 변경으로 이미지 소유 오브젝트를 재생성하던 경로도 제거한다. 출처·활성화 변경은 기존 재구성 경로를 유지한다.

기존 두 개의 지역 반사 프로브는 계속 사용하며, 지역 프로브의 피복이 부족한 만큼만 전역 HDRI를 더한다. 표면 확산·금속 반사·코팅·추가 로브와 화면 밖 굴절의 기존 프로브 계산을 공유한다. 지역 프로브가 완전히 덮은 영역에 전역 HDRI를 이중으로 더하지 않는다. HDRI 해제·밝기 0·장면 종료 때 네이티브 환경 타깃을 해제한다. 원본 HDR·EXR은 장면의 에셋 수명에 따른다.

## 132: 모든 광원을 보존하는 타일링

`PostProcessVolume.rasterLightCulling`은 기본 켜짐이다. 화면을 16×16 픽셀 타일로 나누고 컴퓨트 셰이더가 점·스포트 광원의 범위 구와 타일의 네 측면을 보수적으로 비교한다. 태양광·반구광·무한 범위 광원은 보존한다. 깊이 프리패스를 요구하지 않아 투명 표면도 같은 목록을 사용할 수 있다.

목록은 광원당 한 비트여서 타일당 고정 개수 초과로 광원을 버리지 않는다. 저장 비용은 `ceil(width/16) × ceil(height/16) × ceil(lightCount/32) × 4`바이트다. 소수 광원은 기존 전체 평가를 사용한다. 카메라·뷰포트·광원 자료가 같으면 타일 계산을 반복하지 않는다. 비활성화하면 타일 자원을 해제한다. 그림자·지역 프로브·2D 오프스크린 패스는 해당 카메라에 맞는 기존 전체 평가를 사용한다.

이는 래스터의 정확한 범위 제거다. 기존 경로 추적·기하 GI의 `megaLightsEnabled/megaLightsSamples` 확률 표본과 별개이며, 광원 수나 장면 오브젝트 수를 제한하지 않는다. 하드웨어 버퍼·디스패치 범위를 초과하면 광원을 자르지 않고 전체 평가로 돌아간다. 광원 대부분이 같은 타일에 겹치면 계산량 감소도 작다.

## 133: 그림자 변경 범위

그림자 레이어별로 투영·캐스터 목록·해당 드로 자료를 비교한다. 한 광원에만 들어간 캐스터를 움직이면 그 광원만 갱신한다. 그림자를 만들지 않는 오브젝트의 위치 변경은 관련 없는 광원의 그림자를 다시 만들지 않는다. 텍스처·동적 머테리얼·포즈·시간 의존 셰이더 변화는 보수적으로 갱신하며, 이 추가 분리 최적화는 별도 측정 대상이다.

## AI와 비용 확인

기존 `schema.get`은 래스터 설정·HDRI 속성·읽기 전용 진단 이름을 공개한다. 실행기의 `renderer.rasterLightTileBytes`, `rasterLightTileDispatches`, `skyEnvironmentBytes`, `probeDispatches`로 할당과 재계산을 구별한다. 자동 GPU 읽기를 추가하지 않는다. 진단 수치와 게임 FPS를 혼동하지 않는다.

검증 원장: `docs/research/RASTER_LIGHTING_131.json`. 설치·바로가기·프로필·이전 버전 정리 영수증은 `USER_INSTALL_131.json`에 별도로 기록한다.

## 지정 자료와 범위

[Epic Sky Lights](https://dev.epicgames.com/documentation/unreal-engine/sky-lights-in-unreal-engine?lang=en-US)의 지정 환경맵·확산/반사·갱신 조건 부분과 [Microsoft CreateUnorderedAccessView](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/nf-d3d11-id3d11device-createunorderedaccessview)의 자원 뷰·동시 읽기/쓰기 충돌 부분을 대조했다. [Direct3D 11.3 자원 규격](https://microsoft.github.io/DirectX-Specs/d3d/archive/D3D11_3_FunctionalSpec.htm)은 추가 등록한 후속 규격 읽기 대상이다. 선택 구역 대조를 전체 엔진·연결 API의 분석 완료로 계산하지 않는다. DFAO·Lightmass·HWRT·가시성 reservoir를 도입한 것으로 주장하지 않는다.
