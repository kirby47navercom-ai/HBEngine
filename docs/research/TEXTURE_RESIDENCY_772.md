# 756–772 · 실제 GPU 상주 밉과 머테리얼 예산

## 사용

장면에 `TextureStreaming` 컴포넌트를 추가한다. 컴포넌트가 없으면 기존 전체 텍스처 업로드를 유지한다. 상주 예산·전환 예산은 MiB, 수요 갱신은 초다. 여러 설정 중 높은 priority, 동률이면 소유자 ID 순으로 하나를 선택한다. MeshRenderer의 `textureStreamingPriority`는 제한된 예산에서의 우선순위다. `textureStreaming=false`는 전체 밉 고정이며 필수 사용량에 포함한다.

`hb::Materials::SetResidentMip(actor,"Paint",1)`과 생성 노드 `materialResidentMip`는 수동 시작 밉을 고정한다. `-1`은 자동 요청으로 복귀한다. 활성 풀이 없으면 -1은 전체 해상도를 복원한다. 같은 파라미터를 사용하는 머테리얼/샘플러를 함께 준비하며 실패·교체·해제·더 최신 요청에는 후보를 버린다. 잘못된 밉은 원래 바인딩을 유지한다. C++의 기존 Components SetBool/SetFloat/SetInt로 풀과 MeshRenderer 속성을 설정한다. 프로젝트 파일과 저장 텍스처는 수정하지 않는다.

프로파일러에 머테리얼 밉의 상주·예산·요청·임시 예약·상태가 표시된다. AI는 같은 컴포넌트 제작/CAS/Undo와 `profiler.textureResidency({offset:0,limit:64})`를 사용한다. limit 최대256은 페이지이며 총 텍스처/오브젝트 제한이 아니다. `schema.textureResidency`, `schema.textureResidencyPool`은 불변 계약이다. 각 항목에 소유자·파라미터·요청/예산/상주 밉을 반환한다.

## 메모리와 수명

- 가져오기 결과의 명시적 RGBA8 2D/배열/큐브/볼륨을 새 texture/Source의 작은 물리 크기로 올린다. 일반적인 packed 원본 픽셀 버퍼와 샘플러/UV/색 공간을 공유하며 작은 그림에서 세부 밉을 재생성하지 않는다. 후보 생성은 기존 Source 버전을 변경하지 않는다.
- 명시적 LOD 입력은 계속 원본 밉 번호다. 래스터와 공유 광선 IR에서 resident base를 뺀다. 자동/편향/기울기 모드는 물리 크기의 미분을 사용한다. 내부 LOD 보정은 사용자 float 파라미터 목록에 나타나지 않는다.
- 원본 decoded CPU 밉은 복원과 영역 수정을 위해 유지한다. 이 기능은 CPU 원본 해제나 비동기 디스크 스트리밍이 아니다. 기존 CPU Float32 변환 캐시 예산과 별도다.
- 예산은 이 장면의 노드 머테리얼 텍스처 밉 **페이로드**다. 지원하지 않는 바인딩의 추정 가능한 고정 페이로드도 합산한다. 알 수 없는 할당은 `unknownAllocations` 개수로 분리한다. 스프라이트/UI/렌더 타깃/광선 atlas/드라이버 패딩·heap 전체를 포함하는 VRAM 한도가 아니다.
- 최저 밉·명시 고정부터 계산한다. 남은 바이트를 우선순위→부족한 세부 단계→화면 중요도→안정 ID 순으로 배분한다. 최저 밉이나 고정 요청만으로 예산을 넘으면 `minimumBytes`/`overBudgetBytes`를 그대로 표시한다. 예산0이 텍스처 소멸을 뜻하지 않는다.
- 축소 후 확대 순으로 처리하며 후보 페이로드를 **생성 전에** 전환 예산에 예약한다. 한 비동기 묶음만 준비하고 모든 후보의 유효성을 확인한 뒤 바인딩한다. 변경 도중 픽셀/UV/샘플러/소유자/설정/요청이 바뀌면 취소한다. 한 번의 전환 수는 작업 분산 예산이다.
- 예약은 적용 후 두 번의 후속 장면 준비 pass 동안 유지한다. 여러 뷰가 있는 장면에서 이는 GPU fence나 드라이버 실제 퇴역 완료가 아니다. 전환0/후보보다 작은 예산은 할당 전 차단하고 `blockedTemporary`에 표시한다. 프로파일러 수치를 전체 VRAM 최고점으로 해석하면 안 된다.

## 수요와 남은 범위

활성 주 카메라와 모든 연결 메시의 가시성/레이어/구 경계 투영, UV 범위와 샘플러 변환으로 2D/배열 수요를 추정하고 같은 바인딩의 가장 높은 수요를 사용한다. 정사영은 거리와 무관하다. 화면 밖은 최저 밉을 요청한다. 큐브/볼륨 및 변형/인스턴스 메시는 보이는 동안 세부 밉0을 보수적으로 요청한다. 임의 노드 그래프의 실제 UV 미분, 반사/그림자/GI/보조 카메라에서만 필요한 수요는 정확히 해석하지 않는다. 필요한 재질은 수동 요청/자동 제외로 보존한다. 이 범위의 자동 추정, 첫 가져오기/명시적 SetTexture 전체 업로드와 이후 풀 전환을 구분한다.

비동기 디스크 밉 읽기/취소/압축·HDR·플랫폼 cook, 전역 GPU/전환 heap 예산, 보조 뷰·정확한 그래프 미분 수요는 남아 있다. MAT-03 전체를 완료로 승격하지 않는다. 전역 곡면 역대응·복합 거친 매질의 필터와 복잡한 GL 초기 준비 지연 및 다른 누적 엔진 작업도 유지한다.

