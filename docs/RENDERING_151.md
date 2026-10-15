# 151–155 — GL 준비·필터 경량화·관절 제약·공용 제작 API

2026-10-15. 남은 렌더링부터 제작 기능까지 묶어 구현하고 마지막에 검증·설치한다. 기존 사용자 게임과 프로필을 검사에 사용하지 않는다.

## 151 — WebGL 경로 준비

선택한 경로 추적·광자·법선/렌즈 가이드·공간/시간 필터·합성 프로그램을 첫 사용 전에 준비한다. `KHR_parallel_shader_compile`이 있으면 완료 상태를 10ms 간격으로 확인하면서 기본 래스터 뷰포트를 계속 그린다. 표본 수·품질·해상도는 낮추지 않는다. 캡처는 같은 준비 상태를 기다린 뒤 실제 경로 결과를 다시 받는다.

Three r180의 `compileAsync`는 대기 중 material properties를 재조회한다. 그때 창을 닫고 머테리얼을 해제하면 오래된 콜백이 이미 해제된 소유자를 읽을 수 있다. HB는 `compile`이 만든 프로그램을 붙잡고 KHR 완료 여부만 확인하며 취소 시 대기 타이머를 즉시 깨운다. 다음 조회 전에 취소를 확인하므로 프로그램을 바로 해제할 수 있다. 타깃·큐브 면·mip·쿼드 머테리얼은 비동기 대기 전 복원한다. 준비용 draw·GPU readback·드라이버 캐시 파일을 추가하지 않는다.

확장 미지원이면 LINK_STATUS가 동기 대기를 일으킬 수 있다. 이 경우 `parallelSupported:false`를 공개하며 비동기 드라이버 지원으로 표시하지 않는다. 컨텍스트 손실·연결 실패는 캡처와 기존 오류 흐름으로 전파한다. 준비가 GPU 실행 시간이나 전체 FPS 측정인 것은 아니다.

## 152 — 이미지 필터의 불필요한 코드 제거

공간·시간 필터는 이미 만들어진 가이드와 이미지만 읽는다. 두 필터에 광선 순회·머테리얼 실행·굴절 가이드 전체를 다시 넣던 생성을 제거했다. 실제 필터 함수 본문은 같은 `pathDenoiseGLSL`에서 공유한다. CPU 기본 재현의 필터 소스는 3,255B, 같은 구성을 포함한 가이드 소스는 48,616B다. 이는 문자열/컴파일 입력 크기이며 GPU 메모리나 전체 프레임 시간 개선율로 계산하지 않는다. DirectX 공용 GLSL/HLSL 계산 본문은 변경하지 않았다.

## 153 — 사람과 AI의 같은 진단

WebGL도 기존 `pipelinePreparation`·`profiler.read`·프로파일러 표를 사용한다. 단계·시간·진행·실패를 프레임 기록 없이 읽는다. 병렬 확장 미지원과 실제 오류를 표 안에서 표시하고 오류 문자열을 escape한다. 별도 HUD나 안내문·갱신 타이머는 추가하지 않는다. 그래프·프로젝트 revision·Undo 자료를 진단 때문에 바꾸지 않는다.

## 154–155 — 3D 기준 포즈 XYZ 관절 제약과 제작 연결

[관절 제약 계약](ANIMATION_JOINT_LIMITS_154.md)을 Two Bone/FABRIK/CCD 공용 포즈 실행기에 연결한다. 기존 속성창, 저장/Undo, `document.patch`와 같은 검증, C++ SDK 선언에서 생성한 BP 노드·한국어/영어 검색을 사용한다. 제한을 쓰지 않는 IK에는 Quaternion/Euler 제약 버퍼를 만들지 않고 마지막 제한을 해제하면 반환한다.

## 검증

