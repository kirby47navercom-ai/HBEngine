# 037 파티클 개별 정렬·화면 크기·시뮬레이션 비용

2026-10-06. 조사036의 Renderer 표에서 미연결 항목을 실제 속성/API와 대조하고 구현한다. 다른 render mode·mesh/trail/streams·GPU simulation과 전체 엔진 분석 완료로 계산하지 않는다.

| 공식 본문/API | 원시 HTML SHA256 | 실제 읽은 범위 |
|---|---|---|
| [ParticleSystemRenderer-sortMode](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/ParticleSystemRenderer-sortMode.html) | `bed03dd144b80e556cc367daee46ff39ee6ea08c8c1592bf31409e2019bb487b` | 자체 선언·설명·표·예제. 연결/상속 본문 제외 |
| [ParticleSystemSortMode](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/ParticleSystemSortMode.html) | `93c8d9538552349d1519e3992139d2ee9ef1e35088fb6b9fc3b6c29dc6b9486f` | 자체 선언·설명·표·예제. 연결/상속 본문 제외 |
| [ParticleSystemRenderer-minParticleSize](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/ParticleSystemRenderer-minParticleSize.html) | `4b318782ef9a8f547227cb6cbeb2020a05263b4697c543fa13d958b5e98c4c71` | 자체 선언·설명·표·예제. 연결/상속 본문 제외 |
| [ParticleSystemRenderer-maxParticleSize](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/ParticleSystemRenderer-maxParticleSize.html) | `2dbd131c55cd170615aff64bf2d22fbaffe15a1a0c19ef9abcdc3e174046b900` | 자체 선언·설명·표·예제. 연결/상속 본문 제외 |

원문은 native/build/particle-sort-source-037에 보존한다. 기존27계열의 unity-scriptreference에 발견 주소만 추가하고 discoveryClosed/API/전체 corpus 완료 조건은 그대로 둔다. UE Sprite Renderer 본문은 조사036에서 읽은 sort/binding 구별을 참조하며 이번에 Niagara 전체를 새로 읽은 것으로 계산하지 않는다.

- 시스템 전체의 sortingLayer/order와 입자별 sortMode를 분리한다. None, Distance, Depth, Oldest/Youngest in Front, Distance/Depth Reverse 7종을 Scene/BP Renderer와 공용 C++ Components/AI 속성으로 연결한다. 직교 카메라의 Distance는 Depth로 계산한다. 시뮬레이션 배열·입자·난수 순서는 변경하지 않는다.
- 카메라별 버퍼를 prepare2D에서 GPU upload 전에 작성한다. onBeforeRender에서 버퍼를 뒤늦게 바꾸면 Three의 attribute upload 순서상 이전 카메라 결과를 그릴 수 있어 uniform만 해당 hook에서 갱신한다. 실제 두 카메라를 같은 프레임에서 반대로 바라보게 하고 각 결과를 검사한다. sort 기본none에서는 정렬용 메모리/비용이 없다. 필요할 때 emitter별 최대10000 indices/keys를 재사용하며 정렬은 CPU O(n log n)이다. custom key/GPU sort/fudge는 후속 항목이다.
- minParticleSize/maxParticleSize는 화면 높이 비율0..1로 적용하고 min≤max를 공용 검증에서 요구한다. 0인 최대치는 하드웨어 최소점 크기로 점이 남지 않게 숨긴다. WebGL Points의 장치별 최대크기 한계는 그대로이며 전체 quad/mesh renderer 대응을 뜻하지 않는다.
- ParticleSimulation 적분의 force/position/velocity map과 매 프레임 filter 배열을 제거하고 기존 입자·벡터 배열을 유지한다. 죽은 입자는 살아 있는 순서를 유지하며 제자리 압축한다. world spawn 임시Vector3와 거리 방출의 이전 위치도 재사용한다. 새 입자의 자체 데이터와 Array.sort 내부 작업 메모리까지 모두 제거했다는 뜻은 아니다.

## 실제 검사

