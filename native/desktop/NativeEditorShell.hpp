#pragma once
#include "EditorGraphPanel.hpp"
#include "EditorFormPanel.hpp"
#include <commctrl.h>
#include <shobjidl.h>

class NativeEditorShell {
    using Json=nlohmann::json;
    HWND window=nullptr,detached=nullptr,files=nullptr,tabs=nullptr,source=nullptr,search=nullptr,palette=nullptr,views=nullptr,status=nullptr;
    HINSTANCE instance;
    HFONT font=nullptr;
    HANDLE childInput=nullptr,childOutput=nullptr,job=nullptr;
    std::string buffered,folder,view="event",graphSelection;
    std::wstring projectTitle;
    fs::path projectRoot;
    Json entries=Json::array(),document=Json::object(),model=Json::object(),fieldPath=Json::array(),fields=Json::array(),recent=Json::array(),graphInputs=Json::array();
    EditorGraphPanel graph;
    EditorFormPanel form;
    std::uint64_t formRevision=0;
    bool sourceMode=false,updating=false,sourceChanged=false,acceptance=false;
    enum Command {OpenProject=100,NewProject,Save,CloseDocument,Undo,Redo,Detach,ToggleSource,AddNode,Up,Search,Assets,Tabs,Source,Palette,Views,Status,NewAsset,RecentBase=200};
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
    Json request(const char* method,Json params=Json::object()){
        auto message=Json{{"method",method},{"params",std::move(params)}}.dump()+"\n";
        for(std::size_t at=0;at<message.size();){
            DWORD bytes=0;
            if(!WriteFile(childInput,message.data()+at,DWORD(std::min<std::size_t>(message.size()-at,65536)),&bytes,nullptr)||!bytes)throw std::runtime_error("편집기 서비스가 종료됐어요.");
            at+=bytes;
        }
        auto end=buffered.find('\n');
        while(end==std::string::npos){
            char data[32768];DWORD bytes=0;
            if(!ReadFile(childOutput,data,sizeof(data),&bytes,nullptr)||!bytes)throw std::runtime_error("편집기 서비스 응답을 읽지 못했어요.");
            const auto old=buffered.size();buffered.append(data,bytes);end=buffered.find('\n',old);
        }
        const auto reply=Json::parse(buffered.substr(0,end));
        buffered.erase(0,end+1);
        if(!reply.at("ok").get<bool>())throw std::runtime_error(reply.at("error").get<std::string>());
        return reply.at("value");
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
                if(event.at("event")=="select"){
                    graphSelection=event.at("id").get<std::string>();refreshGraphInputs();layout();
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
                if(document.value("graph",false)){
                    const auto& input=graphInputs.at(i);
                    Json value=event.contains("checked")?event.at("checked"):event.at("value");
                    if(value.is_string()&&!input.at("value").is_string())value=Json::parse(value.get<std::string>());
                    editGraph({{"action","input"},{"id",graphSelection},{"pin",input.at("id")},{"value",std::move(value)}});
                    return;
                }
                if(i==int(fields.size())){if(!fieldPath.empty())fieldPath.erase(fieldPath.end()-1);refreshForm();layout();return;}
                const auto key=fields.at(i).at("key");
                if(action=="click"){fieldPath.push_back(key);refreshForm();layout();return;}
                showDocument(request("asset.fieldEdit",{{"parts",fieldPath},{"key",key},{"value",event.contains("checked")?event.at("checked"):event.at("value")},{"expectedRevision",document.at("revision")}}));
            }catch(const std::exception& error){report(error);}
        },"asset");
        const auto graphics=std::make_shared<EditorD3D12Surface::Graphics>();
        graph.useD3D12(graphics);form.useD3D12(graphics);
        const HMENU main=CreateMenu(),file=CreatePopupMenu(),edit=CreatePopupMenu(),viewMenu=CreatePopupMenu();
        AppendMenuW(file,MF_STRING,OpenProject,L"프로젝트 열기\tCtrl+O");
        AppendMenuW(file,MF_STRING,NewProject,L"새 프로젝트");
        recentMenu=CreatePopupMenu();
        AppendMenuW(file,MF_POPUP,UINT_PTR(recentMenu),L"최근 프로젝트");
        AppendMenuW(file,MF_SEPARATOR,0,nullptr);
        AppendMenuW(file,MF_STRING,NewAsset,L"새 에셋");
        AppendMenuW(file,MF_STRING,Save,L"문서 저장\tCtrl+S");
        AppendMenuW(file,MF_STRING,CloseDocument,L"문서 닫기\tCtrl+W");
        AppendMenuW(edit,MF_STRING,Undo,L"되돌리기\tCtrl+Z");
        AppendMenuW(edit,MF_STRING,Redo,L"다시 적용\tCtrl+Y");
        AppendMenuW(edit,MF_STRING,AddNode,L"선택한 종류의 노드 추가");
        AppendMenuW(viewMenu,MF_STRING,Detach,L"문서 창 분리 / 합치기");
        AppendMenuW(viewMenu,MF_STRING,ToggleSource,L"편집 화면 / 소스 전환");
        AppendMenuW(viewMenu,MF_STRING,Up,L"상위 폴더\tAlt+↑");
        AppendMenuW(main,MF_POPUP,UINT_PTR(file),L"파일");AppendMenuW(main,MF_POPUP,UINT_PTR(edit),L"편집");AppendMenuW(main,MF_POPUP,UINT_PTR(viewMenu),L"보기");SetMenu(window,main);
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
        SetWindowTextW(status,wide(error.what()).c_str());
        if(!acceptance)MessageBoxW(window,wide(error.what()).c_str(),L"HBEngine",MB_OK|MB_ICONWARNING);
    }
    void layout(){
        if(!source)return;
        RECT rect{};GetClientRect(window,&rect);
        const int width=rect.right,height=rect.bottom,left=std::min(300,std::max(150,width/4));
        MoveWindow(search,5,5,left-10,27,TRUE);MoveWindow(files,5,36,left-10,std::max(1,height-61),TRUE);
        ListView_SetColumnWidth(files,0,left-31);
        MoveWindow(tabs,left,3,std::max(1,width-left-5),29,TRUE);
        MoveWindow(status,8,height-22,std::max(1,width-16),20,TRUE);
        const HWND owner=detached?detached:window;
        RECT work{};GetClientRect(owner,&work);const int x=detached?5:left+5,y=detached?4:36,w=std::max(1,int(work.right)-x-6);
        const bool graphShown=document.value("graph",false)&&!sourceMode;
        const bool formShown=document.value("form",false)&&!sourceMode;
        const int top=graphShown?y+32:y,h=std::max(1,int(work.bottom)-top-(detached?6:25));
        MoveWindow(views,x,y,std::min(230,w/2),220,TRUE);MoveWindow(palette,x+std::min(235,w/2),y,std::max(1,w-std::min(235,w/2)),300,TRUE);
        ShowWindow(views,graphShown&&!model.value("views",Json::array()).empty()?SW_SHOW:SW_HIDE);
        ShowWindow(palette,graphShown?SW_SHOW:SW_HIDE);
        MoveWindow(source,x,top,w,h,TRUE);
        ShowWindow(source,document.contains("path")&&!graphShown&&!formShown?SW_SHOW:SW_HIDE);
        const int inspectorWidth=graphShown&&w>=640?240:0;
        graph.layout(x,top,w-inspectorWidth,h,graphShown);
        form.update({{"rect",{x+w-inspectorWidth,top,inspectorWidth,h}},{"visible",graphShown&&inspectorWidth>0}});
        if(formShown)form.update({{"rect",{x,top,w,h}},{"visible",true}});
    }
    void refreshFiles(){
        if(projectTitle.empty())return;
        entries=request("content.list",{{"folder",folder},{"query",utf8(controlText(search))}}).at("entries");
        ListView_SetItemCountEx(files,int(entries.size()),LVSICF_NOINVALIDATEALL);
        InvalidateRect(files,nullptr,FALSE);
    }
    void refreshGraph(const Json& updated=Json()){
        if(!document.value("graph",false))return;
        model=updated.is_null()?request("graph.read",{{"view",view}}):updated;
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
    void refreshForm(){
        if(!document.value("form",false))return;
        try{fields=request("asset.fields",{{"parts",fieldPath}});}
        catch(const std::exception&){if(fieldPath.empty())throw;fieldPath=Json::array();fields=request("asset.fields");}
        Json rows=Json::array();
        if(!fieldPath.empty())rows.push_back({{"label",fieldPath.back()},{"controls",Json::array({{{"kind","button"},{"i",fields.size()},{"text","상위 속성"}}})}});
        for(std::size_t i=0;i<fields.size();++i){
            const auto& field=fields[i];auto control=field.at("control");control["i"]=i;
            rows.push_back({{"label",field.at("label")},{"controls",Json::array({std::move(control)})}});
        }
        form.update({{"rows",rows},{"revision",++formRevision}});
    }
    void showDocument(Json value){
        const auto previous=document.value("path",std::string());
        Json updatedGraph;
        if(value.contains("model")){updatedGraph=std::move(value.at("model"));value.erase("model");}
        document=std::move(value);updating=true;
        if(previous!=document.value("path",std::string())){view="event";sourceMode=false;graph.resetView();graphSelection.clear();fieldPath=Json::array();}
        const auto original=document.value("text",std::string());
        std::string displayed;displayed.reserve(original.size());
        for(std::size_t i=0;i<original.size();++i){
            if(original[i]=='\n'&&(i==0||original[i-1]!='\r'))displayed+='\r';
            displayed+=original[i];
        }
        SetWindowTextW(source,wide(displayed).c_str());
        sourceChanged=false;
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
        updating=false;refreshGraph(updatedGraph);refreshForm();layout();
        SetWindowTextW(status,wide(document.value("path",folder)).c_str());
    }
    void captureSource(){
        if(!sourceChanged)return;
        auto text=utf8(controlText(source));
        if(document.value("text",std::string()).find("\r\n")==std::string::npos){
            std::string normalized;normalized.reserve(text.size());
            for(std::size_t i=0;i<text.size();++i){
                if(text[i]!='\r'||i+1==text.size()||text[i+1]!='\n')normalized+=text[i];
            }
            text=std::move(normalized);
        }
        showDocument(request("document.replace",{{"text",text},{"expectedRevision",document.at("revision")}}));
    }
    void editGraph(Json event){
        captureSource();
        event["view"]=view;event["expectedRevision"]=document.at("revision");
        showDocument(request("graph.edit",event));
    }
    std::wstring pickFile(bool create,const std::wstring& description,const std::wstring& suffix,const std::wstring& name,const fs::path& initialFolder={}){
        IFileDialog* dialog=nullptr;
        const auto& clsid=create?CLSID_FileSaveDialog:CLSID_FileOpenDialog;
        if(FAILED(CoCreateInstance(clsid,nullptr,CLSCTX_INPROC_SERVER,IID_PPV_ARGS(&dialog))))throw std::runtime_error("Windows 파일 선택 창을 열 수 없어요.");
        const auto filter=L"*"+suffix;
        const COMDLG_FILTERSPEC type{description.c_str(),filter.c_str()};
        dialog->SetFileTypes(1,&type);dialog->SetDefaultExtension(suffix.c_str()+1);
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
    void openProject(Json project){
        projectTitle=wide(project.at("name"));SetWindowTextW(window,(projectTitle+L" — HBEngine").c_str());
        projectRoot=fs::path(wide(project.at("file"))).parent_path();
        folder="Assets";updating=true;SetWindowTextW(search,L"");updating=false;refreshFiles();
        showDocument(request("document.open",{{"path",project.at("startupScene")}}));
        refreshRecent();
    }
    bool confirmClose(const Json& item){
        if(!item.value("dirty",false)&&!sourceChanged)return true;
        return MessageBoxW(window,L"저장하지 않은 변경 사항을 버릴까요?",L"HBEngine",MB_YESNO|MB_ICONWARNING)==IDYES;
    }
    void attachDocument(HWND owner){
        for(HWND child:{source,palette,views}){ShowWindow(child,SW_HIDE);SetParent(child,owner);}
        graph.reparent(owner);form.reparent(owner);layout();
    }
    void perform(Command command){
        if(command>=RecentBase&&std::size_t(command-RecentBase)<recent.size()){
            captureSource();openProject(request("project.open",{{"file",recent.at(command-RecentBase).at("file")}}));return;
        }
        switch(command){
        case OpenProject:case NewProject:{
            captureSource();const auto target=pickFile(command==NewProject,L"HBEngine 프로젝트",L".hbproject",L"새 프로젝트.hbproject");
            if(target.empty())return;
            const fs::path path(target);
            openProject(command==OpenProject?request("project.open",{{"file",utf8(target)}}):request("project.create",{{"name",utf8(path.stem().wstring())},{"directory",utf8(path.parent_path().wstring())},{"template","3d"}}));
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
        case Save:
            if(!document.contains("path"))return;
            captureSource();showDocument(request("document.save",{{"expectedRevision",document.at("revision")}}));SetWindowTextW(status,L"저장했어요.");return;
        case CloseDocument:
            if(document.contains("path")&&confirmClose(document))showDocument(request("document.close",{{"path",document.at("path")},{"discard",true}}));
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
        case ToggleSource:captureSource();sourceMode=!sourceMode;layout();return;
        case Up:
            if(!folder.empty()){const auto at=folder.rfind('/');folder=at==std::string::npos?"":folder.substr(0,at);refreshFiles();}return;
        case AddNode:{
            if(!document.value("graph",false))return;
            const auto index=SendMessageW(palette,CB_GETCURSEL,0,0);if(index<0)return;
            auto event=graph.spawnPosition();event["action"]="add";event["key"]=model.at("palette").at(index).at("id");editGraph(std::move(event));return;
        }
        default:return;
        }
    }
    LRESULT event(HWND owner,UINT message,WPARAM w,LPARAM l){
        if(message==WM_SIZE){layout();return 0;}
        if(message==WM_TIMER&&w==1){KillTimer(window,1);refreshFiles();return 0;}
        if(message==WM_COMMAND){
            const auto id=Command(LOWORD(w));
            if(id==Search&&HIWORD(w)==EN_CHANGE&&!updating)SetTimer(window,1,180,nullptr);
            else if(id==Source&&HIWORD(w)==EN_CHANGE&&!updating){sourceChanged=true;SetWindowTextW(status,L"저장하지 않은 변경 사항");}
            else if(id==Views&&HIWORD(w)==CBN_SELCHANGE){
                const auto i=SendMessageW(views,CB_GETCURSEL,0,0);if(i>=0){view=model.at("views").at(i).at(0);graph.resetView();graphSelection.clear();refreshGraph();layout();}
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
            if(sourceChanged||std::any_of(document["tabs"].begin(),document["tabs"].end(),[](const Json& item){return item.value("dirty",false);}))
                if(!confirmClose({{"dirty",true}}))return 0;
            if(detached)SendMessageW(detached,WM_CLOSE,0,0);
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
    ~NativeEditorShell(){if(IsWindow(window))DestroyWindow(window);if(font)DeleteObject(font);if(childInput)CloseHandle(childInput);if(job)CloseHandle(job);if(childOutput)CloseHandle(childOutput);}
    int run(const fs::path& node,const fs::path& script,const fs::path& profile,const std::wstring& project,int show,const fs::path& smoke){
        acceptance=!smoke.empty();
        startWorker(node,script,profile);
        WNDCLASSW type{};type.hInstance=instance;type.lpszClassName=L"HBEngine.NativeAuthoring";type.lpfnWndProc=procedure;type.hCursor=LoadCursorW(nullptr,IDC_ARROW);type.hbrBackground=GetSysColorBrush(COLOR_BTNFACE);type.hIcon=LoadIconW(instance,MAKEINTRESOURCEW(101));
        RegisterClassW(&type);
        window=CreateWindowExW(0,type.lpszClassName,L"HBEngine · 네이티브 편집기",WS_OVERLAPPEDWINDOW|WS_CLIPCHILDREN,CW_USEDEFAULT,CW_USEDEFAULT,1280,850,nullptr,nullptr,instance,this);
        if(!window)throw std::runtime_error("Native editor window");
        makeControls();layout();refreshRecent();
        if(!project.empty())openProject(request("project.open",{{"file",utf8(project)}}));
        if(acceptance)return smokeTest(smoke);
        ShowWindow(window,show);
        ACCEL keys[]={{FVIRTKEY|FCONTROL,'O',OpenProject},{FVIRTKEY|FCONTROL,'S',Save},{FVIRTKEY|FCONTROL,'W',CloseDocument},{FVIRTKEY|FCONTROL,'Z',Undo},{FVIRTKEY|FCONTROL,'Y',Redo},{FVIRTKEY|FALT,VK_UP,Up}};
        const auto accelerator=CreateAcceleratorTableW(keys,int(std::size(keys)));
        MSG message;
        while(GetMessageW(&message,nullptr,0,0)>0)if(!TranslateAcceleratorW(window,accelerator,&message)){TranslateMessage(&message);DispatchMessageW(&message);}
        DestroyAcceleratorTable(accelerator);return 0;
    }
private:
    int smokeTest(const fs::path& smoke){
        if(!document.contains("path"))throw std::runtime_error("검사 프로젝트를 지정하세요.");
        SetWindowPos(window,nullptr,-20000,-20000,0,0,SWP_NOSIZE|SWP_NOZORDER|SWP_NOACTIVATE|SWP_SHOWWINDOW);
        const auto command=[this](Command id){SendMessageW(window,WM_COMMAND,id,0);};
        const auto assets=entries.size();
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
        graph.probePaint();const auto blueprintSurface=graph.inspect();
        if(blueprintSurface.at("backend")!="D3D12")throw std::runtime_error("Blueprint graph present failed: "+blueprintSurface.at("graphicsError").get<std::string>());
        command(Save);
        showDocument(request("document.open",{{"path","Assets/Materials/Moss_stone.hbmaterial.json"}}));
        const auto materialCount=model.at("nodes").size();const auto paletteEntry=model.at("palette").front();
        editGraph({{"action","add"},{"key",paletteEntry.at("id")},{"x",230},{"y",200}});
        if(model.at("nodes").size()!=materialCount+1)throw std::runtime_error("Material node creation failed");
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
        write(smoke,Json{{"ok",true},{"webview",GetModuleHandleW(L"WebView2Loader.dll")!=nullptr},{"assets",assets},{"blueprintNodes",count+2},{"materialNodes",materialCount+1},{"blueprintSurface",blueprintSurface},{"materialSurface",materialSurface},{"assetSurface",{{"backend",assetSurface.at("backend")},{"paints",assetSurface.at("paints")}}},{"saved",!document.at("dirty").get<bool>()}}.dump());
        return 0;
    }
};
