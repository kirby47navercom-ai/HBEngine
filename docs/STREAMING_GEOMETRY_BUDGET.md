# 스트리밍 셀 지오메트리 비용

WorldStreamingBudget의 **셀 비용 기준**에서 `지오메트리 측정값`(memoryMode=geometry)을 선택하면 로드된 셀의 실제 CPU 지오메트리 배열 할당량을 예산에 반영해요. 기존 프로젝트 기본값은 `작성 추정값`(authored)이에요. 공용 컴포넌트 문자열 쓰기로 실행 중에도 모드를 바꿀 수 있어요.

대상은 BufferGeometry의 index/attribute/morph, interleaved backing array와 InstancedMesh의 instanceMatrix/instanceColor예요. 같은 ArrayBuffer를 여러 속성·메시·로드된 셀이 공유하면 실제 backing allocation 전체를 한 번 계산해요. CPU 배열의 byteLength이며 텍스처/이미지·드라이버·GPU/VRAM·물리·스크립트·프로세스 전체 RAM을 측정하지 않아요.

선택 순서는 기존 우선순위·거리·로드 상태·인스턴스 이름을 유지해요. 각 셀의 비용은 작성 추정값을 하한으로 삼고, 이미 선택한 셀과 겹치지 않는 지오메트리 할당량을 반영해요. MB 입력은 기존처럼 1,048,576 bytes 기준이에요. 셀 개수 예산은 사용자가 지정한 기존 설정이며 새 오브젝트 제한을 추가하지 않아요.

처음 보는 셀은 작성 추정값으로 불러온 뒤 측정하므로 최초 로드가 예산을 초과할 수 있어요. 초과 셀을 내린 뒤에는 숫자 비용만 기억해 같은 셀을 계속 로드/해제하지 않아요. 원본 scene/estimatedMB가 바뀌면 관찰값을 무효화하고, 컴포넌트 제거·월드 종료 때 정리해요. 해제된 Buffer를 관찰 기록에 보관하지 않아요. 공유 여부를 모르는 해제 셀의 비용은 보수적인 단독 측정값이에요.

평소 tick에서 전체 지오메트리를 재측정하지 않아요. 임의 런타임 지오메트리 교체 후에는 `runtime.streaming`에 `refresh:true`를 보내 요청한 페이지의 로드된 셀을 다시 측정해요. offset/limit(최대128, 기본64)과 마지막 측정 byte/기하 수/속성 view 수를 반환해요. 일반 조회는 기록된 값만 복사하며 원문·Buffer는 반환하지 않아요. 수동/always 로드 정책은 자동 예산으로 강제 해제하지 않아요.

검사 `node tools/check-streaming-geometry-2783.mjs`: 실제 Three의 공유/인덱스/모프/interleaved/instance 배열, 공용 selector, 실제 RuntimeLevels load/build/unload와 소유 VM/hook fixture, 해제 후 숫자만 보존·재로드 억제·재측정·페이지·기존 authored 정책·AI handler를 확인해요. 전체 RAM/VRAM/FPS/실제 창/모바일·설치 근거는 아니에요. 자동 공간 분할/HLOD, 동적으로 바뀌는 모든 리소스 추적과 전체 메모리 예산은 계속 별도예요.
