# 전체 문서·API 연구 상태

2026-10-06 후속: [034 광원 순서/겹침](2D_LIGHT_OVERLAP_034.md)에 Unity6000 자체 표·URP17.0.4 두 속성/enum·고정 셰이더/manager/utility 전체와 RendererLighting 일부 읽기/SHA를 기록했어요. 가산/알파·RGB와coverage·순서·마스크 후적용을 사람/AI/C++/BP에 연결하고 실제 GPU143/조명93을 확인했어요.6주소 발견 추가, 전체27계열/gate와 독립 Unity/미독 범위는 보존해요.

2026-10-06 후속: [033 공용2D 블렌드 스타일](2D_BLEND_STYLES_033.md)에 Unity6000.0 자체 설정 본문/표·URP17.0.4 자체 타입/name·동일 버전 공식 소스2개 전체 읽기/SHA와 곱셈·가산·감산·RGBA 반전 마스크 계약을 기록했어요. 기존 계열에4주소를 등록하고 전체 패키지/연결 API·설치 Unity 대조·corpus 완료 gate는 유지해요. 사람/AI/C++/BP/실제 렌더 연결 검사는 기능 구현과 함께 기록해요.

2026-10-06 후속: [032 스트리밍 수명](AUDIO_STREAMING_LIFETIME_032.md)에 고정 Chromium MediaElement/Handler/DeferredTask 6개 전체 읽기와 실제 읽기/SHA 후속을 기록했어요. 기존 발견 계열에6주소를 추가했고, PC 공용 source 재사용·옛 핸들/이벤트 격리·믹서 변경분 예약의 CPU 회귀를 통과했어요. 설치 revision·전체 메모리·8시간·모바일 검사는 별도로 유지해요.

2026-10-06 후속: [031 렌더 수명/진단](RENDER_LIFETIME_ANALYSIS_031.md)에 설치 Three0.180.0의 해제/프로그램 참조 경로, 고정 DevTools/V8의 HeapProfiler 강제GC 경로의 부분 읽기를 기록했어요. 파일 전체/설치V8 revision/전체corpus 완료로 계산하지 않아요. 실제 GPU20장면 참조 대조와 전체 메모리/8시간 검사는 구분해요.

2026-10-06 후속: [030 전용2D 그림자 계약](2D_SHADOW_CONTRACT_030.md)에 Unity6000.0 매뉴얼/URP17.0.4 자체API와 같은17.0.4 공식Graphics의22개 관련소스 전체 읽기를 기록해요. SpriteSkin/TrimEdge의 문서·소스 차이와 연결Clipper/UTess/Rendergraph·상속/API·미디어·독립검증을 미해결로 유지해요. 새 공식 구현 계열을 발견 대기열에 등록하며 전체corpus 또는 그림자 구현/검증 완료로 올리지 않아요.

2026-10-06 후속: [029 오디오 유휴 비용](AUDIO_IDLE_COST_029.md)에 AudioParam 이벤트 삽입·정리의 실제 부분 읽기, 설치 revision 조회 404, 자연 GC 대조와 공용 유휴 처리 중단·좌표 변경분 예약을 기록했어요. 같은 계열에 발견 주소 1개를 추가했으며 전체 읽기·설치 버전 대응·독립 검증·8시간 안정성으로 승격하지 않아요. Windows 전체 기능과 새 신호/유휴 검사 통과, 직전 iOS SDK/신호 통과, 최신 Android의 WebView 연결 시간 초과를 각각 보존해요.

2026-10-06 후속: [028 오디오 버퍼 수명](AUDIO_ANALYSER_LIFETIME_028.md)에 고정 Chromium 커밋의 Analyser 관련 8개 파일 전체 읽기·할당 대조·실제 Windows 신호 회귀를 기록했어요. 같은 계열에 8개 발견 주소를 추가했으며 설치 브라우저 버전 대응·연결된 FFT/할당/스케줄러·WebKit 본문과 독립 검증은 남아 있어요. Analyser 재사용으로 반복 대형 할당을 줄였다는 증거를 8시간 안정성이나 전체 본문/API 완료로 계산하지 않아요.

