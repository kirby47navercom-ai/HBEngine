# 프레임 리소스와 비동기 회수 047 — 2026-10-07

## 적용한 경로

046 DirectCompute 계산 경로에 프레임별 상수 버퍼3개를 추가했어요. 크기가 같으면 GPU 버퍼를 재사용하고 D3D11_USAGE_DYNAMIC/WRITE_DISCARD로 업로드해요. GPU가 이전 데이터를 사용하는 동안 드라이버가 저장 공간을 분리해요. 버퍼3개만 돌리는 것으로 안전하다고 가정하거나 WRITE_NO_OVERWRITE로 사용 중인 내용을 덮어쓰지 않아요. 크기 변경도3개 모두 생성한 뒤 교체해요.

FrameResources는3개의 staging 버퍼와 완료 EVENT query를 소유해요. enqueueFrame은 GPU 복사→End→Flush 후 실행 일련번호를 기록해요. 회수 전 슬롯은 다시 사용하지 않으며3개가 찬 경우 false를 반환해 기존 결과를 보존해요. pollFrame은 DONOTFLUSH로 완료를 확인하고, 준비된 경우에만 READ/DO_NOT_WAIT로 Map해요. 미완료/아직 사용 중이면 즉시 빈 값을 반환하고 내부 대기 반복을 하지 않아요. Flush가 제출에 있으므로 별도 swapchain이 없는 C++ worker에서도 명령이 진행돼요.

Device.createFrameResources/enqueueFrame/pollFrame과 Particles.enqueueReadback/pollReadback/pendingReadbacks를 제공해요. 기존 동기 read도 명시적인 현재 결과 조회로 유지해요. reset은 이전 비동기 스냅샷을 폐기하고 Release/destructor가 슬롯/query/버퍼를 해제해요. 다른 장치·다른 버퍼 크기·이동된 자원은 거부해요. GPU 상태와3개의 결과 복사본이므로 사용자가 비동기 회수를 선택하면 그 메모리 비용은 발생해요. 모든 게임에 자동 할당하지 않아요.

[GPUActor 예제](../examples/GPUActor.h)의 DispatchGPU/PollGPU/ReleaseGPU는 기존 C++·BP 공용 호출 경로로 이어져요. Dispatch는 GPU 시간을 진행하고 결과 큐가 찼으면 스냅샷 수락 여부를 false로 알려요. Poll은 최대3개의 완료 스냅샷만 적용해요. 비동기 결과는 이전 프레임의 상태예요. 현재 프레임과 정확히 맞아야 하는 CPU 충돌·게임 규칙에 지연된 위치를 무조건 사용하는 방식은 아니에요.

공용 WebGL 파티클 렌더러는 위치/색상/크기 GPU 버퍼를 DynamicDrawUsage로 생성하고 살아 있는 범위만 갱신해요. 매 프레임 파티클 데이터 배열·geometry를 새로 만들지 않고,0개면 업로드 요청을 하지 않아요. 카메라별 정렬·월드/로컬 변환·2D 마스크/색상/크기·자원 소유권을 유지해요.3개/최대1000개 설정에서 갱신 범위는96바이트이고 기존 전체 배열은32,000바이트예요. 최초 전체 버퍼 할당과 실제 드라이버 비용은 이 수치에서 제외해요. 이미 동적 범위 업로드를 쓰던 탄막 경로는 재작성하지 않았어요.

## 검증과 실제 한계

- 실제 GPU 코어: native/build/gpu-compute-90zRwE/acceptance.json.3slot 가득 참/덮어쓰기 방지, FIFO4개 스냅샷과 일련번호,재사용,외부 장치/크기 거부,상수 버퍼 할당3회 유지,reset 이전 결과 폐기 PASS. 실제 완료 poll 최대0.0028ms는4float 버퍼의 이번 표본이며 큰 버퍼/전체FPS를 뜻하지 않아요. 기존65,537레코드의 CPU·GPU 모든 값 비교/부분 작업 그룹과 Android2ABI 헤더 컴파일도 PASS.
- 공용 렌더러: node tools/check-particle-renderers.mjs PASS. 동적 usage·활성 구간·배열 동일성·0개 업로드 없음·7가지 정렬/카메라·기존C++/BP/AI 컴포넌트 경로를 확인했어요. 정확한 source SHA는 native/build/frame-resources-renderer-047.json이에요.
- 실제 release Player: native/build/gpu-compute-window-0EJH77/acceptance.json PASS.2D 스프라이트와3D 메시가 BP→C++→실제 compute로 이동하고,3개의 비동기 제출은 CPU 위치를 즉시 바꾸지 않으며 Poll에서 완료 위치를 적용해요.해제 뒤 Poll 안전·버퍼 유지/재생성·공용 파티클3개/셰이더·원본·오류0·종료0·소유 서버 종료를 확인했어요. current source SHA를 대조했어요.
- Dth6dW는 검사에서 비동기 Release의 완료 전에 읽은 경합으로 실패했고, 제품 지연을 숨기지 않고 완료 조건을 기다리도록 검사만 수정했어요. 중간 fixture의300초 수명은 기존 컴포넌트60초 규격으로 생성 전에 거부돼60초로 수정했어요. 사용자 프로젝트나 규격 제한을 바꾸지 않았어요. 실패를 성공으로 세지 않아요.
- 이 변경은 네이티브 계산 경로의 프레임 리소스와 공용 WebGL 업로드 비용이에요. WebGL 씬을 DirectX 렌더러로 바꾸거나 네이티브 GPU 버퍼를 WebGL이 직접 소비하는 이식은 아니에요. CPU 게임 로직/물리/C++ IPC 비용·전체FPS·모바일 GPU/실기기까지 해결됐다고 주장하지 않아요. Android/iOS 산출물은 새로 빌드하지 않았어요. 사용자 창·게임·프로필·기존 프로세스는 보존해요.

## 공식 본문 근거

- [dynamic-resources](https://learn.microsoft.com/en-us/windows/win32/direct3d11/how-to--use-dynamic-resources): own dynamic usage/create/map instructions and buffer remarks (web lines38–145); linked children excluded.
- [get-data](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/nf-d3d11-id3d11devicecontext-getdata): own syntax, parameters, S_OK/S_FALSE and immediate-context/End remarks (web lines32–78).
- [getdata-flags](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/ne-d3d11-d3d11_async_getdata_flag): own syntax and DONOTFLUSH/infinite polling caveat (web lines32–46).
- [map-flags](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/ne-d3d11-d3d11_map_flag): own syntax, DO_NOT_WAIT/error and incompatibility with WRITE_DISCARD (web lines32–52).

원문 HTTP200·SHA·읽은 범위는 native/build/frame-resources-docs-047/manifest.json이에요. 링크/다운로드를 전체 문서·API 분석으로 세지 않아요.
