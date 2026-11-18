#pragma once
#include "SceneRenderBridge.hpp"
#include <functional>
#include <optional>
#include <commctrl.h>

// Scene viewport input (Unreal Editor level viewport controls):
//   RMB drag look in place, RMB + W/A/S/D/Q/E fly (Shift fast, wheel speed, Z/C field of view), Alt+LMB orbit,
//   Alt+RMB dolly, MMB / Alt+MMB pan, wheel dolly, LMB drag on empty space walk (perspective) or marquee (orthographic),
//   Ctrl+Alt+LMB marquee, Ctrl/Shift click add to selection, Ctrl+LMB/RMB/both drag along X/Z/Y,
//   Shift while dragging a gizmo handle moves the camera with the selection, MMB drag in orthographic views measures.
class EditorScenePanel {
    using Json=nlohmann::json;
    HWND window=nullptr;
    SceneRenderBridge renderer;
    std::function<void(Json)> post;
    POINT start{},previous{};
    int button=0;
    enum class Drag {none,look,orbit,dolly,pan,walk,measure};
    Drag mode=Drag::none;
    bool moved=false,painted=false,transformDrag=false,brushEnabled=false,marquee=false,orthographic=false,follow=false,ctrlAxis=false;
    std::vector<POINT> brushPoints;
    struct Handle {int axis;double x,y,dx,dy;};
    std::vector<Handle> handles;
    std::optional<Handle> grabbed;
    std::string tool="translate";
    std::array<bool,8> flightKeys{};
    ULONGLONG flightTime=0; // non-zero while a flight key is held
    LARGE_INTEGER flightLast{};
    void stopFlight(){KillTimer(window,1);const bool was=flightTime!=0;flightTime=0;flightKeys.fill(false);if(was&&post)post({{"command","flightEnd"}});}
    void startFlight(){if(flightTime)return;flightTime=1;QueryPerformanceCounter(&flightLast);SetTimer(window,1,15,nullptr);post({{"command","flyTick"}});}
    static bool down(int key){return (GetKeyState(key)&0x8000)!=0;}
    // Cursor lock (Unreal): during a camera drag the cursor is hidden, kept inside the viewport and put back at the press
    // point after every move, so the drag never stops at a screen edge; release shows it again where it was pressed.
    bool lockCursor=true,cursorLocked=false;POINT lockScreen{},lockClient{};
    int hoverAxis=-1;bool tracking=false;ULONGLONG pressedAt=0;bool flew=false;POINT hoverAt{-1,-1}; // gizmo handle under the cursor (highlighted, size cursor)
    HWND valueTip=nullptr;TOOLINFOW tipInfo{};std::wstring valueText; // drag value next to the cursor
    bool cameraDrag()const{return mode==Drag::look||mode==Drag::orbit||mode==Drag::dolly||mode==Drag::pan||mode==Drag::walk;}
    void lockCursorNow(){if(cursorLocked||!lockCursor)return;cursorLocked=true;lockClient=start;lockScreen=start;ClientToScreen(window,&lockScreen);RECT r{};GetClientRect(window,&r);MapWindowPoints(window,nullptr,reinterpret_cast<POINT*>(&r),2);ClipCursor(&r);while(ShowCursor(FALSE)>=0){}SetCursorPos(lockScreen.x,lockScreen.y);}
    void unlockCursor(){if(!cursorLocked)return;cursorLocked=false;ClipCursor(nullptr);SetCursorPos(lockScreen.x,lockScreen.y);while(ShowCursor(TRUE)<0){}}
    std::optional<Handle> hitHandle(POINT at)const{
        double nearest=196;// 14 px grab radius (Unreal handles are easy to catch)
        std::optional<Handle> hit;
        for(const auto& handle:handles){
            const auto length=handle.dx*handle.dx+handle.dy*handle.dy;
            if(length<1)continue;
            const auto along=std::clamp(((at.x-handle.x)*handle.dx+(at.y-handle.y)*handle.dy)/length,0.,1.);
            const auto dx=at.x-handle.x-along*handle.dx,dy=at.y-handle.y-along*handle.dy;
            // Plane (3-5) and uniform scale (6) handles win ties so the small squares stay grabbable next to the axes.
            const auto distance=dx*dx+dy*dy-(handle.axis>=3?40:0);
            if(distance<nearest){
                const auto unit=std::sqrt(length);nearest=distance;hit=handle;
                hit->dx/=unit;hit->dy/=unit;
            }
        }
        return hit;
    }
    // Ctrl+drag (Unreal): the selection moves along one axis with the translate tool, using that axis handle's screen direction.
    std::optional<Handle> axisHandle(int axis)const{
        if(tool!="translate")return {};
        for(const auto& h:handles)if(h.axis==axis){const auto unit=std::hypot(h.dx,h.dy);if(unit<1)return {};Handle out=h;out.dx/=unit;out.dy/=unit;return out;}
        return {};
    }
    void drag(POINT at,bool preview){
        Json input={{"command",preview?"translatePreview":"translate"},{"x",start.x},{"y",start.y},{"dx",at.x-start.x},{"dy",at.y-start.y},{"follow",follow}};
        if(grabbed){
            input["command"]=preview?"transformPreview":"transform";input["axis"]=grabbed->axis;
            input["tangent"]={grabbed->dx,grabbed->dy};input["tool"]=ctrlAxis?std::string("translate"):tool;
        }
        post(std::move(input));
    }
    static int flightKey(WPARAM key){
        switch(key){case 'W':return 0;case 'S':return 1;case 'D':return 2;case 'A':return 3;case 'E':return 4;case 'Q':return 5;case 'Z':return 6;case 'C':return 7;default:return -1;}
    }
    void startFlightFromHeldKeys(){
        static const int keys[]={'W','S','D','A','E','Q','Z','C'};
        for(int i=0;i<8;++i)flightKeys[i]=down(keys[i]);
        if(std::any_of(flightKeys.begin(),flightKeys.end(),[](bool k){return k;}))startFlight();
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
    void finishMouse(){unlockCursor();if(cameraDrag()&&moved)post({{"command","dragEnd"}});showValue(L"");button=0;mode=Drag::none;transformDrag=false;follow=false;ctrlAxis=false;if(GetCapture()==window)ReleaseCapture();}
    LRESULT handle(UINT message,WPARAM w,LPARAM l){
        switch(message){
        case WM_PAINT:{
            PAINTSTRUCT ps{};BeginPaint(window,&ps);
            if(!painted)FillRect(ps.hdc,&ps.rcPaint,GetSysColorBrush(COLOR_BTNFACE));
            EndPaint(window,&ps);return 0;
        }
        case WM_ERASEBKGND:return 1;
        case WM_LBUTTONDOWN:case WM_RBUTTONDOWN:case WM_MBUTTONDOWN:{
            const int pressed=message==WM_LBUTTONDOWN?1:message==WM_RBUTTONDOWN?2:3;
            const bool alt=down(VK_MENU),ctrl=(w&MK_CONTROL)!=0,shift=(w&MK_SHIFT)!=0;
            // Ctrl+LMB then RMB (or the reverse) while dragging along an axis: both buttons move along the up axis (Unreal Z).
            if(button&&ctrlAxis&&((button==1&&pressed==2)||(button==2&&pressed==1))){if(auto h=axisHandle(1)){grabbed=h;start=previous=point(l);moved=false;}return 0;}
            if(button)return 0;
            SetFocus(window);SetCapture(window);start=previous=point(l);moved=false;button=pressed;mode=Drag::none;follow=false;ctrlAxis=false;pressedAt=GetTickCount64();flew=false;KillTimer(window,2);
            if(pressed==1){
                if(alt&&ctrl){marquee=true;return 0;}
                // Alt+drag on a gizmo handle duplicates the selection in place and drags the copies; elsewhere Alt orbits.
                if(alt&&!brushEnabled){if(const auto handle=hitHandle(start)){post({{"command","shortcut"},{"key","duplicateInPlace"}});grabbed=handle;transformDrag=true;return 0;}mode=Drag::orbit;return 0;}
                if(brushEnabled){brushPoints.assign(1,start);return 0;}
                grabbed=hitHandle(start);
                if(grabbed){transformDrag=true;follow=shift;return 0;}
                if(ctrl){if(auto h=axisHandle(0)){grabbed=h;transformDrag=true;ctrlAxis=true;}return 0;}
                if(!shift)mode=orthographic?Drag::none:Drag::walk;
                return 0;
            }
            if(pressed==2){
                if(ctrl){if(auto h=axisHandle(2)){grabbed=h;transformDrag=true;ctrlAxis=true;return 0;}}
                mode=alt?Drag::dolly:Drag::look;
                if(mode==Drag::look&&!orthographic)startFlightFromHeldKeys();
                return 0;
            }
            mode=orthographic&&!alt?Drag::measure:Drag::pan;
            return 0;
        }
        case WM_MOUSEMOVE:{
            if(!button){
                // Hover: the gizmo handle under the cursor lights up; otherwise the object under it gets a hover outline.
                const POINT at=point(l);const auto h=hitHandle(at);const int axis=h?h->axis:-1;
                if(!tracking){TRACKMOUSEEVENT t{sizeof(t),TME_LEAVE,window,0};TrackMouseEvent(&t);tracking=true;}
                if(axis!=hoverAxis){hoverAxis=axis;post({{"command","hoverHandle"}});}
                if(axis<0){hoverAt=at;SetTimer(window,2,70,nullptr);}
                return 0;
            }
            const auto at=point(l);
            if(button==1&&!brushPoints.empty()){
                const auto last=brushPoints.back();
                if(std::hypot(double(at.x-last.x),double(at.y-last.y))>=6)brushPoints.push_back(at);
                return 0;
            }
            if(transformDrag){moved=moved||std::abs(at.x-start.x)>=3||std::abs(at.y-start.y)>=3;if(moved)drag(at,true);return 0;}
            if(!moved&&std::abs(at.x-start.x)<3&&std::abs(at.y-start.y)<3)return 0;
            const bool first=!moved;moved=true;
            // LMB drag on empty space: marquee in orthographic views (and with Ctrl+Alt), walk in perspective.
            if(button==1&&(marquee||mode==Drag::none)){marquee=true;post({{"command","marquee"},{"box",{start.x,start.y,at.x,at.y}}});return 0;}
            if(mode==Drag::measure){post({{"command","measure"},{"x",start.x},{"y",start.y},{"x2",at.x},{"y2",at.y}});previous=at;return 0;}
            const char* command=mode==Drag::look?"look":mode==Drag::orbit?"orbit":mode==Drag::dolly?"dolly":mode==Drag::walk?"walk":"pan";
            if(lockCursor){if(!cursorLocked){lockCursorNow();post({{"command",command},{"dx",at.x-start.x},{"dy",at.y-start.y},{"x",start.x},{"y",start.y},{"begin",true}});return 0;}
                const int dx=at.x-lockClient.x,dy=at.y-lockClient.y;if(!dx&&!dy)return 0; // the recentring move itself
                post({{"command",command},{"dx",dx},{"dy",dy},{"x",start.x},{"y",start.y}});SetCursorPos(lockScreen.x,lockScreen.y);return 0;}
            post({{"command",command},{"dx",at.x-previous.x},{"dy",at.y-previous.y},{"x",start.x},{"y",start.y},{"begin",first}});
            previous=at;return 0;
        }
        case WM_LBUTTONUP:case WM_RBUTTONUP:case WM_MBUTTONUP:{
            const int up=message==WM_LBUTTONUP?1:message==WM_RBUTTONUP?2:3;
            if(button!=up){if(ctrlAxis&&button&&grabbed){/* releasing the second button of a Ctrl both-button drag returns to that button's axis */if(auto h=axisHandle(button==1?0:2)){grabbed=h;start=previous=point(l);}}return 0;}
            const auto at=point(l);const bool clicked=std::abs(at.x-start.x)<4&&std::abs(at.y-start.y)<4,wasMode=mode==Drag::look;
            const bool add=(w&MK_CONTROL)!=0||(w&MK_SHIFT)!=0;
            auto stroke=std::exchange(brushPoints,std::vector<POINT>{});
            const bool translate=transformDrag,wasCtrlAxis=ctrlAxis,wasMeasure=mode==Drag::measure;
            if(up==2)stopFlight();
            if(!stroke.empty()){
                finishMouse();
                if(at.x!=stroke.back().x||at.y!=stroke.back().y)stroke.push_back(at);
                Json points=Json::array();
                for(const auto& p:stroke)points.push_back({p.x,p.y});
                post({{"command","worldBrush"},{"points",std::move(points)},{"erase",(w&MK_SHIFT)!=0}});return 0;
            }
            if(up==1&&std::exchange(marquee,false)&&moved){finishMouse();post({{"command","boxSelect"},{"box",{start.x,start.y,at.x,at.y}},{"add",(GetKeyState(VK_CONTROL)&0x8000)!=0}});grabbed.reset();return 0;}
            if(translate&&(moved||!clicked))drag(at,false);
            else if(up==1&&clicked&&(!grabbed||wasCtrlAxis))post({{"command","pick"},{"x",at.x},{"y",at.y},{"add",add}});
            // A right click without dragging opens the context menu (a right drag stays the camera look).
            else if(up==2&&clicked&&wasMode&&!flew&&GetTickCount64()-pressedAt<350){POINT screen=at;ClientToScreen(window,&screen);post({{"command","contextmenu"},{"x",at.x},{"y",at.y},{"sx",screen.x},{"sy",screen.y}});}
            if(wasMeasure)post({{"command","measureEnd"}});
            finishMouse();grabbed.reset();return 0;
        }
        case WM_CAPTURECHANGED:
            if((HWND)l==window)return 0;
            marquee=false;
            if(transformDrag&&moved)post({{"command","translateCancel"}});
            if(mode==Drag::measure)post({{"command","measureEnd"}});
            unlockCursor();button=0;mode=Drag::none;transformDrag=false;follow=false;ctrlAxis=false;brushPoints.clear();stopFlight();return 0;
        case WM_MOUSELEAVE:KillTimer(window,2);hoverAt={-1,-1};tracking=false;hoverAxis=-1;post({{"command","hover"},{"x",-1},{"y",-1}});return 0;
        case WM_SETCURSOR:if(LOWORD(l)==HTCLIENT&&!button&&hoverAxis>=0){SetCursor(LoadCursorW(nullptr,IDC_SIZEALL));return TRUE;}break;
        // Double-click an object: focus it (the first click already selected it).
        case WM_LBUTTONDBLCLK:post({{"command","focus"}});return 0;
        case WM_KILLFOCUS:
            stopFlight();finishMouse();return 0;
        case WM_TIMER:
            // The timer only asks for a frame; the move itself is measured at draw time (takeFlight), so a timer starved by
            // mouse input (WM_TIMER has the lowest priority) never makes the camera stutter.
            if(w==1){if(flightTime)post({{"command","flyTick"}});return 0;}
            if(w==2){KillTimer(window,2);if(!button&&hoverAt.x>=0)post({{"command","hover"},{"x",hoverAt.x},{"y",hoverAt.y}});return 0;}
            break;
        // Wheel while flying (right button held) changes camera speed like Unreal; otherwise it dollies.
        case WM_MOUSEWHEEL:{POINT at=point(l);ScreenToClient(window,&at);post({{"command",button==2&&mode==Drag::look?"speedStep":"zoom"},{"dy",GET_WHEEL_DELTA_WPARAM(w)/120.0},{"x",at.x},{"y",at.y}});return 0;}
        case WM_KEYDOWN:case WM_KEYUP:{
            const auto index=flightKey(w);
            if(button==2&&mode==Drag::look&&index>=0){
                flightKeys.at(index)=message==WM_KEYDOWN;if(message==WM_KEYDOWN)flew=true;
                if(std::none_of(flightKeys.begin(),flightKeys.end(),[](bool pressed){return pressed;})){KillTimer(window,1);flightTime=0;}
                else startFlight();
                return 0;
            }
            if(message!=WM_KEYDOWN)break;
            const bool ctrl=down(VK_CONTROL);
            // Camera speed: + / - (also while not flying).
            if(!ctrl&&(w==VK_OEM_PLUS||w==VK_ADD||w==VK_OEM_MINUS||w==VK_SUBTRACT)){post({{"command","speedStep"},{"dy",w==VK_OEM_PLUS||w==VK_ADD?1.0:-1.0}});return 0;}
            if(w=='F'&&!ctrl){post({{"command","focus"}});return 0;}
            if(!button){
                const char* shortcut=w==VK_DELETE?"delete":ctrl&&w=='D'?"duplicate":ctrl&&w=='C'?"copy":ctrl&&w=='X'?"cut":ctrl&&w=='V'?"paste":nullptr;
                if(shortcut){post({{"command","shortcut"},{"key",shortcut}});return 0;}
                // Arrow / Page keys nudge the selection (the shell picks the axis from the view and the step from snap).
                const char* nudge=w==VK_LEFT?"left":w==VK_RIGHT?"right":w==VK_UP?"up":w==VK_DOWN?"down":w==VK_PRIOR?"raise":w==VK_NEXT?"lower":nullptr;
                if(nudge&&!ctrl){post({{"command","shortcut"},{"key","nudge"},{"direction",nudge},{"shift",down(VK_SHIFT)}});return 0;}
                if(!ctrl&&(w=='W'||w=='E'||w=='R')){selectTransformTool(w=='W'?"translate":w=='E'?"rotate":"scale");return 0;}
            }
            if(w==VK_ESCAPE&&transformDrag){ReleaseCapture();return 0;}
            // Esc during a camera drag puts the camera back where the drag began.
            if(w==VK_ESCAPE&&button&&cameraDrag()){const bool was=moved;moved=false;stopFlight();finishMouse();if(was)post({{"command","dragCancel"}});return 0;}
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
        WNDCLASSW type{};type.hInstance=instance;type.lpszClassName=L"HBEngine.NativeSceneView";type.lpfnWndProc=procedure;type.hCursor=LoadCursorW(nullptr,IDC_ARROW);type.style=CS_DBLCLKS;
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
    void useBrush(bool enabled){brushEnabled=enabled;}
    // Hidden acceptance runs drive the panel with synthetic messages and must not move the real cursor.
    void setCursorLock(bool enabled){lockCursor=enabled;if(!enabled)unlockCursor();}
    int hoveredHandle()const{return hoverAxis;}
    // Value next to the cursor while a gizmo drag runs (interactive sessions only; hidden checks never show popups).
    void showValue(const std::wstring& text){
        if(!window||!lockCursor)return;
        if(!valueTip){if(text.empty())return;valueTip=CreateWindowExW(WS_EX_TOPMOST,TOOLTIPS_CLASSW,nullptr,WS_POPUP|TTS_NOPREFIX|TTS_ALWAYSTIP,CW_USEDEFAULT,CW_USEDEFAULT,CW_USEDEFAULT,CW_USEDEFAULT,window,nullptr,nullptr,nullptr);if(!valueTip)return;tipInfo={sizeof(tipInfo)};tipInfo.uFlags=TTF_TRACK|TTF_ABSOLUTE;tipInfo.hwnd=window;tipInfo.uId=2;tipInfo.lpszText=const_cast<wchar_t*>(L"");SendMessageW(valueTip,TTM_ADDTOOLW,0,LPARAM(&tipInfo));}
        if(text.empty()){if(!valueText.empty()){valueText.clear();SendMessageW(valueTip,TTM_TRACKACTIVATE,FALSE,LPARAM(&tipInfo));}return;}
        valueText=text;tipInfo.lpszText=valueText.data();SendMessageW(valueTip,TTM_UPDATETIPTEXTW,0,LPARAM(&tipInfo));POINT p{};GetCursorPos(&p);SendMessageW(valueTip,TTM_TRACKPOSITION,0,MAKELPARAM(p.x+18,p.y+22));SendMessageW(valueTip,TTM_TRACKACTIVATE,TRUE,LPARAM(&tipInfo));
    }
    void selectTransformTool(std::string mode){
        if(button)return;
        tool=std::move(mode);handles.clear();post({{"command","transformTool"}});
    }
    const std::string& transformTool()const{return tool;}
    // The viewport reports its projection each frame: orthographic views marquee with LMB and measure with MMB.
    void setProjection(const std::string& projection){orthographic=projection=="orthographic";}
    // True while the right button looks/flies in this viewport: editor-wide letter shortcuts must not take W/E/Q/... then.
    bool flying()const{return button==2&&mode==Drag::look;}
    // Flight since the last drawn frame (high-resolution clock), or null when no flight key is held.
    Json takeFlight(){if(!flightTime)return nullptr;LARGE_INTEGER now{},freq{};QueryPerformanceCounter(&now);QueryPerformanceFrequency(&freq);const double seconds=std::min(.1,double(now.QuadPart-flightLast.QuadPart)/double(freq.QuadPart));flightLast=now;
        const int forward=int(flightKeys[0])-int(flightKeys[1]),right=int(flightKeys[2])-int(flightKeys[3]),up=int(flightKeys[4])-int(flightKeys[5]),zoom=int(flightKeys[6])-int(flightKeys[7]);
        if(!forward&&!right&&!up&&!zoom)return nullptr;return {{"forward",forward},{"right",right},{"up",up},{"zoom",zoom},{"seconds",seconds},{"fast",down(VK_SHIFT)}};}
    HWND handle()const{return window;}
    void setHandles(const Json& rows){
        handles.clear();
        for(const auto& row:rows){
            const double x=row.at(1),y=row.at(2);
            handles.push_back({row.at(0).get<int>(),x,y,row.at(3).get<double>()-x,row.at(4).get<double>()-y});
        }
    }
    void toScreen(POINT& point)const{ClientToScreen(window,&point);}
    std::optional<POINT> dropPoint(POINT screen)const{
        if(!IsWindowVisible(window))return {};
        ScreenToClient(window,&screen);
        const auto area=size();
        if(screen.x<0||screen.y<0||screen.x>=area.cx||screen.y>=area.cy)return {};
        return screen;
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
