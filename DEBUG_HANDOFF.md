# 현재 진단 — 400 검증 완료·설치 대기

설치395 `cb187b8f7a0959e2`/3232파일/Versions1은 검증 완료 상태로 유지해요. 현재 GPU 타이머·프로파일러 변경은 소스에서만 진행 중이에요. 과거 경위는 Git 이력과 `docs/research/ENGINE_WORK_390.json`, `ENGINE_WORK_395.json`, 각 native/build 증거를 참조해요.

## 해결한 UI 조건과 원래 실패

- `gpu-timing-399-nZaGgl/ui-layout.json`: GPU 보기 details428.28125–556.5625, 첫 행498.78125–531.78125/둘째531.78125–564.78125. 마지막 행8.21875px잘림. GPU값/기록/해제의 이전 실행은 통과했지만 전체 가시성 조건은 실패예요.
- 처음 `zQ2mLy`는 머테리얼 작업공간 전환으로 기존 프로파일러가 주차되어 rect0이었어요. 주차된 프로파일러는 하단에 다시 열고 해당 작업공간에서도 열도록 검사했어요.
- GPU 전용 보기·CPU 차트 숨김은 현재 캡처에서 동작해요. 스타일은 기존 `ui-editor.css` 소유예요. 남은 문제는 행 padding과 작은 도킹 높이예요. 해결한 활성화/차트를 다시 추측하지 않아요.
- padding7→4px 후 최종 GL wa4lfO/GPU3FU0uH는 같은폰트·전체가시성조건을통과했어요. threshold·창크기완화없음. GPU보기에서숨긴CPU차트/샘플생성도생략해요.

## 통과한 진단과 보존 조건

- `gpu-timing-396-cpu.json`: off query/read0, GL4상한, GPU256슬롯/두2048B버퍼/한 read in flight, 소유권·지연해제/stale거부/외부쿼리보존/overflow미게시/draw오류보존.
- 실제 `gpu-timing-397-NdjjYb`: 두 API 지원·3표본·같은 픽셀/모든 소유자 해제. GL0.012288/GPU0.065536ms는 지정16패스/256px 표본이며 FPS/전체프레임 시간이 아니에요.
- `gpu-profiler-398-cpu.json`: 같은 UI/AI 기록 setter·idempotent callback/clear·NULL/escape/불변 schema.
- 이전399 `vcquu0` GL·`9yQ8Bk` GPU는 인간record/AIread-stop/clear·메인/머테리얼·원본revision/SHA·종료0 통과. 이후 강화한 전체 가시성은 별도 미통과예요.
- 첫397은 fixture의 renderer→material 해제 순서로 Three Nodes.usedTimes 실패. 기존 앱과 같은 material/geometry→renderer로 고쳤으며 제품 수명 변경이 아니에요.

## 이전 미달을 완료로 계산하지 않기

- 391 최초4배MSE목표는 `originalFourfoldTargetMet:false`. 현재지정조건12.8735→11.3237과실제bake145.9778/독립146.4060·수학/제작연결만근거예요. 후보관찰은 `native/build/hdri-391-quality*.json`에 보존했어요.
- 385 native 원래 full invocation은 Lens입력 오류로 실패. 실제VP로수정한 같은binary118/117 resume+이미완료120구역만세고전체도구통과로바꾸지않아요.
- 전체문서/API gate·전역곡면역대응/RND06/고급매질·누적 엔진 목표는 `ENGINE_STATUS.json`이 정본이에요. 등록78개는 전체엔진 분모가 아니에요.

최종397은실제32render+1compute와독립정수출력·map진행중stop/retiring1/최종소유자0/stale미게시도통과했어요. 처음16pass라는fixture예상은r180 HDR+output 두패스를읽고32로고쳤으며제품counter/조건을낮추지않았어요. 다음은source/원장commit과설치400두API UI+현재owner의native350 gate예요.
