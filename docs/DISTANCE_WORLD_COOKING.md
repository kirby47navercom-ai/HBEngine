# 월드 에셋 거리장 사전 쿠킹

거리장 AO를 사용하는 장면의 패키지를 만들 때 사용자 메시, 삼각형 지형, 폴리지 원본 메시, LOD 그룹의 모든 단계도 기존 거리장 쿠킹에 포함해요. 기존 빌드·콘텐츠 검사와 같은 경로이며 새 버튼이나 별도 프로젝트 설정은 없어요. 원래 모델·지형·LOD와 같은 JSON을 사람이 편집하고 AI도 기존 문서 revision·dryRun·Undo/저장으로 편집해요. C++/BP의 PostProcessVolume 속성과 같은 실행 설정을 사용해요.

월드 메시의 인덱스·정점과 `terrainMesh`의 높이/구멍 삼각형을 사용하고, 런타임 Float32 위치와 같은 값으로 지문을 계산해요. 색·UV·인스턴스 배치는 로컬 거리장의 기하를 바꾸지 않아요. 높이·구멍·실제 정점 변경은 지문을 바꾸므로 이전 캐시와 구분해요. 폴리지는 원본 기하만 처리하고 인스턴스 행렬과 렌더러 버퍼를 새로 만들지 않아요. LOD는 시작 카메라나 강제 단계와 관계없이 포함된 모든 단계를 준비하므로 플레이 중 단계가 바뀌어도 일치하는 쿠킹 데이터를 사용할 수 있어요.

기존 SHA 검증 바이너리·공유 CookCache128MiB·패키지32MiB 예산·정확한 요청 해상도와 수명 계약을 유지해요. 같은 삼각형은 기존 지문으로 중복 제거해요. 원본 JSON은64MiB, 임시 삼각형 입력은8MiB 이하예요. 초과·빈 기하·잘못된 참조·누락 원본·깊이16/순환은 진단하고 기존 런타임 생성 경로로 넘겨요. 몰래 해상도를 낮추거나 원본 에셋을 수정하지 않아요. 취소는 소유 작업에만 적용해요.

빌드 보고서 `distanceFields.world`는 종류별 고유 에셋 수, 기하 입력 수, 예산 보류/미지원과 최대3개 예시를 제공해요. `rendererBuffers`와 `expandedInstanceTransforms`는 이 쿠킹 과정에서0이에요. 게임의 `distanceFields.cooked`와 기존 `meshDistanceFieldBakeState()`로 실제 적중/거절/작업자 시작을 구분해요. 생성 바이너리는 기존 Windows·웹·모바일 콘텐츠 경로를 사용하고 게임은 디스크 캐시를 추가하지 않아요.

[Epic Mesh Distance Fields의 Scene Representation·Quality·Foliage](https://dev.epicgames.com/documentation/en-us/unreal-engine/mesh-distance-fields-in-unreal-engine) 지정 본문을 대조했어요. HB는 지형의 삼각형 메시를 기존 볼륨 거리장으로 쿠킹해요. Epic 문서의 별도 Landscape heightfield·Global Distance Field clipmap이나 masked/two-sided foliage와 같은 구현이라고 주장하지 않아요. FBX의 사전 쿠킹·편집기 전용 사전 빌드·전용 높이장·변형/마스크/투명·전역 clipmap은 별도 잔여예요. Mac/Xcode·모바일 실기기 확인을 한 것으로 표시하지 않아요.

편집기의 로드된 정적 기하 사전 생성과 프로젝트 캐시 공유는 [EDITOR_DISTANCE_CACHE.md](EDITOR_DISTANCE_CACHE.md)에 있어요. 화면 없는 FBX 자동 쿠킹과는 구분해요.
