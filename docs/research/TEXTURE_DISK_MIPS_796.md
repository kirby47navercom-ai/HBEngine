# 789–796 · 디스크 밉 읽기와 취소·소유권

## 제작과 실행

텍스처2D 에셋에 원본과 마지막1×1까지의 사용자 지정 밉 이미지를 지정한다. 기존 미리보기가 원본 크기를 읽은 뒤 속성의 **디스크 밉 사용**으로 활성화한다. 너비·높이를 추측하지 않으며, 다른 원본의 오래된 미리보기 크기는 사용하지 않는다. 이미지/밉 구조나 지원하지 않는 가져오기 정책을 바꾸면 디스크 모드를 해제한다. 일반 이미지·자동 밉 생성 경로는 유지한다.

예를 들어4×4 원본,2×2/1×1 사용자 지정 밉을 가진 텍스처의 설정은 다음과 같다.

```json
"streaming": {"enabled": true, "width": 4, "height": 4, "initialMip": 2}
```

`initialMip:2`이면 처음에는1×1 이미지 하나만 요청한다. 기존 `hb::Materials::SetResidentMip(actor,"Bands",0)` 또는 `materialResidentMip` 노드는 필요한 원본 밉 꼬리를 비동기로 읽고 준비된 새 view를 원자적으로 적용한다. 보간/명시 LOD는 기존 논리 원본 수준을 유지한다. 자동 카메라·예산 선택에는 기존 **TextureStreaming** 컴포넌트를 사용한다. 이 컴포넌트가 없으면 초기 수준이 명시적인 다음 요청까지 유지된다. 풀이 꺼질 때는 수준0을 다시 읽어 복원한다.

기존 참조 수집·이름 변경·패키징은 사용자 지정 밉 이미지 경로를 모두 포함한다. 별도 캐시 파일·밉 컨테이너·원본 사본을 생성하지 않는다. 현재 모드는 무결한 원본 스냅샷을 만드는 쿠커가 아니라 기존 이미지별 밉을 필요할 때 읽는 경로다. 외부에서 파일을 변경한 경우까지 한 버전으로 고정하는 기능은 아니다.

## 메모리·취소

활성 view와 적용 대기 후보만 디코딩한 꼬리를 pin한다. 같은 source의 읽기는 밉별로 공유하며, 한 소비자의 취소는 다른 소비자가 사용하는 요청을 끊지 않는다. 마지막 소비자가 사라지면 해당 이미지 요청을 중단하고 사용하지 않는 디코딩 수준을 놓는다. 해제한 디스크 view는 종료된 객체이며, 복원에는 새 view를 준비한다. 해제 view의 이미지 데이터·밉 목록도 제거한다. 현재 Source/GPU resource의 identity를 바꾸지 않아 기존 GPU 해제 콜백은 그대로 동작한다.

머테리얼은 파라미터별로 대기 요청과 준비 후보를 소유한다. 다음 요청·상주 전환·머테리얼 해제는 이전 요청과 완료됐지만 적용하지 않은 후보도 취소한다. 기존 호출자가 받는 오래된 transaction은 `valid/commit:false`를 유지한다. 여러 sampler 중 하나가 실패하면 나머지도 취소하며 첫 오류를 유지한다.

밉 쿠커는 queued job을 제거하고 active module worker만 종료한다. 다음 job은 새 worker에서 진행하며 명시적으로 transfer한 입력과 일반 호출자의 입력을 구분한다. 작은 local job은 시작 전 취소를 확인하지만 이미 실행 중인 동기 JS 계산을 중간에 끊지는 않는다. 성공·실패·취소 뒤 abort listener를 제거하고 기존 idle 종료를 유지한다. 가져오기/배열·볼륨·큐브 이미지 로더는 소유 이미지의 요청을 취소한다. 원본 이미지를 직접 사용하는 기존 TextureLoader는 전송 중단 대신 늦은 결과를 해제하는 경계를 유지한다.

`textureDiskMips`·`textureImport.cancellation`은 불변 AI 스키마다. 머테리얼의 `pendingRequests/stagedRequests`, binding의 `residency.disk`에서 읽기 시도·현재 읽기·공유 캐시의 decoded/logical RGBA8 payload를 확인한다. `reads`는 이미지 로드 시도이며 브라우저/운영체제 캐시를 제외한 실제 디스크 접근 횟수는 아니다.4/20/84바이트는 압축 이미지 파일 크기나 전체 RAM/VRAM이 아니라 디코딩한 RGBA8 꼬리다. 브라우저 이미지/네트워크 캐시·외부에서 보관한 객체·드라이버 heap까지 계량하지 않는다.

## 검증

