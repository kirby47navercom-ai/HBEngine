# 749–752 CPU 광선 밉 캐시 예산과 다음 GPU 상주 작업

2026-10-19. GPU 상주 스트리밍과 CPU 변환 재사용은 별도 수명/예산이에요. 이번 구현은 후자이며 아래 미구현 GPU 항목을 완료로 계산하지 않아요.

## 구현과 운영

`ray-mip-cache.js`는 기본256MiB의 CPU Float32 밉 재사용 풀을 관리해요. 변환된 체인의 실제 ArrayBuffer를 항목 안에서 중복 없이 계산해요. linear/sRGB와 volume/layout 변환은 별도이고, 필터 켜기/끄기의 같은 버퍼를 중복 계산하지 않아요.

최근 사용한 변환을 우선 유지해요. 예산을 줄이면 오래 안 쓴 항목부터 퇴역하고, 0이면 변환 결과를 보관하지 않아요. 반환된 배열/픽셀을 변경하거나 detach하지 않아 이전/현재 프레임의 활성 스냅샷은 유지돼요. 텍스처 소유자는 WeakMap으로 연결하고 LRU 토큰은 변환 체인만 보관해요. 지원 환경의 소유자 GC 정리도 연결했어요. 새 GPU 자원·읽기·텍스처 전체 프레임 스캔은 없어요.

예산에 source 이미지, JS 객체 오버헤드, 활성/호출자 스냅샷, ray/기하 atlas, GPU 메모리는 포함하지 않아요. 변환 도중 임시 메모리도 별도예요. 따라서 이 값이 전체 프로세스 RAM/VRAM의 강제 상한이라고 표현하면 안 돼요.

프로파일러의 CPU 광선 밉 캐시 표에서 예산 MiB와 캐시 비우기를 조작해요. 작은 사용량은 B/KiB로 표시해 0.00MiB로 숨기지 않아요. AI는 동일한 `profiler.rayMipCache` 명령으로 조회/설정/비우기를 해요.

```json
{"method":"profiler.rayMipCache","params":{"budgetBytes":67108864}}
```

`clear:true`는 변환 재사용만 비워요. 잘못된 예산과 clear를 함께 보내면 설정/비우기 전 거부해요. `profiler.read.rayMipCache`, 세 실행 렌더러의 진단, `schema.rayMipCache`에 수치/정책/비용/한계를 공개해요. 정상 프레임 추가 작업은 캐시 조회의 O(1) 순서 갱신이고, 버퍼 계산은 변환 체인을 저장/변경할 때만 해요. GC 정리 시각은 실행 환경에 달려 있어요.

## 실행 근거

- 749: 실제 rayMipChain에서 바이트 계산·linear/sRGB·필터 공유·최근 사용 항목 보존·0/축소·명시 해제·이전 스냅샷과 잘못된 예산의 원자성을 검증했어요. 명시적 Node GC로 텍스처 소유자가 보관되지 않고 불필요한 변환도 정리되는 것을 확인했어요.
- 750: 실제 격리 편집기의 schema/API와 도킹된 프로파일러 UI를 사용했어요. 10개 변환3360B를672B로 줄이면2개가 남고, API·사람 입력이 같은 풀을 조작해요. 비우기 뒤 원래 스냅샷도 유효해요. 캡처로 단위/글꼴/배치를 확인했어요.
- 751: 네 텍스처 자료형 × 네 샘플 모드의 현재/이전 Float32 atlas가 예산256MiB와 보관 끄기에서 모두 바이트 단위로 같아요. fixture 해제 뒤 남는 캐시0도 확인해요.
- 실제 C++/블루프린트 DirectX 패키징496의 `--normal-footprint --mip-cache`: 활성 경로에서 캐시 보관을 끈 뒤 모드 전환/원복·광선 샘플·캡처·컴파일 작업자 유휴0을 검증했어요.
- 기존726의8조합 기본 버퍼 공유/필터 전환/버전,109밉/이력,724공간 상수 의존성, 생성 API/네이티브 코드 일치도 유지돼요.

