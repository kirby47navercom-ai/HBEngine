# 엔진 현재 상태와 추가 구현 원장

갱신일: 2026-10-17 · 대조 기준 커밋: `3f5c68e`

기준 데이터는 [ENGINE_STATUS.json](research/ENGINE_STATUS.json) 하나다. 과거 문서의 “아직 없음”보다 각 행의 구체적인 구현/잔여 범위를 우선한다. verified는 해당 행의 구현 범위만 검증했다는 뜻이다. 등록 항목 수는 Unreal/Unity 전체 API 분모가 아니므로 전체 완료율은 계산하지 않는다.

현재 등록 78항목: 정의한 범위 구현·검증 근거 있음 39개 / 구현된 부분과 추가 구현이 함께 있음 34개 / 아래 remaining의 제작/실행 경로 미구현 2개 / 실행 경로 또는 일부 표본은 있으나 요구 조건 검증 안 됨 3개

`node tools/hb.mjs status --local`은 창/서버 없이 읽는다. 실행 서버에서는 `GET /api/engine/status`를 사용한다. id·area·status·search 필터와 전체/일치 항목 수를 제공한다. 원장 갱신 후 `node tools/engine-status.mjs --write`로 이 문서를 동기화한다. 조회는 프로젝트 파일·실행 상태를 변경하지 않는다.

## 프로젝트

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| PRJ-01 설치형 실행기·프로젝트 생성/열기 | verified | Win32 에디터·플레이어, .hbproject 연결과 독립 프로젝트 경로 ·193: 사용 중인 이전 런타임 사전/복사 후 확인·새 버전 생성 전 보류·명시 상태·프로세스/수정 원본 보호·Versions1 검증 | 이 행의 범위는 검증됨 | [USER_INSTALL_151.json](research/USER_INSTALL_151.json) · [ENGINE_WORK_193.json](research/ENGINE_WORK_193.json) |
| PRJ-02 실행/편집 상태와 사용자 작업 격리 | verified | 별도 실행 월드·프로필·임시 검사 프로젝트 ·193: 사용 중인 이전 런타임 사전/복사 후 확인·새 버전 생성 전 보류·명시 상태·프로세스/수정 원본 보호·Versions1 검증 ·198: 격리 Engine 동일 Node 크기/SHA 정리·엔진 전체 실행 범위/변경 보호·복원 명세·소스 보존·실제 PowerShell/자식 프로세스 검사 | 이 행의 범위는 검증됨 | [USER_DEVELOPMENT_SEPARATION.md](USER_DEVELOPMENT_SEPARATION.md) · [ENGINE_WORK_193.json](research/ENGINE_WORK_193.json) · [ENGINE_WORK_198.json](research/ENGINE_WORK_198.json) |
| PRJ-03 복구 저장·데이터 호환 | partial | 버전 데이터 검증·복구 경로 | 중단·디스크 부족·다양한 구버전 전환의 통합 검증 | [EDITOR_INTERACTION_SPEC.md](EDITOR_INTERACTION_SPEC.md) |

## 에셋

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| AST-01 드래그 가져오기·의존 참조 | verified | 파일/폴더 가져오기·참조 이름 변경·재열기 | 이 행의 범위는 검증됨 | [EDITOR_INTERACTION_SPEC.md](EDITOR_INTERACTION_SPEC.md) |
| AST-02 모델 임포트 하위 에셋·재가져오기 | partial | 모델/클립 로딩과 형식별 로더 · 165: glTF/GLB/OBJ 하위 에셋 안정 ID·재정렬 대응·렌더 오버라이드 sidecar와 재가져오기 보존 ·178: 모델 단위/축·전용 설정/실제 미리보기·FBX ID/중복 이름 재가져오기·미연결 수동 대응/Undo·원본/sidecar 이름변경·일반 CAS/AI·패키징·같은 glTF C++ 루트 모션 | FBX unsafe 정수 ID/모든 애니메이션·네이티브 헤드리스의 형식별 지원과 실제 복잡한 DCC 파일 대조 · 재질/클립/스킨 추출·대응 제작 UI, 형식별 노멀/접선/UV/LOD·압축/품질 설정과 추가 코덱 | [ENGINE_PLAN.md](ENGINE_PLAN.md) · [ENGINE_WORK_165.json](research/ENGINE_WORK_165.json) · [ENGINE_WORK_178.json](research/ENGINE_WORK_178.json) |
| AST-03 임포트 캐시·쿠킹·압축 | partial | 의존성을 따라 배포 리소스 수집·중복 런타임 축소 · 165: 해시/대상/버전별 지속 JSON 쿠킹 캐시·128MiB LRU·빌드 공용 연결 | 텍스처/모델 대상별 압축 쿠킹과 전체 종속 캐시 · 압축 컨테이너·GPU 포맷 품질/용량 비교 | [MOBILE_EXPORT.md](MOBILE_EXPORT.md) · [ENGINE_WORK_165.json](research/ENGINE_WORK_165.json) |
| AST-04 프리팹·변형·오버라이드 | partial | 프리팹 생성·인스턴스 구성 · 165: 부모 변형·중첩·속성 오버라이드/되돌리기·순환 거부·배치/생성 카탈로그 공용 해석 · 168: 연결 인스턴스의 원본/부모/중첩 실시간 상속·축별 수정 보존·충돌/속성 Apply/Revert UI·원자 Undo·Play 준비/타입 참조 재배치 · 169: 명시 오버라이드 경로 저장·원본 동일값 이후 의도 유지·Apply/Revert 해제 · 170: 직접 자식 포함/추가삭제 Apply/Revert·전체 Apply 원본-장면 원자 Undo·변형 컴포넌트 안정 ID 속성/추가/삭제·상속 부모 자식 ·184: 중첩 자식 추가/삭제의 바깥 원본 Apply·additions/qualified removed·상속 중복 확장/원본 교체 정리·기본 컴포넌트 안정 ID·최종 계층/빌드검증·실제 Inspector/원자 UndoRedo/C++ Spawn ·186: 프리팹 격리 2D/3D 계층·변형·컴포넌트 제작/원본 탐색·복사/그룹/재지정 키·AI CAS/dryRun/Undo·중첩 부모 구조·실제 D3D/WebGPU/C++ 반영 | 장면 문맥의 잠금 배경·편집 환경 선택·중첩 Apply 목적지별 자동 라우팅 · 대규모 인스턴스 비용과 복잡한 변형/중첩 조합 검증 | [ENGINE_WORKFLOW_RESEARCH.md](ENGINE_WORKFLOW_RESEARCH.md) · [ENGINE_WORK_165.json](research/ENGINE_WORK_165.json) · [ENGINE_WORK_168.json](research/ENGINE_WORK_168.json) · [ENGINE_WORK_169.json](research/ENGINE_WORK_169.json) · [ENGINE_WORK_170.json](research/ENGINE_WORK_170.json) · [ENGINE_WORK_184.json](research/ENGINE_WORK_184.json) · [ENGINE_WORK_186.json](research/ENGINE_WORK_186.json) |
| AST-05 미디어 변환·동기화 | partial | 이미지/오디오·등록 모델과 미디어 읽기 경로 | 추가 코덱 변환기 · 영상·오디오·시퀀스 동기화와 seek 정밀도 | [ENGINE_PLAN.md](ENGINE_PLAN.md) · [WEB_MEDIA_CONTRACTS_023.md](research/WEB_MEDIA_CONTRACTS_023.md) |

