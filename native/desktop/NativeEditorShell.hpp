#pragma once
#include "EditorGraphPanel.hpp"
#include "EditorFormPanel.hpp"
#include "EditorTreePanel.hpp"
#include "EditorListPanel.hpp"
#include "EditorScenePanel.hpp"
#include "EditorAssetCanvas.hpp"
#include <commctrl.h>
#include <shobjidl.h>
#include <set>
#include <unordered_map>

class NativeEditorShell {
    using Json=nlohmann::json;
    HWND window=nullptr,detached=nullptr,files=nullptr,tabs=nullptr,source=nullptr,search=nullptr,palette=nullptr,views=nullptr,status=nullptr;
    HWND contentWindow=nullptr;
    HINSTANCE instance;
    HFONT font=nullptr;
    HANDLE childInput=nullptr,childOutput=nullptr,job=nullptr;
    std::string buffered,folder,view="event",graphSelection;
    std::wstring projectTitle;
    fs::path projectRoot;
    Json entries=Json::array(),document=Json::object(),model=Json::object(),fieldPath=Json::array(),fields=Json::array(),recent=Json::array(),graphInputs=Json::array();
    EditorGraphPanel graph;
    EditorFormPanel form;
    EditorTreePanel hierarchy;
    EditorListPanel console;
    EditorScenePanel viewport,previewViewport;
    EditorAssetCanvas assetCanvas;
    Json sceneRows=Json::array(),cameraRows=Json::array(),cameraInput;
    std::set<std::string> folded;
    std::string sceneSelection,cameraId;
    Json inspectedBase=Json::array();
    bool viewportPreparing=false;
    bool previewOpen=false;
    Json previewInput;
    Json widgetPreview;
    std::string widgetSelection,widgetRevision;
    std::string timelineTrack,timelineItem;
    fs::path layoutFile;
    fs::path playLauncher,playRuntimeRoot,editorProfile,projectFile;
    HANDLE playProcess=nullptr;
    DWORD playPid=0;
    bool stopPlayRequested=false;
    bool closeAfterPlay=false;
    HANDLE playJob=nullptr;
    bool building=false,checkingBuild=false;
    bool layoutMaximized=false;
    bool consoleVisible=false,contentDetachedOnStart=false;
    Json logItems=Json::array();
    std::uint64_t logRevision=0;
    unsigned browsePercent=24,inspectorPercent=25;
    enum class Divider {None,Browser,Inspector};
    Divider divider=Divider::None;
    HWND dividerOwner=nullptr;
    int dividerStart=0;
    unsigned dividerInitial=0;
    std::uint64_t formRevision=0;
    bool sourceMode=false,updating=false,sourceChanged=false,acceptance=false,waiting=false;
    enum Command {OpenProject=100,NewProject,Save,CloseDocument,Undo,Redo,Detach,ToggleSource,AddNode,Up,Search,Assets,Tabs,Source,Palette,Views,Status,NewAsset,AddActor,AddComponent,DeleteActor,FocusActor,AddWidget,ResetLayout,WideInspector,WideBrowser,Recovery,AddVariable,AddFunction,AddMacro,ImportAsset,DuplicateActor,CheckBuild,BuildGame,RunBuild,CancelBuild,PreviewAsset,DetachContent,ShowConsole,PlayScene,StopPlay,EditBuildProfile,AddSequenceTrack,PinDocument,NewFolder,CopyBuildProfile,DeleteBuildProfile,RecentBase=200};
    struct DocumentWindow {
        HWND editor=nullptr,save=nullptr,toggle=nullptr,viewPicker=nullptr,palette=nullptr,status=nullptr;
        std::unique_ptr<EditorGraphPanel> graph;
        Json doc,model;
        std::string view="event";
        bool updating=false,draft=false,source=false;
    };
    std::map<HWND,DocumentWindow> documentWindows;
    std::shared_ptr<EditorD3D12Surface::Graphics> graphics;
    enum DocumentControl {DocSource=1,DocSave=2,DocToggle=3,DocView=4,DocPalette=5,DocAdd=6,DocReload=7};
    HMENU recentMenu=nullptr;