프로젝트 파일/캐시의 디스크 사용량을 늘리는 기능이 아니에요. 전체 FPS 향상이나 GPU 상주 한도 준수도 주장하지 않아요.

## 이번 새 원문 읽기와 설계 대조

[Unreal5.8 Texture Streaming Overview](https://dev.epicgames.com/documentation/unreal-engine/texture-streaming-overview-for-unreal-engine?lang=en-US)의 반환 본문44줄 전체를 읽었어요. HB의 다음 GPU 단계는 뷰/월드 요구→이상 해상도→가능 예산→우선순위→전환 요청 순서로 구성해요. 가시성·강제 요청·최근 사용을 함께 다뤄야 해요. 연결된 포맷/빌드 페이지는 이번 읽기로 계산하지 않아요.

[Unreal5.8 Texture Streaming Metrics](https://dev.epicgames.com/documentation/unreal-engine/texture-streaming-metrics-in-unreal-engine?lang=en-US)의 반환 본문109줄 전체를 읽었어요. 다음 GPU 구현은 원하는 해상도, 배정된 해상도, 실제 상주/진행 중 요청을 구분해야 해요. 크기 전환에 필요한 새 리소스 임시 메모리와 일반 텍스처도 예산에서 빼놓으면 안 돼요. 문서의 성능 수치를 HB 성과로 사용하지 않아요.

Unity6000.7 **Beta**의 [스트리밍 개요](https://docs.unity.com/en-us/engine/6000.7/manual/materials-and-shaders/textures/texture-loading/texture-streaming)는 본문180–202줄을 읽었고 목차를 상세 분석으로 계산하지 않아요. [소개](https://docs.unity.com/en-us/engine/6000.7/manual/materials-and-shaders/textures/texture-loading/texture-streaming/introduction) 본문181–208줄은 UV/메시/카메라로 요구 밉을 구하고 여러 사용처의 가장 높은 요구를 취하는 흐름과 배열/3D 등의 명시 한계를 다뤄요.

[설정](https://docs.unity.com/en-us/engine/6000.7/manual/materials-and-shaders/textures/texture-loading/texture-streaming/configure) 본문181–264줄은 카메라 참여/바이어스·공통 예산·최대 축소·런타임 제어예요. [밉 덮어쓰기](https://docs.unity.com/en-us/engine/6000.7/manual/materials-and-shaders/textures/texture-loading/texture-streaming/override-mipmap-level) 본문181–226줄은 우선순위, 요청/완료/해제, 강제 요청도 품질/예산 제약을 받는 흐름이에요. 이 링크들의 API 본문 전체는 아직 미독이며 별도 추적해요. 새 Beta 출처를 기존 Unity 전체 gate 통과로 처리하지 않아요.

## 계속할 GPU 제작 범위

1. 실제로 높은 밉을 제거한 GPU 리소스와 원본 논리 밉 번호를 구분해야 해요. 단순 샘플 LOD 바이어스는 메모리를 줄이지 않아요.
2. 명시 LOD는 원본 수준에서 resident base를 빼고, 자동/바이어스/gradient는 실제 축소 치수의 도함수를 사용해야 해요. 일반·노드·광선·네이티브 경로를 일치시켜야 해요.
3. 원본 레벨의 부분 갱신과 현재 resident view의 레벨을 구분하고, 전환 시 이전 자원/뷰의 수명과 이력 무효화를 보존해야 해요.
4. GPU 상주/임시 예산, 우선순위/강제/완료/취소·비스트리밍, 가시성/UV 요구, 디스크 비동기 밉 I/O를 실제 실행까지 연결해야 해요.

이 범위와 전역 곡면/투명 경로 역해·복합 확률 매질·초기 GL 준비 비용 및 다른 누적 엔진 항목을 이어가요.
