# 165 — 제작·실행 20항목 묶음

2026-10-16. 기준 `2d563b7`. 등록 잔여 39행 중 아래 20행에 구현을 추가했다. 표의 구현은 실제 코드·제작 UI·실행 경로의 범위다. 넓은 원장 행의 남은 세부는 [최신 원장](ENGINE_STATUS.md)에 유지한다. 20행을 전부 완료했다고 계산하거나 UE/Unity 전체 대비 완료율로 바꾸지 않는다.

| 원장 | 이번에 추가한 제작·실행 범위 | 확인 |
|---|---|---|
| AST-02 | glTF/GLB/OBJ 메시·머테리얼·골격·클립 하위 ID, 재정렬 시 이름/명시 ID 대응, 렌더 속성 오버라이드 sidecar와 재가져오기 보존 | 하위 ID/재정렬/오버라이드 검사 |
| AST-03 | 소스 해시·대상·포맷 버전으로 분리한 지속 JSON 쿠킹 캐시, 128MiB LRU 예산, 빌드 공용 연결 | 적중·대상 분리·정리, 실제 게임 패키징 |
| AST-04 | 프리팹 부모 변형·중첩 해석·순환 거부, 안정 객체/속성 경로의 적용·되돌리기, 생성 카탈로그와 배치 공용 해석 | 상속/중첩 경로·오버라이드·회귀 |
| EDT-07 | 문자열 테이블 편집, 문화권/언어/기본 언어 fallback, 수·날짜 포맷, 단·복수, RTL과 접근성 이름 | 실제 WebView2 UI, 영어/한글 전환 |
| 2D-05 | 기존 bind 상대 트랙 외에 다른 부모 계층의 포즈 재표본화, world→local 대응, 스케일·회전 연속성, 기존 2D IK 솔버 사용 | CPU 포즈·스케일, 기존 리타게팅 회귀 |
| 2D-06 | 8이웃 규칙 편집, 우선순위·90도 회전 일치, 인접 셀 재계산, 셀별 충돌 동기화 | 규칙·경계·충돌, 기존 타일 경로 |
| WLD-02 | 전용 메시 뷰포트, 정점/면 선택 표시·이동·분할·압출·면 뒤집기/삭제·XZ UV, 청크 충돌 | 순수 기하/불변성, 실제 편집기·플레이어 |
| WLD-03 | 지형 높이/평활/높이 맞춤/레이어 브러시와 스트로크 Undo, 결정적 폴리지 산포·소거와 GPU 인스턴싱 | 지형·산포·인스턴스·Undo, 실제 3D 장면 |
| WLD-04 | LOD 자산과 레벨·거리/화면 높이·히스테리시스·강제 단계, 정점 클러스터링 LOD 생성 | 단계/경계 검사, 실제 배포 렌더 |
| WLD-06 | 경사 선택 베이크·삼각 메시 인접성·A*·폭 필터·오프 메시 링크, 공간 해시 기반 국소 군중 회피 | 삼각 경로/링크/폭/회피 |
| MAT-03 | 샘플 노드의 축별 주소·nearest/linear·mip 생성 설정, GL/WebGPU/네이티브 텍스처 공용 전달 | 상태/자료 검사, 기존 머테리얼 회귀 |
| ANM-04 | 베이크 시 이름이 대응하는 모프 트랙, 잘라낸 구간의 커브 경계 값·Notify/Notify State 보존, 기존 골격 클립 재생 연결 | 모프 실제 바인딩·구간/소스 보존·기존 IK/리타게팅 |
| ANM-06 | PIE 다중 객체 Transform/표시 Take 녹화, 키 정리, 실행 종료 시 Take 보존과 시퀀스 적용 | 실제 녹화 버튼→실행 종료→적용→저장 |
| GAM-03 | 일반 병렬 성공/실패 집계, EQS grid/ring/actor 생성·거리/dot/높이/태그/충돌 검사·정규화 점수, BT 블랙보드 연결 | 집계/질의/BT, 실제 C++ 실행 |
| GAM-04 | 능력/효과 자산·컴포넌트·편집기, 속성·기본 비용·쿨다운·태그 조건·중첩·지속/주기/즉시 효과·해제 | 비용 롤백/태그 수명, 실제 C++/BP·배포 플레이어 |
| VFX-02 | CPU/GL·WebGPU compute·DirectX compute 시트, 이미터 리본, 이미터 시작/종료 하위 프리팹과 수명 정리 | WebGPU 실제 제출/읽기 0, D3D11 시트 실제 적/청 픽셀 |
| UI-03 | 재사용 스타일 자산·예외 속성, 지역화 바인딩, 가상 ListView 행 재활용·키보드·선택 접근성 | 10만 항목에 DOM 행 11개, 마지막 행·언어 전환 |
| AUD-03 | 순서 있는 필터/지연/리버브/왜곡·wet/dry, pre/post Send·Return, 라우팅 순환 거부·FX bypass·해제 | 실제 OfflineAudioContext PCM 지연, 기존 오디오 회귀 |
| AI-03 | 새 자산의 생성 예제/공용 스키마, 메시·브러시·폴리지·내비 베이크·프리팹·자동 타일 revision/dryRun/Undo 명령 | 실제 편집기 dryRun·Undo·파일 보존 |
| BLD-06 | Brotli 변경 파일 패치, 기준/파일 해시, 실패 시 변경 파일만 되돌리기, CLI 연결 | 변경/삭제·손상 거부·잘못된 기준 거부 |

