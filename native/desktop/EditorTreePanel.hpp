#pragma once
// Native editor hierarchy (outliner) panel. The editor script owns the scene and sends ready-made rows; this window
// owns layout, painting and input and reports intents (select, fold, toggles, reparent, context menu, keys).
#include "EditorPanelBase.hpp"

class EditorTreePanel : public EditorPanelBase {
public:
    struct Row {std::string id,name,icon;int depth=0;bool children=false,collapsed=false,selected=false,locked=false,visible=true;};
    enum Part {None,Fold,Item,Lock,Eye};
    void attach(HWND owner,HINSTANCE instance,Post post){EditorPanelBase::attach(owner,instance,std::move(post),L"HBEngine.EditorTreePanel","hierarchy");}

    // op "hierarchy": {visible, rect:[x,y,w,h] physical pixels, scale, rows:[...], theme, reveal}
    void update(const Json& model){
        if(!window)return;
        if(model.contains("rows")){rows.clear();for(const auto& r:model.at("rows")){Row row;row.id=r.at("id").get<std::string>();row.name=r.value("name",std::string());row.icon=r.value("icon",std::string());row.depth=std::clamp(r.value("depth",0),0,64);row.children=r.value("children",false);row.collapsed=r.value("collapsed",false);row.selected=r.value("selected",false);row.locked=r.value("locked",false);row.visible=r.value("visible",true);rows.push_back(std::move(row));}}
        applyCommon(model);
        if(model.contains("reveal")&&model.at("reveal").is_string()){const auto id=model.at("reveal").get<std::string>();for(std::size_t i=0;i<rows.size();i++)if(rows[i].id==id){const int top=int(i)*rowHeight(),bottom=top+rowHeight();if(top<scroll)scroll=top;else if(bottom>scroll+std::max(1,bounds[3]))scroll=bottom-bounds[3];}}
        clampScroll();place();
    }
    Json inspect()const{
        Json list=Json::array();for(const auto& row:rows)list.push_back({{"id",row.id},{"name",row.name},{"depth",row.depth},{"selected",row.selected}});
        auto out=common();out["rows"]=list;out["scroll"]=scroll;out["paintedRows"]=paintedRows;out["lastMenu"]=lastMenu;return out;
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
        else if(action=="right"){automaticMenu=p.value("menuIndex",0u);automaticCommand=p.value("command",std::string());POINT screen{xOf(at),yOf(at)};ClientToScreen(window,&screen);menuAt=screen;SendMessageW(window,WM_RBUTTONUP,keys,at);}
        else if(action=="drag"){const int to=p.value("to",-1);const LPARAM end=to<0?MAKELPARAM(bounds[2]/2,std::min(bounds[3]-2,int(rows.size())*rowHeight()-scroll+rowHeight())):point(to,"item");SendMessageW(window,WM_LBUTTONDOWN,MK_LBUTTON,at);SendMessageW(window,WM_MOUSEMOVE,MK_LBUTTON,MAKELPARAM(xOf(at)+px(20),yOf(at)+px(20)));SendMessageW(window,WM_MOUSEMOVE,MK_LBUTTON,end);SendMessageW(window,WM_LBUTTONUP,0,end);}
        probeKeys=0;
    }
private:
    std::vector<Row> rows;int scroll=0,hover=-1,downRow=-1,dropRow=-2;Part downPart=None;POINT downAt{};bool dragging=false;std::size_t paintedRows=0;
    WPARAM probeKeys=0;bool probeCtrl=false;
    int rowHeight()const{return std::max(1,px(26));}
    int indent(int depth)const{return px(6)+depth*px(14);}
    void clampScroll(){scroll=std::clamp(scroll,0,std::max(0,int(rows.size())*rowHeight()-bounds[3]));}
    int rowAt(int y)const{const int i=(y+scroll)/rowHeight();return y>=0&&i>=0&&i<int(rows.size())?i:-1;}
    Part partAt(int row,int x)const{if(row<0)return None;const auto& r=rows[row];const int fold=indent(r.depth);if(r.children&&x>=fold&&x<fold+px(16))return Fold;if(x>=bounds[2]-px(48)&&x<bounds[2]-px(24))return Lock;if(x>=bounds[2]-px(24))return Eye;return Item;}
    static const wchar_t* glyph(const std::string& icon){
        if(icon=="sun"||icon=="light"||icon=="bulb")return L"";if(icon=="camera")return L"";if(icon=="user"||icon=="character"||icon=="person"||icon=="pawn")return L"";
        if(icon=="sphere"||icon=="globe")return L"";if(icon=="folder"||icon=="group")return L"";if(icon=="volume"||icon=="audio")return L"";if(icon=="image"||icon=="sprite")return L"";return L"";}
    void draw()override{
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
    LRESULT handle(UINT message,WPARAM w,LPARAM l)override{
        const int x=xOf(l),y=yOf(l);const bool ctrl=(w&MK_CONTROL)||(probeKeys&MK_CONTROL),shift=(w&MK_SHIFT)||(probeKeys&MK_SHIFT);
        switch(message){
        case WM_MOUSEMOVE:{const int row=rowAt(y);if(downRow>=0&&downPart==Item&&(w&MK_LBUTTON)){if(!dragging&&(std::abs(x-downAt.x)>px(4)||std::abs(y-downAt.y)>px(4)))dragging=true;if(dragging){dropRow=row;InvalidateRect(window,nullptr,FALSE);}}
            if(row!=hover){hover=row;InvalidateRect(window,nullptr,FALSE);TRACKMOUSEEVENT t{sizeof(t),TME_LEAVE,window,0};TrackMouseEvent(&t);}return 0;}
        case WM_MOUSELEAVE:hover=-1;InvalidateRect(window,nullptr,FALSE);return 0;
        case WM_LBUTTONDOWN:{SetFocus(window);SetCapture(window);const int row=rowAt(y);downRow=row;downPart=partAt(row,x);downAt={x,y};dragging=false;dropRow=-2;emit({{"event","focus-panel"}});
            if(row<0){emit({{"event","clear"}});return 0;}const auto& id=rows[row].id;
            if(downPart==Fold)emit({{"event","fold"},{"id",id}});else if(downPart==Lock)emit({{"event","lock"},{"id",id}});else if(downPart==Eye)emit({{"event","visible"},{"id",id}});
            else emit({{"event","select"},{"id",id},{"ctrl",ctrl},{"shift",shift}});return 0;}
        case WM_LBUTTONUP:{if(GetCapture()==window)ReleaseCapture();if(dragging&&downRow>=0){const std::string to=dropRow>=0?rows[dropRow].id:"";if(to!=rows[downRow].id)emit({{"event","reparent"},{"id",rows[downRow].id},{"target",to}});}
            dragging=false;dropRow=-2;downRow=-1;downPart=None;InvalidateRect(window,nullptr,FALSE);return 0;}
        case WM_LBUTTONDBLCLK:{const int row=rowAt(y);if(row>=0&&partAt(row,x)==Item)emit({{"event","activate"},{"id",rows[row].id}});return 0;}
        case WM_RBUTTONUP:{const int row=rowAt(y);POINT at{x,y};ClientToScreen(window,&at);if(!menuAt)menuAt=at;emit({{"event","contextmenu"},{"id",row>=0?Json(rows[row].id):Json()}});return 0;}
        case WM_MOUSEWHEEL:{scroll-=int(GET_WHEEL_DELTA_WPARAM(w))*rowHeight()*3/WHEEL_DELTA;clampScroll();InvalidateRect(window,nullptr,FALSE);return 0;}
        case WM_KEYDOWN:case WM_SYSKEYDOWN:{if(keyName(w).empty())break;forwardKey(message,w,probeCtrl);return 0;}
        }
        return common(message,w,l);
    }
};
