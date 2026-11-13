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
    HWND folderBack=nullptr,folderForward=nullptr,folderPath=nullptr,folderTree=nullptr,assetType=nullptr,assetRecursive=nullptr,assetTiles=nullptr;
    HWND contentWindow=nullptr;
    HIMAGELIST assetIcons=nullptr;
    std::optional<std::string> queuedFolder;
    int64_t contentScanId=0;
    HINSTANCE instance;
    HFONT font=nullptr;
    HANDLE childInput=nullptr,childOutput=nullptr,job=nullptr;
    std::string buffered,folder,view="event",graphSelection;
    std::vector<std::string> folderHistory;
    std::size_t folderPosition=0;
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
    std::string cameraDirection;
    bool cameraOutputs=false;
    Json inspectedBase=Json::array();
    bool viewportPreparing=false;
    bool viewportQueued=false;
    bool previewOpen=false,foliageSelect=false;
    Json worldBrush={{"mode","raise"},{"radius",2.0},{"strength",1.0},{"height",0.0},{"layer",0}};
    Json foliageBrush={{"radius",5.0},{"count",24},{"minDistance",0.5}};
    std::map<int,std::vector<int>> worldFaces;
    std::set<int> worldVertices;
    std::set<std::array<int,2>> worldEdges;
    unsigned meshSelectionMode=0,meshUVChannel=0;
    bool meshUVOpen=false,meshAtlasRunning=false;
    Json meshUVCenter;
    double meshUVZoom=1,meshUVUnit=1;
    std::set<std::string> worldInstances;
    Json previewInput;
    Json widgetPreview;
    std::string widgetSelection,widgetRevision;
    std::string timelineTrack,timelineItem;
    std::string selectedTransition,draggedTab;
    int timelineKey=-1;
    int timelineChannel=-1;
    bool curveView=false;
    std::array<long long,2> tileOrigin{};
    std::string tileLayer,tileTool="brush";
    Json tileAtlasSource;
    int tileIndex=0;
    HWND dockDragControl=nullptr;
    POINT tabDragStart{};
    bool tabDragging=false;
    unsigned imageIndex=0,imageLevel=0;
    ULONGLONG spritePlayStart=0;
    int spriteFrame=-1;
    bool audioPreviewPlaying=false;
    fs::path layoutFile;
    fs::path playLauncher,playRuntimeRoot,editorProfile,projectFile;
    fs::path takeOutput,audioOutput,audioProject;
    std::wstring takeName,audioName;
    HANDLE playProcess=nullptr;
    unsigned playBreaks=0;
    Json playDebug;
    bool atBreakpoint=false;
    DWORD playPid=0;
    bool stopPlayRequested=false;
    bool closeAfterPlay=false;
    HANDLE playJob=nullptr;
    bool building=false,checkingBuild=false;
    Json graphClipboard;
    std::wstring graphSearchProbe;
    std::string draggedAsset,folderTreePath;
    Json browserFolders=Json::array(),assetTypes=Json::array();
    bool browserTiles=false,refreshingFolders=false;
    bool layoutMaximized=false;
    bool consoleVisible=false,contentDetachedOnStart=false;
    Json logItems=Json::array();
    std::uint64_t logRevision=0;
    unsigned browsePercent=24,inspectorPercent=25,splitPercent=43,lowerSplitPercent=43;
    enum class Divider {None,Browser,Inspector,Documents,LowerDocuments};
    Divider divider=Divider::None;
    HWND dividerOwner=nullptr;
    int dividerStart=0,dividerSpan=1,inspectorSpan=1,splitSpan=1,lowerSplitSpan=1;
    unsigned dividerInitial=0;
    std::uint64_t formRevision=0;
    bool sourceMode=false,updating=false,sourceChanged=false,acceptance=false,waiting=false;
    enum Command {OpenProject=100,NewProject,Save,CloseDocument,Undo,Redo,Detach,ToggleSource,AddNode,Up,Search,Assets,Tabs,Source,Palette,Views,Status,NewAsset,AddActor,AddComponent,DeleteActor,FocusActor,AddWidget,ResetLayout,WideInspector,WideBrowser,Recovery,AddVariable,AddFunction,AddMacro,ImportAsset,DuplicateActor,CheckBuild,BuildGame,RunBuild,CancelBuild,PreviewAsset,DetachContent,ShowConsole,PlayScene,StopPlay,EditBuildProfile,AddSequenceTrack,PinDocument,NewFolder,CopyBuildProfile,DeleteBuildProfile,PickImageView,RecentBase=200};
    struct DocumentWindow {
        HWND editor=nullptr,save=nullptr,toggle=nullptr,viewPicker=nullptr,palette=nullptr,status=nullptr;
        std::unique_ptr<EditorGraphPanel> graph;
        std::unique_ptr<EditorFormPanel> graphForm,assetForm;
        std::unique_ptr<EditorScenePanel> sceneView;
        Json doc,model,inputs=Json::array(),assetFields=Json::array(),assetPath=Json::array();
        Json sceneInput;
        std::string view="event",selection,surface,cameraId,cameraDirection;
        bool cameraOutputs=false;
        bool sceneQueued=false;
        std::uint64_t inputRevision=0;
        bool updating=false,draft=false,source=false;
    };
    std::map<HWND,DocumentWindow> documentWindows;
    std::map<std::string,EditorScenePanel*> sceneSurfaces;
    unsigned nextSceneSurface=1;
    HWND splitDocument=nullptr,lowerSplitDocument=nullptr;
    bool splitBelow=false;
    RECT splitTarget{},belowTarget{},splitDivider{},lowerSplitDivider{},inspectorDivider{};
    std::shared_ptr<EditorD3D12Surface::Graphics> graphics;
    enum DocumentControl {DocSource=1,DocSave=2,DocToggle=3,DocView=4,DocPalette=5,DocAdd=6,DocReload=7,DocDock=8};
    static constexpr Command EditTransition=static_cast<Command>(190);
    static constexpr Command EditSequenceCurve=static_cast<Command>(191);
    static constexpr Command SplitDocument=static_cast<Command>(192);
    static constexpr Command ShowCurve=static_cast<Command>(193);
    static constexpr Command RecordTake=static_cast<Command>(194);
    static constexpr Command EditTileBrush=static_cast<Command>(195);
    static constexpr Command EditSpriteFrames=static_cast<Command>(196);
    static constexpr Command PlaySpriteAnimation=static_cast<Command>(197);
    static constexpr Command ShowAudioWaveform=static_cast<Command>(198);
    static constexpr Command PlayAudioPreview=static_cast<Command>(199);
    static constexpr Command RefreshMaterialFunction=static_cast<Command>(189);
    static constexpr Command SplitDocumentBelow=static_cast<Command>(188);
    static constexpr Command NewCppClass=static_cast<Command>(187);
    static constexpr Command CompileCpp=static_cast<Command>(186);
    static constexpr Command ExternalCpp=static_cast<Command>(185);
    static constexpr Command CppBlueprint=static_cast<Command>(184);
    static constexpr Command FolderBack=static_cast<Command>(183);
    static constexpr Command FolderForward=static_cast<Command>(182);
    static constexpr Command FolderPath=static_cast<Command>(181);
    static constexpr Command RenameAsset=static_cast<Command>(180);
    static constexpr Command WidgetAnchor=static_cast<Command>(179);
    static constexpr Command WidgetMobile=static_cast<Command>(178);
    static constexpr Command TranslateActor=static_cast<Command>(177),RotateActor=static_cast<Command>(176),ScaleActor=static_cast<Command>(175);
    static constexpr Command AddDispatcher=static_cast<Command>(174),AddInterface=static_cast<Command>(173);
    static constexpr Command ContinuePlay=static_cast<Command>(172),StepPlay=static_cast<Command>(171);
    static constexpr Command EditSymbol=static_cast<Command>(170);
    static constexpr Command ContentFolders=static_cast<Command>(169),ContentType=static_cast<Command>(168),ContentRecursive=static_cast<Command>(167),ContentTiles=static_cast<Command>(166);
    static const std::array<std::pair<const char*,const wchar_t*>,8>& viewportDirections(){
        static const std::array<std::pair<const char*,const wchar_t*>,8> values={{{"3d",L"원근"},{"2d",L"2D · XY"},{"top",L"위"},{"bottom",L"아래"},{"front",L"앞"},{"back",L"뒤"},{"left",L"왼쪽"},{"right",L"오른쪽"}}};
        return values;
    }
    static constexpr Command ModelSettings=static_cast<Command>(165),ModelSubassets=static_cast<Command>(164),ModelReimport=static_cast<Command>(163),ModelFocus=static_cast<Command>(162);
    static constexpr Command EditTakeInheritance=static_cast<Command>(161),ApplyTakePreset=static_cast<Command>(160),CreateTakePreset=static_cast<Command>(159);
    static constexpr Command InspectPlay=static_cast<Command>(158),RecordAudio=static_cast<Command>(157),SaveCapturedMix=static_cast<Command>(156);
    static constexpr Command ConfigureWorld=static_cast<Command>(155),EditWorld=static_cast<Command>(154);
    static constexpr Command MeshSelection=static_cast<Command>(153),MeshAdvanced=static_cast<Command>(152);
    static constexpr Command MeshUVView=static_cast<Command>(151),MeshUVFit=static_cast<Command>(150);
    static constexpr Command MeshAtlasStart=static_cast<Command>(149),MeshAtlasCancel=static_cast<Command>(148);
    static constexpr UINT redockMessage=WM_APP+41;
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
                    else if(const auto scene=sceneSurfaces.find(surface);scene!=sceneSurfaces.end())result["value"]=scene->second->render(reply,acceptance);
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
        INITCOMMONCONTROLSEX controls{sizeof(controls),ICC_TAB_CLASSES|ICC_LISTVIEW_CLASSES|ICC_TREEVIEW_CLASSES};InitCommonControlsEx(&controls);
        font=CreateFontW(-16,0,0,0,FW_NORMAL,FALSE,FALSE,FALSE,DEFAULT_CHARSET,0,0,CLEARTYPE_QUALITY,0,L"Segoe UI");
        search=control(L"EDIT",L"",WS_BORDER|ES_AUTOHSCROLL,Search);SendMessageW(search,EM_SETCUEBANNER,TRUE,LPARAM(L"에셋 검색"));
        folderBack=control(L"BUTTON",L"←",BS_PUSHBUTTON,FolderBack);
        folderForward=control(L"BUTTON",L"→",BS_PUSHBUTTON,FolderForward);
        folderPath=control(L"BUTTON",L"프로젝트",BS_LEFT,FolderPath);
        EnableWindow(folderBack,FALSE);EnableWindow(folderForward,FALSE);
        folderTree=control(WC_TREEVIEWW,L"",WS_BORDER|TVS_HASLINES|TVS_LINESATROOT|TVS_HASBUTTONS|TVS_SHOWSELALWAYS,ContentFolders);
        SendMessageW(folderTree,CCM_SETUNICODEFORMAT,TRUE,0);
        assetType=control(L"COMBOBOX",L"",CBS_DROPDOWNLIST|WS_VSCROLL,ContentType);
        assetRecursive=control(L"BUTTON",L"하위",BS_AUTOCHECKBOX,ContentRecursive);
        SendMessageW(assetRecursive,BM_SETCHECK,BST_CHECKED,0);
        assetTiles=control(L"BUTTON",L"격자",BS_AUTOCHECKBOX,ContentTiles);
        SendMessageW(assetType,CB_ADDSTRING,0,LPARAM(L"모든 유형"));SendMessageW(assetType,CB_SETCURSEL,0,0);
        files=control(WC_LISTVIEWW,L"",WS_BORDER|LVS_REPORT|LVS_OWNERDATA|LVS_SINGLESEL|LVS_NOCOLUMNHEADER|LVS_SHOWSELALWAYS|LVS_SHAREIMAGELISTS,Assets);
        SendMessageW(files,CCM_SETUNICODEFORMAT,TRUE,0);
        assetIcons=ImageList_Create(GetSystemMetrics(SM_CXSMICON),GetSystemMetrics(SM_CYSMICON),ILC_COLOR32|ILC_MASK,2,0);
        if(!assetIcons)throw std::runtime_error("콘텐츠 아이콘 목록을 만들지 못했어요.");
        for(auto id:{SIID_FOLDER,SIID_DOCNOASSOC}){
            SHSTOCKICONINFO icon{sizeof(icon)};
            if(FAILED(SHGetStockIconInfo(id,SHGSI_ICON|SHGSI_SMALLICON,&icon)))throw std::runtime_error("콘텐츠 아이콘을 읽지 못했어요.");
            const int index=ImageList_AddIcon(assetIcons,icon.hIcon);
            DestroyIcon(icon.hIcon);
            if(index<0)throw std::runtime_error("콘텐츠 아이콘을 등록하지 못했어요.");
        }
        ListView_SetImageList(files,assetIcons,LVSIL_SMALL);
        if(!SetWindowSubclass(files,fileProcedure,1,reinterpret_cast<DWORD_PTR>(this)))throw std::runtime_error("콘텐츠 드래그를 초기화하지 못했어요.");
        LVCOLUMNW column{};column.mask=LVCF_WIDTH;column.cx=240;ListView_InsertColumn(files,0,&column);
        tabs=control(WC_TABCONTROLW,L"",WS_CLIPSIBLINGS,Tabs);
        if(!SetWindowSubclass(tabs,tabProcedure,1,reinterpret_cast<DWORD_PTR>(this)))throw std::runtime_error("문서 탭 입력을 초기화하지 못했어요.");
        source=control(L"EDIT",L"",WS_BORDER|WS_VSCROLL|WS_HSCROLL|ES_MULTILINE|ES_WANTRETURN|ES_AUTOVSCROLL|ES_AUTOHSCROLL,Source);
        SendMessageW(source,EM_SETLIMITTEXT,0,0);
        palette=control(L"COMBOBOX",L"",CBS_DROPDOWNLIST|WS_VSCROLL,Palette);
        views=control(L"COMBOBOX",L"",CBS_DROPDOWNLIST|WS_VSCROLL,Views);
        status=control(L"STATIC",L"프로젝트를 열거나 새 프로젝트를 만드세요.",SS_LEFT,Status);
        graph.attach(window,instance,[this](const Json& event){
            try{
                if(event.at("event")=="edit")editGraph(event);
                if(event.at("event")=="palette"||event.at("event")=="find")searchGraph(event,graph,model,graphSelection,nullptr);
                if(event.at("event")=="comment"&&document.value("kind",std::string())=="blueprint"){
                    auto input=event;input["action"]="comment";editGraph(input);
                }
                if(event.at("event")=="select"){
                    const auto id=event.at("id").get<std::string>();
                    if(graphSelection!=id&&gameplayGraphOpen())fieldPath=Json::array();
                    selectedTransition.clear();graphSelection=id;refreshGraphInputs();layout();queuePreview();
                }
                if(event.at("event")=="graphicsError")SetWindowTextW(status,wide(event.at("message")).c_str());
                if(event.at("event")=="key"&&event.value("ctrl",false)){
                    const auto key=event.value("key",std::string());
                    if(key=="s")perform(Save);else if(key=="z")perform(Undo);else if(key=="y")perform(Redo);
                    else if(key=="c"||key=="v"||key=="d")graphClipboardAction(key,graph,view,graphSelection,document,nullptr);
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
                if(!selectedTransition.empty()){
                    const auto& field=fields.at(i);
                    Json input={{"view",view},{"id",selectedTransition},{"key",field.at("key")},{"expectedRevision",document.at("revision")}};
                    if(field.contains("index"))input["index"]=field.at("index");
                    if(action=="change")input["value"]=event.contains("checked")?event.at("checked"):event.at("value");
                    auto changed=request("graph.transitionEdit",input);
                    if(field.at("key")=="delete")selectedTransition.clear();
                    showDocument(std::move(changed));return;
                }
                if(document.value("graph",false)&&!gameplayGraphOpen()){
                    const auto edit=graphInputEdit(graphInputs.at(i),graphSelection,event);
                    if(!edit.is_null())editGraph(edit);
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
        previewViewport.attach(window,instance,[this](Json value){mergeCameraInput(previewInput,std::move(value));queuePreview();});
        assetCanvas.attach(window,instance,[this](const Json& event){
            try{
                const auto action=event.at("event").get<std::string>();
                if(action=="graphicsError"){SetWindowTextW(status,wide(event.at("message")).c_str());return;}
                if(meshUVOpen&&action.rfind("uv",0)==0){editMeshUVView(event);return;}
                if(action=="select"&&widgetOpen()){
                    widgetSelection=event.at("id").get<std::string>();fieldPath=Json::array();refreshForm();return;
                }
                if(action=="key"&&widgetOpen()&&event.value("ctrl",false)&&event.at("key")=="d"&&!widgetSelection.empty()){
                    editWidget({{"action","duplicate"},{"id",widgetSelection}});return;
                }
                if(action=="timelineSelect"&&timelineOpen()){
                    timelineTrack=event.at("track");timelineItem=event.at("id");
                    timelineKey=event.at("index");
                    fieldPath=Json::array();refreshForm();return;
                }
                if(action=="curveSelect"&&curveView){
                    timelineKey=event.at("index");timelineChannel=event.at("component");
                    refreshCurveHandles();return;
                }
                if((action=="curveMove"||action=="curveHandleMove")&&curveView){
                    auto input=event;input["expectedRevision"]=document.at("revision");
                    input["channel"]=event.at("component");
                    auto edited=request(action=="curveMove"?"timeline.curveKeyMove":"timeline.curveHandleMove",input);
                    if(edited.contains("keyIndex"))assetCanvas.remapCurveSelection(edited.value("indexMap",Json::object()),timelineKey,edited.at("keyIndex"));
                    timelineKey=edited.value("keyIndex",timelineKey);
                    showDocument(std::move(edited));return;
                }
                if(action=="tilePaint"&&tilemapOpen()){
                    auto input=event;input["expectedRevision"]=document.at("revision");
                    input["layer"]=tileLayer;input["index"]=tileIndex;
                    input["tool"]=event.value("erase",false)?"erase":tileTool;
                    showDocument(request("tilemap.paint",input));return;
                }
                if(action=="tileScroll"&&tilemapOpen()){
                    const auto axis=event.value("horizontal",false)?0u:1u;
                    tileOrigin[axis]=std::max(0LL,tileOrigin[axis]+event.at("amount").get<int>());
                    refreshTilemap();return;
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
                            const auto asset=chooseTimelineAsset(type);
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
        AppendMenuW(file,MF_STRING,NewCppClass,L"새 C++ 클래스");
        AppendMenuW(file,MF_STRING,CppBlueprint,L"C++ 클래스로 블루프린트 생성");
        AppendMenuW(file,MF_STRING,ExternalCpp,L"소스를 외부 편집기에서 열기");
        AppendMenuW(file,MF_STRING,NewFolder,L"새 폴더");
        AppendMenuW(file,MF_STRING,ImportAsset,L"에셋 가져오기");
        AppendMenuW(file,MF_STRING,RenameAsset,L"선택한 에셋 이름 바꾸기");
        AppendMenuW(file,MF_STRING,Save,L"문서 저장\tCtrl+S");
        AppendMenuW(file,MF_STRING,CloseDocument,L"문서 닫기\tCtrl+W");
        AppendMenuW(file,MF_STRING,Recovery,L"저장 충돌 복구");
        AppendMenuW(edit,MF_STRING,Undo,L"되돌리기\tCtrl+Z");
        AppendMenuW(edit,MF_STRING,Redo,L"다시 적용\tCtrl+Y");
        AppendMenuW(edit,MF_STRING,AddNode,L"선택한 종류의 노드 추가");
        AppendMenuW(edit,MF_STRING,EditTransition,L"애니메이션 전이 편집");
        AppendMenuW(edit,MF_STRING,EditSequenceCurve,L"시퀀스 곡선 설정");
        AppendMenuW(edit,MF_STRING,EditTileBrush,L"타일맵 붓 설정");
        AppendMenuW(edit,MF_STRING,EditSpriteFrames,L"스프라이트 애니메이션 프레임");
        AppendMenuW(edit,MF_STRING,WidgetAnchor,L"위젯 앵커 프리셋");
        AppendMenuW(edit,MF_STRING,WidgetMobile,L"모바일 조작 추가");
        AppendMenuW(edit,MF_STRING,RefreshMaterialFunction,L"머테리얼 함수 핀 갱신");
        AppendMenuW(edit,MF_STRING,AddVariable,L"블루프린트 변수 추가");
        AppendMenuW(edit,MF_STRING,AddFunction,L"블루프린트 함수 추가");
        AppendMenuW(edit,MF_STRING,AddMacro,L"블루프린트 매크로 추가");
        AppendMenuW(edit,MF_STRING,AddDispatcher,L"이벤트 디스패처 추가");
        AppendMenuW(edit,MF_STRING,AddInterface,L"인터페이스 메시지 추가");
        AppendMenuW(edit,MF_STRING,EditSymbol,L"디스패처·인터페이스 핀 편집");
        AppendMenuW(edit,MF_STRING,AddWidget,L"위젯 요소 추가");
        AppendMenuW(edit,MF_STRING,AddSequenceTrack,L"시퀀스 트랙 추가");
        AppendMenuW(edit,MF_STRING,EditTakeInheritance,L"녹화 프리셋 상속 편집");
        AppendMenuW(edit,MF_STRING,ApplyTakePreset,L"시퀀스에 녹화 프리셋 적용");
        AppendMenuW(edit,MF_STRING,CreateTakePreset,L"시퀀스 녹화 설정을 프리셋으로 저장");
        AppendMenuW(viewMenu,MF_STRING,Detach,L"문서 창 분리 / 합치기");
        AppendMenuW(viewMenu,MF_STRING,PinDocument,L"문서를 독립 창에 열기");
        AppendMenuW(viewMenu,MF_STRING,SplitDocument,L"문서를 오른쪽에 열기");
        AppendMenuW(viewMenu,MF_STRING,SplitDocumentBelow,L"문서를 아래에 열기");
        AppendMenuW(viewMenu,MF_STRING,ShowCurve,L"시퀀스 곡선 그래프 전환");
        AppendMenuW(viewMenu,MF_STRING,PlaySpriteAnimation,L"스프라이트 애니메이션 미리보기 재생 / 중지");
        AppendMenuW(viewMenu,MF_STRING,ShowAudioWaveform,L"오디오 파형 표시");
        AppendMenuW(viewMenu,MF_STRING,PlayAudioPreview,L"오디오 미리듣기 / 중지");
        AppendMenuW(viewMenu,MF_STRING,DetachContent,L"콘텐츠 브라우저 분리 / 합치기");
        AppendMenuW(viewMenu,MF_STRING,ShowConsole,L"출력 로그 표시 / 숨기기");
        AppendMenuW(viewMenu,MF_STRING,ToggleSource,L"편집 화면 / 소스 전환");
        AppendMenuW(viewMenu,MF_STRING,Up,L"상위 폴더\tAlt+↑");
        AppendMenuW(viewMenu,MF_STRING,WideBrowser,L"콘텐츠 브라우저 너비 변경");
        AppendMenuW(viewMenu,MF_STRING,WideInspector,L"속성 패널 너비 변경");
        AppendMenuW(viewMenu,MF_STRING,ResetLayout,L"기본 배치 복원");
        AppendMenuW(viewMenu,MF_STRING,PreviewAsset,L"에셋 3D 미리보기");
        AppendMenuW(viewMenu,MF_STRING,PickImageView,L"텍스처 밉 / 면 / 슬라이스 선택");
        AppendMenuW(viewMenu,MF_STRING,ModelFocus,L"3D 에셋 미리보기 초점");
        AppendMenuW(edit,MF_STRING,ModelSettings,L"모델 단위·방향·변환");
        AppendMenuW(edit,MF_STRING,ModelSubassets,L"모델 하위 에셋 편집");
        AppendMenuW(edit,MF_STRING,ModelReimport,L"원본 모델 다시 가져오기");
        AppendMenuW(edit,MF_STRING,ConfigureWorld,L"지형·폴리지 도구 설정");
        AppendMenuW(edit,MF_STRING,EditWorld,L"월드 에셋 편집");
        AppendMenuW(edit,MF_STRING,MeshSelection,L"메시 선택 모드");
        AppendMenuW(edit,MF_STRING,MeshAdvanced,L"메시 간선·영역·노멀·UV 도구");
        AppendMenuW(edit,MF_STRING,MeshAtlasStart,L"UV 아틀라스 생성");
        AppendMenuW(edit,MF_STRING,MeshAtlasCancel,L"UV 아틀라스 작업 취소");
        AppendMenuW(viewMenu,MF_STRING,MeshUVView,L"메시 UV0·UV1 보기 / 3D 보기");
        AppendMenuW(viewMenu,MF_STRING,MeshUVFit,L"메시 UV 전체 보기");
        AppendMenuW(sceneMenu,MF_STRING,AddActor,L"오브젝트 추가");
        AppendMenuW(sceneMenu,MF_STRING,AddComponent,L"컴포넌트 추가");
        AppendMenuW(sceneMenu,MF_STRING,DeleteActor,L"선택 오브젝트 삭제");
        AppendMenuW(sceneMenu,MF_STRING,DuplicateActor,L"선택 오브젝트 복제");
        AppendMenuW(sceneMenu,MF_STRING,FocusActor,L"선택 오브젝트에 초점\tF");
        AppendMenuW(sceneMenu,MF_STRING,TranslateActor,L"이동 도구\tW");
        AppendMenuW(sceneMenu,MF_STRING,RotateActor,L"회전 도구\tE");
        AppendMenuW(sceneMenu,MF_STRING,ScaleActor,L"크기 도구\tR");
        AppendMenuW(sceneMenu,MF_SEPARATOR,0,nullptr);
        AppendMenuW(sceneMenu,MF_STRING,PlayScene,L"플레이\tF5");
        AppendMenuW(sceneMenu,MF_STRING,InspectPlay,L"중단점 위치·변수·관찰값");
        AppendMenuW(sceneMenu,MF_STRING,RecordAudio,L"플레이하고 게임 믹스 WAV 녹음");
        AppendMenuW(sceneMenu,MF_STRING,SaveCapturedMix,L"녹음한 WAV 다시 저장");
        AppendMenuW(sceneMenu,MF_STRING,StopPlay,L"플레이 중지\tShift+F5");
        AppendMenuW(sceneMenu,MF_STRING,ContinuePlay,L"블루프린트 계속 실행");
        AppendMenuW(sceneMenu,MF_STRING,StepPlay,L"블루프린트 한 단계 실행");
        AppendMenuW(sceneMenu,MF_STRING,RecordTake,L"선택 오브젝트 녹화");
        AppendMenuW(buildMenu,MF_STRING,CheckBuild,L"빌드 검사");
        AppendMenuW(buildMenu,MF_STRING,EditBuildProfile,L"빌드 프로필 설정");
        AppendMenuW(buildMenu,MF_STRING,CopyBuildProfile,L"빌드 프로필 복제");
        AppendMenuW(buildMenu,MF_STRING,DeleteBuildProfile,L"빌드 프로필 삭제");
        AppendMenuW(buildMenu,MF_STRING,CompileCpp,L"C++ 클래스 컴파일");
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
        MoveWindow(folderBack,5,5,28,27,TRUE);MoveWindow(folderForward,36,5,28,27,TRUE);
        MoveWindow(folderPath,68,5,std::max(1,browserWidth-73),27,TRUE);
        MoveWindow(search,5,36,std::max(1,browserWidth-10),27,TRUE);
        const int treeHeight=std::clamp(int(browser.bottom)/4,65,200);
        MoveWindow(assetType,5,66,std::max(1,browserWidth-113),290,TRUE);
        MoveWindow(assetRecursive,browserWidth-104,66,48,24,TRUE);
        MoveWindow(assetTiles,browserWidth-54,66,48,24,TRUE);
        MoveWindow(folderTree,5,94,std::max(1,browserWidth-10),treeHeight,TRUE);
        MoveWindow(files,5,99+treeHeight,std::max(1,browserWidth-10),std::max(1,int(browser.bottom)-treeHeight-(contentWindow?105:124)),TRUE);
        ListView_SetColumnWidth(files,0,std::max(1,browserWidth-31));
        MoveWindow(tabs,left,3,std::max(1,width-left-5),29,TRUE);
        MoveWindow(status,8,height-22,std::max(1,width-16),20,TRUE);
        const int logHeight=consoleVisible?std::min(185,std::max(0,height/3)):0;
        console.update({{"rect",{left+5,height-logHeight-24,std::max(1,width-left-11),logHeight}},{"visible",logHeight>0}});
        const HWND owner=detached?detached:window;
        RECT work{};GetClientRect(owner,&work);const int x=detached?5:left+5,y=detached?4:36;
        const int fullWidth=std::max(1,int(work.right)-x-6);
        const int fullHeight=std::max(1,int(work.bottom)-y-(detached?6:25+logHeight));
        const bool splitShown=splitDocument&&!detached&&(splitBelow?fullHeight>=380:fullWidth>=560);
        const int splitWidth=splitShown&&!splitBelow?std::clamp(fullWidth*int(splitPercent)/100,250,fullWidth-250):0;
        const bool lowerShown=lowerSplitDocument&&!detached&&fullHeight>=380;
        const auto lowerSize=lowerSplitDocument?lowerSplitPercent:splitPercent;
        const int splitHeight=lowerShown||splitShown&&splitBelow?std::clamp(fullHeight*int(lowerSize)/100,165,fullHeight-165):0;
        const int w=fullWidth-(splitWidth?splitWidth+5:0),bodyHeight=fullHeight-(splitHeight?splitHeight+5:0);
        splitTarget={width-std::max(120,fullWidth/5),60,width,height-logHeight-24};
        belowTarget={x,height-logHeight-25-std::max(85,fullHeight/5),splitTarget.left,height-logHeight-24};
        splitDivider={};lowerSplitDivider={};splitSpan=splitBelow?fullHeight:fullWidth;lowerSplitSpan=fullHeight;
        if(splitDocument){
            if(splitShown){
                splitDivider=splitBelow?RECT{x,y+bodyHeight,x+w,y+bodyHeight+5}:RECT{x+w,y,x+w+5,y+fullHeight};
                MoveWindow(splitDocument,splitBelow?x:x+w+5,splitBelow?y+bodyHeight+5:y,splitBelow?w:splitWidth,splitBelow?splitHeight:fullHeight,TRUE);
            }
            ShowWindow(splitDocument,splitShown?SW_SHOWNOACTIVATE:SW_HIDE);
        }
        if(lowerSplitDocument){
            if(lowerShown){lowerSplitDivider={x,y+bodyHeight,x+w,y+bodyHeight+5};MoveWindow(lowerSplitDocument,x,y+bodyHeight+5,w,splitHeight,TRUE);}
            ShowWindow(lowerSplitDocument,lowerShown?SW_SHOWNOACTIVATE:SW_HIDE);
        }
        const bool graphShown=document.value("graph",false)&&!sourceMode;
        const bool sceneShown=document.value("kind",std::string())=="scene"&&!sourceMode;
        const bool canvasShown=(timelineOpen()||widgetOpen()||imageOpen()||tilemapOpen()||audioAssetOpen()||meshUVOpen)&&!sourceMode;
        const bool formShown=document.value("form",false)&&!sourceMode&&!sceneShown&&!canvasShown;
        const int top=graphShown||sceneShown?y+32:y,h=std::max(1,y+bodyHeight-top);
        MoveWindow(views,x,y,std::min(230,w/2),220,TRUE);MoveWindow(palette,x+std::min(235,w/2),y,std::max(1,w-std::min(235,w/2)),300,TRUE);
        ShowWindow(views,(graphShown&&!model.value("views",Json::array()).empty())||sceneShown?SW_SHOW:SW_HIDE);
        ShowWindow(palette,graphShown?SW_SHOW:SW_HIDE);
        MoveWindow(source,x,top,w,h,TRUE);
        ShowWindow(source,document.contains("path")&&!graphShown&&!formShown&&!sceneShown&&!canvasShown?SW_SHOW:SW_HIDE);
        const int inspectorWidth=graphShown&&w>=365?std::min(240,w*42/100):0;
        const bool previewShown=previewOpen&&canPreview()&&!sourceMode&&!meshUVOpen;
        const int previewHeight=previewShown&&graphShown?std::max(1,h/3):0;
        graph.layout(x,top,w-inspectorWidth,h-previewHeight,graphShown);
        const int side=sceneShown?std::min(std::clamp(int(w*inspectorPercent/100),190,420),std::max(0,w-160)):0;
        const int split=std::max(1,h*40/100);
        hierarchy.reparent(owner);
        hierarchy.update({{"rect",{x+w-side+3,top,std::max(1,side-3),split}},{"visible",sceneShown&&side>0}});
        viewport.layout(owner,x,top,std::max(1,w-side-3),h,sceneShown);
        if(sceneShown)queueViewport();
        const int assetSide=canvasShown?std::min(std::clamp(int(w*inspectorPercent/100),190,420),std::max(0,w-160)):0;
        const int adjustableSide=sceneShown?side:assetSide;
        inspectorSpan=w;inspectorDivider=adjustableSide?RECT{x+w-adjustableSide-3,top,x+w-adjustableSide+3,top+h}:RECT{};
        if(sceneShown)form.update({{"rect",{x+w-side+3,top+split,std::max(1,side-3),h-split}},{"visible",side>0}});
        else if(canvasShown)form.update({{"rect",{x+w-assetSide+3,top,std::max(1,assetSide-3),h}},{"visible",assetSide>0}});
        else if(graphShown)form.update({{"rect",{x+w-inspectorWidth,top,inspectorWidth,h}},{"visible",inspectorWidth>0}});
        else if(previewShown)form.update({{"rect",{x+std::max(1,w/2),top,w-w/2,h}},{"visible",true}});
        else form.update({{"rect",{x,top,w,h}},{"visible",formShown}});
        assetCanvas.layout(x,top,std::max(1,w-assetSide-3),h,canvasShown);
        if(widgetOpen()&&canvasShown)SetTimer(window,3,100,nullptr);
        if(tilemapOpen()&&canvasShown)SetTimer(window,7,60,nullptr);
        previewViewport.layout(owner,x,top+(graphShown?h-previewHeight:0),graphShown?std::max(1,w-inspectorWidth):std::max(1,w/2),graphShown?previewHeight:h,previewShown);
        if(previewShown)queuePreview();
        if(meshUVOpen&&!sourceMode)SetTimer(window,11,60,nullptr);
    }
    Divider dividerAt(HWND owner,int x,int y)const{
        RECT rect{};GetClientRect(owner,&rect);
        if(owner==window&&PtInRect(&lowerSplitDivider,{x,y}))return Divider::LowerDocuments;
        if(owner==window&&PtInRect(&splitDivider,{x,y}))return Divider::Documents;
        if(owner==window&&!contentWindow&&y>=32){
            const int edge=std::clamp(int(rect.right*browsePercent/100),150,460);
            if(std::abs(edge-x)<=4)return Divider::Browser;
        }
        return owner==(detached?detached:window)&&PtInRect(&inspectorDivider,{x,y})?Divider::Inspector:Divider::None;
    }
    bool moveDivider(HWND owner,UINT message,LPARAM l){
        const int x=short(LOWORD(l)),y=short(HIWORD(l));
        if(message==WM_LBUTTONDOWN){
            divider=dividerAt(owner,x,y);
            if(divider==Divider::None)return false;
            RECT rect{};GetClientRect(owner,&rect);
            const bool vertical=divider==Divider::LowerDocuments||divider==Divider::Documents&&splitBelow;
            dividerOwner=owner;dividerStart=vertical?y:x;
            dividerInitial=divider==Divider::Browser?browsePercent:divider==Divider::Documents?splitPercent:divider==Divider::LowerDocuments?lowerSplitPercent:inspectorPercent;
            dividerSpan=std::max(1,divider==Divider::Browser?int(rect.right):divider==Divider::Documents?splitSpan:divider==Divider::LowerDocuments?lowerSplitSpan:inspectorSpan);
            SetCapture(owner);SetCursor(LoadCursorW(nullptr,vertical?IDC_SIZENS:IDC_SIZEWE));return true;
        }
        if(dividerOwner!=owner)return false;
        if(message==WM_CAPTURECHANGED){dividerOwner=nullptr;divider=Divider::None;return true;}
        if(message==WM_LBUTTONUP){ReleaseCapture();return true;}
        if(message!=WM_MOUSEMOVE)return false;
        const int direction=divider==Divider::Browser?1:-1;
        const bool documents=divider==Divider::Documents||divider==Divider::LowerDocuments;
        const int position=divider==Divider::LowerDocuments||divider==Divider::Documents&&splitBelow?y:x;
        const int next=int(dividerInitial)+direction*(position-dividerStart)*100/dividerSpan;
        auto& size=divider==Divider::Browser?browsePercent:divider==Divider::Documents?splitPercent:divider==Divider::LowerDocuments?lowerSplitPercent:inspectorPercent;
        const auto clamped=unsigned(std::clamp(next,documents?25:18,divider==Divider::Browser?40:documents?75:42));
        if(size!=clamped){size=clamped;layout();}
        return true;
    }
    void setBrowserTiles(bool enabled){
        const auto mode=enabled?LV_VIEW_SMALLICON:LV_VIEW_DETAILS;
        if(SendMessageW(files,LVM_SETVIEW,mode,0)!=1)throw std::runtime_error("콘텐츠 보기 방식을 바꾸지 못했어요.");
        browserTiles=enabled;
        SendMessageW(assetTiles,BM_SETCHECK,enabled?BST_CHECKED:BST_UNCHECKED,0);
    }
    void refreshFiles(){
        if(projectTitle.empty())return;
        if(assetTypes.empty()){
            assetTypes=request("content.types");
            for(const auto& row:assetTypes)SendMessageW(assetType,CB_ADDSTRING,0,LPARAM(wide(row.at("label")).c_str()));
            for(const auto* label:{L"이미지 파일",L"모델 파일",L"미디어 파일",L"C++·셰이더"})SendMessageW(assetType,CB_ADDSTRING,0,LPARAM(label));
            for(const auto* kind:{"texture","model","media","code"})assetTypes.push_back({{"kind",kind}});
        }
        const auto index=SendMessageW(assetType,CB_GETCURSEL,0,0);
        const auto type=index>0?assetTypes.at(index-1).at("kind").get<std::string>():"all";
        const auto query=utf8(controlText(search));
        contentScanId=request("content.listStart",{{"folder",folder},{"query",query},{"type",type},
            {"recursive",!query.empty()&&SendMessageW(assetRecursive,BM_GETCHECK,0,0)==BST_CHECKED}}).at("id");
        if(acceptance){
            const auto deadline=GetTickCount64()+10000;
            while(!pollContentList()){
                if(GetTickCount64()>=deadline)throw std::runtime_error("Native asset scan timed out");
                Sleep(10);
            }
        }else SetTimer(window,10,35,nullptr);
    }
    bool pollContentList(){
        if(!contentScanId)return true;
        auto state=request("content.listStatus",{{"id",contentScanId}});
        const auto status=state.at("status").get<std::string>();
        if(status=="running")return false;
        contentScanId=0;
        if(status=="canceled")return true;
        if(status=="error")throw std::runtime_error(state.at("error").get<std::string>());
        const auto& result=state.at("result");
        const int count=ListView_GetItemCount(files);
        const int selected=ListView_GetNextItem(files,-1,LVNI_SELECTED);
        const auto prior=selected>=0&&selected<count&&selected<int(entries.size())?entries.at(selected).at("path").get<std::string>():"";
        entries=std::move(state.at("result").at("entries"));
        updateFolderTree(result.at("folders"));
        ListView_SetItemCountEx(files,int(entries.size()),LVSICF_NOINVALIDATEALL);
        if(!prior.empty()){
            ListView_SetItemState(files,-1,0,LVIS_SELECTED|LVIS_FOCUSED);
            const auto match=std::find_if(entries.begin(),entries.end(),[&](const Json& row){return row.at("path")==prior;});
            if(match!=entries.end())ListView_SetItemState(files,int(match-entries.begin()),LVIS_SELECTED|LVIS_FOCUSED,LVIS_SELECTED|LVIS_FOCUSED);
        }
        InvalidateRect(files,nullptr,FALSE);
        return true;
    }
    void updateFolderTree(const Json& rows){
        if(browserFolders==rows&&folderTreePath==folder)return;
        refreshingFolders=true;browserFolders=rows;folderTreePath=folder;
        SendMessageW(folderTree,WM_SETREDRAW,FALSE,0);TreeView_DeleteAllItems(folderTree);
        std::map<std::string,HTREEITEM> items;
        const auto add=[&](const std::wstring& label,HTREEITEM parent,LPARAM index){
            TVINSERTSTRUCTW row{};row.hParent=parent;row.hInsertAfter=TVI_LAST;row.item.mask=TVIF_TEXT|TVIF_PARAM;row.item.pszText=const_cast<wchar_t*>(label.c_str());row.item.lParam=index;
            return reinterpret_cast<HTREEITEM>(SendMessageW(folderTree,TVM_INSERTITEMW,0,LPARAM(&row)));
        };
        items[""]=add(L"프로젝트",TVI_ROOT,0);
        for(std::size_t i=0;i<rows.size();++i){
            const auto& row=rows.at(i);const auto path=row.at("path").get<std::string>();const auto slash=path.rfind('/');
            const auto parent=items.find(slash==std::string::npos?"":path.substr(0,slash));
            if(parent!=items.end())items[path]=add(wide(row.at("name")),parent->second,LPARAM(i+1));
        }
        auto active=items.find(folder);
        if(active!=items.end())TreeView_SelectItem(folderTree,active->second);
        for(auto path=folder;;){
            if(const auto row=items.find(path);row!=items.end())TreeView_Expand(folderTree,row->second,TVE_EXPAND);
            if(path.empty())break;const auto slash=path.rfind('/');path=slash==std::string::npos?"":path.substr(0,slash);
        }
        SendMessageW(folderTree,WM_SETREDRAW,TRUE,0);InvalidateRect(folderTree,nullptr,TRUE);refreshingFolders=false;
    }
    void showFolder(){
        const auto caption=folder.empty()?std::wstring(L"프로젝트"):wide(folder);
        SetWindowTextW(folderPath,caption.c_str());
        EnableWindow(folderBack,folderPosition>0);
        EnableWindow(folderForward,folderPosition+1<folderHistory.size());
        updating=true;SetWindowTextW(search,L"");updating=false;
        KillTimer(window,1);
        entries=Json::array();ListView_SetItemCountEx(files,0,0);
        refreshFiles();
    }
    void navigateFolder(std::string next){
        queuedFolder.reset();
        if(!folderHistory.empty()&&folder==next)return;
        if(!folderHistory.empty())folderHistory.resize(folderPosition+1);
        folderHistory.push_back(next);folderPosition=folderHistory.size()-1;
        folder=std::move(next);showFolder();
    }
    void refreshGraph(const Json& updated=Json()){
        if(!document.value("graph",false))return;
        if(updated.is_null()){
            try{model=request("graph.read",{{"view",view}});}
            catch(const std::exception&){
                if(view=="event")throw;
                view="event";graphSelection.clear();selectedTransition.clear();graph.resetView();model=request("graph.read",{{"view",view}});
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
        form.update({{"rows",graphInputRows(graphInputs)},{"revision",++formRevision}});
    }
    static Json graphInputRows(const Json& inputs){
        if(inputs.empty())return Json::array({{{"kind","message"},{"text","노드 입력과 속성을 표시해요."}}});
        Json rows=Json::array({{{"kind","heading"},{"text","노드 입력과 속성"}}});
        for(std::size_t i=0;i<inputs.size();++i){
            const auto& input=inputs.at(i);const auto& value=input.at("value");
            Json control={{"i",i},{"disabled",input.at("linked")}};
            if(input.contains("button")){control["kind"]="button";control["text"]=input.at("button");}
            else if(input.contains("options")){control["kind"]="select";control["value"]=value;control["options"]=input.at("options");}
            else if(value.is_boolean()){control["kind"]="checkbox";control["checked"]=value;}
            else{control["kind"]="text";control["value"]=value.is_string()?value.get<std::string>():value.dump();}
            rows.push_back({{"label",input.at("label")},{"controls",Json::array({std::move(control)})}});
        }
        return rows;
    }
    Json graphInputEdit(const Json& input,const std::string& selection,const Json& event){
        const auto& pin=input.at("id");
        if(pin=="refreshFunction")return {{"action","refreshFunction"},{"id",selection}};
        Json value;
        if(input.contains("assetKind")){
            const bool blend=input.at("assetKind")=="materialblend";
            const auto asset=chooseProjectAsset(blend?L"머테리얼 블렌드":L"머테리얼 레이어",blend?L".hbmaterialblend.json":L".hbmateriallayer.json");
            if(asset.empty())return nullptr;
            value=asset;
        }else if(!input.contains("button")){
            value=event.contains("checked")?event.at("checked"):event.at("value");
            if(value.is_string()&&!input.at("value").is_string())value=Json::parse(value.get<std::string>());
        }
        return {{"action",input.value("property",false)?"property":"input"},{"id",selection},{"pin",pin},{"value",std::move(value)}};
    }
    bool sceneOpen()const{return document.value("kind",std::string())=="scene";}
    bool gameplayGraphOpen()const{
        const auto kind=document.value("kind",std::string());return kind=="behaviortree"||kind=="statemachine"||kind=="animgraph";
    }
    bool modelOpen()const{return document.value("kind",std::string())=="modelimport";}
    bool worldOpen()const{
        const auto kind=document.value("kind",std::string());return kind=="terrain"||kind=="foliage"||kind=="mesh"||kind=="lod";
    }
    bool canPreview()const{return !gameplayGraphOpen()&&(document.value("graph",false)||document.value("kind",std::string())=="materialinstance"||modelOpen()||worldOpen());}
    void queuePreview(){if(previewOpen&&canPreview()&&!sourceMode)SetTimer(window,5,35,nullptr);}
    Json drawPreview(Json input=Json::object()){
        const auto size=previewViewport.size();
        if(size.cx<=0||size.cy<=0)return Json::object();
        input["width"]=std::min<LONG>(4096,size.cx);input["height"]=std::min<LONG>(4096,size.cy);input["node"]=graphSelection;
        if(worldOpen()){
            input["faces"]=Json::array();for(const auto& [face,vertices]:worldFaces)input["faces"].push_back(face);
            input["instances"]=worldInstances;input["meshVertices"]=worldVertices;input["meshEdges"]=worldEdges;
        }
        const auto result=request("asset.preview",input);
        const auto prep=result.value("shaderPreparation",Json::object());
        if(prep.value("pending",false))SetTimer(window,5,120,nullptr);
        if(!result.at("warnings").empty())SetWindowTextW(status,wide(result.at("warnings").front()).c_str());
        return result;
    }
    void clearWorldMeshSelection(){worldFaces.clear();worldVertices.clear();worldEdges.clear();}
    void editWorld(Json input){
        captureSource();input["expectedRevision"]=document.at("revision");
        showDocument(request("world.edit",input));
    }
    Json applyPreviewInput(Json input){
        const auto cmd=input.value("command",std::string());
        const auto kind=document.value("kind",std::string());
        if(worldOpen()&&cmd=="pick"&&(kind=="mesh"||(kind=="foliage"&&foliageSelect))){
            input["command"]="worldSelect";
            const auto result=drawPreview(input);
            if(!input.value("add",false)){clearWorldMeshSelection();worldInstances.clear();}
            if(result.contains("worldSelection")){
                const auto& hit=result.at("worldSelection");
                if(kind=="mesh"){
                    if(meshSelectionMode==0){
                        const int face=hit.at("face");
                        if(!worldFaces.erase(face))worldFaces.emplace(face,hit.at("vertices").get<std::vector<int>>());
                    }else if(meshSelectionMode==1){
                        auto edge=hit.at("edge").get<std::array<int,2>>();
                        if(edge[1]<edge[0])std::swap(edge[0],edge[1]);
                        if(!worldEdges.erase(edge))worldEdges.insert(edge);
                    }else{
                        const int vertex=hit.at("vertex");
                        if(!worldVertices.erase(vertex))worldVertices.insert(vertex);
                    }
                }else if(hit.contains("instance")){
                    const auto id=hit.at("instance").get<std::string>();
                    if(!worldInstances.erase(id))worldInstances.insert(id);
                }
            }
            queuePreview();
            statusText((L"선택 · "+std::to_wstring(kind=="mesh"?worldFaces.size()+worldEdges.size()+worldVertices.size():worldInstances.size())).c_str());
            return result;
        }
        if(worldOpen()&&cmd=="worldBrush"&&(kind=="terrain"||kind=="foliage")){
            auto settings=kind=="terrain"?worldBrush:foliageBrush;
            input["brushSpacing"]=settings.at("radius").get<double>()*.1;
            const auto result=drawPreview(input);
            if(result.contains("worldBrush")&&!result.at("worldBrush").empty()){
                settings["points"]=result.at("worldBrush");
                editWorld({{"action",kind=="terrain"?"brush":input.value("erase",false)?"erase":"scatter"},{"settings",settings}});
            }
            return result;
        }
        return drawPreview(std::move(input));
    }
    bool widgetOpen()const{return document.value("kind",std::string())=="widget";}
    bool tilemapOpen()const{return document.value("kind",std::string())=="tilemap";}
    bool audioAssetOpen()const{return document.value("kind",std::string())=="audioasset";}
    void stopAudioPreview(){
        if(audioPreviewPlaying){request("asset.audioStop");audioPreviewPlaying=false;}
    }
    void refreshTilemap(){
        KillTimer(window,7);
        const auto [columns,rows]=assetCanvas.tileViewport();
        auto info=request("tilemap.view",{{"x",tileOrigin[0]},{"y",tileOrigin[1]},{"columns",columns},{"rows",rows}});
        const auto atlasSource=info.at("atlasSource");
        if(tileAtlasSource!=atlasSource){
            auto atlas=request("tilemap.atlas");
            auto bytes=atlas.is_null()?std::vector<unsigned char>{}:takePixels(atlas);
            assetCanvas.updateAtlas(std::move(atlas),std::move(bytes));tileAtlasSource=atlasSource;
        }
        const auto& layers=info.at("layers");
        if(std::none_of(layers.begin(),layers.end(),[this](const Json& row){return row.at("id")==tileLayer;}))tileLayer=layers.front().at("id");
        const std::array<long long,2> end={info.at("width").get<long long>()-1,info.at("height").get<long long>()-1};
        if(tileOrigin[0]>end[0]||tileOrigin[1]>end[1]){
            tileOrigin={std::min(tileOrigin[0],end[0]),std::min(tileOrigin[1],end[1])};
            info=request("tilemap.view",{{"x",tileOrigin[0]},{"y",tileOrigin[1]},{"columns",columns},{"rows",rows}});
        }
        if(info.value("layout",std::string())=="isometric"){
            const auto reach=std::max(columns,rows)*2;
            const auto left=std::max(0LL,tileOrigin[0]-reach),top=std::max(0LL,tileOrigin[1]-reach);
            const auto right=std::min(end[0],tileOrigin[0]+reach),bottom=std::min(end[1],tileOrigin[1]+reach);
            info["tiles"]=Json::array();
            for(auto y=top;y<=bottom;y+=64)for(auto x=left;x<=right;x+=64){
                auto page=request("tilemap.view",{{"x",x},{"y",y},{"columns",std::min(64LL,right-x+1)},{"rows",std::min(64LL,bottom-y+1)}});
                auto& target=info.at("tiles").get_ref<Json::array_t&>();
                auto& source=page.at("tiles").get_ref<Json::array_t&>();
                target.insert(target.end(),std::make_move_iterator(source.begin()),std::make_move_iterator(source.end()));
            }
        }
        assetCanvas.updateTilemap(std::move(info),tileOrigin);
    }
    bool imageOpen()const{
        const auto kind=document.value("kind",std::string());
        return kind=="sprite"||kind=="spriteanimation"||kind=="texture2d"||kind=="cubemap"||kind=="texturearray"||kind=="volumetexture";
    }
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
            auto bytes=takePixels(preview);widgetPreview=std::move(preview);
            assetCanvas.updateWidget(widgetPreview,std::move(bytes),widgetSelection);
            widgetRevision=revision;
        }
    }
    static std::vector<unsigned char> takePixels(Json& preview){
        const auto count=std::size_t(preview.at("width").get<int>())*preview.at("height").get<int>()*4;
        const auto& encoded=preview.at("pixels").get_ref<const std::string&>();
        static constexpr std::string_view alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        std::vector<unsigned char> bytes;bytes.reserve(count);
        unsigned bits=0,value=0;
        for(char c:encoded){
            if(c=='=')break;
            const auto digit=alphabet.find(c);if(digit==std::string_view::npos)throw std::runtime_error("이미지 픽셀 인코딩을 확인하세요.");
            value=(value<<6)|unsigned(digit);bits+=6;
            if(bits>=8){bits-=8;bytes.push_back(static_cast<unsigned char>(value>>bits));}
        }
        if(bytes.size()!=count)throw std::runtime_error("이미지 픽셀 크기를 확인하세요.");
        preview.erase("pixels");return bytes;
    }
    void refreshImage(){
        assetCanvas.updateImage(nullptr,{});
        auto image=request("asset.imagePreview",{{"index",imageIndex},{"level",imageLevel}});
        if(!image.is_null()){
            auto bytes=takePixels(image);
            assetCanvas.updateImage(std::move(image),std::move(bytes));
        }
    }
    void refreshCurveHandles(){
        auto handles=timelineKey>=0&&timelineChannel>=0
            ?request("timeline.curveHandles",{{"track",timelineTrack},{"index",timelineKey},{"channel",timelineChannel}})
            :Json::array();
        assetCanvas.updateCurveHandles(timelineKey,timelineChannel,std::move(handles));
    }
    void stopSpritePreview(){
        spritePlayStart=0;spriteFrame=-1;KillTimer(window,8);
    }
    void spritePreviewTick(){
        if(!spritePlayStart||sourceMode||document.value("kind",std::string())!="spriteanimation"){stopSpritePreview();return;}
        auto image=request("asset.imagePreview",{{"time",double(GetTickCount64()-spritePlayStart)/1000},{"previousFrame",spriteFrame}});
        if(image.is_null()){stopSpritePreview();return;}
        const auto frame=image.at("frame");
        spriteFrame=frame.at("index");
        if(image.contains("pixels")){
            auto bytes=takePixels(image);assetCanvas.updateImage(std::move(image),std::move(bytes));
        }
        if(frame.value("finished",false))stopSpritePreview();
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
        cameraRows=Json::array();
        const int active=populateCameraViews(views,cameraRows,cameraId,cameraDirection,cameraOutputs);
        int selected=active;bool found=false;
        for(const auto& actor:sceneRows){
            if(actor.at("id")==sceneSelection)found=true;
            if(!actor.value("camera",false))continue;
            if(!cameraOutputs&&actor.at("id")==cameraId)selected=int(cameraRows.size());
            cameraRows.push_back({{"camera",actor.at("id")}});
            SendMessageW(views,CB_ADDSTRING,0,LPARAM(wide(actor.at("name")).c_str()));
        }
        if(selected==active)cameraId.clear();
        if(!found&&!sceneSelection.empty()){sceneSelection.clear();fieldPath=Json::array();}
        SendMessageW(views,CB_SETCURSEL,selected,0);refreshHierarchy();
    }
    static int populateCameraViews(HWND combo,Json& rows,const std::string& camera,const std::string& direction,bool outputs){
        SendMessageW(combo,CB_RESETCONTENT,0,0);
        rows.push_back({{"direction",""}});SendMessageW(combo,CB_ADDSTRING,0,LPARAM(L"편집기 카메라"));
        rows.push_back({{"outputs",true}});SendMessageW(combo,CB_ADDSTRING,0,LPARAM(L"게임 카메라 출력"));
        int selected=outputs?1:0;
        for(const auto& [key,label]:viewportDirections()){
            if(!outputs&&camera.empty()&&direction==key)selected=int(rows.size());
            rows.push_back({{"direction",key}});SendMessageW(combo,CB_ADDSTRING,0,LPARAM(label));
        }
        return selected;
    }
    static void selectCameraView(const Json& choice,std::string& camera,std::string& direction,bool& outputs){
        camera=choice.value("camera",std::string());direction=choice.value("direction",std::string());outputs=choice.value("outputs",false);
    }
    void selectActor(const std::string& id){
        if(!sceneOpen())return;
        if(sceneSelection!=id){fieldPath=Json::array();viewport.setHandles(Json::array());}
        sceneSelection=id;refreshHierarchy();refreshForm();
    }
    void queueViewport(Json input=Json::object()){
        if(!sceneOpen()||sourceMode)return;
        if(!input.empty()){
            if(input.value("command",std::string())=="focus")input["id"]=sceneSelection;
            mergeCameraInput(cameraInput,std::move(input));
        }
        if(!viewportQueued)viewportQueued=SetTimer(window,2,16,nullptr)!=0;
    }
    static void mergeCameraInput(Json& queued,Json input){
        if(queued.is_object()){
            const auto action=input.value("command",std::string()),previous=queued.value("command",std::string());
            if(action=="fly"&&previous!="fly"){
                queued["flight"]=std::move(input.at("flight"));return;
            }
            if(action==previous&&(action=="orbit"||action=="pan"||action=="zoom")){
                input["dx"]=input.value("dx",0.0)+queued.value("dx",0.0);
                input["dy"]=input.value("dy",0.0)+queued.value("dy",0.0);
            }
            if(queued.contains("flight")&&!input.contains("flight"))input["flight"]=std::move(queued.at("flight"));
        }
        queued=std::move(input);
    }
    Json drawViewport(Json input=Json::object()){
        const auto size=viewport.size();
        if(size.cx<=0||size.cy<=0)return Json::object();
        input["width"]=size.cx;input["height"]=size.cy;input["selected"]=sceneSelection;input["cameraId"]=cameraId;input["cameraOutputs"]=cameraOutputs;input["direction"]=cameraDirection;
        if(!input.contains("tool"))input["tool"]=viewport.transformTool();
        auto state=request("scene.viewport",input);
        viewport.setHandles(state.at("segments"));
        const auto action=input.value("command",std::string());
        if(action=="pick")selectActor(state.value("selection",std::string()));
        else if((action=="translate"||action=="transform")&&state.contains("translation"))editScene({{"action","translate"},{"id",sceneSelection},{"delta",state.at("translation")}});
        else if(action=="transform"&&state.contains("sceneTransform")){
            auto edit=state.at("sceneTransform");edit["action"]=input.at("tool");edit["id"]=sceneSelection;editScene(std::move(edit));
        }
        const auto prep=state.value("shaderPreparation",Json::object());
        const auto issue=prep.value("error",std::string());
        const bool preparing=prep.value("pending",false);
        if(preparing){viewportPreparing=true;viewportQueued=SetTimer(window,2,120,nullptr)!=0;SetWindowTextW(status,L"Direct3D 12 장면 준비 중");}
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
        if(!selectedTransition.empty()){
            const auto transitions=request("graph.transitions",{{"view",view}});
            if(std::none_of(transitions.begin(),transitions.end(),[this](const Json& row){return row.at("id")==selectedTransition;}))selectedTransition.clear();
            else{
                fields=request("graph.transitionFields",{{"view",view},{"id",selectedTransition}});
                Json rows=Json::array();
                for(std::size_t i=0;i<fields.size();++i){
                    auto control=fields.at(i).at("control");control["i"]=i;
                    rows.push_back({{"label",fields.at(i).at("label")},{"controls",Json::array({std::move(control)})}});
                }
                form.update({{"rows",std::move(rows)},{"revision",++formRevision}});return;
            }
        }
        if(sceneOpen()&&!sceneSelection.empty()){
            for(std::size_t i=0;i<sceneRows.size();++i)if(sceneRows.at(i).at("id")==sceneSelection){
                base=Json::array({"objects",std::to_string(i)});break;
            }
        }
        if(widgetOpen()&&!widgetSelection.empty()){
            const auto nodes=request("widget.nodes");
            for(std::size_t i=0;i<nodes.size();++i)if(nodes.at(i).at("id")==widgetSelection){base=Json::array({"nodes",std::to_string(i)});break;}
        }
        if(gameplayGraphOpen()&&!graphSelection.empty())base=request("graph.inspectorPath",{{"id",graphSelection},{"view",view}});
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
    void showDocument(Json value,HWND editingPane=nullptr){
        stopSpritePreview();
        stopAudioPreview();
        const auto previous=document.value("path",std::string());
        Json updatedGraph;
        if(value.contains("model")){updatedGraph=std::move(value.at("model"));value.erase("model");}
        document=std::move(value);updating=true;
        if(previous!=document.value("path",std::string())){tileOrigin={};tileLayer.clear();tileAtlasSource=nullptr;assetCanvas.updateAtlas(nullptr,{});if(modelOpen()||worldOpen())previewOpen=true;
            previewInput=nullptr;clearWorldMeshSelection();worldInstances.clear();foliageSelect=false;meshSelectionMode=0;
            worldBrush["layer"]=0;meshUVOpen=false;meshUVCenter=nullptr;meshUVZoom=1;
            previewViewport.useBrush(document.value("kind",std::string())=="terrain"||document.value("kind",std::string())=="foliage");}
        if(previous!=document.value("path",std::string())){view="event";sourceMode=false;graph.resetView();graphSelection.clear();selectedTransition.clear();fieldPath=modelOpen()?Json::array({"settings"}):Json::array();sceneSelection.clear();cameraId.clear();cameraDirection.clear();cameraOutputs=false;folded.clear();viewport.setHandles(Json::array());cameraInput=nullptr;viewportPreparing=false;widgetSelection.clear();widgetRevision.clear();widgetPreview=nullptr;timelineTrack.clear();timelineItem.clear();timelineKey=timelineChannel=-1;curveView=false;assetCanvas.resetTimeline();imageIndex=imageLevel=0;}
        displayText(source,document.value("text",std::string()));
        sourceChanged=false;
        refreshTabs();
        updating=false;refreshGraph(updatedGraph);refreshScene();refreshForm();layout();
        if(timelineOpen()){
            if(curveView){assetCanvas.updateCurve(request("timeline.curveGraph",{{"track",timelineTrack}}));refreshCurveHandles();}
            else assetCanvas.updateTimeline(request("timeline.read"));
        }
        if(imageOpen()&&!sourceMode)refreshImage();
        if(tilemapOpen()&&!sourceMode)refreshTilemap();
        if(audioAssetOpen())assetCanvas.updateWaveform(nullptr);
        SetWindowTextW(status,wide(document.value("path",folder)).c_str());
        if(document.contains("revision"))syncDocumentWindows(document,editingPane);
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
    void graphClipboardAction(const Json& key,EditorGraphPanel& panel,const std::string& graphView,const std::string& selection,const Json& doc,HWND owner){
        const auto kind=doc.value("kind",std::string());
        if(kind=="animgraph"||kind=="statemachine"||kind=="behaviortree")return;
        Json payload=graphClipboard;
        if(key=="c"||key=="d"){
            if(selection.empty())return;
            payload=request("graph.copy",{{"path",doc.at("path")},{"view",graphView},{"ids",Json::array({selection})}});
            if(payload.at("nodes").empty())return;
            if(key=="c"){graphClipboard=std::move(payload);return;}
        }
        if(payload.is_null())return;
        auto edit=panel.spawnPosition();edit["action"]="paste";edit["clipboard"]=std::move(payload);
        if(owner)editWindowGraph(owner,documentWindows.at(owner),std::move(edit));else editGraph(std::move(edit));
    }
    void dropAsset(const std::string& asset,POINT screen){
        for(auto& [owner,item]:documentWindows)if(item.sceneView&&!item.source){
            if(item.doc.at("path")==document.value("path",std::string())&&sourceChanged)continue;
            if(const auto point=item.sceneView->dropPoint(screen)){
                const auto frame=drawWindowScene(owner,item,{{"command","place"},{"x",point->x},{"y",point->y}});
                if(!frame.contains("placement"))return;
                auto input=documentWindowTarget(item);
                input.update(Json{{"action","placeAsset"},{"asset",asset},{"id",item.selection},{"position",frame.at("placement")}});
                auto result=request("scene.edit",input);
                item.selection=result.at("selection");commitDocumentWindowChange(owner,item,std::move(result));return;
            }
        }
        if(!sceneOpen()||sourceMode)return;
        if(const auto point=viewport.dropPoint(screen)){
            const auto frame=drawViewport({{"command","place"},{"x",point->x},{"y",point->y}});
            if(frame.contains("placement"))editScene({{"action","placeAsset"},{"asset",asset},{"id",sceneSelection},{"position",frame.at("placement")}});
        }
    }
    static LRESULT CALLBACK fileProcedure(HWND list,UINT message,WPARAM w,LPARAM l,UINT_PTR,DWORD_PTR ref){
        auto& self=*reinterpret_cast<NativeEditorShell*>(ref);
        if(message==WM_MOUSEMOVE&&!self.draggedAsset.empty()){SetCursor(LoadCursorW(nullptr,IDC_HAND));return 0;}
        if(message==WM_LBUTTONUP&&!self.draggedAsset.empty()){
            auto asset=std::move(self.draggedAsset);self.draggedAsset.clear();
            POINT screen{short(LOWORD(l)),short(HIWORD(l))};ClientToScreen(list,&screen);
            if(GetCapture()==list)ReleaseCapture();
            try{self.dropAsset(asset,screen);}catch(const std::exception& error){self.report(error);}
            return 0;
        }
        if(message==WM_CAPTURECHANGED||message==WM_CANCELMODE||message==WM_NCDESTROY)self.draggedAsset.clear();
        return DefSubclassProc(list,message,w,l);
    }
    static LRESULT CALLBACK tabProcedure(HWND owner,UINT message,WPARAM w,LPARAM l,UINT_PTR,DWORD_PTR ref){
        auto& self=*reinterpret_cast<NativeEditorShell*>(ref);
        if(message==WM_LBUTTONDOWN){
            TCHITTESTINFO hit{{short(LOWORD(l)),short(HIWORD(l))},0};
            const int index=TabCtrl_HitTest(owner,&hit);
            self.draggedTab.clear();self.tabDragging=false;self.tabDragStart=hit.pt;
            if(self.document.contains("tabs")){
                const auto& tabs=self.document.at("tabs");
                if(index>=0&&std::size_t(index)<tabs.size())self.draggedTab=tabs.at(index).at("path");
            }
        }else if(message==WM_MOUSEMOVE&&(w&MK_LBUTTON)&&!self.draggedTab.empty()){
            const int dx=short(LOWORD(l))-self.tabDragStart.x,dy=short(HIWORD(l))-self.tabDragStart.y;
            if(!self.tabDragging&&(std::abs(dx)>=GetSystemMetrics(SM_CXDRAG)||std::abs(dy)>=GetSystemMetrics(SM_CYDRAG))){
                self.tabDragging=true;SetCapture(owner);
            }
            if(self.tabDragging){SetCursor(LoadCursorW(nullptr,IDC_SIZEALL));return 0;}
        }else if(message==WM_LBUTTONUP&&self.tabDragging){
            self.tabDragging=false;
            auto path=std::move(self.draggedTab);self.draggedTab.clear();
            POINT point{short(LOWORD(l)),short(HIWORD(l))};ClientToScreen(owner,&point);
            if(GetCapture()==owner)ReleaseCapture();
            try{self.dropTab(path,point);}catch(const std::exception& error){self.report(error);}
            return 0;
        }else if(message==WM_CAPTURECHANGED||message==WM_CANCELMODE||message==WM_LBUTTONUP){
            self.tabDragging=false;self.draggedTab.clear();
        }
        return DefSubclassProc(owner,message,w,l);
    }
    void dropTab(const std::string& path,POINT screen){
        captureSource();
        RECT tabRect{},frame{};GetWindowRect(tabs,&tabRect);GetWindowRect(window,&frame);
        if(PtInRect(&tabRect,screen)){
            POINT local=screen;ScreenToClient(tabs,&local);
            TCHITTESTINFO hit{local,0};const int index=TabCtrl_HitTest(tabs,&hit);
            const auto& list=document.at("tabs");
            std::size_t position=index<0?list.size():std::size_t(index);
            RECT item{};
            if(index>=0&&TabCtrl_GetItemRect(tabs,index,&item)&&local.x>(item.left+item.right)/2)++position;
            const Json before=position<list.size()?list.at(position).at("path"):Json(nullptr);
            document["tabs"]=request("document.reorder",{{"path",path},{"before",before}}).at("tabs");
            refreshTabs();
        }else{
            POINT client=screen;ScreenToClient(window,&client);
            const bool below=!detached&&PtInRect(&belowTarget,client);
            const bool split=below||(!detached&&PtInRect(&splitTarget,client));
            if(!split&&PtInRect(&frame,screen))return;
            const auto currentPath=document.value("path",std::string());
            openDocumentWindow(request("document.read",{{"path",path}}),{{"view",path==currentPath?view:"event"},{"window",{screen.x,screen.y,950,640}},{"split",split},{"below",below}});
        }
    }
    static LRESULT CALLBACK dockProcedure(HWND control,UINT message,WPARAM w,LPARAM l,UINT_PTR,DWORD_PTR ref){
        auto& self=*reinterpret_cast<NativeEditorShell*>(ref);
        if(message==WM_LBUTTONDOWN){SetFocus(control);self.dockDragControl=control;SetCapture(control);return 0;}
        if(message==WM_MOUSEMOVE&&self.dockDragControl==control){SetCursor(LoadCursorW(nullptr,IDC_SIZEALL));return 0;}
        if(message==WM_LBUTTONUP&&self.dockDragControl==control){
            self.dockDragControl=nullptr;
            if(GetCapture()==control)ReleaseCapture();
            POINT point{short(LOWORD(l)),short(HIWORD(l))};ClientToScreen(control,&point);
            RECT tabs{},button{};GetWindowRect(self.tabs,&tabs);GetWindowRect(control,&button);
            if(PtInRect(&tabs,point)||PtInRect(&button,point))PostMessageW(self.window,redockMessage,WPARAM(GetParent(control)),0);
            return 0;
        }
        if((message==WM_CAPTURECHANGED||message==WM_CANCELMODE||message==WM_NCDESTROY)&&self.dockDragControl==control)
            self.dockDragControl=nullptr;
        return DefSubclassProc(control,message,w,l);
    }
    void redockDocument(HWND owner){
        const auto it=documentWindows.find(owner);
        if(it==documentWindows.end())return;
        auto& pane=it->second;
        captureSource();captureDocumentWindow(owner,pane);
        const auto path=pane.doc.at("path").get<std::string>(),restoredView=pane.view;
        const bool restoredSource=pane.source;
        showDocument(request("document.open",{{"path",path}}));
        if(view!=restoredView){selectedTransition.clear();graphSelection.clear();fieldPath=Json::array();graph.resetView();}
        view=restoredView;sourceMode=restoredSource;
        refreshGraph();layout();
        destroyDocumentWindow(owner);
    }
    void layoutDocumentWindow(HWND owner,DocumentWindow& item){
        RECT rect{};GetClientRect(owner,&rect);
        const int width=std::max(1L,rect.right),height=std::max(1L,rect.bottom);
        const bool graphShown=item.graph&&!item.source;
        const bool sceneShown=item.sceneView&&!item.source;
        const bool assetShown=item.assetForm&&!item.source;
        MoveWindow(item.editor,5,70,std::max(1,width-10),std::max(1,height-98),TRUE);
        MoveWindow(item.status,5,height-23,std::max(1,width-10),20,TRUE);
        MoveWindow(GetDlgItem(owner,DocDock),std::min(295,std::max(5,width-113)),5,108,26,TRUE);
        MoveWindow(item.viewPicker,5,37,std::min(160,width/3),220,TRUE);
        MoveWindow(item.palette,10+std::min(160,width/3),37,std::max(1,width-125-std::min(160,width/3)),300,TRUE);
        MoveWindow(GetDlgItem(owner,DocAdd),std::max(5,width-107),37,100,26,TRUE);
        ShowWindow(GetDlgItem(owner,DocReload),width>=410?SW_SHOWNOACTIVATE:SW_HIDE);
        ShowWindow(item.editor,graphShown||sceneShown||assetShown?SW_HIDE:SW_SHOWNOACTIVATE);
        ShowWindow(item.viewPicker,sceneShown||(graphShown&&!item.model.value("views",Json::array()).empty())?SW_SHOWNOACTIVATE:SW_HIDE);
        ShowWindow(item.palette,graphShown?SW_SHOWNOACTIVATE:SW_HIDE);
        ShowWindow(GetDlgItem(owner,DocAdd),graphShown?SW_SHOWNOACTIVATE:SW_HIDE);
        const int side=graphShown&&item.graphForm&&width>=365?std::min(240,width*42/100):0;
        if(item.graph)item.graph->layout(5,70,std::max(1,width-side-10),std::max(1,height-98),graphShown);
        if(item.graphForm)item.graphForm->update({{"rect",{width-side-5,70,side,std::max(1,height-98)}},{"visible",side>0}});
        if(item.assetForm)item.assetForm->update({{"rect",{5,38,std::max(1,width-10),std::max(1,height-62)}},{"visible",assetShown}});
        if(item.sceneView){
            item.sceneView->layout(owner,5,70,std::max(1,width-10),std::max(1,height-98),sceneShown);
            if(sceneShown)scheduleWindowScene(owner,item);
            else{KillTimer(owner,1);item.sceneQueued=false;}
        }
    }
    static void scheduleWindowScene(HWND owner,DocumentWindow& item,UINT delay=16){
        if(!item.sceneQueued)item.sceneQueued=SetTimer(owner,1,delay,nullptr)!=0;
    }
    Json drawWindowScene(HWND owner,DocumentWindow& item,Json input=Json::object()){
        const auto size=item.sceneView->size();
        input["width"]=size.cx;input["height"]=size.cy;
        input["path"]=item.doc.at("path");input["surface"]=item.surface;
        input["cameraId"]=item.cameraId;input["cameraOutputs"]=item.cameraOutputs;input["direction"]=item.cameraDirection;input["selected"]=item.selection;
        if(input.value("command",std::string())=="focus")input["id"]=item.selection;
        if(!input.contains("tool"))input["tool"]=item.sceneView->transformTool();
        auto state=request("scene.viewport",input);
        item.sceneView->setHandles(state.at("segments"));
        const auto action=input.value("command",std::string());
        if(action=="pick")item.selection=state.at("selection");
        else if((action=="translate"||action=="transform")&&(state.contains("translation")||state.contains("sceneTransform"))){
            auto edit=documentWindowTarget(item);edit["id"]=item.selection;
            if(state.contains("translation")){edit["action"]="translate";edit["delta"]=state.at("translation");}
            else{edit["action"]=input.at("tool");edit.update(state.at("sceneTransform"));}
            if(item.doc.at("path")==document.value("path",std::string())&&sourceChanged)throw std::runtime_error("같은 장면의 기본 창 초안을 먼저 처리하세요.");
            commitDocumentWindowChange(owner,item,request("scene.edit",edit));
        }
        if(state.at("shaderPreparation").value("pending",false))scheduleWindowScene(owner,item,120);
        else if(!state.at("warnings").empty())SetWindowTextW(item.status,wide(state.at("warnings").front()).c_str());
        return state;
    }
    void refreshWindowGraphInputs(DocumentWindow& item){
        if(!item.graphForm)return;
        if(!item.selection.empty()&&std::none_of(item.model.at("nodes").begin(),item.model.at("nodes").end(),[&](const Json& row){return row.at("id")==item.selection;}))item.selection.clear();
        item.inputs=item.selection.empty()?Json::array():request("graph.inputs",{{"path",item.doc.at("path")},{"view",item.view},{"id",item.selection}});
        item.graphForm->update({{"rows",graphInputRows(item.inputs)},{"revision",++item.inputRevision}});
    }
    void refreshWindowAssetFields(DocumentWindow& item){
        const auto fetch=[&](){return request("asset.fields",{{"path",item.doc.at("path")},{"parts",item.assetPath}});};
        try{item.assetFields=fetch();}
        catch(const std::exception&){if(item.assetPath.empty())throw;item.assetPath=Json::array();item.assetFields=fetch();}
        Json rows=Json::array();
        if(!item.assetPath.empty())rows.push_back({{"label",item.assetPath.back()},
            {"controls",Json::array({{{"kind","button"},{"i",item.assetFields.size()},{"text","상위 속성"}}})}});
        for(std::size_t i=0;i<item.assetFields.size();++i){
            const auto& field=item.assetFields.at(i);
            auto control=field.at("control");control["i"]=i;
            if(field.at("key")=="id"||field.at("key")=="parent")control["disabled"]=true;
            rows.push_back({{"label",field.at("label")},{"controls",Json::array({std::move(control)})}});
        }
        item.assetForm->update({{"rows",rows},{"revision",++item.inputRevision}});
    }
    void editWindowAsset(HWND owner,DocumentWindow& item,const Json& event){
        const auto action=event.value("event",std::string());
        if(action=="graphicsError"){SetWindowTextW(item.status,wide(event.at("message")).c_str());return;}
        if(action=="key"&&event.value("ctrl",false)){
            const auto key=event.at("key");
            if(key=="s")saveDocumentWindow(owner,item);
            else if(key=="z"||key=="y")commitDocumentWindowChange(owner,item,request(key=="z"?"editor.undo":"editor.redo",documentWindowTarget(item)));
            return;
        }
        if((action!="change"&&action!="click")||event.at("revision")!=item.inputRevision)return;
        const auto index=event.at("i").get<std::size_t>();
        if(action=="click"){
            if(index==item.assetFields.size()){if(!item.assetPath.empty())item.assetPath.erase(item.assetPath.end()-1);}
            else item.assetPath.push_back(item.assetFields.at(index).at("key"));
            refreshWindowAssetFields(item);return;
        }
        if(item.doc.at("path")==document.value("path",std::string())&&sourceChanged)
            throw std::runtime_error("같은 문서의 기본 창 초안을 먼저 저장하세요.");
        auto input=documentWindowTarget(item);
        input.update({{"parts",item.assetPath},{"key",item.assetFields.at(index).at("key")},
            {"value",event.contains("checked")?event.at("checked"):event.at("value")}});
        commitDocumentWindowChange(owner,item,request("asset.fieldEdit",input));
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
            refreshWindowGraphInputs(item);
        }
        if(item.sceneView){
            const auto scene=Json::parse(item.doc.at("text").get<std::string>());
            auto& cameras=item.model["cameras"];cameras=Json::array();
            const int active=populateCameraViews(item.viewPicker,cameras,item.cameraId,item.cameraDirection,item.cameraOutputs);
            int selected=active;
            for(const auto& actor:scene.at("objects")){
                const auto components=actor.value("components",Json::array());
                if(!std::any_of(components.begin(),components.end(),[](const Json& component){return component.at("type")=="Camera"&&component.at("properties").value("enabled",true);}))continue;
                if(actor.at("id")==item.cameraId)selected=int(cameras.size());
                cameras.push_back({{"camera",actor.at("id")}});
                SendMessageW(item.viewPicker,CB_ADDSTRING,0,LPARAM(wide(actor.at("name")).c_str()));
            }
            if(selected==active)item.cameraId.clear();
            SendMessageW(item.viewPicker,CB_SETCURSEL,selected,0);
        }
        if(item.assetForm)refreshWindowAssetFields(item);
        SetWindowTextW(item.status,item.doc.value("dirty",false)?L"저장하지 않은 변경 사항":L"");
        layoutDocumentWindow(owner,item);
    }
    Json documentWindowTarget(const DocumentWindow& item)const{
        return {{"path",item.doc.at("path")},{"expectedRevision",item.doc.at("revision")}};
    }
    void syncDocumentWindows(const Json& changed,HWND editingPane){
        for(auto& [owner,item]:documentWindows){
            if(owner==editingPane||item.draft||item.doc.is_null()||item.doc.at("path")!=changed.at("path"))continue;
            if(item.doc.at("revision")!=changed.at("revision")||item.doc.at("dirty")!=changed.at("dirty"))refreshDocumentWindow(owner,item,changed);
        }
    }
    void commitDocumentWindowChange(HWND owner,DocumentWindow& item,Json changed){
        if(changed.at("path")==document.value("path",std::string()))showDocument(changed,owner);
        else{
            document["tabs"]=changed.at("tabs");
            refreshTabs();
            syncDocumentWindows(changed,owner);
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
    void openDocumentWindow(Json target=Json(),const Json& settings=Json()){
        if(target.is_null()){
            if(!document.contains("path"))return;
            captureSource();target=document;
        }
        const bool split=settings.is_object()&&settings.value("split",false);
        const bool below=split&&settings.value("below",false);
        const bool lower=below&&(settings.value("lower",false)||splitDocument&&!splitBelow&&documentWindows.at(splitDocument).doc.at("path")!=target.at("path"));
        for(const auto& [owner,item]:documentWindows)if(item.doc.at("path")==target.at("path")&&((owner==splitDocument||owner==lowerSplitDocument)==split)){
            if(split&&owner==splitDocument&&!lower&&!lowerSplitDocument){splitBelow=below;layout();}
            if(!split)ShowWindow(owner,SW_RESTORE);
            return;
        }
        auto& destination=lower?lowerSplitDocument:splitDocument;
        if(split&&destination){SendMessageW(destination,WM_CLOSE,0,0);if(destination)return;}
        const auto title=fs::u8path(target.at("path").get<std::string>()).filename().wstring();
        const DWORD style=(split?WS_CHILD|WS_BORDER:WS_OVERLAPPEDWINDOW)|WS_CLIPCHILDREN;
        const auto owner=CreateWindowExW(split?0:WS_EX_TOOLWINDOW,L"HBEngine.NativeAuthoring",title.c_str(),style,
            CW_USEDEFAULT,CW_USEDEFAULT,950,640,window,nullptr,instance,this);
        if(!owner)throw std::runtime_error("독립 문서 창을 열지 못했어요.");
        auto& item=documentWindows.try_emplace(owner).first->second;
        if(split){destination=owner;if(!lower)splitBelow=below&&!lowerSplitDocument;}
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
            const auto dock=make(L"BUTTON",L"탭으로 합치기",0,DocDock,295,5,108,26);
            if(!SetWindowSubclass(dock,dockProcedure,1,reinterpret_cast<DWORD_PTR>(this)))throw std::runtime_error("독립 창 도킹을 초기화하지 못했어요.");
            item.status=make(L"STATIC",L"",SS_LEFT,0,0,0,1,1);
            item.viewPicker=make(L"COMBOBOX",L"",CBS_DROPDOWNLIST|WS_VSCROLL,DocView,5,37,160,220);
            item.palette=make(L"COMBOBOX",L"",CBS_DROPDOWNLIST|WS_VSCROLL,DocPalette,170,37,250,300);
            make(L"BUTTON",L"노드 추가",0,DocAdd,425,37,100,26);
            if(target.value("graph",false)){
                item.graph=std::make_unique<EditorGraphPanel>();
                item.graph->attach(owner,instance,[this,owner](const Json& event){
                    auto& pane=documentWindows.at(owner);
                    try{
                        const auto action=event.at("event").get<std::string>();
                        if(action=="edit")editWindowGraph(owner,pane,event);
                        else if(action=="palette"||action=="find")searchGraph(event,*pane.graph,pane.model,pane.selection,owner);
                        else if(action=="comment"&&pane.doc.at("kind")=="blueprint"){
                            auto input=event;input["action"]="comment";editWindowGraph(owner,pane,std::move(input));
                        }else if(action=="select"){pane.selection=event.at("id");if(pane.graphForm)refreshWindowGraphInputs(pane);}
                        else if(action=="graphicsError")SetWindowTextW(pane.status,wide(event.at("message")).c_str());
                        else if(action=="key"&&event.value("ctrl",false)){
                            const auto key=event.at("key");
                            if(key=="s")saveDocumentWindow(owner,pane);
                            else if(key=="z"||key=="y")commitDocumentWindowChange(owner,pane,request(key=="z"?"editor.undo":"editor.redo",documentWindowTarget(pane)));
                            else if(key=="c"||key=="v"||key=="d")graphClipboardAction(key,*pane.graph,pane.view,pane.selection,pane.doc,owner);
                        }
                    }catch(const std::exception& error){SetWindowTextW(pane.status,wide(std::string(error.what())).c_str());}
                });
                item.graph->useD3D12(graphics);
                const auto kind=target.at("kind");
                if(kind!="animgraph"&&kind!="behaviortree"&&kind!="statemachine"){
                    item.graphForm=std::make_unique<EditorFormPanel>();
                    item.graphForm->attach(owner,instance,[this,owner](const Json& event){
                        auto& pane=documentWindows.at(owner);
                        try{
                            const auto action=event.at("event");
                            if(action=="graphicsError")SetWindowTextW(pane.status,wide(event.at("message")).c_str());
                            if((action=="click"||action=="change")&&event.at("revision")==pane.inputRevision){
                                const auto edit=graphInputEdit(pane.inputs.at(event.at("i").get<int>()),pane.selection,event);
                                if(!edit.is_null())editWindowGraph(owner,pane,edit);
                            }
                        }catch(const std::exception& error){SetWindowTextW(pane.status,wide(std::string(error.what())).c_str());}
                    },"graph");
                    item.graphForm->useD3D12(graphics);
                }
                item.view=settings.is_object()?settings.value("view",std::string("event")):view;
                item.source=settings.is_object()&&settings.value("source",false);
            }else if(target.at("kind")=="scene"){
                item.surface="native-scene-"+std::to_string(nextSceneSurface++);
                item.source=settings.is_object()&&settings.value("source",false);
                if(settings.is_object()){item.cameraId=settings.value("cameraId",std::string());item.cameraOutputs=settings.value("cameraOutputs",false);item.cameraDirection=settings.value("direction",std::string());}
                SetWindowTextW(item.toggle,L"장면 / 소스");
                item.sceneView=std::make_unique<EditorScenePanel>();
                item.sceneView->attach(owner,instance,[this,owner](Json input){
                    auto& pane=documentWindows.at(owner);
                    mergeCameraInput(pane.sceneInput,std::move(input));scheduleWindowScene(owner,pane);
                });
                sceneSurfaces.emplace(item.surface,item.sceneView.get());
            }else if(target.value("form",false)){
                SetWindowTextW(item.toggle,L"속성 / 소스");
                item.source=settings.is_object()&&settings.value("source",false);
                if(target.at("kind")=="modelimport")item.assetPath=Json::array({"settings"});
                if(settings.is_object()&&settings.contains("assetPath")&&settings.at("assetPath").is_array())item.assetPath=settings.at("assetPath");
                item.assetForm=std::make_unique<EditorFormPanel>();
                item.assetForm->attach(owner,instance,[this,owner](const Json& event){
                    auto& pane=documentWindows.at(owner);
                    try{editWindowAsset(owner,pane,event);}
                    catch(const std::exception& error){SetWindowTextW(pane.status,wide(std::string(error.what())).c_str());}
                },"asset");
                item.assetForm->useD3D12(graphics);
            }else ShowWindow(item.toggle,SW_HIDE);
            refreshDocumentWindow(owner,item,request("document.read",{{"path",target.at("path")}}));
            if(split)layout();
            else if(settings.is_object()&&settings.contains("window"))placeSavedWindow(owner,settings.at("window"),480,320);
            if(!split&&acceptance)SetWindowPos(owner,nullptr,-20000,-20000,0,0,SWP_NOSIZE|SWP_NOZORDER|SWP_NOACTIVATE|SWP_SHOWWINDOW);
            else if(!split)ShowWindow(owner,SW_SHOW);
        }catch(...){destroyDocumentWindow(owner);throw;}
    }
    void destroyDocumentWindow(HWND owner){
        const bool split=owner==splitDocument||owner==lowerSplitDocument;
        if(owner==splitDocument)splitDocument=nullptr;
        if(owner==lowerSplitDocument)lowerSplitDocument=nullptr;
        auto& item=documentWindows.at(owner);
        if(item.sceneView){
            KillTimer(owner,1);
            if(!waiting)try{request("scene.viewportClose",{{"surface",item.surface}});}catch(const std::exception&){}
            sceneSurfaces.erase(item.surface);
        }
        SetWindowLongPtrW(owner,GWLP_USERDATA,0);
        DestroyWindow(owner);
        documentWindows.erase(owner);
        if(split)layout();
    }
    LRESULT documentWindowEvent(HWND owner,DocumentWindow& item,UINT message,WPARAM w,LPARAM l){
        if(message==WM_DPICHANGED&&owner!=splitDocument&&owner!=lowerSplitDocument){
            const auto& rect=*reinterpret_cast<const RECT*>(l);
            SetWindowPos(owner,nullptr,rect.left,rect.top,rect.right-rect.left,rect.bottom-rect.top,SWP_NOZORDER|SWP_NOACTIVATE);
            return 0;
        }
        if(message==WM_SIZE){if(item.status)layoutDocumentWindow(owner,item);return 0;}
        if(message==WM_TIMER&&w==1){
            KillTimer(owner,1);item.sceneQueued=false;
            if(item.sceneView&&!item.source&&IsWindowVisible(owner)&&!IsIconic(owner)){
                auto input=std::move(item.sceneInput);item.sceneInput=nullptr;
                drawWindowScene(owner,item,input.is_object()?std::move(input):Json::object());
            }
            return 0;
        }
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
            else if(id==DocDock)PostMessageW(window,redockMessage,WPARAM(owner),0);
            else if(id==CloseDocument)PostMessageW(owner,WM_CLOSE,0,0);
            else if(id==DocToggle){captureDocumentWindow(owner,item);item.source=!item.source;layoutDocumentWindow(owner,item);}
            else if(id==DocReload){
                if(item.doc.at("path")==document.value("path",std::string())&&sourceChanged)throw std::runtime_error("같은 문서의 기본 창 초안을 먼저 처리하세요.");
                const auto latest=request("document.read",{{"path",item.doc.at("path")}});
                if((item.draft||latest.value("dirty",false))&&MessageBoxW(owner,L"저장하지 않은 변경을 버리고 디스크에서 다시 읽을까요?",L"HBEngine",MB_YESNO|MB_ICONWARNING)!=IDYES)return 0;
                commitDocumentWindowChange(owner,item,request("document.reload",{{"path",latest.at("path")},{"expectedRevision",latest.at("revision")},{"discard",true}}));
            }
            else if(id==DocView&&notification==CBN_SELCHANGE){
                const auto index=SendMessageW(item.viewPicker,CB_GETCURSEL,0,0);
                if(index>=0){
                    if(item.sceneView){selectCameraView(item.model.at("cameras").at(index),item.cameraId,item.cameraDirection,item.cameraOutputs);scheduleWindowScene(owner,item);}
                    else{item.view=item.model.at("views").at(index).at(0);item.selection.clear();item.graph->resetView();refreshDocumentWindow(owner,item,item.doc);}
                }
            }else if(id==DocAdd){
                const auto index=SendMessageW(item.palette,CB_GETCURSEL,0,0);
                if(index>=0){
                    auto input=item.graph->spawnPosition();input["action"]="add";input["key"]=item.model.at("palette").at(index).at("id");
                    if(input.at("key")=="functionCall"){
                        const auto asset=chooseProjectAsset(L"머테리얼 함수",L".hbmaterialfunction.json");
                        if(asset.empty())return 0;
                        input["asset"]=asset;
                    }
                    editWindowGraph(owner,item,std::move(input));
                }
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
    struct SearchDialog{
        const wchar_t* title;
        HINSTANCE instance;
        std::vector<std::wstring> labels,keys;
        std::wstring probe;
        HWND query=nullptr,list=nullptr;
        std::optional<std::size_t> result;
    };
    static bool searchContains(const std::wstring& input,const std::wstring& query){
        if(query.empty())return true;
        return FindNLSStringEx(LOCALE_NAME_USER_DEFAULT,FIND_FROMSTART|NORM_IGNORECASE,input.c_str(),int(input.size()),query.c_str(),int(query.size()),nullptr,nullptr,nullptr,0)>=0;
    }
    static void filterSearch(SearchDialog& state){
        const auto query=controlText(state.query);
        SendMessageW(state.list,WM_SETREDRAW,FALSE,0);
        SendMessageW(state.list,LB_RESETCONTENT,0,0);
        for(std::size_t i=0;i<state.labels.size();++i){
            if(!searchContains(state.labels[i],query)&&!searchContains(state.keys[i],query))continue;
            const auto row=SendMessageW(state.list,LB_ADDSTRING,0,LPARAM(state.labels[i].c_str()));
            if(row>=0)SendMessageW(state.list,LB_SETITEMDATA,row,i);
        }
        SendMessageW(state.list,LB_SETCURSEL,0,0);
        SendMessageW(state.list,WM_SETREDRAW,TRUE,0);InvalidateRect(state.list,nullptr,TRUE);
    }
    static INT_PTR CALLBACK searchProcedure(HWND dialog,UINT message,WPARAM w,LPARAM l){
        auto* state=reinterpret_cast<SearchDialog*>(GetWindowLongPtrW(dialog,DWLP_USER));
        if(message==WM_INITDIALOG){
            state=reinterpret_cast<SearchDialog*>(l);SetWindowLongPtrW(dialog,DWLP_USER,reinterpret_cast<LONG_PTR>(state));
            SetWindowTextW(dialog,state->title);
            RECT rect{};GetClientRect(dialog,&rect);
            const auto add=[&](const wchar_t* type,const wchar_t* label,DWORD style,int x,int y,int width,int height,int id){
                const auto child=CreateWindowExW(0,type,label,WS_CHILD|WS_VISIBLE|WS_TABSTOP|style,x,y,width,height,dialog,HMENU(INT_PTR(id)),state->instance,nullptr);
                SendMessageW(child,WM_SETFONT,WPARAM(GetStockObject(DEFAULT_GUI_FONT)),TRUE);return child;
            };
            state->query=add(L"EDIT",L"",WS_BORDER|ES_AUTOHSCROLL,12,10,rect.right-24,25,10);
            SendMessageW(state->query,EM_SETCUEBANNER,TRUE,LPARAM(L"이름 또는 키로 검색"));
            state->list=add(L"LISTBOX",L"",LBS_NOTIFY|WS_BORDER|WS_VSCROLL,12,41,rect.right-24,rect.bottom-85,11);
            add(L"BUTTON",L"선택",BS_DEFPUSHBUTTON,rect.right-174,rect.bottom-37,74,26,IDOK);
            add(L"BUTTON",L"취소",BS_PUSHBUTTON,rect.right-90,rect.bottom-37,74,26,IDCANCEL);
            filterSearch(*state);SetFocus(state->query);
            if(!state->probe.empty()){
                SetWindowPos(dialog,nullptr,-20000,-20000,0,0,SWP_NOACTIVATE|SWP_NOSIZE|SWP_NOZORDER);
                SetWindowTextW(state->query,state->probe.c_str());PostMessageW(dialog,WM_COMMAND,IDOK,0);
            }
            return FALSE;
        }
        if(message==WM_COMMAND&&state){
            if(LOWORD(w)==10&&HIWORD(w)==EN_CHANGE&&state->list){filterSearch(*state);return TRUE;}
            if(LOWORD(w)==IDOK||(LOWORD(w)==11&&HIWORD(w)==LBN_DBLCLK)){
                const auto row=SendMessageW(state->list,LB_GETCURSEL,0,0);
                if(row!=LB_ERR){state->result=SendMessageW(state->list,LB_GETITEMDATA,row,0);EndDialog(dialog,IDOK);}
                else if(!state->probe.empty())EndDialog(dialog,IDCANCEL);
                return TRUE;
            }
            if(LOWORD(w)==IDCANCEL){EndDialog(dialog,IDCANCEL);return TRUE;}
        }
        if(message==WM_CLOSE){EndDialog(dialog,IDCANCEL);return TRUE;}
        return FALSE;
    }
    void showSearch(SearchDialog& input,HWND owner){
        struct alignas(DWORD) Dialog {DLGTEMPLATE value;WORD menu=0,windowClass=0,title=0;} layout{};
        layout.value.style=WS_POPUP|WS_CAPTION|WS_SYSMENU|DS_MODALFRAME|DS_CENTER;
        layout.value.cx=285;layout.value.cy=196;
        if(DialogBoxIndirectParamW(instance,&layout.value,owner?owner:window,searchProcedure,reinterpret_cast<LPARAM>(&input))==-1)
            throw std::runtime_error("Windows 검색 창을 열 수 없어요.");
    }
    void searchGraph(Json event,EditorGraphPanel& panel,const Json& graphModel,const std::string& selection,HWND owner){
        const bool find=event.at("event")=="find";
        const auto& rows=graphModel.at(find?"nodes":"palette");
        if(rows.empty())return;
        SearchDialog input{find?L"그래프 노드 찾기":L"그래프 노드 추가",instance,{},{},std::move(graphSearchProbe)};
        graphSearchProbe.clear();
        for(const auto& row:rows){input.labels.push_back(wide(row.at("title")));input.keys.push_back(wide(row.at("id")));}
        showSearch(input,owner);
        if(!input.result)return;
        const auto key=rows.at(*input.result).at("id").get<std::string>();
        if(find){panel.focusNode(key);return;}
        event["action"]="add";event["key"]=key;event["id"]=selection;
        if(key=="functionCall"){
            const auto asset=chooseProjectAsset(L"머테리얼 함수",L".hbmaterialfunction.json");
            if(asset.empty())return;
            event["asset"]=asset;
        }
        if(owner)editWindowGraph(owner,documentWindows.at(owner),std::move(event));
        else editGraph(std::move(event));
    }
    std::optional<std::size_t> chooseMenu(const std::vector<std::wstring>& labels){
        if(labels.empty())return std::nullopt;
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
    std::string chooseTimelineAsset(const std::string& type){
        const bool sequence=type=="shot"||type=="subsequence";
        const auto name=pickFile(false,sequence?L"하위 시퀀스":type=="audio"?L"오디오 클립":L"애니메이션 클립",sequence?L".hbsequence.json":L"",L"",projectRoot/L"Assets");
        if(name.empty())return {};
        std::error_code error;
        const auto relative=fs::relative(fs::path(name),projectRoot,error);
        if(error||relative.empty()||*relative.begin()!=L"Assets")throw std::runtime_error("프로젝트의 Assets 폴더에서 클립을 고르세요.");
        return utf8(relative.generic_wstring());
    }
    std::string chooseProjectAsset(const wchar_t* description,const wchar_t* extension){
        const auto selected=pickFile(false,description,extension,L"",projectRoot/L"Assets");
        if(selected.empty())return {};
        const auto relative=fs::relative(fs::path(selected),projectRoot);
        if(relative.empty()||*relative.begin()!=L"Assets")throw std::runtime_error("프로젝트의 에셋을 선택하세요.");
        return utf8(relative.generic_wstring());
    }
    void openProject(Json project){
        projectTitle=wide(project.at("name"));SetWindowTextW(window,(projectTitle+L" — HBEngine").c_str());
        projectFile=fs::path(wide(project.at("file")));
        projectRoot=projectFile.parent_path();
        folderHistory.clear();folderPosition=0;navigateFolder("Assets");
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
    void startPlay(const fs::path& reportFile={},const std::wstring& recording={},const std::string& preset="transform",bool allActors=false,const std::wstring& audio={}){
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
        fs::path recordingFile;
        if(!recording.empty()){
            if(!sceneOpen()||(!allActors&&sceneSelection.empty()))throw std::runtime_error("장면에서 녹화할 오브젝트를 선택하세요.");
            recordingFile=editorProfile/L"Sessions"/(L"take-"+std::to_wstring(GetCurrentProcessId())+L"-"+std::to_wstring(GetTickCount64())+L".json");
            const Json targets=allActors?Json(nullptr):Json::array({sceneSelection});
            args+=L" --editor-take-output "+quote(recordingFile.wstring())+L" --editor-take-name "+quote(recording)
                +L" --editor-take-target "+quote(wide(targets.dump()))+L" --editor-take-preset "+quote(wide(preset));
        }
        fs::path capturedAudio;
        if(!audio.empty()){
            capturedAudio=editorProfile/L"Sessions"/(L"mix-"+std::to_wstring(GetCurrentProcessId())+L"-"+std::to_wstring(GetTickCount64())+L".wav");
            args+=L" --editor-audio-output "+quote(capturedAudio.wstring());
        }
        if(!reportFile.empty())args+=L" --hidden --silent --frames "+std::to_wstring(audio.empty()?4:16)+L" --report "+quote(reportFile.wstring());
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
        CloseHandle(child.hThread);playJob=ownership;playProcess=child.hProcess;playPid=child.dwProcessId;stopPlayRequested=false;playBreaks=0;playDebug=nullptr;atBreakpoint=false;
        takeOutput=std::move(recordingFile);takeName=recording;
        if(!audio.empty()){audioOutput=std::move(capturedAudio);audioProject=projectFile;audioName=audio;}
        SetTimer(window,6,150,nullptr);statusText(L"플레이를 시작했어요.");
    }
    void finishTake(){
        if(takeOutput.empty())return;
        const auto output=std::exchange(takeOutput,fs::path{});
        if(!fs::is_regular_file(output))throw std::runtime_error("녹화된 시퀀스가 없어요.");
        captureSource();
        const auto data=Json::parse(read(output));
        showDocument(request("timeline.importTake",{{"name",utf8(takeName)},{"data",data}}));
        DeleteFileW(output.c_str());refreshFiles();statusText(L"녹화한 시퀀스를 저장했어요.");
    }
    void finishAudioCapture(){
        if(audioOutput.empty())return;
        if(!fs::is_regular_file(audioOutput)){audioOutput.clear();throw std::runtime_error("녹음된 게임 믹스가 없어요.");}
        if(projectFile!=audioProject)throw std::runtime_error("녹음을 시작한 프로젝트에서 WAV를 저장하세요.");
        const auto result=request("audio.importCapture",{{"name",utf8(audioName)},{"file",utf8(audioOutput.wstring())}});
        DeleteFileW(audioOutput.c_str());audioOutput.clear();
        refreshFiles();statusText((L"게임 믹스 저장 · "+wide(result.at("path"))).c_str());
    }
    void continuePlay(bool step){
        if(!playProcess||!atBreakpoint)return;
        atBreakpoint=false;
        struct Target{DWORD pid;bool step;} target{playPid,step};
        EnumWindows([](HWND candidate,LPARAM value)->BOOL{
            const auto& target=*reinterpret_cast<Target*>(value);
            DWORD pid=0;GetWindowThreadProcessId(candidate,&pid);
            wchar_t name[64]{};GetClassNameW(candidate,name,64);
            if(pid!=target.pid||std::wstring_view(name)!=L"HBEngine.NativeGame")return TRUE;
            PostMessageW(candidate,WM_APP+42,target.step,0);return FALSE;
        },reinterpret_cast<LPARAM>(&target));
    }
    void inspectPlay(bool showValues){
        if(!atBreakpoint||!playDebug.is_object())return;
        const auto file=playDebug.value("file",std::string());
        const auto node=playDebug.value("node",std::string());
        if(!file.empty()&&!node.empty()){
            captureSource();
            showDocument(request("document.open",{{"path",file}}));
            if(document.value("kind",std::string())=="blueprint"){
                view=playDebug.value("view",std::string("event"));
                graph.resetView();graphSelection.clear();refreshGraph();layout();graph.focusNode(node);
            }
        }
        if(showValues){
            auto body=wide(playDebug.value("title",std::string()))+L" · "+wide(playDebug.value("actor",std::string()));
            for(const auto& row:playDebug.value("stack",Json::array()))body+=L"\n→ "+wide(row);
            for(const auto& [group,title]:std::array<std::pair<const char*,const wchar_t*>,2>{{{"watched",L"관찰 핀"},{"variables",L"블루프린트 변수"}}}){
                const auto rows=playDebug.value(group,Json::array());
                if(rows.empty())continue;
                body+=L"\n\n";body+=title;
                for(const auto& row:rows)body+=L"\n"+wide(row.at("title"))+L" = "+wide(row.at("value"));
            }
            if(body.size()>7000){body.resize(7000);body+=L"\n…";}
            MessageBoxW(window,body.c_str(),L"블루프린트 중단점",MB_OK|MB_ICONINFORMATION);
        }
    }
    void readPlayBreakpoint(){
        const auto snapshot=editorProfile/L"Sessions"/(L"debug-"+std::to_wstring(playPid)+L".json");
        playDebug=nullptr;
        std::error_code error;
        const auto size=fs::file_size(snapshot,error);
        if(!error&&size<=128*1024){
            try{playDebug=Json::parse(read(snapshot));}catch(const Json::exception&){}
            DeleteFileW(snapshot.c_str());
        }
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
            while(PeekMessageW(&message,window,WM_APP+43,WM_APP+43,PM_REMOVE)){DispatchMessageW(&message);continuePlay(playBreaks==1);}
            Sleep(20);
        }
        DWORD code=STILL_ACTIVE;
        GetExitCodeProcess(playProcess,&code);
        if(code==STILL_ACTIVE){stopPlay();throw std::runtime_error("Native editor play timeout");}
        CloseHandle(playProcess);playProcess=nullptr;playPid=0;CloseHandle(playJob);playJob=nullptr;KillTimer(window,6);
        if(code)throw std::runtime_error("Native editor play failed");
    }
    static void placeSavedWindow(HWND owner,const Json& value,int minWidth,int minHeight){
        const auto r=value.get<std::array<int,4>>();
        const LONG x=std::clamp(r[0],-100000,100000),y=std::clamp(r[1],-100000,100000);
        RECT area{x,y,x+std::clamp(r[2],minWidth,10000),y+std::clamp(r[3],minHeight,10000)};
        if(MonitorFromRect(&area,MONITOR_DEFAULTTONULL))SetWindowPos(owner,nullptr,area.left,area.top,area.right-area.left,area.bottom-area.top,SWP_NOZORDER|SWP_NOACTIVATE);
    }
    Json documentWindowLayout()const{
        Json panes=Json::array();
        for(const auto& [owner,item]:documentWindows){
            WINDOWPLACEMENT placement{sizeof(placement)};
            if(!GetWindowPlacement(owner,&placement))continue;
            const auto& r=placement.rcNormalPosition;
            panes.push_back({{"path",item.doc.at("path")},{"view",item.view},{"source",item.source},{"assetPath",item.assetPath},{"split",owner==splitDocument||owner==lowerSplitDocument},{"below",owner==lowerSplitDocument||owner==splitDocument&&splitBelow},{"lower",owner==lowerSplitDocument},{"cameraId",item.cameraId},{"cameraOutputs",item.cameraOutputs},{"direction",item.cameraDirection},{"window",{r.left,r.top,r.right-r.left,r.bottom-r.top}}});
        }
        return panes;
    }
    void saveLayout(Json panes=Json::array()){
        WINDOWPLACEMENT placement{sizeof(placement)};
        if(!GetWindowPlacement(window,&placement))return;
        const auto& r=placement.rcNormalPosition;
        const Json saved={{"browse",browsePercent},{"inspector",inspectorPercent},{"splitPercent",splitPercent},{"lowerSplitPercent",lowerSplitPercent},{"window",{r.left,r.top,r.right-r.left,r.bottom-r.top}},{"maximized",placement.showCmd==SW_SHOWMAXIMIZED},{"console",consoleVisible},{"browserTiles",browserTiles},{"contentDetached",contentWindow!=nullptr},{"project",utf8(projectFile.wstring())},{"documents",std::move(panes)}};
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
            splitPercent=std::clamp(data.value("splitPercent",43u),25u,75u);
            lowerSplitPercent=std::clamp(data.value("lowerSplitPercent",43u),25u,75u);
            layoutMaximized=data.value("maximized",false);
            consoleVisible=data.value("console",false);
            setBrowserTiles(data.value("browserTiles",false));
            contentDetachedOnStart=data.value("contentDetached",false);
            if(data.contains("window"))placeSavedWindow(window,data.at("window"),720,480);
        }catch(const Json::exception&){browsePercent=24;inspectorPercent=25;splitPercent=lowerSplitPercent=43;}
        layout();
    }
    void restoreDocumentWindows(){
        if(projectFile.empty()||!fs::is_regular_file(layoutFile))return;
        const auto saved=Json::parse(read(layoutFile),nullptr,false);
        if(!saved.is_object()||saved.value("project",std::string())!=utf8(projectFile.wstring()))return;
        for(const auto& pane:saved.value("documents",Json::array())){
            try{
                auto opened=request("document.load",{{"path",pane.at("path")}});
                document["tabs"]=opened.at("tabs");refreshTabs();
                openDocumentWindow(std::move(opened),pane);
            }catch(const std::exception& error){statusText(wide(std::string(error.what())).c_str());}
        }
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
        for(HWND child:{files,search,folderBack,folderForward,folderPath,folderTree,assetType,assetRecursive,assetTiles}){
            ShowWindow(child,SW_HIDE);
            if(!SetParent(child,owner))throw std::runtime_error("콘텐츠 브라우저 창을 이동하지 못했어요.");
            ShowWindow(child,SW_SHOWNOACTIVATE);
        }
        layout();
    }
    Json editBuildProfile(const Json& profile,const Json& effective){
        struct Field {
            const char* key;
            const wchar_t* label;
            int limit=0;
            bool number=false;
            std::vector<std::wstring> labels={};
            std::vector<Json> options={};
        };
        const std::vector<std::wstring> groups={L"이름·화면 크기",L"대상·실행기",L"프레임 설정",L"키오스크",L"모바일",L"Windows 서명",L"패키징할 장면"};
        const auto group=chooseMenu(groups);
        if(!group)return Json::object();
        if(*group==6)return editBuildScenes(profile.at("scenes"));
        const std::vector<std::wstring> toggle={L"사용",L"사용 안 함"};
        const std::vector<Json> toggleValues={true,false};
        const std::vector<std::vector<Field>> fields={
            {{"name",L"프로필 이름",80},{"productName",L"게임 이름",80},{"width",L"화면 너비",5,true},{"height",L"화면 높이",5,true}},
            {{"target",L"대상 플랫폼",0,false,{L"Windows x64",L"웹",L"Android",L"iOS"},{"windows-x64","web","android","ios"}},
             {"configuration",L"빌드 구성",0,false,{L"개발",L"배포"},{"development","release"}},
             {"windowsRuntime",L"Windows 실행기",0,false,{L"네이티브",L"WebView2 호환"},{"native","webview"}},
             {"nativeGraphicsAPI",L"Windows 그래픽 API",0,false,{L"DirectX 12",L"DirectX 12 · 11On12",L"자동",L"DirectX 11"},{"d3d12","d3d12-11on12","auto","d3d11"}},
             {"windowsRenderer",L"호환 실행기 렌더러",0,false,{L"웹 그래픽",L"DirectX 12 호환 장면"},{"scene","d3d11"}}},
            {{"targetFrameRate",L"목표 FPS (15–240)",3,true},{"framePacing",L"프레임 표시 방식",0,false,{L"고정 목표 FPS",L"화면 주사율 동기화"},{"fixed","display"}}},
            {{"enabled",L"키오스크 모드",0,false,toggle,toggleValues},{"fullscreen",L"전체 화면",0,false,toggle,toggleValues},
             {"hideCursor",L"커서 숨기기",0,false,toggle,toggleValues},{"preventMinimize",L"최소화 막기",0,false,toggle,toggleValues},
             {"idleResetSeconds",L"재시작 대기 시간 (초, 0은 사용 안 함)",5,true}},
            {{"applicationId",L"앱 식별자",200},{"versionCode",L"버전 코드",10,true},{"versionName",L"버전 이름",80},
             {"orientation",L"화면 방향",0,false,{L"가로",L"세로",L"자동"},{"landscape","portrait","auto"}},{"minSdk",L"Android 최소 SDK",2,true},
             {"abis",L"Android CPU",0,false,{L"ARM64",L"x86-64",L"ARM64 및 x86-64"},{Json::array({"arm64-v8a"}),Json::array({"x86_64"}),Json::array({"arm64-v8a","x86_64"})}},
             {"format",L"Android 출력 형식",0,false,{L"APK",L"AAB"},{"apk","aab"}},{"signingRef",L"서명 프로필 ID",40}},
            {{"certificateThumbprint",L"인증서 지문 (16진수 40자)",40},{"timestampServer",L"타임스탬프 서버 URL",512}}
        };
        const std::array<std::string,6> sections={"","","","kiosk","mobile","windowsSigning"};
        const auto& section=sections.at(*group);
        const auto& choices=fields.at(*group);
        std::vector<std::wstring> labels;
        for(const auto& field:choices)labels.push_back(field.label);
        const bool clearable=*group==4||*group==5;
        if(clearable)labels.push_back(*group==4?L"서명 프로필 제거":L"서명 설정 제거");
        const auto choice=chooseMenu(labels);if(!choice)return Json::object();
        Json values=section.empty()?effective:effective.value(section,profile.value(section,Json::object()));
        if(clearable&&*choice==choices.size()){
            if(*group==4)values.erase("signingRef");else values=Json::object();
            return {{section,values}};
        }
        const auto& field=choices.at(*choice);
        const auto previous=values.value(field.key,profile.value(field.key,Json()));
        Json next;
        if(field.options.empty()){
            const auto current=previous.is_string()?wide(previous.get<std::string>()):previous.is_null()?std::wstring():wide(previous.dump());
            const auto input=inputName(field.label,current,field.limit);
            if(input.empty())return Json::object();
            next=field.number?Json::parse(utf8(input)):Json(utf8(input));
        }else{
            auto marked=field.labels;
            for(std::size_t i=0;i<field.options.size();++i)if(field.options.at(i)==previous)marked.at(i)=L"● "+marked.at(i);
            const auto option=chooseMenu(marked);if(!option)return Json::object();
            next=field.options.at(*option);
        }
        if(section.empty())return {{field.key,next}};
        values[field.key]=next;
        return {{section,values}};
    }
    Json editBuildScenes(Json scenes){
        const auto action=chooseMenu({L"장면 추가",L"포함 여부 바꾸기",L"시작 장면으로 이동",L"장면 제거"});if(!action)return Json::object();
        std::vector<std::wstring> labels;
        if(*action==0){
            const auto assets=request("content.list",{{"folder","Assets"},{"type","scene"},{"recursive",true}});
            std::vector<std::string> paths;
            for(const auto& asset:assets.at("entries")){
                if(asset.at("kind")!="scene")continue;
                const auto path=asset.at("path").get<std::string>();
                if(std::any_of(scenes.begin(),scenes.end(),[&](const Json& row){return row.at("path")==path;}))continue;
                paths.push_back(path);labels.push_back(wide(path));
            }
            const auto choice=chooseMenu(labels);if(!choice)return Json::object();
            scenes.push_back({{"path",paths.at(*choice)},{"enabled",true}});
        }else{
            for(const auto& scene:scenes)labels.push_back((scene.at("enabled").get<bool>()?L"● ":L"○ ")+wide(scene.at("path")));
            const auto choice=chooseMenu(labels);if(!choice)return Json::object();
            auto& scene=scenes.at(*choice);
            if(*action==1)scene["enabled"]=!scene.at("enabled").get<bool>();
            else if(*action==2){scene["enabled"]=true;std::rotate(scenes.begin(),scenes.begin()+*choice,scenes.begin()+*choice+1);}
            else scenes.erase(scenes.begin()+*choice);
        }
        return {{"scenes",scenes}};
    }
    void editModelSubasset(){
        const auto data=Json::parse(document.at("text").get<std::string>());
        const auto type=chooseMenu({L"모든 하위 에셋",L"메시",L"머테리얼",L"애니메이션",L"스킨",L"미연결 메시"});
        if(!type)return;
        const std::vector<std::string> kinds={"","mesh","material","animation","skin","mesh"};
        const auto pick=[&](const Json& rows,const std::string& kind,const wchar_t* title)->std::optional<Json>{
            SearchDialog dialog{title,instance,{},{},{},nullptr,nullptr,{}};
            std::vector<const Json*> items;
            for(const auto& row:rows){
                if(!kind.empty()&&row.at("kind")!=kind)continue;
                dialog.labels.push_back(wide(row.at("name"))+L" · "+wide(row.at("kind")));
                dialog.keys.push_back(wide(row.at("id")));items.push_back(&row);
            }
            if(items.empty())return std::nullopt;
            showSearch(dialog,window);
            return dialog.result?std::optional<Json>(*items.at(*dialog.result)):std::nullopt;
        };
        const auto row=pick(data.value(*type==5?"unresolvedSubassets":"subassets",Json::array()),kinds.at(*type),L"모델 하위 에셋 검색");
        if(!row)return;
        Json params={{"id",row->at("id")},{"expectedRevision",document.at("revision")}};
        if(*type==5){
            const auto target=pick(data.at("subassets"),"mesh",L"연결할 메시 검색");if(!target)return;
            params.update({{"action","remap"},{"target",target->at("id")}});
        }else{
            const auto kind=row->at("kind").get<std::string>();
            if(kind=="material"||kind=="animation"){
                const auto name=inputName(kind=="material"?L"독립 머테리얼 이름":L"독립 클립 이름",kind=="material"?L"M_Extracted":L"SK_Extracted",70);
                if(name.empty())return;
                params["kind"]=kind;params["subasset"]=row->at("id");params["name"]=utf8(name);
                if(kind=="animation"){
                    const auto mode=chooseMenu({L"원본 보간 사용",L"사용자 보간 베이크"});if(!mode)return;
                    params["custom"]=*mode?"bake":"reject";
                    if(*mode){
                        const auto fps=inputName(L"베이크 FPS",L"30",3);if(fps.empty())return;
                        params["fps"]=Json::parse(utf8(fps));
                    }
                    const auto range=chooseMenu({L"클립 전체",L"시간 구간 지정"});if(!range)return;
                    if(*range){
                        const auto start=inputName(L"시작 시간 (초)",L"0",20);if(start.empty())return;
                        const auto end=inputName(L"종료 시간 (초)",L"1",20);if(end.empty())return;
                        params["start"]=Json::parse(utf8(start));params["end"]=Json::parse(utf8(end));
                    }
                }
                const auto created=request("modelimport.extract",params);
                showDocument(request("document.open",{{"path",created.at("path")}}));refreshFiles();return;
            }
            if(kind!="mesh"){statusText(wide(row->at("id")).c_str());return;}
            const auto setting=chooseMenu({L"표시",L"그림자 생성",L"그림자 받기"});if(!setting)return;
            const std::vector<std::string> keys={"visible","castShadow","receiveShadow"};
            const auto& key=keys.at(*setting);
            const auto previous=row->at("overrides").value(key,Json());
            const auto choice=chooseMenu({previous.is_null()?L"● 원본 설정":L"원본 설정",previous==true?L"● 켜기":L"켜기",previous==false?L"● 끄기":L"끄기"});
            if(!choice)return;
            params.update({{"action","override"},{"key",key},{"value",*choice==0?Json():Json(*choice==1)}});
        }
        showDocument(request("modelimport.edit",params));
    }
    std::optional<double> worldNumber(const wchar_t* title,double current){
        const auto value=inputName(title,wide(Json(current).dump()),24);
        if(value.empty())return {};
        const auto number=Json::parse(utf8(value),nullptr,false);
        if(!number.is_number()||!std::isfinite(number.get<double>()))throw std::runtime_error("숫자를 입력하세요.");
        return number.get<double>();
    }
    std::optional<std::array<double,3>> worldVector(const std::array<const wchar_t*,3>& titles,const std::array<double,3>& initial){
        auto values=initial;
        for(std::size_t i=0;i<values.size();++i){
            const auto number=worldNumber(titles[i],initial[i]);if(!number)return {};
            values[i]=*number;
        }
        return values;
    }
    void configureWorld(){
        if(!worldOpen()||sourceMode)return;
        const auto kind=document.at("kind").get<std::string>();
        if(kind!="terrain"&&kind!="foliage")return;
        const auto data=Json::parse(document.at("text").get<std::string>());
        if(kind=="terrain"){
            const auto mode=chooseMenu({L"높이 올리기",L"높이 내리기",L"높이 맞추기",L"평활화",L"레이어 칠하기",L"구멍 뚫기",L"구멍 메우기",L"높이 스탬프"});if(!mode)return;
            const std::array<const char*,8> modes={"raise","lower","flatten","smooth","paint","hole","fillHole","stamp"};
            auto settings=worldBrush;
            settings["mode"]=modes[*mode];
            const auto radius=worldNumber(L"지형 브러시 반경",settings.at("radius"));if(!radius)return;
            const auto strength=worldNumber(L"지형 브러시 강도",settings.at("strength"));if(!strength)return;
            settings["radius"]=*radius;settings["strength"]=*strength;
            if(*mode==2||*mode==7){const auto height=worldNumber(L"높이",settings.at("height"));if(!height)return;settings["height"]=*height;}
            if(*mode==4){
                std::vector<std::wstring> labels;
                for(const auto& layer:data.at("layers"))labels.push_back(wide(layer.at("name")));
                const auto layer=chooseMenu(labels);if(!layer)return;settings["layer"]=*layer;
            }
            if(*radius<=0||*radius>1000000||*strength<0||*strength>10000)throw std::runtime_error("지형 브러시 반경과 강도를 확인하세요.");
            worldBrush=std::move(settings);previewViewport.useBrush(true);
        }else{
            const auto tool=chooseMenu({L"산포 브러시 · Shift로 소거",L"인스턴스 선택"});if(!tool)return;
            if(*tool==0){
                const auto radius=worldNumber(L"폴리지 브러시 반경",foliageBrush.at("radius"));if(!radius)return;
                const auto count=worldNumber(L"한 번에 뿌릴 인스턴스 수",foliageBrush.at("count"));if(!count)return;
                const auto spacing=worldNumber(L"폴리지 최소 간격",foliageBrush.at("minDistance"));if(!spacing)return;
                if(*radius<.001||*radius>1000000||*count<0||*count>1000000||std::floor(*count)!=*count||*spacing<.0001||*spacing>100000)
                    throw std::runtime_error("폴리지 브러시 설정을 확인하세요.");
                foliageBrush={{"radius",*radius},{"count",int(*count)},{"minDistance",*spacing}};
            }
            foliageSelect=*tool==1;previewViewport.useBrush(!foliageSelect);
        }
        previewOpen=true;layout();
    }
    Json meshEditSettings(const char* operation){
        auto vertices=worldVertices;
        Json faces=Json::array();
        for(const auto& [face,ids]:worldFaces){faces.push_back(face);vertices.insert(ids.begin(),ids.end());}
        for(const auto& edge:worldEdges)vertices.insert(edge.begin(),edge.end());
        return {{"operation",operation},{"faces",faces},{"vertices",vertices},{"edges",worldEdges}};
    }
    void startMeshAtlas(){
        if(document.value("kind",std::string())!="mesh"||sourceMode||meshAtlasRunning)return;
        const auto channel=chooseMenu({L"UV0",L"UV1 · 라이트맵"});if(!channel)return;
        const auto resolution=worldNumber(L"아틀라스 해상도",512);if(!resolution)return;
        const auto padding=worldNumber(L"섬 사이 여백 (픽셀)",4);if(!padding)return;
        if(*resolution<32||*resolution>8192||std::floor(*resolution)!=*resolution||*padding<0||
            *padding>*resolution/8||std::floor(*padding)!=*padding)throw std::runtime_error("아틀라스 해상도와 여백을 확인하세요.");
        request("world.meshAtlasStart",{{"settings",{{"channel",*channel},{"resolution",int(*resolution)},{"padding",int(*padding)}}},
            {"expectedRevision",document.at("revision")}});
        meshAtlasRunning=true;SetTimer(window,12,150,nullptr);statusText(L"UV 아틀라스를 만들고 있어요.");
    }
    bool pollMeshAtlas(){
        if(!meshAtlasRunning)return true;
        const auto result=request("world.meshAtlasStatus",{{"apply",true}});
        const auto state=result.at("status").get<std::string>();
        if(state=="running"){
            if(result.contains("progress"))statusText((L"UV 아틀라스 · "+wide(result.at("progress").at("value").dump())+L"%").c_str());
            return false;
        }
        meshAtlasRunning=false;
        if(state=="error")throw std::runtime_error(result.at("error").get<std::string>());
        if(state=="done"){
            const auto changed=request("document.read",{{"path",result.at("path")}});
            if(document.at("path")==result.at("path")){
                clearWorldMeshSelection();meshUVCenter=nullptr;showDocument(changed);
            }else{
                syncDocumentWindows(changed,nullptr);
                document["tabs"]=changed.at("tabs");refreshTabs();
            }
            statusText(L"UV 아틀라스를 생성했어요.");
        }
        return true;
    }
    Json refreshMeshUV(Json pick=nullptr){
        const auto [width,height]=assetCanvas.canvasSize();
        if(width<=0||height<=0)return nullptr;
        const auto scale=std::min(1.,1280./std::max(width,height));
        Json faces=Json::array();for(const auto& [face,vertices]:worldFaces)faces.push_back(face);
        Json input={{"channel",meshUVChannel},{"width",std::max(1,int(width*scale))},{"height",std::max(1,int(height*scale))},
            {"zoom",meshUVZoom},{"faces",faces},{"expectedRevision",document.at("revision")}};
        if(!meshUVCenter.is_null())input["center"]=meshUVCenter;
        if(!pick.is_null())input["pick"]=std::move(pick);
        auto result=request("world.meshUVView",input);
        meshUVCenter=result.at("center");meshUVZoom=result.at("zoom");meshUVUnit=result.at("unit");
        auto pixels=takePixels(result);
        assetCanvas.updateUV(result,std::move(pixels));return result;
    }
    void editMeshUVView(const Json& event){
        const auto action=event.at("event").get<std::string>();
        if(action=="uvZoom"){
            meshUVZoom=std::clamp(meshUVZoom*std::pow(1.2,event.at("delta").get<double>()),.000001,10000.);
        }else if(action=="uvPan"&&!meshUVCenter.is_null()){
            meshUVCenter[0]=meshUVCenter.at(0).get<double>()-event.at("dx").get<double>()/meshUVUnit;
            meshUVCenter[1]=meshUVCenter.at(1).get<double>()+event.at("dy").get<double>()/meshUVUnit;
        }else if(action=="uvPick"){
            const auto result=refreshMeshUV({{"point",event.at("point")},{"island",event.at("island")}});
            if(!event.at("add").get<bool>())clearWorldMeshSelection();
            if(!result.is_null()){
                const auto data=Json::parse(document.at("text").get<std::string>());
                for(const int face:result.at("selection")){
                    const auto& indices=data.at("indices");
                    if(!worldFaces.erase(face))worldFaces[face]={indices.at(face*3),indices.at(face*3+1),indices.at(face*3+2)};
                }
            }
        }else if(action=="uvTranslate"){
            if(worldFaces.empty())return;
            auto settings=meshEditSettings("uvTransform");
            settings["channel"]=meshUVChannel;settings["wholeIsland"]=false;
            settings["offset"]={event.at("dx").get<double>()/meshUVUnit,-event.at("dy").get<double>()/meshUVUnit};
            editWorld({{"action","geometry"},{"settings",settings}});
        }
        refreshMeshUV();
    }
    void editAdvancedMesh(){
        if(document.value("kind",std::string())!="mesh"||sourceMode)return;
        const auto group=chooseMenu({L"간선·영역·토폴로지",L"노멀",L"UV"});if(!group)return;
        const auto action=*group==0?chooseMenu({L"간선 분할",L"경계 루프 선택",L"경계 연결",L"개별 면 인셋",L"영역 인셋",L"영역 베벨",L"영역 재삼각화",L"정점 용접"})
            :*group==1?chooseMenu({L"플랫 노멀",L"스무스 노멀",L"UV 경계 노멀 잇기",L"선택 노멀 지정"})
            :chooseMenu({L"면별 패킹",L"섬 펼치기",L"섬 패킹",L"경계 맞추기",L"선택 면 분리",L"UV0을 UV1로 복사",L"UV1 삭제",L"UV 검사"});
        if(!action)return;
        const std::array<const char*,8> geometry={"splitEdges","","bridge","insetFaces","insetRegion","bevelRegion","retriangulateRegion","weld"};
        const std::array<const char*,4> normals={"flatNormals","smoothNormals","stitchNormals","setNormals"};
        const std::array<const char*,8> uv={"uvPack","uvUnwrap","uvPackIslands","uvStitch","uvCut","uvCopy","uvRemove",""};
        auto settings=meshEditSettings(*group==0?geometry[*action]:*group==1?normals[*action]:uv[*action]);
        if(*group==0&&*action==1){
            const auto result=request("world.meshBoundary",{{"edges",worldEdges},{"expectedRevision",document.at("revision")}});
            clearWorldMeshSelection();meshSelectionMode=1;
            for(auto edge:result.at("edges").get<std::vector<std::array<int,2>>>()){
                if(edge[1]<edge[0])std::swap(edge[0],edge[1]);
                worldEdges.insert(edge);
            }
            queuePreview();statusText((L"경계 루프 · "+wide(result.at("loops").dump())).c_str());return;
        }
        if(*group==0&&*action>=2&&*action<=5){
            const auto value=worldNumber(*action==2?L"경계 연결 시작 오프셋":L"거리",*action==2?0:.1);if(!value)return;
            settings[*action==2?"bridgeOffset":"distance"]=*value;
            if(*action==5){
                const auto height=worldNumber(L"베벨 높이",.1);if(!height)return;
                const auto segments=worldNumber(L"베벨 분할",4);if(!segments)return;
                const auto profile=chooseMenu({L"직선",L"둥글게"});if(!profile)return;
                settings.update({{"height",*height},{"segments",*segments},{"profile",*profile==0?"linear":"round"}});
            }
        }
        if(*group==0&&*action==7){
            const auto tolerance=worldNumber(L"용접 허용 오차",.001);if(!tolerance)return;
            const auto preserve=chooseMenu({L"UV 경계 유지",L"UV 경계 병합 허용"});if(!preserve)return;
            settings.update({{"tolerance",*tolerance},{"preserveUV",*preserve==0}});
        }
        if(*group==1&&*action==2){
            const auto angle=worldNumber(L"최대 노멀 각도",60);if(!angle)return;settings["maxAngle"]=*angle;
        }
        if(*group==1&&*action==3){
            if(settings.at("vertices").empty())throw std::runtime_error("노멀을 적용할 정점을 선택하세요.");
            const auto normal=worldVector({L"노멀 X",L"노멀 Y",L"노멀 Z"},{0,1,0});if(!normal)return;settings["normal"]=*normal;
        }
        if(*group==2){
            if(*action==4&&worldFaces.empty())throw std::runtime_error("분리할 UV 면을 선택하세요.");
            if(*action==6)settings["channel"]=1;
            if(*action!=0&&*action!=5&&*action!=6){
                const auto channel=chooseMenu({L"UV0",L"UV1"});if(!channel)return;settings["channel"]=*channel;
                if(*action==7){
                    const auto result=request("world.meshUVInspect",{{"channel",*channel},{"expectedRevision",document.at("revision")}});
                    clearWorldMeshSelection();
                    const auto data=Json::parse(document.at("text").get<std::string>());
                    for(const int face:result.at("faces")){
                        const auto& indices=data.at("indices");
                        worldFaces[face]={indices.at(face*3),indices.at(face*3+1),indices.at(face*3+2)};
                    }
                    queuePreview();
                    if(!result.at("present").get<bool>()){statusText(L"선택한 UV 채널이 없어요.");return;}
                    const auto status=L"UV 검사 · 겹침 "+wide(result.at("overlapPairs").dump())+L" · 범위 밖 "+
                        wide(result.at("outside").dump())+L" · 퇴화 "+wide(result.at("degenerate").dump());
                    statusText((status+(result.at("complete").get<bool>()?L"":L" · 부분 검사")).c_str());return;
                }
            }
            if(*action<=2){
                const auto padding=worldNumber(L"UV 여백",.04);if(!padding)return;settings["padding"]=*padding;
            }
        }
        editWorld({{"action","geometry"},{"settings",settings}});clearWorldMeshSelection();
    }
    void editWorldAsset(){
        if(!worldOpen()||sourceMode)return;
        const auto kind=document.at("kind").get<std::string>();
        const auto data=Json::parse(document.at("text").get<std::string>());
        if(kind=="terrain"){
            const auto name=inputName(L"지형 레이어 이름",L"Ground",120);if(name.empty())return;
            const auto color=worldVector({L"레이어 색 R (0–1)",L"레이어 색 G (0–1)",L"레이어 색 B (0–1)"},{.3,.45,.2});
            if(color)editWorld({{"action","addLayer"},{"settings",{{"name",utf8(name)},{"color",*color}}}});
        }else if(kind=="foliage"){
            if(worldInstances.empty())throw std::runtime_error("폴리지 인스턴스를 선택하세요.");
            const auto action=chooseMenu({L"이동",L"회전 지정",L"크기 지정",L"복제",L"삭제"});if(!action)return;
            Json settings={{"ids",worldInstances},{"operation",*action==3?"duplicate":*action==4?"delete":"transform"}};
            if(*action<3){
                const std::array<const char*,3> keys={"delta","rotation","scale"};
                const auto values=worldVector({L"X",L"Y",L"Z"},*action==2?std::array<double,3>{1,1,1}:std::array<double,3>{});
                if(!values)return;
                settings[keys[*action]]=*values;
            }
            editWorld({{"action","instances"},{"settings",settings}});
            if(*action==4)worldInstances.clear();
        }else if(kind=="mesh"){
            const auto action=chooseMenu({L"정점 이동",L"면 분할",L"면 압출",L"면 뒤집기",L"면 삭제",L"면 복제",L"XZ UV 투영",L"LOD용 메시 생성"});if(!action)return;
            if(*action==7){
                const auto name=inputName(L"새 메시 이름",wide(data.at("name"))+L"_LOD",80);if(name.empty())return;
                const auto cell=worldNumber(L"단순화 셀 크기",.25);if(!cell)return;
                const auto created=request("world.simplify",{{"name",utf8(name)},{"cellSize",*cell},{"expectedRevision",document.at("revision")}});
                refreshFiles();statusText(wide(created.at("path")).c_str());return;
            }
            if(worldFaces.empty()&&*action!=6&&(*action!=0||(worldVertices.empty()&&worldEdges.empty())))
                throw std::runtime_error("메시 정점이나 면을 선택하세요.");
            const std::array<const char*,7> operations={"move","subdivide","extrude","flip","deleteFaces","duplicateFaces","uvXZ"};
            auto settings=meshEditSettings(operations[*action]);
            if(*action==0){
                const auto delta=worldVector({L"이동 X",L"이동 Y",L"이동 Z"},{0,0,0});if(!delta)return;
                settings["delta"]=*delta;
            }
            if(*action==2){
                const auto distance=worldNumber(L"압출 거리",1);if(!distance)return;
                settings["distance"]=*distance;
            }
            editWorld({{"action","geometry"},{"settings",settings}});
            clearWorldMeshSelection();
        }else{
            const auto action=chooseMenu({L"LOD 단계 추가",L"LOD 단계 삭제"});if(!action)return;
            if(*action==0){
                const auto type=chooseMenu({L"메시",L"지형",L"폴리지"});if(!type)return;
                const std::array<const wchar_t*,3> extensions={L".hbmesh.json",L".hbterrain.json",L".hbfoliage.json"};
                const auto asset=chooseProjectAsset(L"LOD 단계 에셋",extensions[*type]);if(asset.empty())return;
                const auto& levels=data.at("levels");
                const bool distance=data.at("mode")=="distance";
                const double initial=levels.empty()?1.0:levels.back().at("threshold").get<double>()*(distance?2.:.5);
                const auto threshold=worldNumber(distance?L"거리 기준":L"화면 높이 비율",initial);if(!threshold)return;
                editWorld({{"action","addLevel"},{"settings",{{"asset",asset},{"threshold",*threshold}}}});
            }else{
                std::vector<std::wstring> labels;
                for(const auto& level:data.at("levels"))labels.push_back(wide(level.at("asset")));
                if(labels.empty())return;
                const auto level=chooseMenu(labels);
                if(level)editWorld({{"action","removeLevel"},{"settings",{{"index",*level}}}});
            }
        }
    }
    void perform(Command command){
        if(playProcess&&(command==OpenProject||command==NewProject||command>=RecentBase))
            throw std::runtime_error("플레이를 중지한 뒤 프로젝트를 바꾸세요.");
        if(command>=RecentBase&&std::size_t(command-RecentBase)<recent.size()){
            if(!closeDocumentWindows())return;
            captureSource();openProject(request("project.open",{{"file",recent.at(command-RecentBase).at("file")}}));return;
        }
        switch(command){
        case WidgetAnchor:{
            if(!widgetOpen()||sourceMode||widgetSelection.empty())return;
            const auto choice=chooseMenu({L"왼쪽 위",L"오른쪽 위",L"왼쪽 아래",L"오른쪽 아래",L"가운데",L"전체 늘이기",L"가로 늘이기"});
            if(!choice)return;
            const std::array<const char*,7> keys={"topLeft","topRight","bottomLeft","bottomRight","center","stretch","wide"};
            editWidget({{"action","anchor"},{"id",widgetSelection},{"key",keys.at(*choice)}});return;
        }
        case WidgetMobile:{
            if(!widgetOpen()||sourceMode)return;
            const auto choice=chooseMenu({L"조이스틱과 버튼",L"십자 키와 버튼"});
            if(choice)editWidget({{"action","mobile"},{"key",*choice==0?"Joystick":"DPad"}});
            return;
        }
        case NewCppClass:{
            captureSource();
            const auto name=inputName(L"C++ 클래스 이름",L"NewActor",80);
            if(name.empty())return;
            const auto parents=request("cpp.parents");std::vector<std::wstring> labels;
            for(const auto& parent:parents)labels.push_back(wide(parent));
            const auto parent=chooseMenu(labels);if(!parent)return;
            const auto destination=folder=="Source"||folder.rfind("Source/",0)==0?folder:std::string("Source");
            showDocument(request("cpp.create",{{"folder",destination},{"name",utf8(name)},{"parent",parents.at(*parent)}}));
            if(folder==destination)refreshFiles();else navigateFolder(destination);return;
        }
        case RenameAsset:{
            const int i=ListView_GetNextItem(files,-1,LVNI_SELECTED);
            if(i<0||i>=int(entries.size()))return;
            const auto entry=entries.at(i);
            const auto name=inputName(L"에셋 이름 바꾸기",wide(entry.at("name")),220);
            if(name.empty())return;
            request("content.rename",{{"path",entry.at("path")},{"name",utf8(name)}});
            refreshFiles();statusText(L"에셋 이름을 바꿨어요.");return;
        }
        case ExternalCpp:
            if(document.contains("path"))request("cpp.openExternal",{{"path",document.at("path")}});
            return;
        case CppBlueprint:{
            if(!document.contains("path"))return;
            captureSource();const auto classes=request("cpp.classes");
            std::vector<std::wstring> labels;
            for(const auto& row:classes.at("classes"))labels.push_back(wide(row));
            const auto choice=chooseMenu(labels);if(!choice)return;
            const auto name=inputName(L"블루프린트 이름",L"BP_"+labels.at(*choice),80);if(name.empty())return;
            const auto destination=folder=="Assets"||folder.rfind("Assets/",0)==0?folder:std::string("Assets");
            showDocument(request("cpp.blueprint",{{"folder",destination},{"name",utf8(name)},{"className",classes.at("classes").at(*choice)},{"headerPath",classes.at("headerPath")},{"sourcePath",classes.at("sourcePath")}}));
            if(folder==destination)refreshFiles();else navigateFolder(destination);return;
        }
        case CompileCpp:
            if(document.contains("path")){
                captureSource();request("cpp.build",{{"expectedRevision",document.at("revision")}});
                statusText(L"C++ 클래스를 컴파일하고 있어요.");SetTimer(window,9,150,nullptr);
            }
            return;
        case ShowAudioWaveform:case PlayAudioPreview:
            if(sourceMode||!audioAssetOpen())return;
            if(command==PlayAudioPreview&&audioPreviewPlaying){stopAudioPreview();return;}
            stopAudioPreview();
            assetCanvas.updateWaveform(request("asset.audioPreview",{{"play",command==PlayAudioPreview}}));
            audioPreviewPlaying=command==PlayAudioPreview;return;
        case PlaySpriteAnimation:
            if(sourceMode||document.value("kind",std::string())!="spriteanimation")return;
            if(spritePlayStart){stopSpritePreview();refreshImage();}
            else{spritePlayStart=GetTickCount64();spriteFrame=-1;spritePreviewTick();if(spritePlayStart)SetTimer(window,8,33,nullptr);}
            return;
        case EditSpriteFrames:{
            if(sourceMode||document.value("kind",std::string())!="spriteanimation")return;
            stopSpritePreview();
            const auto data=Json::parse(document.at("text").get<std::string>());
            const auto choice=chooseMenu({L"프레임 선택",L"스프라이트 추가",L"선택 프레임 길이",L"선택 프레임 앞으로",L"선택 프레임 삭제"});
            if(!choice)return;
            if(*choice==0){
                std::vector<std::wstring> names;
                for(const auto& frame:data.at("frames"))names.push_back(fs::u8path(frame.at("sprite").get<std::string>()).filename().wstring());
                const auto index=chooseMenu(names);if(index){imageIndex=unsigned(*index);refreshImage();}return;
            }
            Json input={{"index",imageIndex},{"expectedRevision",document.at("revision")}};
            if(*choice==1){
                const auto selected=pickFile(false,L"스프라이트",L".hbsprite.json",L"",projectRoot/L"Assets");
                if(selected.empty())return;
                const auto relative=fs::relative(fs::path(selected),projectRoot);
                if(relative.empty()||*relative.begin()!=L"Assets")throw std::runtime_error("프로젝트의 스프라이트를 선택하세요.");
                input["action"]="add";input["asset"]=utf8(relative.generic_wstring());imageIndex=unsigned(data.at("frames").size());
            }else{
                if(imageIndex>=data.at("frames").size())return;
                if(*choice==2){
                    const auto duration=inputName(L"프레임 길이 (초)",wide(data.at("frames").at(imageIndex).at("duration").dump()),12);
                    if(duration.empty())return;
                    input["action"]="duration";input["duration"]=Json::parse(utf8(duration));
                }else if(*choice==3){if(!imageIndex)return;input["action"]="up";--imageIndex;}
                else{input["action"]="delete";if(imageIndex>0)--imageIndex;}
            }
            showDocument(request("spriteAnimation.edit",input));return;
        }
        case EditTileBrush:{
            if(sourceMode||!tilemapOpen())return;
            const auto options=request("tilemap.view",{{"columns",1},{"rows",1}}).at("layers");
            std::vector<std::wstring> names;
            for(const auto& layer:options)names.push_back(wide(layer.at("name")));
            const auto layer=chooseMenu(names);if(!layer)return;
            const auto tool=chooseMenu({L"붓",L"지우개",L"사각형",L"채우기"});if(!tool)return;
            const auto index=inputName(L"타일 번호",std::to_wstring(tileIndex),7);if(index.empty())return;
            std::size_t count=0;const auto value=std::stoi(index,&count);
            if(count!=index.size()||value<0||value>1048575)throw std::runtime_error("타일 번호를 확인하세요.");
            const std::array<const char*,4> tools={"brush","erase","rectangle","fill"};
            tileLayer=options.at(*layer).at("id");tileTool=tools.at(*tool);tileIndex=value;return;
        }
        case ConfigureWorld:configureWorld();return;
        case EditWorld:editWorldAsset();return;
        case MeshAdvanced:editAdvancedMesh();return;
        case MeshUVView:
            if(document.value("kind",std::string())=="mesh"&&!sourceMode){
                const auto view=chooseMenu({L"3D 미리보기",L"UV0",L"UV1"});if(!view)return;
                meshUVOpen=*view!=0;meshUVChannel=meshUVOpen?unsigned(*view-1):0;meshUVCenter=nullptr;meshUVZoom=1;
                layout();
            }
            return;
        case MeshUVFit:if(meshUVOpen){meshUVCenter=nullptr;refreshMeshUV();}return;
        case MeshAtlasStart:startMeshAtlas();return;
        case MeshAtlasCancel:
            if(meshAtlasRunning){request("world.meshAtlasCancel");meshAtlasRunning=false;KillTimer(window,12);statusText(L"UV 작업을 취소했어요.");}
            return;
        case MeshSelection:
            if(document.value("kind",std::string())=="mesh"&&!sourceMode){
                const auto mode=chooseMenu({L"면",L"간선",L"정점"});if(!mode)return;
                meshSelectionMode=unsigned(*mode);clearWorldMeshSelection();queuePreview();
            }
            return;
        case ShowCurve:
            if(document.value("kind",std::string())!="sequenceasset"||sourceMode)return;
            if(curveView){assetCanvas.updateTimeline(request("timeline.read"));curveView=false;timelineChannel=-1;}
            else{
                if(timelineTrack.empty()){statusText(L"타임라인에서 곡선 트랙을 선택하세요.");return;}
                assetCanvas.updateCurve(request("timeline.curveGraph",{{"track",timelineTrack}}));curveView=true;refreshCurveHandles();
            }
            return;
        case EditSequenceCurve:{
            if(sourceMode||document.value("kind",std::string())!="sequenceasset"||timelineTrack.empty())return;
            const auto options=request("timeline.curveOptions",{{"track",timelineTrack},{"index",timelineKey}});
            const auto selected=chooseMenu({L"키 보간",L"이전 범위",L"이후 범위",L"트랙 곡선 도구"});
            if(!selected)return;
            const std::array<const char*,4> keys={"interpolation","preInfinity","postInfinity","tool"};
            const auto& items=options.at(*selected==0?"interpolation":*selected==3?"tools":"infinity");
            if(items.empty()){statusText(L"곡선 키 또는 값 트랙을 선택하세요.");return;}
            std::vector<std::wstring> labels;
            for(const auto& item:items)labels.push_back(wide(item));
            const auto choice=chooseMenu(labels);if(!choice)return;
            showDocument(request("timeline.curveEdit",{{"track",timelineTrack},{"index",timelineKey},{"key",keys.at(*selected)},
                {"value",items.at(*choice)},{"expectedRevision",document.at("revision")}}));
            return;
        }
        case EditTransition:{
            if(sourceMode||document.value("kind",std::string())!="animgraph"||view.rfind("machine:",0)!=0)return;
            const auto transitions=request("graph.transitions",{{"view",view}});
            std::vector<std::wstring> labels;
            for(const auto& transition:transitions)labels.push_back(wide(transition.at("label")));
            if(labels.empty()){statusText(L"그래프에서 상태를 연결해 전이를 먼저 추가하세요.");return;}
            const auto choice=chooseMenu(labels);if(!choice)return;
            selectedTransition=transitions.at(*choice).at("id");graphSelection.clear();fieldPath=Json::array();
            refreshForm();layout();return;
        }
        case PlayScene:startPlay();return;
        case EditTakeInheritance:{
            if(document.value("kind",std::string())!="takepreset")return;
            const auto choice=chooseMenu({L"상위 프리셋 선택",L"그룹별 상속·재정의",L"유효 설정을 복사하고 상속 해제"});if(!choice)return;
            Json input={{"expectedRevision",document.at("revision")}};
            if(*choice==0){
                const auto parent=chooseProjectAsset(L"상위 녹화 프리셋",L".hbtakepreset.json");if(parent.empty())return;
                input.update({{"action","parent"},{"parent",parent}});
            }else if(*choice==1){
                const auto data=Json::parse(document.at("text").get<std::string>());
                if(!data.contains("parentPreset"))throw std::runtime_error("먼저 상위 프리셋을 선택하세요.");
                const std::vector<std::string> keys={"fps","tolerance","settings","sources","clock"};
                std::vector<std::wstring> labels={L"FPS",L"키 오차",L"녹화 설정",L"녹화 소스",L"녹화 시계"};
                const auto& overrides=data.at("overrides");
                const auto enabled=[&](std::size_t i){return std::find(overrides.begin(),overrides.end(),keys.at(i))!=overrides.end();};
                for(std::size_t i=0;i<keys.size();++i)labels.at(i)=(enabled(i)?L"재정의 · ":L"상속 · ")+labels.at(i);
                const auto field=chooseMenu(labels);if(!field)return;
                input.update({{"action","override"},{"group",keys.at(*field)},{"enabled",!enabled(*field)}});
            }else input["action"]="flatten";
            showDocument(request("take.preset.edit",input));return;
        }
        case ApplyTakePreset:case CreateTakePreset:{
            if(document.value("kind",std::string())!="sequenceasset")return;
            Json input={{"expectedRevision",document.at("revision")}};
            if(command==ApplyTakePreset){
                const auto preset=chooseProjectAsset(L"시퀀스에 적용할 녹화 프리셋",L".hbtakepreset.json");if(preset.empty())return;
                input["presetAsset"]=preset;
                showDocument(request("take.preset.apply",input));
            }else{
                const auto name=inputName(L"새 녹화 프리셋 이름",L"TakePreset",80);if(name.empty())return;
                input["name"]=utf8(name);showDocument(request("take.preset.fromSequence",input));refreshFiles();
            }
            return;
        }
        case RecordTake:{
            if(playProcess||!sceneOpen())return;
            const auto name=inputName(L"시퀀스 녹화 이름",L"Take",70);
            if(name.empty())return;
            if(name.find_first_of(L"/\\:<>?\"|*")!=std::wstring::npos)throw std::runtime_error("시퀀스 파일 이름을 확인하세요.");
            const auto targets=chooseMenu({L"선택한 오브젝트",L"장면의 모든 오브젝트"});if(!targets)return;
            const auto preset=chooseMenu({L"트랜스폼",L"트랜스폼과 컴포넌트 속성",L"녹화 프리셋 에셋"});if(!preset)return;
            auto profile=*preset==0?std::string("transform"):std::string("default");
            if(*preset==2){profile=chooseProjectAsset(L"녹화 프리셋",L".hbtakepreset.json");if(profile.empty())return;}
            startPlay({},name,profile,*targets==1);return;
        }
        case RecordAudio:{
            if(playProcess||!sceneOpen())return;
            if(!audioOutput.empty()&&fs::is_regular_file(audioOutput))throw std::runtime_error("앞서 녹음한 WAV를 저장한 뒤 다시 시작하세요.");
            const auto name=inputName(L"녹음할 WAV 이름",L"GameMix",100);
            if(name.empty())return;
            if(name.find_first_of(L"/\\:<>?\"|*")!=std::wstring::npos||name.back()==L'.'||name.back()==L' ')
                throw std::runtime_error("녹음 파일 이름을 확인하세요.");
            startPlay({},{},"transform",false,name);return;
        }
        case SaveCapturedMix:if(!playProcess)finishAudioCapture();return;
        case StopPlay:stopPlay();return;
        case ContinuePlay:case StepPlay:continuePlay(command==StepPlay);return;
        case InspectPlay:inspectPlay(true);return;
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
            navigateFolder(request("content.mkdir",{{"folder",folder},{"name",utf8(name)}}).at("path"));
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
        case SplitDocument:case SplitDocumentBelow:
            if(document.contains("path")){captureSource();openDocumentWindow(document,{{"split",true},{"below",command==SplitDocumentBelow},{"view",view},{"source",sourceMode}});}
            return;
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
        case ToggleSource:captureSource();stopSpritePreview();sourceMode=!sourceMode;layout();if(imageOpen()&&!sourceMode)refreshImage();return;
        case PickImageView:{
            if(!imageOpen()||document.at("kind")=="sprite"||document.at("kind")=="spriteanimation")return;
            const auto data=Json::parse(document.at("text").get<std::string>());
            std::vector<std::wstring> levels;
            const auto mips=data.value("mips",Json::array());
            for(std::size_t i=0;i<=mips.size();++i)levels.push_back(L"밉 "+std::to_wstring(i));
            const auto level=chooseMenu(levels);if(!level)return;
            const auto& images=*level==0?data.at("images"):mips.at(*level-1).at("images");
            std::vector<std::wstring> names;
            for(const auto& name:images)names.push_back(wide(name));
            const auto index=chooseMenu(names);if(!index)return;
            imageIndex=unsigned(*index);imageLevel=unsigned(*level);refreshImage();return;
        }
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
        case TranslateActor:case RotateActor:case ScaleActor:
            if(sceneOpen()&&!sourceMode)viewport.selectTransformTool(command==TranslateActor?"translate":command==RotateActor?"rotate":"scale");
            return;
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
            browsePercent=24;inspectorPercent=25;splitPercent=lowerSplitPercent=43;consoleVisible=false;
            if(detached)SendMessageW(detached,WM_CLOSE,0,0);
            if(contentWindow)SendMessageW(contentWindow,WM_CLOSE,0,0);
            layout();return;
        case Recovery:recoverAssets();return;
        case ModelSettings:
            if(modelOpen()){fieldPath=Json::array({"settings"});refreshForm();layout();}return;
        case ModelFocus:
            if(modelOpen()||worldOpen()){previewOpen=true;layout();drawPreview({{"command","focus"}});}return;
        case ModelSubassets:
            if(modelOpen())editModelSubasset();return;
        case ModelReimport:
            if(modelOpen()){captureSource();showDocument(request("modelimport.reimport",{{"expectedRevision",document.at("revision")}}));refreshFiles();}return;
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
                const auto changes=editBuildProfile(profile,settings.at("effective").at(profile.at("id").get<std::string>()));
                if(changes.empty())return;
                request("project.buildProfileSave",{{"id",profile.at("id")},{"expectedRevision",settings.at("revision")},{"changes",changes}});
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
            if(!folder.empty()){const auto at=folder.rfind('/');navigateFolder(at==std::string::npos?"":folder.substr(0,at));}return;
        case FolderBack:case FolderForward:{
            if(command==FolderBack&&folderPosition>0)--folderPosition;
            else if(command==FolderForward&&folderPosition+1<folderHistory.size())++folderPosition;
            else return;
            folder=folderHistory[folderPosition];showFolder();return;
        }
        case FolderPath:{
            if(projectTitle.empty())return;
            std::vector<std::wstring> labels={L"프로젝트"};std::vector<std::string> paths={""};
            for(std::size_t i=folder.find('/');i!=std::string::npos;i=folder.find('/',i+1)){
                paths.push_back(folder.substr(0,i));labels.push_back(wide(paths.back()));
            }
            if(!folder.empty()){paths.push_back(folder);labels.push_back(wide(folder));}
            if(const auto choice=chooseMenu(labels))navigateFolder(paths.at(*choice));
            return;
        }
        case AddNode:{
            if(!document.value("graph",false))return;
            const auto index=SendMessageW(palette,CB_GETCURSEL,0,0);if(index<0)return;
            auto event=graph.spawnPosition();event["action"]="add";event["key"]=model.at("palette").at(index).at("id");event["id"]=graphSelection;
            if(event.at("key")=="functionCall"){
                const auto asset=chooseProjectAsset(L"머테리얼 함수",L".hbmaterialfunction.json");
                if(asset.empty())return;
                event["asset"]=asset;
            }
            editGraph(std::move(event));return;
        }
        case RefreshMaterialFunction:
            if(!graphSelection.empty()&&document.value("graph",false)&&!gameplayGraphOpen()&&document.value("kind",std::string())!="blueprint")
                editGraph({{"action","refreshFunction"},{"id",graphSelection}});
            return;
        case EditSymbol:{
            if(document.value("kind",std::string())!="blueprint"||sourceMode)return;
            const auto members=request("blueprint.members");
            std::vector<std::wstring> labels;std::vector<std::pair<Json,bool>> entries;
            for(const auto* collection:{"dispatchers","interfaces"})for(const auto& symbol:members.at(collection)){
                const bool dispatcher=std::string(collection)=="dispatchers";
                labels.push_back((dispatcher?L"디스패처 · ":L"인터페이스 · ")+wide(symbol.at("name")));
                entries.push_back({symbol,dispatcher});
            }
            const auto selected=chooseMenu(labels);if(!selected)return;
            const auto& [symbol,dispatcher]=entries.at(*selected);
            const auto direction=dispatcher?std::optional<std::size_t>(0):chooseMenu({L"입력 핀",L"출력 핀"});if(!direction)return;
            const auto field=*direction?"outputs":"inputs";
            auto ports=symbol.at(field);
            std::vector<std::wstring> actions={L"핀 추가"};
            for(const auto& pin:ports)actions.push_back(wide(pin.at("label")));
            const auto action=chooseMenu(actions);if(!action)return;
            if(*action==0){
                const auto name=inputName(L"핀 이름");if(name.empty())return;
                std::vector<std::wstring> types;for(const auto& row:members.at("types"))types.push_back(wide(row.at("label")));
                const auto type=chooseMenu(types);if(!type)return;
                const auto container=chooseMenu({L"단일 값",L"배열"});if(!container)return;
                const auto pin=request("blueprint.newPort",{{"label",utf8(name)},{"type",members.at("types").at(*type).at("id")},{"array",*container==1}});
                ports.push_back(pin);
            }else{
                const auto edit=chooseMenu({L"핀 이름 변경",L"핀 삭제"});if(!edit)return;
                if(*edit==1)ports.erase(ports.begin()+(*action-1));
                else{auto& pin=ports.at(*action-1);const auto name=inputName(L"핀 이름",wide(pin.at("label")));if(name.empty())return;pin["label"]=utf8(name);}
            }
            showDocument(request("blueprint.symbolPorts",{{"id",symbol.at("id")},{"direction",field},{"ports",std::move(ports)},{"expectedRevision",document.at("revision")}}));
            return;
        }
        case AddVariable:case AddFunction:case AddMacro:case AddDispatcher:case AddInterface:{
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
            const auto name=inputName(command==AddVariable?L"변수 이름":command==AddFunction?L"함수 이름":command==AddMacro?L"매크로 이름":command==AddDispatcher?L"디스패처 이름":L"인터페이스 이름");
            if(name.empty())return;
            auto changed=request("blueprint.memberAdd",{{"kind",command==AddVariable?"variable":command==AddFunction?"function":command==AddMacro?"macro":command==AddDispatcher?"dispatcher":"interface"},{"name",utf8(name)},{"type",type},{"expectedRevision",document.at("revision")}});
            if(command==AddFunction||command==AddMacro){view=changed.at("view");graph.resetView();graphSelection.clear();}
            showDocument(std::move(changed));return;
        }
        default:return;
        }
    }
    LRESULT event(HWND owner,UINT message,WPARAM w,LPARAM l){
        if(owner==window&&message==redockMessage){redockDocument(reinterpret_cast<HWND>(w));return 0;}
        if(const auto it=documentWindows.find(owner);it!=documentWindows.end()){
            try{return documentWindowEvent(owner,it->second,message,w,l);}
            catch(const std::exception& error){SetWindowTextW(it->second.status,wide(std::string(error.what())).c_str());return 0;}
        }
        if(owner!=window&&owner!=detached&&owner!=contentWindow)return DefWindowProcW(owner,message,w,l);
        if(moveDivider(owner,message,l))return 0;
        if(message==WM_SETCURSOR&&LOWORD(l)==HTCLIENT){
            POINT point{};GetCursorPos(&point);ScreenToClient(owner,&point);
            const auto part=dividerAt(owner,point.x,point.y);
            if(part!=Divider::None){SetCursor(LoadCursorW(nullptr,part==Divider::LowerDocuments||part==Divider::Documents&&splitBelow?IDC_SIZENS:IDC_SIZEWE));return TRUE;}
        }
        if(message==WM_DPICHANGED){
            const auto& rect=*reinterpret_cast<const RECT*>(l);
            SetWindowPos(owner,nullptr,rect.left,rect.top,rect.right-rect.left,rect.bottom-rect.top,SWP_NOZORDER|SWP_NOACTIVATE);
            return 0;
        }
        if(message==WM_SIZE){layout();return 0;}
        if(message==WM_TIMER&&w==1){KillTimer(window,1);refreshFiles();return 0;}
        if(message==WM_APP+44&&owner==window){if(queuedFolder)navigateFolder(std::move(*queuedFolder));return 0;}
        if(message==WM_TIMER&&w==10){
            try{if(pollContentList())KillTimer(window,10);}
            catch(...){KillTimer(window,10);throw;}
            return 0;
        }
        if(message==WM_TIMER&&w==2){
            KillTimer(window,2);viewportQueued=false;
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
            if(previewOpen&&canPreview()&&!sourceMode&&!meshUVOpen){auto input=std::move(previewInput);previewInput=nullptr;applyPreviewInput(input.is_object()?std::move(input):Json::object());}
            return 0;
        }
        if(message==WM_APP+43&&owner==window){
            if(playProcess&&w==playPid){
                ++playBreaks;atBreakpoint=true;readPlayBreakpoint();
                statusText(L"블루프린트 중단점 · 장면 메뉴에서 위치·값을 보거나 실행을 이어가세요.");
            }
            return 0;
        }
        if(message==WM_TIMER&&w==6){
            if(playProcess&&WaitForSingleObject(playProcess,0)==WAIT_TIMEOUT){if(stopPlayRequested)stopPlay();return 0;}
            KillTimer(window,6);
            if(playProcess){
                DWORD result=0;GetExitCodeProcess(playProcess,&result);CloseHandle(playProcess);playProcess=nullptr;playPid=0;
                CloseHandle(playJob);playJob=nullptr;
                statusText(result?L"플레이 실행 오류. 세션 로그를 확인하세요.":L"플레이를 종료했어요.");
                if(!result)try{finishTake();finishAudioCapture();}catch(const std::exception& error){report(error);}
            }
            if(closeAfterPlay){closeAfterPlay=false;PostMessageW(window,WM_CLOSE,0,0);}
            return 0;
        }
        if(message==WM_TIMER&&w==12){
            try{if(pollMeshAtlas())KillTimer(window,12);}
            catch(...){meshAtlasRunning=false;KillTimer(window,12);throw;}
            return 0;
        }
        if(message==WM_TIMER&&w==11){KillTimer(window,11);if(meshUVOpen&&!sourceMode)refreshMeshUV();return 0;}
        if(message==WM_TIMER&&w==7){KillTimer(window,7);if(tilemapOpen()&&!sourceMode)refreshTilemap();return 0;}
        if(message==WM_TIMER&&w==8){try{spritePreviewTick();}catch(...){stopSpritePreview();throw;}return 0;}
        if(message==WM_TIMER&&w==9){
            const auto result=request("cpp.buildStatus");
            if(result.at("status")=="running")return 0;
            KillTimer(window,9);
            if(result.at("status")=="done")statusText((L"C++ 빌드 성공 · "+wide(result.at("compiler"))).c_str());
            else if(result.contains("error"))statusText(wide(result.at("error")).c_str());
            return 0;
        }
        if(message==WM_COMMAND){
            const auto id=Command(LOWORD(w));
            if(id==Search&&HIWORD(w)==EN_CHANGE&&!updating)SetTimer(window,1,180,nullptr);
            else if(id==ContentType&&HIWORD(w)==CBN_SELCHANGE&&!updating)refreshFiles();
            else if(id==ContentRecursive&&HIWORD(w)==BN_CLICKED)refreshFiles();
            else if(id==ContentTiles&&HIWORD(w)==BN_CLICKED){setBrowserTiles(SendMessageW(assetTiles,BM_GETCHECK,0,0)==BST_CHECKED);layout();}
            else if(id==Source&&HIWORD(w)==EN_CHANGE&&!updating){sourceChanged=true;SetWindowTextW(status,L"저장하지 않은 변경 사항");}
            else if(id==Views&&HIWORD(w)==CBN_SELCHANGE){
                const auto i=SendMessageW(views,CB_GETCURSEL,0,0);
                if(i>=0){
                    if(sceneOpen()){selectCameraView(cameraRows.at(i),cameraId,cameraDirection,cameraOutputs);queueViewport();}
                    else{view=model.at("views").at(i).at(0);graph.resetView();graphSelection.clear();selectedTransition.clear();refreshGraph();layout();}
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
            if(header->hwndFrom==folderTree&&header->code==TVN_SELCHANGEDW&&!refreshingFolders){
                const auto index=reinterpret_cast<const NMTREEVIEWW*>(l)->itemNew.lParam;
                if(index>=0&&std::size_t(index)<=browserFolders.size()){
                    queuedFolder=index?browserFolders.at(index-1).at("path").get<std::string>():"";
                    if(!PostMessageW(window,WM_APP+44,0,0))throw std::runtime_error("콘텐츠 폴더 열기를 요청하지 못했어요.");
                }
                return 0;
            }
            if(header->hwndFrom==files&&header->code==LVN_GETDISPINFOW){
                auto& item=reinterpret_cast<NMLVDISPINFOW*>(l)->item;
                if(item.iItem>=0&&item.iItem<int(entries.size())){
                    const auto& row=entries.at(item.iItem);
                    if(item.mask&LVIF_IMAGE)item.iImage=row.at("kind")=="folder"?0:1;
                    if((item.mask&LVIF_TEXT)&&item.pszText&&item.cchTextMax>0){
                        const auto name=wide(row.at("name"));
                        lstrcpynW(item.pszText,name.c_str(),item.cchTextMax);
                    }
                }
            }
            if(header->hwndFrom==files&&header->code==LVN_BEGINDRAG){
                const auto index=reinterpret_cast<const NMLISTVIEW*>(l)->iItem;
                if(index>=0&&index<int(entries.size())&&entries.at(index).at("kind")!="folder"){
                    draggedAsset=entries.at(index).at("path");SetCapture(files);
                }
                return 0;
            }
            if(header->hwndFrom==files&&header->code==LVN_KEYDOWN&&reinterpret_cast<const NMLVKEYDOWN*>(l)->wVKey==VK_F2){perform(RenameAsset);return 0;}
            if(header->hwndFrom==files&&(header->code==NM_DBLCLK||header->code==NM_RETURN)){
                const int i=ListView_GetNextItem(files,-1,LVNI_SELECTED);
                if(i>=0&&i<int(entries.size())){
                    const auto item=entries.at(i);
                    if(item.at("kind")=="folder")navigateFolder(item.at("path"));
                    else{captureSource();showDocument(request(item.at("kind")=="model"?"modelimport.open":"document.open",{{"path",item.at("path")}}));}
                }
            }
            return 0;
        }
        if(message==WM_CLOSE){
            if(owner==detached){detached=nullptr;attachDocument(window);DestroyWindow(owner);return 0;}
            if(owner==contentWindow){contentWindow=nullptr;attachBrowser(window);DestroyWindow(owner);return 0;}
            if(playProcess){closeAfterPlay=true;stopPlay();statusText(L"플레이를 종료하고 있어요.");return 0;}
            if(building){SetWindowTextW(status,L"빌드가 끝나면 창을 닫을 수 있어요.");return 0;}
            auto panes=documentWindowLayout();
            if(!closeDocumentWindows()||!confirmWorkspace())return 0;
            saveLayout(std::move(panes));
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
    ~NativeEditorShell(){if(playProcess){stopPlay();CloseHandle(playProcess);}if(playJob)CloseHandle(playJob);while(!documentWindows.empty())destroyDocumentWindow(documentWindows.begin()->first);if(IsWindow(window))DestroyWindow(window);if(assetIcons)ImageList_Destroy(assetIcons);if(font)DeleteObject(font);if(childInput)CloseHandle(childInput);if(job)CloseHandle(job);if(childOutput)CloseHandle(childOutput);}
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
        restoreDocumentWindows();
        ACCEL keys[]={{FVIRTKEY|FCONTROL,'O',OpenProject},{FVIRTKEY|FCONTROL,'S',Save},{FVIRTKEY|FCONTROL,'W',CloseDocument},{FVIRTKEY|FCONTROL,'Z',Undo},{FVIRTKEY|FCONTROL,'Y',Redo},{FVIRTKEY|FALT,VK_UP,Up},{FVIRTKEY,VK_F5,PlayScene},{FVIRTKEY|FSHIFT,VK_F5,StopPlay}};
        const auto accelerator=CreateAcceleratorTableW(keys,int(std::size(keys)));
        MSG message;
        while(GetMessageW(&message,nullptr,0,0)>0){
            HWND owner=message.hwnd;
            while(owner&&owner!=window&&!documentWindows.count(owner)&&(GetWindowLongPtrW(owner,GWL_STYLE)&WS_CHILD))owner=GetParent(owner);
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
        navigateFolder("Assets/Empty");
        SendMessageW(folderBack,BM_CLICK,0,0);
        if(folder!="Assets"||!IsWindowEnabled(folderForward))throw std::runtime_error("Native folder history back failed");
        SendMessageW(folderForward,BM_CLICK,0,0);
        if(folder!="Assets/Empty"||IsWindowEnabled(folderForward))throw std::runtime_error("Native folder history forward failed");
        command(Up);
        const auto branch=std::find_if(browserFolders.begin(),browserFolders.end(),[](const Json& row){return row.at("path")=="Assets/Empty";});
        if(branch==browserFolders.end())throw std::runtime_error("Native folder tree item missing");
        NMTREEVIEWW selection{};selection.hdr.hwndFrom=folderTree;selection.hdr.code=TVN_SELCHANGEDW;selection.itemNew.lParam=1+(branch-browserFolders.begin());
        SendMessageW(window,WM_NOTIFY,ContentFolders,LPARAM(&selection));
        MSG navigation{};
        if(PeekMessageW(&navigation,window,WM_APP+44,WM_APP+44,PM_REMOVE))DispatchMessageW(&navigation);
        if(folder!="Assets/Empty")throw std::runtime_error("Native folder tree selection failed");
        command(Up);
        const auto imageType=std::find_if(assetTypes.begin(),assetTypes.end(),[](const Json& row){return row.at("kind")=="sprite";});
        if(imageType==assetTypes.end())throw std::runtime_error("Native asset type filter missing");
        SendMessageW(assetType,CB_SETCURSEL,1+(imageType-assetTypes.begin()),0);
        SendMessageW(window,WM_COMMAND,MAKEWPARAM(ContentType,CBN_SELCHANGE),LPARAM(assetType));
        if(std::none_of(entries.begin(),entries.end(),[](const Json& row){return row.at("kind")=="sprite";})||
            std::any_of(entries.begin(),entries.end(),[](const Json& row){return row.at("kind")!="folder"&&row.at("kind")!="sprite";}))
            throw std::runtime_error("Native asset type filter failed");
        SendMessageW(assetType,CB_SETCURSEL,0,0);refreshFiles();
        SendMessageW(assetTiles,BM_CLICK,0,0);
        if(!browserTiles||SendMessageW(files,LVM_GETVIEW,0,0)!=LV_VIEW_SMALLICON)throw std::runtime_error("Native asset icon view failed");
        SendMessageW(assetTiles,BM_CLICK,0,0);
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
        viewport.probe(WM_RBUTTONDOWN,MK_RBUTTON,MAKELPARAM(20,20));
        viewport.probe(WM_KEYDOWN,'W',0);Sleep(24);viewport.probe(WM_TIMER,1,0);
        auto flight=std::move(cameraInput);cameraInput=nullptr;
        viewport.probe(WM_KEYUP,'W',0);viewport.probe(WM_RBUTTONUP,0,MAKELPARAM(20,20));
        if(!flight.is_object()||drawViewport(std::move(flight)).at("cameraPosition")==afterZoom.at("cameraPosition"))throw std::runtime_error("Native viewport flight failed");
        SendMessageW(views,CB_SETCURSEL,4,0);
        SendMessageW(window,WM_COMMAND,MAKEWPARAM(Views,CBN_SELCHANGE),LPARAM(views));
        if(cameraDirection!="top"||drawViewport().at("projection")!="orthographic")throw std::runtime_error("Native top viewport failed");
        SendMessageW(views,CB_SETCURSEL,2,0);
        SendMessageW(window,WM_COMMAND,MAKEWPARAM(Views,CBN_SELCHANGE),LPARAM(views));
        if(drawViewport().at("projection")!="perspective")throw std::runtime_error("Native perspective viewport restore failed");
        viewport.probe(WM_LBUTTONDOWN,MK_LBUTTON|MK_SHIFT,MAKELPARAM(220,220));
        viewport.probe(WM_MOUSEMOVE,MK_LBUTTON|MK_SHIFT,MAKELPARAM(255,228));
        const auto moveBefore=Json::parse(document.at("text").get<std::string>()).at("objects").back().at("position");
        auto previewMove=std::move(cameraInput);cameraInput=nullptr;
        if(!drawViewport(std::move(previewMove)).contains("translation")||Json::parse(document.at("text").get<std::string>()).at("objects").back().at("position")!=moveBefore)
            throw std::runtime_error("Native viewport move preview failed");
        viewport.probe(WM_LBUTTONUP,MK_SHIFT,MAKELPARAM(255,228));
        auto finishMove=std::move(cameraInput);cameraInput=nullptr;drawViewport(std::move(finishMove));
        if(Json::parse(document.at("text").get<std::string>()).at("objects").back().at("position")==moveBefore)throw std::runtime_error("Native viewport transform failed");
        command(Undo);
        if(Json::parse(document.at("text").get<std::string>()).at("objects").back().at("position")!=moveBefore)throw std::runtime_error("Native viewport transform undo failed");
        command(Save);
        const auto inspectActor=[&]{return Json::parse(document.at("text").get<std::string>()).at("objects").back();};
        const auto transformBefore=inspectActor();
        Json transformEvidence=Json::object();
        for(const auto& [key,field]:std::array<std::pair<WPARAM,const char*>,3>{{{'W',"position"},{'E',"rotation"},{'R',"scale"}}}){
            viewport.probe(WM_KEYDOWN,key,0);
            const auto state=drawViewport();
            const auto& segments=state.at("segments");
            if(segments.empty())throw std::runtime_error("Native transform handles missing");
            const auto& segment=segments.front();
            const double x0=segment.at(1),y0=segment.at(2),x1=segment.at(3),y1=segment.at(4);
            const double length=std::hypot(x1-x0,y1-y0);
            const auto x=std::lround((x0+x1)*.5),y=std::lround((y0+y1)*.5);
            const auto xEnd=x+std::lround(34*(x1-x0)/length),yEnd=y+std::lround(34*(y1-y0)/length);
            viewport.probe(WM_LBUTTONDOWN,MK_LBUTTON,MAKELPARAM(x,y));
            viewport.probe(WM_MOUSEMOVE,MK_LBUTTON,MAKELPARAM(xEnd,yEnd));
            auto preview=std::move(cameraInput);cameraInput=nullptr;
            if(preview.value("command",std::string())!="transformPreview")throw std::runtime_error("Native transform hit failed");
            const auto frame=drawViewport(std::move(preview));
            if((!frame.contains("translation")&&!frame.contains("sceneTransform"))||inspectActor()!=transformBefore)throw std::runtime_error("Native transform preview failed");
            viewport.probe(WM_LBUTTONUP,0,MAKELPARAM(xEnd,yEnd));
            auto commit=std::move(cameraInput);cameraInput=nullptr;drawViewport(std::move(commit));
            const auto after=inspectActor();
            if(after.at(field)==transformBefore.at(field))throw std::runtime_error(std::string("Native transform commit failed: ")+field);
            for(const auto* other:{"position","rotation","scale"})
                if(std::string(other)!=field&&after.at(other)!=transformBefore.at(other))throw std::runtime_error("Native transform changed a separate field");
            command(Undo);
            if(inspectActor()!=transformBefore)throw std::runtime_error("Native transform undo failed");
            transformEvidence[field]=true;
        }
        viewport.probe(WM_KEYDOWN,'W',0);
        const auto beforeAssetDrop=Json::parse(document.at("text").get<std::string>()).at("objects").size();
        const auto surface=viewport.size();
        POINT dropPoint{surface.cx/2,surface.cy/2};
        viewport.toScreen(dropPoint);ScreenToClient(files,&dropPoint);
        draggedAsset="Assets/S_Native.hbsprite.json";
        SendMessageW(files,WM_LBUTTONUP,0,MAKELPARAM(dropPoint.x,dropPoint.y));
        const auto placed=Json::parse(document.at("text").get<std::string>()).at("objects");
        if(placed.size()!=beforeAssetDrop+1||placed.back().at("kind")!="sprite"||placed.back().at("id")!=sceneSelection)
            throw std::runtime_error("Native scene asset drop failed: "+utf8(controlText(status)));
        command(Undo);
        if(Json::parse(document.at("text").get<std::string>()).at("objects").size()!=beforeAssetDrop)
            throw std::runtime_error("Native scene asset drop undo failed");
        Json playEvidence;
        if(!env(L"HB_EDITOR_TEST_PLAYER").empty()){
            auto playReport=smoke;playReport+=L".play.json";
            startPlay(playReport,L"NativeTake","Assets/TakeNative.hbtakepreset.json",true,L"NativeMix");waitForPlaySmoke();
            const auto result=Json::parse(read(playReport));
            playEvidence={{"frames",result.at("frames")},{"webview",result.at("webview")},{"backend",result.at("renderer").at("backend")},{"scene",result.at("logic").at("scene")}};
            if(playEvidence.at("frames")!=16||playEvidence.at("webview")!=false||playEvidence.at("backend")!="D3D12"||playEvidence.at("scene")!=document.at("path"))
                throw std::runtime_error("Native editor play evidence mismatch");
            finishAudioCapture();
            finishTake();
            const auto take=Json::parse(document.at("text").get<std::string>());
            if(std::none_of(take.at("tracks").begin(),take.at("tracks").end(),[&](const Json& row){return row.at("target")==newCube&&row.at("type")=="component";}))
                throw std::runtime_error("Native editor take has no recorded object");
            playEvidence["take"]=document.at("path");
            showDocument(request("document.open",{{"path","Assets/Scenes/NativeDebug.hbscene.json"}}));
            auto debugReport=smoke;debugReport+=L".debug.json";
            startPlay(debugReport);waitForPlaySmoke();
            const auto debug=Json::parse(read(debugReport));
            if(playBreaks!=2||debug.at("logic").at("logs").dump().find("HB_BREAK_NEXT")==std::string::npos)throw std::runtime_error("Native breakpoint, step and continue failed");
            if(!playDebug.is_object()||playDebug.at("file")!="Assets/BP_NativeDebug.hbblueprint.json"||
                playDebug.at("variables").empty()||playDebug.at("variables").front().at("value")!="27"||
                playDebug.at("watched").empty()||playDebug.at("watched").front().at("value")!="미실행")
                throw std::runtime_error("Native debugger snapshot failed: "+playDebug.dump());
            atBreakpoint=true;inspectPlay(false);atBreakpoint=false;
            if(document.at("path")!=playDebug.at("file")||graphSelection!=playDebug.at("node"))
                throw std::runtime_error("Native debugger graph focus failed");
            showDocument(request("document.open",{{"path",playEvidence.at("take")}}));
        }
        showDocument(request("document.open",{{"path","Assets/Scenes/NativeCameras.hbscene.json"}}));
        SendMessageW(views,CB_SETCURSEL,1,0);
        SendMessageW(window,WM_COMMAND,MAKEWPARAM(Views,CBN_SELCHANGE),LPARAM(views));
        const auto multiCamera=drawViewport({{"capture",true}});
        if(multiCamera.at("backend")!="D3D12"||multiCamera.at("cameraViews")!=2)throw std::runtime_error("Native camera composition failed: "+multiCamera.dump());
        const auto cameraSize=viewport.size();
        for(int i=0;i<2;++i){
            const auto picked=drawViewport({{"command","pick"},{"x",cameraSize.cx*(i?3:1)/4},{"y",cameraSize.cy/2}});
            if(picked.at("selection")!=(i?"cube-right":"cube-left"))throw std::runtime_error("Native camera region selection failed: "+picked.dump());
        }
        command(PinDocument);
        const auto cameraWindow=documentWindows.begin()->first;
        auto& cameraPane=documentWindows.at(cameraWindow);
        SendMessageW(cameraPane.viewPicker,CB_SETCURSEL,1,0);
        SendMessageW(cameraWindow,WM_COMMAND,MAKEWPARAM(DocView,CBN_SELCHANGE),LPARAM(cameraPane.viewPicker));
        const auto independentCamera=drawWindowScene(cameraWindow,cameraPane,{{"capture",true}});
        if(independentCamera.at("backend")!="D3D12"||independentCamera.at("cameraViews")!=2)throw std::runtime_error("Independent native scene surface failed");
        SendMessageW(cameraWindow,WM_CLOSE,0,0);
        if(!sceneSurfaces.empty()||!documentWindows.empty())throw std::runtime_error("Independent scene surface close failed");
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
        assetCanvas.probeSelectFirstKey();
        if(timelineTrack.empty()||timelineKey!=0)throw std::runtime_error("Sequence curve key selection failed");
        showDocument(request("timeline.curveEdit",{{"track",timelineTrack},{"index",timelineKey},{"key","interpolation"},{"value","constant"},{"expectedRevision",document.at("revision")}}));
        command(ShowCurve);assetCanvas.probePaint();assetCanvas.probeCurveDrag();
        const auto curveTrack=Json::parse(document.at("text").get<std::string>()).at("tracks").front();
        const auto curveValue=curveTrack.at("keys").front().at("value").at(0).get<double>();
        if(curveValue<=0||assetCanvas.inspect().at("backend")!="D3D12")
            throw std::runtime_error("Native sequence curve editing failed: "+std::to_string(curveValue)+" "+assetCanvas.inspect().dump()+" "+utf8(controlText(status)));
        assetCanvas.probeCurveHandle();
        const auto curveEdited=Json::parse(document.at("text").get<std::string>()).at("tracks").front().at("keys").front();
        if(!curveEdited.contains("leaveControl")||curveEdited.at("leaveControl").at(0).get<double>()<=0)
            throw std::runtime_error("Native curve tangent editing failed: "+utf8(controlText(status)));
        const auto groupBefore=Json::parse(document.at("text").get<std::string>()).at("tracks").front().at("keys");
        assetCanvas.probeCurveGroup();
        const auto groupAfter=Json::parse(document.at("text").get<std::string>()).at("tracks").front().at("keys");
        for(std::size_t i=0;i<2;++i){
            if(groupAfter.at(i).at("value").at(0).get<double>()<=groupBefore.at(i).at("value").at(0).get<double>()||groupAfter.at(i).at("value").at(1)!=groupBefore.at(i).at("value").at(1))
                throw std::runtime_error("Native curve multi-key editing failed: "+utf8(controlText(status)));
        }
        assetCanvas.probeCurveBox();
        const auto boxAfter=Json::parse(document.at("text").get<std::string>()).at("tracks").front().at("keys");
        for(std::size_t i=0;i<2;++i)
            if(boxAfter.at(i).at("value").at(1).get<double>()<=groupAfter.at(i).at("value").at(1).get<double>())
                throw std::runtime_error("Native curve selection box did not move selected channels");
        showDocument(request("timeline.curveEdit",{{"track",timelineTrack},{"index",timelineKey},{"key","interpolation"},{"value","constant"},{"expectedRevision",document.at("revision")}}));
        command(ShowCurve);
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
        refreshWidget();assetCanvas.probeResizeWidget(widget,24,12);
        const auto resizedWidget=Json::parse(document.at("text").get<std::string>()).at("nodes").back();
        if(resizedWidget.at("slot").at("offset").at(2).get<double>()<=widgetDocument.at("nodes").back().at("slot").at("offset").at(2).get<double>())
            throw std::runtime_error("Native widget resize failed");
        refreshWidget();assetCanvas.probePaint();
        const auto widgetSurface=assetCanvas.inspect();
        if(widgetSurface.at("backend")!="D3D12"||widgetSurface.at("rows")<2)
            throw std::runtime_error("Native widget canvas failed");
        command(Save);
        showDocument(request("document.open",{{"path","Assets/Blueprints/BP_Garden.hbblueprint.json"}}));
        const auto count=model.at("nodes").size();
        graphSearchProbe=L"print";
        graph.probePalette(456,376);
        if(!graphSearchProbe.empty()||model.at("nodes").back().at("x")!=420)throw std::runtime_error("Native graph palette search failed");
        if(model.at("nodes").size()!=count+1)throw std::runtime_error("Blueprint node creation failed");
        command(Undo);if(model.at("nodes").size()!=count)throw std::runtime_error("Blueprint undo failed");
        command(Redo);
        const auto movedId=model.at("nodes").back().at("id").get<std::string>();
        graph.probeMove(movedId,32,16);
        if(model.at("nodes").back().at("x")!=452||model.at("nodes").back().at("y")!=356)throw std::runtime_error("Blueprint native drag failed");
        editGraph({{"action","add"},{"key","print"},{"x",145},{"y",340}});
        const auto edgeCount=model.at("edges").size();
        graph.probeWire({{"node",model.at("nodes").back().at("id")},{"pin","then"}},{{"node",movedId},{"pin","exec"}});
        if(model.at("edges").size()!=edgeCount+1)throw std::runtime_error("Blueprint native connection failed");
        graphSearchProbe=wide(movedId);graph.probeFind();
        if(graphSelection!=movedId)throw std::runtime_error("Native graph node find failed");
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
        graphPane.graph->probeMove(graphPane.model.at("nodes").front().at("id"),0,0);
        if(graphPane.selection.empty())throw std::runtime_error("Independent graph selection failed");
        graphPane.graphForm->probe({{"action","paint"}});
        if(graphPane.graphForm->inspect().at("backend")!="D3D12")throw std::runtime_error("Independent graph inspector present failed");
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
        saveLayout(documentWindowLayout());
        if(!closeDocumentWindows())throw std::runtime_error("Independent documents close failed");
        restoreDocumentWindows();
        if(documentWindows.size()!=2||document.at("kind")!="montage")throw std::runtime_error("Independent document layout restore changed the active document");
        if(!closeDocumentWindows())throw std::runtime_error("Restored independent documents close failed");
        showDocument(request("document.open",{{"path",document.at("tabs").front().at("path")}}));
        RECT firstTab{};if(!TabCtrl_GetItemRect(tabs,0,&firstTab))throw std::runtime_error("Native tab missing");
        const auto firstPath=document.at("tabs").front().at("path");
        RECT client{};GetClientRect(window,&client);
        POINT splitDrop{client.right-30,client.bottom/2};ClientToScreen(window,&splitDrop);
        dropTab(firstPath.get<std::string>(),splitDrop);
        if(!splitDocument||GetParent(splitDocument)!=window)throw std::runtime_error("Split document is not inside the main editor");
        const int splitX=splitDivider.left+2,splitY=splitDivider.top+65;
        SendMessageW(window,WM_LBUTTONDOWN,MK_LBUTTON,MAKELPARAM(splitX,splitY));
        SendMessageW(window,WM_MOUSEMOVE,MK_LBUTTON,MAKELPARAM(splitX-90,splitY));
        SendMessageW(window,WM_LBUTTONUP,0,MAKELPARAM(splitX-90,splitY));
        if(splitPercent<=43)throw std::runtime_error("Document split divider drag failed");
        POINT belowDrop{belowTarget.left+25,belowTarget.bottom-25};ClientToScreen(window,&belowDrop);
        dropTab(firstPath.get<std::string>(),belowDrop);
        if(!splitBelow||splitDivider.right<=splitDivider.left+5)throw std::runtime_error("Bottom document split failed");
        const int belowX=splitDivider.left+25,belowY=splitDivider.top+2;
        const auto previousSplitPercent=splitPercent;
        SendMessageW(window,WM_LBUTTONDOWN,MK_LBUTTON,MAKELPARAM(belowX,belowY));
        SendMessageW(window,WM_MOUSEMOVE,MK_LBUTTON,MAKELPARAM(belowX,belowY+70));
        SendMessageW(window,WM_LBUTTONUP,0,MAKELPARAM(belowX,belowY+70));
        if(splitPercent>=previousSplitPercent)throw std::runtime_error("Bottom divider drag failed");
        const auto resizedSplitPercent=splitPercent;
        saveLayout(documentWindowLayout());closeDocumentWindows();restoreDocumentWindows();
        if(!splitDocument||!splitBelow||splitPercent!=resizedSplitPercent||documentWindows.at(splitDocument).doc.at("path")!=firstPath)throw std::runtime_error("Split document restore failed");
        redockDocument(splitDocument);
        if(splitDocument)throw std::runtime_error("Split document merge failed");
        const auto lowerPath=document.at("tabs").at(1).at("path");
        openDocumentWindow(request("document.read",{{"path",firstPath}}),{{"split",true}});
        openDocumentWindow(request("document.read",{{"path",lowerPath}}),{{"split",true},{"below",true}});
        if(!splitDocument||!lowerSplitDocument||documentWindows.size()!=2||splitBelow)throw std::runtime_error("Native right and lower split failed");
        const auto lowerBefore=lowerSplitPercent;
        const auto lx=lowerSplitDivider.left+25,ly=lowerSplitDivider.top+2;
        SendMessageW(window,WM_LBUTTONDOWN,MK_LBUTTON,MAKELPARAM(lx,ly));
        SendMessageW(window,WM_MOUSEMOVE,MK_LBUTTON,MAKELPARAM(lx,ly+45));
        SendMessageW(window,WM_LBUTTONUP,0,MAKELPARAM(lx,ly+45));
        if(lowerSplitPercent>=lowerBefore)throw std::runtime_error("Native lower split resize failed");
        saveLayout(documentWindowLayout());closeDocumentWindows();restoreDocumentWindows();
        if(!splitDocument||!lowerSplitDocument||documentWindows.at(lowerSplitDocument).doc.at("path")!=lowerPath)throw std::runtime_error("Native simultaneous split restore failed");
        if(!closeDocumentWindows())throw std::runtime_error("Native simultaneous split close failed");
        const auto startX=(firstTab.left+firstTab.right)/2,startY=(firstTab.top+firstTab.bottom)/2;
        SendMessageW(tabs,WM_LBUTTONDOWN,MK_LBUTTON,MAKELPARAM(startX,startY));
        SendMessageW(tabs,WM_MOUSEMOVE,MK_LBUTTON,MAKELPARAM(startX,startY+2000));
        SendMessageW(tabs,WM_LBUTTONUP,0,MAKELPARAM(startX,startY+2000));
        if(documentWindows.size()!=1||documentWindows.begin()->second.doc.at("path")!=firstPath)
            throw std::runtime_error("Dragging a tab out did not detach the document");
        const auto draggedWindow=documentWindows.begin()->first;
        const auto dock=GetDlgItem(draggedWindow,DocDock);
        POINT destination{startX,startY};ClientToScreen(tabs,&destination);ScreenToClient(dock,&destination);
        SendMessageW(dock,WM_LBUTTONDOWN,MK_LBUTTON,MAKELPARAM(5,5));
        SendMessageW(dock,WM_MOUSEMOVE,MK_LBUTTON,MAKELPARAM(destination.x,destination.y));
        SendMessageW(dock,WM_LBUTTONUP,0,MAKELPARAM(destination.x,destination.y));
        MSG docking{};
        if(!PeekMessageW(&docking,window,redockMessage,redockMessage,PM_REMOVE))throw std::runtime_error("Dock drop did not post");
        DispatchMessageW(&docking);
        if(!documentWindows.empty()||document.at("path")!=firstPath)throw std::runtime_error("Dragging back did not dock the document");
        auto fieldDocument=request("document.open",{{"path","Assets/Materials/PM_Native.hbphysicalmaterial.json"}});
        const auto fieldFile=fieldDocument.at("path");
        openDocumentWindow(fieldDocument);
        auto& fieldPane=documentWindows.begin()->second;
        showDocument(request("document.open",{{"path","Assets/Scenes/Garden.hbscene.json"}}));
        const auto friction=std::find_if(fieldPane.assetFields.begin(),fieldPane.assetFields.end(),[](const Json& row){return row.at("key")=="friction";});
        if(friction==fieldPane.assetFields.end())throw std::runtime_error("Independent asset property missing");
        const auto index=friction-fieldPane.assetFields.begin();
        const auto originalField=Json::parse(fieldPane.doc.at("text").get<std::string>()).at("friction");
        fieldPane.assetForm->probe({{"action","paint"}});
        fieldPane.assetForm->probe({{"action","edit"},{"i",index},{"text","0.45"}});
        const auto changedField=request("document.read",{{"path",fieldFile}});
        if(fieldPane.assetForm->inspect().at("backend")!="D3D12"||Json::parse(changedField.at("text").get<std::string>()).at("friction")!=.45||
            document.at("path")==fieldFile)throw std::runtime_error("Independent native asset form editing failed");
        SendMessageW(documentWindows.begin()->first,WM_COMMAND,Undo,0);
        if(Json::parse(fieldPane.doc.at("text").get<std::string>()).at("friction")!=originalField)
            throw std::runtime_error("Independent native asset form undo failed");
        closeDocumentWindows();
        showDocument(request("document.open",{{"path","Assets/AG_Native.hbanimgraph.json"}}));
        const auto machineView=std::find_if(model.at("views").begin(),model.at("views").end(),[](const Json& row){
            return row.at(0).get<std::string>().rfind("machine:",0)==0;
        });
        if(machineView==model.at("views").end())throw std::runtime_error("Animation machine view missing");
        SendMessageW(views,CB_SETCURSEL,machineView-model.at("views").begin(),0);
        SendMessageW(window,WM_COMMAND,MAKEWPARAM(Views,CBN_SELCHANGE),LPARAM(views));
        if(model.at("nodes").size()<4||model.at("edges").size()<2)throw std::runtime_error("Animation state graph missing nodes or transitions");
        selectedTransition=request("graph.transitions",{{"view",view}}).front().at("id");refreshForm();
        const auto durationField=std::find_if(fields.begin(),fields.end(),[](const Json& row){return row.at("key")=="duration";});
        if(durationField==fields.end())throw std::runtime_error("Transition form missing duration");
        form.probe({{"action","edit"},{"i",durationField-fields.begin()},{"text","0.35"}});
        command(Save);
        graph.probePaint();
        const auto stateSurface=graph.inspect();
        if(stateSurface.at("backend")!="D3D12")throw std::runtime_error("Animation state graph present failed");
        showDocument(request("document.open",{{"path","Assets/S_Native.hbsprite.json"}}));
        const auto paintsBefore=assetCanvas.inspect().at("paints").get<std::uint64_t>();
        assetCanvas.probePaint();
        const auto imageSurface=assetCanvas.inspect();
        if(imageSurface.at("backend")!="D3D12"||imageSurface.at("paints").get<std::uint64_t>()<=paintsBefore||imageSurface.at("pixelBytes")!=64)
            throw std::runtime_error("Sprite canvas present failed: "+imageSurface.dump());
        showDocument(request("document.open",{{"path","Assets/SA_Native.hbspriteanimation.json"}}));
        command(PlaySpriteAnimation);assetCanvas.probePaint();
        if(spriteFrame!=0||assetCanvas.inspect().at("pixelBytes")!=64)throw std::runtime_error("Native sprite animation preview failed");
        command(PlaySpriteAnimation);
        showDocument(request("document.open",{{"path","Assets/TM_Native.hbtilemap.json"}}));
        tileIndex=7;
        assetCanvas.probe(WM_LBUTTONDOWN,MK_LBUTTON,MAKELPARAM(40,40));
        assetCanvas.probe(WM_LBUTTONUP,0,MAKELPARAM(104,40));
        assetCanvas.probePaint();command(Save);
        if(request("tilemap.view",{{"columns",4},{"rows",2}}).at("tiles").size()!=3||
            assetCanvas.inspect().at("backend")!="D3D12")throw std::runtime_error("Native tilemap stroke failed: "+utf8(controlText(status)));
        showDocument(request("document.open",{{"path","Assets/TM_Iso.hbtilemap.json"}}));
        tileIndex=3;assetCanvas.probeTileCell(1,2);assetCanvas.probePaint();command(Save);
        if(request("tilemap.view",{{"columns",4},{"rows",4}}).at("tiles").size()!=1)
            throw std::runtime_error("Native isometric tile painting failed");
        navigateFolder("Assets/Models");
        const auto nativeModel=std::find_if(entries.begin(),entries.end(),[](const Json& row){return row.at("path")=="Assets/Models/NativePreview.obj";});
        if(nativeModel==entries.end())throw std::runtime_error("Native model asset missing");
        const auto modelIndex=int(nativeModel-entries.begin());
        ListView_SetItemState(files,modelIndex,LVIS_SELECTED,LVIS_SELECTED);
        NMHDR openModel{files,Assets,NM_DBLCLK};SendMessageW(window,WM_NOTIFY,Assets,LPARAM(&openModel));
        if(!modelOpen())throw std::runtime_error("Native model settings did not open from the browser");
        const auto modelPreview=drawPreview({{"capture",true},{"command","focus"}});
        if(modelPreview.at("backend")!="D3D12"||modelPreview.at("calls")<1||!modelPreview.at("warnings").empty())
            throw std::runtime_error("Native model preview: "+modelPreview.dump());
        showDocument(request("document.open",{{"path","Assets/T_Native.hbterrain.json"}}));
        const auto terrainBefore=document.at("revision");
        const auto terrainView=drawPreview({{"capture",true},{"command","focus"}});
        if(terrainView.at("backend")!="D3D12"||!terrainView.at("warnings").empty())throw std::runtime_error("Native terrain preview: "+terrainView.dump());
        const auto brushSize=previewViewport.size();
        const auto brushPoint=MAKELPARAM(brushSize.cx/2,brushSize.cy/2);
        const auto brushEnd=MAKELPARAM(brushSize.cx/2+16,brushSize.cy/2);
        previewViewport.probe(WM_LBUTTONDOWN,MK_LBUTTON,brushPoint);
        previewViewport.probe(WM_MOUSEMOVE,MK_LBUTTON,brushEnd);
        previewViewport.probe(WM_LBUTTONUP,0,brushEnd);
        if(previewInput.value("command",std::string())!="worldBrush"||previewInput.at("points").size()!=2)
            throw std::runtime_error("Native terrain pointer stroke missing");
        auto stroke=std::exchange(previewInput,Json());
        const auto terrainStroke=applyPreviewInput(std::move(stroke));
        if(document.at("revision")==terrainBefore||terrainStroke.at("worldBrush").empty())throw std::runtime_error("Native terrain stroke failed");
        command(Undo);
        if(document.at("revision")!=terrainBefore)throw std::runtime_error("Native terrain stroke undo failed");
        command(Redo);command(Save);
        showDocument(request("document.open",{{"path","Assets/F_Native.hbfoliage.json"}}));
        drawPreview({{"command","focus"}});
        const auto foliageView=applyPreviewInput({{"command","worldBrush"},{"points",{{brushSize.cx/2,brushSize.cy/2}}}});
        const auto planted=Json::parse(document.at("text").get<std::string>()).at("instances");
        if(foliageView.at("backend")!="D3D12"||!foliageView.at("warnings").empty()||planted.empty())
            throw std::runtime_error("Native foliage paint: "+foliageView.dump());
        const auto changedFoliage=drawPreview({{"capture",true}});
        if(changedFoliage.at("calls")<1||!changedFoliage.at("warnings").empty())throw std::runtime_error("Native foliage preview after paint: "+changedFoliage.dump());
        command(Save);
        showDocument(request("document.open",{{"path","Assets/SM_Native.hbmesh.json"}}));
        const auto meshView=drawPreview({{"capture",true},{"command","focus"}});
        const auto hit=applyPreviewInput({{"command","pick"},{"x",brushSize.cx/2},{"y",brushSize.cy/2}});
        if(meshView.at("backend")!="D3D12"||!meshView.at("warnings").empty()||worldFaces.size()!=1)
            throw std::runtime_error("Native mesh face selection: "+hit.dump());
        editWorld({{"action","geometry"},{"settings",{{"operation","subdivide"},{"faces",{worldFaces.begin()->first}}}}});
        clearWorldMeshSelection();meshSelectionMode=1;
        applyPreviewInput({{"command","pick"},{"x",brushSize.cx/2},{"y",brushSize.cy/2}});
        if(worldEdges.size()!=1)throw std::runtime_error("Native mesh edge selection failed");
        const auto beforeEdges=Json::parse(document.at("text").get<std::string>()).at("indices").size();
        editWorld({{"action","geometry"},{"settings",meshEditSettings("splitEdges")}});
        if(Json::parse(document.at("text").get<std::string>()).at("indices").size()<=beforeEdges)
            throw std::runtime_error("Native mesh edge split failed");
        command(Undo);
        clearWorldMeshSelection();meshSelectionMode=2;
        applyPreviewInput({{"command","pick"},{"x",brushSize.cx/2},{"y",brushSize.cy/2}});
        if(worldVertices.size()!=1)throw std::runtime_error("Native mesh vertex selection failed");
        auto normal=meshEditSettings("setNormals");normal["normal"]={0,1,0};
        editWorld({{"action","geometry"},{"settings",normal}});
        auto mesh=Json::parse(document.at("text").get<std::string>());
        if(mesh.at("normals").at(*worldVertices.begin())!=Json::array({0,1,0}))
            throw std::runtime_error("Native mesh vertex normal failed");
        editWorld({{"action","geometry"},{"settings",meshEditSettings("uvCopy")}});
        const auto inspection=request("world.meshUVInspect",{{"channel",1},{"expectedRevision",document.at("revision")}});
        if(inspection.at("present")!=true||inspection.at("triangles")!=15)
            throw std::runtime_error("Native UV copy and inspection failed");
        clearWorldMeshSelection();meshUVOpen=true;meshUVChannel=1;layout();
        const auto uv=refreshMeshUV();
        const int ux=uv.at("width").get<int>()/2,uy=uv.at("height").get<int>()/2;
        assetCanvas.probe(WM_LBUTTONDOWN,MK_LBUTTON,MAKELPARAM(ux,uy));
        assetCanvas.probe(WM_LBUTTONUP,0,MAKELPARAM(ux,uy));
        if(worldFaces.empty())throw std::runtime_error("Native UV face pick failed");
        const auto uvBefore=document.at("revision");
        assetCanvas.probe(WM_LBUTTONDOWN,MK_LBUTTON,MAKELPARAM(ux,uy));
        assetCanvas.probe(WM_LBUTTONUP,0,MAKELPARAM(ux+12,uy));
        assetCanvas.probePaint();
        if(document.at("revision")==uvBefore||assetCanvas.inspect().at("backend")!="D3D12")
            throw std::runtime_error("Native UV drag and presentation failed");
        command(Undo);
        if(document.at("revision")!=uvBefore)throw std::runtime_error("Native UV drag undo failed");
        command(Save);
        showDocument(request("document.open",{{"path","Assets/LOD_Native.hblod.json"}}));
        editWorld({{"action","addLevel"},{"settings",{{"asset","Assets/SM_Native.hbmesh.json"},{"threshold",1}}}});
        const auto lodView=drawPreview({{"capture",true},{"command","focus"}});
        if(lodView.at("backend")!="D3D12"||lodView.at("calls")<1||!lodView.at("warnings").empty())
            throw std::runtime_error("Native LOD preview: "+lodView.dump());
        command(Save);
        showDocument(request("document.open",{{"path","Assets/A_Native.hbaudioasset.json"}}));
        command(ShowAudioWaveform);assetCanvas.probePaint();
        if(assetCanvas.inspect().at("backend")!="D3D12")throw std::runtime_error("Native waveform present failed");
        write(smoke,Json{{"ok",true},{"webview",GetModuleHandleW(L"WebView2Loader.dll")!=nullptr},{"assets",assets},{"contentDock",savedLayout.at("contentDetached")},{"outputLog",savedLayout.at("console")},{"sceneSurface",sceneSurface},{"sceneColors",colors.size()},{"sceneTransforms",transformEvidence},{"sceneAssetDrop",true},{"graphSearchAndWire",true},{"newCube",newCube},{"play",playEvidence},{"timelineSurface",timelineSurface},{"widgetSurface",widgetSurface},{"widget",widget},{"blueprintNodes",count+2},{"materialNodes",materialCount+1},{"blueprintSurface",blueprintSurface},{"materialSurface",materialSurface},{"materialPreview",{{"backend",materialPreview.at("backend")},{"calls",materialPreview.at("calls")}}},{"componentPreview",{{"backend",componentPreview.at("backend")},{"calls",componentPreview.at("calls")}}},{"assetSurface",{{"backend",assetSurface.at("backend")},{"paints",assetSurface.at("paints")}}},{"imageSurface",imageSurface},{"stateSurface",stateSurface},{"independentDocuments",independentDocuments},{"simultaneousDocking",true},{"browserTreeAndFilter",true},{"modelImportPreview",true},{"worldAssets",{{"backend","D3D12"},{"terrain",true},{"foliage",true},{"mesh",true},{"meshTools",true},{"uvView",true},{"lod",true}}},{"curveBox",true},{"debugSnapshot",playDebug},{"independentAssetForm",true},{"debugBreaks",playBreaks},{"saved",!document.at("dirty").get<bool>()}}.dump());
        return 0;
    }
};
