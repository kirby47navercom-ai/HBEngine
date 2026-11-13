#pragma once
#include "SceneRenderBridge.hpp"
#include <functional>

class EditorScenePanel {
    using Json=nlohmann::json;
    HWND window=nullptr;
    SceneRenderBridge renderer;
    std::function<void(Json)> post;
    POINT start{},previous{};
    int button=0;
    bool moved=false,painted=false;
    static POINT point(LPARAM l){return {short(LOWORD(l)),short(HIWORD(l))};}
    static LRESULT CALLBACK procedure(HWND window,UINT message,WPARAM w,LPARAM l){
        auto* self=reinterpret_cast<EditorScenePanel*>(GetWindowLongPtrW(window,GWLP_USERDATA));
        if(message==WM_NCCREATE){
            self=static_cast<EditorScenePanel*>(reinterpret_cast<CREATESTRUCTW*>(l)->lpCreateParams);
            self->window=window;
            SetWindowLongPtrW(window,GWLP_USERDATA,reinterpret_cast<LONG_PTR>(self));
        }
        if(self)try{return self->handle(message,w,l);}
        catch(const std::exception& error){OutputDebugStringA(error.what());}
        return DefWindowProcW(window,message,w,l);
    }
    LRESULT handle(UINT message,WPARAM w,LPARAM l){
        switch(message){
        case WM_PAINT:{
            PAINTSTRUCT ps{};BeginPaint(window,&ps);
            if(!painted)FillRect(ps.hdc,&ps.rcPaint,GetSysColorBrush(COLOR_BTNFACE));
            EndPaint(window,&ps);return 0;
        }
        case WM_ERASEBKGND:return 1;
        case WM_LBUTTONDOWN:case WM_RBUTTONDOWN:case WM_MBUTTONDOWN:
            if(!button){
                SetFocus(window);SetCapture(window);start=previous=point(l);moved=false;
                button=message==WM_LBUTTONDOWN?1:message==WM_RBUTTONDOWN?2:3;
            }
            return 0;
        case WM_MOUSEMOVE:{
            if(button<2)return 0;
            const auto at=point(l);
            if(!moved&&std::abs(at.x-start.x)<3&&std::abs(at.y-start.y)<3)return 0;
            moved=true;
            post({{"command",button==2?"orbit":"pan"},{"dx",at.x-previous.x},{"dy",at.y-previous.y}});
            previous=at;return 0;
        }
        case WM_LBUTTONUP:case WM_RBUTTONUP:case WM_MBUTTONUP:{
            const int up=message==WM_LBUTTONUP?1:message==WM_RBUTTONUP?2:3;
            if(button!=up)return 0;
            button=0;if(GetCapture()==window)ReleaseCapture();
            const auto at=point(l);
            if(up==1&&std::abs(at.x-start.x)<4&&std::abs(at.y-start.y)<4)post({{"command","pick"},{"x",at.x},{"y",at.y}});
            return 0;
        }
        case WM_CAPTURECHANGED:button=0;return 0;
        case WM_MOUSEWHEEL:post({{"command","zoom"},{"dy",GET_WHEEL_DELTA_WPARAM(w)/120.0}});return 0;
        case WM_KEYDOWN:if(w=='F'){post({{"command","focus"}});return 0;}break;
        case WM_NCDESTROY:{
            renderer.shutdown();const auto old=window;window=nullptr;
            return DefWindowProcW(old,message,w,l);
        }
        }
        return DefWindowProcW(window,message,w,l);
    }
public:
    void attach(HWND parent,HINSTANCE instance,std::function<void(Json)> onInput){
        post=std::move(onInput);
        WNDCLASSW type{};type.hInstance=instance;type.lpszClassName=L"HBEngine.NativeSceneView";type.lpfnWndProc=procedure;type.hCursor=LoadCursorW(nullptr,IDC_ARROW);
        RegisterClassW(&type);
        window=CreateWindowExW(0,type.lpszClassName,L"",WS_CHILD|WS_CLIPSIBLINGS,0,0,1,1,parent,nullptr,instance,this);
        if(!window)throw std::runtime_error("Native editor viewport window");
    }
    void layout(HWND parent,int x,int y,int width,int height,bool visible){
        if(!window)return;
        if(GetParent(window)!=parent){ShowWindow(window,SW_HIDE);SetParent(window,parent);}
        if(visible)SetWindowPos(window,HWND_TOP,x,y,width,height,SWP_NOACTIVATE|SWP_SHOWWINDOW);
        else ShowWindow(window,SW_HIDE);
    }
    SIZE size()const{RECT r{};GetClientRect(window,&r);return {r.right,r.bottom};}
    Json render(const Json& packet,bool development){
        const auto op=packet.at("op").get<std::string>();
        auto result=renderer.command(packet,window,development);
        if(op=="frame")painted=true;
        if(op=="dispose")painted=false;
        return result;
    }
    Json capture(){return render({{"op","capture"},{"data",Json::object()}},true);}
    void probe(UINT message,WPARAM w,LPARAM l){SendMessageW(window,message,w,l);}
};
