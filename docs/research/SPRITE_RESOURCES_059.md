# 스프라이트 프레임 자원 재사용과 완료 프레임 통계 — 059

2026-10-08. 같은 렌더 설정의 스프라이트 프레임 교체에서 기존 Mesh·Material을 유지하고 텍스처를 교체한다. 일반 평면의 크기가 같으면 Geometry도 유지한다. 크기/피벗·UV/노멀/마스크·그림자·flip·정렬은 새 프레임대로 갱신한다. 머테리얼 오버라이드나 렌더 설정 변경은 기존 재생성 경로를 유지한다. 슬라이스 형상은 다시 생성하고, 동일 뼈대 형상은 이전 변형을 새 bind pose로 재등록하지 않는다. 뼈대 애니메이션의 새로운 실제 창 대조를 이 단계의 증거로 추가하지 않는다. 기존 텍스처 소유권·상한과 dispose를 유지하며 새 무제한 캐시는 없다.

기존 `hb::Sprites::SetSprite`와 BP Set Sprite가 같은 공용 서비스에 연결된다. 선택 경로를 반영한 뒤 기존 spriteFlip 훅으로 componentSignature도 동기화하여 이후 위치 수정에서 전체 그룹을 다시 만들지 않는다. GPU 머테리얼 clone은 이미 반환된 최초 프레임 대신 현재 map/normal을 사용한다.

## 실제 실행과 통계

- 실제 GPU `gpu-scene-gULfDF` / GL `gpu-scene-6giic6`: 서로 다른 두 텍스처를 12번 교체해 동일 머테리얼·도형 UUID, 실제 cyan/magenta 픽셀을 확인한다. C++ 함수 호출과 S 키→BP 교체도 같은 UUID다. 기존 2D 마스크·범위·컷오프·조명·타일·입자·효과·픽셀 정렬·자원 반환·사본 보존·오류0·자기 프로세스 종료0도 통과한다.
- `check-render-resources.mjs`: 12회 같은 프레임 Mesh/Material/Geometry 유지·중도 dispose0, 설정/크기 변경의 재생성·종료 dispose와 기존 공유/차용 자원 경로 통과.
- 실제 GPU 에디터 `gpu-editor-1SItQO`: 주/추가 뷰포트·여섯 보기 모드·머테리얼 미리보기·BP/C++·저장 격리·자원 반환·종료 통과.
- 설치 Three r180의 Info/Animation 전체 본문을 대조하여 엔진 소유 프레임 시작에 info.reset, autoReset=false를 적용한다. GPU 내부 RAF는 계속 유지한다. 완료된 프레임의 작은 통계 스냅샷으로 VM 대기 중 0이 보이는 문제를 고친다. GPU render.calls는 누적 호출, drawCalls/frameCalls는 프레임 수치이고 GPU 표시 지연으로 읽지 않는다. GL도 여러 렌더 패스를 합산한다. 완료된 GPU 실제 예에서는 drawCalls6, GL calls4가 기록되며 기존 0 결과는 실패 흔적으로 남긴다.

## 동일 게임 전체 프레임 대조

058 패키지와 현재 패키지를 각 렌더러별 이전/현재/현재/이전으로 실행했다. 고정 Test_Valen 사본 608개 Assets/Source SHA,1280×720/release/PC120, 대기3초·공격6초를 유지한다. 각 열은 두 실행 평균, p95 평균은 합친 표본의 p95가 아니다.

|렌더러|구간|이전 FPS|현재 FPS|이전/현재 작업 중앙값|이전/현재 작업 p95|
|---|---|---:|---:|---|---|
|GL|대기|116.50|113.10|6.05/6.25ms|8.85/9.20ms|
|GL|공격|116.36|117.55|6.25/6.20ms|9.40/9.10ms|
|GPU|대기|119.34|118.43|6.25/6.25ms|8.20/8.25ms|
|GPU|공격|113.64|107.43|6.90/7.15ms|10.75/12.40ms|

현재 GPU 공격은95.44/119.42fps, GL 대기는119.29/106.91fps로 변동한다. 이번 전체 게임 결과에서 전체 FPS 개선이나 변경의 순수 효과를 주장하지 않는다. **목표 false**다. 현재/이전 패키지의 정확한 소스 SHA·PNG·C++ 시간·HUD·실제 스프라이트·종료를 `native/build/auric-frame-zMc2qe/acceptance.json`에 기록했다. 최초 qrMCR7은 세 실행 뒤 중단했고 failure.json이 없어 원인은 미확정이며 흔적을 보존했다. 다음 실행은 `native/build/auric-frame-059.log`에 stderr까지 저장하여 8회 정상 종료했다. 짧은 heap 수치를 8시간 RAM 성장 해결이나 실제 모바일60 증거로 바꾸지 않는다.

## 근거 읽기 범위

[Unity SpriteRenderer.sprite](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/SpriteRenderer-sprite.html)의 자체 서명·설명·전체 예제를 읽었다. 기존 SpriteRenderer의 sprite를 바꾸는 제작 API를 유지한다. Unity 내부 자원 구현이 HB와 같다는 추론은 하지 않는다.

[Epic UPaperSpriteComponent](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/Paper2D/UPaperSpriteComponent)의 자체 클래스 설명/속성/API 표 전체와 [BP SetSprite](https://dev.epicgames.com/documentation/unreal-engine/BlueprintAPI/Sprite/SetSprite)의 자체 설명·입출력 표 전체를 읽었다. HB 기존 SetSprite는 void이며 비동기 작업 검증 경로다. Unreal의 bool 반환 계약·Sprite 기반 충돌 재생성·소켓·transient texture override를 이 재사용 변경으로 모두 구현했다고 세지 않는다. 별도 C++ SetSprite 메서드 URL 읽기는 실패했고 클래스/BP 본문으로 구분하여 기록했다.

설치 `three/src/renderers/common/Info.js`, `Animation.js`는 전체 읽기, PostProcessing은 render/_update 관련 부분, [WebGPURenderer](https://threejs.org/docs/pages/WebGPURenderer.html)는 자체 class/Options 요약 읽기다. 연결된 부모/전체 API는 미독이다. HTML·설치 소스 사본·SHA·실제 증거는 `native/build/sprite-resource-research-059/manifest.json`이다. 전체 corpus/API 분석 완료나 상용 엔진 동등성으로 승격하지 않는다.

누적 선행 목표를 이어가며 사용자 설치본은 유지한다.
