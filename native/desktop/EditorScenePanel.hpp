#pragma once
#include "SceneRenderBridge.hpp"
#include <functional>
#include <optional>

class EditorScenePanel {
    using Json=nlohmann::json;
    HWND window=nullptr;
    SceneRenderBridge renderer;
    std::function<void(Json)> post;
    POINT start{},previous{};
    int button=0;
    bool moved=false,painted=false,transformDrag=false;
    struct Handle {int axis;double x,y,dx,dy;};
    std::vector<Handle> handles;
    std::optional<Handle> grabbed;
    std::string tool="translate";
    std::array<bool,6> flightKeys{};
    ULONGLONG flightTime=0;
    void stopFlight(){KillTimer(window,1);flightTime=0;flightKeys.fill(false);}
    std::optional<Handle> hitHandle(POINT at)const{
        double nearest=49;
        std::optional<Handle> hit;
        for(const auto& handle:handles){
            const auto length=handle.dx*handle.dx+handle.dy*handle.dy;
            if(length<1)continue;
            const auto along=std::clamp(((at.x-handle.x)*handle.dx+(at.y-handle.y)*handle.dy)/length,0.,1.);
            const auto dx=at.x-handle.x-along*handle.dx,dy=at.y-handle.y-along*handle.dy;
            const auto distance=dx*dx+dy*dy;
            if(distance<nearest){
                const auto unit=std::sqrt(length);nearest=distance;hit=handle;
                hit->dx/=unit;hit->dy/=unit;
            }
        }
        return hit;
    }
    void drag(POINT at,bool preview){
        Json input={{"command",preview?"translatePreview":"translate"},{"x",start.x},{"y",start.y},{"dx",at.x-start.x},{"dy",at.y-start.y}};
        if(grabbed){
            input["command"]=preview?"transformPreview":"transform";input["axis"]=grabbed->axis;
            input["tangent"]={grabbed->dx,grabbed->dy};input["tool"]=tool;
        }
        post(std::move(input));
    }
    static int flightKey(WPARAM key){
        switch(key){case 'W':return 0;case 'S':return 1;case 'D':return 2;case 'A':return 3;case 'E':return 4;case 'Q':return 5;default:return -1;}
    }
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
                grabbed=button==1&&!(w&MK_SHIFT)?hitHandle(start):std::nullopt;
                transformDrag=button==1&&((w&MK_SHIFT)!=0||grabbed.has_value());
            }
            return 0;
        case WM_MOUSEMOVE:{
            if(button==1&&transformDrag){
                const auto at=point(l);
                moved=moved||std::abs(at.x-start.x)>=3||std::abs(at.y-start.y)>=3;
                if(moved)drag(at,true);
                return 0;
            }
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
            const bool translate=up==1&&transformDrag;
            button=0;transformDrag=false;if(up==2)stopFlight();if(GetCapture()==window)ReleaseCapture();
            const auto at=point(l);
            if(translate&&(moved||std::abs(at.x-start.x)+std::abs(at.y-start.y)>=3))drag(at,false);
            else if(up==1&&!grabbed&&std::abs(at.x-start.x)<4&&std::abs(at.y-start.y)<4)post({{"command","pick"},{"x",at.x},{"y",at.y}});
            grabbed.reset();return 0;
        }
        case WM_CAPTURECHANGED:
            if(transformDrag&&moved)post({{"command","translateCancel"}});
            transformDrag=false;button=0;stopFlight();return 0;
        case WM_KILLFOCUS:
            button=0;stopFlight();if(GetCapture()==window)ReleaseCapture();return 0;
        case WM_TIMER:
            if(w==1){
                const auto now=GetTickCount64();
                const double seconds=double(now-flightTime)/1000.;flightTime=now;
                const int forward=int(flightKeys[0])-int(flightKeys[1]),right=int(flightKeys[2])-int(flightKeys[3]),up=int(flightKeys[4])-int(flightKeys[5]);
                if(forward||right||up)post({{"command","fly"},{"flight",{{"forward",forward},{"right",right},{"up",up},{"seconds",seconds},{"fast",(GetKeyState(VK_SHIFT)&0x8000)!=0}}}});
                return 0;
            }
            break;
        case WM_MOUSEWHEEL:post({{"command","zoom"},{"dy",GET_WHEEL_DELTA_WPARAM(w)/120.0}});return 0;
        case WM_KEYDOWN:case WM_KEYUP:{
            const auto index=flightKey(w);
            if(button==2&&index>=0){
                flightKeys.at(index)=message==WM_KEYDOWN;
                if(std::none_of(flightKeys.begin(),flightKeys.end(),[](bool pressed){return pressed;}))stopFlight();
                else if(!flightTime){flightTime=GetTickCount64();SetTimer(window,1,16,nullptr);}
                return 0;
            }
            if(message==WM_KEYDOWN&&w=='F'){post({{"command","focus"}});return 0;}
            if(message==WM_KEYDOWN&&!button&&(w=='W'||w=='E'||w=='R')){
                selectTransformTool(w=='W'?"translate":w=='E'?"rotate":"scale");return 0;
            }
            if(message==WM_KEYDOWN&&w==VK_ESCAPE&&transformDrag){ReleaseCapture();return 0;}
            break;
        }
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
        else{stopFlight();handles.clear();ShowWindow(window,SW_HIDE);}
    }
    void selectTransformTool(std::string mode){
        if(button)return;
        tool=std::move(mode);handles.clear();post({{"command","transformTool"}});
    }
    const std::string& transformTool()const{return tool;}
    void setHandles(const Json& rows){
        handles.clear();
        for(const auto& row:rows){
            const double x=row.at(1),y=row.at(2);
            handles.push_back({row.at(0).get<int>(),x,y,row.at(3).get<double>()-x,row.at(4).get<double>()-y});
        }
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