## 편집기

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| EDT-01 문서 탭·에셋별 전용 편집기 | verified | BP·머테리얼·애니메이션·게임플레이 에셋을 구분한 문서 ·196: 이미지 전용 텍스처 보기와 가족 면/슬라이스 검사·문서 불변 | 이 행의 범위는 검증됨 | [EDITOR_INTERACTION_SPEC.md](EDITOR_INTERACTION_SPEC.md) · [ENGINE_WORK_196.json](research/ENGINE_WORK_196.json) |
| EDT-02 독립 창·도킹·복원 | partial | 독립 창과 재도킹·세션 배치 | 다중 모니터/DPI·종료/복구·대화상자 중 창 이동의 추가 안정성 검증 | [DETACHED_WINDOWS_RESEARCH.md](DETACHED_WINDOWS_RESEARCH.md) |
| EDT-03 작업창별 탐색·콘텐츠 브라우저 | verified | 독립 탐색 기록·폴더·검색/필터·다중 선택·생성 메뉴 | 이 행의 범위는 검증됨 | [EDITOR_INTERACTION_SPEC.md](EDITOR_INTERACTION_SPEC.md) |
| EDT-04 계층·컴포넌트 제작 | verified | 계층/부모·복제/그룹·등록 컴포넌트 속성 편집 | 이 행의 범위는 검증됨 | [EDITOR_INTERACTION_SPEC.md](EDITOR_INTERACTION_SPEC.md) |
| EDT-05 Undo·단축키·재지정 | partial | 문서별 Undo와 등록 조작 단축키/설정 ·183: 위젯/메시 전용22명령 재지정·작업창/입력/IME/실행/비행 격리·기존 키 우회 차단·사용자 프로필 기본값 충돌 이행·우클릭 현재 키 표시·AI get/set revision ·186: 프리팹 격리 2D/3D 계층·변형·컴포넌트 제작/원본 탐색·복사/그룹/재지정 키·AI CAS/dryRun/Undo·중첩 부모 구조·실제 D3D/WebGPU/C++ 반영 ·188: 전용9문맥 조작56개/총111 공용 키·프로필 이행/고정 키 우회 차단·분리 HWND 선행 키 전달/버튼 명령·몽타주 핸들 포커스·late clipboard 거절·실제 제작/Undo | 충돌/UV/리타게팅/오디오 등 나머지 전용 도구와 포인터 조합 조작의 재지정·포커스/입력 충돌 대조 | [EDITOR_INTERACTION_SPEC.md](EDITOR_INTERACTION_SPEC.md) · [ENGINE_WORK_183.json](research/ENGINE_WORK_183.json) · [ENGINE_WORK_186.json](research/ENGINE_WORK_186.json) · [ENGINE_WORK_188.json](research/ENGINE_WORK_188.json) |
| EDT-06 프로젝트 제작 도구 확장 | verified | 데이터 도구 에셋·입력 바인딩·동일 명령/Undo 실행 | 이 행의 범위는 검증됨 | [LIGHTING_TOOLS_128.md](LIGHTING_TOOLS_128.md) |
| EDT-07 현지화·접근성 | partial | 한국어/영어 검색과 DOM 기본 입력 접근 · 165: 문자열 테이블 편집·문화권/언어 fallback·포맷/복수·RTL·위젯 접근성 이름 · 166: 위젯 디자이너의 문화권 미리보기와 실행 공용 지역화/스타일 resolver | 편집기 자체 전체 번역 카탈로그 · 전용 편집기 키보드/스크린리더·색약/배율 검증 | [AUTHORING_UI_AUDIO_RESEARCH.md](AUTHORING_UI_AUDIO_RESEARCH.md) · [ENGINE_WORK_165.json](research/ENGINE_WORK_165.json) · [ENGINE_WORK_166.json](research/ENGINE_WORK_166.json) |

## 2D·2.5D

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| 2D-01 스프라이트·타일·애니메이션 입력 | verified | 스프라이트/타일맵과 게임 중 교체·반전·플레이어 조회 | 이 행의 범위는 검증됨 | [INPUT_SPRITE_TILEMAP.md](INPUT_SPRITE_TILEMAP.md) · [AURIC_RUNTIME_FEATURES.md](AURIC_RUNTIME_FEATURES.md) |
| 2D-02 2D 조명·노멀·그림자 | verified | 공용 GL/GPU 조명·쿠키·노멀·블렌드·그림자 | 이 행의 범위는 검증됨 | [GPU_2D_LIGHTING_053.md](research/GPU_2D_LIGHTING_053.md) |
| 2D-03 마스크·윤곽선·정렬·픽셀 정렬 | verified | 스프라이트/타일/입자 마스크와 효과·정렬 | 이 행의 범위는 검증됨 | [GPU_2D_052.md](research/GPU_2D_052.md) · [GPU_EFFECTS_054.md](research/GPU_EFFECTS_054.md) |
| 2D-04 2D 골격·세 IK·각도 제한 | verified | Sprite rig·skin·Limb/CCD/FABRIK와 bind 각도 제약·8개 BP Return 핀과 C++ 실제 조회 대조 | 이 행의 범위는 검증됨 | [2D_IK_CONSTRAINTS_074.md](2D_IK_CONSTRAINTS_074.md) · [ENGINE_WORK_156.md](ENGINE_WORK_156.md) |
| 2D-05 2D 전용 리타게팅 | partial | 같은 부모 계층 bind 상대 클립 리타게팅·이름/ID 뼈 대응·이동 비례·키 보존·수동/AI Undo/Redo·기존 C++/BP 재생 · 165: 다른 부모 계층의 2D 포즈 베이크·world/local 대응·스케일/연속 회전·기존 IK 솔버 연결 · 167: 계층/좌우 이름 대응·장면 외부 IK 목표/변환 키·리그 월드 변환 베이크·limb/CCD/FABRIK 실제 표본 재생 | 임의 제약/정지 발의 전체 재표본화 검증·고급 자동 체인 대응 | [ANIMATION_RETARGET_072.md](ANIMATION_RETARGET_072.md) · [ENGINE_WORK_156.md](ENGINE_WORK_156.md) · [ENGINE_WORK_165.json](research/ENGINE_WORK_165.json) · [ENGINE_WORK_167.json](research/ENGINE_WORK_167.json) |
| 2D-06 자동 타일·2.5D 제작 통합 | partial | 타일 제작·2D/3D 공존과 카메라 차원 · 165: 8이웃 우선순위/회전 자동 타일·인접 경계 재계산·셀 충돌 동기화와 편집 UI · 166: 가중 랜덤 변형/고정 시드·선택 셀/이웃만 복제·묶음 런타임 쓰기의 인접 갱신·디자이너 회전 표시 · 168: 32×32 렌더/충돌 청크·변경 청크만 기하/충돌 재생성·미변경 자원/ID 보존·실제 미술 컬링 경계·등각 대각 띠/개별 정렬·C++/BP 실행 · 169: 확장 이웃/명시 타일/빈셀 규칙·회전/대칭·먼 역의존 청크 갱신·게임/편집기 UV · 170: 불변 레이어 WeakMap 셀 인덱스·반복 Get/Has 재사용·단일 Set 전체검증 생략·기존 청크/충돌 연결 | 대규모 sparse 맵 형식/쓰기 배열 복사·물리 동기화 비용·장시간 성능 · 2.5D 제작 샘플·세 렌더 경로 품질 대조 | [2D_RENDERING_SHORTCUTS.md](2D_RENDERING_SHORTCUTS.md) · [ENGINE_WORK_165.json](research/ENGINE_WORK_165.json) · [ENGINE_WORK_166.json](research/ENGINE_WORK_166.json) · [ENGINE_WORK_168.json](research/ENGINE_WORK_168.json) · [ENGINE_WORK_169.json](research/ENGINE_WORK_169.json) · [ENGINE_WORK_170.json](research/ENGINE_WORK_170.json) |

