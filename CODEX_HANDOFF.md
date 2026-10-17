# HBEngine 현재 인계 — 296–297 설치 검증 완료

- 소스 커밋: 2f679ebe0a7811318031f1ee4702d90784499540 · main push 완료예요.
- 현재 설치: USER_INSTALL_297.json의 af678ad1bf3da1a1 하나·3071파일이에요. 설치 실제 숨김 창 rendering-296-window-BJTrq9의 삼선형/렌즈/guide/UV 오차0·정상 종료와 manifest/링크/프로필 전후 SHA 동일을 확인했어요. 이전 설치375966480바이트 제거·수정 보관0이에요.
- 구현: ray-uv-footprint의 동일 좌표/순서, ray-material-shader의 UV/기본·코팅 Frame 읽기, shared-ray-record-gl의 세 위치 공유, path-guide-specialization의 main/differential 노멀 호출 위치 공유예요. 공개 IR/레이아웃/품질은 유지해요.
- 최종 검사: validation297.json 모두 통과. native-scene-window-I3z8dy D3D, rendering-284-window-zDGcCd GL/GPU 골든, rendering-296-window-ZJcNrF 공유·삼선형/UV/렌즈/guide 및 path 링크, 8pxgIE 비공유, rendering-194-native-7COpIM 실제 HLSL이에요. CPU157/109/274/106도 통과했어요.
- 최초 native pkYMcJ X3014는 GLSL vec3(0)의 HLSL 인자 수 문제였어요. vec3(0,0,0) 수정·생성 헤더·EXE 재빌드 뒤 위 실제 D3D로 확인했어요. DEBUG_HANDOFF에 원인/도구 실패를 보존했어요.
- Complex141 GL 첫 path9.09초는 해결로 승격하지 않아요. RND-06 partial/전체78 관리 항목의 범위·미확정 UE/Unity 분모는 ENGINE_STATUS 정본을 따라요. 격리 링크 개선을 FPS로 보고하지 않아요.
- 다음 안전한 작업: RND-06의 실제 Complex141 첫 path 비용을 이어서 분석해요. ray-texture-shader의 삼선형 생성기는 두 mip을 무조건 읽으므로 정수 LOD의 불필요한 두 번째 읽기를 줄일 여지가 있어요. 아직 변경/검증한 기능은 아니며 조건부 샘플의 품질·compile/runtime 비용을 함께 입증해야 해요. WebGPU 첫 준비와 나머지 누적 범위는 ENGINE_STATUS 정본을 유지해요.
- sync295/queue295/audit295/finish295·validate296/validate297·sync297/install297/resume-install297/finish297은 실행한 one-shot이라 재실행하지 않아요. install297은 root HBPlayer가 없는 배포 구조를 잘못 가정해 설치 전에 종료했으며 resume은 buildGame과 같은 실제 dist 플레이어 선택으로 정상 완료했어요. 새 재검사/설치는 새 helper로 구분해요.
- 사용자 창/탭/프로젝트/프로필은 개발 검사 대상이 아니에요. 고유 숨김 창·프로젝트·포트·profile만 사용해요. 전역 정리는 다른 빌드가 있으면 보류하고 원본/SDK를 삭제하지 않아요.
