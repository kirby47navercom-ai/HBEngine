#pragma once
// Shared base of the native editor panels: a Win32 child window above the WebView, drawn with Direct2D/DirectWrite.
// The editor script sends models on the "hb.panel" channel; a panel paints them, owns input and reports intents back.
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

class EditorPanelBase {
public:
    using Json=nlohmann::json;
    using Post=std::function<void(const Json&)>;
    virtual ~EditorPanelBase(){release();if(write)write->Release();if(factory)factory->Release();if(window)DestroyWindow(window);}
    void attach(HWND owner,HINSTANCE instance,Post post,const wchar_t* className,std::string panelName){
        poster=std::move(post);name=std::move(panelName);
        WNDCLASSW wc{};wc.style=CS_DBLCLKS;wc.lpfnWndProc=procedure;wc.hInstance=instance;wc.lpszClassName=className;wc.hCursor=LoadCursorW(nullptr,IDC_ARROW);RegisterClassW(&wc);
        window=CreateWindowExW(0,className,L"",WS_CHILD|WS_CLIPSIBLINGS|WS_CLIPCHILDREN,0,0,1,1,owner,nullptr,instance,this);
        if(!window)throw std::runtime_error("Native editor panel window");
        if(FAILED(D2D1CreateFactory(D2D1_FACTORY_TYPE_SINGLE_THREADED,__uuidof(ID2D1Factory),nullptr,reinterpret_cast<void**>(&factory))))throw std::runtime_error("Direct2D factory");
        if(FAILED(DWriteCreateFactory(DWRITE_FACTORY_TYPE_SHARED,__uuidof(IDWriteFactory),reinterpret_cast<IUnknown**>(&write))))throw std::runtime_error("DirectWrite factory");
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
protected:
    struct Theme {D2D1_COLOR_F background{.13f,.14f,.15f,1},text{.89f,.91f,.94f,1},muted{.55f,.58f,.62f,1},accent{.35f,.6f,.84f,1},selection{.15f,.27f,.4f,1},line{.25f,.28f,.31f,1},field{.13f,.14f,.16f,1},raised{.19f,.2f,.23f,1};};
    HWND window=nullptr;Post poster;std::string name;ID2D1Factory* factory=nullptr;IDWriteFactory* write=nullptr;ID2D1HwndRenderTarget* target=nullptr;ID2D1RenderTarget* canvas=nullptr;ID2D1SolidColorBrush* brush=nullptr;
    IDWriteTextFormat* text=nullptr;IDWriteTextFormat* bold=nullptr;IDWriteTextFormat* icons=nullptr;IDWriteInlineObject* ellipsis=nullptr;
    Theme theme;float scale=1;std::array<int,4> bounds{};bool shown=false;std::uint64_t paints=0,updates=0;double lastPaintMS=0;
    static int xOf(LPARAM l){return short(LOWORD(l));}static int yOf(LPARAM l){return short(HIWORD(l));}
    static std::wstring wide(const std::string& s){const int n=MultiByteToWideChar(CP_UTF8,0,s.data(),int(s.size()),nullptr,0);std::wstring out(std::max(0,n),0);if(n>0)MultiByteToWideChar(CP_UTF8,0,s.data(),int(s.size()),out.data(),n);return out;}
    static std::string utf8(const std::wstring& s){const int n=WideCharToMultiByte(CP_UTF8,0,s.data(),int(s.size()),nullptr,0,nullptr,nullptr);std::string out(std::max(0,n),0);if(n>0)WideCharToMultiByte(CP_UTF8,0,s.data(),int(s.size()),out.data(),n,nullptr,nullptr);return out;}
    int px(float css)const{return int(css*scale+.5f);}
    void emit(Json event){event["channel"]="hb.panel";event["panel"]=name;if(poster)poster(event);}
    // theme, scale, rect and visibility shared by every panel model.
    void applyCommon(const Json& model){
        if(model.contains("theme")){const auto& t=model.at("theme");const auto color=[&](const char* key,D2D1_COLOR_F& out){if(t.contains(key)){const auto& c=t.at(key);out={c.at(0).get<float>(),c.at(1).get<float>(),c.at(2).get<float>(),c.size()>3?c.at(3).get<float>():1.f};}};
            color("background",theme.background);color("text",theme.text);color("muted",theme.muted);color("accent",theme.accent);color("selection",theme.selection);color("line",theme.line);color("field",theme.field);color("raised",theme.raised);}
        if(model.contains("scale")){const float s=model.at("scale").get<float>();if(s>.5f&&s<8&&s!=scale){scale=s;dropText();fontChanged();}}
        if(model.contains("rect")){const auto& r=model.at("rect");bounds={r.at(0).get<int>(),r.at(1).get<int>(),r.at(2).get<int>(),r.at(3).get<int>()};}
        if(model.contains("visible"))shown=model.at("visible").get<bool>();
    }
    void place(){++updates;if(shown&&bounds[2]>0&&bounds[3]>0)SetWindowPos(window,HWND_TOP,bounds[0],bounds[1],bounds[2],bounds[3],SWP_NOACTIVATE|SWP_SHOWWINDOW);else ShowWindow(window,SW_HIDE);InvalidateRect(window,nullptr,FALSE);}
    Json common()const{return {{"window",window!=nullptr},{"shown",window&&IsWindowVisible(window)},{"topmost",aboveWebView()},{"rect",{bounds[0],bounds[1],bounds[2],bounds[3]}},{"paints",paints},{"updates",updates},{"lastPaintMS",lastPaintMS}};}
    // Only other native panels may be above this window; the WebView must be below it.
    bool aboveWebView()const{if(!window)return false;for(HWND h=GetWindow(GetParent(window),GW_CHILD);h&&h!=window;h=GetWindow(h,GW_HWNDNEXT)){wchar_t name[64]{};GetClassNameW(h,name,64);if(std::wstring(name).rfind(L"HBEngine.Editor",0)!=0)return false;}return true;}
    void dropText(){for(auto** f:{&text,&bold,&icons})if(*f){(*f)->Release();*f=nullptr;}if(ellipsis){ellipsis->Release();ellipsis=nullptr;}}
    void release(){dropText();if(brush){brush->Release();brush=nullptr;}if(target){target->Release();target=nullptr;}}
    virtual void fontChanged(){}
    void prepare(){
        RECT client{};GetClientRect(window,&client);const auto size=D2D1::SizeU(std::max<LONG>(1,client.right),std::max<LONG>(1,client.bottom));
        if(!target){if(FAILED(factory->CreateHwndRenderTarget(D2D1::RenderTargetProperties(D2D1_RENDER_TARGET_TYPE_DEFAULT,D2D1::PixelFormat(),96,96),D2D1::HwndRenderTargetProperties(window,size),&target)))throw std::runtime_error("Direct2D panel target");target->CreateSolidColorBrush(theme.text,&brush);}
        else target->Resize(size);
        if(!text){const auto format=[&](DWRITE_FONT_WEIGHT weight,IDWriteTextFormat** out){write->CreateTextFormat(L"Segoe UI",nullptr,weight,DWRITE_FONT_STYLE_NORMAL,DWRITE_FONT_STRETCH_NORMAL,12.5f*scale,L"ko-kr",out);(*out)->SetWordWrapping(DWRITE_WORD_WRAPPING_NO_WRAP);(*out)->SetParagraphAlignment(DWRITE_PARAGRAPH_ALIGNMENT_CENTER);};
            format(DWRITE_FONT_WEIGHT_NORMAL,&text);format(DWRITE_FONT_WEIGHT_SEMI_BOLD,&bold);
            write->CreateEllipsisTrimmingSign(text,&ellipsis);DWRITE_TRIMMING trim{DWRITE_TRIMMING_GRANULARITY_CHARACTER,0,0};text->SetTrimming(&trim,ellipsis);bold->SetTrimming(&trim,ellipsis);
            write->CreateTextFormat(L"Segoe MDL2 Assets",nullptr,DWRITE_FONT_WEIGHT_NORMAL,DWRITE_FONT_STYLE_NORMAL,DWRITE_FONT_STRETCH_NORMAL,11.f*scale,L"",&icons);icons->SetTextAlignment(DWRITE_TEXT_ALIGNMENT_CENTER);icons->SetParagraphAlignment(DWRITE_PARAGRAPH_ALIGNMENT_CENTER);}
    }
    void fill(float x,float y,float w,float h,const D2D1_COLOR_F& c){brush->SetColor(c);canvas->FillRectangle(D2D1::RectF(x,y,x+w,y+h),brush);}
    void box(float x,float y,float w,float h,const D2D1_COLOR_F& background,const D2D1_COLOR_F& border){const auto r=D2D1::RoundedRect(D2D1::RectF(x,y,x+w,y+h),float(px(3)),float(px(3)));brush->SetColor(background);canvas->FillRoundedRectangle(r,brush);brush->SetColor(border);canvas->DrawRoundedRectangle(r,brush,1.f);}
    void label(const std::wstring& s,IDWriteTextFormat* format,float x,float y,float w,float h,const D2D1_COLOR_F& c){if(w<=0)return;brush->SetColor(c);canvas->DrawText(s.c_str(),UINT32(s.size()),format,D2D1::RectF(x,y,x+w,y+h),brush,D2D1_DRAW_TEXT_OPTIONS_CLIP);}
    void paint(){
        const auto start=std::chrono::steady_clock::now();prepare();canvas=target;target->BeginDraw();draw();
        if(target->EndDraw()==HRESULT(D2DERR_RECREATE_TARGET))release();
        ++paints;lastPaintMS=std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-start).count();
    }
    virtual void draw()=0;
    virtual LRESULT handle(UINT message,WPARAM w,LPARAM l)=0;
    LRESULT common(UINT message,WPARAM w,LPARAM l){
        switch(message){
        case WM_PAINT:{PAINTSTRUCT ps;BeginPaint(window,&ps);paint();EndPaint(window,&ps);return 0;}
        case WM_ERASEBKGND:return 1;
        case WM_SIZE:if(target)target->Resize(D2D1::SizeU(LOWORD(l),HIWORD(l)));InvalidateRect(window,nullptr,FALSE);return 0;
        case WM_GETDLGCODE:return DLGC_WANTALLKEYS;
        }
        return DefWindowProcW(window,message,w,l);
    }
    static std::string keyName(WPARAM vk){
        if(vk>='A'&&vk<='Z')return std::string(1,char(vk-'A'+'a'));if(vk>='0'&&vk<='9')return std::string(1,char(vk));if(vk>=VK_F1&&vk<=VK_F12)return "F"+std::to_string(vk-VK_F1+1);
        switch(vk){case VK_UP:return "ArrowUp";case VK_DOWN:return "ArrowDown";case VK_LEFT:return "ArrowLeft";case VK_RIGHT:return "ArrowRight";case VK_DELETE:return "Delete";case VK_BACK:return "Backspace";case VK_RETURN:return "Enter";case VK_ESCAPE:return "Escape";case VK_HOME:return "Home";case VK_END:return "End";case VK_PRIOR:return "PageUp";case VK_NEXT:return "PageDown";case VK_TAB:return "Tab";case VK_SPACE:return " ";default:return "";}
    }
    void forwardKey(UINT message,WPARAM w,bool forceCtrl=false){const auto key=keyName(w);if(key.empty())return;emit({{"event","key"},{"key",key},{"ctrl",forceCtrl||(GetKeyState(VK_CONTROL)&0x8000)!=0},{"shift",(GetKeyState(VK_SHIFT)&0x8000)!=0},{"alt",message==WM_SYSKEYDOWN}});}
private:
    static LRESULT CALLBACK procedure(HWND h,UINT m,WPARAM w,LPARAM l){
        auto* self=reinterpret_cast<EditorPanelBase*>(GetWindowLongPtrW(h,GWLP_USERDATA));
        if(m==WM_NCCREATE){self=static_cast<EditorPanelBase*>(reinterpret_cast<CREATESTRUCTW*>(l)->lpCreateParams);SetWindowLongPtrW(h,GWLP_USERDATA,reinterpret_cast<LONG_PTR>(self));self->window=h;}
        if(!self)return DefWindowProcW(h,m,w,l);try{return self->handle(m,w,l);}catch(const std::exception&){return DefWindowProcW(h,m,w,l);}
    }
};
