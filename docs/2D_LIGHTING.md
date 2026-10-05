# 전용 2D 광원

2026-10-05. 제작창과 배포 Player의 같은 WebGL 렌더 경로에 연결한 자체 계약이에요. [표면·3D 그림자](2D_SURFACE_NORMAL_SHADOWS.md)와 함께 사용해요.

## 직접 읽은 근거

- [Unity6000.0 Light2D Properties](https://docs.unity3d.com/6000.0/Documentation/Manual/urp/2DLightProperties.html): 기술 본문과 표126–437의 종류·반경/각도·모양 편집·블렌드/겹침·그림자/볼륨·노멀 설정을 읽었어요. 이미지와 연결 문서는 미독이에요.
- [URP17.0.4 Light2D](https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@17.0/api/UnityEngine.Rendering.Universal.Light2D.html): 자체 Properties/Methods 끝까지 선언·설명·인자·반환을 읽었어요. 상속/연결 API는 미독이에요. 이전7개 속성 부분 읽기 이후의 추가 읽기예요.
- [NormalMapQuality](https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@17.0/api/UnityEngine.Rendering.Universal.Light2D.NormalMapQuality.html): 자체 선언/3개 필드 설명118–155를 읽었어요.

원문 응답·redirect·SHA·읽기 경계는 Git에서 제외한 `native/build/light2d-docs-ixHRQl/manifest.json`에 있어요. 전체 corpus/API gate는 승격하지 않아요.

## 공용 제작·실행 계약

오브젝트 만들기에 Point/Spot/Global Light2D를 추가했어요. 새 light2d 오브젝트의 기본 컴포넌트는 Transform/Light2D예요. 장면 속성/BP 컴포넌트/AI schema는 같은 정의를 사용해요. 대상 정렬 레이어는 체크 목록이며 모르는 ID도 저장해요. 다중 편집에서 각 대상의 다른 선택을 보존하고 클릭마다 Undo/Redo를 기록해요.

| 설정 | HB 동작 |
| --- | --- |
| lightType | global / point / spot |
| enabled, color, intensity | 켜기·선형 RGB·밝기0..100000 |
| targetSortingLayers | 안정적 레이어 ID 배열≤64; 빈 배열은 대상 없음 |
| innerRadius / outerRadius | 0..100000 / .001..100000; 안쪽 ≤ 바깥쪽 |
| innerAngle / outerAngle | 0..360도; 안쪽 ≤ 바깥쪽; Spot 로컬 +Y 방향 |
| falloff | .01..16; 반경 감쇠 지수 |
| normalMode / normalDistance | disabled / fast / accurate; 가상 높이 .00001..100000 |

SpriteRenderer/TilemapRenderer는 Unlit, **2D Lit**, 기존3D Lit를 선택해요. 저장값 lit과 기존 SetLit(true)는3D Lit를 유지해요. 2D Lit는 월드 XY에서 광원/표면 Z를 무시하며 부모·회전·비균일 XY 크기를 투영 역변환으로 반영해요. Global은 변환과 무관해요. 이 표면의3D 광원 조명 계산은 생략해요.

노멀은 같은 linear 텍스처/atlas UV/강도/Y 반전을 사용해요. Accurate는 픽셀 XY, Fast는 메시 원점으로 입사 방향을 계산해요. normalDistance는 가상 Z예요. Fast 근사는 자체 구현이며 Unity 내부 알고리즘 동일성 주장이 아니에요. Disabled/Global은 노멀 방향을 조명량에 곱하지 않아요. SpriteMask·정렬 그룹·타일 레이어와 공존해요.

현재 대상 광원 RGB×밝기를 더하고 표면 색상에 곱해요. 여러 Global도 더해요. Unity의 레이어/블렌드 스타일당 Global 제한·겹침 규칙과 구분해요. Freeform/Sprite cookie·블렌드 스타일/조명 마스크·2D/복합 그림자·볼류메트릭·뷰포트 광원 윤곽 편집은 후속이에요. cast/receiveShadow는 기존3D 설정이며2D Lit의 전용 그림자가 아니에요.

## C++·블루프린트

hb::Light2D Set/Get 쌍16개가 같은 서비스를 사용해요: Enabled, Type, Color, Intensity, Range, Angles, Normal, TargetSortingLayers. Enabled 조회 이름은 IsEnabled예요. 여러 반환값도 BP 핀으로 나와요. Sprites::SetLightingMode/GetLightingMode는 unlit/lit2d/lit를 선택해요. 기본 노드591개, 공통 계산 API289개예요.

```cpp
hb::Sprites::SetLightingMode(hero, "lit2d");
hb::Light2D::SetType(lamp, "spot");
hb::Light2D::SetRange(lamp, 1.f, 4.f, 2.f);
hb::Light2D::SetAngles(lamp, 45.f, 120.f);
hb::Light2D::SetNormal(lamp, "accurate", 3.f);
hb::Light2D::SetTargetSortingLayers(lamp, {"default"});
```

유한 수/교차 범위/ID/배열을 JS/C++에서 검사하고 실패 변경은 기록하지 않아요. 같은 C++ 호출의 쓰기 후 읽기에 대기 변경을 반영해요. properties 없는 선택 필드도 기본값에서 초기화해요. C++ Float32 최솟값을 JS의 같은 경계로 정규화해요. 공용 Light intensity/Sequence light 트랙도 Light2D를 사용해요.

## 비용·검증

활성 광원은 장면당64개예요. 넘으면 거절해 일부를 조용히 누락하지 않아요. 광원당7 RGBA32F 텍셀=112bytes, 용량은2의 거듭제곱/최대7168bytes예요. 2D Lit 표면 또는 광원이 없으면 해제하고 배열 재사용/바뀐 값만 업로드해요. 타일 레이어는 기존 메시를 유지해요. GPU 데이터 크기이며 전체 메모리/FPS·모바일 발열 수치가 아니에요.

- `node tools/check-2d-lighting.mjs`: 입력/레이어 UI/JS/headless·legacy 기본값·실제 C++16개 즉시 읽기/쓰기·최솟값·BP 서명을 확인해요.
- 실제 Editor `authoring-window-heP5Hg`: 물리 체크·장면/BP Undo/Redo·BP 저장·기존 분할/노멀/타일/단축키·GPU77개·예외0·exit0/소유 서버 종료가 통과해요. 속성 창 PNG를 직접 보았어요. 이후 아이콘을 공용 컴포넌트 정의에 맞췄어요.
- 최종 배포 Game.exe `authoring-window-CfFWyo`: BP→C++ 즉시 설정/조회→BP 여러 반환 핀→사용자 C++ 검증 값2개 true·위치[-2,-1,.25]·shader 광원1개/112bytes·linear 노멀96×32·Source 참조 cooking·GPU77개·예외0·원본 바이트·exit0/서버 종료가 통과해요. light2d-gpu PNG를 직접 보았어요.
- 전용 GPU28개는 빛 없음/타입/색/레이어63·Z/부모/회전/크기·감쇠/노멀3모드·3D 광원 분리·SpriteMask/Tile·해제/업로드/65개 거절을 확인해요. 지정64×64 픽셀에서 Accurate230/Fast255·감쇠195/84였으며 속도 수치가 아니에요.
- main591/API 생성 일치·scene58종·diff 검사가 통과해요. Px56Mb 종료 실패는 검사용 BP 미저장 확인창이었고 저장을 추가한 heP5Hg가 통과해요. hx7NHK/g5f51U는 검사 레이어 복원/API 응답 경로 오류였어요.

사용자 설치·게임·프로필·창을 보존하며 전체 누적 엔진 세부를 계속해요.
