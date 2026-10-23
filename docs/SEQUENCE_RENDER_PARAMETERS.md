# 시퀀스 머테리얼·광원 파라미터

`SequenceRenderParameters`는 기존 머테리얼/광원/컴포넌트 트랙의 공유 필드를 찾아요. 새 에셋 형식이나 별도 편집기는 추가하지 않아요. 기존 시퀀스 키 편집·가중치·우선순위·완료 정책과 C++ `LevelSequence` 제어를 사용해요.

- 머테리얼의 `Roughness`/`roughness` 같은 표면 Float 별칭은 같은 필드에서 혼합해요. 현재 파라미터 오버라이드를 기준값으로 잡고 Stop에서 복원해요. 그래프·레이어 파라미터는 정확한 이름을 우선해요. 예를 들어 그래프에 소문자 `roughness`가 있어도 대문자 `Roughness` 표면 설정을 그 파라미터로 바꾸지 않아요.
- 범위는 `materialFloatProperty`와 표면 Float 입력, `emissiveIntensity`예요. Vector·색상·텍스처·Bool을 Float로 쓰거나 알 수 없는 이름을 쓰면 거부해요. 그래프에 연결되어 독립 표면 uniform이 없는 입력은 기존 렌더러 setter의 거부 규칙을 유지해요.
- 오브젝트·장면 그룹·머테리얼 데이터의 수명을 함께 확인해요. 교체한 머테리얼은 다음 샘플에서 새 기준값으로 다시 연결하고, 이전 인스턴스의 복원값이 새 인스턴스에 쓰이지 않게 해요.
- 직접 광원 트랙, `Light2D`/`PointLight`/`DirectionalLight`/`SpotLight`의 `intensity` 컴포넌트 트랙, 전체 컴포넌트 Take는 같은 필드를 공유해요. 여러 2D 광원이 있으면 실제 표시된 마지막 활성 컴포넌트를 사용해요. 다른 액터에 속한 하위 광원은 건드리지 않아요.
- 밝기만 바뀌고 전체 시각 컴포넌트 서명이 일치하면 실제 Light/2D 상태만 갱신해요. 쿠키·볼륨·메시·머테리얼 자원은 유지해요. 색상이나 다른 속성 변경이 대기 중이면 기존 갱신 경로로 돌아가요. 모든 대상 확인 후 쓰므로 일부만 바꾸고 실패하지 않아요.
- 변경 없는 전체 컴포넌트 Take도 같은 프레임에 겹친 필드만 다시 제시해서 작성 순서를 유지해요. 겹치지 않는 고정 Take는 재복제·재구축하지 않아요. 기록 키 원문은 변경하지 않아요.

소유자는 `node tools/hb.mjs context "머테리얼 시퀀스" --symbol materialSequenceParameter` 또는 `--symbol syncLightIntensityProperties`로 찾아요. 소스 검사는 `tools/check-sequence-render-aliases-2118.mjs`, 저장 재현 프로젝트의 공용 실행 검사는 `tools/check-sequence-render-fixture-2126.mjs`예요. 후자는 실제 장면·머테리얼 코드를 사용하지만 C++ 제어·조회 호출 형태는 소스 어댑터로 대신해요. C++ 바이너리 검증은 아니에요. 기존 실제 창 검사 `tools/check-sequence-indexed-transforms-2104-window.mjs`는 같은 프로젝트에서 리그와 렌더 파라미터를 함께 확인하고, 설치본 사용 중이면 실행을 미뤄요. 소스 통과와 실제 C++/창/설치 통과는 각각 기록해요.

가져온 AnimationMixer의 머테리얼·광원 property binding과 위 직접 트랙 사이의 일반 공유 소유권은 별도 잔여예요. 이 문서는 렌더링 전체·엔진 전체 완료를 뜻하지 않아요.
