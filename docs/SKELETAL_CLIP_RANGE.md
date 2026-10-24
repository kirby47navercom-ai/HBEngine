# 기존 골격 클립의 구간 편집

골격 클립 속성의 **클립 구간**에서 시작·끝 초를 지정하고 **구간 적용**을 사용해요. 기존 클립 안의 위치/회전/스케일/모프 트랙과 곡선·알림을 자르고 0초부터 재배치해요. 원본 모델이나 미리보기 골격 없이 기존 이름/바인딩 경로를 유지해요. 같은 문서의 한 Undo로 되돌리고 기존 저장을 사용해요. 생성/추출과 다른 명령이에요.

선형·step·quaternion은 원본 내부 키와 경계 표본을 보존해요. weighted/auto 곡선은 외부 이웃의 접선을 먼저 고정하고 경계를 분할해요. 점 알림은 `[start,end)`, 겹친 상태 알림은 창을 잘라 ID/페이로드를 유지해요. Smooth의 이웃 의존 보간과 반복 곡선의 외부 영역은 **명시적으로 베이크**해야 해요. 1~240 FPS 표본률과 sampledTracks/sampledCurves를 결과로 알려요. 임의 근사를 무손실 편집으로 표시하지 않아요.

잘못된 범위·보간/자료형·Float32에서 겹치는 키·표본 예산 초과는 전체 변경 전에 실패해요. 긴 비동기 표본화는 작업을 양보하고 문서 교체/닫기/실행 시작을 확인하며 원본은 성공 때만 한 번 바꿔요. 곡선만 있는 클립도 지원해요. 일반 TRS 키 직접 편집·모든 DCC 리그 편집을 추가한 것은 아니에요.

AI: `skeletal.range.edit`의 `path`, `expectedRevision`, `start`, `end`, 선택 `custom:'bake'`, `fps`. 기존 CAS/검증/Undo/저장을 사용해요. `dryRun` 기본 응답은 요약이고 전체 초안은 `includeData:true`예요. 런타임 포맷은 기존 v1으로 그래프·몽타주·시퀀스 로더를 그대로 사용해요.

소유자: `skeletalClipRangeJob`, `editSkeletalClipRange`, `editSkeletalClipRangeAsync`, `RetargetEditor.trimClip`. 검사: `node tools/check-skeletal-range-2444.mjs`와 기존 모델 추출/구간 검사. 새 실제 창·기기/설치 증명은 포함하지 않아요.

구간 자르기와 별도로 [직접 TRS/모프 키 편집](SKELETAL_TRACK_KEYS.md), [클립 길이 재조정](SKELETAL_CLIP_RETIME.md)을 제공해요. 길이 재조정은 전체 클립의 시간과 알림·곡선을 동일 배율로 옮기고 원래 보간을 유지해요.
