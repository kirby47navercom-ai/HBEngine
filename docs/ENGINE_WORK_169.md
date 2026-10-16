# 169 — 제작 기능을 사람·AI·C++·실행기에 연결

2026-10-16, 기준 `1e1b580`. [현재 원장](ENGINE_STATUS.md)과 [실행 근거](research/ENGINE_WORK_169.json)를 함께 갱신한다. 작업 번호를 전체 누적 엔진 목표의 대체 범위로 사용하지 않는다.

## 2D 규칙과 내비게이션

자동 타일에 고정·90도 회전·X/Y/XY 대칭과 확장 이웃 조건을 추가했다. 확장 조건은 `offset:[dx,dy]`, `match:same|different|empty|filled|tile`, 선택 `tile`을 사용한다. 이웃은 중심이 아닌 정수 좌표이고 각 축 ±128, 규칙당 최대128개다. 기존 8이웃/가중 랜덤/시드를 유지한다. 렌더 결과가 아닌 원본 타일 인덱스로 조건을 비교한다. 변경한 칸을 참조하는 먼 규칙도 역으로 찾아 청크의 기하와 충돌을 갱신한다. 회전·대칭을 게임 UV와 타일 편집기 미리보기에 함께 적용했다.

NavigationArea 컴포넌트는 중심·범위·영역0–31·비용·차단·우선순위를 갖는다. NavigationAgent의 `areaMask`와 `areaCosts`는 삼각 NavMesh와 XY/XZ 그리드 경로에서 함께 작동한다. 비용은 1 이상이며 `areaCosts`에는 `{"2":5}` 같은 영역별 비용을 입력한다. NavMesh의 선택 `areas`는 삼각형마다 하나의 영역 번호다. 생성 메뉴에 2D/3D 영역과 장애물을 추가했고 영역은 편집기 상자로 표시한다.

NavigationObstacle의 현재 월드 범위와 에이전트 반경으로 교차하는 삼각형을 보수적으로 차단한다. 움직인 장애물은 다음 이동/재탐색에 반영한다. 이는 삼각형을 재분할하는 정밀 carving이 아니다. 영역 부피의 부분 교차 비용도 삼각 중심으로 판정한다. 경계 침식·반경의 엄밀한 보장·RVO/Mass 군중·대규모 맵/장시간 성능은 원장에 유지한다.

## 다중 목표 IK

Animation Graph의 FullBodyIK 노드에서 한 포즈의 여러 체인이 관절을 공유하며 목표를 푼다. HB의 반복 CCD 구현이며 Unreal의 PBIK와 같은 솔버로 표현하지 않는다. 루트 뼈·정밀도·반복 횟수·전체 가중치와 기존 XYZ 관절 제한·제외 관절, 목표별 안정 ID·뼈·위치·외부 액터·좌표계·가중치를 편집한다. 목표 목록 추가/삭제와 실행 중 목표별 오차·적용 가중치 표시를 연결했다.

부분 가중치를 반복마다 누적하지 않고 목표와 최종 포즈에 한 번 적용한다. 기존 뼈 길이·기준 포즈·액터 배치가 유지되며 외부 목표 소실은 해당 체인의 진단으로 남긴다. 루트 이동/늘이기·stiffness/preferred angle·목표 회전·독립 Control Rig stage/베이크는 아직 별도 구현 대상이다.

C++ `AnimationGraph::SetIKEffectorTarget/SetIKEffectorActor/SetIKEffectorWeight/GetIKEffectorError`와 블루프린트 네 노드는 같은 서비스를 호출한다. 기존 SetIKWeight도 다중 목표 노드에 적용한다. 단일 체인의 Target/Hint 함수를 다중 노드에 잘못 호출하면 목표 ID를 지정하도록 오류를 반환한다.

## Take·시퀀스

녹화 옵션에 구성·골격·소리를 추가했다. 기본 Transform/표시·기본 컴포넌트 속성을 유지하며 새 옵션은 기본 꺼짐이다. `componentState` 트랙은 안정 컴포넌트 ID와 전체 JSON 속성, 생성/삭제를 step 키로 기록한다. 같은 프레임의 구성 교체는 전체 결과를 검증한 뒤 한 번 적용한다. 실행 중지/되감기에서 녹화한 컴포넌트와 원래 삽입 순서를 복원하고 관계없는 컴포넌트는 유지한다. 속성값 캐시와 클립 수명 캐시를 분리해 매 프레임 애니메이션이 중단되는 문제도 고쳤다.

`skeletalPose`는 뼈 이름·위치·쿼터니언·크기를 기록한다. 키마다 같은 골격 이름/순서를 검증한다. 바인딩과 키 순서는 한 번 준비하고 시간 검색·위치/크기 보간·쿼터니언 slerp를 수행한 뒤 그래프와 IK 이후에 포즈를 적용한다. 매 프레임 전체 골격 탐색·JSON 복사를 반복하지 않는다. 회전 오차를 포함한 키 축약을 적용했고 600프레임의 선형90도 회전은 3키 이내로 줄여 중간45도 재생을 확인했다.

소리는 실제 재생 성공 이후 시작 큐를 기록하고 명시 중지·자연 종료·녹화 종료에서 구간을 닫는다. 겹친 음성은 독립 트랙, 반복 재생은 원본 위치·배속에 따라 구간을 나눈다. 시퀀스 실행에서 원본 위치와 배속을 전달한다. PCM/마이크 녹음이나 모든 DSP·공간음·볼륨 자동화 녹음은 아니다. 임의 네이티브 구조체/액터 생성 기록, 같은 오브젝트 내부의 골격 교체와 전문 외부 시네마틱 동기화는 남아 있다.

## 메시·프리팹·오디오

