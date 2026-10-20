# 거리장 쿠킹·캐시·패키지 실행 연결

2026-10-21. RND-08의 거리장 쿠킹 잔여를 실제 제작/실행에 연결해요. ENGINE_WORK_1102.json과 후속 설치 영수증에 확정 SHA·실행 근거를 기록해요.

## 공식 본문 대조

[Epic Mesh Distance Fields](https://dev.epicgames.com/documentation/en-us/unreal-engine/mesh-distance-fields-in-unreal-engine)의 Scene Representation/Quality/Limitations를 다시 읽었어요. 정적 메시의 오프라인 볼륨 생성, 해상도와 자료량, 변형·얇은 면의 제한을 대조했어요. HB는 패키지 자료가 없을 때 기존 런타임 생성도 유지해요. 두 엔진의 전체 기능 동등성이나 전체 본문/API 분석 완료를 뜻하지 않아요.

[Unity Cache location reference](https://docs.unity.com/en-us/engine/6000.5/manual/building-and-publishing/build-cache-location-reference)의 빌드 캐시 위치·재사용/재생성 본문을 읽어요. HB는 기존 프로젝트 CookCache에 함께 넣고 보관 예산을 공유하며, 사용자의 설치 버전·프로필·SDK에 별도 캐시를 늘리지 않아요. 별도 supplemental1101/read-scope.json에 재읽기/새 읽기 구역을 남겨요.

## 구현

- 공용 codec: 정규화한 펼친 삼각형 SHA, 버전·좌표·유효 격자 검사, Float32 LE 바이너리. 생성 시간은 저장에서 제외해 결정적인 자료를 유지해요.
- 실제 Node 쿠킹: 정적 도형/프리팹·OBJ·glTF/GLB, 외부 버퍼·인덱스/범위, 기하 중복 제거. 기존 headless 모델의 기본 포즈 경로는 유지하고 geometry 옵션만 실제 기하를 읽어요. 텍스처를 쿠킹 기하 로드에 요구하지 않아요.
- 공유 캐시: 생성 소유자/설정/기하 지문, 체크섬 복구, 임시 파일 교체, 정상·실패 보관128MiB. 패키지의 필드·목록 합산32MiB와4MiB 목록 읽기 제한, 넘친 자료는 런타임 생성해요.
- 세 타깃 빌드와 게임 설정: 같은 자동 쿠킹 단계·manifest·Windows 서버/웹·모바일 backend 전달. 원본 에셋과 생성 경로 충돌은 거부해요.
- 런타임: 최초 목록·필요한 필드만 제한 크기로 읽기, SHA·원본/정밀도/예약 확인, 성공 재사용과 손상/빠짐 복구, 기존 볼륨·컨트롤러/교체/해제·atlas 소유 유지. GPU 수식/ABI/자원 종류는 바꾸지 않아요.
- AI 계약/진단·짧은 사용 문서·경로 탐색 연결. 현재 상한 외 다중 LOD·FBX/월드/변형체/편집기 쿠킹은 잔여예요.

## 검사 구분

1098은 격리 프로젝트의 실제 자동 패키지 단계, OBJ/glTF 중복, 외부 버퍼 변경, 결정적인 출력, 손상 재생성, 해상도/예산/취소, 독립 팔면체 부호와 평면 거리를 확인해요. 기본 프로젝트에 원래 포함된 모델도 쿠킹 대상이어서 처음의 두 필드 기대는 잘못된 검사 가정이었어요. 엔진을 그 개수에 맞추지 않았어요. 최초 binary fixture 쓰기는 텍스트 전용 ProjectService.write를 잘못 사용한 검사 오류였고, 소유 임시 경로에 직접 바이너리를 쓰도록 수정했어요.

1100은 실제 GL/GPU의 패키지 바이너리 읽기·낮은 LOD 생성·상한 재사용·픽셀 복원·직접광·GL 프로그램/TAA 대조예요. 첫 bytesRead 기대는 직사각형까지 두 번 읽는다고 가정했지만 실제로 교체되는 voxel 필드만 다시 읽어요. 관측된 필드별 파일 크기를 독립 대조해 수정했어요. 잘못된 검사를 통과로 세지 않아요.

1090은 실제 새 Windows 패키지·컴파일된 C++/BP·D3D11 AO예요. 최초 두 필드가 쿠킹 hit이고 workerStarts=0, 이후 낮춤과 원래 픽셀 복원을 확인해요. 기존 포즈 전용 headless·거리장 소유/취소·투영/API/문법 회귀를 함께 검사해요. 전체 FPS·초기 GL 지연·모바일 실기기·상용 엔진 전체 완료는 주장하지 않아요.
