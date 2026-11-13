#pragma once
// Native editor hierarchy (outliner) panel: a Win32 child window above the WebView, drawn with Direct2D/DirectWrite.
// The editor script owns the scene and sends ready-made rows; this window owns layout, painting and input and
// reports intents (select, fold, toggles, reparent, context menu, keys) back as JSON messages.
#include <d2d1.h>
#include <wincodec.h>
#include <dwrite.h>
#include <nlohmann/json.hpp>
#include <functional>
#include <algorithm>
#include <array>
#include <optional>
#include <string>
#include <vector>
#include <chrono>

class EditorTreePanel {
public:
    using Json=nlohmann::json;
    using Post=std::function<void(const Json&)>;
    struct Row {std::string id,name,icon;int depth=0;bool children=false,collapsed=false,selected=false,locked=false,visible=true;};
    enum Part {None,Fold,Item,Lock,Eye};

    void attach(HWND owner,HINSTANCE instance,Post post){
        poster=std::move(post);
        WNDCLASSW wc{};wc.style=CS_DBLCLKS;wc.lpfnWndProc=procedure;wc.hInstance=instance;wc.lpszClassName=L"HBEngine.EditorTreePanel";wc.hCursor=LoadCursorW(nullptr,IDC_ARROW);RegisterClassW(&wc);
        window=CreateWindowExW(0,wc.lpszClassName,L"",WS_CHILD|WS_CLIPSIBLINGS,0,0,1,1,owner,nullptr,instance,this);
        if(!window)throw std::runtime_error("Native hierarchy panel window");
        if(FAILED(D2D1CreateFactory(D2D1_FACTORY_TYPE_SINGLE_THREADED,__uuidof(ID2D1Factory),nullptr,reinterpret_cast<void**>(&factory))))throw std::runtime_error("Direct2D factory");
        if(FAILED(DWriteCreateFactory(DWRITE_FACTORY_TYPE_SHARED,__uuidof(IDWriteFactory),reinterpret_cast<IUnknown**>(&write))))throw std::runtime_error("DirectWrite factory");
    }
    ~EditorTreePanel(){release();if(write)write->Release();if(factory)factory->Release();if(window)DestroyWindow(window);}

