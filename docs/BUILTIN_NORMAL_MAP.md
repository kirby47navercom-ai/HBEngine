# 기본 텍스처 노멀

가져온 모델의 기본 normalMap은 그래프를 새로 만들지 않고 사용해요. DirectX 기본 텍스처 경로는 실제 변환된 UV에서 접선 프레임을 만들고, 화면 Y 방향과 양면의 앞·뒷면을 처리해요. 미러 UV·비균일 UV·normalScale의 X/Y 값을 유지해요. 두 접선은 공통 길이로 정규화하므로 각각을 정규화해 비율을 잃지 않아요.

기하 노멀과 디코딩한 노멀은 최대 절대 성분으로 먼저 나눈 뒤 정규화해요. 큰 유한 값의 제곱 넘침과 작은 값의 제곱 소실을 피하며, 0·비유한 값·퇴화한 UV에는 기하 노멀로 복귀해요. XY가 0이고 Z가 음수인 유효 노멀은 기하 노멀의 반대 방향이에요. 미분은 텍스처 값에 따른 분기보다 먼저 계산해요. UV 오프셋에 더해져 Float32에서 이미 사라진 미세한 UV 차이를 복원하는 기능은 아니에요.

이 경로와 노드 그래프의 노멀 함수는 소유자가 달라요. 메시의 명시적 tangent 속성·모든 임의 노멀 그래프·오브젝트 공간 노멀·모든 기기에서의 동등성까지 검증한 것으로 확대하지 않아요. 설치 및 실제 검사 결과는 최신 ENGINE_WORK·USER_INSTALL 영수증을 확인해요. 관련 구현은 native/include/HBEngine/SceneRender.hpp의 hbBuiltinMappedNormal·hbBuiltinNormalUnit, 기본 모델 자료 연결은 prototype/native-scene-renderer.js예요.

검사 소스는 native/tests/builtin-normal-1167.cpp, tools/builtin-normal-reference-1168.mjs, tools/check-builtin-normal-1169-player.mjs예요. 첫 검사는 독립적인 평면 수식과 실제 D3D 픽셀, 두 번째는 로컬 Three 0.180의 유효한 표준 노멀맵 입력, 마지막은 PNG 노멀맵이 든 glTF를 게임으로 패키징해 C++·블루프린트에서 광원 방향을 바꾸는 경로예요. 실행 전에는 검사 파일의 존재를 통과 증거로 삼지 않아요.
