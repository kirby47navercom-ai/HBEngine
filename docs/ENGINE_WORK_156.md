# 156–164 — 현재 원장·렌더 준비·오디오 제작 묶음

2026-10-16. 오래된 잔여 목록과 이후 구현/검증 기록을 대조하고 실제 제작 기능을 이어서 구현한다. 기능 이름만 추가하거나 과거 검증을 새 기능의 실제 성공으로 올리지 않는다.

## 현재 상태를 읽는 한 경로

[ENGINE_STATUS.json](research/ENGINE_STATUS.json)이 구현 범위·구체적 잔여·코드 소유자·근거를 가진 기준이다. [사람용 문서](ENGINE_STATUS.md)는 같은 JSON에서 만들고 검사한다. WORK_ORDER의 초기 계획은 과거 기록으로 분리했으며 연구/제작 문서의 이전 미구현·research_only·개수 표현이 최신 상태와 혼동되지 않게 연결했다. 개별 verified는 그 행의 좁은 범위이며 전체 UE/Unity API 분모나 상용 엔진 전체 완료율이 아니다.

`node tools/hb.mjs status --local`은 창과 서버 없이 같은 데이터를 읽는다. `GET /api/engine/status`는 id/area/status/search를 필터링하며 등록 전체 수와 일치 수를 구분한다. 입력 필터·항목 상태·ID 중복·증거 경로·사람 문서 동기화를 검증한다. 프로젝트/런타임 변경·새 폴링 타이머는 없다.

## GL 준비와 가이드

GL은 각 프로그램을 기다린 뒤 다음 프로그램을 제출하던 방식에서 독립 프로그램을 모두 제출한 다음 완료를 확인하는 방식으로 바꿨다. 준비 중 기본 래스터·캡처 대기·취소/에러·타깃 복원 계약을 유지한다. 동시에 준비하므로 각 단계의 벽시계 시간은 서로 겹칠 수 있어 합산 시간을 GPU 비용으로 해석하면 안 된다. 프로파일러와 AI는 같은 `concurrent`를 받는다. 드라이버가 실제로 병렬 컴파일하는지와 총 준비 시간은 실제 실행 결과로 따로 확인한다.

렌즈가 없는 법선 가이드는 사용하지 않는 이전 포즈/UV·미분 광선·CoC 작업을 생성하지 않는다. 이전 공용 알고리즘을 소스로 사용하고 검증된 구역만 제거한다. 렌즈 없는 보조 가이드는 미분 저장2칸과 기존 곡면/시간 재투영을 유지한다. 렌즈가 있으면 원래 전체 소스와 이른 거절 조건을 그대로 쓴다. 공간/시간 필터는 기존 이미지 전용 코드다. 모드 변경 시 가이드 머테리얼만 다시 준비하며 이미지/공간 필터는 재사용한다. 네이티브 공용 GLSL/HLSL 계산 본문은 바꾸지 않았다.

## 가중 스냅샷과 전환

`AudioMixer::TransitionToSnapshots(actor, asset, names, weights, duration, curve)`와 같은 선언에서 생성한 BP `mixerSnapshots`를 추가했다. 기존 `TransitionTo`는 기본 linear와 예전 `mixerSnapshot` 명령을 유지하며 선택적 curve를 받는다. 선택한 이름/가중치 수가 같아야 하고 가중치는 유한·0 이상·양수 합이어야 한다. 큰 숫자는 최대값으로 먼저 나눠 합산 오버플로를 피한다. 같은 이름은 합치고 정규화한다. 값은 저장된 단위(dB/Hz 등)에서 가중 혼합한다. bool은 가장 큰 합산 가중치의 스냅샷을 고르고 동률은 처음 등장한 것을 쓰며 전환 완료 때 바뀐다.