## 월드 제작

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| WLD-01 도형 배치·월드 편집 | verified | 원시 도형·광원·카메라·환경 액터 배치/속성 | 이 행의 범위는 검증됨 | [ENVIRONMENT_ACTORS_RESEARCH.md](ENVIRONMENT_ACTORS_RESEARCH.md) |
| WLD-02 폴리곤·메시 저작 | partial | 기본 도형과 가져온 메시 편집 소유자 · 165: 전용 메시 뷰포트·정점/면 선택 표시·이동/분할/압출/뒤집기/삭제·XZ UV·청크 충돌 · 166: 간선 선택/분할·UV 경계 보존 용접·면 복제·플랫/스무스/커스텀 노멀과 면별 UV 패킹 · 169: 닫힌 동수 경계 bridge·개별 삼각면 inset·UV/색 보존·사람/AI Undo · 170: 전용 UV 캔버스·연결 섬 선택/드래그·전용 이동/회전/크기 폼·분리/평면 펼치기/종횡비 shelf패킹·AI보기 · 171: UV 분리 노멀/기하 보존 경계 좌표 맞추기 ·182: 서로 다른 정점 수의 두 폐곡선/열린 경로 연결·선형 길이 대응/시작 오프셋·평면 영역 인셋/구멍·오목 경계/UV색 보간·재삼각화·실패 선택 보존·AI dryRun/revision/Undo·실제 렌더/충돌 C++ | bevel·edge loop·곡면 영역 offset/재투영·3D 연결 스트립의 고급 꼬임/교차 복구 · 곡면 고급 unwrap·normal split seam stitch·최적 회전/고급 패킹 | [ENGINE_PLAN.md](ENGINE_PLAN.md) · [ENGINE_WORK_165.json](research/ENGINE_WORK_165.json) · [ENGINE_WORK_166.json](research/ENGINE_WORK_166.json) · [ENGINE_WORK_169.json](research/ENGINE_WORK_169.json) · [ENGINE_WORK_170.json](research/ENGINE_WORK_170.json) · [ENGINE_WORK_171.json](research/ENGINE_WORK_171.json) · [ENGINE_WORK_182.json](research/ENGINE_WORK_182.json) |
| WLD-03 지형 브러시·폴리지 | partial | 165: 지형 높이/평활/목표 높이/레이어 브러시·스트로크 Undo·폴리지 결정 산포/소거/인스턴싱 · 166: 구멍/복원·재사용 샘플 스탬프와 브러시 영향 범위 계산·안정 ID 폴리지 선택/변환/복제/삭제·충돌/인스턴스 버퍼 연결 | 텍스처 지형 레이어·대규모 GPU 브러시/부분 버퍼 업로드 · 대규모 폴리지 선택/브러시 프레임·메모리 검증 | [WORK_ORDER_051.md](WORK_ORDER_051.md) · [ENGINE_WORK_165.json](research/ENGINE_WORK_165.json) · [ENGINE_WORK_166.json](research/ENGINE_WORK_166.json) |
| WLD-04 LOD 제작·전환 | partial | 165: LOD 자산·클러스터링 기하 생성·거리/화면 높이·히스테리시스·강제 단계와 공용 렌더 · 171: 표시와 별도 충돌 LOD 선택·기존 충돌 청크 연결 ·179: 2D/2.5D/3D 거리 구간·포즈 표시 간격/시간·이벤트 보존·공용 컴포넌트/C++·명시 충돌 LOD 교체·32MiB 추정 캐시/수명·AI 실행 진단 ·195: 표시 사이 로컬 뼈/스프라이트 포즈 계산 생략·시간/Notify 보존·보호 경로/opt-out·속성/Undo·공용 C++·실제 D3D/GPU ·197: 안정ID 주기 분산·선택형 로컬 뼈 지연 보간/3버퍼 재사용·예산/해제·CPU5군·실제 속성/Undo/저장·D3D/WebGPU/C++ 전환/보간/픽셀 | 고품질 메시 단순화·교차 페이드·골격 수/충돌 단순화와 큰 씬 품질 대조 · 보호 그래프 전체 계산·레거시 Mixer/골격 수 LOD·보간·다중 카메라/시야 중요도·CPU-ms 예산 할당 | [WORK_ORDER_051.md](WORK_ORDER_051.md) · [ENGINE_WORK_165.json](research/ENGINE_WORK_165.json) · [ENGINE_WORK_171.json](research/ENGINE_WORK_171.json) · [ENGINE_WORK_179.json](research/ENGINE_WORK_179.json) · [ENGINE_WORK_195.json](research/ENGINE_WORK_195.json) · [ENGINE_WORK_197.json](research/ENGINE_WORK_197.json) |
| WLD-05 월드 분할·레벨 스트리밍 | partial | 추가 레벨 다중 인스턴스/변환·수동/항상/거리 셀·참조 재배치·물리/스크립트 합류·실패 취소/재진입·CPP/BP/AI/아웃라이너 · 171: 자동 거리 셀의 추정 비용/우선순위/개수 예산·회차당 로드·먼 셀 선제 해제 | 자동 공간 분할/HLOD·실제 메모리 측정 기반 셀 스케줄링·큰 맵 검증 | [ENGINE_WORKFLOW_RESEARCH.md](ENGINE_WORKFLOW_RESEARCH.md) · [ENGINE_WORK_167.json](research/ENGINE_WORK_167.json) · [ENGINE_WORK_171.json](research/ENGINE_WORK_171.json) |
| WLD-06 내비게이션·군중 | partial | 평면 충돌 그리드 기반 경로 · 165: 경사 베이크·삼각 NavMesh 인접성/A*·폭/투영·오프메시 링크·공간 해시 국소 회피 · 167: 평면 포털 funnel/오프메시 경유 보존 · 169: NavArea 32영역/비용/마스크·장면 부피·2D XY/XZ·이동 obstacle 삼각 SAT 차단·생성/UI ·191: opt-in ORCA 반평면/LP·XY/XZ/층/우선순위/정지·KD 이웃/재사용·Inspector/Undo·공용 C++/BP3·실제 D3D2D/WebGPU3D ·199: 기존 기하 BVH로 NavMesh 최근접 투영/질의 작업 공간 재사용·동적 필터/동률/재진입 보존·runtime.navigation 진단·CPU6/기존34군·실제 편집기 진단/C++/D3D/WebGPU800삼각형4에이전트 | 정밀 동적 타일/장애물 재분할 carving·부분 삼각 영역 비용 · 비평면 정밀 funnel/경계 침식·반경 보장·NavMesh 제한 ORCA·가속/혼합 동적 부모 제약·Mass/Detour | [ENGINE_WORKFLOW_RESEARCH.md](ENGINE_WORKFLOW_RESEARCH.md) · [ENGINE_WORK_165.json](research/ENGINE_WORK_165.json) · [ENGINE_WORK_167.json](research/ENGINE_WORK_167.json) · [ENGINE_WORK_169.json](research/ENGINE_WORK_169.json) · [ENGINE_WORK_191.json](research/ENGINE_WORK_191.json) · [ENGINE_WORK_199.json](research/ENGINE_WORK_199.json) |

