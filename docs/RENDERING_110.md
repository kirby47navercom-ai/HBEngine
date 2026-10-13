# 110 — 광선 atlas 자원 재사용과 부분 갱신

오브젝트·포즈·광원·머테리얼이 바뀌어도 광선 atlas의 크기가 같으면 기존 GPU 텍스처를 재사용해요. 경로 추적과 기하 GI에 공통으로 적용하며, C++·블루프린트·AI의 기존 오브젝트·머테리얼 변경 API를 그대로 써요.

## 갱신과 수명

새 포장 데이터와 이전 데이터를 행별로 비교해요. WebGL은 바뀐 RGBA 행만 `Texture.addUpdateRange`로 올려요. DirectX는 첫 변경 행부터 마지막 변경 행까지를 기존 리소스의 `UpdateSubresource`로 갱신해요. 변경 행 사이에 빈 구간이 있으면 DirectX의 연속 구간에는 그 행도 포함돼요.

여러 번 준비한 뒤 렌더링하는 경우에는 아직 올리지 않은 행을 합쳐요. 대기 행 목록은 atlas 높이를 넘지 않으며, 업로드 뒤 비워요. 크기가 달라지면 전체 자원을 새로 만들고 이전 자원을 해제해요. 바뀐 포장 값이 없으면 텍스처 버전도 올리지 않아요. 월드 변경에 따른 경로 누적 초기화는 유지해요.

DirectX 갱신은 해당 장치의 단일 레이어·한 밉·RGBA float 텍스처에만 허용해요. 정수 범위·크기·구간·바이트 수·유한값을 확인하고, 거부된 데이터로 GPU 자원을 바꾸지 않아요. 기존 일반 텍스처와 큐브·볼륨·배열·스프라이트 업로드 계약은 유지해요. `raySceneUpdates`, `raySceneUpdateBytes`는 기존 렌더 진단에 추가돼요.

## 확인한 비용과 경계

[검사 기록](research/RENDERING_110.json)에 CPU와 실제 실행 결과를 남겨요. CPU의 128×128 텍스처 이동 20회에서 전체 atlas는 393,216바이트, 변경 구간은 65,536바이트였어요. 부분 데이터를 이전 atlas에 복사한 결과를 전체 새 데이터와 대조해요. 이 장면의 전송 데이터는 1/6이지만 다른 장면에서도 같은 감소율을 보장하지 않아요.

WebGPU는 같은 텍스처 자원을 재사용해요. 설치 Three r180의 DataTexture 업로드는 변경 행 목록을 처리하지 않으므로, 현재 WebGPU는 전체 데이터를 올려요. CPU 삼각형/BVH 구축·atlas 재포장과 전체 데이터 비교도 남아 있어요. 텍스처가 없거나 작은 장면, 큰 포즈 변화, 떨어진 구간의 동시 변경에는 전송량 감소가 작거나 없을 수 있어요.

DirectX의 사용 중인 자원 갱신에는 드라이버 임시 복사·경합 비용이 있을 수 있어요. 부분 갱신으로 게임 전체의 120/60FPS나 GPU 완료 시간을 보장한다고 주장하지 않아요. 기본 2D 장면에 새 광선 자원을 만들지 않으며, 자동 GPU 읽기는 추가하지 않아요.

## 근거와 설치

[Microsoft UpdateSubresource](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/nf-d3d11-id3d11devicecontext-updatesubresource)의 선언·box 좌표·행 pitch·자원 조건·복사 수명·경합·2D 예제 구역을 대조했어요. HBEngine은 immediate context를 쓰며, 연결 API·그림·deferred context 우회 절을 모두 읽었다는 주장으로 확장하지 않아요.

설치된 Three r180의 WebGL 행 갱신·Texture 범위 API·onUpdate 호출과 WebGPU의 전체 DataTexture 업로드 구역을 읽고 소스 SHA를 기록해요. [설치 영수증](research/USER_INSTALL_110.json)은 기존 설치·사용자 설정 보존, 새 제품·실행 파일·바로가기·프로젝트 연결을 확인한 뒤 별도로 저장해요.