메시 편집에 두 경계 연결과 개별 면 인셋을 추가했다. bridge는 정점 수가 같은 두 닫힌 경계를 검증하고 방향/시작점을 맞춰 기존 UV·색과 함께 연결한다. insetFaces는 삼각형의 내심/내접 반경으로 각 면을 줄여 안쪽 면과 테두리를 만든다. 한계 초과/잘못된 경계는 쓰기 전에 거부한다. 임의 열린 경계·정점 수가 다른 loft·bevel·연속 UV 섬은 별도다.

프리팹 연결 정보에 명시 오버라이드 경로를 선택 저장한다. 인스턴스 값이 원본과 같아져도 이후 원본 변경에서 사용자 의도를 유지한다. 속성/전체 Revert와 Apply는 해당 의도를 해제한다. 이전 연결 형식은 계속 읽으며 기존 안정 ID·3방향 병합·원자 Undo를 사용한다. 모든 구조적 Apply와 별도 프리팹 stage를 완료 처리하지 않는다.

믹서 버스에 신호 버스·임계 dB·압축비·Attack/Release를 갖는 사이드체인을 추가했다. 기존 analyser의 RMS와 믹서 update를 사용하며 새 타이머는 없다. 자기 자신·조상/자식 신호 경로·상호 사이드체인 순환을 거부한다. UI 추가/삭제/Undo, C++ `AudioMixer::SetDucking/ClearDucking/GetDuckingGain`, 블루프린트 세 노드가 같은 데이터를 사용한다. 실제 WebAudio 신호를 무음 sink로 보내 gain 감소와 회복을 확인했다. native DSP 플러그인·voice 가상화·실제 모바일 음질은 별도다.

## DirectX·AI·용량

다중 IK를 넣은 실제 DirectX 실행에서 디버그 LineSegments 때문에 시작이 중단되는 문제를 발견했다. 단일 실선 Line/LineLoop/LineSegments를 기존 삼각형 렌더 경로의 카메라 방향 스트립으로 표시한다. 픽셀 폭·근/원평면 자르기·정점색·깊이/불투명도를 처리하고 카메라/기하가 같으면 자원을 재사용한다. 소스 attribute 교체도 추적하며 사라진 선은 해제한다. 점·점선·다중 선 재질까지 지원한다고 계산하지 않는다. GPU 자동 읽기나 새 네이티브 파이프라인을 추가하지 않았다.

AI `anim.ik.effector.add/remove`, `runtime.take.start/finish`, `sequence.take.apply`와 기존 `world.mesh.edit`의 bridge/insetFaces를 공개했다. 사람과 같은 검증·안정 ID·revision/dryRun/Undo를 사용한다. 녹화는 기존 실행 프레임 장벽에서 시작/종료한다. 새 공용 C++/BP 함수는 7개이며 전체 노드는760개다. 생성 SDK 헤더만 파서 한도를 확장하고 사용자 헤더의 기본100KB 제한은 유지했다.

업데이트마다 보존되던 재생성 가능한 nlohmann3.12.0 캐시는 정확한 공식 SHA 두 파일만 백업 대상에서 제외한다. 이미 쌓인 같은 해시의 캐시 백업도 경로/링크를 검증해 정리한다. 다른 수정 파일은 계속 보존한다. 검사 빌드·브라우저 프로필은 기존 검사 캐시 정리로 제거하고 재현 자료·보고·캡처는 남긴다. 추가 의존성·상시 폴링·자동 GPU 읽기는 없다.

## 대조와 검증

[Unity Rule Tile4.0.2](https://docs.unity3d.com/Packages/com.unity.2d.tilemap.extras@4.0/manual/RuleTile.html)의 확장 이웃/회전/대칭과 [NavMeshModifierVolume2.0](https://docs.unity3d.com/Packages/com.unity.ai.navigation@2.0/manual/NavMeshModifierVolume.html)의 영역 부피 본문을 대조했다. [Unreal Control Rig Full-Body IK](https://dev.epicgames.com/documentation/en-us/unreal-engine/control-rig-full-body-ik-in-unreal-engine)의 목표·관절/루트 설정과 HB 솔버의 차이를 구분했다. [Unity AudioGroup Inspector6000.0](https://docs.unity3d.com/kr/6000.0/Manual/AudioMixerInspectors.html)의 Send/Duck Volume 지정 본문을 읽었다. HB는 지정 버스 RMS를 직접 사용하며 Unity의 모든 DSP 체인 동등 구현은 아니다. 연결 API·이미지·전체 버전 corpus 읽음으로 승격하지 않는다.

CPU23군, 실제 C++/내비/IK, 숨김 Win32 편집기의 사람·AI·녹화·Undo·실제 오디오, DirectX 개발/배포 실행기와 WebGPU 실행기를 확인했다. 기존165–168·IK/관절·2D·오디오·native/전송·생성API 회귀를 묶었다. 정확한 결과와 SHA, 첫 실행에서 발견한 실패 및 수정은 실행 근거에 남긴다. 검사 표본은 PC120·모바일60·대규모 장시간 성능의 보장이 아니다. 설치/사용자 데이터 보존은 USER_INSTALL_169.json에 별도로 기록한다.


사용자 설치 전환: `C:/Users/kirby/HBEngine/Versions/5e97fbc46c607b17`. 명세2356파일 SHA, 설치 EXE의 IK 사람/AI/Undo·Take·C++·실제 무음 오디오 신호, 프리팹 Apply/Revert/원자 Undo·상속/Play 복원을 확인했다. 사용자 프로필10385파일 SHA가 전후 일치했다. 두 바로가기와 .hbproject 연결을 확인하고 이전 설치183607599바이트 및 동일 SDK 백업1907000바이트를 정리했다. Versions1. [설치 근거](research/USER_INSTALL_169.json).