    static std::wstring controlText(HWND control){
        const int n=GetWindowTextLengthW(control);std::wstring value(n+1,0);
        GetWindowTextW(control,value.data(),n+1);value.resize(n);return value;
    }
    void startWorker(const fs::path& node,const fs::path& script,const fs::path& profile){
        SECURITY_ATTRIBUTES inheritable{sizeof(inheritable),nullptr,TRUE};
        HANDLE readInput=nullptr,writeOutput=nullptr,log=nullptr;
        PROCESS_INFORMATION process{};
        const auto release=[&](){for(auto handle:{readInput,writeOutput,log,process.hThread,process.hProcess})if(handle&&handle!=INVALID_HANDLE_VALUE)CloseHandle(handle);};
        try{
            if(!CreatePipe(&readInput,&childInput,&inheritable,0)||!CreatePipe(&childOutput,&writeOutput,&inheritable,0))throw std::runtime_error("Native editor pipes");
            if(!SetHandleInformation(childInput,HANDLE_FLAG_INHERIT,0)||!SetHandleInformation(childOutput,HANDLE_FLAG_INHERIT,0))throw std::runtime_error("Native editor pipe handles");
            log=CreateFileW((profile/L"Sessions"/(std::to_wstring(GetCurrentProcessId())+L"-native.log")).c_str(),GENERIC_WRITE,FILE_SHARE_READ,&inheritable,CREATE_ALWAYS,FILE_ATTRIBUTE_NORMAL,nullptr);
            if(log==INVALID_HANDLE_VALUE)throw std::runtime_error("Native editor log");
            STARTUPINFOW startup{sizeof(startup)};startup.dwFlags=STARTF_USESTDHANDLES;startup.hStdInput=readInput;startup.hStdOutput=writeOutput;startup.hStdError=log;
            job=CreateJobObjectW(nullptr,nullptr);JOBOBJECT_EXTENDED_LIMIT_INFORMATION limits{};
            limits.BasicLimitInformation.LimitFlags=JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
            if(!job||!SetInformationJobObject(job,JobObjectExtendedLimitInformation,&limits,sizeof(limits)))throw std::runtime_error("Native editor job");
            auto command=quote(node.wstring())+L" "+quote(script.wstring());
            if(!CreateProcessW(node.c_str(),command.data(),nullptr,nullptr,TRUE,CREATE_NO_WINDOW|CREATE_SUSPENDED,nullptr,script.parent_path().c_str(),&startup,&process))throw std::runtime_error("Native editor worker");
            if(!AssignProcessToJobObject(job,process.hProcess)||ResumeThread(process.hThread)==DWORD(-1)){TerminateProcess(process.hProcess,1);throw std::runtime_error("Native editor process ownership");}
        }catch(...){release();throw;}
        release();
    }
    void send(const Json& packet){
        auto message=packet.dump()+"\n";
        for(std::size_t at=0;at<message.size();){
            DWORD bytes=0;
            if(!WriteFile(childInput,message.data()+at,DWORD(std::min<std::size_t>(message.size()-at,65536)),&bytes,nullptr)||!bytes)throw std::runtime_error("편집기 서비스가 종료됐어요.");
            at+=bytes;
        }
    }
    Json request(const char* method,Json params=Json::object()){
        if(waiting)throw std::runtime_error("편집기 작업이 실행 중이에요.");
        waiting=true;
        struct Reset {bool& flag;~Reset(){flag=false;}} reset{waiting};
        send({{"method",method},{"params",std::move(params)}});
        for(;;){
            auto end=buffered.find('\n');
            while(end==std::string::npos){
                char data[32768];DWORD bytes=0;
                if(!ReadFile(childOutput,data,sizeof(data),&bytes,nullptr)||!bytes)throw std::runtime_error("편집기 서비스 응답을 읽지 못했어요.");
                const auto old=buffered.size();buffered.append(data,bytes);end=buffered.find('\n',old);
            }
            const auto reply=Json::parse(buffered.substr(0,end));
            buffered.erase(0,end+1);
            if(reply.value("channel",std::string())=="hb.render"){
                Json result={{"channel","hb.render"},{"id",reply.at("id")},{"surface",reply.at("surface")},{"ok",true}};
                try{
                    const auto surface=reply.at("surface").get<std::string>();
                    if(surface=="native-editor")result["value"]=viewport.render(reply,acceptance);
                    else if(surface=="native-preview")result["value"]=previewViewport.render(reply,acceptance);
                    else throw std::runtime_error("Native editor render surface");
                }
                catch(const std::exception& error){result["ok"]=false;result["error"]=error.what();}
                send(result);continue;
            }
            if(!reply.at("ok").get<bool>())throw std::runtime_error(reply.at("error").get<std::string>());
            return reply.at("value");
        }
    }
    HWND control(const wchar_t* type,const wchar_t* title,DWORD style,Command id){
        const auto result=CreateWindowExW(0,type,title,WS_CHILD|WS_VISIBLE|style,0,0,1,1,window,HMENU(INT_PTR(id)),instance,nullptr);
        if(!result)throw std::runtime_error("Native editor control");
        SendMessageW(result,WM_SETFONT,WPARAM(font),TRUE);return result;
    }
    void makeControls(){
        INITCOMMONCONTROLSEX controls{sizeof(controls),ICC_TAB_CLASSES|ICC_LISTVIEW_CLASSES};InitCommonControlsEx(&controls);
        font=CreateFontW(-16,0,0,0,FW_NORMAL,FALSE,FALSE,FALSE,DEFAULT_CHARSET,0,0,CLEARTYPE_QUALITY,0,L"Segoe UI");
        search=control(L"EDIT",L"",WS_BORDER|ES_AUTOHSCROLL,Search);SendMessageW(search,EM_SETCUEBANNER,TRUE,LPARAM(L"에셋 검색"));
        files=control(WC_LISTVIEWW,L"",WS_BORDER|LVS_REPORT|LVS_OWNERDATA|LVS_SINGLESEL|LVS_NOCOLUMNHEADER|LVS_SHOWSELALWAYS,Assets);
        SendMessageW(files,CCM_SETUNICODEFORMAT,TRUE,0);
        LVCOLUMNW column{};column.mask=LVCF_WIDTH;column.cx=240;ListView_InsertColumn(files,0,&column);
        tabs=control(WC_TABCONTROLW,L"",WS_CLIPSIBLINGS,Tabs);
        source=control(L"EDIT",L"",WS_BORDER|WS_VSCROLL|WS_HSCROLL|ES_MULTILINE|ES_WANTRETURN|ES_AUTOVSCROLL|ES_AUTOHSCROLL,Source);
        SendMessageW(source,EM_SETLIMITTEXT,0,0);
        palette=control(L"COMBOBOX",L"",CBS_DROPDOWNLIST|WS_VSCROLL,Palette);
        views=control(L"COMBOBOX",L"",CBS_DROPDOWNLIST|WS_VSCROLL,Views);
        status=control(L"STATIC",L"프로젝트를 열거나 새 프로젝트를 만드세요.",SS_LEFT,Status);
        graph.attach(window,instance,[this](const Json& event){
            try{
                if(event.at("event")=="edit")editGraph(event);
                if(event.at("event")=="comment"&&document.value("kind",std::string())=="blueprint"){
                    auto input=event;input["action"]="comment";editGraph(input);
                }
                if(event.at("event")=="select"){
                    const auto id=event.at("id").get<std::string>();
                    if(graphSelection!=id&&gameplayGraphOpen())fieldPath=Json::array();
                    graphSelection=id;refreshGraphInputs();layout();queuePreview();
                }
                if(event.at("event")=="graphicsError")SetWindowTextW(status,wide(event.at("message")).c_str());
                if(event.at("event")=="key"&&event.value("ctrl",false)){
                    const auto key=event.value("key",std::string());
                    if(key=="s")perform(Save);else if(key=="z")perform(Undo);else if(key=="y")perform(Redo);
                }
            }catch(const std::exception& error){report(error);refreshGraph();}
        });
        form.attach(window,instance,[this](const Json& event){
            try{
                const auto action=event.at("event").get<std::string>();
                if(action=="graphicsError"){SetWindowTextW(status,wide(event.at("message")).c_str());return;}
                if(action=="key"&&event.value("ctrl",false)){
                    const auto key=event.value("key",std::string());
                    if(key=="s")perform(Save);else if(key=="z")perform(Undo);else if(key=="y")perform(Redo);
                    return;
                }
                if(action!="click"&&action!="change")return;
                if(event.at("revision")!=formRevision)return;
                const int i=event.at("i");
                if(document.value("graph",false)&&!gameplayGraphOpen()){
                    const auto& input=graphInputs.at(i);
                    Json value=event.contains("checked")?event.at("checked"):event.at("value");
                    if(value.is_string()&&!input.at("value").is_string())value=Json::parse(value.get<std::string>());
                    editGraph({{"action","input"},{"id",graphSelection},{"pin",input.at("id")},{"value",std::move(value)}});
                    return;
                }
                if(i==int(fields.size())){if(!fieldPath.empty())fieldPath.erase(fieldPath.end()-1);refreshForm();layout();return;}
                const auto key=fields.at(i).at("key");
                if(action=="click"){fieldPath.push_back(key);refreshForm();layout();return;}
                Json parts=inspectedBase;
                for(const auto& part:fieldPath)parts.push_back(part);
                showDocument(request("asset.fieldEdit",{{"parts",parts},{"key",key},{"value",event.contains("checked")?event.at("checked"):event.at("value")},{"expectedRevision",document.at("revision")}}));
            }catch(const std::exception& error){report(error);}
        },"asset");
        graphics=std::make_shared<EditorD3D12Surface::Graphics>();
        graph.useD3D12(graphics);form.useD3D12(graphics);
        hierarchy.attach(window,instance,[this](const Json& event){
            try{
                const auto action=event.at("event").get<std::string>();
                if(action=="graphicsError"){SetWindowTextW(status,wide(event.at("message")).c_str());return;}
                if(action=="fold"){
                    const auto id=event.at("id").get<std::string>();
                    if(!folded.erase(id))folded.insert(id);
                    refreshHierarchy();return;
                }
                if(action=="select"||action=="clear"){
                    selectActor(event.value("id",std::string()));queueViewport();return;
                }
                if(action=="visible"||action=="lock"||action=="reparent"){editScene(event);return;}
                if(action=="key"){
                    const auto key=event.value("key",std::string());
                    if(key=="Delete")perform(DeleteActor);
                    if(key=="f")perform(FocusActor);
                }
            }catch(const std::exception& error){report(error);}
        });
        hierarchy.useD3D12(graphics);
        console.attach(window,instance,[](const Json&){},"console");
        console.useD3D12(graphics);
        console.update({{"view","log"}});
        viewport.attach(window,instance,[this](Json value){queueViewport(std::move(value));});
        previewViewport.attach(window,instance,[this](Json value){previewInput=std::move(value);queuePreview();});
        assetCanvas.attach(window,instance,[this](const Json& event){
            try{
                const auto action=event.at("event").get<std::string>();
                if(action=="graphicsError"){SetWindowTextW(status,wide(event.at("message")).c_str());return;}
                if(action=="select"&&widgetOpen()){
                    widgetSelection=event.at("id").get<std::string>();fieldPath=Json::array();refreshForm();return;
                }
                if(action=="timelineSelect"&&timelineOpen()){
                    timelineTrack=event.at("track");timelineItem=event.at("id");
                    fieldPath=Json::array();refreshForm();return;
                }
                if(action=="sample"){
                    const auto values=request("timeline.sample",{{"time",event.at("time")}});
                    std::string text;
                    for(const auto& row:values)if(row.contains("value"))text+=row.at("id").get<std::string>()+" "+row.at("value").dump()+"   ";
                    SetWindowTextW(status,wide(text).c_str());return;
                }
                if(action=="edit"){
                    auto input=event;
                    if(widgetOpen()){
                        if(!widgetPreview.is_null())for(const auto& row:widgetPreview.at("rows"))if(row.at("id")==widgetSelection){
                            const double scale=row.value("scale",1.0);
                            if(scale>0&&input.contains("dx")){input["dx"]=input.at("dx").get<double>()/scale;input["dy"]=input.at("dy").get<double>()/scale;}
                            break;
                        }
                        editWidget(input);
                    }else{
                        const auto edit=input.value("action",std::string()),type=input.value("type",std::string());
                        if((edit=="add"&&type=="event")||(edit=="clipAdd"&&(type=="sections"||type=="notifies"||type=="notify-state-add"))){
                            const auto name=inputName(type=="sections"?L"구간 이름":L"이벤트 이름",{},80);
                            if(name.empty())return;
                            input["value"]=utf8(name);
                        }else if(edit=="clipAdd"){
                            const auto asset=chooseTimelineAsset(type=="audio");
                            if(asset.empty())return;
                            input["asset"]=asset;
                            if(type=="slot"){
                                const auto slot=inputName(L"몽타주 슬롯 이름",wide(input.at("track")).substr(5),80);
                                if(slot.empty())return;
                                input["slot"]=utf8(slot);
                            }
                        }
                        input["expectedRevision"]=document.at("revision");showDocument(request("timeline.edit",input));
                    }
                    return;
                }
                if(action=="key"&&event.value("ctrl",false)){
                    const auto key=event.value("key",std::string());
                    if(key=="s")perform(Save);else if(key=="z")perform(Undo);else if(key=="y")perform(Redo);
                }
            }catch(const std::exception& error){report(error);}
        });
        assetCanvas.useD3D12(graphics);
        const HMENU main=CreateMenu(),file=CreatePopupMenu(),edit=CreatePopupMenu(),viewMenu=CreatePopupMenu(),sceneMenu=CreatePopupMenu(),buildMenu=CreatePopupMenu();
        AppendMenuW(file,MF_STRING,OpenProject,L"프로젝트 열기\tCtrl+O");
        AppendMenuW(file,MF_STRING,NewProject,L"새 프로젝트");
        recentMenu=CreatePopupMenu();
        AppendMenuW(file,MF_POPUP,UINT_PTR(recentMenu),L"최근 프로젝트");
        AppendMenuW(file,MF_SEPARATOR,0,nullptr);
        AppendMenuW(file,MF_STRING,NewAsset,L"새 에셋");
        AppendMenuW(file,MF_STRING,NewFolder,L"새 폴더");
        AppendMenuW(file,MF_STRING,ImportAsset,L"에셋 가져오기");
        AppendMenuW(file,MF_STRING,Save,L"문서 저장\tCtrl+S");
        AppendMenuW(file,MF_STRING,CloseDocument,L"문서 닫기\tCtrl+W");
        AppendMenuW(file,MF_STRING,Recovery,L"저장 충돌 복구");
        AppendMenuW(edit,MF_STRING,Undo,L"되돌리기\tCtrl+Z");
        AppendMenuW(edit,MF_STRING,Redo,L"다시 적용\tCtrl+Y");
        AppendMenuW(edit,MF_STRING,AddNode,L"선택한 종류의 노드 추가");
        AppendMenuW(edit,MF_STRING,AddVariable,L"블루프린트 변수 추가");
        AppendMenuW(edit,MF_STRING,AddFunction,L"블루프린트 함수 추가");
        AppendMenuW(edit,MF_STRING,AddMacro,L"블루프린트 매크로 추가");
        AppendMenuW(edit,MF_STRING,AddWidget,L"위젯 요소 추가");
        AppendMenuW(edit,MF_STRING,AddSequenceTrack,L"시퀀스 트랙 추가");
        AppendMenuW(viewMenu,MF_STRING,Detach,L"문서 창 분리 / 합치기");
        AppendMenuW(viewMenu,MF_STRING,PinDocument,L"문서를 독립 창에 열기");
        AppendMenuW(viewMenu,MF_STRING,DetachContent,L"콘텐츠 브라우저 분리 / 합치기");
        AppendMenuW(viewMenu,MF_STRING,ShowConsole,L"출력 로그 표시 / 숨기기");
        AppendMenuW(viewMenu,MF_STRING,ToggleSource,L"편집 화면 / 소스 전환");
        AppendMenuW(viewMenu,MF_STRING,Up,L"상위 폴더\tAlt+↑");
        AppendMenuW(viewMenu,MF_STRING,WideBrowser,L"콘텐츠 브라우저 너비 변경");
        AppendMenuW(viewMenu,MF_STRING,WideInspector,L"속성 패널 너비 변경");
        AppendMenuW(viewMenu,MF_STRING,ResetLayout,L"기본 배치 복원");
        AppendMenuW(viewMenu,MF_STRING,PreviewAsset,L"에셋 3D 미리보기");
        AppendMenuW(sceneMenu,MF_STRING,AddActor,L"오브젝트 추가");
        AppendMenuW(sceneMenu,MF_STRING,AddComponent,L"컴포넌트 추가");
        AppendMenuW(sceneMenu,MF_STRING,DeleteActor,L"선택 오브젝트 삭제");
        AppendMenuW(sceneMenu,MF_STRING,DuplicateActor,L"선택 오브젝트 복제");
        AppendMenuW(sceneMenu,MF_STRING,FocusActor,L"선택 오브젝트에 초점\tF");
        AppendMenuW(sceneMenu,MF_SEPARATOR,0,nullptr);
        AppendMenuW(sceneMenu,MF_STRING,PlayScene,L"플레이\tF5");
        AppendMenuW(sceneMenu,MF_STRING,StopPlay,L"플레이 중지\tShift+F5");
        AppendMenuW(buildMenu,MF_STRING,CheckBuild,L"빌드 검사");
        AppendMenuW(buildMenu,MF_STRING,EditBuildProfile,L"빌드 프로필 설정");
        AppendMenuW(buildMenu,MF_STRING,CopyBuildProfile,L"빌드 프로필 복제");
        AppendMenuW(buildMenu,MF_STRING,DeleteBuildProfile,L"빌드 프로필 삭제");
        AppendMenuW(buildMenu,MF_STRING,BuildGame,L"패키징");
        AppendMenuW(buildMenu,MF_STRING,RunBuild,L"마지막 Windows 빌드 실행");
        AppendMenuW(buildMenu,MF_STRING,CancelBuild,L"현재 빌드 취소");
        AppendMenuW(main,MF_POPUP,UINT_PTR(file),L"파일");AppendMenuW(main,MF_POPUP,UINT_PTR(edit),L"편집");AppendMenuW(main,MF_POPUP,UINT_PTR(sceneMenu),L"장면");AppendMenuW(main,MF_POPUP,UINT_PTR(viewMenu),L"보기");AppendMenuW(main,MF_POPUP,UINT_PTR(buildMenu),L"빌드");SetMenu(window,main);
    }
    void refreshRecent(){
        recent=request("project.recent");
        while(GetMenuItemCount(recentMenu)>0)DeleteMenu(recentMenu,0,MF_BYPOSITION);
        if(recent.empty())AppendMenuW(recentMenu,MF_STRING|MF_GRAYED,0,L"최근 프로젝트 없음");
        for(std::size_t i=0;i<recent.size();++i){
            const auto name=wide(recent.at(i).at("name"));
            AppendMenuW(recentMenu,MF_STRING,RecentBase+i,name.c_str());
        }
    }
    void report(const std::exception& error){
        statusText(wide(error.what()).c_str());
        if(!acceptance)MessageBoxW(window,wide(error.what()).c_str(),L"HBEngine",MB_OK|MB_ICONWARNING);
    }
    void statusText(const wchar_t* text){
        SetWindowTextW(status,text);UpdateWindow(status);
        const auto message=utf8(text);
        if(message.empty()||(!logItems.empty()&&logItems.back().at("name")==message))return;
        if(logItems.size()>=300)logItems.erase(logItems.begin());
        logItems.push_back({{"name",message}});
        if(consoleVisible)console.update({{"items",logItems},{"revision",++logRevision}});
    }
    void layout(){
        if(!source)return;
        RECT rect{};GetClientRect(window,&rect);
        const int width=rect.right,height=rect.bottom,left=contentWindow?0:std::clamp(int(width*browsePercent/100),150,460);
        RECT browser{};GetClientRect(contentWindow?contentWindow:window,&browser);
        const int browserWidth=contentWindow?int(browser.right):left;
        MoveWindow(search,5,5,std::max(1,browserWidth-10),27,TRUE);
        MoveWindow(files,5,36,std::max(1,browserWidth-10),std::max(1,int(browser.bottom)-(contentWindow?42:61)),TRUE);
        ListView_SetColumnWidth(files,0,std::max(1,browserWidth-31));
        MoveWindow(tabs,left,3,std::max(1,width-left-5),29,TRUE);
        MoveWindow(status,8,height-22,std::max(1,width-16),20,TRUE);
        const int logHeight=consoleVisible?std::min(185,std::max(0,height/3)):0;
        console.update({{"rect",{left+5,height-logHeight-24,std::max(1,width-left-11),logHeight}},{"visible",logHeight>0}});
        const HWND owner=detached?detached:window;
        RECT work{};GetClientRect(owner,&work);const int x=detached?5:left+5,y=detached?4:36,w=std::max(1,int(work.right)-x-6);
        const bool graphShown=document.value("graph",false)&&!sourceMode;
        const bool sceneShown=document.value("kind",std::string())=="scene"&&!sourceMode;
        const bool canvasShown=(timelineOpen()||widgetOpen())&&!sourceMode;
        const bool formShown=document.value("form",false)&&!sourceMode&&!sceneShown&&!canvasShown;
        const int top=graphShown||sceneShown?y+32:y,h=std::max(1,int(work.bottom)-top-(detached?6:25+logHeight));
        MoveWindow(views,x,y,std::min(230,w/2),220,TRUE);MoveWindow(palette,x+std::min(235,w/2),y,std::max(1,w-std::min(235,w/2)),300,TRUE);
        ShowWindow(views,(graphShown&&!model.value("views",Json::array()).empty())||sceneShown?SW_SHOW:SW_HIDE);
        ShowWindow(palette,graphShown?SW_SHOW:SW_HIDE);
        MoveWindow(source,x,top,w,h,TRUE);
        ShowWindow(source,document.contains("path")&&!graphShown&&!formShown&&!sceneShown&&!canvasShown?SW_SHOW:SW_HIDE);
        const int inspectorWidth=graphShown&&w>=640?240:0;
        const bool previewShown=previewOpen&&canPreview()&&!sourceMode;
        const int previewHeight=previewShown&&graphShown?std::max(1,h/3):0;
        graph.layout(x,top,w-inspectorWidth,h-previewHeight,graphShown);
        const int side=sceneShown?std::min(std::clamp(int(w*inspectorPercent/100),190,420),std::max(0,w-160)):0;
        const int split=std::max(1,h*40/100);
        hierarchy.reparent(owner);
        hierarchy.update({{"rect",{x+w-side+3,top,std::max(1,side-3),split}},{"visible",sceneShown&&side>0}});
        viewport.layout(owner,x,top,std::max(1,w-side-3),h,sceneShown);
        if(sceneShown)queueViewport();
        const int assetSide=canvasShown?std::min(std::clamp(int(w*inspectorPercent/100),190,420),std::max(0,w-160)):0;
        if(sceneShown)form.update({{"rect",{x+w-side+3,top+split,std::max(1,side-3),h-split}},{"visible",side>0}});
        else if(canvasShown)form.update({{"rect",{x+w-assetSide+3,top,std::max(1,assetSide-3),h}},{"visible",assetSide>0}});
        else if(graphShown)form.update({{"rect",{x+w-inspectorWidth,top,inspectorWidth,h}},{"visible",inspectorWidth>0}});
        else if(previewShown)form.update({{"rect",{x+std::max(1,w/2),top,w-w/2,h}},{"visible",true}});
        else form.update({{"rect",{x,top,w,h}},{"visible",formShown}});
        assetCanvas.layout(x,top,std::max(1,w-assetSide-3),h,canvasShown);
        if(widgetOpen()&&canvasShown)SetTimer(window,3,100,nullptr);
        previewViewport.layout(owner,x,top+(graphShown?h-previewHeight:0),graphShown?std::max(1,w-inspectorWidth):std::max(1,w/2),graphShown?previewHeight:h,previewShown);
        if(previewShown)queuePreview();
    }
    Divider dividerAt(HWND owner,int x,int y)const{
        RECT rect{};GetClientRect(owner,&rect);
        if(owner==window&&!contentWindow&&y>=32){
            const int edge=std::clamp(int(rect.right*browsePercent/100),150,460);
            if(std::abs(edge-x)<=4)return Divider::Browser;
        }
        if(owner!=(detached?detached:window)||sourceMode||!(sceneOpen()||timelineOpen()||widgetOpen()))return Divider::None;
        const int left=detached||contentWindow?5:std::clamp(int(rect.right*browsePercent/100),150,460)+5;
        const int width=std::max(1,int(rect.right)-left-6),side=std::min(std::clamp(int(width*inspectorPercent/100),190,420),std::max(0,width-160));
        return side>0&&y>=(detached?4:36)&&std::abs(rect.right-6-side-x)<=3?Divider::Inspector:Divider::None;
    }
    bool moveDivider(HWND owner,UINT message,LPARAM l){
        const int x=short(LOWORD(l)),y=short(HIWORD(l));
        if(message==WM_LBUTTONDOWN){
            divider=dividerAt(owner,x,y);
            if(divider==Divider::None)return false;
            dividerOwner=owner;dividerStart=x;dividerInitial=divider==Divider::Browser?browsePercent:inspectorPercent;
            SetCapture(owner);SetCursor(LoadCursorW(nullptr,IDC_SIZEWE));return true;
        }
        if(dividerOwner!=owner)return false;
        if(message==WM_CAPTURECHANGED){dividerOwner=nullptr;divider=Divider::None;return true;}
        if(message==WM_LBUTTONUP){ReleaseCapture();return true;}
        if(message!=WM_MOUSEMOVE)return false;
        RECT rect{};GetClientRect(owner,&rect);
        const int direction=divider==Divider::Browser?1:-1;
        const int left=owner==window&&!contentWindow?std::clamp(int(rect.right*browsePercent/100),150,460)+5:5;
        const int width=std::max(1,int(rect.right)-(divider==Divider::Browser?0:left+6));
        const int next=int(dividerInitial)+direction*(x-dividerStart)*100/width;
        auto& size=divider==Divider::Browser?browsePercent:inspectorPercent;
        const auto clamped=unsigned(std::clamp(next,18,divider==Divider::Browser?40:42));
        if(size!=clamped){size=clamped;layout();}
        return true;
    }
    void refreshFiles(){
        if(projectTitle.empty())return;
        entries=request("content.list",{{"folder",folder},{"query",utf8(controlText(search))}}).at("entries");
        ListView_SetItemCountEx(files,int(entries.size()),LVSICF_NOINVALIDATEALL);
        InvalidateRect(files,nullptr,FALSE);
    }
    void refreshGraph(const Json& updated=Json()){
        if(!document.value("graph",false))return;
        if(updated.is_null()){
            try{model=request("graph.read",{{"view",view}});}
            catch(const std::exception&){
                if(view=="event")throw;
                view="event";graphSelection.clear();graph.resetView();model=request("graph.read",{{"view",view}});
            }
        }else model=updated;
        graph.update(model);
        const auto previous=SendMessageW(palette,CB_GETCURSEL,0,0);
        SendMessageW(palette,CB_RESETCONTENT,0,0);
        for(const auto& entry:model.at("palette"))SendMessageW(palette,CB_ADDSTRING,0,LPARAM(wide(entry.at("title")).c_str()));
        SendMessageW(palette,CB_SETCURSEL,std::max<LRESULT>(0,previous),0);
        SendMessageW(views,CB_RESETCONTENT,0,0);
        int index=0;
        for(const auto& row:model.at("views")){
            SendMessageW(views,CB_ADDSTRING,0,LPARAM(wide(row.at(1)).c_str()));
            if(row.at(0)==view)SendMessageW(views,CB_SETCURSEL,index,0);
            ++index;
        }
        if(!graphSelection.empty()&&std::none_of(model.at("nodes").begin(),model.at("nodes").end(),[this](const Json& row){return row.at("id")==graphSelection;}))graphSelection.clear();
        refreshGraphInputs();
    }
    void refreshGraphInputs(){
        if(gameplayGraphOpen()){refreshForm();return;}
        if(graphSelection.empty()){
            graphInputs=Json::array();
            form.update({{"rows",Json::array({{{"kind","message"},{"text","노드를 선택하면 입력을 편집할 수 있어요."}}})},{"revision",++formRevision}});
            return;
        }
        graphInputs=request("graph.inputs",{{"view",view},{"id",graphSelection}});
        Json rows=Json::array({{{"kind","heading"},{"text","노드 입력"}}});
        for(std::size_t i=0;i<graphInputs.size();++i){
            const auto& input=graphInputs.at(i);const auto& value=input.at("value");
            Json control={{"i",i},{"disabled",input.at("linked")}};
            if(value.is_boolean()){control["kind"]="checkbox";control["checked"]=value;}
            else{control["kind"]="text";control["value"]=value.is_string()?value.get<std::string>():value.dump();}
            rows.push_back({{"label",input.at("label")},{"controls",Json::array({std::move(control)})}});
        }
        form.update({{"rows",rows},{"revision",++formRevision}});
    }
    bool sceneOpen()const{return document.value("kind",std::string())=="scene";}
    bool gameplayGraphOpen()const{
        const auto kind=document.value("kind",std::string());return kind=="behaviortree"||kind=="statemachine"||kind=="animgraph";
    }
    bool canPreview()const{return !gameplayGraphOpen()&&(document.value("graph",false)||document.value("kind",std::string())=="materialinstance");}
    void queuePreview(){if(previewOpen&&canPreview()&&!sourceMode)SetTimer(window,5,35,nullptr);}
    Json drawPreview(Json input=Json::object()){
        const auto size=previewViewport.size();
        if(size.cx<=0||size.cy<=0)return Json::object();
        input["width"]=std::min<LONG>(4096,size.cx);input["height"]=std::min<LONG>(4096,size.cy);input["node"]=graphSelection;
        const auto result=request("asset.preview",input);
        const auto prep=result.value("shaderPreparation",Json::object());
        if(prep.value("pending",false))SetTimer(window,5,120,nullptr);
        if(!result.at("warnings").empty())SetWindowTextW(status,wide(result.at("warnings").front()).c_str());
        return result;
    }
    bool widgetOpen()const{return document.value("kind",std::string())=="widget";}
    bool timelineOpen()const{
        const auto kind=document.value("kind",std::string());return kind=="animation"||kind=="curve"||kind=="sequenceasset"||kind=="montage";
    }
    void refreshWidget(){
        if(!widgetOpen()||sourceMode)return;
        const auto revision=document.at("revision").get<std::string>();
        if(widgetPreview.is_null()||widgetRevision!=revision){
            const auto data=Json::parse(document.at("text").get<std::string>());
            const auto size=data.at("referenceSize").get<std::array<double,2>>();
            const double scale=std::min(1.,960./std::max(size[0],size[1]));
            auto preview=request("widget.preview",{{"width",std::max(1,int(std::lround(size[0]*scale)))},{"height",std::max(1,int(std::lround(size[1]*scale)))}});
            const auto count=std::size_t(preview.at("width").get<int>())*preview.at("height").get<int>()*4;
            auto encoded=std::move(preview.at("pixels").get_ref<std::string&>());
            static constexpr std::string_view alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
            std::vector<unsigned char> bytes;bytes.reserve(count);
            unsigned bits=0,value=0;
            for(char c:encoded){
                if(c=='=')break;
                const auto digit=alphabet.find(c);if(digit==std::string_view::npos)throw std::runtime_error("Native widget pixel encoding");
                value=(value<<6)|unsigned(digit);bits+=6;
                if(bits>=8){bits-=8;bytes.push_back(static_cast<unsigned char>(value>>bits));}
            }
            if(bytes.size()!=count)throw std::runtime_error("Native widget pixel size");
            preview.erase("pixels");widgetPreview=std::move(preview);
            assetCanvas.updateWidget(widgetPreview,std::move(bytes),widgetSelection);
            widgetRevision=revision;
        }
    }
    void editWidget(Json input){
        input["expectedRevision"]=document.at("revision");
        auto changed=request("widget.edit",input);
        const auto selection=changed.value("selection",std::string());
        if(widgetSelection!=selection)fieldPath=Json::array();
        widgetSelection=selection;showDocument(std::move(changed));
    }
    void refreshHierarchy(){
        Json rows=Json::array();
        std::unordered_map<std::string,std::vector<std::size_t>> children;
        for(std::size_t i=0;i<sceneRows.size();++i)children[sceneRows.at(i).value("parent",std::string())].push_back(i);
        std::vector<std::pair<std::size_t,int>> stack;
        const auto push=[&](const std::vector<std::size_t>& siblings,int depth){for(auto it=siblings.rbegin();it!=siblings.rend();++it)stack.emplace_back(*it,depth);};
        push(children[""],0);
        while(!stack.empty()){
            const auto [i,depth]=stack.back();stack.pop_back();
            const auto& actor=sceneRows.at(i);const auto id=actor.at("id").get<std::string>();
            const auto branch=children.find(id);const bool hasChildren=branch!=children.end(),closed=folded.count(id)>0;
            rows.push_back({{"id",id},{"name",actor.at("name")},{"icon",actor.at("kind")},{"depth",depth},{"children",hasChildren},{"collapsed",closed},
                {"selected",id==sceneSelection},{"visible",actor.value("visible",true)},{"locked",actor.value("locked",false)}});
            if(hasChildren&&!closed)push(branch->second,depth+1);
        }
        hierarchy.update({{"rows",rows},{"reveal",sceneSelection}});
    }
    void refreshScene(){
        if(!sceneOpen())return;
        sceneRows=request("scene.hierarchy");
        cameraRows=Json::array({""});
        SendMessageW(views,CB_RESETCONTENT,0,0);
        SendMessageW(views,CB_ADDSTRING,0,LPARAM(L"편집기 카메라"));
        int active=0;bool found=false;
        for(const auto& actor:sceneRows){
            if(actor.at("id")==sceneSelection)found=true;
            if(!actor.value("camera",false))continue;
            if(actor.at("id")==cameraId)active=int(cameraRows.size());
            cameraRows.push_back(actor.at("id"));
            SendMessageW(views,CB_ADDSTRING,0,LPARAM(wide(actor.at("name")).c_str()));
        }
        if(!active)cameraId.clear();
        if(!found&&!sceneSelection.empty()){sceneSelection.clear();fieldPath=Json::array();}
        SendMessageW(views,CB_SETCURSEL,active,0);refreshHierarchy();
    }
    void selectActor(const std::string& id){
        if(!sceneOpen())return;
        if(sceneSelection!=id)fieldPath=Json::array();
        sceneSelection=id;refreshHierarchy();refreshForm();
    }
    void queueViewport(Json input=Json::object()){
        if(!sceneOpen()||sourceMode)return;
        if(!input.empty()){
            const auto action=input.value("command",std::string());
            if(action=="focus")input["id"]=sceneSelection;
            if(cameraInput.is_object()&&cameraInput.value("command",std::string())==action&&(action=="orbit"||action=="pan"||action=="zoom")){
                input["dx"]=input.value("dx",0.0)+cameraInput.value("dx",0.0);
                input["dy"]=input.value("dy",0.0)+cameraInput.value("dy",0.0);
            }
            cameraInput=std::move(input);
        }
        SetTimer(window,2,16,nullptr);
    }
    Json drawViewport(Json input=Json::object()){
        const auto size=viewport.size();
        if(size.cx<=0||size.cy<=0)return Json::object();
        input["width"]=size.cx;input["height"]=size.cy;input["selected"]=sceneSelection;input["cameraId"]=cameraId;
        auto state=request("scene.viewport",input);
        if(input.value("command",std::string())=="pick")selectActor(state.value("selection",std::string()));
        const auto prep=state.value("shaderPreparation",Json::object());
        const auto issue=prep.value("error",std::string());
        const bool preparing=prep.value("pending",false);
        if(preparing){viewportPreparing=true;SetTimer(window,2,120,nullptr);SetWindowTextW(status,L"Direct3D 12 장면 준비 중");}
        else{
            if(!issue.empty())statusText(wide(issue).c_str());
            else if(!state.at("warnings").empty())statusText(wide(state.at("warnings").front()).c_str());
            else if(viewportPreparing)SetWindowTextW(status,wide(document.value("path",std::string())).c_str());
            viewportPreparing=false;
        }
        return state;
    }
    void editScene(Json input){
        if(!sceneOpen())return;
        input["expectedRevision"]=document.at("revision");
        auto changed=request("scene.edit",input);
        const auto selection=changed.value("selection",std::string());
        if(sceneSelection!=selection)fieldPath=Json::array();
        sceneSelection=selection;
        showDocument(std::move(changed));
    }
    void refreshForm(){
        if(!document.value("form",false)&&!gameplayGraphOpen())return;
        Json base=Json::array();
        if(sceneOpen()&&!sceneSelection.empty()){
            for(std::size_t i=0;i<sceneRows.size();++i)if(sceneRows.at(i).at("id")==sceneSelection){
                base=Json::array({"objects",std::to_string(i)});break;
            }
        }
        if(widgetOpen()&&!widgetSelection.empty()){
            const auto nodes=request("widget.nodes");
            for(std::size_t i=0;i<nodes.size();++i)if(nodes.at(i).at("id")==widgetSelection){base=Json::array({"nodes",std::to_string(i)});break;}
        }
        if(gameplayGraphOpen()&&!graphSelection.empty())base=request("graph.inspectorPath",{{"id",graphSelection}});
        if(timelineOpen()&&!timelineItem.empty())base=request("timeline.inspectorPath",{{"track",timelineTrack},{"id",timelineItem}});
        const auto fetch=[&](){
            auto parts=base;
            for(const auto& key:fieldPath)parts.push_back(key);
            return request("asset.fields",{{"parts",parts}});
        };
        try{fields=fetch();}
        catch(const std::exception&){if(fieldPath.empty())throw;fieldPath=Json::array();fields=fetch();}
        Json rows=Json::array();
        if(!fieldPath.empty())rows.push_back({{"label",fieldPath.back()},{"controls",Json::array({{{"kind","button"},{"i",fields.size()},{"text","상위 속성"}}})}});
        for(std::size_t i=0;i<fields.size();++i){
            const auto& field=fields[i];auto control=field.at("control");control["i"]=i;
            if(field.at("key")=="id"||field.at("key")=="parent")control["disabled"]=true;
            rows.push_back({{"label",field.at("label")},{"controls",Json::array({std::move(control)})}});
        }
        inspectedBase=std::move(base);
        form.update({{"rows",rows},{"revision",++formRevision}});
    }
    static void displayText(HWND editor,const std::string& original){
        std::string displayed;displayed.reserve(original.size());
        for(std::size_t i=0;i<original.size();++i){
            if(original[i]=='\n'&&(i==0||original[i-1]!='\r'))displayed+='\r';
            displayed+=original[i];
        }
        SetWindowTextW(editor,wide(displayed).c_str());
    }
    static std::string editedText(HWND editor,const Json& doc){
        auto text=utf8(controlText(editor));
        if(doc.value("text",std::string()).find("\r\n")!=std::string::npos)return text;
        std::string normalized;normalized.reserve(text.size());
        for(std::size_t i=0;i<text.size();++i)
            if(text[i]!='\r'||i+1==text.size()||text[i+1]!='\n')normalized+=text[i];
        return normalized;
    }
    void refreshTabs(){
        TabCtrl_DeleteAllItems(tabs);
        int index=0;
        for(const auto& item:document.at("tabs")){
            auto title=fs::u8path(item.at("path").get<std::string>()).filename().wstring();
            if(item.at("dirty").get<bool>())title+=L" *";
            TCITEMW tab{};tab.mask=TCIF_TEXT;tab.pszText=title.data();
            TabCtrl_InsertItem(tabs,index,&tab);
            if(item.at("path")==document.value("path",std::string()))TabCtrl_SetCurSel(tabs,index);
            ++index;
        }
    }
    void showDocument(Json value){
        const auto previous=document.value("path",std::string());
        Json updatedGraph;
        if(value.contains("model")){updatedGraph=std::move(value.at("model"));value.erase("model");}
        document=std::move(value);updating=true;
        if(previous!=document.value("path",std::string())){view="event";sourceMode=false;graph.resetView();graphSelection.clear();fieldPath=Json::array();sceneSelection.clear();cameraId.clear();folded.clear();cameraInput=nullptr;viewportPreparing=false;widgetSelection.clear();widgetRevision.clear();widgetPreview=nullptr;timelineTrack.clear();timelineItem.clear();assetCanvas.resetTimeline();}
        displayText(source,document.value("text",std::string()));
        sourceChanged=false;
        refreshTabs();
        updating=false;refreshGraph(updatedGraph);refreshScene();refreshForm();layout();
        if(timelineOpen())assetCanvas.updateTimeline(request("timeline.read"));
        SetWindowTextW(status,wide(document.value("path",folder)).c_str());
    }
    void captureSource(){
        if(!sourceChanged)return;
        showDocument(request("document.replace",{{"text",editedText(source,document)},{"expectedRevision",document.at("revision")}}));
    }
    void editGraph(Json event){
        captureSource();
        event["view"]=view;event["expectedRevision"]=document.at("revision");
        showDocument(request("graph.edit",event));
    }
    void layoutDocumentWindow(HWND owner,DocumentWindow& item){
        RECT rect{};GetClientRect(owner,&rect);
        const int width=std::max(1L,rect.right),height=std::max(1L,rect.bottom);
        const bool graphShown=item.graph&&!item.source;
        MoveWindow(item.editor,5,70,std::max(1,width-10),std::max(1,height-98),TRUE);
        MoveWindow(item.status,5,height-23,std::max(1,width-10),20,TRUE);
        ShowWindow(item.editor,graphShown?SW_HIDE:SW_SHOWNOACTIVATE);
        ShowWindow(item.viewPicker,graphShown&&!item.model.value("views",Json::array()).empty()?SW_SHOWNOACTIVATE:SW_HIDE);
        ShowWindow(item.palette,graphShown?SW_SHOWNOACTIVATE:SW_HIDE);
        ShowWindow(GetDlgItem(owner,DocAdd),graphShown?SW_SHOWNOACTIVATE:SW_HIDE);
        if(item.graph)item.graph->layout(5,70,std::max(1,width-10),std::max(1,height-98),graphShown);
    }
    void refreshDocumentWindow(HWND owner,DocumentWindow& item,Json next){
        item.doc=std::move(next);
        item.updating=true;
        displayText(item.editor,item.doc.at("text"));
        item.updating=false;item.draft=false;
        if(item.graph){
            Json input={{"path",item.doc.at("path")},{"view",item.view}};
            try{item.model=request("graph.read",input);}
            catch(const std::exception&){
                if(item.view=="event")throw;
                item.view="event";input["view"]=item.view;
                item.model=request("graph.read",input);item.graph->resetView();
            }
            item.graph->update(item.model);
            SendMessageW(item.viewPicker,CB_RESETCONTENT,0,0);
            int index=0;
            for(const auto& row:item.model.at("views")){
                SendMessageW(item.viewPicker,CB_ADDSTRING,0,LPARAM(wide(row.at(1)).c_str()));
                if(row.at(0)==item.view)SendMessageW(item.viewPicker,CB_SETCURSEL,index,0);
                ++index;
            }
            const auto selection=SendMessageW(item.palette,CB_GETCURSEL,0,0);
            SendMessageW(item.palette,CB_RESETCONTENT,0,0);
            for(const auto& row:item.model.at("palette"))SendMessageW(item.palette,CB_ADDSTRING,0,LPARAM(wide(row.at("title")).c_str()));
            const auto last=LRESULT(item.model.at("palette").size())-1;
            if(last>=0)SendMessageW(item.palette,CB_SETCURSEL,std::clamp<LRESULT>(selection,0,last),0);
        }
        SetWindowTextW(item.status,item.doc.value("dirty",false)?L"저장하지 않은 변경 사항":L"");
        layoutDocumentWindow(owner,item);
    }
    Json documentWindowTarget(const DocumentWindow& item)const{
        return {{"path",item.doc.at("path")},{"expectedRevision",item.doc.at("revision")}};
    }
    void commitDocumentWindowChange(HWND owner,DocumentWindow& item,Json changed){
        if(changed.at("path")==document.value("path",std::string()))showDocument(changed);
        else{
            document["tabs"]=changed.at("tabs");
            refreshTabs();
        }
        refreshDocumentWindow(owner,item,std::move(changed));
    }
    void captureDocumentWindow(HWND owner,DocumentWindow& item){
        if(!item.draft)return;
        if(item.doc.at("path")==document.value("path",std::string())&&sourceChanged)
            throw std::runtime_error("같은 문서를 편집하는 기본 창의 변경을 먼저 처리하세요.");
        auto input=documentWindowTarget(item);input["text"]=editedText(item.editor,item.doc);
        commitDocumentWindowChange(owner,item,request("document.replace",input));
    }
    void saveDocumentWindow(HWND owner,DocumentWindow& item){
        if(item.doc.at("path")==document.value("path",std::string())&&sourceChanged)
            throw std::runtime_error("같은 문서를 편집하는 기본 창의 변경을 먼저 처리하세요.");
        captureDocumentWindow(owner,item);
        commitDocumentWindowChange(owner,item,request("document.save",documentWindowTarget(item)));
        SetWindowTextW(item.status,L"저장했어요.");
    }
    void editWindowGraph(HWND owner,DocumentWindow& item,Json event){
        if(item.doc.at("path")==document.value("path",std::string())&&sourceChanged)
            throw std::runtime_error("같은 문서를 편집하는 기본 창의 변경을 먼저 처리하세요.");
        auto input=documentWindowTarget(item);input.update(event);input["view"]=item.view;
        commitDocumentWindowChange(owner,item,request("graph.edit",input));
    }
    void openDocumentWindow(){
        if(!document.contains("path"))return;
        captureSource();
        for(const auto& [owner,item]:documentWindows)if(item.doc.at("path")==document.at("path")){
            ShowWindow(owner,SW_RESTORE);return;
        }
        const auto title=fs::u8path(document.at("path").get<std::string>()).filename().wstring();
        const auto owner=CreateWindowExW(WS_EX_TOOLWINDOW,L"HBEngine.NativeAuthoring",title.c_str(),WS_OVERLAPPEDWINDOW|WS_CLIPCHILDREN,
            CW_USEDEFAULT,CW_USEDEFAULT,950,640,window,nullptr,instance,this);
        if(!owner)throw std::runtime_error("독립 문서 창을 열지 못했어요.");
        auto& item=documentWindows.try_emplace(owner).first->second;
        try{
            const auto make=[&](const wchar_t* type,const wchar_t* label,DWORD style,int id,int x,int y,int width,int height){
                const auto child=CreateWindowExW(0,type,label,WS_CHILD|WS_VISIBLE|style,x,y,width,height,owner,HMENU(INT_PTR(id)),instance,nullptr);
                if(!child)throw std::runtime_error("독립 문서의 컨트롤을 열지 못했어요.");
                SendMessageW(child,WM_SETFONT,WPARAM(font),TRUE);return child;
            };
            item.editor=make(L"EDIT",L"",WS_BORDER|WS_VSCROLL|WS_HSCROLL|ES_MULTILINE|ES_WANTRETURN|ES_AUTOVSCROLL|ES_AUTOHSCROLL,DocSource,0,0,1,1);
            SendMessageW(item.editor,EM_SETLIMITTEXT,0,0);
            item.save=make(L"BUTTON",L"저장",0,DocSave,5,5,70,26);
            item.toggle=make(L"BUTTON",L"그래프 / 소스",0,DocToggle,80,5,120,26);
            make(L"BUTTON",L"다시 읽기",0,DocReload,205,5,85,26);
            item.status=make(L"STATIC",L"",SS_LEFT,0,0,0,1,1);
            item.viewPicker=make(L"COMBOBOX",L"",CBS_DROPDOWNLIST|WS_VSCROLL,DocView,5,37,160,220);
            item.palette=make(L"COMBOBOX",L"",CBS_DROPDOWNLIST|WS_VSCROLL,DocPalette,170,37,250,300);
            make(L"BUTTON",L"노드 추가",0,DocAdd,425,37,100,26);
            if(document.value("graph",false)){
                item.graph=std::make_unique<EditorGraphPanel>();
                item.graph->attach(owner,instance,[this,owner](const Json& event){
                    auto& pane=documentWindows.at(owner);
                    try{
                        const auto action=event.at("event").get<std::string>();
                        if(action=="edit")editWindowGraph(owner,pane,event);
                        else if(action=="comment"&&pane.doc.at("kind")=="blueprint"){
                            auto input=event;input["action"]="comment";editWindowGraph(owner,pane,std::move(input));
                        }else if(action=="graphicsError")SetWindowTextW(pane.status,wide(event.at("message")).c_str());
                        else if(action=="key"&&event.value("ctrl",false)){
                            const auto key=event.at("key");
                            if(key=="s")saveDocumentWindow(owner,pane);
                            else if(key=="z"||key=="y")commitDocumentWindowChange(owner,pane,request(key=="z"?"editor.undo":"editor.redo",documentWindowTarget(pane)));
                        }
                    }catch(const std::exception& error){SetWindowTextW(pane.status,wide(std::string(error.what())).c_str());}
                });
                item.graph->useD3D12(graphics);item.view=view;
            }else ShowWindow(item.toggle,SW_HIDE);
            refreshDocumentWindow(owner,item,request("document.read",{{"path",document.at("path")}}));
            if(acceptance)SetWindowPos(owner,nullptr,-20000,-20000,0,0,SWP_NOSIZE|SWP_NOZORDER|SWP_NOACTIVATE|SWP_SHOWWINDOW);
            else ShowWindow(owner,SW_SHOW);
        }catch(...){destroyDocumentWindow(owner);throw;}
    }
    void destroyDocumentWindow(HWND owner){
        SetWindowLongPtrW(owner,GWLP_USERDATA,0);
        DestroyWindow(owner);
        documentWindows.erase(owner);
    }
    LRESULT documentWindowEvent(HWND owner,DocumentWindow& item,UINT message,WPARAM w,LPARAM l){
        if(message==WM_SIZE){if(item.editor)layoutDocumentWindow(owner,item);return 0;}
        if(message==WM_CLOSE){
            if(item.draft){
                const auto choice=MessageBoxW(owner,L"이 창에서 편집한 소스를 저장할까요?",L"HBEngine",MB_YESNOCANCEL|MB_ICONWARNING);
                if(choice==IDCANCEL)return 0;
                if(choice==IDYES)saveDocumentWindow(owner,item);
            }
            destroyDocumentWindow(owner);return 0;
        }
        if(message==WM_ACTIVATE&&LOWORD(w)!=WA_INACTIVE&&!item.draft&&!waiting&&!item.doc.is_null()){
            const auto latest=request("document.read",{{"path",item.doc.at("path")}});
            if(latest.at("revision")!=item.doc.at("revision")||latest.at("dirty")!=item.doc.at("dirty"))refreshDocumentWindow(owner,item,latest);
        }
        if(message==WM_COMMAND){
            const auto id=LOWORD(w),notification=HIWORD(w);
            if(id==DocSource&&notification==EN_CHANGE&&!item.updating){item.draft=true;SetWindowTextW(item.status,L"저장하지 않은 변경 사항");}
            else if(id==DocSave||id==Save)saveDocumentWindow(owner,item);
            else if(id==CloseDocument)PostMessageW(owner,WM_CLOSE,0,0);
            else if(id==DocToggle){captureDocumentWindow(owner,item);item.source=!item.source;layoutDocumentWindow(owner,item);}
            else if(id==DocReload&&(!item.draft||MessageBoxW(owner,L"이 창의 초안을 버리고 문서를 다시 읽을까요?",L"HBEngine",MB_YESNO|MB_ICONWARNING)==IDYES))
                refreshDocumentWindow(owner,item,request("document.read",{{"path",item.doc.at("path")}}));
            else if(id==DocView&&notification==CBN_SELCHANGE){
                const auto index=SendMessageW(item.viewPicker,CB_GETCURSEL,0,0);
                if(index>=0){
                    item.view=item.model.at("views").at(index).at(0);
                    item.graph->resetView();refreshDocumentWindow(owner,item,item.doc);
                }
            }else if(id==DocAdd){
                const auto index=SendMessageW(item.palette,CB_GETCURSEL,0,0);
                if(index>=0){auto input=item.graph->spawnPosition();input["action"]="add";input["key"]=item.model.at("palette").at(index).at("id");editWindowGraph(owner,item,std::move(input));}
            }else if(id==Undo||id==Redo){
                if((item.source||!item.graph)&&item.draft){if(id==Undo)SendMessageW(item.editor,EM_UNDO,0,0);}
                else commitDocumentWindowChange(owner,item,request(id==Undo?"editor.undo":"editor.redo",documentWindowTarget(item)));
            }
            return 0;
        }
        return DefWindowProcW(owner,message,w,l);
    }
    bool closeDocumentWindows(const std::string& only={}){
        std::vector<HWND> owners;
        for(const auto& [owner,item]:documentWindows)if(only.empty()||item.doc.at("path")==only)owners.push_back(owner);
        for(auto owner:owners){SendMessageW(owner,WM_CLOSE,0,0);if(documentWindows.count(owner))return false;}
        return true;
    }
    struct NameDialog {const wchar_t* title;HINSTANCE instance;HWND input=nullptr;std::wstring value;int limit=80;};
    static INT_PTR CALLBACK nameProcedure(HWND dialog,UINT message,WPARAM w,LPARAM l){
        auto* state=reinterpret_cast<NameDialog*>(GetWindowLongPtrW(dialog,DWLP_USER));
        if(message==WM_INITDIALOG){
            state=reinterpret_cast<NameDialog*>(l);SetWindowLongPtrW(dialog,DWLP_USER,reinterpret_cast<LONG_PTR>(state));
            SetWindowTextW(dialog,state->title);
            RECT rect{};GetClientRect(dialog,&rect);
            const auto add=[&](const wchar_t* type,const wchar_t* label,DWORD style,int x,int y,int width,int height,int id){
                const auto child=CreateWindowExW(0,type,label,WS_CHILD|WS_VISIBLE|WS_TABSTOP|style,x,y,width,height,dialog,HMENU(INT_PTR(id)),state->instance,nullptr);
                SendMessageW(child,WM_SETFONT,WPARAM(GetStockObject(DEFAULT_GUI_FONT)),TRUE);return child;
            };
            state->input=add(L"EDIT",state->value.c_str(),WS_BORDER|ES_AUTOHSCROLL,12,12,rect.right-24,26,10);
            SendMessageW(state->input,EM_SETLIMITTEXT,state->limit,0);SendMessageW(state->input,EM_SETSEL,0,-1);
            add(L"BUTTON",L"확인",BS_DEFPUSHBUTTON,rect.right-174,52,74,26,IDOK);
            add(L"BUTTON",L"취소",BS_PUSHBUTTON,rect.right-90,52,74,26,IDCANCEL);
            SetFocus(state->input);return FALSE;
        }
        if(message==WM_COMMAND&&state){
            if(LOWORD(w)==IDOK){state->value=controlText(state->input);EndDialog(dialog,IDOK);return TRUE;}
            if(LOWORD(w)==IDCANCEL){EndDialog(dialog,IDCANCEL);return TRUE;}
        }
        if(message==WM_CLOSE){EndDialog(dialog,IDCANCEL);return TRUE;}
        return FALSE;
    }
    std::wstring inputName(const wchar_t* title,std::wstring initial={},int limit=80){
        struct alignas(DWORD) Dialog {DLGTEMPLATE value;WORD menu=0,windowClass=0,title=0;} layout{};
        layout.value.style=WS_POPUP|WS_CAPTION|WS_SYSMENU|DS_MODALFRAME|DS_CENTER;
        layout.value.cx=230;layout.value.cy=62;
        NameDialog input{title,instance,nullptr,std::move(initial),limit};
        const auto result=DialogBoxIndirectParamW(instance,&layout.value,detached?detached:window,nameProcedure,reinterpret_cast<LPARAM>(&input));
        if(result==-1)throw std::runtime_error("Windows 이름 입력 창을 열 수 없어요.");
        return result==IDOK?input.value:L"";
    }
    std::optional<std::size_t> chooseMenu(const std::vector<std::wstring>& labels){
        const auto menu=CreatePopupMenu();
        for(std::size_t i=0;i<labels.size();++i)AppendMenuW(menu,MF_STRING,i+1,labels[i].c_str());
        POINT at{};GetCursorPos(&at);
        const auto selected=TrackPopupMenu(menu,TPM_RETURNCMD|TPM_NONOTIFY,at.x,at.y,0,window,nullptr);
        DestroyMenu(menu);
        return selected?std::optional<std::size_t>(selected-1):std::nullopt;
    }
    std::wstring pickFile(bool create,const std::wstring& description,const std::wstring& suffix,const std::wstring& name,const fs::path& initialFolder={}){
        IFileDialog* dialog=nullptr;
        const auto& clsid=create?CLSID_FileSaveDialog:CLSID_FileOpenDialog;
        if(FAILED(CoCreateInstance(clsid,nullptr,CLSCTX_INPROC_SERVER,IID_PPV_ARGS(&dialog))))throw std::runtime_error("Windows 파일 선택 창을 열 수 없어요.");
        const auto filter=suffix.empty()?std::wstring(L"*.*"):L"*"+suffix;
        const COMDLG_FILTERSPEC type{description.c_str(),filter.c_str()};
        dialog->SetFileTypes(1,&type);
        if(!suffix.empty())dialog->SetDefaultExtension(suffix.c_str()+1);
        if(create)dialog->SetFileName(name.c_str());
        if(!initialFolder.empty()){
            IShellItem* initial=nullptr;
            if(SUCCEEDED(SHCreateItemFromParsingName(initialFolder.c_str(),nullptr,IID_PPV_ARGS(&initial)))){dialog->SetFolder(initial);initial->Release();}
        }
        std::wstring result;
        if(SUCCEEDED(dialog->Show(window))){
            IShellItem* item=nullptr;
            if(SUCCEEDED(dialog->GetResult(&item))){
                PWSTR path=nullptr;
                if(SUCCEEDED(item->GetDisplayName(SIGDN_FILESYSPATH,&path))){result=path;CoTaskMemFree(path);}
                item->Release();
            }
        }
        dialog->Release();return result;
    }
    std::string chooseTimelineAsset(bool audio){
        const auto name=pickFile(false,audio?L"오디오 클립":L"애니메이션 클립",L"",L"",projectRoot/L"Assets");
        if(name.empty())return {};
        std::error_code error;
        const auto relative=fs::relative(fs::path(name),projectRoot,error);
        if(error||relative.empty()||*relative.begin()!=L"Assets")throw std::runtime_error("프로젝트의 Assets 폴더에서 클립을 고르세요.");
        return utf8(relative.generic_wstring());
    }
    void openProject(Json project){
        projectTitle=wide(project.at("name"));SetWindowTextW(window,(projectTitle+L" — HBEngine").c_str());
        projectFile=fs::path(wide(project.at("file")));
        projectRoot=projectFile.parent_path();
        folder="Assets";updating=true;SetWindowTextW(search,L"");updating=false;refreshFiles();
        showDocument(request("document.open",{{"path",project.at("startupScene")}}));
        refreshRecent();
    }
    void saveCurrent(){
        if(!document.contains("path"))return;
        captureSource();showDocument(request("document.save",{{"expectedRevision",document.at("revision")}}));
        statusText(L"저장했어요.");
    }
    bool confirmClose(){
        if(!sourceChanged&&!document.value("dirty",false))return true;
        const int choice=MessageBoxW(window,L"현재 문서의 변경 사항을 저장할까요?",L"HBEngine",MB_YESNOCANCEL|MB_ICONWARNING);
        if(choice==IDYES){saveCurrent();return true;}
        return choice==IDNO;
    }
    bool confirmWorkspace(){
        if(!confirmClose())return false;
        const auto active=document.value("path",std::string());
        for(const auto& tab:document.value("tabs",Json::array())){
            if(tab.at("path")==active||!tab.at("dirty").get<bool>())continue;
            return MessageBoxW(window,L"다른 문서에 저장하지 않은 변경 사항이 있어요. 버릴까요?",L"HBEngine",MB_YESNO|MB_ICONWARNING)==IDYES;
        }
        return true;
    }
    void startPlay(const fs::path& reportFile={}){
        if(projectFile.empty()||playProcess)return;
        captureSource();
        if(std::any_of(documentWindows.begin(),documentWindows.end(),[](const auto& pane){return pane.second.draft;}))
            throw std::runtime_error("플레이 전에 독립 창에서 편집한 문서를 저장하세요.");
        for(const auto& tab:document.value("tabs",Json::array()))
            if(tab.value("dirty",false))throw std::runtime_error("플레이 전에 수정한 문서를 저장하세요.");
        if(!fs::is_regular_file(playLauncher))throw std::runtime_error("네이티브 플레이 실행 파일을 찾을 수 없어요.");
        const auto root=playRuntimeRoot.empty()?playLauncher.parent_path():playRuntimeRoot;
        auto args=quote(playLauncher.wstring())+L" --package "+quote(root.wstring())+L" --editor-project "+quote(projectFile.wstring())+L" --editor-profile "+quote(editorProfile.wstring())+
            L" --editor-owner "+std::to_wstring(reinterpret_cast<std::uintptr_t>(window));
        if(sceneOpen())args+=L" --editor-scene "+quote(wide(document.at("path")));
        if(!reportFile.empty())args+=L" --hidden --silent --frames 4 --report "+quote(reportFile.wstring());
        STARTUPINFOW startup{sizeof(startup)};PROCESS_INFORMATION child{};
        HANDLE ownership=CreateJobObjectW(nullptr,nullptr);JOBOBJECT_EXTENDED_LIMIT_INFORMATION limits{};
        limits.BasicLimitInformation.LimitFlags=JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        if(!ownership||!SetInformationJobObject(ownership,JobObjectExtendedLimitInformation,&limits,sizeof(limits))
            ||!CreateProcessW(playLauncher.c_str(),args.data(),nullptr,nullptr,FALSE,CREATE_SUSPENDED,nullptr,root.c_str(),&startup,&child)){
            if(ownership)CloseHandle(ownership);
            throw std::runtime_error("편집기 플레이를 시작하지 못했어요.");
        }
        if(!AssignProcessToJobObject(ownership,child.hProcess)||ResumeThread(child.hThread)==DWORD(-1)){
            TerminateProcess(child.hProcess,1);CloseHandle(child.hThread);CloseHandle(child.hProcess);CloseHandle(ownership);
            throw std::runtime_error("편집기 플레이 프로세스를 관리할 수 없어요.");
        }
        CloseHandle(child.hThread);playJob=ownership;playProcess=child.hProcess;playPid=child.dwProcessId;stopPlayRequested=false;
        SetTimer(window,6,150,nullptr);statusText(L"플레이를 시작했어요.");
    }
    void stopPlay(){
        if(!playProcess||WaitForSingleObject(playProcess,0)!=WAIT_TIMEOUT)return;
        stopPlayRequested=true;
        EnumWindows([](HWND candidate,LPARAM value)->BOOL{
            DWORD pid=0;GetWindowThreadProcessId(candidate,&pid);
            if(pid!=DWORD(value))return TRUE;
            wchar_t name[64]{};GetClassNameW(candidate,name,64);
            if(std::wstring_view(name)!=L"HBEngine.NativeGame")return TRUE;
            PostMessageW(candidate,WM_CLOSE,0,0);return FALSE;
        },LPARAM(playPid));
    }
    void waitForPlaySmoke(){
        const auto deadline=GetTickCount64()+120000;
        while(WaitForSingleObject(playProcess,0)==WAIT_TIMEOUT&&GetTickCount64()<deadline){
            MSG message{};
            while(PeekMessageW(&message,nullptr,WM_PAINT,WM_PAINT,PM_REMOVE))DispatchMessageW(&message);
            Sleep(20);
        }
        DWORD code=STILL_ACTIVE;
        GetExitCodeProcess(playProcess,&code);
        if(code==STILL_ACTIVE){stopPlay();throw std::runtime_error("Native editor play timeout");}
        CloseHandle(playProcess);playProcess=nullptr;playPid=0;CloseHandle(playJob);playJob=nullptr;KillTimer(window,6);
        if(code)throw std::runtime_error("Native editor play failed");
    }
    void saveLayout(){
        WINDOWPLACEMENT placement{sizeof(placement)};
        if(!GetWindowPlacement(window,&placement))return;
        const auto& r=placement.rcNormalPosition;
        const Json saved={{"browse",browsePercent},{"inspector",inspectorPercent},{"window",{r.left,r.top,r.right-r.left,r.bottom-r.top}},{"maximized",placement.showCmd==SW_SHOWMAXIMIZED},{"console",consoleVisible},{"contentDetached",contentWindow!=nullptr}};
        auto temp=layoutFile;temp+=L"."+std::to_wstring(GetCurrentProcessId())+L".tmp";
        write(temp,saved.dump());
        if(!MoveFileExW(temp.c_str(),layoutFile.c_str(),MOVEFILE_REPLACE_EXISTING|MOVEFILE_WRITE_THROUGH))DeleteFileW(temp.c_str());
    }
    void restoreLayout(){
        if(!fs::is_regular_file(layoutFile))return;
        const auto data=Json::parse(read(layoutFile),nullptr,false);
        if(!data.is_object())return;
        try{
            browsePercent=std::clamp(data.value("browse",24u),18u,40u);
            inspectorPercent=std::clamp(data.value("inspector",25u),18u,42u);
            layoutMaximized=data.value("maximized",false);
            consoleVisible=data.value("console",false);
            contentDetachedOnStart=data.value("contentDetached",false);
            if(data.contains("window")){
                const auto r=data.at("window").get<std::array<int,4>>();
                const LONG x=std::clamp(r[0],-100000,100000),y=std::clamp(r[1],-100000,100000);
                RECT area{x,y,x+std::clamp(r[2],720,10000),y+std::clamp(r[3],480,10000)};
                if(MonitorFromRect(&area,MONITOR_DEFAULTTONULL))SetWindowPos(window,nullptr,area.left,area.top,area.right-area.left,area.bottom-area.top,SWP_NOZORDER|SWP_NOACTIVATE);
            }
        }catch(const Json::exception&){browsePercent=24;inspectorPercent=25;}
        layout();
    }
    void recoverAssets(){
        if(projectRoot.empty())return;
        const auto pending=request("project.recovery").at("pending");
        if(pending.empty()){SetWindowTextW(status,L"복구할 저장 충돌이 없어요.");return;}
        HMENU menu=CreatePopupMenu();
        for(std::size_t i=0;i<pending.size();++i)AppendMenuW(menu,MF_STRING,i+1,wide(pending.at(i).at("label")).c_str());
        POINT at{};GetCursorPos(&at);
        const auto selected=TrackPopupMenu(menu,TPM_RETURNCMD|TPM_NONOTIFY,at.x,at.y,0,window,nullptr);
        DestroyMenu(menu);
        if(!selected)return;
        const auto transaction=pending.at(selected-1).at("id");
        auto result=request("project.recovery",{{"transaction",transaction}});
        const auto revision=result.at("revision");
        Json choices=Json::object();
        for(;;){
            for(const auto& row:result.at("rows"))choices[row.at("path").get<std::string>()]="disk";
            if(result.at("nextOffset").is_null())break;
            result=request("project.recovery",{{"transaction",transaction},{"offset",result.at("nextOffset")}});
            if(result.at("revision")!=revision)throw std::runtime_error("복구 대상이 변경됐어요. 다시 열어 주세요.");
        }
        const Json input={{"transaction",transaction},{"expectedRevision",revision},{"choices",choices}};
        auto preview=input;preview["dryRun"]=true;
        if(!request("project.recover",preview).value("valid",false))throw std::runtime_error("복구할 파일을 확인하세요.");
        const auto message=std::to_wstring(choices.size())+L"개 파일의 현재 디스크 내용을 보존하고 복구 기록을 정리할까요?";
        if(MessageBoxW(window,message.c_str(),L"저장 충돌 복구",MB_YESNO|MB_ICONWARNING)!=IDYES)return;
        request("project.recover",input);refreshFiles();SetWindowTextW(status,L"현재 디스크 내용을 보존했어요.");
    }
    void attachDocument(HWND owner){
        for(HWND child:{source,palette,views}){ShowWindow(child,SW_HIDE);SetParent(child,owner);}
        graph.reparent(owner);form.reparent(owner);hierarchy.reparent(owner);assetCanvas.reparent(owner);layout();
    }
    void attachBrowser(HWND owner){
        for(HWND child:{files,search}){
            ShowWindow(child,SW_HIDE);
            if(!SetParent(child,owner))throw std::runtime_error("콘텐츠 브라우저 창을 이동하지 못했어요.");
            ShowWindow(child,SW_SHOWNOACTIVATE);
        }
        layout();
    }
    void perform(Command command){
        if(playProcess&&(command==OpenProject||command==NewProject||command>=RecentBase))
            throw std::runtime_error("플레이를 중지한 뒤 프로젝트를 바꾸세요.");
        if(command>=RecentBase&&std::size_t(command-RecentBase)<recent.size()){
            if(!closeDocumentWindows())return;
            captureSource();openProject(request("project.open",{{"file",recent.at(command-RecentBase).at("file")}}));return;
        }
        switch(command){
        case PlayScene:startPlay();return;
        case StopPlay:stopPlay();return;
        case OpenProject:case NewProject:{
            std::string templateId;
            if(command==NewProject){
                const auto choice=chooseMenu({L"2D",L"3D",L"2D 게임플레이",L"3D 게임플레이",L"2D 슈터",L"정원"});
                if(!choice)return;
                const std::array<std::string,6> templates={"2d","3d","gameplay2d","gameplay3d","shooter2d","garden"};
                templateId=templates.at(*choice);
            }
            captureSource();const auto target=pickFile(command==NewProject,L"HBEngine 프로젝트",L".hbproject",L"새 프로젝트.hbproject");
            if(target.empty()||!closeDocumentWindows())return;
            const fs::path path(target);
            openProject(command==OpenProject?request("project.open",{{"file",utf8(target)}}):request("project.create",{{"name",utf8(path.stem().wstring())},{"directory",utf8(path.parent_path().wstring())},{"template",templateId}}));
            return;
        }
        case NewFolder:{
            if(projectRoot.empty())return;
            const auto name=inputName(L"새 폴더 이름");
            if(name.empty())return;
            folder=request("content.mkdir",{{"folder",folder},{"name",utf8(name)}}).at("path");
            updating=true;SetWindowTextW(search,L"");updating=false;refreshFiles();
            return;
        }
        case NewAsset:{
            if(projectRoot.empty())return;
            captureSource();
            const auto kinds=request("content.types");
            HMENU menu=CreatePopupMenu();
            for(std::size_t i=0;i<kinds.size();++i)AppendMenuW(menu,MF_STRING,i+1,wide(kinds.at(i).at("label")).c_str());
            POINT at{12,68};ClientToScreen(window,&at);
            const auto choice=TrackPopupMenu(menu,TPM_RETURNCMD|TPM_NONOTIFY,at.x,at.y,0,window,nullptr);
            DestroyMenu(menu);
            if(!choice)return;
            const auto& kind=kinds.at(choice-1);const auto suffix=wide(kind.at("suffix"));
            const auto start=projectRoot/(folder.empty()?fs::path(L"Assets"):fs::u8path(folder));
            const auto selected=pickFile(true,wide(kind.at("label")),suffix,wide(kind.at("prefix"))+L"New"+suffix,start);
            if(selected.empty())return;
            const fs::path file(selected);const auto parent=file.parent_path().lexically_relative(projectRoot);
            if(parent.empty()||parent==L"."||parent.begin()->wstring()==L".."||file.filename().wstring().size()<=suffix.size()||_wcsicmp(file.filename().wstring().substr(file.filename().wstring().size()-suffix.size()).c_str(),suffix.c_str()))
                throw std::runtime_error("프로젝트 안에서 에셋 이름과 확장자를 선택하세요.");
            const auto name=file.filename().wstring().substr(0,file.filename().wstring().size()-suffix.size());
            showDocument(request("content.create",{{"folder",utf8(parent.generic_wstring())},{"kind",kind.at("kind")},{"name",utf8(name)}}));
            refreshFiles();return;
        }
        case ImportAsset:{
            if(projectRoot.empty())return;
            const auto destination=folder=="Assets"||folder.rfind("Assets/",0)==0?folder:"Assets";
            const auto selected=pickFile(false,L"가져올 파일",L"",L"",projectRoot/fs::u8path(destination));
            if(selected.empty())return;
            const auto result=request("content.import",{{"folder",destination},{"file",utf8(selected)}});
            refreshFiles();SetWindowTextW(status,wide(result.at("path")).c_str());return;
        }
        case Save:
            saveCurrent();return;
        case CloseDocument:
            if(document.contains("path")&&closeDocumentWindows(document.at("path"))&&confirmClose())showDocument(request("document.close",{{"path",document.at("path")},{"discard",true}}));
            return;
        case PinDocument:openDocumentWindow();return;
        case Undo:case Redo:
            if(command==Undo&&sourceChanged&&SendMessageW(source,EM_CANUNDO,0,0)){SendMessageW(source,EM_UNDO,0,0);return;}
            if(document.contains("path")){captureSource();showDocument(request(command==Undo?"editor.undo":"editor.redo"));}return;
        case Detach:
            if(detached){SendMessageW(detached,WM_CLOSE,0,0);return;}
            if(!document.contains("path"))return;
            detached=CreateWindowExW(WS_EX_TOOLWINDOW,L"HBEngine.NativeAuthoring",L"HBEngine 문서",WS_OVERLAPPEDWINDOW,CW_USEDEFAULT,CW_USEDEFAULT,900,650,window,nullptr,instance,this);
            if(!detached)throw std::runtime_error("문서 창을 분리하지 못했어요.");
            attachDocument(detached);
            if(acceptance)SetWindowPos(detached,nullptr,-20000,-20000,0,0,SWP_NOSIZE|SWP_NOZORDER|SWP_NOACTIVATE|SWP_SHOWWINDOW);
            else ShowWindow(detached,SW_SHOW);
            return;
        case DetachContent:
            if(contentWindow){SendMessageW(contentWindow,WM_CLOSE,0,0);return;}
            contentWindow=CreateWindowExW(WS_EX_TOOLWINDOW,L"HBEngine.NativeAuthoring",L"콘텐츠 브라우저",WS_OVERLAPPEDWINDOW|WS_CLIPCHILDREN,CW_USEDEFAULT,CW_USEDEFAULT,490,670,window,nullptr,instance,this);
            if(!contentWindow)throw std::runtime_error("콘텐츠 브라우저 창을 열지 못했어요.");
            attachBrowser(contentWindow);
            if(acceptance)SetWindowPos(contentWindow,nullptr,-20000,-20000,0,0,SWP_NOSIZE|SWP_NOZORDER|SWP_NOACTIVATE|SWP_SHOWWINDOW);
            else ShowWindow(contentWindow,SW_SHOW);
            return;
        case ShowConsole:
            consoleVisible=!consoleVisible;
            if(consoleVisible)console.update({{"items",logItems},{"revision",++logRevision}});
            layout();return;
        case ToggleSource:captureSource();sourceMode=!sourceMode;layout();return;
        case AddActor:case AddComponent:{
            if(!sceneOpen()||sourceMode||(command==AddComponent&&sceneSelection.empty()))return;
            const auto catalog=request("scene.catalog");const auto& choices=catalog.at(command==AddActor?"placements":"components");
            HMENU menu=CreatePopupMenu();
            std::map<std::string,HMENU> groups;
            for(std::size_t i=0;i<choices.size();++i){
                const auto& choice=choices.at(i);
                auto parent=menu;
                if(command==AddActor){
                    const auto group=choice.at("group").get<std::string>();
                    if(!groups.count(group)){
                        const auto category=CreatePopupMenu();groups.emplace(group,category);
                        AppendMenuW(menu,MF_POPUP,UINT_PTR(category),wide(group).c_str());
                    }
                    parent=groups.at(group);
                }
                AppendMenuW(parent,MF_STRING,i+1,wide(command==AddActor?choice.at("label"):choice).c_str());
            }
            POINT at{};GetCursorPos(&at);
            const auto chosen=TrackPopupMenu(menu,TPM_RETURNCMD|TPM_NONOTIFY,at.x,at.y,0,window,nullptr);
            DestroyMenu(menu);
            if(chosen){
                const auto& choice=choices.at(chosen-1);
                editScene({{"action",command==AddActor?"add":"component"},{"id",sceneSelection},{"key",command==AddActor?choice.at("id"):choice}});
            }
            return;
        }
        case DeleteActor:
            if(!sceneSelection.empty())editScene({{"action","delete"},{"id",sceneSelection}});
            return;
        case DuplicateActor:
            if(!sceneSelection.empty())editScene({{"action","duplicate"},{"id",sceneSelection}});
            return;
        case FocusActor:queueViewport({{"command","focus"}});return;
        case AddSequenceTrack:{
            if(document.value("kind",std::string())!="sequenceasset"||sourceMode)return;
            const auto types=request("timeline.trackTypes");
            std::vector<std::wstring> labels;
            for(const auto& type:types)labels.push_back(wide(type));
            const auto selection=chooseMenu(labels);
            if(selection)showDocument(request("timeline.edit",{{"action","trackAdd"},{"type",types.at(*selection)},{"expectedRevision",document.at("revision")}}));
            return;
        }
        case WideBrowser:browsePercent=browsePercent==24?34:24;layout();return;
        case WideInspector:inspectorPercent=inspectorPercent==25?38:25;layout();return;
        case ResetLayout:
            browsePercent=24;inspectorPercent=25;consoleVisible=false;
            if(detached)SendMessageW(detached,WM_CLOSE,0,0);
            if(contentWindow)SendMessageW(contentWindow,WM_CLOSE,0,0);
            layout();return;
        case Recovery:recoverAssets();return;
        case PreviewAsset:
            if(canPreview()){
                previewOpen=!previewOpen;
                if(!previewOpen)request("asset.previewClose");
                layout();
            }
            return;
        case CheckBuild:case BuildGame:case EditBuildProfile:case CopyBuildProfile:case DeleteBuildProfile:{
            if(projectRoot.empty()||building)return;
            captureSource();
            const auto settings=request("project.buildProfiles");const auto& profiles=settings.at("profiles");
            std::vector<std::wstring> labels;
            for(const auto& profile:profiles)labels.push_back(wide(profile.at("name")));
            const auto choice=chooseMenu(labels);
            if(!choice)return;
            const auto& profile=profiles.at(*choice);
            if(command==CopyBuildProfile||command==DeleteBuildProfile){
                Json input={{"id",profile.at("id")},{"expectedRevision",settings.at("revision")}};
                if(command==DeleteBuildProfile){
                    if(MessageBoxW(window,L"선택한 빌드 프로필을 삭제할까요?",L"HBEngine",MB_YESNO|MB_ICONWARNING)!=IDYES)return;
                    input["action"]="delete";
                }else{
                    const auto id=inputName(L"새 프로필 ID",wide(profile.at("id"))+L"-copy",40);
                    if(id.empty())return;
                    const auto name=inputName(L"새 프로필 이름",wide(profile.at("name"))+L" 복사본",80);
                    if(name.empty())return;
                    input["action"]="copy";input["newId"]=utf8(id);input["changes"]={{"name",utf8(name)}};
                }
                request("project.buildProfileSave",input);statusText(L"빌드 프로필을 저장했어요.");return;
            }
            if(command==EditBuildProfile){
                const std::vector<std::string> keys={"name","productName","width","height","targetFrameRate","configuration","nativeGraphicsAPI","scenes","mobile","windowsSigning"};
                const std::vector<std::wstring> titles={L"프로필 이름",L"게임 이름",L"화면 너비",L"화면 높이",L"목표 FPS",L"빌드 구성",L"Windows 그래픽 API",L"장면 목록 (JSON)",L"모바일 설정 (JSON)",L"Windows 서명 설정 (JSON)"};
                const auto field=chooseMenu(titles);if(!field)return;
                const auto& key=keys.at(*field);
                const auto value=profile.value(key,Json());
                const bool string=*field<2||key=="configuration"||key=="nativeGraphicsAPI";
                auto display=value.is_string()?wide(value.get<std::string>()):value.is_null()?std::wstring():wide(value.dump());
                const auto input=inputName(titles.at(*field).c_str(),std::move(display),16000);
                if(input.empty())return;
                const auto next=string?Json(utf8(input)):Json::parse(utf8(input));
                request("project.buildProfileSave",{{"id",profile.at("id")},{"expectedRevision",settings.at("revision")},{"changes",{{key,next}}}});
                statusText(L"빌드 프로필을 저장했어요.");return;
            }
            if(std::any_of(documentWindows.begin(),documentWindows.end(),[](const auto& pane){return pane.second.draft;}))
                throw std::runtime_error("빌드하기 전에 독립 창에서 편집한 문서를 저장하세요.");
            statusText(command==CheckBuild?L"빌드 검사 중":L"패키징 중");
            request("project.build",{{"id",profile.at("id")},{"expectedRevision",settings.at("revision")},{"dryRun",command==CheckBuild}});
            building=true;checkingBuild=command==CheckBuild;SetTimer(window,4,350,nullptr);
            return;
        }
        case RunBuild:if(!projectRoot.empty())request("project.buildRun");return;
        case CancelBuild:if(building)request("project.buildCancel");return;
        case AddWidget:{
            if(!widgetOpen()||sourceMode)return;
            const auto kinds=request("widget.catalog");
            const auto menu=CreatePopupMenu();
            for(std::size_t i=0;i<kinds.size();++i)AppendMenuW(menu,MF_STRING,i+1,wide(kinds.at(i).at("label")).c_str());
            POINT at{};GetCursorPos(&at);
            const auto choice=TrackPopupMenu(menu,TPM_RETURNCMD|TPM_NONOTIFY,at.x,at.y,0,window,nullptr);
            DestroyMenu(menu);
            if(choice)editWidget({{"action","add"},{"id",widgetSelection},{"key",kinds.at(choice-1).at("id")}});
            return;
        }
        case Up:
            if(!folder.empty()){const auto at=folder.rfind('/');folder=at==std::string::npos?"":folder.substr(0,at);refreshFiles();}return;
        case AddNode:{
            if(!document.value("graph",false))return;
            const auto index=SendMessageW(palette,CB_GETCURSEL,0,0);if(index<0)return;
            auto event=graph.spawnPosition();event["action"]="add";event["key"]=model.at("palette").at(index).at("id");event["id"]=graphSelection;editGraph(std::move(event));return;
        }
        case AddVariable:case AddFunction:case AddMacro:{
            if(document.value("kind",std::string())!="blueprint"||sourceMode)return;
            const auto members=request("blueprint.members");
            Json type="float";
            if(command==AddVariable){
                const auto& types=members.at("types");const auto menu=CreatePopupMenu();
                for(std::size_t i=0;i<types.size();++i)AppendMenuW(menu,MF_STRING,i+1,wide(types.at(i).at("label")).c_str());
                POINT at{};GetCursorPos(&at);
                const auto choice=TrackPopupMenu(menu,TPM_RETURNCMD|TPM_NONOTIFY,at.x,at.y,0,window,nullptr);
                DestroyMenu(menu);
                if(!choice)return;
                type=types.at(choice-1).at("id");
            }
            const auto name=inputName(command==AddVariable?L"변수 이름":command==AddFunction?L"함수 이름":L"매크로 이름");
            if(name.empty())return;
            auto changed=request("blueprint.memberAdd",{{"kind",command==AddVariable?"variable":command==AddFunction?"function":"macro"},{"name",utf8(name)},{"type",type},{"expectedRevision",document.at("revision")}});
            if(command!=AddVariable){view=changed.at("view");graph.resetView();graphSelection.clear();}
            showDocument(std::move(changed));return;
        }
        default:return;
        }
    }
    LRESULT event(HWND owner,UINT message,WPARAM w,LPARAM l){
        if(const auto it=documentWindows.find(owner);it!=documentWindows.end()){
            try{return documentWindowEvent(owner,it->second,message,w,l);}
            catch(const std::exception& error){SetWindowTextW(it->second.status,wide(std::string(error.what())).c_str());return 0;}
        }
        if(owner!=window&&owner!=detached&&owner!=contentWindow)return DefWindowProcW(owner,message,w,l);
        if(moveDivider(owner,message,l))return 0;
        if(message==WM_SETCURSOR&&LOWORD(l)==HTCLIENT){
            POINT point{};GetCursorPos(&point);ScreenToClient(owner,&point);
            if(dividerAt(owner,point.x,point.y)!=Divider::None){SetCursor(LoadCursorW(nullptr,IDC_SIZEWE));return TRUE;}
        }
        if(message==WM_SIZE){layout();return 0;}
        if(message==WM_TIMER&&w==1){KillTimer(window,1);refreshFiles();return 0;}
        if(message==WM_TIMER&&w==2){
            KillTimer(window,2);
            if(sceneOpen()&&!sourceMode){auto input=std::move(cameraInput);cameraInput=nullptr;drawViewport(input.is_object()?std::move(input):Json::object());}
            return 0;
        }
        if(message==WM_TIMER&&w==3){KillTimer(window,3);refreshWidget();return 0;}
        if(message==WM_TIMER&&w==4){
            const auto state=request("project.buildStatus");
            if(state.value("status",std::string())=="running"){SetWindowTextW(status,wide(state.at("stage")).c_str());return 0;}
            KillTimer(window,4);building=false;
            if(state.value("status",std::string())=="canceled"){SetWindowTextW(status,L"빌드를 취소했어요.");return 0;}
            if(state.contains("error"))throw std::runtime_error(state.at("error").get<std::string>());
            if(!state.contains("result"))return 0;
            const auto& result=state.at("result");
            const auto output=wide(result.value("output",std::string()));
            SetWindowTextW(status,checkingBuild?L"빌드 검사 통과":output.c_str());
            return 0;
        }
        if(message==WM_TIMER&&w==5){
            KillTimer(window,5);
            if(previewOpen&&canPreview()&&!sourceMode){auto input=std::move(previewInput);previewInput=nullptr;drawPreview(input.is_object()?std::move(input):Json::object());}
            return 0;
        }
        if(message==WM_TIMER&&w==6){
            if(playProcess&&WaitForSingleObject(playProcess,0)==WAIT_TIMEOUT){if(stopPlayRequested)stopPlay();return 0;}
            KillTimer(window,6);
            if(playProcess){
                DWORD result=0;GetExitCodeProcess(playProcess,&result);CloseHandle(playProcess);playProcess=nullptr;playPid=0;
                CloseHandle(playJob);playJob=nullptr;
                statusText(result?L"플레이 실행 오류. 세션 로그를 확인하세요.":L"플레이를 종료했어요.");
            }
            if(closeAfterPlay){closeAfterPlay=false;PostMessageW(window,WM_CLOSE,0,0);}
            return 0;
        }
        if(message==WM_COMMAND){
            const auto id=Command(LOWORD(w));
            if(id==Search&&HIWORD(w)==EN_CHANGE&&!updating)SetTimer(window,1,180,nullptr);
            else if(id==Source&&HIWORD(w)==EN_CHANGE&&!updating){sourceChanged=true;SetWindowTextW(status,L"저장하지 않은 변경 사항");}
            else if(id==Views&&HIWORD(w)==CBN_SELCHANGE){
                const auto i=SendMessageW(views,CB_GETCURSEL,0,0);
                if(i>=0){
                    if(sceneOpen()){cameraId=cameraRows.at(i);queueViewport();}
                    else{view=model.at("views").at(i).at(0);graph.resetView();graphSelection.clear();refreshGraph();layout();}
                }
            }else if(HIWORD(w)==0)perform(id);
            return 0;
        }
        if(message==WM_NOTIFY){
            const auto* header=reinterpret_cast<const NMHDR*>(l);
            if(header->hwndFrom==tabs&&header->code==TCN_SELCHANGE&&!updating){
                const int i=TabCtrl_GetCurSel(tabs);
                if(i>=0){const auto file=document.at("tabs").at(i).at("path");captureSource();showDocument(request("document.open",{{"path",file}}));}
            }
            if(header->hwndFrom==files&&header->code==LVN_GETDISPINFOW){
                auto& item=reinterpret_cast<NMLVDISPINFOW*>(l)->item;
                if((item.mask&LVIF_TEXT)&&item.iItem>=0&&item.iItem<int(entries.size())){
                    const auto& row=entries.at(item.iItem);
                    const auto name=(row.at("kind")=="folder"?L"▸ ":L"")+wide(row.at("name"));
                    lstrcpynW(item.pszText,name.c_str(),item.cchTextMax);
                }
            }
            if(header->hwndFrom==files&&(header->code==NM_DBLCLK||header->code==NM_RETURN)){
                const int i=ListView_GetNextItem(files,-1,LVNI_SELECTED);
                if(i>=0&&i<int(entries.size())){
                    const auto item=entries.at(i);
                    if(item.at("kind")=="folder"){folder=item.at("path");updating=true;SetWindowTextW(search,L"");updating=false;refreshFiles();}
                    else{captureSource();showDocument(request("document.open",{{"path",item.at("path")}}));}
                }
            }
            return 0;
        }
        if(message==WM_CLOSE){
            if(owner==detached){detached=nullptr;attachDocument(window);DestroyWindow(owner);return 0;}
            if(owner==contentWindow){contentWindow=nullptr;attachBrowser(window);DestroyWindow(owner);return 0;}
            if(playProcess){closeAfterPlay=true;stopPlay();statusText(L"플레이를 종료하고 있어요.");return 0;}
            if(building){SetWindowTextW(status,L"빌드가 끝나면 창을 닫을 수 있어요.");return 0;}
            if(!closeDocumentWindows()||!confirmWorkspace())return 0;
            saveLayout();
            if(detached)SendMessageW(detached,WM_CLOSE,0,0);
            if(contentWindow)SendMessageW(contentWindow,WM_CLOSE,0,0);
            DestroyWindow(owner);return 0;
        }
        if(message==WM_DESTROY&&owner==window){PostQuitMessage(0);return 0;}
        return DefWindowProcW(owner,message,w,l);
    }
    static LRESULT CALLBACK procedure(HWND owner,UINT message,WPARAM w,LPARAM l){
        auto* self=reinterpret_cast<NativeEditorShell*>(GetWindowLongPtrW(owner,GWLP_USERDATA));
        if(message==WM_NCCREATE){self=static_cast<NativeEditorShell*>(reinterpret_cast<CREATESTRUCTW*>(l)->lpCreateParams);SetWindowLongPtrW(owner,GWLP_USERDATA,reinterpret_cast<LONG_PTR>(self));}
        if(self)try{return self->event(owner,message,w,l);}catch(const std::exception& error){self->report(error);return 0;}
        return DefWindowProcW(owner,message,w,l);
    }
public:
    explicit NativeEditorShell(HINSTANCE appInstance):instance(appInstance){}
    ~NativeEditorShell(){if(playProcess){stopPlay();CloseHandle(playProcess);}if(playJob)CloseHandle(playJob);while(!documentWindows.empty())destroyDocumentWindow(documentWindows.begin()->first);if(IsWindow(window))DestroyWindow(window);if(font)DeleteObject(font);if(childInput)CloseHandle(childInput);if(job)CloseHandle(job);if(childOutput)CloseHandle(childOutput);}
    int run(const fs::path& node,const fs::path& script,const fs::path& profile,const std::wstring& project,int show,const fs::path& smoke){
        acceptance=!smoke.empty();
        layoutFile=profile/L"native-editor-layout.json";
        editorProfile=profile;
        playLauncher=node.parent_path().parent_path()/L"HBNativePlayer.exe";
        if(acceptance){
            const auto testLauncher=env(L"HB_EDITOR_TEST_PLAYER"),testRuntime=env(L"HB_EDITOR_TEST_RUNTIME");
            if(!testLauncher.empty())playLauncher=testLauncher;
            if(!testRuntime.empty())playRuntimeRoot=testRuntime;
        }
        startWorker(node,script,profile);
        WNDCLASSW type{};type.hInstance=instance;type.lpszClassName=L"HBEngine.NativeAuthoring";type.lpfnWndProc=procedure;type.hCursor=LoadCursorW(nullptr,IDC_ARROW);type.hbrBackground=GetSysColorBrush(COLOR_BTNFACE);type.hIcon=LoadIconW(instance,MAKEINTRESOURCEW(101));
        RegisterClassW(&type);
        window=CreateWindowExW(0,type.lpszClassName,L"HBEngine · 네이티브 편집기",WS_OVERLAPPEDWINDOW|WS_CLIPCHILDREN,CW_USEDEFAULT,CW_USEDEFAULT,1280,850,nullptr,nullptr,instance,this);
        if(!window)throw std::runtime_error("Native editor window");
        makeControls();layout();refreshRecent();
        if(!project.empty())openProject(request("project.open",{{"file",utf8(project)}}));
        if(acceptance)return smokeTest(smoke);
        restoreLayout();
        ShowWindow(window,layoutMaximized?SW_SHOWMAXIMIZED:show);
        if(contentDetachedOnStart)perform(DetachContent);
        ACCEL keys[]={{FVIRTKEY|FCONTROL,'O',OpenProject},{FVIRTKEY|FCONTROL,'S',Save},{FVIRTKEY|FCONTROL,'W',CloseDocument},{FVIRTKEY|FCONTROL,'Z',Undo},{FVIRTKEY|FCONTROL,'Y',Redo},{FVIRTKEY|FALT,VK_UP,Up},{FVIRTKEY,VK_F5,PlayScene},{FVIRTKEY|FSHIFT,VK_F5,StopPlay}};
        const auto accelerator=CreateAcceleratorTableW(keys,int(std::size(keys)));
        MSG message;
        while(GetMessageW(&message,nullptr,0,0)>0){
            const auto owner=GetAncestor(message.hwnd,GA_ROOT);
            const bool independent=documentWindows.count(owner)!=0;
            const bool documentShortcut=message.wParam=='S'||message.wParam=='W'||message.wParam=='Z'||message.wParam=='Y';
            if((independent&&!documentShortcut)||!TranslateAcceleratorW(independent?owner:window,accelerator,&message)){TranslateMessage(&message);DispatchMessageW(&message);}
        }
        DestroyAcceleratorTable(accelerator);return 0;
    }
private:
    int smokeTest(const fs::path& smoke){
        if(!document.contains("path"))throw std::runtime_error("검사 프로젝트를 지정하세요.");
        SetWindowPos(window,nullptr,-20000,-20000,0,0,SWP_NOSIZE|SWP_NOZORDER|SWP_NOACTIVATE|SWP_SHOWWINDOW);
        const auto command=[this](Command id){SendMessageW(window,WM_COMMAND,id,0);};
        const auto assets=entries.size();
        command(DetachContent);
        if(!contentWindow||GetParent(files)!=contentWindow||GetParent(search)!=contentWindow)
            throw std::runtime_error("Native content window detach failed");
        command(ShowConsole);
        statusText(L"네이티브 출력 로그");
        if(console.inspect().at("items").empty())throw std::runtime_error("Native output log is empty");
        saveLayout();
        const auto savedLayout=Json::parse(read(layoutFile));
        if(!savedLayout.at("contentDetached").get<bool>()||!savedLayout.at("console").get<bool>())
            throw std::runtime_error("Native dock layout did not persist");
        command(ResetLayout);
        if(contentWindow||GetParent(files)!=window||GetParent(search)!=window)
            throw std::runtime_error("Native content window redock failed");
        RECT layoutRect{};GetClientRect(window,&layoutRect);
        const int dividerX=std::clamp(int(layoutRect.right*browsePercent/100),150,460);
        SendMessageW(window,WM_LBUTTONDOWN,MK_LBUTTON,MAKELPARAM(dividerX,95));
        SendMessageW(window,WM_MOUSEMOVE,MK_LBUTTON,MAKELPARAM(dividerX+90,95));
        SendMessageW(window,WM_LBUTTONUP,0,MAKELPARAM(dividerX+90,95));
        if(browsePercent<=24)throw std::runtime_error("Native dock divider drag failed");
        command(ResetLayout);
        const auto sceneSurface=drawViewport({{"capture",true}});
        if(sceneSurface.at("backend")!="D3D12"||sceneSurface.at("calls")<1)
            throw std::runtime_error("Native scene did not draw: "+sceneSurface.dump());
        const auto capture=viewport.capture();
        const auto& rgba=capture.at("rgba");
        std::set<std::array<int,3>> colors;
        for(std::size_t i=0;i+3<rgba.size();i+=std::max<std::size_t>(4,(rgba.size()/2000)&~std::size_t(3)))
            colors.insert({rgba.at(i).get<int>(),rgba.at(i+1).get<int>(),rgba.at(i+2).get<int>()});
        if(colors.size()<4)throw std::runtime_error("Native scene captured only a flat clear");
        const auto initialRows=sceneRows.size();
        editScene({{"action","add"},{"key","cube"}});
        const auto newCube=sceneSelection;
        if(newCube.empty()||sceneRows.size()!=initialRows+1)throw std::runtime_error("Native scene placement failed");
        editScene({{"action","component"},{"id",newCube},{"key","AudioSource"}});
        const auto tree=hierarchy.inspect().at("rows");
        const auto item=std::find_if(tree.begin(),tree.end(),[&](const Json& row){return row.at("id")==newCube;});
        if(item==tree.end())throw std::runtime_error("New object missing from hierarchy");
        hierarchy.probe({{"action","click"},{"row",item-tree.begin()},{"part","item"}});
        if(sceneSelection!=newCube)throw std::runtime_error("Native hierarchy selection failed");
        int position=0;
        while(fields.at(position).at("key")!="position")++position;
        form.probe({{"action","click"},{"i",position}});
        form.probe({{"action","edit"},{"i",0},{"text","2.5"}});
        if(Json::parse(document.at("text").get<std::string>()).at("objects").back().at("position").at(0)!=2.5)
            throw std::runtime_error("Native scene transform failed");
        command(FocusActor);
        viewport.probe(WM_MOUSEWHEEL,MAKEWPARAM(0,WHEEL_DELTA),0);
        auto cameraChange=std::move(cameraInput);cameraInput=nullptr;
        const auto afterZoom=drawViewport(std::move(cameraChange));
        if(afterZoom.at("backend")!="D3D12")throw std::runtime_error("Native scene zoom failed");
        command(Save);
        Json playEvidence;
        if(!env(L"HB_EDITOR_TEST_PLAYER").empty()){
            auto playReport=smoke;playReport+=L".play.json";
            startPlay(playReport);waitForPlaySmoke();
            const auto result=Json::parse(read(playReport));
            playEvidence={{"frames",result.at("frames")},{"webview",result.at("webview")},{"backend",result.at("renderer").at("backend")},{"scene",result.at("logic").at("scene")}};
            if(playEvidence.at("frames")!=4||playEvidence.at("webview")!=false||playEvidence.at("backend")!="D3D12"||playEvidence.at("scene")!=document.at("path"))
                throw std::runtime_error("Native editor play evidence mismatch");
        }
        showDocument(request("document.open",{{"path","Assets/AN_Native.hbanimation.json"}}));
        assetCanvas.probeAddKey();assetCanvas.probePaint();
        const auto timelineSurface=assetCanvas.inspect();
        if(timelineSurface.at("backend")!="D3D12"||!document.at("dirty").get<bool>())
            throw std::runtime_error("Native timeline key editing failed");
        command(Save);
        showDocument(request("document.open",{{"path","Assets/LS_Native.hbsequence.json"}}));
        showDocument(request("timeline.edit",{{"action","trackAdd"},{"type","position"},{"expectedRevision",document.at("revision")}}));
        assetCanvas.probeAddKey();assetCanvas.probePaint();
        if(!document.at("dirty").get<bool>()||assetCanvas.inspect().at("backend")!="D3D12")
            throw std::runtime_error("Native sequence editing failed");
        command(Save);
        showDocument(request("document.open",{{"path","Assets/BT_Native.hbbehaviortree.json"}}));
        editGraph({{"action","add"},{"key","task"},{"x",340},{"y",260}});
        if(model.at("edges").size()!=1)throw std::runtime_error("Native behavior tree editing failed");
        graph.probePaint();command(Save);
        showDocument(request("document.open",{{"path","Assets/FSM_Native.hbstatemachine.json"}}));
        editGraph({{"action","add"},{"key","state"},{"x",420},{"y",340}});
        graph.probeConnect({{"node",model.at("nodes").front().at("id")},{"pin","out"}},{{"node",model.at("nodes").back().at("id")},{"pin","in"}});
        if(model.at("edges").size()!=1)throw std::runtime_error("Native state machine transition failed");
        command(Save);
        showDocument(request("document.open",{{"path","Assets/W_Native.hbwidget.json"}}));
        editWidget({{"action","add"},{"key","Button"}});
        const auto widget=widgetSelection;
        refreshWidget();
        assetCanvas.probeMoveWidget(widget,20,15);
        const auto widgetDocument=Json::parse(document.at("text").get<std::string>());
        if(widgetDocument.at("nodes").back().at("slot").at("offset").at(0)<=32)
            throw std::runtime_error("Native widget pointer move failed");
        refreshWidget();assetCanvas.probePaint();
        const auto widgetSurface=assetCanvas.inspect();
        if(widgetSurface.at("backend")!="D3D12"||widgetSurface.at("rows")<2)
            throw std::runtime_error("Native widget canvas failed");
        command(Save);
        showDocument(request("document.open",{{"path","Assets/Blueprints/BP_Garden.hbblueprint.json"}}));
        const auto count=model.at("nodes").size();
        editGraph({{"action","add"},{"key","print"},{"x",420},{"y",340}});
        if(model.at("nodes").size()!=count+1)throw std::runtime_error("Blueprint node creation failed");
        command(Undo);if(model.at("nodes").size()!=count)throw std::runtime_error("Blueprint undo failed");
        command(Redo);
        const auto movedId=model.at("nodes").back().at("id").get<std::string>();
        graph.probeMove(movedId,32,16);
        if(model.at("nodes").back().at("x")!=452||model.at("nodes").back().at("y")!=356)throw std::runtime_error("Blueprint native drag failed");
        editGraph({{"action","add"},{"key","print"},{"x",145},{"y",340}});
        const auto edgeCount=model.at("edges").size();
        graph.probeConnect({{"node",model.at("nodes").back().at("id")},{"pin","then"}},{{"node",movedId},{"pin","exec"}});
        if(model.at("edges").size()!=edgeCount+1)throw std::runtime_error("Blueprint native connection failed");
        form.probe({{"action","edit"},{"i",0},{"text","네이티브 그래프 검사"}});
        if(document.at("text").get<std::string>().find("네이티브 그래프 검사")==std::string::npos)throw std::runtime_error("Blueprint input value edit failed");
        command(PreviewAsset);
        const auto componentPreview=drawPreview({{"capture",true}});
        if(componentPreview.at("backend")!="D3D12"||componentPreview.at("calls")<1||!componentPreview.at("warnings").empty()||!componentPreview.at("shaderPreparation").at("ready").get<bool>())
            throw std::runtime_error("Native component preview failed: "+componentPreview.dump());
        command(PreviewAsset);
        graph.probePaint();const auto blueprintSurface=graph.inspect();
        if(blueprintSurface.at("backend")!="D3D12")throw std::runtime_error("Blueprint graph present failed: "+blueprintSurface.at("graphicsError").get<std::string>());
        command(Save);
        showDocument(request("document.open",{{"path","Assets/Materials/Moss_stone.hbmaterial.json"}}));
        const auto materialCount=model.at("nodes").size();const auto paletteEntry=model.at("palette").front();
        editGraph({{"action","add"},{"key",paletteEntry.at("id")},{"x",230},{"y",200}});
        if(model.at("nodes").size()!=materialCount+1)throw std::runtime_error("Material node creation failed");
        command(PreviewAsset);
        const auto materialPreview=drawPreview({{"capture",true}});
        if(materialPreview.at("backend")!="D3D12"||materialPreview.at("calls")<1||!materialPreview.at("warnings").empty()||!materialPreview.at("shaderPreparation").at("ready").get<bool>())
            throw std::runtime_error("Native material preview failed: "+materialPreview.dump());
        command(PreviewAsset);
        command(Save);command(Detach);
        if(!detached||graph.parentWindow()!=detached)throw std::runtime_error("Graph detach failed");
        graph.probePaint();const auto materialSurface=graph.inspect();
        if(materialSurface.at("backend")!="D3D12"||materialSurface.at("paints")<=blueprintSurface.at("paints"))throw std::runtime_error("Detached graph present failed: "+materialSurface.at("graphicsError").get<std::string>());
        command(Detach);
        if(detached||graph.parentWindow()!=window)throw std::runtime_error("Graph redock failed");
        showDocument(request("document.open",{{"path","Assets/Materials/PM_Native.hbphysicalmaterial.json"}}));
        int controlId=0;
        while(fields.at(controlId).at("key")!="friction")++controlId;
        form.probe({{"action","edit"},{"i",controlId},{"text","0.75"}});
        if(!document.at("dirty").get<bool>())throw std::runtime_error("Native asset edit failed");
        command(Save);
        form.probe({{"action","paint"}});
        const auto assetSurface=form.inspect();
        if(assetSurface.at("backend")!="D3D12")throw std::runtime_error("Asset panel present failed: "+assetSurface.at("graphicsError").get<std::string>());
        showDocument(request("document.open",{{"path","Assets/Blueprints/BP_Garden.hbblueprint.json"}}));
        command(PinDocument);
        if(documentWindows.size()!=1)throw std::runtime_error("Independent graph window missing");
        const auto graphWindow=documentWindows.begin()->first;
        auto& graphPane=documentWindows.at(graphWindow);
        showDocument(request("document.open",{{"path","Assets/Empty/가져오기.txt"}}));
        command(PinDocument);
        if(documentWindows.size()!=2)throw std::runtime_error("Independent text window missing");
        const auto textWindow=std::find_if(documentWindows.begin(),documentWindows.end(),[&](const auto& row){return row.first!=graphWindow;})->first;
        auto& textPane=documentWindows.at(textWindow);
        showDocument(request("document.open",{{"path","Assets/AM_Native.hbmontage.json"}}));
        assetCanvas.probePaint();graphPane.graph->probePaint();
        const auto independent=graphPane.graph->inspect();
        if(independent.at("backend")!="D3D12"||independent.at("paints")==0)throw std::runtime_error("Independent graph present failed");
        SendMessageW(textPane.editor,EM_SETSEL,0,-1);
        SendMessageW(textPane.editor,EM_REPLACESEL,TRUE,LPARAM(L"독립 문서 저장"));
        if(!textPane.draft)throw std::runtime_error("Independent text edit did not mark the draft");
        SendMessageW(textWindow,WM_COMMAND,DocSave,0);
        if(textPane.draft||textPane.doc.at("dirty")!=false||document.at("kind")!="montage")throw std::runtime_error("Independent document save changed the active document");
        const Json independentDocuments={{"graph",independent.at("backend")},{"count",documentWindows.size()}};
        if(!closeDocumentWindows())throw std::runtime_error("Independent documents close failed");
        write(smoke,Json{{"ok",true},{"webview",GetModuleHandleW(L"WebView2Loader.dll")!=nullptr},{"assets",assets},{"contentDock",savedLayout.at("contentDetached")},{"outputLog",savedLayout.at("console")},{"sceneSurface",sceneSurface},{"sceneColors",colors.size()},{"newCube",newCube},{"play",playEvidence},{"timelineSurface",timelineSurface},{"widgetSurface",widgetSurface},{"widget",widget},{"blueprintNodes",count+2},{"materialNodes",materialCount+1},{"blueprintSurface",blueprintSurface},{"materialSurface",materialSurface},{"materialPreview",{{"backend",materialPreview.at("backend")},{"calls",materialPreview.at("calls")}}},{"componentPreview",{{"backend",componentPreview.at("backend")},{"calls",componentPreview.at("calls")}}},{"assetSurface",{{"backend",assetSurface.at("backend")},{"paints",assetSurface.at("paints")}}},{"independentDocuments",independentDocuments},{"saved",!document.at("dirty").get<bool>()}}.dump());
        return 0;
    }
};