- tools/check-particle-renderers.mjs: 실제 C++6번 Set/같은 호출 Get·frontend6갱신·자료형/부분 크기 실패 원자성·Scene/BP/AI 필드, 7순서·직교Distance·카메라별 버퍼·원본/작업배열 보존, 적분값/사망 압축·Pause/Reset 통과.
- tools/check-scene-systems.mjs: 기존 방출/seed/시간/VM·2D/3D 탐색과 렌더 버퍼 회귀 통과.
- native/build/particle-sort-simulation-037.json: 수정 전 공유 클래스와 cone/sphere/circle/box × local/world, 회전·비균등 scale·거리/확률 burst·Pause 640step 대조 통과(벡터 오차1e-8). 짧은 CPU advance 비교는10000입자×20step×3쌍, 중앙값2.326575→0.117655ms/step이다. 순수 CPU 적분 실험이며 실제 게임FPS/모바일/전체 메모리 안정성 증명이 아니다.
- 실제Windows Player native/build/authoring-window-M637rV/acceptance.json: 개별 입자의 GPU 깊이/수명/반대·카메라 즉시 전환·none복귀, viewport 최소/최대/0 숨김, SpriteMask/층/SortingGroup/3D 깊이·2D 광원/C++ 기존 회귀와 셰이더 오류0 통과. 181항목/조명111항목/C++·노드 핀/오류0을 확인했다.
- 새 source의 모바일 결과는 후속 기록한다. 앞76c iOS 통과는 본 정렬/시뮬레이션 수정 전 source임을 구분한다.

- 실행 중 component rate/speed를 바꿔도 기존 ParticleSimulation이 최초 설정을 유지하던 결함을 추가로 발견했다. 수정 전 실제VM 기대4/실제0으로 실패(native/build/particle-settings-before-037.log), 공용 particleState가 매 호출/틱에 현재 설정을 사용하도록 고쳤다. Pause·입자·seed는 보존하며 새 입자의 speed6·count4와 기존C++/VM 회귀를 통과했다. physics에서 이미 읽은 설정을 전달해 중복 조회도 피한다.
- engine-services가 바뀌었으므로 이번 iOS는 공용기반 재사용 입력을 쓰지 않고 전체 C++/기반 검사 후 모바일 output/Xcode/app을 실행한다. 같은소스 광범위검사·새 장시간실험을 로컬에서 반복하지 않는다.


### 2026-10-06 — 파티클 새 소스 모바일 결과 확인

- source6537f3b의 iOS run37476970087 전체 공용 C++/기반·모바일 출력·Xcode 기기/시뮬레이터 SDK·독립 iPhone SE3 앱600프레임/오류0을 통과했어요. 새 depth/min.015/max.2/mask 설정을 포함하며 cookie/volume·9셰이더 runnable·Points5·C++2AOT/동기물리/한글·SVG·오디오 신호/정지·복귀를 확인했어요. GPU 입자 정렬·mask 픽셀 비교는 Windows181항목 증거이며 iOS에서 같은 픽셀 비교까지 완료했다는 뜻은 아니에요. 실제 폰/배포서명/가청은 미검증이에요. https://github.com/kirby47navercom-ai/HBEngine/actions/runs/37476970087
- iOS599 측정프레임은15.4191fps, work 중앙43/p95 73ms, simulation 평균45.3489/p95 72ms, render 제출 평균.9332/p95 2ms예요. 모바일60 목표미달을 유지해요. 앞76c 시뮬레이터 결과와 실행부하가 통제된 쌍 비교가 아니므로 파티클 수정의 회귀/개선으로 단정하지 않아요. 순수 CPU 입자 적분 개선은 게임 전체 FPS와 구분해요.
- Android android-mobile-NfoYil에서 새 실행소스의 APK/AAB 각각 arm64-v8a+x86_64 Java/DEX/JNI/C++·16KB ELF/패키지·서명·원본 보존을 통과했어요. APK SHA8c15b41635fd6e3568decf5906fa47767f34a107805a0bbd4849748584fd3573, AAB SHA622e05964d826b6adcffec38bde5606329bdebceb9dac396cfb7566b702ee6d0이며 실제 네 공유실행파일 SHA도 각 패키지와 같아요. 기기설치/실행은 하지 않았어요. 증거 native/build/particle-mobile-037-summary.json.
- 최종 사용자 설치본은 fac7946/c611c381db853f76이고 후속 기록 커밋을 설치 실행코드로 바꾸지 않아요. 사용자 창/원본게임·검사기·프로필/기존8시간 검사는 건드리지 않았고 새 에뮬레이터·장시간 검사·통과한 광범위 반복검사를 추가하지 않았어요.
