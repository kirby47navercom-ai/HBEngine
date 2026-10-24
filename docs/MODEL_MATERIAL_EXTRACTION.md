# 모델 재질을 독립 에셋으로 추출

모델 가져오기 문서에서 재질 하위 에셋을 선택하고 **독립 머테리얼 생성**을 사용해요. 원본 Standard/Physical PBR 재질을 기존 v1 `.hbmaterial.json`의 표면과 편집 가능한 노드 그래프로 옮겨요. 생성은 기존 에셋 생성 트랜잭션을 사용하며 원본·기존 에셋을 덮어쓰지 않아요. 생성한 에셋은 기존 MeshRenderer 머테리얼 선택과 BP/C++ 머테리얼 적용 경로에서 사용해요.

색상은 선형 RGB를 유지해요. 발광 색과 강도, 거칠기·금속성, 코팅·천·투과·흡수·굴절률·분산·얇은 막·스페큘러 상수를 전달해요. 외부 프로젝트 이미지의 기본색/발광/ORM/알파/노멀/코팅/투과/두께/천/스페큘러/iridescence 맵은 원본 채널과 계수로 연결해요. UV0의 중심·회전·배율·오프셋과 이미지 Y 방향, 독립 축 wrap과 표현 가능한 필터를 보존해요. 마스크/반투명은 기본색 alpha × alphaMap G × opacity를 적용해요.

glTF는 로더의 material 인덱스로 연결해 이름 중복을 추측하지 않아요. 다른 형식은 보존된 FBX ID 또는 고유 이름이 필요해요. 외부 이미지 URI는 모델 폴더 기준으로 정규화하고 `Assets/` 밖, 외부 URL·data/blob·query URL을 거절해요. 로더/parser와 임시 URL은 결과에 저장하지 않아요.

내장 이미지·지원 밖 맵/셰이더/래스터 상태·추가 UV·비대칭 노멀 배율·사용자 텍스처 행렬·표현 불가능한 필터는 생성 전에 거절해요. 그림을 빼고 성공으로 처리하지 않아요. 스킨 추출·모든 DCC 형식/재질과 렌더 결과의 동등성까지 증명한 기능은 아니에요.

AI는 `modelimport.extractMaterial`에 열린 문서 `path`, `expectedRevision`, 재질 `subasset`, 새 `name`을 전달해요. `dryRun:true`는 요약만 반환하고, 전체 초안은 `includeData:true`로 받아요. 미리보기 로딩 뒤 문서 revision과 미리보기 수명을 다시 확인해요. 경로 소유자는 `modelMaterialSubasset`, `extractModelMaterial`, `tagModelMaterials`로 조회할 수 있어요.

검사: `node tools/check-model-material-2442.mjs`. 실제 glTF 파서·CPU 값/UV·GLSL/HLSL 생성·문서 수명을 확인해요. GPU 실행·실제 창/기기·설치는 별도예요.