## 렌더링

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| RND-01 DirectX11·WebGL2·WebGPU 실행 | verified | 실제 장면/머테리얼/조명 공용 렌더와 네이티브 경로 · 169: 단일 실선 Line/LineLoop/LineSegments의 DirectX 삼각 스트립·픽셀폭/평면clip/색·기하 재사용·IK debug Player 실행 | 이 행의 범위는 검증됨 | [RENDERING_145.md](RENDERING_145.md) · [ENGINE_WORK_169.json](research/ENGINE_WORK_169.json) |
| RND-02 인스턴스·변형·부분 전송 | verified | 정적 인스턴스·skeletal/morph·변경 범위/버퍼 갱신 ·190: 미연결 Time/Panner 정적 UV 그래프의 기하/전송 재사용·실제 동적 opcode/기존 캐시·연결 변경/기존 이력 보존·CPU1000 표본 및 실제 D3D/GPU 실행 | 이 행의 범위는 검증됨 | [NATIVE_INSTANCING_089.md](NATIVE_INSTANCING_089.md) · [NATIVE_DEFORMATION_090.md](NATIVE_DEFORMATION_090.md) · [RENDERING_123.md](RENDERING_123.md) · [ENGINE_WORK_190.json](research/ENGINE_WORK_190.json) |
| RND-03 광원·HDRI·환경 액터 | verified | 래스터 HDRI/다중 광원·MegaLights/SkyLight 제작·분산 캡처 | 이 행의 범위는 검증됨 | [RASTER_LIGHTING_131.md](RASTER_LIGHTING_131.md) · [RENDERING_138.md](RENDERING_138.md) |
| RND-04 GI·경로 추적·중첩 매질 | verified | 소프트웨어 기하 GI/경로 추적·매질·HDRI 표본 | 이 행의 범위는 검증됨 | [RENDERING_107.md](RENDERING_107.md) · [RENDERING_145.md](RENDERING_145.md) |
| RND-05 굴절·코스틱·공간/시간/렌즈 필터 | partial | 굴절/색 투과·광자·이차 필터·변형 모션 이력 | 전역 곡면 역해 · 거친 복합 로브/참여 매질 산란의 정밀 확장 | [RENDERING_145.md](RENDERING_145.md) · [RENDERING_151.md](RENDERING_151.md) |
| RND-06 초기 셰이더 준비 비용 | partial | GL/GPU 준비·진단·취소·공유 지역값·코드/네이티브 캐시·GL 독립 프로그램 일괄 제출·비렌즈 가이드 특화 ·189: 비시간 이전 노멀의 Time 호출 미생성·기존 opcode 특화·단일 GL 전체 링크 두 순서 대조/동일3백엔드 픽셀·네이티브 실제 게임 ·194: 표면 필드별 광선 프로그램 특화·동일 키 필드 합치기·legacy 호환·GL 두 순서와 실제3백엔드/네이티브 게임; 혼합 정의 노멀 WGSL45117→29725B | 복잡 그래프 GL 첫 path 약7.9초/시간 가이드 약7.4초 추가 절감 · WebGPU 첫 path/약2초 가이드 추가 절감 | [RENDERING_145.md](RENDERING_145.md) · [RENDERING_151.md](RENDERING_151.md) · [ENGINE_WORK_156.md](ENGINE_WORK_156.md) · [ENGINE_WORK_189.json](research/ENGINE_WORK_189.json) · [ENGINE_WORK_194.json](research/ENGINE_WORK_194.json) |
| RND-07 이전 노멀·mip 이력 | partial | 이전 정점/노멀/UV 접선과 정적 노멀맵 복원 ·187: 불투명 Normal 전용 Time 그래프 이전 절대 시간·GPU 재표본/기존 TBN·실패/되감기 무효화·공용 프로그램/기존 버퍼·실제 3백엔드 픽셀/게임 ·194: 노멀 프로그램만의 Time 의존성·무관 발광 Time 제외·기존 절대시각/픽셀 보존 | 월드/시점 의존 노멀 이전 입력·투명체 이전 굴절 분기·다른 시간 표면 필드 · 이전 mip footprint 보존 | [RENDERING_138.md](RENDERING_138.md) · [ENGINE_WORK_187.json](research/ENGINE_WORK_187.json) · [ENGINE_WORK_194.json](research/ENGINE_WORK_194.json) |
| RND-08 DFAO·베이크·HWRT | unimplemented | — | 거리장 AO · Lightmass 계열 베이크/라이트맵 · 하드웨어 레이 트레이싱 가속 | [RENDERING_145.md](RENDERING_145.md) |

## 머테리얼

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| MAT-01 함수·레이어·인스턴스·타입 | verified | 함수 추출·typed ports·스택/MI·파라미터·실제 셰이더 | 이 행의 범위는 검증됨 | [MATERIAL_TYPED_FUNCTIONS_078.md](MATERIAL_TYPED_FUNCTIONS_078.md) · [MATERIAL_LAYERS_076.md](MATERIAL_LAYERS_076.md) |
| MAT-02 미리보기·런타임 텍스처 | verified | 개별 출력/메시·환경 미리보기와 네 종류 텍스처 setter | 이 행의 범위는 검증됨 | [MATERIAL_PREVIEW_SCENE_080.md](MATERIAL_PREVIEW_SCENE_080.md) · [MATERIAL_TEXTURE_PARAMETERS_082.md](MATERIAL_TEXTURE_PARAMETERS_082.md) |
| MAT-03 텍스처 고급 설정·도메인 | partial | 2D/Cube/Array/3D 텍스처와 표면 셰이딩 · 165: 축별 주소·nearest/linear·mip 생성 Sampler State·노드 UI와 공용 텍스처 전달 · 171: DirectX 독립 min/mag/mip·mip 비사용·anisotropy1–16·제한 상태 캐시·실제 장치 GetDesc ·196: 전용8비트 소스 채널/원본 픽셀/줌/이동·큐브6면/배열/볼륨 슬라이스·비파괴/자원 해제·실제 UI | LOD bias·배열/볼륨 mip 생성 세부 · 압축 컨테이너·쿠킹 GPU mip/HDR 선형/볼륨3D 검사·추가 도메인 | [MATERIAL_TEXTURE_FAMILIES_081.md](MATERIAL_TEXTURE_FAMILIES_081.md) · [ENGINE_WORK_165.json](research/ENGINE_WORK_165.json) · [ENGINE_WORK_171.json](research/ENGINE_WORK_171.json) · [ENGINE_WORK_196.json](research/ENGINE_WORK_196.json) |

## 애니메이션

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| ANM-01 그래프·Blend Space·상태·슬롯 | verified | 선택/상태·혼합/레이어·동기·notifies·몽타주 슬롯 | 이 행의 범위는 검증됨 | [ANIMATION_GRAPH.md](ANIMATION_GRAPH.md) · [ANIMATION_MONTAGE_SLOTS.md](ANIMATION_MONTAGE_SLOTS.md) · [ANIMATION_ENUM_SELECTION_069.md](ANIMATION_ENUM_SELECTION_069.md) |
| ANM-02 루트 모션 | verified | 클립/몽타주 추출·모드·물리/중력·2D/3D 이동 | 이 행의 범위는 검증됨 | [ANIMATION_ROOT_MOTION_070.md](ANIMATION_ROOT_MOTION_070.md) |
| ANM-03 3D IK·bind XYZ 제약 | verified | Two Bone/FABRIK/CCD·공간/대상·기준 포즈 제한·SDK/BP | 이 행의 범위는 검증됨 | [ANIMATION_JOINT_LIMITS_154.md](ANIMATION_JOINT_LIMITS_154.md) · [RENDERING_151.md](RENDERING_151.md) |
| ANM-04 골격 리타게팅·베이크 | partial | 리그/체인/기준 포즈·FK/IK·새 클립 베이크 · 165: 동일 이름 모프 바인딩·구간 커브 경계/Notify/Notify State 보존 베이크와 공용 골격 재생 · 166: 커브 키 편집·속성/모프/머테리얼 구동·포즈 가중 혼합·C++/BP GetCurve·디버그 스냅샷 · 171: 다른 모프 이름/메시·배율/오프셋/범위 매핑·공용 포즈 슬롯·보정 모프 베이크·전용 폼 | 대상간 정교한 모프/체형 보정·임의 연산 스택·LOD/Avatar/Muscle · 정지 발·Stride/Pole/접촉 | [ANIMATION_RETARGET_072.md](ANIMATION_RETARGET_072.md) · [ENGINE_WORK_165.json](research/ENGINE_WORK_165.json) · [ENGINE_WORK_166.json](research/ENGINE_WORK_166.json) · [ENGINE_WORK_171.json](research/ENGINE_WORK_171.json) |
| ANM-05 Full Body IK·Control Rig | partial | 169: 공유 포즈 다중 체인 CCD FullBodyIK·안정 목표ID/위치/액터/가중치·기존XYZ제약/제외뼈·목표UI/오차·C++/BP4·AI · 170: 루트 고정/PrePull/Free·당김/거리 제한·회전 목표·뼈 회전 강성/초기 선호 각도·루트 위치 강성·상세 폼/AI·C++/BP3 | 늘이기·일반 관절 위치/회전 해법·복잡 제약 품질 · 독립 리그 stage·컨트롤/기즈모·재생/베이크·대형 리그 품질/비용 | [ANIMATION_IK_071.md](ANIMATION_IK_071.md) · [RENDERING_151.md](RENDERING_151.md) · [ENGINE_WORK_169.json](research/ENGINE_WORK_169.json) · [ENGINE_WORK_170.json](research/ENGINE_WORK_170.json) |
| ANM-06 시퀀스·녹화 제작 | partial | 시퀀스/타임라인 트랙·키 편집/스크럽·게임 실행 · 165: 다중 객체 Transform/표시 Take 녹화·키 정리·PIE 종료 후 보존/시퀀스 적용 UI · 166: 기본 컴포넌트의 숫자/정수/불/문자/벡터/색/에셋 속성 Take 녹화·선택 바인딩 편집·시퀀스 실행/중지 복원·스택 안전 키 축약 · 167: 속성 설명 재사용·일정 구간 온라인 축약/변화 시각 보존 · 169: JSON 컴포넌트 상태/생성삭제·원자 프레임 교체·골격 포즈 녹화/slerp/축약·실제 오디오 시작종료/반복 큐·복원·AI frame barrier ·192: 실제 post-DSP/공간음 스테레오 PCM16 WAV·UI/AI/예산/수명·저장 실패 재시도/일시정지/게임 종료 저장·실제 재생 | 임의 네이티브 배열/구조체·액터 생성 기록·실행 중 골격 교체 · 마이크·멀티채널 stem·Take 게임시각/PCM 표본 정렬·영상 결합·외부 동기화/전문 시네마틱/베이크 | [ANIMATION_TIMELINE_CONTROLS.md](ANIMATION_TIMELINE_CONTROLS.md) · [ENGINE_WORK_165.json](research/ENGINE_WORK_165.json) · [ENGINE_WORK_166.json](research/ENGINE_WORK_166.json) · [ENGINE_WORK_167.json](research/ENGINE_WORK_167.json) · [ENGINE_WORK_169.json](research/ENGINE_WORK_169.json) · [ENGINE_WORK_192.json](research/ENGINE_WORK_192.json) |

