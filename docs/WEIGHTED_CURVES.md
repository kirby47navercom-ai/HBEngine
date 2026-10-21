# 공용 가중 탄젠트

블루프린트 타임라인·커브/트랜스폼 애니메이션 에셋·Animation Graph의 곡선 샘플러·Level Sequence의 연속 값은 `curve-sampling.js`를 공유해요. 선택 키의 **진입 가중·진출 가중**으로 길이를 입력하고, 우클릭 **가중 탄젠트**를 켠 뒤 핸들을 끌어 길이와 기울기를 함께 바꿔요. 연결된 User 기울기는 함께 변하며 Alt/Break는 한쪽 기울기만 바꿔요. 가중 길이는 드래그한 쪽만 바뀌고 다른 축·반대쪽 길이는 보존해요. 가중치 해제는 기울기를 보존해요. Auto/Linear/Constant로 바꾸면 저장한 기울기·가중치를 지워요.

에셋 키의 선택 필드 `arriveWeight`, `leaveWeight`는 인접 시간 구간에 대한 수평 길이 비율0..1이에요. float는 수, vec2/vec3/color는 값과 같은 길이의 배열이며 축마다 따로 쓸 수 있어요. 없는 쪽은1/3이에요. 두 끝의 가중치가1/3이면 기존 Hermite 연산 경로와 비트 단위로 같아요. 가중 구간은 시간축 Bézier를 역으로 구하고 값축 Bézier를 평가해요. 기울기는 기존대로 값/초이고 실제 길이는 키 간격에 비례해요. 0·1과 교차하는 제어점도 허용하되 시간은 단조예요. 최대48회의 제한된 수치 계산만 가중 구간에 적용하며 룩업 표·영구 캐시·작업자·GPU 자원을 만들지 않아요.

`sequence.curve.edit`는 기존 `path`, `expectedRevision`, `dryRun`, `track`, `key`에 같은 두 가중 필드를 받아요. `null`은 해당 필드를 지워 기본1/3로 되돌려요. 잘못된 범위·NaN·형식·쿼터니언 가중은 문서를 바꾸기 전에 거부해요. 사람과 AI가 같은 JSON·검증·Undo·저장·게임 실행 서비스를 사용해요. 타임라인/커브/애니메이션 에셋의 기존 document.patch도 같은 검증을 받아요. 가중치가 없는 에셋은 변환하지 않아요.

쿼터니언은 기존 slerp·계단을 유지하고 가중치를 받지 않아요. 이벤트/이산 트랙도 가중치가 없어요. Unreal의 물리적 핸들 길이 저장 형식이나 Unity 파일/바이너리를 직접 호환한다고 주장하지 않아요. 1309 이후 [키 범위 밖 유지·선형·반복·오프셋·왕복](CURVE_INFINITY.md)이 공용 편집·실행에 연결돼 있어요. 시간 왜곡·클램프 자동 곡선·전문 필터·다중 핸들 MMB 편집은 별도 범위예요.

## 대조한 공식 내용

- [Unreal5.8 Curve Editor](https://dev.epicgames.com/documentation/unreal-engine/animation-curve-editor-in-unreal-engine): Editing Tangents와 Weighted Tangents 본문의 길이·영향·연결/분리 조작을 읽었어요. 이 문서의 다른 도구/링크 전체 분석으로 세지 않아요.
- [Unity6.0 Keyframe.outWeight](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Keyframe-outWeight.html): 본문/API와 예제의0..1, 진출/진입 활성 구분, 기본1/3, 양쪽0 조건을 대조했어요. Unity6.5 새 포털 inWeight 본문 직접 열기는 크기 제한으로 실패했고 검색 발췌를 전체 읽기로 세지 않아요.

HB의 선택 필드 유무를 활성 모드로 쓰는 형식과 축별 배열·시간 역산·검증은 자체 설계예요. corpus supplemental1294에 지정 범위만 등록했어요. 전체 공식 본문/API gate를 올리지 않아요.

## 검사

`tools/check-weighted-curves-1294.mjs`: 독립 순방향 Bézier 시간/값240표본, 정확한 비가중/1/3 호환, 세 공용 샘플러와 타입·원자적 편집·실제 시퀀스 서비스의 seek/복원. `tools/check-weighted-curves-1295-window.mjs`: 소유 격리 편집기의 실제 입력·핸들 드래그·Undo·배치·AI revision/dry-run·중첩 시퀀스 Play/Pause/Seek. `--player --executable`는 해당 설치본으로 실제 D3D11 게임을 빌드해 독립 계산 위치[10,4.125,0]을 대조해요. 실제 휴대폰이나 GPU 성능 검사로 계산하지 않아요.