`native/build/rendering-151-group.json`에 묶음 CPU/애니메이션·2D·공용 API 결과를 보존한다. 실제 GL 복잡 노멀·모프·시간/렌즈·곡면·옵션 해제, 격리 Editor/Player의 C++/BP/실제 뼈·속성창/Undo, GL 프로파일러를 이어서 검사한다. 최종 실행 경로·실패·설치 SHA는 `research/RENDERING_151.json`, `USER_INSTALL_151.json`을 따른다. 준비 시간은 단계별 실제 결과를 보며 비동기 전환만으로 링크 총시간 감소를 주장하지 않는다.

## 직접 읽은 근거

[Three WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html)의 compile/compileAsync·properties·debug 구역과 설치된 r180 `WebGLRenderer`의 compile/prepareMaterial/getProgram, `WebGLProgram`의 onFirstUse/isReady/destroy, `FullScreenQuad` 소유자를 대조했다. [MDN KHR_parallel_shader_compile](https://developer.mozilla.org/en-US/docs/Web/API/KHR_parallel_shader_compile)의 비차단 완료 조회·LINK_STATUS fallback·총 링크 시간 설명과 예제를 읽었다. [Three CCDIKSolver](https://threejs.org/docs/pages/CCDIKSolver.html)의 BoneLink·update와 설치된 r180 소스의 rotationMin/Max 처리를 대조했다. HB의 bind 상대 XYZ 계약은 해당 라이브러리의 직접 로컬 회전 clamp와 구별한다. 연결 사양/API·엔진 구현 전체는 미독이며 Unreal/Unity 전체 분석 gate를 올리지 않는다.

## 유지하는 잔여

WebGPU 첫 path/약2초 가이드 준비, 이전 애니메이션 노멀 표본·mip, 전역 곡면 역해·복합 거친 로브·DFAO/베이크/HWRT, FullBody/ControlRig·자동 접지·고급 리타게팅과 전체 2D/2.5D/3D·에셋/월드·게임 시스템·편집·배포·모바일·성능·AI 확장 목표를 유지한다. 이번 관절 제약은 전체 Control Rig나 모든 관절 매개화의 구현을 뜻하지 않는다.

## 최종 실행 결과

CPU 묶음11개와 마지막 lazy 자원 변경 뒤 관절 검사 통과. 실제 WebGL rPDp4r의141/138/134/125/128·HDRI 및 C++·24성분 affine 오차 검사 통과. 복잡 텍스처 변경844채널, 모든 준비단계 ready·오류0·종료0·소유 서버 정리. 같은 조건 첫 path8018ms·공간 필터 설정3817ms·시간 필터 설정7768ms이며 lens-motion-guide7411ms가 남은 비용이다. 이미지 필터 코드를 줄였으나 가이드 총 링크 시간이 사라졌다고 주장하지 않는다.

Editor XB0xsQ와 release Player gl7SZW는 C++ 범위 거절·설정/해제, BP 기준 포즈 잠금/해제·실제 root Quaternion과 골격 위치, 속성창/Undo/dryRun/미리보기·배치/원본 보존을 통과했다. GL 프로파일러 Xt60CZ는 프레임 기록 없이 같은 API/표·가시 행·문서 revision/일반 patch·Undo/save와 오류0·종료0을 확인했다. 실제 화면 캡처를 직접 확인했다. 모든 소유 서버 종료와 기록된 소스 SHA 일치를 확인했으며 통과한 장면을 이유 없이 반복하지 않았다.

## 사용자 설치 전환 — 2026-10-16

검증 커밋 c13fc58을 a596df89fc3cc306으로 설치했다. 명세2252파일 전체 SHA와17개 변경 제품·생성API·두 실행파일·바로가기2개·.hbproject 연결·사용자 프로필을 대조했다. 이전 사본171,785,105B를 자동 정리해 Versions는1개다. 사용자 창을 재시작하지 않았다. 첫 설치 검증 도구가 HBPlayer.exe를 저장소 루트에 있다고 가정한 경로 오류는 실제 빌드 출력 dist/HBEngine과 비교하도록 바로잡았고 최종 검증을 통과했다. [설치 기록](research/USER_INSTALL_151.json).
