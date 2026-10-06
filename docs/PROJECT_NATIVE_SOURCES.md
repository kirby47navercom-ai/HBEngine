# 프로젝트 C++ 소스와 타일 묶음 편집

## Source 파일

편집기의 C++ 빌드, `run-project`, Windows 게임 출력과 Android/iOS 출력은 프로젝트 `Source/` 아래 `.h`, `.hpp`, `.hh`, `.inl`, `.cpp`, `.cc`, `.cxx`를 같은 스냅샷으로 사용해요. BP에 연결된 원본 헤더·구현은 원래 상대 경로에 두고, 나머지 구현도 함께 컴파일해요. 하위 폴더와 상대 include를 유지해요. 보조 파일을 바꾸면 빌드 캐시도 바뀌어요. 예전 템플릿의 User.h는 같은 이름의 실제 프로젝트 헤더가 없을 때만 연결된 헤더의 호환 별칭으로 제공해요. 구형 엔진의 함수 본문만 있는 보조 cpp에는 같은 폴더·이름의 헤더를 포함해요. 그 외 누락 include는 컴파일 오류로 남겨요.

```cpp
// Source/Dungeon.h
#pragma once
namespace dungeon { int CellCount(int width); }

// Source/Dungeon.cpp
#include "Dungeon.h"
int dungeon::CellCount(int width) { return width * width; }

// Source/Actors/Director.cpp
#include "Director.h"
#include "../Dungeon.h"
int Director::Count() { return dungeon::CellCount(64); }
```

공개 함수·속성은 연결된 헤더의 기존 `HB_CLASS/HB_FUNCTION/HB_PROPERTY` 계약을 사용해요. 모바일 AOT에서는 각 모듈의 사용자 C++ 이름과 정적 상태를 별도 namespace에 두므로 같은 보조 함수가 여러 모듈에 들어가도 충돌하지 않아요. 같은 공개 클래스 이름을 선언하는 다른 BP 소스 쌍은 파일 목록에 보존하되 해당 모듈의 보조 cpp로 컴파일하지 않아요. 연결된 구현과 같은 경로·이름의 헤더를 우선 선택하며 파일 내용/컴파일 대상/검색 경로를 모두 캐시 키에 포함해요. 명시적으로 충돌하는 헤더를 include하면 컴파일 오류로 남겨요. 외부 C ABI 라이브러리 연결이나 플랫폼별 사용자 빌드 설정을 대신하는 기능은 아니에요.

파일은 최대512개, 파일당500KB, 전체8MB예요. 프로젝트의 경로·링크 검사를 거치며 대소문자 중복과 경로 이탈을 거절해요. 기존 컴파일60초·취소·완성된 실행 파일만 캐시에 넣는 규칙을 유지해요. 많은 파일의 최초 컴파일은 그 제한에 도달할 수 있어요.

## 타일 묶음

```cpp
std::vector<hb::Vec2> cells;
std::vector<int> indices;
for (int y = 0; y < 64; ++y)
    for (int x = 0; x < 64; ++x) {
        cells.push_back({float(x), float(y)});
        indices.push_back(5);
    }
hb::Tilemaps::SetTiles(map, "ground", cells, indices);
hb::Tilemaps::ProcessTilemapChanges(map);
```

BP의 **여러 타일 지정·삭제** 노드와 AI 스키마도 같은 함수예요. 두 배열 길이는 같아야 하며 최대65,536칸을 받아요. `-1`은 삭제이고 중복 좌표는 마지막 값이 적용돼요. 좌표·인덱스 전체를 검증한 뒤 변경하므로 잘못된 칸이 섞인 묶음은 아무 칸도 바꾸지 않아요.

타일 수N·변경 수M에 대해 평균O(N+M)로 한 번 처리하고 브리지 명령 하나를 보내요. 기존 타일 순서를 보존해요. C++에서 같은 호출 안의 `GetTile`은 변경된 값을 읽어요. 화면·충돌 갱신은 기존 프레임 말 갱신 또는 `ProcessTilemapChanges`를 사용해요. 개별 `SetTile`의 기존 비용은 남으므로 대량 생성에는 `SetTiles`를 사용해요.

검사 명령은 `npm run test:project-native`예요. 하위 폴더의 실제 GCC 빌드, 보조 구현 변경에 따른 캐시 무효화, 두 AOT 모듈의 이름·정적 상태 격리, 4,096칸 묶음과 실패 원자성을 확인해요. 이 검사는 실제 Android/iOS 기기 검증을 대신하지 않아요.
