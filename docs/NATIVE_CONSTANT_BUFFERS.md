# DirectX 상수 버퍼 전송

`SceneRenderer`는 프로브와 2D 상수의 실제 GPU 버퍼 3개마다 마지막으로 **전송에 성공한 바이트**를 보관해요. 같은 슬롯의 내용이 같으면 Map/Unmap만 생략하고 버퍼·텍스처 바인딩은 계속해요. 반사 텍스처만 바꾸는 경우에도 새 이미지가 적용돼요. 값이 달라지면 해당 슬롯에 다시 전송해요.

- 공개 SDK: `HBEngine/ConstantBufferCache.hpp`, `hb::gpu::ConstantBufferCache<T, Slots>`.
- 조회: `hb::gpu::SceneRenderer::constantBufferStats()` 또는 `player.inspect().renderer.constantBufferCache`.
- `probeUploads`, `probeSkips`, `twoDUploads`, `twoDSkips`는 렌더러 수명 동안 누적돼요. `retainedCPUBytes`는 현재 두 캐시의 고정 CPU 메모리예요.
- `shouldUpload`는 새 값을 확정하지 않아요. GPU 전송이 성공한 뒤 `commit`해야 해요. 실패한 전송은 다음 시도에서도 필요 상태로 남아요. 버퍼를 재생성한 사용자는 `invalidate`해야 해요.
- 비교는 바이트 단위예요. 패딩은 호출자가 초기화해야 하고, 음의 0과 NaN 표현도 다른 바이트면 다시 전송해요. 현재 Scene2D와 ProbeSettings는 float 배열로 초기화해요.

실제 D3D11에서 서로 다른 월드 변환의 3,000회 draw는 각 그룹 3회 전송·2,997회 생략을 기록했어요. 1368 당시 CPU 캐시는 렌더러당 1,584바이트이고 GPU 버퍼·텍스처·작업자·타이머는 추가하지 않아요. 2D 마스크·정렬 레이어 광원·블렌딩·쿠키·자유형 조명·스텐실 복원도 같은 실행에서 확인했어요. 프로브 값 변경은 모든 슬롯에 도달하고, 상수 값이 같은 빨강/초록 반사 이미지 교체도 표시돼요.

월드·머테리얼·모션의 main 상수는 기존처럼 draw마다 전송해요. 바뀌는 값이 번갈아 나오는 장면은 전송이 필요해요. 이 결과는 Map 호출 절감의 증거이고 전체 게임 FPS를 보장하는 수치는 아니에요.

재현: `node tools/check-constant-buffer-cache-1367.mjs`, `node tools/check-scene-constant-cache-1368.mjs`. 후자는 `--executable`로 설치본의 네이티브 헤더를 선택할 수 있어요. 실제 사용자 프로젝트나 프로필은 사용하지 않아요.

1407 이후 독립 반사 투영은 ProbeSettings를 128→208바이트로 확장해요. 두 프로브와 비활성 슬롯을 담는 기존 3슬롯 버퍼 때문에 CPU 캐시는 2,304바이트(+720), 기존 GPU 버퍼도 총 +720바이트예요. 버퍼 개수는 같아요. [프록시 계약](PROBE_PROJECTION.md)과 후속 검사 기록이 현재 크기·전송 증거예요.

1424 이후 면별·노멀 페이드는 ProbeSettings304B·아틀라스320B예요. 기존3슬롯의 CPU 캐시는3,168B이며1420보다864B 늘어요. GPU 상수 저장공간도864B 늘고 버퍼 개수는 같아요. 현재 검사값은 후속 ENGINE_WORK의 cache 회귀 기록을 확인해요.
