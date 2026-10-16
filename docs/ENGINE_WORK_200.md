# 200 — 대용량 콘텐츠의 공용 스트림 빌드·검증·게시

불투명 에셋과 런타임 바이너리를 파일 참조로 유지하고 재사용하는 64KiB 버퍼로 복사·SHA 검증한다. 파일당100MiB/합계1GiB 빌드 거절을 없애고 검색도 비동기 디렉터리 순회로 바꿨다. JSON/glTF/C++ 구조 검사는 기존 버퍼를 사용하고 C++ 컴파일 안전 예산은 유지한다.

같은 경로를 Windows·웹·모바일 복사, 실행기 시작 검증, 모바일 패키지 SHA, 웹 게시 준비에 연결했다. 웹 시작용 묶음은16MiB까지만 담으며 나머지는 원래 URL에서 읽는다. 옛 큰 묶음도 시작 때 통째로 올리지 않는다. 프로젝트별 EXE 이름과 명세 SHA를 확인하는 빌드 창 실행 경로도 고쳤다.

112MiB 파일10개를 포함한1,174,422,918B 콘텐츠를 Windows EXE·웹·arm64 Android APK·iOS Xcode 프로젝트로 내보내고 원본/결과 SHA를 대조했다. 10,051개 검색, 원본 변경·중단·기존 파일·출력 junction도 확인했다. 표본 Node 외부 메모리 증가22,993,789B/RSS103,616,512B이며 SDK 자식/브라우저 메모리나 게임 FPS가 아니다. 실제 휴대폰·Mac 컴파일은 수행하지 않았다.

[Node 파일 읽기/순회](https://nodejs.org/docs/latest-v24.x/api/fs.html), [Unity 에셋 로드/소유](https://docs.unity3d.com/6000.0/Documentation/Manual/AssetBundles-Native.html)의 지정 본문과 대조했다. 압축 쿠킹·큰 구조 문서/모델 디코더·SDK 메모리는 별도 잔여다.

근거: [ENGINE_WORK_200.json](research/ENGINE_WORK_200.json). 사용자 설치 전환은 별도 영수증에서 확인한다.
