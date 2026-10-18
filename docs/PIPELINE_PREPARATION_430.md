# WebGPU 파이프라인 준비

후처리와 독립적인 필터의 파이프라인을 먼저 제출한 뒤 완료를 기다려요. 앞 파이프라인이 완성될 때까지 다음 필터의 제출을 미루던 순서를 없앴어요. 실제 드라이버가 몇 개를 병렬로 처리할지는 드라이버 정책에 따라 달라요.

설치된 Three r180의 `Renderer.compileAsync`는 장치가 준비된 경우 렌더러 상태를 복원한 뒤 네이티브 파이프라인 Promise를 기다려요. 이 동작을 로컬 원본에서 대조했고, 비동기 생성의 준비·실패 계약은 [GPUWeb API 설명](https://gpuweb.github.io/types/interfaces/GPUDevice.html#createrenderpipelineasync)과 [MDN 메서드 설명](https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createRenderPipelineAsync)을 참고했어요. W3C 전체 본문은 도구 크기 제한으로 읽지 못했으며 전체 API 분석으로 계산하지 않아요.

실제 WebGPU 렌더러의 완료 Promise를 검사 도구에서 잠시 보류했을 때 기존 코드는 첫 완료 전에 1개, 수정 코드는 4개의 독립 파이프라인을 제출했어요. 보류 중 별도 래스터 화면과 완료 후 네 출력 색도 대조했어요. 이 검사는 제출 순서의 증거이며, 인위적 보류가 들어간 시간을 성능 향상으로 해석하지 않아요.

프로파일러와 AI 조회는 제출·완료·전체 단계 수를 같은 준비 상태에서 읽어요. 단계 시간은 서로 겹칠 수 있어 합산하지 않아요. 취소 시점의 진단을 보존하고, 실패하거나 취소된 준비에 늦은 완료 결과를 게시하지 않아요. 뷰포트의 렌더 타깃·MRT·색상·프레임 epoch·장치 메서드는 제출 직후 복원해요.

추가 GPU 버퍼·타깃·텍스처·운영 readback·워커·디스크 캐시는 없어요. 그래프 생성과 처음 셰이더를 컴파일하는 비용은 남아 있으며, 실행 중인 네이티브 컴파일 자체를 중단할 수는 없어요. AI는 `engineSchema().pipelinePreparation`에서 같은 계약과 한계를 조회해요.