## 원본 밉 부분 수정과 이전 프레임

`SetTextureRegion`의 level은 항상 원본 번호다. 상주 영역은 physical level=level-base에 한 번만 쓴다. 비상주 세부 밉은 CPU 원본만 수정하고 GPU box를 보내지 않는다. 전체 복원 후 그 픽셀이 나타난다. 원본과 view 버전을 함께 검증하며 잘못된 묶음은 어느 쪽도 수정하지 않는다. 별도 cube face 배열로 저장된 허용 자료도 원본 면까지 갱신한다. 이전에 반환한 Float32 밉 스냅샷은 변경하지 않는다.

실제 GL/WebGPU/D3D의 이전 필드 검사에서는 **동일 resident view base1**을 유지하며 이전 시각0의 논리 LOD0(+Y)와 현재 시각2의 논리 LOD2(+Z)를 독립 대조했다. 이동·회전·음수 배율과 이전 머테리얼 시각/밉 폭을 유지하며 허용 오차4e-5를 넓히지 않았다. 텍스처 교체/수정 뒤에는 기존 이력 무효화 정책을 유지한다. 변경된 텍스처를 가로지르는 전역 시간 재사용을 새로 입증한 것은 아니다.

## 실행 근거

- 756: 모든 자료형의 0→1→2→0 크기/비용/Source/원본 픽셀/UV/샘플러 복원.
- 757LGVEoN·758cll7rI: 실제 GL/WebGPU 할당 descriptor와 D3D storageBytes/색, 24+12조합.
- 759DvMdVv: 실제 머테리얼8조합. 같은 컴파일 프로그램, 새 요청 우선, 픽셀/UV 변경 중 후보 취소. 최대 오차2.455e-8.
- 760rZaBvq·aORFAI: 공유 광선 텍스처 header/LOD72+36조합, 최대 오차2.455e-8.
- 761·762FD6S7v: 원본/물리 밉 매핑과 비상주0 GPU 쓰기, 상주4바이트 쓰기, 같은 리소스·전체 복원.
- 767: CPU 예산/강제 초과/임시 차단/설정·소유권 취소/준비 실패 전체 정리/가시성/UV. 1만 항목 계획 약6ms는 이 CPU 실행의 계획 시간이며 FPS 성능 주장이 아니다.
- 768MdvkbQ: 실제 GL/WebGPU의 두 머테리얼×네 자료형. 예산 분배·우선순위·화면 밖 수요·전환0·최저 밉·비활성 전체 복원과 픽셀.
- Player769 + 696EXzJIx: 98에셋 자체 게임. C++/블루프린트 수동 지정·자동 복귀, C++ 풀 설정, 실제 DirectX 래스터/경로 색, 부분 갱신0/4바이트, 복원·같은 프로그램. 실제 native 텍스처 페이로드: 2D84→20→4→84B, 배열216→36→12→216B, 볼륨192→12→4→192B, 큐브504→120→24→504B.
- 77111z8HA: 실제 편집기 컴포넌트/CAS/Undo/Redo와 AI 페이지/불법 페이지, 실제 프로파일러20→4→20→4B 및 보존 캡처. 캡처를 직접 확인했다.
- 5202UwSnd·521bqbh7t: 네 자료형의 실제 이전/현재 resident 노멀 필드 대조. GL/WebGPU 및 이전/현재 D3D 차이0.
- 기존520CgkRWS·521GTbaXs 4자료형×4모드의 이전/현재 정상 경로, 766 묶음10회귀/생성 일치 통과.

771의 첫 두 실패는 시험 문서의 dirty 저장과 저장 revision 인자를 빠뜨린 종료 처리였다. 원래 CAS 검증을 유지하고 올바른 revision으로 저장했다. 765 첫 실패는 경로 추적 타깃이 다음 프레임에 퇴역하기 전 통계를 baseline으로 잡은 문제였다. 실제 퇴역 후 baseline을 수집했으며 허용 오차/장면을 바꾸지 않았다. 이런 시험 수정은 제품 구현 성과에 포함하지 않는다.

## 추가 읽기

이전752의 UE5.8 스트리밍 overview/metrics와 Unity6000.7Beta 수동 본문에 더해, Unity6.6 `requestedMipmapLevel` 설명·예제(반환 본문239–268)와 `streamingMipmapsPriority` 설명(239–242)을 읽었다. Unity의 명시 요청도 메모리 예산에 의해 조정될 수 있으며 priority는 상대적인 밉 편향이다. HBEngine의 수동 요청은 보존하고 초과를 보고하는 정책이며 같은 알고리즘이라고 주장하지 않는다.

- [Unity6.6 requestedMipmapLevel](https://docs.unity3d.com/6000.6/Documentation/ScriptReference/Texture2D-requestedMipmapLevel.html)
- [Unity6.6 streamingMipmapsPriority](https://docs.unity3d.com/6000.6/Documentation/ScriptReference/Texture2D-streamingMipmapsPriority.html)

연결된 ClearRequested/loaded/minimum/StreamingController API 본문은 이번에 읽지 않았다. three.js Frustum 문서의 index만 반환되었고 직접 본문 재요청은 실패했다. 로컬 의존성의 실제 API와 수학/실행 검사를 사용했으며 웹 본문 분석 완료로 세지 않는다. 전체 Unreal·Unity 분석 gate/완료율은 승격하지 않는다.