## 사용 경로

콘텐츠 브라우저 만들기 메뉴에서 메시·지형·폴리지·LOD·내비 메시·환경 질의·능력·효과·문자열 테이블·위젯 스타일을 생성한다. 메시·지형·폴리지·LOD는 전용 3D 뷰포트와 우측 제작 속성을 가진다. 월드 자산은 장면 배치 후 `MeshRenderer.mesh`와 선택적인 `WorldCollision`을 통해 렌더/물리로 연결된다. 내비 메시·능력 자산은 해당 컴포넌트에 연결한다. 긴 안내문은 에디터 패널에 추가하지 않았다.

능력은 `hb::Abilities::DefineAttribute/Grant/Activate/Cancel/ApplyEffect`와 같은 SDK 선언에서 한국어/영어 검색 BP 노드를 생성한다. C++ 명령은 기존 엔진과 같이 함수 반환 뒤 적용되며 getter는 동기화된 상태를 읽는다. 비용은 clamp 가능한 기본 자원에서 지불하며, 모든 연결 효과를 먼저 읽고 검사한 뒤 원자적으로 지불한다. 태그는 기존 소유 태그와 활성 효과의 태그 수명을 분리한다. 주기 효과는 긴 프레임에서도 횟수를 누락하지 않는다. 네트워크 예측·복제는 이 구현에 포함되지 않는다.

시퀀스 문서를 열고 게임 실행 중 **Take 녹화**를 누른다. 녹화를 종료하거나 게임을 정지한 뒤 **녹화 적용**으로 트랙을 가져온다. 자동 적용/원본 덮어쓰기는 하지 않는다. 문자열·스타일은 위젯 속성에서 자산을 지정하고, 동적 목록/지역화 텍스트는 `hb::UI::SetListItems/SetLocalizedText`, 문화권은 `hb::Localization::SetCulture`로 지정한다.

AI는 `node tools/hb.mjs schema`의 자산 예제와 명령 스키마를 사용한다. 새 전용 명령은 `world.mesh.edit/simplify`, `world.terrain.brush`, `world.foliage.scatter/erase`, `navigation.bake`, `prefab.override/revert`, `tilemap.rules.resolve`다. `rig.clip.retarget`의 `positionMode: "pose"`는 `fps`·`ik`를 받는다. 다른 자산은 기존 `document.patch`/`files.apply`와 같은 검증·Undo·저장 경로를 사용한다. 공통 명령은 예상 revision이 달라지면 적용하지 않는다.

