# 기존 골격 클립의 TRS·모프 키 편집

골격 클립의 **골격 키 편집**에서 트랙과 키 시간·채널 값을 직접 바꿔요. 위치는 m, Euler 회전은 rad, 쿼터니언은 XYZW예요. 전체 쿼터니언 값은 정규화하고 0에 가까운 회전은 거절해요. 계단/선형/Smooth를 고르며 전체 쿼터니언의 Smooth는 거절해요. 새 트랙 경로는 `Bone.position`, `Bone.quaternion`, `Bone.scale[x]`, `Face.morphTargetInfluences`처럼 지정해요. 새 트랙은 중립 키를 만들고 전체 모프 배열에만 채널 수를 사용해요.

키·채널을 페이지로 나누어 표시해 큰 값 배열을 모두 DOM에 만들지 않아요. 추가 시간의 값을 생략하면 수정·삭제를 먼저 적용한 트랙을 실행기의 실제 Float32 보간기로 표본화해요. Smooth에 키를 추가하면 주변 접선이 다시 계산되므로 전체 곡선 모양의 보존을 보장하지 않아요. 키 이동은 시간순으로 정렬하며 같은 원래 번호의 중복 수정/삭제 충돌, 구간 밖 시간, Float32에서 겹치는 시각을 거절해요. 마지막 키를 지우면 그 트랙을 제거하고 클립 길이·알림·별도 메타데이터 곡선은 유지해요.

수정·추가는 새 선택 트랙의 평면 배열만 준비하고 원래 키마다 별도 객체를 만들지 않아요. 큰 결과는 4,096키마다 제어권을 양보하며 준비 중 문서 교체/종료/실행 상태 변경은 게시하지 않아요. 마지막에 한 Undo로 반영하고 무변경은 Undo를 만들지 않아요. 기존 전체 클립 검증과 Undo 스냅샷·선택 트랙의 평면 배열 복사 비용은 여전히 데이터 크기에 비례해요. 원본의 수정하지 않은 트랙/메타데이터를 구조적으로 공유하며 직접 외부 배열 변경은 정식 편집 계약이 아니에요.

AI 명령은 `skeletal.track.read`, `skeletal.track.create`, `skeletal.track.keys`예요. 생성/수정은 `path`, 필수 `expectedRevision`, 정확한 `track` 경로를 사용해요. 수정은 `edits:[{index,time?,values?}]`, `remove:[index]`, `insert:[{time,values?}]`, 선택 `interpolation`이에요. 번호는 수정 전 트랙 기준이며 값은 항상 채널 배열이에요. `dryRun`은 기본적으로 요약이고 `includeData:true`일 때만 전체 후보를 반환해요. 키 조회는 `offset/limit`과 `channelOffset/channelLimit`으로 제한된 행만 복사해요. AI 준비 중에는 저렴한 identity 검사를 사용하고 마지막에는 기존 문서 CAS로 확정해요.

파일은 기존 v1 `.hbskeletalclip.json`이며 기존 그래프/몽타주/시퀀스와 C++ 재생 경로를 사용해요. `node tools/check-skeletal-track-keys-2553.mjs`는 공용 도구·실제 사람용 위젯/편집 트랜잭션·AI 함수·저장 후 AnimationGraphPlayer를 확인해요. 실제 창·GPU 출력·새 C++ 바이너리·기기·설치 검증은 별도예요.