## 물리

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| PHY-01 2D·3D 물리/콜라이더/질의 | verified | Rapier·중력·충돌/트리거·회전·질량·CCD·모터·공용 SDK | 이 행의 범위는 검증됨 | [PHYSICS_RUNTIME_RESEARCH.md](PHYSICS_RUNTIME_RESEARCH.md) · [CONTACT_LIFETIME_064.md](research/CONTACT_LIFETIME_064.md) |
| PHY-02 관절 프레임·cloth/차량/파괴 | partial | 기본 관절·모터와 형상 편집 ·175–176: 2D/3D 독립관절프레임·영점·모터힘/SDK 및 RaycastVehicle 제작/휠편집/구동·조향·제동/서스펜션/실제렌더/동일C++·BP | cloth·destruction 시스템 · break force/plasticity·generic6DOF·multibody articulation · 차량 변속기/토크RPM·차동/ABS·타이어 부피/변형·bone 드라이버·손상/예측 확장 | [PHYSICS_RUNTIME_RESEARCH.md](PHYSICS_RUNTIME_RESEARCH.md) · [ENGINE_WORK_175.json](research/ENGINE_WORK_175.json) · [ENGINE_WORK_176.json](research/ENGINE_WORK_176.json) |

## 게임 시스템

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| GAM-01 게임 프레임워크·입력·생성 | verified | GameMode/Controller·캐릭터·입력·마우스·생성/풀·배치 보존 | 이 행의 범위는 검증됨 | [AURIC_RUNTIME_FEATURES.md](AURIC_RUNTIME_FEATURES.md) · [AURIC_RUNTIME_SPAWN.md](AURIC_RUNTIME_SPAWN.md) |
| GAM-02 행동트리·Blackboard·계층 FSM | verified | 태스크 Start/Tick/Abort·조건 observer·subtree·서비스·계층 전이 | 이 행의 범위는 검증됨 | [BEHAVIOR_OBSERVERS_SUBTREES.md](BEHAVIOR_OBSERVERS_SUBTREES.md) · [BEHAVIOR_TASK_LIFECYCLE.md](BEHAVIOR_TASK_LIFECYCLE.md) · [HIERARCHICAL_FSM.md](HIERARCHICAL_FSM.md) |
| GAM-03 행동트리 고급 태스크·EQS | partial | 기본 행동트리/감지/태그 실행 · 165: 일반 병렬 결과 집계·EQS 생성/필터/점수·BT 블랙보드·C++ 실행 연결 | FinishAbort/native BTTask 고급 생명주기 · Smart Object/Mass 계열·EQS 공간 가속/시각 디버그 | [BEHAVIOR_OBSERVERS_SUBTREES.md](BEHAVIOR_OBSERVERS_SUBTREES.md) · [ENGINE_WORK_165.json](research/ENGINE_WORK_165.json) |
| GAM-04 Ability·효과/태그 체계 | partial | 165: 능력/효과 자산·편집 UI·컴포넌트·속성·비용/쿨다운·중첩/주기/지속·태그 수명·C++/BP · 171: 능력 활성/종료·효과 적용/주기/제거 Cue 태그/이벤트·전용 목록·실패 롤백 | 네트워크 능력 예측/복제·자동 VFX/음향 Cue 자산·고급 타깃/계산 · 속성 세트/능력 목록의 풍부한 제작 UI | [AUTHORING_UI_AUDIO_RESEARCH.md](AUTHORING_UI_AUDIO_RESEARCH.md) · [ENGINE_WORK_165.json](research/ENGINE_WORK_165.json) · [ENGINE_WORK_171.json](research/ENGINE_WORK_171.json) |

## 네트워크

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| NET-01 복제·RPC·권한·예측 | partial | 171: 설정 가능한 호스트/클라이언트 릴레이·키/소유권·안정 ID 필드 복제·변환 보간·허용 RPC·스냅샷 재접속·컴포넌트/C++BP6·실제 두 연결 실행 ·173: 로컬 카탈로그 복제 생성/삭제·자식/풀·late join/reconnect·거리/소유자 범위·정적 삭제 표식·동적 상태 회수·C++ 기존 Spawn/Destroy | 전용 권위 서버 규칙·관심 영역 공간 가속·장면 세대·부착/참조·클라이언트 원격 풀 수명 · 예측 입력/재시뮬레이션·지연/손실 보정·호스트 이전/플랫폼 서비스·접속 비밀 배포 | [ENGINE_WORKFLOW_RESEARCH.md](ENGINE_WORKFLOW_RESEARCH.md) · [ENGINE_WORK_171.json](research/ENGINE_WORK_171.json) · [ENGINE_WORK_173.json](research/ENGINE_WORK_173.json) |

## 이펙트

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| VFX-01 입자·투사체·GPU 계산 | verified | 입자 모듈·GPU 방출/간접 draw·정렬·탄환 서비스/충돌 | 이 행의 범위는 검증됨 | [GPU_EMISSION_049.md](research/GPU_EMISSION_049.md) · [GPU_EFFECTS_054.md](research/GPU_EFFECTS_054.md) |
| VFX-02 이펙트 고급 저작 | partial | 등록 ParticleSystem·Decal·효과 속성 · 165: 세 렌더 경로 시트·이미터 리본·시작/종료 하위 프리팹 수명·GPU 위치 읽기 없음 | 입자별 GPU 사망/충돌 이벤트·개별 입자 리본 · 범용 VFX 그래프/디버깅 | [WORK_ORDER_051.md](WORK_ORDER_051.md) · [ENGINE_WORK_165.json](research/ENGINE_WORK_165.json) |