`node tools/hb.mjs patch.create '{"before":"기준 폴더","after":"새 폴더"}'`는 변경 콘텐츠 패치를 만든다. 저장한 패치는 `patch.apply`에 `root`와 `patch` 파일 경로로 전달한다. 게임을 종료한 대상에 적용하는 오프라인 파일 패치다. 변경 파일만 임시 보존하며 전체 설치를 복사하지 않는다. 실패 롤백은 검사했지만 전원 차단 복구 저널·서명·원격 전달·VCS UI는 남아 있다.

## 가벼움과 실측 범위

폴리지는 식물마다 Actor를 만들지 않고 인스턴스 버퍼를 사용한다. 시트 애니메이션은 GPU 파티클 위치/개수 읽기를 추가하지 않는다. 리본은 이미터 Transform만 샘플링한다. 군중 인덱스는 내비 이동이 있을 때 만들고, LOD가 있는 그룹만 LOD를 갱신한다. 가상 목록은 보이는 행만 만든다. 새 상시 폴링 타이머나 외부 런타임 의존성을 추가하지 않았다.

격리된 100 폴리지·지형·LOD·C++ 장면의 한 개발 실행 표본은 약 120fps, 평균 프레임 작업 1.39ms였다. 이 작은 장면의 PC 표본이며 대규모 게임·모바일 성능 보장이 아니다. 실제 Android 기기는 없고 iOS Mac/Xcode도 없는 기존 제약을 유지한다.

## 검증과 남은 경계

[기계 증거](research/ENGINE_WORK_165.json)는 CPU 17검사군, 실제 C++ 실행, 실제 WebView2 편집기/녹화/UI/PCM, WebGPU compute, DirectX 픽셀, 개발/릴리스 독립 플레이어를 구분한다. 릴리스 캡처 금지는 유지한다. 기존 Blueprint/C++ 핵심·게임플레이·2D 리타게팅·오디오 회귀도 수행했다. 실행 오류와 검사 스크립트 오류를 구분해 기록했다.

제작 화면·공용 데이터·SDK 경로가 생겼어도 고급 세부가 남는다. 메시 간선/용접/bevel·UV 섬, 지형 holes/스탬프/대규모 GPU 브러시, 개별 폴리지 편집, 애니메이션 LOD, 동적 NavMesh/정밀 RVO, 전체 압축 쿠킹, 네트워크 능력 예측, 입자별 GPU 사망 이벤트/리본, 컴포넌트 전 속성 녹화, 월드 UI·전체 스크린리더, native DSP/sidechain, VCS 병합은 현재 원장에 구체적으로 남긴다.

## 공식 자료 대조

대조한 지정 본문은 [Unity Terrain tools](https://docs.unity3d.com/6000.0/Documentation/Manual/terrain-Tools.html)의 브러시 도구 구분, [LOD Group](https://docs.unity3d.com/6000.0/Documentation/Manual/class-LODGroup.html)의 화면 비율/단계, [Prefabs](https://docs.unity3d.com/6000.0/Documentation/Manual/Prefabs.html)의 재사용 제작, [ListView](https://docs.unity3d.com/6000.0/Documentation/Manual/UIE-uxml-element-ListView.html)의 행 재활용/갱신, [String Tables](https://docs.unity3d.com/Packages/com.unity.localization@1.5/manual/StringTables.html)의 키·문화권 대응, [AudioMixer](https://docs.unity3d.com/6000.0/Documentation/Manual/AudioMixer.html)의 버스/효과 저작이다. Unreal [GAS](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-ability-system-for-unreal-engine), [Gameplay Effects](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-effects-for-the-gameplay-ability-system-in-unreal-engine), [EQS](https://dev.epicgames.com/documentation/en-us/unreal-engine/environment-query-system-in-unreal-engine)에서 능력/속성/효과와 생성·검사·점수화의 계약을 대조했다. 전체 연결 API·그림·미디어·모든 문서 읽기 완료를 뜻하지 않는다. 기존 전역 조사 gate와 추가 출처 큐는 유지한다.
