# 088 — DirectX HDR와 컴퓨트 블룸

Windows 게임의 `windowsRenderer: d3d11`에 HDR 장면과 컴퓨트 블룸을 연결했어요. 기존 `PostProcessVolume`의 활성화·우선순위·임계값·강도·반경·해상도 배율을 그대로 사용해요. 같은 속성이 편집기·AI 문서 작업·저장·Undo·C++ `Components::SetBool/SetFloat`·블루프린트 컴포넌트 함수로 전달돼요. 사용자 설치본은 누적 선행 작업을 마칠 때 갱신하며 이번 개발 빌드로 덮어쓰지 않았어요.

## 렌더링과 비용

발광과 직접광을 선형 `R16G16B16A16_FLOAT` 장면에 먼저 그린 뒤 밝은 영역을 추출해요. 최대 다섯 해상도에서 축소와 가로/세로 Gaussian 필터를 `cs_5_0`으로 실행하고, 원본 HDR와 합성한 결과에 노출·ACES·sRGB 출력을 한 번 적용해요. 2D SVG 스프라이트 발광과 3D HLSL 노드 머테리얼을 같은 경로로 처리해요. 극단적인 HDR 값은 half-float 안전 범위로 제한해요.

활성 뷰포트 영역을 기준으로 축소해 픽셀 카메라의 검은 여백을 유지하고, 최종 합성에 scissor를 적용해요. 정상 프레임에 이미지 readback이나 CPU blur를 하지 않아요. HDR 타깃은 처음 활성화하거나 크기/배율이 바뀔 때만 만들며 숫자 설정 변경은 기존 타깃을 재사용해요. 비활성화·강도 0·장면 종료 시 타깃을 해제하고 컴파일된 셰이더와 작은 상태 자원은 재사용해요. 상수 버퍼 세 개는 `WRITE_DISCARD`로 순환해요.

`bloomTextureBytes`는 현재 HDR 텍스처의 폭×높이×8 합계 추정치이며 드라이버 전체 할당량이 아니에요. `bloomDispatches`는 현재 프레임, `bloomAllocations`와 `bloomComposites`는 누적 횟수예요. 비동기 GPU 시간 구간에 블룸 패스가 포함돼요. 오브젝트 수 제한을 추가하지 않았어요.

## 분석한 범위와 차이

[Unreal Bloom](https://dev.epicgames.com/documentation/en-us/unreal-engine/bloom-in-unreal-engine)의 자체 기술 본문에서 다중 해상도 Gaussian, 임계값/강도, convolution과 커널·dirt를 읽었어요. [Unity 6000.0 URP Bloom](https://docs.unity3d.com/6000.0/Documentation/Manual/urp/post-processing-bloom.html)의 자체 기술 본문에서는 gamma 임계값·scatter·tint·clamp·축소/반복·dirt와 모바일 비용을 읽었어요. 요청한 패키지 17.0 URL이 해당 매뉴얼로 이동한 사실도 기록했어요. [Microsoft Compute Shader Overview](https://learn.microsoft.com/en-us/windows/win32/direct3d11/direct3d-11-advanced-stages-compute-shader)의 기술 본문과 설치된 Three r180의 bloom/output 지정 메서드를 대조했어요. 원문/SHA·읽기 경계·추가 discovery는 [기록](research/NATIVE_BLOOM_088.json)에 있어요. 연결 API·미디어·전체 엔진 문서 독립 검증을 완료로 승격하지 않았어요.

HB의 기존 선형 임계값과 `.01` 전환 폭을 유지해요. Unity의 gamma 입력, Unreal의 `-1` 전체 추출 규칙이나 두 엔진의 정확한 픽셀 결과와 같다고 주장하지 않아요. 다섯 단계 가중치는 정규화해요. HDR 활성화 때 하늘과 `toneMapped: false` 머테리얼도 최종 출력 변환을 받으며 DOM HUD는 별도예요.

현재 선택된 전역 볼륨 한 개를 사용해요. 로컬 볼륨 범위/혼합, FFT convolution, lens dirt·tint·품질 반복 수의 제작 설정은 후속 범위예요. 기존 GL/GPU의 기능과 네이티브 연결을 별도로 확인하며 GI/반사·스킨/인스턴스/모프·입자와 2D 셰이더의 남은 연결을 유지해요.

## 검증

GPU 픽셀 검사에서 발광 경계 밖 번짐, 높은 임계값 제거, 노출 0, scissor/여백, 반복 합성 방지, 타깃 재사용/해제와 잘못된 배율 거절을 확인했어요. 기존 그림자·HLSL 54종·2,049 드로우×12프레임 검사도 함께 통과했어요. CPU 제출 시간은 전체 FPS가 아니에요.

격리 Windows Game.exe에서 2D SVG와 3D HLSL 발광의 경계 밖 픽셀, C++ 임계값/강도/활성화, N/B 키 블루프린트 강도/비활성화, resize 재할당, 픽셀 여백, 장면 전환 해제와 종료를 확인했어요. 기존 GL의 블룸·발광·피격 번쩍임·C++ 애니메이션·자원 수명 검사도 실행했어요. 정확한 검사 경로·SHA·픽셀은 증거 JSON을 참조해요.

이 검사는 실제 GPU 렌더 타깃과 WebView HUD를 별도로 확인해요. 모니터 합성 화면·DPI·전체 프로세스 RAM·PC 120/mobile 60 FPS·장기 발열·실제 휴대폰은 이 결과로 합격 처리하지 않았어요. 사용자 원본·설치본·실행 중인 창은 검사에 사용하지 않았어요.