2026-10-06 후속: [025 필드 계약](PLAYER_LOOP_FIELDS_025.md), [026 공식 C# 참조 소스](PLAYER_LOOP_SOURCE_026.md), [027 진단 프로토콜 범위](DIAGNOSTIC_PROTOCOL_027.md)를 추가했어요. Unity 6000.0 참조 파일 440줄은 읽었고, 네이티브 본체·연결 속성과 전체 저장소 검증은 남아 있어요. Chromium 프로토콜은 안전 영역·메모리 명령과 직접 타입만 읽었어요. 발견 계열은 26개로 늘었고 전체 분모·독립 검증·완료 gate는 계속 미확정이에요.

2026-10-06 최신 설치/우선 MD 후속: P0와 P1/P2·추가A1~13의 일괄 구현·통합 수리 후448a9b5를 사용자 불변설치42bcd763ffa422e3로 갱신했어요. 실제PC Av9j2H59.500788fps,Android xDeGsX43.26351fps/작업p9530.1ms,최신원문게임9개qfTJah,동일소스iOS37427806194의SDK2/시뮬레이터/오디오신호·복귀가통과했어요. 실제실물기기/서명/청취·8시간메모리는미검증이며이결과를전체누적엔진완성이나corpus검증으로계산하지않아요. 아래의 과거 설치 미수행 문장은 당시 시점 기록이에요.

내부순서 후속 [024 부분 분석](FRAME_ORDER_ANALYSIS_024.md): UnityPlayerLoop의4페이지자체본문/선언/예제와System자체본문/5속성요약,ExecutionOrder캐시본문재읽기,UnrealTick/Timer가이드기술본문·두타입자체선언/멤버요약·NextTick5overload·TimerParameters3필드를대조했어요. 현재5.8 NextTickAPI의반환handle과가이드설명의모순을미해결로보존해요. 이미지/연결/상속/미독API와독립검증·전체gate는승격하지않아요. 원문SHA와범위는native/build/frame-order-docs-20261006예요.

모바일 출력 우선 작업: 사용자 동의 후 Android SDK·NDK를 설치했고 실제 두 ABI APK/AAB·독립 가상 기기의 C++/BP·한글/SVG·동시 터치·오디오 신호·배경/복귀를 통과했어요. iOS37343333585/8e2cbd5는 두 Xcode 대상 컴파일·독립 시뮬레이터 게임과 반복 오디오의2초 길이/신호·배경 정지/복귀를 통과했어요. 실물 휴대폰·배포 서명·음향 청취 검증과 사용자 설치본 업데이트는 아직 수행하지 않았어요. 보조 출처는 [020 등록 기록](MOBILE_RUNTIME_SOURCE_REGISTRATION_020.md)과 [023 부분 표준 계약](WEB_MEDIA_CONTRACTS_023.md)으로 발견 대기열에 추가하며 전체 연구 gate를 승격하지 않아요. 상세: [모바일 출력](../MOBILE_EXPORT.md)

## 최신 우선순위: 모바일 검증 → Auric Loop 순차 개선 → 사용자 업데이트

020 원장 등록은 18개 입력 주소 중17개 새 발견·기존 Android 주소1개 경로 추가예요. 출처 계열18→20, 새 두 계열 각각 discovered1/fetched0/body_reviewed0/analyzed0/verified0이며 기존18계열의 기준 필드를 대조해 보존했어요. 발견 증거로 hash가 고정된020 목록은 수정하지 않고 후속 결과는 여기 기록해요. 전체 분모와 gate는 계속 미확정/false예요.

주인님 최신 지시는 현재 모바일 작업을 마친 뒤 Auric_Loop/docs/엔진_개선_요청.md의P0-1부터 번호순으로 개선하고 각 단계check_demo.mjs를 실행·원문 진행 기록에 적은 다음 설치본 업데이트와 누적 장기 작업을 이어가는 순서예요. P0-1·2는 같은 구조 변경으로 함께 처리해요. 사용자 Mac/Xcode는 없으며 원격 표준 Mac 검사와 실물 기기 검증을 구분해요. 이전 설치본/프로필/게임/실행 창을 보존하며 검증된 새 불변 버전을 추가하는 설치 도구를 사용해요. 전체 누적 엔진 세부·가벼움·사람과 AI 편집을 이후에도 계속해요.

Freeform 구현/검증은 docs/2D_LIGHTING.md 후속에 기록했어요. shapePath64·512bytes/광원·C++/BP3개→594/API289·공용 모양 편집/방향키·장면/BP Undo·뷰포트 진단/조명 표시·Editor bdfWUZ와 Player e7Whrs GPU93/전용44·원본/exit0/서버 정리 통과예요.

새 ShadowCaster2D/Composite 공식4개 자체 기술 본문/API 읽기는 native/build/2d-shadow-docs-jVDrut/manifest.json 원문/SHA에 있어요. 이미지/상속/연결은 미독이며 구현하거나 전체 gate를 승격하지 않았어요. Android build/NDK/Apple Xcode 새 웹 탐색은 모바일 구현을 위해 계속 읽는 중이에요. 최종 답변/goal complete 금지 지시를 유지해요.

2026-10-05 후속: 전용 Light2D

[2D 광원](../2D_LIGHTING.md)에 Unity6000.0 Light2D Properties 기술 본문/표126–437, URP17.0.4 Light2D 자체 Properties/Methods 전체와 NormalMapQuality118–155 읽기 경계를 기록해요. raw응답/redirect/SHA manifest는 native/build/light2d-docs-ixHRQl예요. 이미지/연결/상속과 전체 corpus/API gate는 승격하지 않아요. 타입/레이어/Z/노멀·CPP/BP18개·사람/AI·실제 Editor heP5Hg/Player CfFWyo·GPU77개와 cooking/원본/종료를 확인하고 Freeform/Sprite cookie·블렌드/마스크·전용 그림자/복합·볼륨·뷰포트 윤곽과 전체 누적 엔진 세부를 계속해요.

2026-10-05 후속: [2D 표면·노멀·그림자](../2D_SURFACE_NORMAL_SHADOWS.md). Epic5.8 Paper2D Sprite Material의 소개·8개 재질 표·Custom 본문을 공식 렌더 HTML에서 읽고, Unity6000.0 SecondaryTextures 기술126–210/Light Properties126–175/2DShadows127–164 및 URP17 Light2D 자체7개 요약/선언674–861 일부를 대조했어요. Sprite Editor는 검색 발췌만이며 이미지/연결/나머지·상속 API는 미독이에요. raw HTML/redirect/SHA·경계 manifest는 native/build/2d-surface-docs-SZdfzn이에요. 전용 Light2D의 Z 무시/레이어/거리/품질·outline/composite·조명 mask/style/volumetric·커스텀 재질을 후속으로 등록해요. 현재 기존3D 표면·C++/BP7개·AI·실제 Editor XORaAp/Player v29dli·GPU49개·cooking/원본/종료를 확인했고 전체 corpus/API 분모는 승격하지 않아요.

2026-10-05 후속: [몽타주 구간 알림](../ANIMATION_MONTAGE_NOTIFIES.md). Epic5.8 Notifies 기술 본문0–260 재대조와 EMontageNotifyTickType::Type 자체 선언/값0–35를 읽었어요. raw HTML/응답/SHA/경계는 native/build/montage-notify-docs-hpk9dZ에 유지해요. Window 개별 API 본문 실패/뒤의 두 주소 웹 리더 실패는 미독/재조회 실패로 기록하며200 HTML만으로 승격하지 않아요. 그림/영상/링크 API·전체 gate는 유지하고 슬롯/Sequence 링크·공유 알림/조건·Queued/Branching Point 등 연결 후속을 등록해요. 기존 범위/속성/작업 수명 처리기를 사람/AI·2D/3D·CPP/BP에 공유하고 실제 Editor/Player·Graph 회귀를 확인하며 전체 엔진 세부를 계속해요.


2026-10-05 제작·실행 후속: [공용 타임라인 조작](../ANIMATION_TIMELINE_CONTROLS.md). Unity6000.0 Use Animation view 기술127–243·AnimationWindow 자체 설명243–248/8개 속성258–265와 time/frame/previewing/playing 자체 선언/설명을 읽고, Epic5.8 Animation Sequence Editor 기술0–177을 읽었어요. 이미지/연결/상속은 미독이며 압축/프레임 제거·data model/controller/meta·Skeleton/기록/곡선/잠금/색의 세부를 추가 후속 대상으로 포함해요. 원문/응답/SHA/경계는 native/build/animation-editor-docs-uTk8GW예요. 실제 Editor xyFptU/Player cxsjYq의 프레임·키/마우스 조작·C++ 직접 몽타주/시퀀스·독립 시간/재생선·원본/복원/종료와 코어 큰 키 목록을 검사했어요. 전체 corpus gate를 승격하지 않고 전체 요구를 계속해요.

2026-10-05 후속: [몽타주 중단 혼합](../ANIMATION_MONTAGE_SLOTS.md). Epic5.8 Montage_Stop 자체 Description/선언0–25와 UAnimInstance delegate 요약112–127/몽타주 요약740–849를 새로 읽고 Stop/StopGroup 지정 시간·Ended/BlendingOut을 대조했어요. StopGroupByName 개별 본문은 web 실패·직접200 HTML에서도 미확인이며 미독으로 유지해요. 원문/응답/SHA/경계는 native/build/montage-stop-docs-5QRB0I에 있어요. 관련 delegate/Blend 설정/동기화·연결 전체 API를 후속 대상으로 등록하고 전체 corpus gate는 승격하지 않아요. 실제 C++/BP·Editor/Player·사람/AI와 콜백/호환을 확인하며 전체 엔진 세부를 계속해요.

2026-10-05 구현 후속: [몽타주 슬롯](../ANIMATION_MONTAGE_SLOTS.md). Epic5.8 Slots 기술 본문0–92 재읽기, Montage Editor0–153/Montage0–126, Unity6000.0 Layers127–168/AvatarMask126–186와 SetLayerMaskFromAvatarMask 자체 선언/인자/Description/예제를 읽고 대조했어요. 여섯 HTML/응답/SHA/경계는 native/build/montage-slot-docs-jmWetA에 있어요. 해당 출처와 연결 Skeleton/Sequencer/마스크 API를 후속 대상으로 포함하며 이미지/영상/상속/전체 corpus gate는 승격하지 않아요. 공용 포즈·사람/AI·C++/BP·실제 Editor/Player/2D와 작은 비용을 검사하고 전체 구현을 계속해요.

2026-10-05 구현 후속: [혼합 샘플 알림 정책](../ANIMATION_NOTIFY_POLICY.md). 이미 읽은 Epic5.8 Blend Spaces의 Asset Details119–122를 다시 대조해1D/2D3가지 정책과 중첩/공유 경로·구간 End/최소 기여도를 연결했어요. 새로운 전체 API/미디어 읽기로 세지 않으며 기존 corpus gate는 유지해요. 실제 Editor/Player의 인자→BP→사용자 C++·중지 시 Begin/End 일치와 기존 포즈/시계/HUD를 검사하고 전체 엔진 구현을 계속해요.

2026-10-05 구현 후속: [두 축 Blend Space](../ANIMATION_BLEND_SPACE.md). Epic5.8 Blend Spaces 기술 본문0–171/Asset Details와 Unity6000.0 2D Blending 전체 기술 본문/좌표 두 표·API3개 자체 선언/Description·BlendTreeType 설명/5개 멤버 요약을 읽었어요. native/build/blend-space-docs-xqmLcK 원문/본문/SHA/manifest를 보존해요. 연결 Analysis/AimOffset/API/멤버와 그림/영상·전체 corpus gate는 미독/미완료를 유지해요. 자체 삼각/각도·반지름 수학 계약과 원본 엔진 동일성은 구분해요. 사람/AI·2D/가져온 뼈·C++/BP·실제 Editor/Player·작은 비용/시작 위치/HUD 검증을 기록하며 전체 엔진 구현을 계속해요.

2026-10-05 구현 후속: [구간 알림·이벤트 인자](../ANIMATION_NOTIFIES.md). Epic5.8 UAnimNotifyState의 자체 선언/변수/함수 요약0–153을 새로 읽고 Notifies 기술 본문을 다시 대조했어요. Unity6000.0 AnimationEvent의 float/int/string/objectReferenceParameter/functionName5개의 각 선언/Description을 새로 읽었어요. 원문/본문/SHA와 경계 manifest는 native/build/animation-notify-docs-BKjIEx에 있어요. 개별 Epic 함수 추측 주소의 접근 실패/빈 본문은 미독이고 연결 클래스/상속·미디어/전체 gate를 승격하지 않아요. 사람/AI·범위 수명·typed BP/C++·별도 실제 Editor/Player/2D 코어를 연결했고 몽타주·공유 Sequence/Skeleton 알림·다른 전체 기능은 계속해요.

2026-10-05 구현 후속: [동기화·마커·단일 알림](../ANIMATION_SYNC.md). Epic5.8 Sync Groups0–106을 다시 읽고 Notifies0–260 기술 본문, Unity6000.0 가져온 클립 Events 기술 본문/AnimationEvent 설명·예제·자체 요약을 읽었어요. 자체 구현·사람/AI·C++/BP3개·headless·실제 Editor/Player를 검증했어요. Unity 원문/본문/SHA와 경계 manifest는 native/build/animation-sync-docs-4WgC0C에 있어요. 연결 API/그림/영상·전체 corpus gate는 승격하지 않으며 구간 알림/몽타주·전체 누적 엔진 기능을 계속해요.

2026-10-05 구현 후속: [포즈 상태·전이](../ANIMATION_STATES.md)를 추가했어요. 실제 Epic5.8 State Machines/Transition Rules/Sync Groups 기술 본문과 Unity6000.0 Animation transitions 기술 본문·StateInfo/TransitionInfo 자체 요약·CrossFade2선언/인자/설명을 읽고 상태/전이·사람/AI·C++/BP12개·headless·별도 실제 Editor/Player에 연결했어요. Unity 원문/본문/SHA는 native/build/anim-state-docs-X9OC0r에 있어요. Sync Group 본문은 다음 구현 근거이고 이 상태 추가를 동기화 구현 완료로 세지 않아요. 개별 연결 API/상속·그림/영상·전체 corpus gate를 승격하지 않아요.


2026-10-05 구현 후속: [2D IK](../2D_IK.md)를 추가했어요. Unity2D Animation13.0.6의2DIK 기술 본문과 IKManager2D/Solver2D/LimbSolver2D/CCDSolver2D/FabrikSolver2D 각 클래스의 자체 Properties/Methods·선언/인자/반환/override를 읽고 구현·전용 UI·C++/BP12개·AI/headless·실제 Editor/Player 검증을 연결했어요. 원문/본문/SHA는 native/build/ik-docs-NalnfP에 보존해요. 상속 UnityEngine API·연결 문서·이미지·전체 package 읽기나 기존 전체 corpus/API gate 승격으로 세지 않아요. 다음 포즈 상태/전이·동기화와 다른 전체 누적 요구를 계속해요.


2026-10-05 구현 후속: [2D 스프라이트 리그](../2D_SPRITE_RIG.md)와 [시작 위치/HUD](../STARTUP_STATE.md)를 연결했어요. Unity 2D Animation13 Skinning/Tools/SpriteSkin의 관련 본문·API 부분, Epic Paper2D SpriteEditor와 ActorLifecycle, Unity6.3 실행 순서/Awake 부분을 읽고 실제 구현과 별도 Editor/Player/C++/headless 검증을 대조했어요. 이 보조 읽기를 기존 전체 corpus/API gate의 검증 완료로 세지 않아요. 2D IK 본문/기술 API를 다음 대상으로 읽고 있으며 전체 누적 요구를 유지해요.


**후속 지시 갱신(2026-10-04):** 주인님이 입력·풀·스프라이트·플레이어 기능을 먼저 만들고 기존 분석의 구현을 이어 진행하도록 명시했어요. 모바일 UI 전반과 그 뒤의 실제 창·탄막 검증도 추가했어요. 구현을 재개했으며 [실제 구현·검증 기록](../INPUT_MOBILE_POOL.md)에 구분해요. 아래 corpus/API 원장은 이전 연구 단계의 스냅샷이며, 전체 본문/API 분석 완료나 전체 상용 엔진 기능 완료로 승격하지 않아요. 전체 누적 요구를 계속 보존해요.


2026-10-04 구현 재개 전의 원장 기록에서 단계는 **`research_only`**예요. 주인님의 지시에 따라 전체 본문/API 분석을 먼저 진행해요. 엔진 기능 변경과 foreground UI 조작은 하지 않았어요. PC·모바일 게임을 내보내 설치·플레이하는 과정과 에디터 자체를 PC·모바일에서 제작 도구로 실행하는 요구도 [추가 누적 요구](EXPORT_EDITOR_REQUIREMENTS.md)에 영속 기록했어요. 두 경로의 분석·완료 조건을 각각 유지해요. 전체 구현 시작 조건은 충족하지 않았고, 수집량을 읽기·분석 완료로 계산하지 않아요.

## 현재 실제 기록

최종 실제 gate snapshot `gate-2026-10-04-019.json`(UTC2026-10-04T07:20:56.435Z, manifest SHA256 `61b9bd1c2ec18e4c9228293af0f598adc614a0a1e6f4c69745aaa5e020b3e888`) 기준으로 등록 원천은 **18개**, 원장의 **168,940개 source별 URL identity**는 발견한 주소예요. 013–016 당시 13개 원천/165,123개 기록에서 새 보조 원천 205개와 package index 3,612개 발견을 추가했어요. 서로 다른 공식 host의 별칭·동일 본문을 대조하기 전이라 전체 고유 문서 분모가 아니에요. 별도 발견한 다른 Unity 판본 188,740개 주소도 캐시에 남겨 추가/변경/폐기 계약을 조사해야 해요. 현재 API/overload·모듈·package/plugin·media 전체 분모는 미확정이며 완료율은 계산하지 않아요.

| source | 발견 목록 주소 | 실제 body snapshot | 원장 의미 분석 이상 | 독립 verified |
| --- | ---: | ---: | ---: | ---: |
| Unity 6000.0 기존 Manual | 3,122 | 3,119 | 6 | 2 |
| Unity 6000.0 기존 Scripting API | 31,710 | 31,706 | 9 | 0 |
| Unity Packages | 62,873 | 0 | 0 | 0 |
| Unity 제품·서비스 포털 | 8,599 | 0 | 0 | 0 |
| Unity 서비스 REST/CLI 입구 | 26 | 0 | 0 | 0 |
| Unity 6000.0 새 Manual 포털 | 3,123 | 0 | 0 | 0 |
| Unity 6000.0 새 API 포털 | 31,427 | 0 | 0 | 0 |
| Unreal 5.8 매뉴얼 후보 | 418 | 25 | 0 | 0 |
| Unreal 5.8 C++ API 후보 | 14,549 | 17 | 0 | 0 |
| Unreal 5.8 Blueprint API 후보 | 1,210 | 8 | 0 | 0 |
| Unreal 5.8 Python API | 11,678 | 2 | 0 | 0 |
| Unreal Node Reference | 미확정 | 0 | 0 | 0 |
| Unreal WebAPI | 미확정 | 0 | 0 | 0 |
| Android 플랫폼 guide | 117 | 0 | 0 | 0 |
| Android 플랫폼 API | 67 | 0 | 0 | 0 |
| Godot 4.5 모바일 에디터 보조 | 10 | 0 | 0 | 0 |
| Apple 플랫폼 보조 | 4 | 0 | 0 | 0 |
| 공식 플랫폼 ABI 사양 | 7 | 0 | 0 | 0 |

body snapshot 열은 `fetched/body_reviewed/analyzed/verified` 합계예요. 단지 ZIP/HTML이 존재하는 수와 달라요. 분석 이상 열에는 verified도 포함해요. package index의 검색용 텍스트는 해당 본문 가져오기로 계산하지 않아요. 서비스 포털·추가 개별 기술 본문의 실제 수집·부분 읽기는 아래 별도 연구 기록에 보존하며, version/구역/API/media inventory가 미완료면 원장의 전체 읽기 상태로 승격하지 않아요.

- [Unity 코퍼스 조사](UNITY_CORPUS_RESEARCH.md): ZIP 전체 CRC·HTML 34,834파일, Manual/API index, 223 package roots와 1,558 영어 editions, 기술 본문 20개 텍스트 계약. 대부분 미독이며 일부 그림과 하위 API/overload·호환 버전은 미확정이에요.
- [Unity 본문 분석 001](UNITY_ROOT_BODY_ANALYSIS_001.md), [기계 기록](unity-root-body-analysis-001.json): 실제 매뉴얼 6개/API 1개, 58구역·6표시 overload. 편집기 입구와 2D/3D 설정의 원본 전체 본문·표·현행 analysisHash·Markdown 증거를 별도 담당자가 다시 대조해 [Editor](verification-unity-editor-artifacts-002.json)와 [2D/3D](verification-unity-2d3d-artifacts-002.json) 2본문을 현재 원장에서 verified로 확인했어요. 연결 문서/API나 전체 corpus 검증을 상속하지 않아요.
- [Unity 본문 분석 002](UNITY_AUTHORING_PHYSICS_BODY_002.md), [기계 기록](unity-authoring-physics-body-002.json): 실제 API 8본문·32구역·8표시 선언·7표·8예제예요. import/refresh/native 에셋 생성·Undo·프리팹 override·3D/2D 수동 simulation과 Transform sync의 순서·실패·저장·C++/노드/사람·AI 계약을 분석했어요. 의미 분석 8개를 원장에 등록했고 [독립 본문 대조](UNITY_AUTHORING_PHYSICS_VERIFICATION_002.md)에서 전체 표·선언·예제와 분석의 일치를 확인했어요. 미확인 하위 계약 때문에 엄격한 독립 verified는 0이에요.
- [Unity 연결 분석 003](UNITY_DEPENDENCY_BODY_003.md), [기계 기록](unity-dependency-body-003.json): 추가 4본문·12구역·3표시 선언·enum 값 6행을 실제 읽고 [독립 대조](UNITY_DEPENDENCY_VERIFICATION_003.md)에서 표 2개·10행·20셀과 전체 예제까지 확인했어요. 2D Scene API 예제가 3D `PhysicsScene`을 사용하는 공식 불일치와 mode/옵션의 미기재 계약을 남겼고, 아직 원장 상태를 승격하지 않았어요.
- [Unity 포털 본문 대조 004](UNITY_PORTAL_ALIAS_BODY_004.md), [기계 기록](unity-portal-alias-body-004.json): 새 host의 실제 2본문·7overload/예제를 읽어 기존 본문과 대조했어요. 기존 32집계는 h1–h3 부분 수이며, [후속 판본 연구 005](UNITY_PORTAL_VERSION_RESEARCH_005.md)에서 전체 h1–h6 52개·추가 h4 20개·Returns 표 1개/4셀로 정정했어요. 32를 전체 coverage 분모로 사용하지 않아요. module/namespace·default 표시와 묶음 구조가 다르고 2D 예제 오류는 남아 있어요. 실제 본문 version 표시를 확인하지 못해 엄격한 원장 승격은 0이에요.
- [Unity 포털 판본 연구 005](UNITY_PORTAL_VERSION_RESEARCH_005.md), [기계 기록](unity-portal-version-research-005.json): 두 API의 실제 selector·publisher environment 값과 추가 Documentation versions 1본문·3heading, JS bootstrap 1개 전체를 읽었어요. 선택 환경 6000.0·웹 배포 ID·본문 게시판본을 분리하며 supported/archived 중복·두 host release 결합·선택 구현은 미해결이에요. img 0개와 별도로 inline SVG 85개는 DOM 분류만 했고 시각 미독이라 전체 media 확인으로 승격하지 않아요.
- [Unity 생명주기 분석 002](UNITY_LIFECYCLE_BODY_002.md), [기계 기록](unity-lifecycle-body-002.json): 실제 9본문·42의미 구역·11예제와 SVG 2개를 읽었어요. 활성화·생성·fixed/update·비활성화·파괴·에디터 재로드·PlayerLoop 순서를 구분했으며 빈 선언 8개를 formal API로 세지 않아요. 미확인 13문제군과 독립 검증 대기 때문에 원장 승격은 0이에요.
- [Unity 2D 물리 분석 006](UNITY_2D_PHYSICS_BODY_006.md), [기계 기록](unity-2d-physics-body-006.json): 실제 12본문·38heading·11표시 선언·6표(16행/32셀)·3전체 예제·enum 값5행을 읽었어요. body 종류/참여·이동 요청의 다음 step 적용·힘/충격·kinematic contact 통지/반응·sync·콜백 데이터 재사용·array/list 용량 계약을 구분했어요. [독립 대조](UNITY_2D_PHYSICS_VERIFICATION_006.md)에서 원문 전체와 분석의 일치를 확인했어요. 수명·호환·thread 등의 미해결 계약 때문에 원장 승격은 0이에요.
- [Unity 구조 변경·Undo 분석 007](UNITY_UNDO_BODY_007.md), [기계 기록](unity-undo-body-007.json): 실제 6본문·31heading·8표시 선언·7표(19행/38셀)·2전체 예제를 읽었어요. 부모/컴포넌트/파괴의 전용 Undo와 전체 상태 기록·즉시 dirty·group/collapse·color picker 및 다중 선택 흐름을 구분했어요. [독립 대조](UNITY_UNDO_VERIFICATION_007.md)에서 원문·표·전체 예제와 분석의 일치를 확인했어요. 관련 계약은 미해결이며 원장 승격은 0이에요.
- [Unity 새 포털 조사](UNITY_PORTAL_RESEARCH.md): 공식 sitemap 151shard 전부, 새 엔진 포털·제품·서비스·별도 REST/CLI 문서 입구, 실제 개요/API 텍스트 계약과 unresolved namespace/그림/버전 사항이에요.
- [Unreal 코퍼스 조사](UNREAL_CORPUS_RESEARCH.md): 공식 sitemap 424 Unreal shard 주소, SSR 후보, C++ Plugins/PluginIndex, Blueprint, Python 11,678 docnames/66,849 inventory symbols와 NodeReference/WebAPI/접근 제한을 구분했어요.
- [Unreal 본문 분석 001](UNREAL_BODY_ANALYSIS_001.md), [기계 기록](unreal-body-analysis-001.json): 실제 10본문·54구역·121표시 API/descriptor 항목이에요. 표시 행 수는 전체 API/overload 수가 아니에요. [독립 대조](BODY_VERIFICATION_001.md)에서 짧은 7본문의 24구역·9표시 항목을 직접 비교했지만 문서 오류·누락 때문에 전체 verified로 승격하지 않았어요.

- [Unreal 액터·컴포넌트 분석 002](UNREAL_ACTOR_BODY_002.md), [기계 기록](unreal-actor-body-002.json): 전체 9본문·42구역·10표시 선언을 분석하고 [독립 본문 대조](UNREAL_ACTOR_VERIFICATION_002.md)에서 해당 전체 9본문·84표 행·180셀과 의미를 확인했어요. Actor Lifecycle 텍스트의 그림 2개 미독, class 2개 부분 읽기, 실제 본문 없는 요청 4개를 구분했어요. owner/Outer/attachment·등록·시작·지연 파괴·컴포넌트 권한·thread 등의 미해결 조건이 있어 원장 승격/verified는 0이에요.

## 추가 실제 분석·독립 대조 009–012

이 묶음도 전체 문서/API 완료가 아니며, 읽은 본문과 미디어·부분 구역을 각각 기록해요. 이번 묶음의 엄격한 원장 상태 승격은 0개예요. 분석 파일은 작성 시점의 snapshot을 보존하므로 당시 독립 대기 표시는 후속 검증 파일과 이 현행 상태 기록을 함께 읽어야 해요. 별도 담당자의 **지정된 원문과 분석의 독립 대조 통과**와 전체 corpus/API의 `verified`는 다른 판정이에요. 이전 묶음과 겹치는 원문을 고유 신규 문서로 합산하지 않아요.

- [Unity 2D 제작 분석 009](UNITY_2D_AUTHORING_BODY_009.md), [기계 기록](unity-2d-authoring-body-009.json): 실제 기술 본문 12개·62heading(원시 70)·19표(149행/359셀)·10표시 선언·3전체 예제·5그림과 CSS 아이콘 21회/19종을 읽었어요. owner header 4개는 부분 읽기예요. 스프라이트 import/slice/좌표·정렬·mask·Tile Palette의 실제 조작과 타일 충돌/갱신을 현재 HB 데이터 계약과 대조했어요. [독립 대조](UNITY_2D_AUTHORING_VERIFICATION_009.md)에서 ZIP 내 원문/그림/font·전체 본문과 분석의 일치를 확인했어요. 호환 package edition·연결 API/enum·실패·수명/thread와 정확한 offline 링크/anchor 불일치 13회/9종은 남겨요.
- [Unity Undo owner 분석 010](UNITY_UNDO_BODY_010.md), [기계 기록](unity-undo-body-010.json): owner의 직접 멤버 33개와 연결 타입/필드까지 **47전체 본문을 읽었으며 신규 40개/기존 7개 재읽기**예요. 전체 154heading·46표시 선언 block·22표(95행/190셀)·14전체 pre 예제예요. callback/flush·생성/계층/부모·scene 이동·revert·importer·Undo 데이터의 순서/대상/제약을 분석했어요. [독립 대조](UNITY_UNDO_VERIFICATION_010.md)에서 inline code 중 변수명 6개 누락을 찾아 최종 24개(호출/리터럴 18+변수명 6)로 바로잡았어요. malformed delegate와 불완전 generic 표시를 정상 선언으로 추정하지 않아요. owner 33링크를 namespace/엔진 전체 API 분모로 확대하지 않아요.
- [Unity·Unreal 빌드/호스트 분석 011](BUILD_EDITOR_PLATFORM_RESEARCH_011.md), [기계 기록](build-editor-platform-research-011.json): 실제 12기술 텍스트 본문·110heading·37표(172행/449셀)·4전체 예제/명령 block·BuildPlayer 4표시 overload를 읽고 [독립 대조](BUILD_EDITOR_PLATFORM_VERIFICATION_011.md)에서 같은 전체 범위를 다시 확인했어요. 11개는 본문/media 확인, Packaging 1개는 전체 텍스트/미디어 미독이며 그림 31개(그중 GIF 2개)·영상 1개를 남겨요. 실제 그림 확인은 2개예요. compile/cook/stage/package/sign/install/run과 editor host/게임 target/Remote companion을 구분했어요. Unity 온라인 job76758565/2026-10-03과 기존 오프라인 job76410965/2026-09-29를 섞지 않으며 Unreal 5.8의 SDK/OS/Xcode 설명 간 충돌을 보존해요. SDK 설치·실제 패키징/기기 실행을 한 것은 아니에요.
- [실제 모바일 에디터·플랫폼 분석 012](MOBILE_EDITOR_BODY_012.md), [기계 기록](mobile-editor-body-012.json): Godot 4.5 Android editor/compile, Android NDK ABI와 SAF, Apple 2.5를 읽었어요. **3개 전체 기술 본문·1개 전체 텍스트/그림 미독·1개 정책 subsection 부분 읽기**예요. Kotlin/Java 탭 둘 다, 46전체 pre block·표 1개(5행/15셀)를 읽고 [독립 대조](MOBILE_EDITOR_VERIFICATION_012.md)했어요. compile 그림은 원문 요청과 독립 재요청 모두 HTTP403, Apple badge는 미독이에요. Android7.0/API25 표기 차이는 공식 N metadata(API24)를 추가 부분 확인했으며 virtual-file API 전체는 대기예요. custom module/C++에 관한 첫 표현을 원문의 Advanced Options/custom-template 안내 범위로 고쳐 재대조했어요. native plugin 로드와 기기 내 C++ 컴파일, local editor와 remote stream을 각각 구분해요.

[게임 출력·에디터 추가 요구](EXPORT_EDITOR_REQUIREMENTS.md)는 게임 Windows/macOS/Linux/Android/iOS 출력과 editor PC/mobile, SDK·서명·권한·C++ ABI·터치/IME·GPU/lifecycle·파일 provider·저장·업데이트·CI·사람/AI 공통 명령까지 이어지는 세부 대기열이에요. 보조 플랫폼 자료의 전체 목록/API 분모도 미확정이며 몇 개 guide로 폐쇄하지 않아요. 모바일 편집을 원격 제어만으로 대체하지 않아요. 원문/전체 코드/표/그림은 무시 캐시에만 보존하며 공개 파일은 자체 분석과 hash/locator예요.

## 모바일 복원·실제 배포·저장 API·패키징 UI 후속 013–016

- [Android editor 수명주기 분석 013](ANDROID_EDITOR_LIFECYCLE_BODY_013.md), [기계 기록](android-editor-lifecycle-body-013.json): Activity/process lifecycle·UI state·SavedStateHandle·장기 Worker의 **5전체 기술 본문**, 55기술/resource heading(추천 2개 별도)·24전체 pre·3표(30행/79셀)·PNG 1개를 읽었어요. stop 시점의 시스템 상태 캡처, task 종료의 소실, process kill 때 onDestroy 비보장, quota/Worker/취소 조건을 분리했어요. durable draft와 사용자 저장본, UI state와 native Play/작업 receipt·AI revision의 복구를 HB 설계로 연결했어요. [독립 대조](ANDROID_EDITOR_LIFECYCLE_VERIFICATION_013.md)는 지정 5본문/그림 전체 범위만 확인하며 formal API와 미해결 12문제군은 남겨요.
- [Android build/deploy 분석 014](ANDROID_BUILD_DEPLOY_BODY_014.md), [기계 기록](android-build-deploy-body-014.json): 명령줄 build·signing·adb·logcat·ABI·GameActivity **6전체 본문(012 대비 신규 5/ABI 재읽기 1)**, 제목 포함 126heading·7표(83행/171셀)·105전체 pre·16그림 회수/고유 14종을 읽었어요. ABI 본문의 012 기술 heading21과 014 제목 포함22는 분모 정의가 달라요. APK/AAB/기기 APK집합, upload/app signing key·update, install/launch/native ready/play/log를 각각 연결했어요. [독립 대조](ANDROID_BUILD_DEPLOY_VERIFICATION_014.md)를 별도로 남겨요. 가이드의 android_main entry 1표시 signature는 formal API reference 전체 분석이 아니며 GameActivity 예제 인수/input handler의 원문 차이와 미해결 9문제군을 보존해요. 독립 대조에서 frozen 서명 본문에 없는 local anchor 1개도 발견해 후속 미해결로 남겨요. HTTP404 판정은 아니에요.
- [Android 저장 API 분석 015](ANDROID_STORAGE_API_BODY_015.md), [기계 기록](android-storage-api-body-015.json): **4owner 페이지 중 선택한 Java 멤버 18구역 전체/owner class header4부분**이에요. 전체 owner 본문 0, Kotlin 대응 미독이며 20heading·18표시 선언(메서드10/상수8)·14표(30행/46셀)를 읽었어요. URI grant와 provider capability의 타입을 분리하고, persist/release/목록·unlock·file mode·null/실패/cancel·descriptor 소유와 close, VIRTUAL 상수의 API24와 timestamp 문구 차이를 확인했어요. [독립 대조](ANDROID_STORAGE_API_VERIFICATION_015.md)를 별도로 남기며 실제 기기/파일 제공자/SDK 검사로 확대하지 않아요. public 표 fingerprint 직렬화 규칙의 누락을 대조 중 찾아 hashRules에 추가했어요. 현재 PC 저장 코드의 정확한 읽기 범위와 모바일 provider 계약의 차이도 기록했어요.
- [Unreal Packaging media 분석 016](UNREAL_PACKAGING_MEDIA_BODY_016.md), [기계 기록](unreal-packaging-media-body-016.json): 011의 미독 Packaging 정지 그림 **29회/고유 bytes27종**의 pixels를 실제 읽었어요. 새 텍스트 본문29개로 세지 않아요. 플랫폼·SDK/device·config/architecture·asset picker·시작 map·build/package·진행/실패/cancel/canceled·log/산출물의 시각 흐름을 분석했어요. GIF2개(330/9frame)는 frame metadata만 확인했고 영상1개도 미독이에요. screenshot 자체의 정확한 엔진 판본과 default/실제 조작을 추정하지 않아요. 011의 당시 pin을 유지하며 후속 관찰만 연결해요. [정지 pixels/의미의 독립 대조](UNREAL_PACKAGING_MEDIA_VERIFICATION_016.md)를 별도로 기록해요. 대조 중 INI denylist와 shader 항목의 구분, 두 그림의 동일 SDK 값, 파일 수정일의 날짜 형식/촬영일 추정을 바로잡았어요.

이 후속에서도 guide 호출/CLI 예제·선택 member 구역·전체 owner·실제 기기 시험을 각각 구분해요. 독립 원문 대조가 전체 corpus/API의 폐쇄를 대신하지 않으며 엄격한 원장 승격/verified는 0개예요. 구현 gate는 계속 `research_only`, exit2/ready=false예요. 추가 플랫폼 분석은 원래 Unity·Unreal의 모든 분야/세부 분석에 더하는 일이에요. user 요구의 PC/mobile editor·game 출력과 사람/AI의 동일 결과를 유지하며 대상마다 별도 실제 제작·설치/플레이 검증을 요구해요.

## 패키지·Unreal 전 분야 입구·전체 검사 범위 후속 017–019

전체 분석은 끝나지 않았어요. 지정 원문과 분석의 독립 대조는 해당 범위만 확인하며 전체 목록/API/본문/media의 폐쇄를 대신하지 않아요. 아래 세 기록 모두 엄격한 원장 읽기 승격은 0이에요. 다른 묶음과 겹치는 재읽기를 신규 고유 본문 수로 합산하지 않아요.

- [Unity 패키지 관리·목록·호환 본문 017](UNITY_PACKAGE_CATALOG_BODY_017.md), [기계 기록](unity-package-catalog-body-017.json): 실제 전체 기술 텍스트 27개(새 URL 21/기존 재읽기 6), heading 83개·표 24개(452행/975셀)·pre 예제 3개와 표의 JSON을 읽었어요. 이미지 133회/16 URL 중 15개 실제 pixels를 읽었으며 iconRel.png의 실제 404 때문에 114회 출현은 미확인이에요. wrapper 159개 확보 중 실제 본문 읽기는 5개/미독은 154개이고, Entities 1.5.0의 metadata record 1개 읽기도 전체 metadata/API 읽기와 구분해요. 표시 상태·feature set·기본 포함/선택 설치·호환 patch·숨은 dependency를 함께 조사했어요. live 27본문 중 이전 ZIP과 24개 동일/3개 차이가 있어 판본/hash별 읽기를 유지해요. 발견 목록의 합집합은 227 root/135 이름/1,778 영어 edition/62,873 index URL이에요. 새 4 root의 3,612 URL은 discovery로만 원장에 추가했고 API 멤버/overload 읽기는 0이에요. 목록 밖의 dependency 26개·이전 root 7개의 의미·모든 edition/API/xref와 후속 media는 미해결/미독으로 남겨요. [독립 대조](UNITY_PACKAGE_CATALOG_BODY_VERIFICATION_017.md)는 지정 source 범위를 따로 재확인해요.
- [Unreal 홈과 21개 공식 분야 입구 018](UNREAL_ROOT_COVERAGE_BODY_018.md), [기계 기록](unreal-root-coverage-body-018.json): 홈 포함 22개 SSR의 실제 기술 텍스트·설명·중첩 표/include를 읽었어요. 신규 Unreal 본문 HTTP 확보는 0개이고, 기존 398관계를 보존하며 Gameplay 22/Animation 3개 본문 링크 관계를 추가했어요. 정상 관계의 분야별 합은 422(398-실제 publisher 404 1+25), 하위 URL 합집합은 412개이며 추가 25개 모두 기존 후보 안에 있어요. 이 batch의 하위 본문/API 읽기는 0이에요. 미해결 topic 토큰 5/비정규 상대 링크 4/실제 404 1과 Fab의 외부 공식 후속 목록도 보존해요. 원문이 제공한 이미지 10주소를 실제 요청했지만 모두 403/textHTML이어서 pixels 읽기는 0개예요. 다른 제공 DOM URL도 같은 API route이며 SSR에 별도 직접 CDN 주소는 없어요. 영상 1개의 watch metadata만 확인했고 재생/전체 영상/자막 본문 읽기는 0이에요. 월드·AI·VFX·Blueprint·C++·물리/네트워크·2D 혼합 애니메이션·UI·오디오·미디어·제작 파이프라인·테스트·출시·샘플 등 전 분야의 하위 계약을 이어 읽어야 해요. [독립 대조](UNREAL_ROOT_COVERAGE_BODY_VERIFICATION_018.md)도 이 루트 범위에 한정해요.
- [보조 출처 등록·완료 오판 방지 019](SUPPLEMENTAL_SOURCE_REGISTRATION_019.md), [기계 기록](supplemental-source-registration-019.json): 012–015의 Android/Godot/Apple/ABI 기능 자료가 전체 gate 검사 목록에서 빠져 있던 문제를 고쳤어요. 새 원천 5개를 추가해 18개 원천의 전체 분모 미확정/목록 열림을 유지해요. 기존 source 파일 20개 hash 검사와 입력 링크 관계 564개/URL 신규 발견 205개는 새 본문 의미 읽기가 아니에요. 분류 대기 130회 출현과 전체 출처 확장/판본/누적 요구 대응의 3가지 문제도 gate 차단 조건으로 남겨요. 다른 공식 출처 간의 발견 관계는 등록된 parent host로 허용하고 target 검사는 유지해요. host guard가 정확한 본문 href나 parent 분야/판본을 자동 검증하지는 않아요. 별도 담당자가 후속 href 544개의 실제 부모 원문 일치를 독립 구조 대조했어요. [독립 등록 대조](SUPPLEMENTAL_SOURCE_REGISTRATION_VERIFICATION_019.md)는 수집/등록/도구 범위를 확인하며 전체 본문/API 의미 분석으로 확대하지 않아요.

현행 gate는 exit 2/ready=false, `scope=registered_manifest_sources`, `percentage=null`이며 90개 차단 이유를 유지해요. body snapshot 합계 34,877·엄격한 verified 2개는 이전 지정 본문의 현행 상태예요. 이번 실제 읽기를 다운로드 수나 자동 원장 승격으로 세지 않아요. README/조사 개요/인계에서도 부분 범위·과거 구현 기록과 전체 분석을 구분하는 보고 규칙을 반영했어요. 전체 조건이 충족되기 전에는 일부 읽기/대조를 근거로 전체 완료라고 하지 않아요.

다음 분석은 패키지 관리의 하위 작업·의존성/호환 edition·전체 package Manual/API/xref와 Unreal 21분야의 모든 하위 본문·메뉴/조작·타입/멤버/overload/node/pin·media로 이어져요. 빌드/게임 출력·PC/mobile 에디터의 실제 platform API/ABI/policy와 모든 기능의 사람 UI/C++/노드/AI 공용 데이터·실행·오류/복구 계약도 누적 범위에 유지해요. 본문/API/미디어 분모가 닫히기 전에는 완료율을 계산하지 않아요.

## API 전체 분석을 위한 구조 확인

`tools/reference-api-inventory.py`는 실제 Unity 6000.0 API HTML **31,707개**를 모두 순회해 **25,778개 선언 후보**를 추출했어요. generic 타입·기본값·중첩 markup을 보존하고 코드 예제/다른 언어/탐색 내용을 선언으로 세지 않아요. **9,767개는 선언 후보가 없는 본문**이며, 그중 `signature-CS` block 자체가 없는 것은 **91개**, block이 있으나 전부 빈 것은 **9,676개**예요. 이전의 ‘9,767개 block 없음’ 표시는 잘못된 구분이라 실제 HTML 전체를 다시 순회해 바로잡았어요. class/enum/멤버 표, 상속과 overload, actual owner/module, 입력·반환·수명·실패·thread 계약까지 별도로 확인해야 해요.

후보 원장은 `native/build/reference-corpus/unity-api-declarations.json`에 있으며 `reviewed/analyzed/verified=0`, `fullApiUnitDenominator=null`이에요. 구조 추출 자체를 API 분석 완료라고 표시하지 않아요. 후보 hash·원문 위치는 후속 실제 읽기에 연결할 근거예요.

## 구현을 재개하기 전에 남은 조건

등록한 18개 모든 source의 `discoveryClosed=false`예요. 미등록 공식 후속 범위도 `scopeExpansionPending`으로 검사 실패 조건에 보존해요. 새/기존 포털 별칭과 내용 대조, 모든 package/plugin/서비스 edition 고정, C++·Blueprint·Python·NodeReference·WebAPI·SDK·REST·CLI 계열의 전체 목록 확장, 본문·표·예제·그림·동적 탭, 타입/멤버/overload/오류·기본값·수명과 미해결 링크를 확인해야 해요. 공식 문서의 불완전한 enum·충돌하는 파라미터 설명도 unresolved로 남겼어요. 제한된 플랫폼 자료를 임의로 완료나 범위 밖으로 바꾸지 않아요.

현재 `node tools/reference-ledger.mjs gate`는 **exit 2, ready=false**예요. 부분 분석, ZIP 확보, 전체 선언 후보 추출이나 HBEngine의 과거 테스트가 이 조건을 대신하지 않아요. 분석 뒤에는 전체 누적 요구의 C++/노드·사람 UI·AI 명령·데이터/실행 대응으로 엔진 작업을 이어가요.

## 재현과 도구 검증

기준본은 [CORPUS_MANIFEST.json](CORPUS_MANIFEST.json), 증거 규칙은 [ANALYSIS_PROTOCOL.md](ANALYSIS_PROTOCOL.md)예요. 원문·large index·ZIP·생성 ledger는 Git에서 제외한 `native/build`에 보존해요. 새 환경에서는 동일한 공식 배포본/목록을 다시 수집하고 snapshot hash를 대조해야 하며 캐시가 없으면 verified라고 주장하지 않아요.

```text
node tools/reference-ledger.mjs status
node tools/reference-ledger.mjs gate
node --test tools/check-reference-ledger.mjs
python -X utf8 tools/check-reference-api-inventory.py
python -X utf8 tools/reference-api-inventory.py
```

이전 연구 도구 검증에서 원장 검사는 **9개**, API 후보 추출 검사는 **4개**, 총 **13개** 통과했어요. 이번 009–016에서는 도구 구현을 바꾸지 않아 해당 13개를 재실행하지 않았어요. 009–016 당시에는 새 연구 source/body·analysis·verification artifact hash를 재대조하고 당시 gate를 실제 node process로 실행해 exit 2/ready=false를 확인했어요. 다른 버전/host·latest 별칭, source/body/analysis hash, 독립 검증, 구역/API/media coverage, source roots/locale 변경, 본문 변경, 빈 ID, 일부 실패한 대량 등록, 참조 Markdown·중첩 JSON 증거 변경, 추가 공식 발견 근거 보존과 빈 선언 슬롯/실제 block 부재를 검사했어요. [독립 감사와 수정 기록](RESEARCH_AUDIT_002.md)을 보존하며 수집 bundle 7개도 재대조했어요. **검사기는 증거 형식을 확인하며, 실제 의미·읽기 여부·목록 완전성은 별도 검증자가 원문과 대조해야 해요.** 엔진 런타임/GUI 검사는 이번 연구 단계에서 실행하지 않았어요.

017–019에서는 원장 도구의 범위/판정시각/manifest hash/미확정 완료율과 교차 공식 host 발견 검사를 바꿨으므로 Node 원장 검사 **10개를 실제 재실행해 통과**했어요. 새 unknown 원천·범위 대기가 기존 완료 fixture를 다시 차단하고 유일 parent-host 등록 삭제가 발견 근거를 stale로 만드는 경우를 포함해요. Python API 후보 4검사는 이번에 재실행하지 않았어요. 실제 현재 gate snapshot은 위 UTC/hash·168,940개 발견/34,877개 snapshot·stale 0/ready=false이며 패키지 등록 전 165,328개의 별도 snapshot과 혼동하지 않아요. 이 검사는 엔진 실행이나 문서 전체 의미 분석을 대신하지 않아요.


## 049 GPU 파티클 방출·수명·간편 함수 — 2026-10-07

GPU에서 빈 슬롯을 찾아 새 입자를 넣고, 수명이 끝난 슬롯을 재사용하도록 연결했어요. C++ ParticleEffect는 emit/rate/play/pause/stop/clear를 제공하며 사용자 C++ HB_FUNCTION은 블루프린트로 노출돼요. 가득 찬 경우 살아 있는 입자를 보존하고 요청 버퍼를 재사용해요. 실제 하드웨어·픽셀·release Player의 2D/3D BP/C++ 방출/수명/일시정지/재개/제거·배치 위치 보존이 통과했어요. 최신 core eZAFNC/render mEgSrZ/Player azWd4k/debug 오류0은 현재 SHA예요. 기존 편의 함수221개의7파일은 변경이 없어 실제 C++/BP 비교 증거를 재사용했어요. 방출1024개/frame·65,537슬롯·20frame의 계산/방출/그리기/최종이미지 회수는1.3395/1.1724/1.2401ms이고 전체 게임 FPS가 아니에요. Unity의4개 자체 API 본문·예제, Epic GPU 두 가이드의 자체 텍스트, Microsoft 세 API 읽기/재읽기 범위를 research/GPU_EMISSION_049.md에 기록했어요. 연결문서/이미지/전체문서 분석 완료로 세지 않아요. 메인 WebGL2 씬의 GPU 타깃 합성·모바일GPU·누적 엔진 기능은 이어갈 작업이에요. 원본 게임/창/프로필과 기존 장기 검사는 사용하지 않았어요. 설치는 검증 소스 커밋 뒤 새 불변 버전으로 갱신해요.


## 049 사용자 설치 갱신 완료 — 2026-10-07

검증 production 022b7decbfa4ebb450936edfa9f598f46846588b를 C:\Users\kirby\HBEngine\Versions\7a1921f1526ee62d에 불변 설치했어요.1813파일·변경15개 SHA·바로가기/.hbproject 연결 검증 PASS. 이전944ae8 버전·실행파일·기존SDK·프로필·프로세스를 보존했고 사용자 창을 시작/종료하지 않았어요. GPU 방출/수명/빈 슬롯 재사용과 ParticleEffect의 emit/rate/play/pause/stop/clear, 사용자C++→BP 노드를 포함해요. 실제 GPU·픽셀·배포 Player·debug 오류0·현재 소스 SHA 검증을 사용했고 변경 없는 편의 함수221개 검사는 재사용했어요. 기존메인씬/CPU 탄막을 자동 GPU로 이식한 설치나 전체게임 FPS/모바일GPU 검증으로 세지 않아요. 증거 native/build/gpu-emission-user-install-049.json. 다음 실행부터 새 버전이 열려요.


## 050 메인 씬 GPU 렌더·기존 함수 연결 — 2026-10-07

실행 렌더러 선택(runtime.renderBackend/WebGL2 기본·WebGPU 선택), 실제 메인 카메라/깊이 버퍼의 GPU ParticleSystem, 기존 Play/Stop/Pause/Emit/GetCount BP·C++ 함수 연결을 구현했어요. C++ 함수 안의 정지→방출→명시적 개수 조회도 실제 컴파일한 release Player에서 확인했어요. 위치/나이 계산·슬롯 재사용·생존 인덱스/간접 draw는 GPU에 남아요. 공용 장치와 버퍼 재사용, 새 출생이 없을 때 재업로드 방지, PMREM 배경/compute 전용 버퍼 소유권 해제로 장면 전환 뒤 자원 증가를 막았어요. 65,537 경계·2D/3D·깊이 가림·월드/로컬 이동·정지/수명/전환·GPU 오류0·종료0 PASS. GPU24G6Ni/기존WebGLXFO4wW 및 CPU32경우2560스텝/채널/CPU파티클 검사 증거를 research/GPU_SCENE_050.md에 연결했어요. 원본 게임의 렌더러를 바꾸거나 FPS/모바일/모든 셰이더 완료로 세지 않아요. 편집기 미리보기와 미이식 머테리얼·조명·마스크·후처리는 기존 경로를 유지해요. 누적 엔진 요구와 후속 이식은 계속해요.


2026-10-07 후속: [051 GPU 머테리얼·환경](GPU_MATERIAL_ENVIRONMENT_051.md)에 Unreal 인스턴스/Unity17.0.4 Blackboard 자체 본문과 설치 Three r180의 부분 소유 경로 대조를 기록해요. GPU53연산+Surface·C++/BP·실제 환경 픽셀·자원 해제 검증과 전체corpus/실기기/전체FPS/메모리 목표를 구분해요. 추가 관련 문서·기능을 발견 대기열로 유지하고, 선행 목표 완료 뒤 설치/그다음 추가 연구 목표 순서를 WORK_ORDER_051.md에 기록해요.


## 052 GPU 2D 스프라이트·마스크·픽셀 정렬 — 2026-10-07

기존 Sprite/Tilemap/Particle 마스크·SortingGroup/범위·발광·C++ Flash·카메라 픽셀 정렬을 GPU 실행에 연결했어요. 실제 release Player GPU BkkAjH / GL HBMYkk 픽셀·자원 반환·분리 원본 보존 PASS. 상세와 본문/API 읽기 범위는 docs/research/GPU_2D_052.md예요. 전체 선행 목표 완료 뒤 설치, 이후 추가 연구 목표 순서를 유지해요.


## 053 GPU 2D 조명·그림자 — 2026-10-07

기존 광원/노멀/쿠키/블렌드 스타일/마스크/ShadowCaster/Composite/볼륨을 메인 GPU에 연결했어요. 실제 release Player GPU7WAkd3/GL10vKc6에서 C++·실제 BP·광원·픽셀·3셀 아틀라스·정렬/마스크·변경 없는 프레임 캐시·자원 반환·종료 PASS. 공용 스프라이트 영향 xlTL92 PASS. 상세와 읽기 범위/미완료 대조: research/GPU_2D_LIGHTING_053.md. 설치는 누적 선행 목표 완료 뒤, 추가 연구 목표는 그다음 순서예요.


2026-10-07 후속: [054 GPU 입자 정렬·투사체](GPU_EFFECTS_054.md)에 원문 자체 표/부분 읽기·설치 r180 부분 소스·실제 GPU/GL 정렬/충돌/픽셀/반환을 기록했어요. 전체 corpus·FPS·설치 완료로 승격하지 않아요.


2026-10-07 후속: [055 GPU 에디터](GPU_EDITOR_055.md)에 공식 자체 본문/표·부분 accessor와 GPU/GL 에디터 PNG·BP/C++·소유권 검증을 기록. 전체 corpus/FPS/설치 완료로 승격하지 않음.


2026-10-07 후속: [056 모바일 GPU 질의](GPU_MOBILE_056.md)와 [057 유휴 입자](GPU_IDLE_057.md). 공식 부분 본문/API·실제 PC GPU/GL/에디터·C++ AOT 연결·Android adapter null을 분리해 보존. 전체 corpus/FPS/실기기/설치 완료로 승격하지 않음.


- 058: 실제 고정 게임 GL/GPU 패키지ABBA와 포즈/유휴UI/일반C++행 비용 절감. GL 대기119.52·공격119.81fps, GPU117.76·103.17fps 평균이며 실행 변동/공격p95로 목표 false. 164물리/실제C++·UI180프레임·SVG/장치전환 통과. [상세/재현](WHOLE_FRAME_058.md), 설치 대기·누적 선행 작업 계속.


- 059: GPU/GL 스프라이트 12회·C++/BP 교체의 Mesh/Material/동일 크기Geometry 재사용, 완료 프레임 렌더 통계와 에디터/소유권 검증 통과. 전체 게임 ABBA 8회는 변동/목표false, FPS 개선을 단정하지 않음. [상세/재현](SPRITE_RESOURCES_059.md). 058 30a82f5 푸시 완료; 설치 대기·누적 선행 작업 계속.


- 060: 믹서 RMS 샘플 배열 재사용(200회·신호/FFT/정리)과 실제 WebAudio 검증. 현재 GL/GPU 활성60초·장면/F12 각3회 자연GC 대조에서 자원수 반환/프로세스 증가를 함께 기록, 8시간 안정성/FPS 목표는 미승격. [상세](MEMORY_CONTROL_060.md). 059 980257d 푸시 완료; 설치 대기·누적 선행 작업 계속.


- 061: 공용 C++ 클라이언트/PC 호스트 대기 tail의 마지막 전체 응답 보관 해제. 전 코드2검사실패→실제 C++/동시성/타이머/복구4검사 통과. 현재 GPU 자연GC/전환/F12/오디오/종료 통과이나 RAM/FPS 목표는 미승격. [상세](QUEUE_LIFETIME_061.md). 060 b60f574 푸시 완료, 설치 대기.


- 062: C++ 호스트 실제 사용/확보 힙과 world·카탈로그 참조의 읽기 전용 진단·개발/release 경계·편집기/schema 구현. 실제 GPU 고정 게임 fCUCL4 608파일 보존/전환/초기화/오류0·종료0. Node heapUsed33.3→30.3MiB이나 heapTotal56.1→152.2MiB; 전체RAM/FPS/8시간 목표 미승격. [상세](HOST_MEMORY_062.md). 061 3036085 푸시 완료; 설치 대기.


- 063: 충돌의 미연결 async 대기/바인딩 재검색 절감. BP→실제C++ Enter/Exit/Hit/방향/컴포넌트/배치 동일성·62컴포넌트 검사 통과, 부분CPU1.6947→.5478ms. GPU 고정게임4회608파일 보존/오류0·종료0이나 공격p95 목표false. [상세](COLLISION_DISPATCH_063.md). 062 88599ff 푸시 완료; 다음 접촉 수명/누적 세부, 설치 대기.


- 064: 접촉 키를 바인딩 수명 ID로 교체하고 삭제/풀/재사용·null 상대·미상type 검사를 고쳤다. Stay/solid Exit·고정dt·Collider 상세와 실제 C++·Rapier2D/3D·164물리/62컴포넌트 통과. 부분CPU .6188ms, 전체FPS/RAM 미승격. [상세](CONTACT_LIFETIME_064.md). 063 2b86c0d 푸시 완료, 설치 대기.


- 065: 실제 GPU CPU profile을 근거로 카메라 임시 목록/비대상 group 조회와 접촉 중점/grounded 재검색을 절감. 같은 ID 객체 교체의 collider 참조도 갱신. 카메라/C++·166물리·접촉 배치 검증 통과. GPU4대조 current공격117.71/112.19fps, 최종단일119.35·p95 8.4ms로 목표false 유지. [상세](FRAME_LOOKUPS_065.md). 064 3a0046d 푸시 완료, 설치 대기.
