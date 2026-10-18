# 텍스처 가져오기·밉 정책 대조

2026-10-19에 선택한 본문과 API를 읽었어요. 이 기록은 전체 Unreal·Unity 본문/API 분석 완료가 아니에요.

[Unreal 텍스처 편집기](https://dev.epicgames.com/documentation/en-us/unreal-engine/texture-asset-editor-in-unreal-engine)는 밉 생성 방식과 상위 밉 제한, 알파 커버리지, 녹색 채널 반전, 하위 노멀 밉 정규화, 노멀 변화에 따른 거칠기 합성을 구분해요. 해상도·밉 수·플랫폼별 최종 자원 크기도 표시해요. 가져오기/생성 정책과 샘플러의 선택을 한 설정으로 취급하면 안 된다는 설계 근거로 대조했어요.

[Unity 노멀 텍스처 가져오기](https://docs.unity3d.com/6000.0/Documentation/Manual/texture-type-normal-map.html)의 선택 구역은 녹색 채널, 비정방 해상도, CPU 접근 사본의 메모리 비용, 밉 제한·스트리밍·필터와 알파 커버리지·기준값·경계 처리를 구분해요. [커버리지 API](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/TextureImporterSettings-mipMapsPreserveCoverage.html)는 생성한 밉의 알파를 재조정하며 기본값은 비활성화예요. 연결된 다른 API와 구현 전체를 분석했다고 계산하지 않아요.

HBEngine의 현재 이미지 편집기는 원본의 채널·확대·이동·픽셀 검사이고, 큐브/배열/볼륨 JSON은 이미지와 샘플러 설정을 갖고 있어요. `rayMipChain`은 선형 영역 가중치와 독립 슬라이스/볼륨 축소를 사용하지만, 일반 렌더러의 텍스처는 장치에서 밉을 생성해요. 가져오기 역할·커버리지·상위 밉·노멀 정책이 제작부터 모든 실행 경로로 연결되지는 않았어요.

로컬 Three r180의 일반 GL/WebGPU 2D DataTexture 경로는 명시적 밉을 업로드해요. GL의 DataArrayTexture/Data3DTexture 경로는 원본 레벨만 직접 업로드하므로 같은 방식으로 확장됐다고 가정하면 안 돼요. DirectX `createDataTexture`도 현재 자동 생성 경로예요. 이 대조는 로컬 소스의 해당 분기에 한정해요.

다음 구현은 원본 이미지를 보존하는 텍스처 2D 리소스와 가져오기 정책, 공용 CPU 밉 생성, GL/WebGPU의 명시적 밉, DirectX·광선 패킷의 같은 밉 입력을 연결해요. 기존 이미지 참조와 기본 설정은 호환해야 해요. 편집기 상세 속성·의존 에셋·재적용·저장·Undo·AI 작업·패키징·실제 실행이 연결되기 전에는 가져오기 기능이 완료됐다고 승격하지 않아요. 배열/볼륨, 압축 포맷·플랫폼 쿠킹, 노멀 분산의 거칠기 합성도 원장에 유지해요.


후속 452–472에서 위 시점의2DRGBA8정책을실제제작/실행에연결했어요. 최신구현과검증범위는TEXTURE_IMPORT_472.md와ENGINE_WORK_472.json을따라요. 451의본문읽기범위와미독연결구분은유지해요.
