# 196 — 텍스처 채널·픽셀·면/슬라이스 검사

이미지 더블클릭을 전용 비파괴 텍스처 보기로 연결했다. RGBA/RGB/R/G/B/A, 최근접/선형 미리보기, 맞춤/채우기/1:1, 커서 기준 휠 확대, 좌·가운데·우 버튼 이동, 원본 픽셀 좌표/8비트RGBA를 제공한다. 투명 배경은 체크무늬로 보인다. 큐브맵6면과2D배열·볼륨의 원본 이미지 슬라이스도 같은 보기로 검사한다. 기존 이미지 목록 편집·재질 사용은 유지한다.

AI의 `texture.view`는 열린 텍스처 path와 선택 settings를 받는다. channel,filter,zoom,pan,index를 사람 UI와 같은 함수로 검증한다. pixel:[x,y]는 원본 정수 픽셀을 조회한다. 반환값은 ready/source/size/pixel/previewPixels와 보기 설정이다. 보기 변경은 원본 파일·문서 revision·dirty/Undo를 바꾸지 않는다. 가족 텍스처의 보기 상태는 문서 view에만 둔다.

전체 원본 CPU 픽셀 복사본을 보관하지 않는다. 화면 캔버스는 최대4194304픽셀, 원본 픽셀 탐침은1픽셀이다. 채널 변환은 표시 영역에서만 실행하고, 상시 프레임 루프나 새 라이브러리를 추가하지 않는다. 닫기에서 ResizeObserver·예약 프레임·이미지 요청·캔버스를 해제하며 슬라이스 변경의 늦은 요청은 취소/세대로 격리한다. 원본 이미지 디코더 메모리까지 이 캔버스 한도로 제한한다는 뜻은 아니다.

CPU3군과 실제 Win32 UI에서 채널 선택 뒤 검은 픽셀, 원본 빨강/파랑, 반투명 alpha128, 확대·이동,3종 면/슬라이스, 문서 불변성, 닫기 자원 해제를 확인했다. 화면도 직접 확인했다. [실행 근거](research/ENGINE_WORK_196.json).

대조 본문: [UE Texture Asset Editor](https://dev.epicgames.com/documentation/unreal-engine/texture-asset-editor-in-unreal-engine)0–141의 비파괴 채널·면·슬라이스·확대, [Unity DrawPreviewTexture](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/EditorGUI.DrawPreviewTexture.html)234–297의 표시 영역·채널·비율 계약. 현재 보기는 브라우저가 디코드한8비트 소스의 표시이며 쿠킹된 압축GPU mip·HDR 선형 값·볼륨3D 광선 보기나 재질 변환기가 아니다. 해당 추가 잔여와 전체 조사 gate는 원장에 유지한다.
