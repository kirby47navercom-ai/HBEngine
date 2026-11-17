#pragma once
// Flat Direct2D tool strip used for the main toolbar, the scene tool row, panel headers/footers and the status bar.
// The shell sends items; clicks come back as {"event":"command","id",x,y} with the item's bottom-left in screen pixels.
#include "EditorPanelBase.hpp"

class EditorChromePanel final : public EditorPanelBase {
public:
    struct Item {std::string id,label,kind;std::wstring glyph;bool active=false,enabled=true,right=false;D2D1_COLOR_F tint{0,0,0,0};D2D1_RECT_F rect{};};
    void attach(HWND owner,HINSTANCE instance,Post post,const std::string& panelName){EditorPanelBase::attach(owner,instance,std::move(post),L"HBEngine.EditorChromePanel",panelName);}

    // {visible, rect, theme, items:[{id,label,glyph(UTF-8 MDL2 char),kind:"button"|"dropdown"|"toggle"|"text"|"sep",active,enabled,right,tint:[r,g,b]}]}
    void update(const Json& model){
        if(!window)return;
        if(model.contains("items")){
            items.clear();
            for(const auto& r:model.at("items")){
                Item item;item.id=r.value("id",std::string());item.label=r.value("label",std::string());item.kind=r.value("kind",std::string("button"));
                item.glyph=wide(r.value("glyph",std::string()));item.active=r.value("active",false);item.enabled=r.value("enabled",true);item.right=r.value("right",false);
                if(r.contains("tint")){const auto& t=r.at("tint");item.tint={t.at(0).get<float>(),t.at(1).get<float>(),t.at(2).get<float>(),1};}
                items.push_back(std::move(item));
            }
            hover=-1;
        }
        if(model.contains("floating"))floating=model.at("floating").get<bool>();
        applyCommon(model);place();
        // Floating chips: the window is cut to the chip shapes so the scene shows between and around them.
        if(floating&&bounds[2]>0&&bounds[3]>0){arrange();std::string shape;for(const auto& item:items)shape+=std::to_string(int(item.rect.left))+","+std::to_string(int(item.rect.right))+";";shape+=std::to_string(bounds[3]);if(shape==regionShape){InvalidateRect(window,nullptr,FALSE);return;}regionShape=shape;HRGN region=CreateRectRgn(0,0,0,0);for(const auto& item:items){if(item.kind=="sep")continue;const auto& r=item.rect;HRGN chip=CreateRoundRectRgn(int(r.left),int(r.top),int(r.right)+1,int(r.bottom)+1,px(6),px(6));CombineRgn(region,region,chip,RGN_OR);DeleteObject(chip);}SetWindowRgn(window,region,TRUE);}
        else if(!floating&&!regionShape.empty()){regionShape.clear();SetWindowRgn(window,nullptr,TRUE);}
        InvalidateRect(window,nullptr,FALSE);
    }
    Json inspect()const{Json list=Json::array();for(const auto& item:items)list.push_back({{"id",item.id},{"active",item.active}});auto out=common();out["items"]=list;return out;}
    // Acceptance: click an item by id as the mouse would.
    bool click(const std::string& id){for(int i=0;i<int(items.size());++i)if(items[i].id==id){const auto& r=items[i].rect;const LPARAM at=MAKELPARAM(int((r.left+r.right)/2),int((r.top+r.bottom)/2));SendMessageW(window,WM_LBUTTONDOWN,MK_LBUTTON,at);SendMessageW(window,WM_LBUTTONUP,0,at);return true;}return false;}
private:
    std::vector<Item> items;int hover=-1,pressed=-1;bool floating=false,dragging=false;POINT downAt{};std::string regionShape;
    float measure(const std::wstring& s){if(s.empty())return 0;IDWriteTextLayout* layout=nullptr;if(FAILED(write->CreateTextLayout(s.c_str(),UINT32(s.size()),text,4096.f,100.f,&layout))||!layout)return float(s.size()*px(8));DWRITE_TEXT_METRICS m{};layout->GetMetrics(&m);layout->Release();return m.widthIncludingTrailingWhitespace;}
    void arrange(){
        prepareText();const float h=float(bounds[3]),itemH=floating?h:std::min(h-px(6),float(px(26))),top=floating?0.f:(h-itemH)/2;float left=float(floating?0:px(6)),right=float(bounds[2]-px(6));
        const auto width=[&](Item& item){
            if(item.kind=="sep")return float(px(13));
            float w=(item.glyph.empty()?0.f:float(px(16)))+measure(wide(item.label))+(item.kind=="text"||item.kind=="title"?float(px(8)):item.kind=="tab"?float(px(30)):float(px(16)));
            if(!item.glyph.empty()&&!item.label.empty())w+=float(px(6));if(item.kind=="dropdown")w+=float(px(12));return w;};
        for(auto& item:items)if(!item.right){const float w=width(item);item.rect={left,top,left+w,top+itemH};left+=w+px(2);}
        for(auto it=items.rbegin();it!=items.rend();++it)if(it->right){const float w=width(*it);it->rect={right-w,top,right,top+itemH};right-=w+px(2);}
        // Left items never run under the right group: the last fitting one is shortened (ellipsis), later ones are hidden.
        for(auto& item:items)if(!item.right&&item.rect.right>right-px(4)){item.rect.right=std::max(item.rect.left,right-px(4));if(item.rect.right-item.rect.left<px(28))item.rect.right=item.rect.left;}
    }
    void draw()override{
        canvas->Clear(floating?theme.floating:theme.background);arrange();
        for(int i=0;i<int(items.size());++i){
            const auto& item=items[i];const auto& r=item.rect;if(r.right<=r.left)continue;
            if(item.kind=="sep"){fill((r.left+r.right)/2,r.top+px(4),1.f,r.bottom-r.top-px(8),theme.line);continue;}
            if(item.kind=="tab"){const float tw=r.right-r.left;if(item.active){brush->SetColor(theme.background);canvas->FillRoundedRectangle(D2D1::RoundedRect(D2D1::RectF(r.left,r.top,r.right,r.bottom+px(8)),float(px(5)),float(px(5))),brush);fill(r.left+px(3),r.top,tw-px(6),float(px(2)),theme.accent);}else if(i==hover)box(r.left,r.top,tw,r.bottom-r.top,theme.raised,theme.raised);label(wide(item.label),item.active?bold:text,r.left+px(12),r.top,tw-px(16),r.bottom-r.top,item.active?theme.text:theme.muted);continue;}
            const bool interactive=item.kind!="text"&&item.kind!="title"&&item.enabled;
            if(item.active)box(r.left,r.top,r.right-r.left,r.bottom-r.top,theme.accent,theme.accent);
            else if(interactive&&i==hover)box(r.left,r.top,r.right-r.left,r.bottom-r.top,theme.raised,theme.raised);
            const auto ink=!item.enabled?theme.line:item.active?theme.strong:item.kind=="text"?theme.muted:theme.text;
            float x=r.left+(item.kind=="text"||item.kind=="title"?px(4):px(8));
            if(!item.glyph.empty()){label(item.glyph,icons,x,r.top,float(px(16)),r.bottom-r.top,item.tint.a>0&&item.enabled&&!item.active?item.tint:ink);x+=px(16)+(item.label.empty()?0:px(6));}
            if(!item.label.empty())label(wide(item.label),item.kind=="title"?bold:text,x,r.top,r.right-x-(item.kind=="dropdown"?px(14):0),r.bottom-r.top,item.kind=="title"?theme.text:ink);
            if(item.kind=="dropdown")label(L"\xE70D",icons,r.right-px(16),r.top+px(1),float(px(12)),r.bottom-r.top,theme.muted);
        }
    }
    int itemAt(int x,int y)const{for(int i=0;i<int(items.size());++i){const auto& r=items[i].rect;if(items[i].kind!="sep"&&items[i].kind!="text"&&items[i].kind!="title"&&items[i].enabled&&x>=r.left&&x<r.right&&y>=r.top&&y<r.bottom)return i;}return -1;}
    LRESULT handle(UINT message,WPARAM w,LPARAM l)override{
        switch(message){
        case WM_MOUSEMOVE:{
            // Dragging a panel tab (Unreal docking): past a small threshold the drop target is chosen on release.
            if(pressed>=0&&(w&MK_LBUTTON)&&items[pressed].kind=="tab"){if(!dragging&&std::abs(xOf(l)-downAt.x)+std::abs(yOf(l)-downAt.y)>px(8))dragging=true;if(dragging){SetCursor(LoadCursorW(nullptr,IDC_SIZEALL));return 0;}}
            const int hit=itemAt(xOf(l),yOf(l));if(hit!=hover){hover=hit;InvalidateRect(window,nullptr,FALSE);TRACKMOUSEEVENT t{sizeof(t),TME_LEAVE,window,0};TrackMouseEvent(&t);}return 0;}
        case WM_MOUSELEAVE:hover=-1;InvalidateRect(window,nullptr,FALSE);return 0;
        case WM_LBUTTONDOWN:pressed=itemAt(xOf(l),yOf(l));downAt={xOf(l),yOf(l)};dragging=false;if(pressed>=0)SetCapture(window);return 0;
        case WM_CAPTURECHANGED:if(dragging){dragging=false;SetCursor(LoadCursorW(nullptr,IDC_ARROW));}return 0;
        case WM_LBUTTONUP:{
            if(GetCapture()==window)ReleaseCapture();
            if(dragging&&pressed>=0){POINT at{xOf(l),yOf(l)};ClientToScreen(window,&at);const auto id=items[pressed].id;dragging=false;pressed=-1;SetCursor(LoadCursorW(nullptr,IDC_ARROW));emit({{"event","drop"},{"id",id},{"x",at.x},{"y",at.y}});return 0;}
            const int hit=itemAt(xOf(l),yOf(l));if(hit<0||hit!=pressed){pressed=-1;return 0;}pressed=-1;
            POINT at{LONG(items[hit].rect.left),LONG(items[hit].rect.bottom)};ClientToScreen(window,&at);
            emit({{"event","command"},{"id",items[hit].id},{"x",at.x},{"y",at.y}});return 0;}
        }
        return common(message,w,l);
    }
};