- 790qdqUsa: 실제 worker에서 queued transfer 입력 보존, active transferred cook 종료, 다음 worker의 CPU oracle 일치, local/pre/settled 취소와 idle0. 실제 지연 HTTP 이미지2개가 선택 변경/해제 때 연결 종료, 최신 빨간 픽셀과 owned0.
- 791:6개 설정·6개 정책 거부,5×3→2×1→1×1 크기와60/8/4B, 공유 꼬리 lease와 이중 dispose, 사전 취소0읽기, 미리보기 identity, 불변 스키마.
- 792QwFx8k: 실제 프로젝트 파일·GL/WebGPU 픽셀 기존4e-5. 최초 이미지1개/decoded4B, 수동4→20→84→4→84B와 재읽기, 자동 풀4B/해제84B, 동일 프로그램, 디스크 영역 수정 거부, 최종 source0.
- 793UEMPXC: 새 패키징 게임14개 콘텐츠 의존성, 설치와 같은 SDK/Player의 C++3상태·블프 F/C·D3D 래스터/경로 추적8상태와 색/상주 데이터 확인. 시험 camera를 실제 cube 중앙에 맞춘 것은 harness 수정이다.
- 794PRlyGY: 실제 사용 버튼이 미리보기4×4에서 설정을 생성, Undo/Redo, AI CAS 패치·저장·스키마와 캡처. revision·operations 인자를 고친 것은 harness 수정이다.
- 795ke06vm: 실제 지연 HTTP의 공유 읽기1개는 한 소비자 취소 뒤 유지, 나머지 소비자에게 전달. 진행/완료 후보 교체 및 dispose가 fine 데이터와 stage0을 복원.2개 실제 연결 종료. 시험 캐시 우회 URL은 관측을 위해서만 사용한다.
- 796:기존 머테리얼 transaction·가져오기/합성·상주/영역/풀/사용자 지정2D와 native/API 생성 일치12회귀·JS20구문.453BrGKRn 기존3worker/clone/transfer/idle,759aGf5q2 네자료형×GL/WebGPU8조건 최대2.455e-8도 통과.
- 797IBbgm2:실제5×3 세로 색 행의 모든 밉 바이트가 기존 가져오기+행 반전 결과와 같고, 첫 업로드 픽셀은 하단 파랑이다. 크기가 다른 파일의 fine 후보는 거부/해제하며 현재 coarse를 보존하고, 종료한 view의 직접 픽셀 참조도 제거했다.

최초 모드/캡처 실패와 개발 도중의 실패 기록은 별도 보존한다.795에서 dispose 후 진단이 빠진 `.data.byteLength`를 읽던 실제 오류를 고쳐 종료된 sparse source도 안전하게 조회한다. 첫 generic WebView 생성 HRESULT 실패1회는 source 오류 없이 새 고유 profile에서 이어 실행됐으며 제품 성과로 세지 않는다.

## 근거·남은 확장

[Unity6000.7 Beta requestedMipmapLevel](https://docs.unity.com/en-us/engine/6000.7/script-reference/unityengine/texture2d/requestedmipmaplevel)의 Definition/Remarks/예제911–938을 재대조했다. 요청 수준과 예산의 관계, 요청 해제 구분을 참고했으며 HB의 수동 pin 초과 보고 정책과 같은 구현이라고 주장하지 않는다. 관련 최소/현재 로드 수준·priority의 이번 버전 본문까지 읽었다고 세지 않는다.

[MDN throwIfAborted](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/throwIfAborted)의185–239에서 취소 이유 전달과 비동기 반복의 확인 지점을 대조했다. [Response.arrayBuffer](https://developer.mozilla.org/en-US/docs/Web/API/Response/arrayBuffer)의185–225도 확인했지만 현재 이미지 로더를 fetch로 바꾼 근거로 쓰지 않는다. 검색에 나온 Unity7000/이전 버전·기타 관련 항목은 색인 발견이며 전체 본문 분석이 아니다. API의 링크 전체나 두 엔진 전체 조사 완료를 뜻하지 않는다.

디스크 모드는 현재 **2D 사용자 지정 이미지 꼬리**에 한정한다. 커버리지/노멀·거칠기 합성/녹색 반전/노멀 재정규화/상위 필터를 적용한 자동 쿠킹·청크/압축/HDR/raw·다른 차원·전체 heap/정확한 보조 뷰 수요는 남아 있다. 디스크 source의 런타임 영역 수정도 읽기 전용으로 거부한다. 일반 상주 텍스처의 기존 영역 수정 기능은 유지한다. 전체 렌더링·엔진 원장의 잔여를 이 기능으로 대체하지 않는다.