linear·smoothstep·easeIn·easeOut은 전환 전체의 곡선이다. 중단 시 현재 override 전 기본값에서 새 전환을 시작한다. SetFloat 재정의는 ClearFloat까지 유지한다. 잘못된 인자/이름은 기존 상태를 바꾸지 않는다. 진행 조회는 `runtime.audio.mixers[asset].transition`에 한정해 요청 때 생성한다. 새 매 프레임 로그나 스냅샷 기록 캐시는 없다. 믹서 갱신의 정렬된 버스는 인덱스로 대응시켜 반복 find와 Object.keys 생성을 줄였다.

속성 패널의 접이식 **스냅샷 혼합**에서 가중치·시간·곡선을 지정한다. 전환 듣기는 실제 그래프만 바꾸고 문서 revision을 유지한다. 값 적용은 같은 가중 계산과 기존 문서 Undo/저장을 사용한다. 기존 미리듣기 계측 타이머로 전환도 갱신하고, 직접 편집할 때 오래된 전환을 취소한다. 별도 창·HUD·긴 안내문·새 타이머를 만들지 않았다.

## 읽은 공식 근거와 미독

[Unity TransitionToSnapshots](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Audio.AudioMixer.TransitionToSnapshots.html)의 선언·매개변수·Description 자체 본문, [Audio Mixer Inspectors](https://docs.unity3d.com/6000.0/Documentation/Manual/AudioMixerInspectors.html)의 exposed parameters/transition overrides 구역을 읽었다. 공식 기능은 파라미터/대상 snapshot별 전환 설정도 있으므로 HB의 전환 전체 곡선과 구별하고 추가 항목으로 등록한다. 관련 그림·하위 API 전체는 미독이다. [MDN KHR](https://developer.mozilla.org/en-US/docs/Web/API/KHR_parallel_shader_compile)의 먼저 compile/link를 제출하고 완료를 조회하는 예제를 재대조했다. 전체 Khronos/Three/Unity/Unreal 코퍼스 분석 gate를 승격하지 않는다.

검증·실패·실제 시간/픽셀·설치 SHA는 `research/ENGINE_WORK_156.json`, `USER_INSTALL_156.json`을 따른다. 기존 월드/제작/프레임워크·2D/2.5D/3D·플랫폼·실기기/장시간 목표는 현재 원장에서 계속 유지한다.

## 162 — 대상 스냅샷의 파라미터 전환

선택적 snapshots[].transitions[bus][parameter]를 추가했다. 선형·부드럽게·시작/끝 완만한 곡선과 stepStart/stepEnd를 고른다. bool은 시작/끝 변경만 허용한다. 생략/해제하면 전환 전체 기본값을 상속한다. 가중 전환은 각 대상의 곡선을 먼저 계산한 뒤 가중합하며, bool은 합산 가중치가 가장 큰 대상의 설정을 쓴다. SetFloat는 계속 우선한다. 진행 중 설정을 바꾸면 다음 전환부터 적용하여 이미 시작된 계획이 흔들리지 않게 한다.

기존 버전1 파일에 필수 필드를 추가하지 않았다. 파라미터 전환은 현재 버스의 접이식 속성으로 저작하고 같은 Undo/저장을 사용한다. C++ AudioMixer::SetSnapshotTransition/ClearSnapshotTransition과 같은 선언에서 만든 BP 두 노드, AI document.patch/runtime.audio가 같은 자료와 검증을 사용한다. 런타임 설정은 로딩한 복제본만 바꾼다. 버스 삭제 시 관련 전환도 제거한다.

## 163–164 — 2D 클립 리타게팅과 반환 핀

Sprite Rig의 클립 가져오기에서 원본 리그·클립·뼈 대응·이동 방식을 고른다. 이름 일치 자동 대응과 안정 ID 직접 대응을 지원한다. 같은 부모 계층에서 회전은 대상 bind 회전에 원본의 bind 대비 차이를 더하고, 크기는 bind 비율을 옮긴다. 이동은 부모 뼈 길이 비례·그대로의 상대 이동·이동 제외로 나눈다. 루트 이동은 루트 길이 비례다. 키 시간·linear/step·반복·전체 회전값을 보존하고 재표본화하지 않는다. 대상 메시/UV/가중치/IK와 원본 파일을 바꾸지 않는다.

rig.clip.retarget은 문서 revision·선택적 원본 revision·dryRun·기존 Undo/Redo/저장을 사용한다. 사람이 여는 폼도 같은 명령으로 제출한다. 중복 대응·부모 불일치·빈 트랙·키/값 한도·이름 충돌은 원자적으로 거절한다. 임의로 다른 체인을 보정하는 IK 리타게팅/실행 중 제약 베이크는 남은 목표다. 이는 Unity skeleton 공유 흐름을 참고한 HB의 bind 상대 변환이며 Unity PSD/skeleton 파일 호환이라고 주장하지 않는다.

새 실제 BP 연결 검사에서 SpriteSkin 3개/IK2D 5개 getter가 선언된 return 대신 result만 반환하던 기존 버그를 발견했다. 선언 핀 return을 공급하고 예전 직접 JS 조회용 result도 보존했다. 공용 8개 조회의 실제 BP 읽기를 검사하고 별도 C++와 연결했다.

[Unity 2D Animation10.2 Skeleton Sharing](https://docs.unity3d.com/Packages/com.unity.2d.animation@10.2/manual/ex-skeleton-sharing.html)의 자체 본문을 읽었다. 같은 skeleton 구조를 사용하는 샘플과 연결된 PSD/Library 역할을 구분한다. PSD Importer·Full Skin Swap의 연결 문서/미디어와 전체 패키지 API는 미독이다. CopyPasteSkele 주소는 도구 접근 실패로 읽음에 올리지 않았다. 검색에서 발견한7000.0 버전도 별도 미독 대상으로 등록한다.

## 묶음 검증과 성능 경계

CPU 첫 묶음12개와 확장 묶음10개, 격리 실제 Editor의 HTTP 상태 조회·실제 WebAudio 미리듣기·가중치/곡선 UI·문서 revision·Undo/Redo/저장·C++ 배열/구형 단일 스냅샷·파라미터 지정/해제·2D 리타게팅/골격 조회·원본/장면 보존이 통과했다. 자동 검사 그림을 열어 기존 믹서 속성과 리타게팅 폼의 글자/입력/배치를 검토했다. 별도 배포 Player 검증은 JSON의 구체적 결과를 따른다.

실제 GL HxDX4t는 복잡한 UV/노멀 텍스처·24성분 affine·접선/모프 법선·곡면/시간 필터·HDRI·해제/오류0/종료0을 통과했다. 직전151 지정 장면의 path8018/일반 가이드3817/시간필터7768ms와 이번7888/1203/7384ms를 보존한다. 일반 가이드 생성 본문은48616→38736B이며 같은 필터3255B를 재사용한다. 차가운 한 장면의 순차 측정이며 동시 A/B/FPS 증거가 아니다. 첫 path와 시간 가이드 총 준비 비용은 여전히 남는다.

실패도 보존한다. 초기 CPU import/C++ include·출력 경로, 실제 창의 선택 버스·포커스·짧은 전환 관측, 리타게팅 modal 공용 편집 거절, 기존2D 핀 불일치, 테스트 정리 prefix, Player 렌더 프로필/릴리스 캡처 정책을 구분했다. 픽셀 기준·타임아웃·표본·품질을 낮추거나 릴리스 캡처 금지를 해제하지 않는다. 새 상시 타이머/GPU 읽기/이미지 타깃/의존성을 추가하지 않았다.

실제 배포 추가 검증: D3D11 release R0IoBZ는728노드 공용 C++/BP·리타게팅 포즈·오디오/파라미터 지정/해제·오류0/종료0을 통과하며 release 캡처 금지도 유지한다. D3D11 development Z31BbY는 같은 경로와 실제 변형 스프라이트13676px를 확인했다. 원본/서버 해제를 검증했다. 4버스/2스냅샷/28개 숫자 전환의 Node CPU 갱신10000회 p95는0.0037ms였고 전체 게임 프레임 보장과 구분한다. 배포 제품과 현재 기능 소스SHA가 모두 일치한다.
