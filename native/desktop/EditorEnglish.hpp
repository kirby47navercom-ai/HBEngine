#pragma once
// English editor UI (보기 > 언어): exact Korean → English lookups for menus, toolbar chips, panel titles, search boxes and
// Details structure. Anything not in the table stays Korean. Applied at the next editor start.
#include <string>
#include <unordered_map>
#include <windows.h>

namespace hb::editor_english {
inline bool& enabled(){static bool on=false;return on;}
inline const std::unordered_map<std::wstring,std::wstring>& table(){
    static const std::unordered_map<std::wstring,std::wstring> words{
        // menu bar
        {L"파일",L"File"},{L"편집",L"Edit"},{L"장면",L"Scene"},{L"보기",L"View"},{L"빌드",L"Build"},{L"도움말",L"Help"},
        // help
        {L"시작하기",L"Getting Started"},{L"단축키 목록",L"Keyboard Shortcuts"},{L"단축키 지정…",L"Assign Shortcut…"},{L"지정한 단축키 모두 지우기",L"Clear Custom Shortcuts"},{L"HBEngine 정보",L"About HBEngine"},
        // file
        {L"프로젝트 열기",L"Open Project"},{L"새 프로젝트",L"New Project"},{L"최근 프로젝트",L"Recent Projects"},{L"최근 프로젝트 없음",L"No Recent Projects"},{L"시작할 때 마지막 프로젝트 열기",L"Open Last Project on Startup"},
        {L"새 에셋",L"New Asset"},{L"새 에셋…",L"New Asset…"},{L"새 C++ 클래스",L"New C++ Class"},{L"새 C++ 클래스…",L"New C++ Class…"},{L"C++ 클래스로 블루프린트 생성",L"Create Blueprint from C++ Class"},{L"소스를 외부 편집기에서 열기",L"Open Source in External Editor"},
        {L"새 폴더",L"New Folder"},{L"에셋 가져오기",L"Import Asset"},{L"선택한 에셋 이름 바꾸기",L"Rename Selected Asset"},{L"선택한 에셋 삭제 (휴지통)",L"Delete Selected Asset (Recycle Bin)"},{L"선택한 에셋을 다른 폴더로 이동",L"Move Selected Asset to Folder"},
        {L"문서 저장",L"Save"},{L"다른 이름으로 저장…",L"Save As…"},{L"모두 저장",L"Save All"},{L"문서 닫기",L"Close Document"},{L"닫은 탭 다시 열기",L"Reopen Closed Tab"},{L"저장 충돌 복구",L"Recover Save Conflict"},
        // edit
        {L"되돌리기",L"Undo"},{L"다시 적용",L"Redo"},{L"선택한 종류의 노드 추가",L"Add Node of Selected Kind"},{L"애니메이션 전이 편집",L"Edit Animation Transition"},{L"시퀀스 곡선 설정",L"Sequence Curve Settings"},{L"타일맵 붓 설정",L"Tilemap Brush Settings"},
        {L"스프라이트 애니메이션 프레임",L"Sprite Animation Frames"},{L"위젯 앵커 프리셋",L"Widget Anchor Presets"},{L"모바일 조작 추가",L"Add Mobile Controls"},{L"머테리얼 함수 핀 갱신",L"Refresh Material Function Pins"},
        {L"블루프린트 변수 추가",L"Add Blueprint Variable"},{L"블루프린트 함수 추가",L"Add Blueprint Function"},{L"선택 노드를 함수로 접기",L"Collapse to Function"},{L"선택 노드를 매크로로 접기",L"Collapse to Macro"},{L"함수로 접기",L"Collapse to Function"},{L"매크로로 접기",L"Collapse to Macro"},{L"왼쪽 맞춤",L"Align Left"},{L"위쪽 맞춤",L"Align Top"},{L"가로 같은 간격",L"Distribute Horizontally"},{L"세로 같은 간격",L"Distribute Vertically"},{L"함수 이름",L"Function Name"},{L"매크로 이름",L"Macro Name"},{L"블루프린트 매크로 추가",L"Add Blueprint Macro"},{L"이벤트 디스패처 추가",L"Add Event Dispatcher"},{L"인터페이스 메시지 추가",L"Add Interface Message"},
        {L"디스패처·인터페이스 핀 편집",L"Edit Dispatcher / Interface Pins"},{L"위젯 요소 추가",L"Add Widget Element"},{L"시퀀스 트랙 추가",L"Add Sequence Track"},{L"녹화 프리셋 상속 편집",L"Edit Recording Preset Inheritance"},
        {L"시퀀스에 녹화 프리셋 적용",L"Apply Recording Preset to Sequence"},{L"시퀀스 녹화 설정을 프리셋으로 저장",L"Save Sequence Recording as Preset"},
        // view
        {L"문서 창 분리 / 합치기",L"Detach / Attach Document Window"},{L"문서를 독립 창에 열기",L"Open Document in New Window"},{L"문서를 오른쪽에 열기",L"Open Document to the Right"},{L"문서를 아래에 열기",L"Open Document Below"},
        {L"시퀀스 곡선 그래프 전환",L"Toggle Sequence Curve Graph"},{L"스프라이트 애니메이션 미리보기 재생 / 중지",L"Play / Stop Sprite Animation Preview"},{L"오디오 파형 표시",L"Show Audio Waveform"},{L"오디오 미리듣기 / 중지",L"Preview / Stop Audio"},
        {L"콘텐츠 브라우저 분리 / 합치기",L"Detach / Attach Content Browser"},{L"출력 로그 표시 / 숨기기",L"Show / Hide Output Log"},{L"편집 화면 / 소스 전환",L"Toggle Editor / Source"},{L"상위 폴더",L"Parent Folder"},{L"속성 패널 너비 변경",L"Resize Details Panel"},
        {L"FPS 표시",L"Show FPS"},{L"뷰포트 최대화",L"Maximize Viewport"},{L"뷰포트 스크린샷",L"Viewport Screenshot"},{L"게임 보기 (편집 표시 숨기기)",L"Game View (Hide Editor Overlays)"},{L"게임 보기",L"Game View"},{L"바닥 격자 표시",L"Show Floor Grid"},
        {L"내비게이션 표시",L"Show Navigation"},{L"레벨 스트리밍 범위 표시",L"Show Level Streaming Bounds"},{L"충돌 표시",L"Show Collision"},{L"4분할 뷰포트",L"Quad Viewport"},
        {L"보기 모드: 조명",L"View Mode: Lit"},{L"보기 모드: 조명 없음",L"View Mode: Unlit"},{L"보기 모드: 와이어프레임",L"View Mode: Wireframe"},{L"조명",L"Lit"},{L"조명 없음",L"Unlit"},{L"와이어프레임",L"Wireframe"},
        {L"레이아웃 저장…",L"Save Layout…"},{L"레이아웃 불러오기…",L"Load Layout…"},{L"실행 취소 기록",L"Undo History"},{L"프로파일러",L"Profiler"},{L"소스 관리",L"Source Control"},{L"기본 배치 복원",L"Reset Layout"},
        {L"Windows 설정 따르기",L"Follow Windows Setting"},{L"편집기 배율",L"Editor Scale"},{L"편집기 배율: Windows 설정 따르기",L"Editor Scale: Follow Windows"},{L"밝은 테마",L"Light Theme"},{L"콘텐츠 정렬·크기",L"Content Sort & Size"},
        {L"언어",L"Language"},{L"한국어",L"한국어 (Korean)"},
        {L"프로젝트 설정…",L"Project Settings…"},{L"에셋 3D 미리보기",L"Asset 3D Preview"},{L"텍스처 밉 / 면 / 슬라이스 선택",L"Texture Mip / Face / Slice"},{L"3D 에셋 미리보기 초점",L"Focus 3D Asset Preview"},{L"명령·에셋 검색…",L"Search Commands & Assets…"},
        {L"충돌 레이어·행렬…",L"Collision Layers & Matrix…"},{L"모델 단위·방향·변환",L"Model Units, Axes & Transform"},{L"모델 하위 에셋 편집",L"Edit Model Sub-assets"},{L"원본 모델 다시 가져오기",L"Reimport Source Model"},
        {L"지형·폴리지 도구 설정",L"Terrain & Foliage Tool Settings"},{L"월드 에셋 편집",L"Edit World Asset"},{L"메시 선택 모드",L"Mesh Selection Mode"},{L"메시 간선·영역·노멀·UV 도구",L"Mesh Edge / Region / Normal / UV Tools"},
        {L"UV 아틀라스 생성",L"Generate UV Atlas"},{L"UV 아틀라스 작업 취소",L"Cancel UV Atlas Job"},{L"메시 UV0·UV1 보기 / 3D 보기",L"Mesh UV0 / UV1 / 3D View"},{L"메시 UV 전체 보기",L"Frame Mesh UVs"},
        // scene
        {L"오브젝트 추가",L"Add Object"},{L"오브젝트 추가…",L"Add Object…"},{L"선택 숨기기 (편집기)",L"Hide Selected (Editor)"},{L"모두 보이기",L"Show All"},{L"선택만 보기",L"Isolate Selected"},{L"빈 부모로 묶기",L"Group Under Empty Parent"},
        {L"전체 보기",L"Frame All"},{L"모두 선택",L"Select All"},{L"선택 해제",L"Deselect"},{L"선택 반전",L"Invert Selection"},{L"트랜스폼 복사",L"Copy Transform"},{L"트랜스폼 붙여넣기",L"Paste Transform"},
        {L"위치 초기화",L"Reset Location"},{L"회전 초기화",L"Reset Rotation"},{L"크기 초기화",L"Reset Scale"},{L"컴포넌트 추가",L"Add Component"},{L"컴포넌트 추가…",L"Add Component…"},
        {L"파티클 미리보기 재생 / 멈춤",L"Play / Pause Particle Preview"},{L"파티클 미리보기 다시 시작",L"Restart Particle Preview"},{L"조명 빌드 (간접광 베이크)",L"Build Lighting (Bake Indirect)"},
        {L"내비 메시 굽기… (내비 메시 문서)",L"Bake Nav Mesh… (Nav Mesh Document)"},{L"LOD 자동 생성… (LOD 문서)",L"Generate LODs… (LOD Document)"},
        {L"선택 오브젝트 삭제",L"Delete Selected"},{L"선택 오브젝트 복제",L"Duplicate Selected"},{L"선택 오브젝트 복사",L"Copy Selected"},{L"오브젝트 붙여넣기",L"Paste Objects"},{L"스냅 켜기",L"Enable Snap"},{L"스냅",L"Snap"},
        {L"변경 사항을 프리팹에 모두 적용",L"Apply All Changes to Prefab"},{L"변경 사항 모두 되돌리기",L"Revert All Changes"},{L"프리팹 원본과 다시 동기화",L"Resync with Prefab"},{L"프리팹 연결 풀기",L"Unpack Prefab"},{L"선택한 프리팹 인스턴스",L"Selected Prefab Instance"},
        {L"선택 오브젝트에 초점",L"Focus Selected"},{L"바닥에 붙이기",L"Snap to Floor"},{L"오브젝트 조종 / 끝내기",L"Pilot / Stop Piloting"},{L"월드 / 로컬 좌표 전환",L"Toggle World / Local"},{L"표면 맞춤 (V: 꼭짓점)",L"Surface Snap (V: Vertex)"},
        {L"이동 도구",L"Move Tool"},{L"회전 도구",L"Rotate Tool"},{L"크기 도구",L"Scale Tool"},
        // build / play
        {L"플레이",L"Play"},{L"여기서 플레이 (편집기 카메라 위치)",L"Play From Here (Editor Camera)"},{L"중단점 위치·변수·관찰값",L"Breakpoints, Variables & Watches"},{L"플레이하고 게임 믹스 WAV 녹음",L"Play and Record Game Mix (WAV)"},
        {L"녹음한 WAV 다시 저장",L"Save Recorded WAV Again"},{L"플레이 중지",L"Stop"},{L"플레이 일시정지 / 계속",L"Pause / Resume"},{L"한 프레임 진행",L"Advance One Frame"},{L"블루프린트 계속 실행",L"Continue Blueprint"},{L"블루프린트 한 단계 실행",L"Step Blueprint"},
        {L"선택 오브젝트 녹화",L"Record Selected"},{L"빌드 검사",L"Check Build"},{L"빌드 프로필 설정",L"Build Profile Settings"},{L"빌드 프로필 복제",L"Duplicate Build Profile"},{L"빌드 프로필 삭제",L"Delete Build Profile"},
        {L"C++ 클래스 컴파일",L"Compile C++ Classes"},{L"패키징",L"Package"},{L"마지막 Windows 빌드 실행",L"Run Last Windows Build"},{L"현재 빌드 취소",L"Cancel Current Build"},
        // context menus
        {L"지우기",L"Clear"},{L"모두 복사",L"Copy All"},{L"정보 표시",L"Show Info"},{L"경고 표시",L"Show Warnings"},{L"오류 표시",L"Show Errors"},{L"같은 메시지 묶기",L"Collapse Duplicates"},{L"(비우기)",L"(None)"},
        {L"콘텐츠 브라우저에서 보기",L"Show in Content Browser"},{L"이 종류의 에셋이 없어요",L"No assets of this type"},{L"Git 저장소 만들기",L"Create Git Repository"},{L"스테이징 / 취소",L"Stage / Unstage"},{L"열기",L"Open"},{L"모두 스테이징",L"Stage All"},
        {L"커밋…",L"Commit…"},{L"새로 고침",L"Refresh"},{L"닫기",L"Close"},{L"다른 탭 닫기",L"Close Other Tabs"},{L"오른쪽 탭 닫기",L"Close Tabs to the Right"},{L"모든 탭 닫기",L"Close All Tabs"},{L"이름 바꾸기…",L"Rename…"},{L"이름 바꾸기",L"Rename"},
        {L"이름순",L"By Name"},{L"종류순",L"By Type"},{L"최근 수정순",L"Recently Modified"},{L"큰 파일순",L"Largest First"},{L"썸네일 작게",L"Small Thumbnails"},{L"썸네일 보통",L"Medium Thumbnails"},{L"썸네일 크게",L"Large Thumbnails"},{L"썸네일 아주 크게",L"Huge Thumbnails"},
        {L"붙여넣기",L"Paste"},{L"복사",L"Copy"},{L"복제",L"Duplicate"},{L"삭제",L"Delete"},{L"선택 항목에 초점",L"Focus Selected"},{L"이 오브젝트 조종",L"Pilot This Object"},{L"부모에서 분리",L"Detach from Parent"},
        {L"프리팹에 변경 적용",L"Apply Changes to Prefab"},{L"프리팹 변경 되돌리기",L"Revert Prefab Changes"},{L"새 단축키를 누르세요",L"Press the new shortcut"},{L"다른 폴더로 이동…",L"Move to Folder…"},{L"참조 보기…",L"Reference Viewer…"},
        {L"삭제 (휴지통)",L"Delete (Recycle Bin)"},{L"탐색기에서 보기",L"Show in Explorer"},{L"경로 복사",L"Copy Path"},{L"가져오기…",L"Import…"},
        // toolbars, panel titles, search boxes
        {L"추가",L"Add"},{L"가져오기",L"Import"},{L"설정",L"Settings"},{L"하위 폴더",L"Subfolders"},{L"콘텐츠 브라우저",L"Content Browser"},{L"출력 로그",L"Output Log"},{L"아웃라이너",L"Outliner"},{L"디테일",L"Details"},
        {L"피벗",L"Pivot"},{L"중심",L"Center"},{L"월드",L"World"},{L"로컬",L"Local"},{L"항목 레이블",L"Item Label"},{L"유형",L"Type"},{L"모든 유형",L"All Types"},{L"프로젝트",L"Project"},
        {L"오브젝트 검색",L"Search Objects"},{L"속성 검색",L"Search Details"},{L"에셋 검색",L"Search Assets"},{L"명령 입력 (help)",L"Enter command (help)"},{L"이름 또는 키로 검색",L"Search by name or key"},
        {L"편집기 카메라",L"Editor Camera"},{L"원근",L"Perspective"},{L"조종 끝내기",L"Stop Piloting"},
        // Details structure and common fields
        {L"+ 컴포넌트 추가",L"+ Add Component"},{L"콘텐츠 브라우저에서 에셋 찾기",L"Browse to Asset"},{L"오브젝트 에셋 열기",L"Edit Object Asset"},{L"편집기 전체 화면",L"Editor Fullscreen"},{L"다음 문서 탭",L"Next Document Tab"},{L"이전 문서 탭",L"Previous Document Tab"},{L"선택한 에셋으로 교체",L"Replace with Selected Asset"},{L"선택 거리 재기",L"Measure Selection"},{L"블루프린트에서 찾기…",L"Find in Blueprints…"},{L"블루프린트에서 찾기",L"Find in Blueprints"},{L"플레이 창 크기",L"Play Window Size"},{L"이름 일괄 바꾸기…",L"Batch Rename…"},{L"이름 일괄 바꾸기 (# = 번호)",L"Batch Rename (# = number)"},{L"즐겨찾기에 추가",L"Add to Favorites"},{L"즐겨찾기에서 빼기",L"Remove from Favorites"},{L"새 폴더",L"New Folder"},{L"폴더로 옮기기…",L"Move to Folder…"},{L"폴더로 옮기기",L"Move to Folder"},{L"폴더에서 빼기",L"Remove from Folder"},{L"같은 종류·에셋 모두 선택",L"Select All With Same Type & Asset"},{L"격자에 맞추기",L"Snap to Grid"},{L"모두 펼치기",L"Expand All"},{L"모두 접기",L"Collapse All"},{L"연결 끊기",L"Break Link"},{L"핀 연결 끊기",L"Break Pin Links"},{L"표면 머테리얼",L"Surface Material"},{L"실행 설정",L"Runtime Settings"},{L"레벨 이름",L"Level Name"},{L"환경",L"Environment"},{L"오브젝트",L"Objects"},{L"열린 문서 목록",L"Open Documents"},{L"시뮬레이트 (자유 카메라, 플레이 중 F8로 전환)",L"Simulate (free camera, F8 toggles during Play)"},{L"편집기 환경 설정",L"Editor Preferences"},{L"창",L"Window"},{L"경계 상자 표시",L"Show Bounds"},{L"카메라 위치 입력…",L"Camera Position…"},{L"카메라 위치 (x, y, z)",L"Camera position (x, y, z)"},{L"머테리얼 미리보기 도형",L"Material Preview Shape"},{L"구",L"Sphere"},{L"상자",L"Box"},{L"평면",L"Plane"},{L"원기둥",L"Cylinder"},{L"캡슐",L"Capsule"},{L"새 장면…\tCtrl+N",L"New Scene…\tCtrl+N"},{L"자식까지 모두 선택",L"Select All Children"},{L"참조 찾기\tShift+Alt+F",L"Find References\tShift+Alt+F"},{L"아웃라이너",L"Outliner"},{L"디테일",L"Details"},{L"출력 로그",L"Output Log"},{L"실행 취소 기록",L"Undo History"},{L"프로파일러",L"Profiler"},{L"소스 제어",L"Source Control"},{L"기본 배치로 되돌리기",L"Reset Layout"},{L"편집기 문서",L"Editor Documentation"},{L"노드 목록 문서",L"Node Catalog"},{L"블루프린트 사양 문서",L"Blueprint Specification"},{L"끝내기\tAlt+F4",L"Exit\tAlt+F4"},{L"최근 목록 지우기",L"Clear Recent"},{L"선택 오브젝트 잘라내기\tCtrl+X",L"Cut Selected\tCtrl+X"},{L"잘라내기\tCtrl+X",L"Cut\tCtrl+X"},{L"크기 0.1",L"Scale 0.1"},{L"크기 0.25",L"Scale 0.25"},{L"크기 0.5",L"Scale 0.5"},{L"크기 1",L"Scale 1"},{L"자동 저장 간격",L"Autosave Interval"},{L"30초",L"30 seconds"},{L"1분",L"1 minute"},{L"5분",L"5 minutes"},{L"끄기",L"Off"},{L"밝은 테마 (다시 시작하면 적용)",L"Light Theme (after restart)"},{L"트랜스폼",L"Transform"},{L"일반",L"General"},{L"컴포넌트",L"Components"},{L"위치",L"Location"},{L"회전",L"Rotation"},{L"스케일",L"Scale"},{L"이름",L"Name"},{L"보임",L"Visible"},
        {L"초기화",L"Reset"},{L"제거",L"Remove"},{L"활성화",L"Enabled"},{L"밉 자동 상주",L"Auto Mip Residency"},{L"텍스처 우선순위",L"Texture Priority"},{L"메시",L"Mesh"},{L"머테리얼",L"Material"},{L"라이트맵",L"Lightmap"},
        {L"간접광 강도",L"Indirect Intensity"},{L"반사·라이트맵 혼합",L"Reflection / Lightmap Blend"},{L"베이크 기여",L"Contributes to Bake"},{L"표시",L"Visible"},{L"그림자 생성",L"Cast Shadows"},{L"그림자 받기",L"Receive Shadows"},
        {L"부모",L"Parent"},{L"태그",L"Tags"},{L"레이어",L"Layer"},{L"잠금",L"Locked"},{L"블루프린트",L"Blueprint"},{L"색",L"Color"},{L"강도",L"Intensity"},{L"범위",L"Range"},{L"시야각",L"Field of View"},{L"근거리",L"Near Clip"},{L"원거리",L"Far Clip"},
    };
    return words;
}
// Numbered menu items ("카메라 속도 3", "시야각 90°", "이동 격자 0.5", "회전 15°").
inline std::wstring numbered(const std::wstring& text){
    static const std::pair<const wchar_t*,const wchar_t*> prefixes[]={{L"카메라 속도 ",L"Camera Speed "},{L"시야각 ",L"Field of View "},{L"이동 격자 ",L"Move Grid "},{L"회전 ",L"Rotate "}};
    for(const auto& [ko,en]:prefixes){const std::wstring p=ko;if(text.rfind(p,0)==0&&text.size()>p.size()&&iswdigit(text[p.size()]))return en+text.substr(p.size());}
    return {};
}
inline std::wstring translate(const std::wstring& text){
    if(!enabled()||text.empty())return text;
    const auto tab=text.find(L'\t');const std::wstring head=text.substr(0,tab),tail=tab==std::wstring::npos?L"":text.substr(tab);
    if(const auto found=table().find(head);found!=table().end())return found->second+tail;
    if(auto n=numbered(head);!n.empty())return n+tail;
    return text;
}
inline std::string translate(const std::string& text){
    if(!enabled()||text.empty())return text;
    const int n=MultiByteToWideChar(CP_UTF8,0,text.data(),int(text.size()),nullptr,0);std::wstring w(n,L'\0');MultiByteToWideChar(CP_UTF8,0,text.data(),int(text.size()),w.data(),n);
    const auto out=translate(w);if(out==w)return text;
    const int m=WideCharToMultiByte(CP_UTF8,0,out.data(),int(out.size()),nullptr,0,nullptr,nullptr);std::string r(m,'\0');WideCharToMultiByte(CP_UTF8,0,out.data(),int(out.size()),r.data(),m,nullptr,nullptr);return r;
}
// Translate every item of a menu (and its submenus) in place.
inline HMENU translateMenu(HMENU menu){
    if(!enabled()||!menu)return menu;
    for(int i=0,count=GetMenuItemCount(menu);i<count;i++){
        wchar_t buffer[512]{};MENUITEMINFOW info{sizeof(info)};info.fMask=MIIM_STRING|MIIM_SUBMENU|MIIM_FTYPE;info.dwTypeData=buffer;info.cch=511;
        if(!GetMenuItemInfoW(menu,UINT(i),TRUE,&info))continue;
        if(info.hSubMenu)translateMenu(info.hSubMenu);
        if(info.fType&MFT_SEPARATOR||!buffer[0])continue;
        const auto out=translate(std::wstring(buffer));if(out==buffer)continue;
        MENUITEMINFOW set{sizeof(set)};set.fMask=MIIM_STRING;set.dwTypeData=const_cast<wchar_t*>(out.c_str());SetMenuItemInfoW(menu,UINT(i),TRUE,&set);
    }
    return menu;
}
}
