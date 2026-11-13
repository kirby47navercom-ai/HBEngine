#pragma once
// Native editor item list (content browser entries): list or tile view, multi-select, open, context menu and dragging
// items out to other editor areas. The script sends the entries; intents come back on the "hb.panel" channel.
#include "EditorPanelBase.hpp"
#include <cstring>

class EditorListPanel : public EditorPanelBase {
public:
    struct Item {std::string name,detail,icon;int depth=0;bool selected=false,folder=false;};
    void attach(HWND owner,HINSTANCE instance,Post post,const std::string& panelName){EditorPanelBase::attach(owner,instance,std::move(post),L"HBEngine.EditorListPanel",panelName);}

    // op "assets": {visible, rect, scale, theme, view:"list"|"tiles", revision, items:[{name,detail,icon,selected,folder}], focus}
    void update(const Json& model){
        if(!window)return;
        const bool atEnd=scroll>=contentHeight()-bounds[3];
        if(model.contains("items")){
            const auto nextRevision=model.value("revision",0ull);
            if(revision!=nextRevision){down=-1;dragging=false;logSelection=-1;if(GetCapture()==window)ReleaseCapture();}
            revision=nextRevision;items.clear();items.reserve(model.at("items").size());
            for(const auto& r:model.at("items")){Item item;item.name=r.value("name",std::string());item.detail=r.value("detail",std::string());item.icon=r.value("icon",std::string());item.selected=r.value("selected",false);item.folder=r.value("folder",false);item.depth=std::clamp(r.value("depth",0),0,16);items.push_back(std::move(item));}
        }
        if(model.contains("view")){tiles=model.at("view")=="tiles";log=model.at("view")=="log";}
        applyCommon(model);if(log&&atEnd)scroll=contentHeight();clampScroll();
        if(model.contains("focus")&&model.at("focus").is_number_integer())reveal(model.at("focus").get<int>());
        place();
    }
    Json inspect()const{
        Json list=Json::array();for(const auto& item:items)list.push_back({{"name",item.name},{"selected",item.selected}});
        auto out=common();out["items"]=list;out["view"]=log?"log":tiles?"tiles":"list";out["columns"]=columns();out["scroll"]=scroll;out["paintedItems"]=paintedItems;out["lastMenu"]=lastMenu;out["revision"]=revision;return out;
    }
    // Acceptance only. {action:"click"|"dblclick"|"right"|"drag"|"key"|"wheel", index, ctrl, shift, command, x, y (main-window client px), vk, delta}
    void probe(const Json& p){
        const auto action=p.at("action").get<std::string>();const WPARAM keys=(p.value("ctrl",false)?MK_CONTROL:0)|(p.value("shift",false)?MK_SHIFT:0);
        if(action=="key"){SendMessageW(window,WM_KEYDOWN,p.at("vk").get<UINT>(),0);return;}
        if(action=="wheel"){SendMessageW(window,WM_MOUSEWHEEL,MAKEWPARAM(0,short(p.at("delta").get<int>())),0);return;}
        const int index=p.at("index").get<int>();reveal(index);const RECT r=cell(index);const LPARAM at=MAKELPARAM((r.left+r.right)/2,(r.top+r.bottom)/2-scroll);probeKeys=keys;
        if(action=="click"){SendMessageW(window,WM_LBUTTONDOWN,MK_LBUTTON|keys,at);SendMessageW(window,WM_LBUTTONUP,keys,at);}
        else if(action=="dblclick"){SendMessageW(window,WM_LBUTTONDBLCLK,MK_LBUTTON|keys,at);SendMessageW(window,WM_LBUTTONUP,keys,at);}
        else if(action=="right"){automaticCommand=p.value("command",std::string());POINT screen{xOf(at),yOf(at)};ClientToScreen(window,&screen);menuAt=screen;SendMessageW(window,WM_RBUTTONUP,keys,at);}
        else if(action=="drag"){POINT end{p.at("x").get<int>(),p.at("y").get<int>()};ClientToScreen(GetParent(window),&end);ScreenToClient(window,&end);
            SendMessageW(window,WM_LBUTTONDOWN,MK_LBUTTON,at);SendMessageW(window,WM_MOUSEMOVE,MK_LBUTTON,MAKELPARAM(xOf(at)+px(12),yOf(at)+px(12)));SendMessageW(window,WM_MOUSEMOVE,MK_LBUTTON,MAKELPARAM(end.x,end.y));SendMessageW(window,WM_LBUTTONUP,0,MAKELPARAM(end.x,end.y));}
        probeKeys=0;
    }
private:
    std::vector<Item> items;bool tiles=false,log=false;int scroll=0,hover=-1,down=-1,logSelection=-1;POINT downAt{};bool dragging=false;std::uint64_t revision=0;std::size_t paintedItems=0;WPARAM probeKeys=0;
    int tileWidth()const{return px(112);}int tileHeight()const{return px(104);}int rowHeight()const{return px(30);}
    int columns()const{return tiles?std::max(1,(bounds[2]-px(10)+px(8))/(tileWidth()+px(8))):1;}
    int stride()const{return tiles?tileHeight()+px(8):rowHeight();}
    int contentHeight()const{const int rows=(int(items.size())+columns()-1)/columns();return rows*stride()+(tiles?px(10):0);}
    void clampScroll(){scroll=std::clamp(scroll,0,std::max(0,contentHeight()-bounds[3]));}
    RECT cell(int i)const{const int c=columns(),row=i/c,col=i%c;if(!tiles)return {0,row*stride(),bounds[2],row*stride()+rowHeight()};const int x=px(10)+col*(tileWidth()+px(8)),y=px(10)+row*stride();return {x,y,x+tileWidth(),y+tileHeight()};}
    void reveal(int i){if(i<0||i>=int(items.size()))return;const RECT r=cell(i);if(r.top<scroll)scroll=r.top-(tiles?px(10):0);else if(r.bottom>scroll+bounds[3])scroll=r.bottom-bounds[3]+(tiles?px(10):0);clampScroll();InvalidateRect(window,nullptr,FALSE);}
    int itemAt(int x,int y)const{
        const int top=tiles?px(10):0,left=tiles?px(10):0,step=tileWidth()+px(8);
        if(x<left||x>=bounds[2]||y<0||y>=bounds[3]||y+scroll<top)return -1;
        const int col=tiles?(x-left)/step:0,columnsHere=columns();
        if(col>=columnsHere)return -1;
        const int i=((y+scroll-top)/stride())*columnsHere+col;
        if(i>=int(items.size()))return -1;
        const RECT r=cell(i);
        return x<r.right&&y+scroll<r.bottom?i:-1;
    }
    static const wchar_t* glyph(const std::string& icon,bool folder){
        if(folder||icon=="folder")return L"";if(icon=="image"||icon=="texture"||icon=="sprite")return L"";if(icon=="material"||icon=="sphere")return L"";if(icon=="blueprint"||icon=="graph"||icon=="nodes")return L"";
        if(icon=="scene"||icon=="map"||icon=="level")return L"";if(icon=="code"||icon=="cpp")return L"";if(icon=="model"||icon=="cube"||icon=="mesh")return L"";if(icon=="volume"||icon=="audio"||icon=="media")return L"";
        if(icon=="animation"||icon=="timeline"||icon=="sequence")return L"";if(icon=="data"||icon=="table")return L"";if(icon=="font"||icon=="text")return L"";if(icon=="widget"||icon=="ui")return L"";return L"";}
    void draw()override{
        canvas->Clear(theme.background);paintedItems=0;
        IDWriteTextFormat* big=nullptr;if(tiles){write->CreateTextFormat(L"Segoe MDL2 Assets",nullptr,DWRITE_FONT_WEIGHT_NORMAL,DWRITE_FONT_STYLE_NORMAL,DWRITE_FONT_STRETCH_NORMAL,30.f*scale,L"",&big);big->SetTextAlignment(DWRITE_TEXT_ALIGNMENT_CENTER);big->SetParagraphAlignment(DWRITE_PARAGRAPH_ALIGNMENT_CENTER);}
        const int columnCount=columns(),top=tiles?px(10):0,first=std::max(0,(scroll-top)/stride())*columnCount;
        const int end=std::min(int(items.size()),(std::max(0,scroll+bounds[3]-top)/stride()+1)*columnCount);
        for(int i=first;i<end;i++){RECT r=cell(i);OffsetRect(&r,0,-scroll);if(r.bottom<=0||r.top>=bounds[3])continue;const auto& item=items[i];++paintedItems;
            const float x=float(r.left),y=float(r.top),w=float(r.right-r.left),h=float(r.bottom-r.top);const auto ink=item.folder?theme.text:theme.text;
            if(log){
                if(i==logSelection)fill(x,y,w,h,theme.selection);else if(i==hover)fill(x,y,w,h,theme.raised);
                const auto severity=item.icon=="ERROR"?D2D1::ColorF(1.f,.45f,.42f):item.icon=="WARN"?D2D1::ColorF(1.f,.77f,.3f):theme.muted;
                label(wide(item.detail),text,x+px(8),y,float(px(120)),h,severity);
                label(wide(item.name),text,x+px(132),y,w-px(143),h,ink);
            }
            else if(tiles){box(x,y,w,h,item.selected?theme.selection:(i==hover?theme.raised:theme.field),item.selected?theme.accent:theme.line);label(glyph(item.icon,item.folder),big,x,y+px(6),w,h-px(36),item.folder?theme.muted:theme.accent);
                text->SetTextAlignment(DWRITE_TEXT_ALIGNMENT_CENTER);label(wide(item.name),text,x+px(6),y+h-px(32),w-px(12),float(px(26)),ink);text->SetTextAlignment(DWRITE_TEXT_ALIGNMENT_LEADING);}
            else{if(item.selected)fill(x,y,w,h,theme.selection);else if(i==hover)fill(x,y,w,h,{theme.selection.r,theme.selection.g,theme.selection.b,.45f});
                const float indent=float(item.depth*px(11));label(glyph(item.icon,item.folder),icons,x+px(8)+indent,y,float(px(18)),h,item.folder?theme.muted:theme.accent);const float detailW=item.detail.empty()?0.f:std::min(w*.38f,float(px(170)));
                label(wide(item.name),text,x+px(32)+indent,y,w-px(40)-detailW-indent,h,ink);if(detailW>0)label(wide(item.detail),text,x+w-detailW-px(8),y,detailW,h,theme.muted);}}
        if(big)big->Release();
        if(items.empty())label(log?L"표시할 로그가 없어요.":L"표시할 에셋이 없어요.",text,float(px(12)),float(px(8)),float(bounds[2]-px(24)),float(px(28)),theme.muted);
        const int total=contentHeight();if(total>bounds[3]){const float track=float(bounds[3]),thumb=std::max(float(px(24)),track*track/total),top=(track-thumb)*scroll/std::max(1,total-bounds[3]);fill(float(bounds[2]-px(4)),top,float(px(3)),thumb,theme.line);}
    }
    void copyLogs(){
        std::wstring value;
        for(int i=0;i<int(items.size());++i)if(logSelection<0||logSelection==i)value+=wide(items[i].detail+"  "+items[i].name)+L"\r\n";
        if(value.empty()||!OpenClipboard(window))return;
        const auto bytes=(value.size()+1)*sizeof(wchar_t);const auto buffer=GlobalAlloc(GMEM_MOVEABLE,bytes);
        if(buffer){if(void* dst=GlobalLock(buffer)){std::memcpy(dst,value.c_str(),bytes);GlobalUnlock(buffer);EmptyClipboard();if(!SetClipboardData(CF_UNICODETEXT,buffer))GlobalFree(buffer);}else GlobalFree(buffer);}
        CloseClipboard();
    }
    LRESULT handle(UINT message,WPARAM w,LPARAM l)override{
        const int x=xOf(l),y=yOf(l);const bool ctrl=(w&MK_CONTROL)||(probeKeys&MK_CONTROL),shift=(w&MK_SHIFT)||(probeKeys&MK_SHIFT);
        switch(message){
        case WM_MOUSEMOVE:{if(down>=0&&(w&MK_LBUTTON)){if(!dragging&&(std::abs(x-downAt.x)>px(5)||std::abs(y-downAt.y)>px(5))&&!items[down].folder){dragging=true;SetCursor(LoadCursorW(nullptr,IDC_HAND));}return 0;}
            const int hit=itemAt(x,y);if(hit!=hover){hover=hit;InvalidateRect(window,nullptr,FALSE);TRACKMOUSEEVENT t{sizeof(t),TME_LEAVE,window,0};TrackMouseEvent(&t);}return 0;}
        case WM_MOUSELEAVE:hover=-1;InvalidateRect(window,nullptr,FALSE);return 0;
        case WM_CAPTURECHANGED:dragging=false;down=-1;return 0;
        case WM_LBUTTONDOWN:{SetFocus(window);if(log){logSelection=itemAt(x,y);InvalidateRect(window,nullptr,FALSE);return 0;}SetCapture(window);emit({{"event","focus-panel"}});down=itemAt(x,y);downAt={x,y};dragging=false;if(down>=0)emit({{"event","select"},{"index",down},{"ctrl",ctrl},{"shift",shift},{"revision",revision}});return 0;}
        case WM_LBUTTONUP:{
            // Released outside this panel: hand the selection to whatever editor area is under the cursor.
            if(dragging&&down>=0&&(x<0||y<0||x>=bounds[2]||y>=bounds[3])){POINT at{x,y};ClientToScreen(window,&at);ScreenToClient(GetParent(window),&at);emit({{"event","drop"},{"index",down},{"x",at.x},{"y",at.y},{"revision",revision}});}
            dragging=false;down=-1;if(GetCapture()==window)ReleaseCapture();return 0;}
        case WM_LBUTTONDBLCLK:{const int hit=itemAt(x,y);if(hit>=0)emit({{"event","open"},{"index",hit},{"revision",revision}});return 0;}
        case WM_RBUTTONUP:{const int hit=itemAt(x,y);POINT at{x,y};ClientToScreen(window,&at);if(!menuAt)menuAt=at;POINT client=at;ScreenToClient(GetParent(window),&client);emit({{"event","contextmenu"},{"index",hit},{"x",client.x},{"y",client.y},{"revision",revision}});return 0;}
        case WM_MOUSEWHEEL:{scroll-=int(GET_WHEEL_DELTA_WPARAM(w))*stride()*3/WHEEL_DELTA;clampScroll();InvalidateRect(window,nullptr,FALSE);return 0;}
        case WM_SETCURSOR:if(dragging){SetCursor(LoadCursorW(nullptr,IDC_HAND));return TRUE;}break;
        case WM_KEYDOWN:case WM_SYSKEYDOWN:{
            if(log&&(GetKeyState(VK_CONTROL)&0x8000)){
                if(w=='A'){logSelection=-1;InvalidateRect(window,nullptr,FALSE);return 0;}
                if(w=='C'){copyLogs();return 0;}
            }
            if(keyName(w).empty())break;forwardKey(message,w);return 0;}
        }
        return common(message,w,l);
    }
};