## 게임 UI

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| UI-01 위젯·레이아웃·SVG·입력 | verified | 전용 위젯·모서리/배율/안전 영역·SVG·한글·포커스/이벤트 | 이 행의 범위는 검증됨 | [UI_SCALING_SVG.md](UI_SCALING_SVG.md) · [MOBILE_EXPORT.md](MOBILE_EXPORT.md) |
| UI-02 모바일 조작 UI | verified | 조이스틱·방향/버튼·동시 터치·해제·안전 영역 | 이 행의 범위는 검증됨 | [INPUT_MOBILE_POOL.md](INPUT_MOBILE_POOL.md) · [MOBILE_EXPORT.md](MOBILE_EXPORT.md) |
| UI-03 복합/월드 UI·가상화·지역화 | partial | 기본 위젯 트리·데이터 바인딩 · 165: 재사용 스타일 자산·지역화·행 재활용 ListView·키보드 선택/접근성 이름·공용 SDK · 166: 위젯 디자이너/실행기의 스타일/override/지역화 공용 해석과 비동기 오래된 미리보기 폐기 · 171: TreeView 펼침/키보드·안정 ID 선택·명시 가변 높이·누적 높이/이진 검색·보이는 행 재사용·디자이너/게임 공용 ·174: 재사용 위젯/중첩 오버라이드·사람 속성·namespace SDK/이벤트/변수·스타일/지역화·화면 투영 오브젝트 UI·공유 예산/비동기 수명 ·177: 목록/트리 실제 내용 높이·Fenwick 부분갱신·표시행재사용·너비/글꼴/배율·키보드/비활성/선택/종료수명·같은C++UI/AI ·181: NamedSlot 단일 자식·기본/교체/비움·중첩 이름공간·원본 불변/순환·예산 검사·Designer 선택/Undo·기존 C++/BP 이벤트·외부 Source 에셋 수집/이름 변경·AI schema sourceOnly 복구 | 위젯 클래스 상속/실행 중 슬롯 자산 교체·조명/깊이 차폐를 받는3D UI 메시 · 복합 위젯 목록행/거대 CSS높이 분할스크롤·대규모 UI 풀/배치·전체 입력/스크린리더 검증 | [AUTHORING_UI_AUDIO_RESEARCH.md](AUTHORING_UI_AUDIO_RESEARCH.md) · [ENGINE_WORK_165.json](research/ENGINE_WORK_165.json) · [ENGINE_WORK_166.json](research/ENGINE_WORK_166.json) · [ENGINE_WORK_171.json](research/ENGINE_WORK_171.json) · [ENGINE_WORK_174.json](research/ENGINE_WORK_174.json) · [ENGINE_WORK_177.json](research/ENGINE_WORK_177.json) · [ENGINE_WORK_181.json](research/ENGINE_WORK_181.json) |

## 오디오

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| AUD-01 믹서·공간 음향·스트리밍 | verified | 버스·노출값·snapshot·RMS·PCM/stream·정지/복귀·앱 분리 | 이 행의 범위는 검증됨 | [AUTHORING_UI_AUDIO_RESEARCH.md](AUTHORING_UI_AUDIO_RESEARCH.md) · [WINDOWS_GAME_IDENTITY_108.md](WINDOWS_GAME_IDENTITY_108.md) · [AUDIO_STREAMING_LIFETIME_032.md](research/AUDIO_STREAMING_LIFETIME_032.md) |
| AUD-02 가중 스냅샷·보간 곡선 | verified | 정규화 가중 snapshot·네 곡선·중단/override·공용 SDK/BP·편집기 적용/미리듣기 | 이 행의 범위는 검증됨 | [AUTHORING_UI_AUDIO_RESEARCH.md](AUTHORING_UI_AUDIO_RESEARCH.md) · [ENGINE_WORK_156.md](ENGINE_WORK_156.md) |
| AUD-03 오디오 고급 DSP/가상화 | partial | gain/filter/compressor·routing/계측 · 165: 순서 DSP 필터/지연/리버브/왜곡·wet/dry·pre/post Send/Return·순환/우회/해제 · 169: 지정 버스 RMS 사이드체인·Attack/Release/압축·순환/우회·사람UI/Undo·C++/BP3·실제 WebAudio 신호 · 170: 설정 가능한 실제/추적 음성 예산·PCM 가상 시계/소스 해제/승격·우선순위/거리·Listener/Source UI·C++/BP4·실제 소스2/가상6 검증 ·192: 실제 post-DSP/공간음 스테레오 PCM16 WAV·UI/AI/예산/수명·저장 실패 재시도/일시정지/게임 종료 저장·실제 재생 | 스트리밍 디코더까지 해제하는 가상화·고급 지각/믹서 DSP 기반 선별 · C++ native DSP와 모바일 실제 장치 품질·큰 음성 수/PCM 메모리 검증 | [AUTHORING_UI_AUDIO_RESEARCH.md](AUTHORING_UI_AUDIO_RESEARCH.md) · [ENGINE_WORK_165.json](research/ENGINE_WORK_165.json) · [ENGINE_WORK_169.json](research/ENGINE_WORK_169.json) · [ENGINE_WORK_170.json](research/ENGINE_WORK_170.json) · [ENGINE_WORK_192.json](research/ENGINE_WORK_192.json) |
| AUD-04 스냅샷/파라미터별 전환 오버라이드 | verified | 대상 snapshot/버스/파라미터별 네 곡선·시작/끝 step·가중 보간·기본값 상속·편집/Undo·공용 C++/BP/AI | 이 행의 범위는 검증됨 | [ENGINE_WORK_156.md](ENGINE_WORK_156.md) |

## C++·블루프린트

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| CPP-01 블루프린트 제작/실행·공용 SDK | verified | 변수/함수/매크로·이벤트·타임라인·핀 변환/분할·C++ 공개 ·185: 인스턴스 안정 로컬 ID 조회/목록/ID 공용 C++·BP3함수·비활성/삭제/가족 격리·즉시 Spawn/후속 스냅샷·모바일 AOT·서비스 분류/핀 라벨·종료 뒤 늦은 C++ 응답 폐기 | 이 행의 범위는 검증됨 | [BLUEPRINT_SPEC.md](BLUEPRINT_SPEC.md) · [ENGINE_WORK_185.json](research/ENGINE_WORK_185.json) |
| CPP-02 다중 소스·빌드·웹/모바일 AOT | verified | 외부 C++ 소스·실제 compiler/프로토콜·다중 모듈·Wasm/AOT | 이 행의 범위는 검증됨 | [PROJECT_NATIVE_SOURCES.md](PROJECT_NATIVE_SOURCES.md) · [WEB_GAME_EXPORT_083.md](WEB_GAME_EXPORT_083.md) · [MOBILE_EXPORT.md](MOBILE_EXPORT.md) |
| CPP-03 코드 재적용·네이티브 디버거 | partial | C++ 재빌드·호스트 교체·기본 BP debug/step · 171: 실행 중 새 worker 준비·기존 공개 속성/월드/BP 상태 유지·프레임 장벽·타입/시그니처 거부·레벨 빌드 캐시 갱신·이전 worker 해제·사람/AI | 비공개/정적 C++ 저장소·네이티브 타이머·구조 변경의 상태 전환 · native debugger/브레이크·스택·스레드 연결 | [BLUEPRINT_SPEC.md](BLUEPRINT_SPEC.md) · [ENGINE_WORK_171.json](research/ENGINE_WORK_171.json) |

