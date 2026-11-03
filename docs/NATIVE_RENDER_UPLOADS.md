# 네이티브 렌더 자원 전송

게임의 이미지·스프라이트·머테리얼 API는 그대로 사용해요. 네이티브 실행기가 `binaryResourceUpload: 1`을 응답하고 실행 브리지가 `postBinaryMessage`를 지원하면 픽셀 업로드만 바이너리로 전송해요. 기존 실행기와 WebView 브리지는 원래 JSON/base64 경로를 사용해요. 화면 해상도·색 공간·필터·밉·게임 시간을 바꾸지 않아요.

## 소유자와 계약

- `native-scene-renderer.js`: 협상 후 텍스처·명시 밉·부분 영역·광선 atlas에 같은 바이트 인코더를 전달해요.
- `NativeUploadBytes`: 렌더 인코딩 시점의 바이트를 분리해요. 다음 시뮬레이션이 원본을 바꿔도 전송 중인 픽셀은 변하지 않아요. 전역 텍스처 캐시를 추가하지 않아요.
- `nativeUploadBatches` / `nativeBinaryUpload`: 기존 자원 순서와 4MiB 권장 묶음을 유지해요. 개별 자원이 더 크면 단독으로 보내며, 메타데이터와 실제 바이트를 합친 128MiB 경계를 검사해요. JSON에 큰 바이트 배열이나 base64 문자열을 만들지 않아요.
- `writeNativeRenderBinary`: 같은 stdout 스트림에 헤더·UTF-8 메타데이터·픽셀 뷰를 연속으로 기록해요. 자원별 기존 요청 ID와 ACK를 유지하며 다음 업로드는 앞 요청의 결과를 기다려요.
- `NativeRuntimePackets`: 별도 수신 스레드에서 청크 단위로 JSON 줄과 바이너리 프레임을 구분해요. 큐는 기존 8개 한도를 유지해요. EOF의 미완성 헤더·본문은 오류로 처리해요.
- `SceneRenderBridge::command`: 바이너리 범위를 검사한 뒤 기존 GPU 텍스처 생성·부분 갱신 경로에 동일 바이트를 전달해요. 이전 JSON 문자열 처리도 남아 있어요.

내부 헤더는 little-endian 16바이트예요. magic `0x52424800`, JSON 길이, 바이너리 길이, 버전 `1` 순서예요. 기존 `rgbaBase64` 필드는 바이너리 협상 때만 `{"$binary":[offset,length]}`로 전달해요. 범위는 unsigned 정수 둘이어야 하고 길이가 양수이며 실제 본문 안에 들어가야 해요. 이 표현을 게임 저장·공용 에셋 포맷으로 사용하지 않아요.

## 확인 근거

`tools/check-native-binary-upload.mjs <이전 엔진> <후보 엔진>`은 실제 숨김 DirectX 실행기에서 8MB 텍스처 12회 업로드·최종 화면 픽셀·오류 뒤 지속 실행을 비교해요. `--packing-only`는 float/half·2D/큐브/배열/볼륨·명시 밉·부분 영역·광선 atlas의 바이트와 원본 변경 격리를 빠르게 확인해요. `native-runtime-packets-fixture.cpp`는 64개 청크 크기와 잘못된/잘린 프레임을 검사해요.

실제 게임의 이전·수정 엔진 비교와 최종 PE·모듈·콘텐츠 근거는 `research/ENGINE_WORK_3436.json`에 있어요. FPS 상한이 있는 실행과 `--uncapped` 처리량을 구분해요. 업로드 구간 시간과 전체 프레임 시간을 서로 대신 사용하지 않아요.