    // op "hierarchy": {visible, rect:[x,y,w,h] physical pixels, scale, rows:[...], theme:{background,text,muted,accent,selection,line}, reveal}
    void update(const Json& model){
        if(!window)return;
        if(model.contains("rows")){rows.clear();for(const auto& r:model.at("rows")){Row row;row.id=r.at("id").get<std::string>();row.name=r.value("name",std::string());row.icon=r.value("icon",std::string());row.depth=std::clamp(r.value("depth",0),0,64);row.children=r.value("children",false);row.collapsed=r.value("collapsed",false);row.selected=r.value("selected",false);row.locked=r.value("locked",false);row.visible=r.value("visible",true);rows.push_back(std::move(row));}}
        if(model.contains("theme")){const auto& t=model.at("theme");const auto color=[&](const char* key,D2D1_COLOR_F& out){if(t.contains(key)){const auto& c=t.at(key);out={c.at(0).get<float>(),c.at(1).get<float>(),c.at(2).get<float>(),c.size()>3?c.at(3).get<float>():1.f};}};
            color("background",theme.background);color("text",theme.text);color("muted",theme.muted);color("accent",theme.accent);color("selection",theme.selection);color("line",theme.line);}
        if(model.contains("scale")){const float s=model.at("scale").get<float>();if(s>.5f&&s<8&&s!=scale){scale=s;dropText();}}
        if(model.contains("rect")){const auto& r=model.at("rect");bounds={r.at(0).get<int>(),r.at(1).get<int>(),r.at(2).get<int>(),r.at(3).get<int>()};}
        if(model.contains("visible"))shown=model.at("visible").get<bool>();
        if(model.contains("reveal")&&model.at("reveal").is_string()){const auto id=model.at("reveal").get<std::string>();for(std::size_t i=0;i<rows.size();i++)if(rows[i].id==id){const int top=int(i)*rowHeight(),bottom=top+rowHeight();if(top<scroll)scroll=top;else if(bottom>scroll+std::max(1,bounds[3]))scroll=bottom-bounds[3];}}
        clampScroll();++updates;
        if(shown&&bounds[2]>0&&bounds[3]>0){SetWindowPos(window,HWND_TOP,bounds[0],bounds[1],bounds[2],bounds[3],SWP_NOACTIVATE|SWP_SHOWWINDOW);}
        else ShowWindow(window,SW_HIDE);
        InvalidateRect(window,nullptr,FALSE);
    }
    // op "menu": native popup at the cursor; reports {event:"command",command} or {event:"menuClosed"}.
    void showMenu(const Json& items){
        HMENU menu=CreatePopupMenu();std::vector<std::string> commands;
        for(const auto& item:items){if(item.is_null()){AppendMenuW(menu,MF_SEPARATOR,0,nullptr);continue;}
            auto label=wide(item.at(0).get<std::string>());if(item.size()>3&&item.at(3).is_string()&&!item.at(3).get<std::string>().empty())label+=L"\t"+wide(item.at(3).get<std::string>());
            const bool disabled=item.size()>2&&item.at(2).is_string()&&item.at(2).get<std::string>().find("disabled")!=std::string::npos;
            commands.push_back(item.at(1).get<std::string>());AppendMenuW(menu,MF_STRING|(disabled?MF_GRAYED:0),commands.size(),label.c_str());}
        POINT at{};GetCursorPos(&at);if(menuAt){at=*menuAt;menuAt.reset();}
        lastMenu=Json::array();for(const auto& c:commands)lastMenu.push_back(c);
        if(!automaticCommand.empty()){for(std::size_t i=0;i<commands.size();i++)if(commands[i]==automaticCommand)automaticMenu=UINT(i+1);automaticCommand.clear();}
        const UINT chosen=automaticMenu?automaticMenu:TrackPopupMenu(menu,TPM_RETURNCMD|TPM_RIGHTBUTTON|TPM_NONOTIFY,at.x,at.y,0,window,nullptr);automaticMenu=0;DestroyMenu(menu);
        if(chosen&&chosen<=commands.size())emit({{"event","command"},{"command",commands[chosen-1]}});else emit({{"event","menuClosed"}});
    }
    // Acceptance evidence: the same draw() into a WIC bitmap, returned as base64 PNG.
    std::string snapshot(){
        const UINT w=UINT(std::max(1,bounds[2])),h=UINT(std::max(1,bounds[3]));prepare();
        IWICImagingFactory* wic=nullptr;IWICBitmap* bitmap=nullptr;ID2D1RenderTarget* rt=nullptr;ID2D1SolidColorBrush* own=nullptr;IStream* stream=nullptr;IWICBitmapEncoder* encoder=nullptr;IWICBitmapFrameEncode* frame=nullptr;std::string out;
        auto check=[](HRESULT hr,const char* what){if(FAILED(hr))throw std::runtime_error(what);};
        try{check(CoCreateInstance(CLSID_WICImagingFactory,nullptr,CLSCTX_INPROC_SERVER,IID_PPV_ARGS(&wic)),"WIC");check(wic->CreateBitmap(w,h,GUID_WICPixelFormat32bppPBGRA,WICBitmapCacheOnLoad,&bitmap),"WIC bitmap");
            check(factory->CreateWicBitmapRenderTarget(bitmap,D2D1::RenderTargetProperties(D2D1_RENDER_TARGET_TYPE_SOFTWARE,D2D1::PixelFormat(DXGI_FORMAT_B8G8R8A8_UNORM,D2D1_ALPHA_MODE_PREMULTIPLIED),96,96),&rt),"WIC target");check(rt->CreateSolidColorBrush(theme.text,&own),"brush");
            auto* savedBrush=brush;brush=own;canvas=rt;rt->BeginDraw();draw();check(rt->EndDraw(),"snapshot draw");brush=savedBrush;canvas=target;
            check(CreateStreamOnHGlobal(nullptr,TRUE,&stream),"stream");check(wic->CreateEncoder(GUID_ContainerFormatPng,nullptr,&encoder),"PNG");check(encoder->Initialize(stream,WICBitmapEncoderNoCache),"PNG init");check(encoder->CreateNewFrame(&frame,nullptr),"PNG frame");check(frame->Initialize(nullptr),"frame init");check(frame->WriteSource(bitmap,nullptr),"frame write");check(frame->Commit(),"frame commit");check(encoder->Commit(),"PNG commit");
            HGLOBAL memory=nullptr;GetHGlobalFromStream(stream,&memory);const auto size=GlobalSize(memory);const auto* bytes=static_cast<const unsigned char*>(GlobalLock(memory));
            static const char* digits="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";for(SIZE_T i=0;i<size;i+=3){const unsigned v=(bytes[i]<<16)|(i+1<size?bytes[i+1]<<8:0)|(i+2<size?bytes[i+2]:0);out+=digits[v>>18&63];out+=digits[v>>12&63];out+=i+1<size?digits[v>>6&63]:'=';out+=i+2<size?digits[v&63]:'=';}GlobalUnlock(memory);
        }catch(...){canvas=target;for(IUnknown* u:std::initializer_list<IUnknown*>{frame,encoder,stream,own,rt,bitmap,wic})if(u)u->Release();throw;}
        for(IUnknown* u:std::initializer_list<IUnknown*>{frame,encoder,stream,own,rt,bitmap,wic})if(u)u->Release();return out;
    }
    Json inspect()const{
        RECT r{};if(window)GetWindowRect(window,&r);Json list=Json::array();for(const auto& row:rows)list.push_back({{"id",row.id},{"name",row.name},{"depth",row.depth},{"selected",row.selected}});
        return {{"window",window!=nullptr},{"shown",window&&IsWindowVisible(window)},{"topmost",window&&GetWindow(GetParent(window),GW_CHILD)==window},{"rect",{bounds[0],bounds[1],bounds[2],bounds[3]}},{"rows",list},{"scroll",scroll},{"paints",paints},{"paintedRows",paintedRows},{"updates",updates},{"lastMenu",lastMenu},{"lastPaintMS",lastPaintMS}};
    }
    // Acceptance only: drives the real window procedure with mouse/keyboard messages at a row's part.
    // {action:"click"|"dblclick"|"right"|"drag"|"key"|"wheel", row, part:"fold"|"item"|"lock"|"eye", to, ctrl, shift, vk, menuIndex|command}
    void probe(const Json& p){
        const auto action=p.at("action").get<std::string>();const WPARAM keys=(p.value("ctrl",false)?MK_CONTROL:0)|(p.value("shift",false)?MK_SHIFT:0);
        const auto point=[&](int row,const std::string& part){const int h=rowHeight(),y=row*h-scroll+h/2;int x=bounds[2]/2;if(part=="fold")x=indent(rows.at(row).depth)+px(8);else if(part=="item")x=indent(rows.at(row).depth)+px(30);else if(part=="lock")x=bounds[2]-px(36);else if(part=="eye")x=bounds[2]-px(14);return MAKELPARAM(x,y);};
        if(action=="key"){const UINT vk=p.at("vk").get<UINT>();if(p.value("ctrl",false))probeCtrl=true;SendMessageW(window,WM_KEYDOWN,vk,0);probeCtrl=false;return;}
        if(action=="wheel"){SendMessageW(window,WM_MOUSEWHEEL,MAKEWPARAM(0,short(p.at("delta").get<int>())),0);return;}
        const int row=p.at("row").get<int>();const auto at=point(row,p.value("part",std::string("item")));probeKeys=keys;
        if(action=="click"){SendMessageW(window,WM_LBUTTONDOWN,MK_LBUTTON|keys,at);SendMessageW(window,WM_LBUTTONUP,keys,at);}
        else if(action=="dblclick"){SendMessageW(window,WM_LBUTTONDBLCLK,MK_LBUTTON|keys,at);SendMessageW(window,WM_LBUTTONUP,keys,at);}
        else if(action=="right"){automaticMenu=p.value("menuIndex",0u);automaticCommand=p.value("command",std::string());POINT screen{GET_X_LPARAM_(at),GET_Y_LPARAM_(at)};ClientToScreen(window,&screen);menuAt=screen;SendMessageW(window,WM_RBUTTONUP,keys,at);}
        else if(action=="drag"){const int to=p.value("to",-1);const LPARAM end=to<0?MAKELPARAM(bounds[2]/2,std::min(bounds[3]-2,int(rows.size())*rowHeight()-scroll+rowHeight())):point(to,"item");SendMessageW(window,WM_LBUTTONDOWN,MK_LBUTTON,at);SendMessageW(window,WM_MOUSEMOVE,MK_LBUTTON,MAKELPARAM(GET_X_LPARAM_(at)+px(20),GET_Y_LPARAM_(at)+px(20)));SendMessageW(window,WM_MOUSEMOVE,MK_LBUTTON,end);SendMessageW(window,WM_LBUTTONUP,0,end);}
        probeKeys=0;
    }
private:
    struct Theme {D2D1_COLOR_F background{.13f,.14f,.15f,1},text{.89f,.91f,.94f,1},muted{.55f,.58f,.62f,1},accent{.35f,.6f,.84f,1},selection{.15f,.27f,.4f,1},line{.25f,.28f,.31f,1};};
    HWND window=nullptr;Post poster;ID2D1Factory* factory=nullptr;IDWriteFactory* write=nullptr;ID2D1HwndRenderTarget* target=nullptr;ID2D1SolidColorBrush* brush=nullptr;IDWriteTextFormat* text=nullptr;IDWriteTextFormat* icons=nullptr;IDWriteInlineObject* ellipsis=nullptr;
    std::vector<Row> rows;Theme theme;float scale=1;std::array<int,4> bounds{};bool shown=false;int scroll=0,hover=-1,downRow=-1,dropRow=-2;Part downPart=None;POINT downAt{};bool dragging=false;
    std::uint64_t paints=0,updates=0;std::size_t paintedRows=0;double lastPaintMS=0;Json lastMenu=Json::array();std::optional<POINT> menuAt;UINT automaticMenu=0;std::string automaticCommand;WPARAM probeKeys=0;bool probeCtrl=false;
    static int GET_X_LPARAM_(LPARAM l){return short(LOWORD(l));}static int GET_Y_LPARAM_(LPARAM l){return short(HIWORD(l));}
    static std::wstring wide(const std::string& s){const int n=MultiByteToWideChar(CP_UTF8,0,s.data(),int(s.size()),nullptr,0);std::wstring out(std::max(0,n),0);if(n>0)MultiByteToWideChar(CP_UTF8,0,s.data(),int(s.size()),out.data(),n);return out;}
    int px(float css)const{return int(css*scale+.5f);}
    int rowHeight()const{return std::max(1,px(26));}
    int indent(int depth)const{return px(6)+depth*px(14);}
    void clampScroll(){scroll=std::clamp(scroll,0,std::max(0,int(rows.size())*rowHeight()-bounds[3]));}
    void emit(Json event){event["channel"]="hb.panel";event["panel"]="hierarchy";if(poster)poster(event);}
    int rowAt(int y)const{const int i=(y+scroll)/rowHeight();return y>=0&&i>=0&&i<int(rows.size())?i:-1;}
    Part partAt(int row,int x)const{if(row<0)return None;const auto& r=rows[row];const int fold=indent(r.depth);if(r.children&&x>=fold&&x<fold+px(16))return Fold;if(x>=bounds[2]-px(48)&&x<bounds[2]-px(24))return Lock;if(x>=bounds[2]-px(24))return Eye;return Item;}
    void dropText(){if(text){text->Release();text=nullptr;}if(icons){icons->Release();icons=nullptr;}if(ellipsis){ellipsis->Release();ellipsis=nullptr;}}
    void release(){dropText();if(brush){brush->Release();brush=nullptr;}if(target){target->Release();target=nullptr;}}
    void prepare(){
        RECT client{};GetClientRect(window,&client);const auto size=D2D1::SizeU(std::max<LONG>(1,client.right),std::max<LONG>(1,client.bottom));
        if(!target){if(FAILED(factory->CreateHwndRenderTarget(D2D1::RenderTargetProperties(D2D1_RENDER_TARGET_TYPE_DEFAULT,D2D1::PixelFormat(),96,96),D2D1::HwndRenderTargetProperties(window,size),&target)))throw std::runtime_error("Direct2D panel target");target->CreateSolidColorBrush(theme.text,&brush);}
        else target->Resize(size);
        if(!text){write->CreateTextFormat(L"Segoe UI",nullptr,DWRITE_FONT_WEIGHT_NORMAL,DWRITE_FONT_STYLE_NORMAL,DWRITE_FONT_STRETCH_NORMAL,12.5f*scale,L"ko-kr",&text);text->SetWordWrapping(DWRITE_WORD_WRAPPING_NO_WRAP);text->SetParagraphAlignment(DWRITE_PARAGRAPH_ALIGNMENT_CENTER);
            write->CreateEllipsisTrimmingSign(text,&ellipsis);DWRITE_TRIMMING trim{DWRITE_TRIMMING_GRANULARITY_CHARACTER,0,0};text->SetTrimming(&trim,ellipsis);
            write->CreateTextFormat(L"Segoe MDL2 Assets",nullptr,DWRITE_FONT_WEIGHT_NORMAL,DWRITE_FONT_STYLE_NORMAL,DWRITE_FONT_STRETCH_NORMAL,11.f*scale,L"",&icons);icons->SetTextAlignment(DWRITE_TEXT_ALIGNMENT_CENTER);icons->SetParagraphAlignment(DWRITE_PARAGRAPH_ALIGNMENT_CENTER);}
    }
    static const wchar_t* glyph(const std::string& icon){
        if(icon=="sun"||icon=="light"||icon=="bulb")return L"";if(icon=="camera")return L"";if(icon=="user"||icon=="character"||icon=="person")return L"";
        if(icon=="sphere"||icon=="globe")return L"";if(icon=="folder"||icon=="group")return L"";if(icon=="audio"||icon=="speaker")return L"";if(icon=="image"||icon=="sprite")return L"";return L"";}
    ID2D1RenderTarget* canvas=nullptr;
    void fill(float x,float y,float w,float h,const D2D1_COLOR_F& c){brush->SetColor(c);canvas->FillRectangle(D2D1::RectF(x,y,x+w,y+h),brush);}
    void label(const std::wstring& s,IDWriteTextFormat* format,float x,float y,float w,float h,const D2D1_COLOR_F& c){brush->SetColor(c);canvas->DrawText(s.c_str(),UINT32(s.size()),format,D2D1::RectF(x,y,x+w,y+h),brush,D2D1_DRAW_TEXT_OPTIONS_CLIP);}
    void paint(){
        const auto start=std::chrono::steady_clock::now();prepare();canvas=target;target->BeginDraw();draw();
        if(target->EndDraw()==HRESULT(D2DERR_RECREATE_TARGET))release();
        ++paints;lastPaintMS=std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-start).count();
    }
    void draw(){
        canvas->Clear(theme.background);
        const int h=rowHeight(),first=scroll/h,last=std::min(int(rows.size()),(scroll+bounds[3])/h+1);paintedRows=0;
        for(int i=first;i<last;i++){const auto& r=rows[i];const float y=float(i*h-scroll),w=float(bounds[2]);
            if(r.selected)fill(0,y,w,float(h),theme.selection);else if(i==hover)fill(0,y,w,float(h),{theme.selection.r,theme.selection.g,theme.selection.b,.45f});
            if(dragging&&i==dropRow){brush->SetColor(theme.accent);canvas->DrawRectangle(D2D1::RectF(1,y+1,w-1,y+h-1),brush,float(std::max(1,px(1))));}
            const float x=float(indent(r.depth));const auto dim=r.visible?theme.text:theme.muted;
            if(r.children)label(r.collapsed?L"":L"",icons,x,y,float(px(16)),float(h),theme.muted);
            label(glyph(r.icon),icons,x+px(16),y,float(px(18)),float(h),r.selected?theme.text:theme.accent);
            const float nameX=x+px(38);label(wide(r.name),text,nameX,y,std::max(0.f,w-px(52)-nameX),float(h),dim);
            label(r.locked?L"":L"",icons,w-px(48),y,float(px(24)),float(h),r.locked?theme.accent:theme.line);
            label(r.visible?L"":L"",icons,w-px(24),y,float(px(24)),float(h),r.visible?theme.muted:theme.line);
            ++paintedRows;}
        if(dragging&&dropRow==-1){brush->SetColor(theme.accent);const float y=float(int(rows.size())*h-scroll);canvas->DrawLine(D2D1::Point2F(0,y),D2D1::Point2F(float(bounds[2]),y),brush,float(std::max(1,px(2))));}
    }
    static std::string keyName(WPARAM vk){
        if(vk>='A'&&vk<='Z')return std::string(1,char(vk-'A'+'a'));if(vk>='0'&&vk<='9')return std::string(1,char(vk));if(vk>=VK_F1&&vk<=VK_F12)return "F"+std::to_string(vk-VK_F1+1);
        switch(vk){case VK_UP:return "ArrowUp";case VK_DOWN:return "ArrowDown";case VK_LEFT:return "ArrowLeft";case VK_RIGHT:return "ArrowRight";case VK_DELETE:return "Delete";case VK_BACK:return "Backspace";case VK_RETURN:return "Enter";case VK_ESCAPE:return "Escape";case VK_HOME:return "Home";case VK_END:return "End";case VK_PRIOR:return "PageUp";case VK_NEXT:return "PageDown";case VK_TAB:return "Tab";case VK_SPACE:return " ";default:return "";}
    }
    LRESULT handle(UINT message,WPARAM w,LPARAM l){
        const int x=GET_X_LPARAM_(l),y=GET_Y_LPARAM_(l);const bool ctrl=(w&MK_CONTROL)||(probeKeys&MK_CONTROL),shift=(w&MK_SHIFT)||(probeKeys&MK_SHIFT);
        switch(message){
        case WM_PAINT:{PAINTSTRUCT ps;BeginPaint(window,&ps);paint();EndPaint(window,&ps);return 0;}
        case WM_ERASEBKGND:return 1;
        case WM_SIZE:if(target)target->Resize(D2D1::SizeU(LOWORD(l),HIWORD(l)));InvalidateRect(window,nullptr,FALSE);return 0;
        case WM_MOUSEMOVE:{const int row=rowAt(y);if(downRow>=0&&downPart==Item&&(w&MK_LBUTTON)){if(!dragging&&(std::abs(x-downAt.x)>px(4)||std::abs(y-downAt.y)>px(4)))dragging=true;if(dragging){dropRow=row;InvalidateRect(window,nullptr,FALSE);}}
            if(row!=hover){hover=row;InvalidateRect(window,nullptr,FALSE);TRACKMOUSEEVENT t{sizeof(t),TME_LEAVE,window,0};TrackMouseEvent(&t);}return 0;}
        case WM_MOUSELEAVE:hover=-1;InvalidateRect(window,nullptr,FALSE);return 0;
        case WM_LBUTTONDOWN:{SetFocus(window);SetCapture(window);const int row=rowAt(y);downRow=row;downPart=partAt(row,x);downAt={x,y};dragging=false;dropRow=-2;emit({{"event","focus-panel"}});
            if(row<0){emit({{"event","clear"}});return 0;}const auto& id=rows[row].id;
            if(downPart==Fold)emit({{"event","fold"},{"id",id}});else if(downPart==Lock)emit({{"event","lock"},{"id",id}});else if(downPart==Eye)emit({{"event","visible"},{"id",id}});
            else emit({{"event","select"},{"id",id},{"ctrl",ctrl},{"shift",shift}});return 0;}
        case WM_LBUTTONUP:{if(GetCapture()==window)ReleaseCapture();if(dragging&&downRow>=0){const std::string target=dropRow>=0?rows[dropRow].id:"";if(target!=rows[downRow].id)emit({{"event","reparent"},{"id",rows[downRow].id},{"target",target}});}
            dragging=false;dropRow=-2;downRow=-1;downPart=None;InvalidateRect(window,nullptr,FALSE);return 0;}
        case WM_LBUTTONDBLCLK:{const int row=rowAt(y);if(row>=0&&partAt(row,x)==Item)emit({{"event","activate"},{"id",rows[row].id}});return 0;}
        case WM_RBUTTONUP:{const int row=rowAt(y);POINT at{x,y};ClientToScreen(window,&at);if(!menuAt)menuAt=at;emit({{"event","contextmenu"},{"id",row>=0?Json(rows[row].id):Json()}});return 0;}
        case WM_MOUSEWHEEL:{scroll-=int(GET_WHEEL_DELTA_WPARAM(w))*rowHeight()*3/WHEEL_DELTA;clampScroll();InvalidateRect(window,nullptr,FALSE);return 0;}
        case WM_KEYDOWN:case WM_SYSKEYDOWN:{const auto key=keyName(w);if(key.empty())break;emit({{"event","key"},{"key",key},{"ctrl",probeCtrl||(GetKeyState(VK_CONTROL)&0x8000)!=0},{"shift",(GetKeyState(VK_SHIFT)&0x8000)!=0},{"alt",message==WM_SYSKEYDOWN}});return 0;}
        case WM_GETDLGCODE:return DLGC_WANTALLKEYS;
        }
        return DefWindowProcW(window,message,w,l);
    }
    static LRESULT CALLBACK procedure(HWND h,UINT m,WPARAM w,LPARAM l){
        auto* self=reinterpret_cast<EditorTreePanel*>(GetWindowLongPtrW(h,GWLP_USERDATA));
        if(m==WM_NCCREATE){self=static_cast<EditorTreePanel*>(reinterpret_cast<CREATESTRUCTW*>(l)->lpCreateParams);SetWindowLongPtrW(h,GWLP_USERDATA,reinterpret_cast<LONG_PTR>(self));self->window=h;}
        if(!self)return DefWindowProcW(h,m,w,l);try{return self->handle(m,w,l);}catch(const std::exception&){return DefWindowProcW(h,m,w,l);}
    }
};