## AI·자동화

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| AI-01 원자적 여러 문서 편집 | verified | revision·dryRun·document.patch/files.apply·Undo 공용 계약 | 이 행의 범위는 검증됨 | [AI_ENGINE_API.md](AI_ENGINE_API.md) · [AI_ASSET_TRANSACTIONS_041.md](research/AI_ASSET_TRANSACTIONS_041.md) |
| AI-02 코드/기능 상태 최신 조회 | verified | 안정 ID 원장·로컬 CLI·HTTP 조회/필터·등록 분모 구분 | 이 행의 범위는 검증됨 | [ENGINE_STATUS.md](ENGINE_STATUS.md) · [ENGINE_WORK_156.md](ENGINE_WORK_156.md) |
| AI-03 에디터 확장 API 확대 | partial | 데이터 기반 제작 도구와 공용 schema/명령 · 165: 새 자산 스키마 예제·메시/지형/폴리지/내비/프리팹/규칙 전용 revision/dryRun/Undo 명령 · 166: 토폴로지/노멀/UV·지형 holes/stamp·안정 ID 인스턴스 편집 schema와 revision/dryRun/Undo · 167: 공용 런타임 레벨 수명 4명령/프레임 직렬화·2D 리타게팅 외부 목표 데이터 · 168: 사람/AI 공용 프리팹 인스턴스 6명령·안정 ID/property 경로·revision/dryRun/원본-장면 원자 Undo · 169: IK 목표 add/remove·Take start/finish/apply·프레임 장벽·bridge/inset 공유 저작·실제 사람/AI/Undo · 170: Prefab adopt/구조/전체Apply·IK bone.add/remove·UV 데이터와 카메라/선택 view API·동일 검증/Undo · 171: native.reapply 호환성 dryRun/실행·runtime.network 읽기·공용 Network SDK6·UV 경계/리타게팅 모프/트리/예산 스키마 ·172: 안정 ID 3방향 JSON 병합/사람 충돌 선택/revision·dryRun·Undo·프로젝트 Git 상태/선택 diff/stage/commit ·173: 로컬 카탈로그 복제 생성/삭제·자식/풀·late join/reconnect·거리/소유자 범위·정적 삭제 표식·동적 상태 회수·C++ 기존 Spawn/Destroy ·174: 재사용 위젯/중첩 오버라이드·사람 속성·namespace SDK/이벤트/변수·스타일/지역화·화면 투영 오브젝트 UI·공유 예산/비동기 수명 ·175–176: 2D/3D 독립관절프레임·영점·모터힘/SDK 및 RaycastVehicle 제작/휠편집/구동·조향·제동/서스펜션/실제렌더/동일C++·BP ·177: 목록/트리 실제 내용 높이·Fenwick 부분갱신·표시행재사용·너비/글꼴/배율·키보드/비활성/선택/종료수명·같은C++UI/AI ·178: 모델 단위/축·전용 설정/실제 미리보기·FBX ID/중복 이름 재가져오기·미연결 수동 대응/Undo·원본/sidecar 이름변경·일반 CAS/AI·패키징·같은 glTF C++ 루트 모션 ·179: 2D/2.5D/3D 거리 구간·포즈 표시 간격/시간·이벤트 보존·공용 컴포넌트/C++·명시 충돌 LOD 교체·32MiB 추정 캐시/수명·AI 실행 진단 ·181: NamedSlot 단일 자식·기본/교체/비움·중첩 이름공간·원본 불변/순환·예산 검사·Designer 선택/Undo·기존 C++/BP 이벤트·외부 Source 에셋 수집/이름 변경·AI schema sourceOnly 복구 ·182: 서로 다른 정점 수의 두 폐곡선/열린 경로 연결·선형 길이 대응/시작 오프셋·평면 영역 인셋/구멍·오목 경계/UV색 보간·재삼각화·실패 선택 보존·AI dryRun/revision/Undo·실제 렌더/충돌 C++ ·183: 위젯/메시 전용22명령 재지정·작업창/입력/IME/실행/비행 격리·기존 키 우회 차단·사용자 프로필 기본값 충돌 이행·우클릭 현재 키 표시·AI get/set revision ·184: 중첩 자식 추가/삭제의 바깥 원본 Apply·additions/qualified removed·상속 중복 확장/원본 교체 정리·기본 컴포넌트 안정 ID·최종 계층/빌드검증·실제 Inspector/원자 UndoRedo/C++ Spawn ·185: 인스턴스 안정 로컬 ID 조회/목록/ID 공용 C++·BP3함수·비활성/삭제/가족 격리·즉시 Spawn/후속 스냅샷·모바일 AOT·서비스 분류/핀 라벨·종료 뒤 늦은 C++ 응답 폐기 ·186: 프리팹 격리 2D/3D 계층·변형·컴포넌트 제작/원본 탐색·복사/그룹/재지정 키·AI CAS/dryRun/Undo·중첩 부모 구조·실제 D3D/WebGPU/C++ 반영 ·187: 불투명 Normal 전용 Time 그래프 이전 절대 시간·GPU 재표본/기존 TBN·실패/되감기 무효화·공용 프로그램/기존 버퍼·실제 3백엔드 픽셀/게임 ·188: 전용9문맥 조작56개/총111 공용 키·프로필 이행/고정 키 우회 차단·분리 HWND 선행 키 전달/버튼 명령·몽타주 핸들 포커스·late clipboard 거절·실제 제작/Undo ·196: texture.view 공용 설정/정수 픽셀·보기 전용/소스 revision 불변 ·199: 기존 기하 BVH로 NavMesh 최근접 투영/질의 작업 공간 재사용·동적 필터/동률/재진입 보존·runtime.navigation 진단·CPU6/기존34군·실제 편집기 진단/C++/D3D/WebGPU800삼각형4에이전트 | 버전 호환 확장 ABI·툴 배포·안전한 코드 확장 · 남은 제작 분야의 전용 명령/검증 확대 | [LIGHTING_TOOLS_128.md](LIGHTING_TOOLS_128.md) · [ENGINE_WORK_165.json](research/ENGINE_WORK_165.json) · [ENGINE_WORK_166.json](research/ENGINE_WORK_166.json) · [ENGINE_WORK_167.json](research/ENGINE_WORK_167.json) · [ENGINE_WORK_168.json](research/ENGINE_WORK_168.json) · [ENGINE_WORK_169.json](research/ENGINE_WORK_169.json) · [ENGINE_WORK_170.json](research/ENGINE_WORK_170.json) · [ENGINE_WORK_171.json](research/ENGINE_WORK_171.json) · [ENGINE_WORK_172.json](research/ENGINE_WORK_172.json) · [ENGINE_WORK_173.json](research/ENGINE_WORK_173.json) · [ENGINE_WORK_174.json](research/ENGINE_WORK_174.json) · [ENGINE_WORK_175.json](research/ENGINE_WORK_175.json) · [ENGINE_WORK_176.json](research/ENGINE_WORK_176.json) · [ENGINE_WORK_177.json](research/ENGINE_WORK_177.json) · [ENGINE_WORK_178.json](research/ENGINE_WORK_178.json) · [ENGINE_WORK_179.json](research/ENGINE_WORK_179.json) · [ENGINE_WORK_181.json](research/ENGINE_WORK_181.json) · [ENGINE_WORK_182.json](research/ENGINE_WORK_182.json) · [ENGINE_WORK_183.json](research/ENGINE_WORK_183.json) · [ENGINE_WORK_184.json](research/ENGINE_WORK_184.json) · [ENGINE_WORK_185.json](research/ENGINE_WORK_185.json) · [ENGINE_WORK_186.json](research/ENGINE_WORK_186.json) · [ENGINE_WORK_187.json](research/ENGINE_WORK_187.json) · [ENGINE_WORK_188.json](research/ENGINE_WORK_188.json) · [ENGINE_WORK_196.json](research/ENGINE_WORK_196.json) · [ENGINE_WORK_199.json](research/ENGINE_WORK_199.json) |

## 디버깅

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| DBG-01 프레임/컴파일 프로파일러 | verified | 실측 구간/호출·300프레임·셰이더 준비·AI/JSON | 이 행의 범위는 검증됨 | [RENDERING_151.md](RENDERING_151.md) |
| DBG-02 GPU 시간·메모리/크래시 진단 | partial | 리소스 수·일부 GPU Query·C++ host 메모리 진단 · 170: Win32 페이지 실패의 WebErrorStatus 로그·허브/프로젝트/종료 집중 검사 | 편집기 GPU timer/스레드 flow · 할당·누수·크래시 덤프·장치 연결·간헐적 시작 실패 추가 재현 | [AUTHORING_UI_AUDIO_RESEARCH.md](AUTHORING_UI_AUDIO_RESEARCH.md) · [HOST_MEMORY_062.md](research/HOST_MEMORY_062.md) · [ENGINE_WORK_170.json](research/ENGINE_WORK_170.json) |

