# 두 축 Blend Space · 2026-10-05

후속: [혼합 샘플 알림 정책](ANIMATION_NOTIFY_POLICY.md)의1D/2D All/Highest/None·중첩/공유 경로·구간 End·사람/AI/실제 Editor/Player BP→사용자 C++를 추가했어요. 아래 최초 검증과 구분해요.

## 공식 근거와 읽기 경계

[Epic5.8 Blend Spaces](https://dev.epicgames.com/documentation/en-us/unreal-engine/blend-spaces-in-unreal-engine)의 기술 본문0–171과 Asset Details 표를 읽었어요. 축·좌표·삼각/격자·보정/가중치 속도·알림 방식·편집/미리보기 조작을 구분했어요. 연결된 Analysis/Aim Offset/API·그림·영상은 아직 읽기로 세지 않아요.

[Unity6000.0 2D Blending](https://docs.unity3d.com/6000.0/Documentation/Manual/BlendTree-2DBlending.html)의 전체 기술 본문과 좌표 계산 두 표를 읽었어요. 방향/같은 방향의 여러 속도/Cartesian/Direct·두 Float·샘플 좌표/미리보기·root motion 기반 좌표 계산을 대조했어요. [blendParameterY](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Animations.BlendTree-blendParameterY.html), [ChildMotion.position](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Animations.ChildMotion-position.html), [blendType](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Animations.BlendTree-blendType.html)의 각 선언/Description과 [BlendTreeType](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Animations.BlendTreeType.html)의 자체 설명/5개 멤버 요약을 읽었어요. 연결 멤버 본문과 매뉴얼 그림은 미독이에요.

원문·추출 본문·SHA256·읽기 경계는 `native/build/blend-space-docs-xqmLcK/manifest.json`에 보존해요. 이 읽기를 전체 corpus/API 원장 완료로 승격하지 않아요. 아래 수학은 HBEngine의 명시적 자체 계약이며 Unreal/Unity 내부 알고리즘이나 모든 좌표의 동일 가중치 구현을 주장하지 않아요.

## 제작·조작·저장

포즈 그래프에 Blend Space 노드를 추가하고 입력 포즈들을 연결해요. 두 개의 서로 다른 Float 파라미터, 혼합 방식, 각 축 이름/최솟값/최댓값/격자 수/격자 고정/순환/보정 시간과 Linear/Exponential을 편집해요. 사람의 노드 추가는 필요한 Float를 같은 Undo 안에서 만들고 기존 동일 이름의 다른 자료형은 별도 이름으로 피해서 보존해요. 파라미터 이름 변경은 두 축 참조에도 반영해요. 포즈 노드는12종, 공용 BP 카탈로그는560개예요.

좌표 화면에는 삼각형·번호/연결 포즈의 툴팁·기여도 크기·입력 십자/처리 값이 보여요. 샘플 드래그는 한 번의 문서 변경이며 Shift는 격자 고정이에요. 빈 공간이나 Ctrl 드래그는 두 축 미리보기 값을 함께 바꿔요. 우클릭한 위치에 포즈를 추가하고 샘플을 삭제할 수 있어요. 선택 샘플의 좌우/상하 키는 축 격자1칸, Shift는10칸, Enter는 X 입력, Delete는 샘플과 해당 연결만 지워요. Undo/Redo/저장·독립 미리보기·실행 중 읽기 전용을 공유해요. 축 세부는 접고 그래프와 스크롤을 보존해요. 같은 값/선택이면 차트 DOM을 다시 만들지 않아요.

샘플은 안정적인 입력 ID와 x/y, 연결은 기존 노드 ID로 저장해요. 샘플과 노드 수는 기존 파일의 version1 계약 안에서 검증하며, 예전 그래프의 필드를 새로 요구하지 않아요. 사람/AI 모두 중복 좌표·범위 밖·같은 축 파라미터·자료형·잘못된 방향 설정을 거절하고 원본을 유지해요.

## 공용 실행 계약

- Cartesian: 축 범위로 정규화한 좌표에서 Delaunay 삼각형을 재생 시작 때 한 번 계산해요. 내부는 barycentric, 바깥은 가장 가까운 hull 변에 투영해요. 한 줄의 샘플은 인접 선분에 투영하고 한 샘플은 그 포즈를 사용해요. 정확한 샘플 좌표는 해당 포즈1/나머지0이에요. 같은 원 위의 삼각 대각선은 입력 순서로 결정돼요.
- Simple Directional: 같은 방향의 여러 샘플은 거절해요. 원점 idle은 선택이며, 인접 각도 구간과 반지름으로 혼합해요. idle이 있으면 첫 반지름보다 안쪽의 남는 가중치를 받아요. idle 없이 입력이 정확히0이면 각 방향의 가장 안쪽 포즈를 같은 비율로 사용해요.
- Freeform Directional: 원점 idle이 필요하며 같은 방향에 walk/run처럼 여러 반지름을 둘 수 있어요. 인접 각도 구간과 각 방향의 인접 반지름 밴드를 혼합하고 가장 먼 반지름 밖은 끝 샘플이에요. 방향의 각도/반지름은 원래 좌표의 같은 단위를 사용해요.

입력은 각 축 범위에서 제한하거나 순환해요. 보정0은 즉시 반영해요. Linear는 목표 변경 순간의 처리 값에서 지정 시간 동안 이동하고, Exponential은 지정 시간을 시정수로 사용해요. 순환 축은 가장 짧은 경로로 보정해요. 첫 활성화/상태 초기화는 현재 입력으로 시작하고, 상태마다 독립 버퍼/보정 시계를 가져요. shared DAG는 한 프레임에 한 번 진행해요. Pause/0초는 진행하지 않아요. 순환 경계 양 끝의 포즈가 다르면 사용자가 만든 내용에 따라 불연속이 생길 수 있어요.

계산한 샘플 가중치를 포즈 계획·동기화/알림과 실제 숫자/Quaternion 혼합에 함께 사용해요. 기존 Direct 혼합의 공용 누적기를 재사용하고 샘플별 임시 객체 생성을 줄였어요. 가져온 모델 뼈/트랜스폼과 2D 스프라이트 클립을 같은 노드에 연결할 수 있어요. 2D 이미지는 가장 큰 기여도의 프레임을 선택하며 이미지 자체의 crossfade가 아니에요. 위치 트랙이 없는 스프라이트만 혼합하면 Actor의 배치 위치를 보존해요.

## 사람·AI·블루프린트·C++

기존 `hb::AnimationGraph::SetFloat/GetFloat` 및 생성 BP를 사용해 두 축을 설정/조회해요. 별도 C++용 혼합 계산이나 이름뿐인 노드를 만들지 않아요. 게임/Editor 미리보기/헤드리스/패키징은 같은 그래프 검증·실행기를 사용해요.

`schema.animationGraph.blendSpace`는 실제 방식·축 기본값·한도·수학/좌표·C++/BP 계약을 제공하고 노드 예제에는 실제 저장 구조가 있어요. `document.patch`의 expectedRevision/dryRun/Undo/Save로 같은 데이터를 바꿔요. `runtime.state.objects[].gameplayDebug.animationGraph.blendSpaces`는 활성 노드/문맥의 제한된 입력·처리 값·입력 ID별 실제 기여도를 보여요. 디버그 상태를 에셋에 저장하지 않아요.

## 검증·비용·후속

- `test:animation-blend-space`: 내부/밖/정확한 좌표·동일 원/한 줄/64샘플·선형 좌표 재현·방향/반지름·잘못된 자료형/설정·선형/지수/순환/중단 보정·공유 DAG·독립 상태·동기화/알림·2D 이미지/배치 위치·가져온 뼈·버퍼 재사용/해제를 검사해요.
- 실제 Editor `animation-blend-space-editor-zlWrBz` 및 비용 보강 후 `xQGZET`: 물리 샘플 이동/Shift·선택/Delete/우클릭·포즈 핀 연결·파라미터 이름 변경·Undo·AI dryRun/잘못된 패치·독립 두 축 미리보기·변하지 않은 차트 DOM·실행 잠금·실제 BP/C++·가져온 뼈 마스크·Pause·원본·exit0/소유 서버 정리를 통과했어요. PNG를 확인했어요.
- 실제 release Player `animation-blend-space-player-XaWTs8`, 마지막 공용 누적기 비용 보강 후 `ZBmccm`: C++로(.25,.5)설정/조회, BP로 X=.4변경→BP 조회값 두 개를 사용자 C++에 전달하고 포즈(4,5,0)·기여도(.1,.4,.5)·뼈 마스크·Pause·원본/exit0/소유 서버 정리를 검사했어요. 마지막 누적기 보강은 코어와 Player로 검사했고 Editor의 동일 의미 경로를 유지해요.
- 포즈/상태/동기화/구간 알림·main/API/integration/runtime 회귀 및 `startup-state-DAf2Xd`의 실제 C++ 첫 프레임 HUD/배치 위치가 통과했어요. 초기 코어의 `.2/.3` 정확한 부동소수점 동등 단언은 허용 오차 비교로 수정했어요. 실제 구현 오류로 세지 않아요.
- `animation-blend-space-cost-xGaboc`: Actor1/트랜스폼 클립3, 준비100회/5×1000Tick에서 Direct 중앙.0082166ms, 두 축 혼합.0083768ms예요. 포즈120bytes·샘플 가중치24bytes의 버퍼를 재사용해요. 이 작은 CPU 측정은 전체 FPS/프로세스 메모리/탄막/모바일·발열 근거가 아니에요. 샘플64/축 격자64/보정60초·기존 문맥2048/포즈64MiB 한도를 유지하고 계산 도중 한도를 회피하지 않아요.

연구에서 확인한 별도 격자 bilinear/선호 삼각 방향, 추가 보정 곡선/속도 상한/감쇠비, 샘플·뼈별 가중치 보정, 축에 따른 클립 배속, root motion 기반 좌표 자동 계산·Analysis/Aim Offset은 후속 계약이에요. 현재 메뉴로 미지원 설정을 받거나 구현한 것으로 세지 않아요. 몽타주/슬롯·IK/리타깃/Root Motion과 다른 전체2D·렌더/월드·게임/C++/AI·UI/오디오·모바일/배포·가벼움 누적 요구도 유지하며 다음 구현을 계속해요. 사용자 설치본/프로필/게임 원본/열린 작업 창은 변경하지 않았어요.
