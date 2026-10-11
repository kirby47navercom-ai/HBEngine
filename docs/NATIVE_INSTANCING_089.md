# 089 — DirectX 인스턴스와 투사체 배치

Windows `d3d11` 게임 화면에 indexed instancing과 기존 투사체 실행기를 연결했어요. C++ `Projectiles::FireText/Clear`와 블루프린트 `projectileFire/projectileClear`는 같은 게임 서비스·소유자·이동·수명·충돌 규칙을 사용해요. 사용자 설치본과 원본 게임은 변경하지 않았어요.

## 렌더 연결과 자원

일반 인스턴스는 로컬 변환·역전치 법선·색상을 GPU에서 적용해요. 정적 삼각형·일반/노드 머테리얼·alpha 컷아웃 그림자·HDR 경로를 공유하고 한 번의 `DrawIndexedInstanced`로 그려요. Three `InstancedMesh`의 count·행렬/색상 version과 dispose를 따라 변경 데이터와 해제를 전달해요. 사용자 임의 instance shader, 스킨/모프와 음수/특이 행렬은 별도 연결이 필요해요.

투사체는 스타일마다 기존 plane 메시를 재사용하고 XY/XZ의 크기·비율을 vertex shader에서 적용해요. 인스턴스 행렬 144바이트 대신 `float4` 위치 16바이트를 보내요. 살아 있는 수에 맞춰 2의 거듭제곱으로 버퍼가 늘어나고 감소할 때는 최고 용량을 재사용하며 스타일/장면 종료 시 해제해요. 최초 한 발의 세 위치 버퍼는 자료 크기 합계 48바이트예요. 드라이버 물리 할당량이나 전체 RAM이 아니에요.

구조 버퍼 세 개를 순환하고 `DEFAULT`·`UpdateSubresource`를 사용해요. 구조 버퍼의 MISC flag와 CPU access flag를 함께 쓰지 않아요. 정지한 일반 인스턴스는 version이 바뀌지 않으면 전송하지 않아요. 투사체 위치 attribute 변경을 정적 메시의 변경 판단에서 제외해 매 프레임 메시 재생성 비용을 없앴어요. `instanceBatches`, `instanceBufferBytes` 추정치와 누적 `instanceUpdates`를 기존 실행 진단·AI 렌더 스키마에서 확인할 수 있어요.

투사체 시뮬레이션과 swept 충돌은 기존 CPU 실행기를 유지해요. GPU가 인스턴스 확장과 그리기를 담당하며 GPU 시뮬레이션·culling·sorting·indirect까지 끝났다는 의미는 아니에요. 새 장면 오브젝트 수 제한은 만들지 않았어요. 기존 투사체 게임 서비스의 기본 용량·패턴/스타일/충돌 큐 예산은 이 변경과 구분해요.

## 스프라이트 오류 수정

기존 공용 투사체 로더가 기본 스프라이트 영역 `[0,0,0,0]`을 그대로 나눠 크기가 NaN이 됐어요. 네이티브의 유효성 검사에서 오류를 잡았고 실제 창에서 실행 중단을 재현했어요. `resolveSprite`와 `spriteImage`를 재사용해 전체 이미지 영역을 실제 크기로 해석하고 원본 시트의 자식 slice도 따라가도록 고쳤어요. 잘못된 영역과 정리 후 도착하는 이미지의 해제도 처리해요. 이 수정은 GL/GPU/native에 공통으로 적용돼요.

## 근거와 검증

[Microsoft DrawIndexedInstanced](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/nf-d3d11-id3d11devicecontext-drawindexedinstanced)의 자체 API 본문·매개변수/remarks, [StructuredBuffer](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/sm5-object-structuredbuffer)의 자체 기술 본문, [CPU access flags](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/ne-d3d11-d3d11_cpu_access_flag)의 자체 enum 본문/제약과 Three r180 지정 메서드를 읽었어요. 원문/SHA·선택 범위·미독과 추가 discovery는 [089 기록](research/NATIVE_INSTANCING_089.json)에 남겼어요. 연결 API나 전체 Unity/Unreal 분석 완료로 승격하지 않았어요.

- `native-scene-LgxkK6`: 실제 GPU 인스턴스 색상/그림자, compact XY/XZ·블룸, 빈 개수/초과/비유한 값 검증, 세 버퍼와 2,049 인스턴스×12프레임 단일 드로우/재할당 없음 통과. 기존 HLSL 54종·그림자·HDR 회귀도 통과했어요.
- `native-scene-window-ziaoRF`: 격리 Windows Game.exe에서 C++ 발사·P 키 BP, 전체 SVG의 빨강/파랑 픽셀, 자식 slice의 빨강/비율, 원형 탄환과 2,049개 단일 배치, 반복 프레임 재할당 없음, C++ 정리/장면 전환 후 자원 0과 정상 종료를 확인했어요. 전체 SVG 픽셀은 `[232,0,0,255]`/`[0,0,232,255]`였어요.
- `check-projectile-rendering`: 공용 GL/native 머테리얼의 전체/분할 영역·UV/비율·위치 데이터·정리 후 지연 로딩 해제를 CPU 검사로 확인했어요. 실제 GL 드로우 검사와 구분해요.

실패한 NaN과 검사 샘플 위치/배경 가정 기록도 보존했어요. 전체 게임 FPS·프로세스 RAM·장기 발열·실제 휴대폰·모니터 합성/DPI는 이 증거로 합격 처리하지 않았어요. 다음 네이티브 GI/반사·스킨/모프·ParticleSystem·2D 셰이더와 누적 요구를 유지해요.