## 배포·플랫폼

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| BLD-01 Windows·웹 게임 배포 | verified | 독립 앱 ID/오디오·실행파일·정적 웹·C++ Wasm·공개 실행 | 이 행의 범위는 검증됨 | [WINDOWS_GAME_IDENTITY_108.md](WINDOWS_GAME_IDENTITY_108.md) · [WEB_GAME_EXPORT_083.md](WEB_GAME_EXPORT_083.md) |
| BLD-02 Android 빌드·가상 기기 | verified | ARM64/x86_64 APK/AAB·서명/정렬·설치·게임/터치·복귀 | 이 행의 범위는 검증됨 | [MOBILE_EXPORT.md](MOBILE_EXPORT.md) |
| BLD-03 iOS 원격 빌드·시뮬레이터 | verified | Xcode 두 대상·C++/물리/UI·반복 오디오·백그라운드 복귀 | 이 행의 범위는 검증됨 | [MOBILE_EXPORT.md](MOBILE_EXPORT.md) · [IOS_REMOTE_DISTRIBUTION.md](IOS_REMOTE_DISTRIBUTION.md) |
| BLD-04 실제 휴대폰·스토어 배포 | unverified | 모바일 출력/빌드 경로 있음 | 실물 기기 설치/열/배터리/음향 · Apple 서명·IPA/TestFlight·스토어 배포 | [IOS_REMOTE_DISTRIBUTION.md](IOS_REMOTE_DISTRIBUTION.md) · [MOBILE_EXPORT.md](MOBILE_EXPORT.md) |
| BLD-05 모바일 편집기 | unimplemented | — | 프로젝트 저장/복구·터치 편집·모바일 C++ 제작 제약 · 실제 Android/iOS 에디터 앱 | [MOBILE_EDITOR_BODY_012.md](research/MOBILE_EDITOR_BODY_012.md) |
| BLD-06 번들·패치·협업/소스 관리 | partial | 기본 패키지·의존 리소스 수집·프로젝트 텍스트 · 165: Brotli 증분 파일 패치·기준/해시 검증·변경 파일 실패 롤백·공용 CLI · 166: 증분 패치 교체 전 디스크 저널·프로세스 중단 복구·Ed25519 서명/고정 키 검증·출력 파일 CLI · 171: 파일↔폴더 교체·버전2 폴더 저널·전체 백업 선행·실제 rename 오류와 프로세스 강제 종료 복구 ·172: 안정 ID 3방향 JSON 병합/사람 충돌 선택/revision·dryRun·Undo·프로젝트 Git 상태/선택 diff/stage/commit ·180: 세션 공유 C++ 질의 월드/형상 재사용·동시 스냅샷 격리·유휴1개/세대 수명·비용 진단 및 공식 최소화 런타임 배포 | 실제 전원 차단/파일시스템 장애 내구성·원격 패치 전달/신뢰 키 배포 · Git 충돌 마커의 구조 병합·시각 노드 diff·원격 VCS/잠금 | [WORK_ORDER_051.md](WORK_ORDER_051.md) · [ENGINE_WORK_165.json](research/ENGINE_WORK_165.json) · [ENGINE_WORK_166.json](research/ENGINE_WORK_166.json) · [ENGINE_WORK_171.json](research/ENGINE_WORK_171.json) · [ENGINE_WORK_172.json](research/ENGINE_WORK_172.json) · [ENGINE_WORK_180.json](research/ENGINE_WORK_180.json) |

## 성능·용량

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| PER-01 PC120·모바일60 전체 프레임 | unverified | PC 단일 재현에서 일부 통과·여러 CPU/GPU 비용 절감 · 168: 타일 불변 스냅샷/JSON 재사용·한 청크 갱신·개발 D3D11 짧은 비용 표본 ·180: 세션 공유 C++ 질의 월드/형상 재사용·동시 스냅샷 격리·유휴1개/세대 수명·비용 진단 및 공식 최소화 런타임 배포 ·190: 미연결 Time/Panner 정적 UV 그래프의 기하/전송 재사용·실제 동적 opcode/기존 캐시·연결 변경/기존 이력 보존·CPU1000 표본 및 실제 D3D/GPU 실행 ·195: 30/60/120Hz4초에서 포즈120/240/480→20회·256뼈15360보간 제외·포즈 버퍼 증가0·실제 실행 진단 ·197: 안정ID 주기 분산·선택형 로컬 뼈 지연 보간/3버퍼 재사용·예산/해제·CPU5군·실제 속성/Undo/저장·D3D/WebGPU/C++ 전환/보간/픽셀 ·198: 격리 Engine 동일 Node 크기/SHA 정리·엔진 전체 실행 범위/변경 보호·복원 명세·소스 보존·실제 PowerShell/자식 프로세스 검사 | 대표/고부하 장면 p95/p99·장시간 안정성 · 실제 모바일 지속60·발열/배터리 | [SPAWN_CATALOG_LIFETIME_067.md](research/SPAWN_CATALOG_LIFETIME_067.md) · [MOBILE_PERFORMANCE_BUDGET.md](MOBILE_PERFORMANCE_BUDGET.md) · [ENGINE_WORK_168.json](research/ENGINE_WORK_168.json) · [ENGINE_WORK_180.json](research/ENGINE_WORK_180.json) · [ENGINE_WORK_190.json](research/ENGINE_WORK_190.json) · [ENGINE_WORK_195.json](research/ENGINE_WORK_195.json) · [ENGINE_WORK_197.json](research/ENGINE_WORK_197.json) · [ENGINE_WORK_198.json](research/ENGINE_WORK_198.json) |
| PER-02 용량·캐시·설치 한 개 유지 | verified | 검사 빌드/프로필 정리·공유 캐시32·이전 설치 자동 정리 · 169: 정확 SHA의 재생성 SDK 캐시만 수정 백업 제외·동일 역사 백업 제거·실제 수정 보존 검사 | 이 행의 범위는 검증됨 | [USER_INSTALL_151.json](research/USER_INSTALL_151.json) · [INSTALL_RETENTION_114.md](INSTALL_RETENTION_114.md) · [ENGINE_WORK_169.json](research/ENGINE_WORK_169.json) |
| PER-03 대규모 월드·장시간 RAM | unverified | 일부 자원 수명·큐/서명/업로드 개선과 소규모 재현 · 168: 타일 불변 스냅샷/JSON 재사용·한 청크 갱신·개발 D3D11 짧은 비용 표본 ·179: 2D/2.5D/3D 거리 구간·포즈 표시 간격/시간·이벤트 보존·공용 컴포넌트/C++·명시 충돌 LOD 교체·32MiB 추정 캐시/수명·AI 실행 진단 ·180: 세션 공유 C++ 질의 월드/형상 재사용·동시 스냅샷 격리·유휴1개/세대 수명·비용 진단 및 공식 최소화 런타임 배포 ·185: 인스턴스 안정 로컬 ID 조회/목록/ID 공용 C++·BP3함수·비활성/삭제/가족 격리·즉시 Spawn/후속 스냅샷·모바일 AOT·서비스 분류/핀 라벨·종료 뒤 늦은 C++ 응답 폐기 | 대규모 메시/스켈레톤/탄막·전환 반복 · 프로세스 전체 RAM/VRAM 장기 증가 원인 종결 | [MEMORY_CONTROL_060.md](research/MEMORY_CONTROL_060.md) · [HOST_MEMORY_062.md](research/HOST_MEMORY_062.md) · [ENGINE_WORK_168.json](research/ENGINE_WORK_168.json) · [ENGINE_WORK_179.json](research/ENGINE_WORK_179.json) · [ENGINE_WORK_180.json](research/ENGINE_WORK_180.json) · [ENGINE_WORK_185.json](research/ENGINE_WORK_185.json) |

## 연구 대조

| ID·항목 | 상태 | 구현된 범위 | 남은 작업 | 근거 |
|---|---|---|---|---|
| RES-01 Unreal/Unity 전체 본문·API 대조 | partial | 출처 원장·개별 본문/소스 대조·증거/미독 경계 | 전체 discovery 분모·추가 버전/API/미디어 대조 · 전체 독립 분석 gate | [RESEARCH_STATUS.md](research/RESEARCH_STATUS.md) · [ANALYSIS_PROTOCOL.md](research/ANALYSIS_PROTOCOL.md) |

