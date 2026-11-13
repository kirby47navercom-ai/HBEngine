#pragma once
// Native editor property (inspector) panel. The editor script keeps its HTML form as the hidden source of truth and
// sends it as rows of controls; this window paints them, edits values (Win32 EDIT for text so IME/clipboard work,
// native popup menus for selects, ChooseColor for colors) and reports {event:"change"|"input"|"click"|"toggle", i}.
#include "EditorPanelBase.hpp"
#include <commctrl.h>
#include <commdlg.h>

class EditorFormPanel : public EditorPanelBase {
public:
    struct Control {std::string kind,value,text,icon,hint;int i=-1;bool checked=false,disabled=false,pressed=false;double min=0,max=1,step=0;std::vector<std::pair<std::string,std::string>> options;std::optional<std::array<int,4>> box;};
    struct Row {std::string kind,text,label;int toggle=-1;bool open=true;std::vector<Control> controls;};
    void attach(HWND owner,HINSTANCE instance,Post post,const std::string& panelName="inspector"){EditorPanelBase::attach(owner,instance,std::move(post),L"HBEngine.EditorFormPanel",panelName);}
    ~EditorFormPanel()override{closeEdit(false);if(IsWindow(tooltip))DestroyWindow(tooltip);if(font)DeleteObject(font);}

    // op "form" (or "inspector"): {visible, rect, scale, theme, revision, rows:[{kind:"heading"|"message"|"row", text, label, toggle, open, controls:[...]}]}
    void update(const Json& model){
        if(!window)return;
        if(model.contains("rows")){
            const auto revisionChanged=model.value("revision",0ull)!=revision;revision=model.value("revision",0ull);rows.clear();
            for(const auto& r:model.at("rows")){Row row;row.kind=r.value("kind",std::string("row"));row.text=r.value("text",std::string());row.label=r.value("label",std::string());row.toggle=r.value("toggle",-1);row.open=r.value("open",true);
                for(const auto& c:r.value("controls",Json::array())){Control control;control.kind=c.at("kind").get<std::string>();control.i=c.at("i").get<int>();control.value=c.value("value",std::string());control.text=c.value("text",std::string());control.checked=c.value("checked",false);control.disabled=c.value("disabled",false);control.min=c.value("min",0.0);control.max=c.value("max",1.0);control.step=c.value("step",0.0);
                    control.icon=c.value("icon",std::string());control.hint=c.value("hint",std::string());control.pressed=c.value("pressed",false);
                    if(c.contains("box"))control.box=c.at("box").get<std::array<int,4>>();
                    for(const auto& o:c.value("options",Json::array()))control.options.emplace_back(o.at(0).get<std::string>(),o.at(1).get<std::string>());row.controls.push_back(std::move(control));}
                rows.push_back(std::move(row));}
            // A re-rendered form invalidates an open text edit only if its control disappeared.
            if(revisionChanged&&editing>=0&&!find(editing))cancelEdit();
        }
        applyCommon(model);layout();place();
    }
    Json inspect()const{
        Json list=Json::array();for(const auto& row:rows){Json controls=Json::array();for(const auto& c:row.controls)controls.push_back({{"kind",c.kind},{"i",c.i},{"value",c.value},{"checked",c.checked},{"text",c.text},{"icon",c.icon},{"hint",c.hint}});list.push_back({{"kind",row.kind},{"text",row.text},{"label",row.label},{"toggle",row.toggle},{"controls",controls}});}
        auto out=common();out["rows"]=list;out["scroll"]=scroll;out["contentHeight"]=contentHeight;out["editing"]=editing;out["revision"]=revision;out["paintedRows"]=paintedRows;out["lastMenu"]=lastMenu;out["backend"]=graphicsBackend();out["graphicsError"]=graphicsError;return out;
    }
    // Acceptance only: real window messages at a control. {action:"click"|"edit"|"select"|"color"|"range"|"heading"|"wheel", i, text, option, value, fraction, row, delta}
    void probe(const Json& p){
        const auto action=p.at("action").get<std::string>();
        if(action=="paint"){InvalidateRect(window,nullptr,FALSE);SendMessageW(window,WM_PAINT,0,0);return;}
        if(action=="menu"){automaticCommand=p.at("command").get<std::string>();return;}
        if(action=="wheel"){SendMessageW(window,WM_MOUSEWHEEL,MAKEWPARAM(0,short(p.at("delta").get<int>())),0);return;}
        if(action=="heading"){const auto& hit=headingHit(p.at("row").get<int>());click(hit.left+px(10),(hit.top+hit.bottom)/2);return;}
        const int i=p.at("i").get<int>();reveal(i);const RECT r=rectOf(i);const int cx=(r.left+r.right)/2,cy=(r.top+r.bottom)/2;
        if(action=="click")click(cx,cy);
        else if(action=="edit"){click(cx,cy);if(!edit)throw std::runtime_error("Text editor did not open");SetWindowTextW(edit,wide(p.at("text").get<std::string>()).c_str());SendMessageW(edit,WM_KEYDOWN,VK_RETURN,0);if(editing>=0&&find(editing)->kind=="textarea")commitEdit();}
        else if(action=="select"){automaticOption=p.at("option").get<int>()+1;click(cx,cy);}
        else if(action=="color"){automaticColor=p.at("value").get<std::string>();click(cx,cy);}
        else if(action=="range"){const int x=r.left+int((r.right-r.left)*p.at("fraction").get<double>());SendMessageW(window,WM_LBUTTONDOWN,MK_LBUTTON,MAKELPARAM(r.left+1,cy));SendMessageW(window,WM_MOUSEMOVE,MK_LBUTTON,MAKELPARAM(x,cy));SendMessageW(window,WM_LBUTTONUP,0,MAKELPARAM(x,cy));}
    }
private:
    std::vector<Row> rows;std::vector<RECT> rowRects;std::vector<std::pair<int,RECT>> hits;int scroll=0,contentHeight=0,hover=-1,editing=-1,sliding=-1;std::uint64_t revision=0;std::size_t paintedRows=0;
    HWND edit=nullptr,tooltip=nullptr;WNDPROC editProcedure=nullptr;HFONT font=nullptr;int automaticOption=0;std::string automaticColor;std::string slideValue;
    std::wstring tooltipText;
    const Control* find(int i)const{for(const auto& row:rows)for(const auto& c:row.controls)if(c.i==i)return &c;return nullptr;}
    RECT rectOf(int i)const{for(const auto& [index,r]:hits)if(index==i)return r;throw std::runtime_error("Inspector control not laid out");}
    RECT headingHit(int row)const{if(row<0||row>=int(rowRects.size()))throw std::runtime_error("Inspector row invalid");RECT r=rowRects[row];OffsetRect(&r,0,-scroll);return r;}
    int rowHeight(const Row& row)const{if(row.kind=="heading")return px(30);if(row.kind=="message")return px(40);for(const auto& c:row.controls)if(c.kind=="textarea")return px(76);return px(30);}
    // Content coordinates (before scroll): one rectangle per row and per control.
    void layout(){
        rowRects.clear();hits.clear();int y=px(4);const int w=std::max(1,bounds[2]),pad=px(8),gap=px(4);
        for(const auto& row:rows){const bool toolbar=row.kind=="toolbar";const int h=toolbar?bounds[3]:rowHeight(row);if(toolbar)y=0;rowRects.push_back({0,y,w,y+h});
            if(toolbar){for(const auto& c:row.controls)if(c.box){const auto& r=*c.box;hits.push_back({c.i,{r[0],r[1],r[0]+r[2],r[1]+r[3]}});}}
            else if(row.kind=="row"&&!row.controls.empty()){const int left=row.label.empty()?pad:std::max(px(70),int(w*.38f)),width=std::max(1,w-pad-left),n=int(row.controls.size()),each=std::max(1,(width-gap*(n-1))/n);
                for(int k=0;k<n;k++){const int x=left+k*(each+gap);hits.push_back({row.controls[k].i,{x,y+px(4),x+each,y+h-px(4)}});}}
            y+=h;}
        contentHeight=y+(rows.size()==1&&rows.front().kind=="toolbar"?0:px(8));scroll=std::clamp(scroll,0,std::max(0,contentHeight-bounds[3]));
        if(edit&&editing>=0){bool found=false;for(const auto& [i,r]:hits)if(i==editing){found=true;SetWindowPos(edit,nullptr,r.left+1,r.top-scroll+1,r.right-r.left-2,r.bottom-r.top-2,SWP_NOZORDER|SWP_NOACTIVATE);}if(!found)cancelEdit();}
    }
    void reveal(int i){const RECT r=rectOf(i);if(r.top<scroll)scroll=r.top-px(4);else if(r.bottom>scroll+bounds[3])scroll=r.bottom-bounds[3]+px(4);layout();InvalidateRect(window,nullptr,FALSE);}
    int controlAt(int x,int y)const{for(const auto& [i,r]:hits)if(x>=r.left&&x<r.right&&y+scroll>=r.top&&y+scroll<r.bottom)return i;return -1;}
    int headingAt(int x,int y)const{(void)x;for(std::size_t k=0;k<rows.size();k++){const auto& r=rowRects[k];if(rows[k].kind=="heading"&&rows[k].toggle>=0&&y+scroll>=r.top&&y+scroll<r.bottom)return int(k);}return -1;}
    void click(int x,int y){SendMessageW(window,WM_LBUTTONDOWN,MK_LBUTTON,MAKELPARAM(x,y));SendMessageW(window,WM_LBUTTONUP,0,MAKELPARAM(x,y));}
    static double parse(const std::string& s,double fallback){try{return std::stod(s);}catch(...){return fallback;}}
    static std::string number(double v){std::string s=std::to_string(v);s.erase(s.find_last_not_of('0')+1);if(!s.empty()&&s.back()=='.')s.pop_back();return s=="-0"?"0":s;}
    std::string rangeValue(const Control& c,int x,const RECT& r)const{double t=std::clamp(double(x-r.left)/std::max(1L,r.right-r.left),0.0,1.0),v=c.min+t*(c.max-c.min);if(c.step>0)v=c.min+std::round((v-c.min)/c.step)*c.step;return number(std::clamp(v,c.min,c.max));}
    void fontChanged()override{if(font){DeleteObject(font);font=nullptr;}}
    void beginEdit(const Control& c,const RECT& r){
        cancelEdit();editing=c.i;const bool multi=c.kind=="textarea";
        if(!font)font=CreateFontW(-px(12.5f),0,0,0,FW_NORMAL,FALSE,FALSE,FALSE,DEFAULT_CHARSET,OUT_DEFAULT_PRECIS,CLIP_DEFAULT_PRECIS,CLEARTYPE_QUALITY,DEFAULT_PITCH,L"Segoe UI");
        edit=CreateWindowExW(0,L"EDIT",wide(c.value).c_str(),WS_CHILD|WS_VISIBLE|WS_BORDER|(multi?ES_MULTILINE|ES_WANTRETURN|WS_VSCROLL|ES_AUTOVSCROLL:ES_AUTOHSCROLL),r.left+1,r.top-scroll+1,r.right-r.left-2,r.bottom-r.top-2,window,nullptr,GetModuleHandleW(nullptr),nullptr);
        SendMessageW(edit,WM_SETFONT,WPARAM(font),TRUE);SendMessageW(edit,EM_SETSEL,0,-1);SetWindowLongPtrW(edit,GWLP_USERDATA,reinterpret_cast<LONG_PTR>(this));
        editProcedure=reinterpret_cast<WNDPROC>(SetWindowLongPtrW(edit,GWLP_WNDPROC,reinterpret_cast<LONG_PTR>(editHook)));SetFocus(edit);
    }
    void commitEdit(bool restoreFocus=true){if(!edit)return;const int i=editing;const int n=GetWindowTextLengthW(edit);std::wstring value(n+1,0);GetWindowTextW(edit,value.data(),n+1);value.resize(n);closeEdit(restoreFocus);emit({{"event","change"},{"i",i},{"value",utf8(value)},{"revision",revision}});}
    void cancelEdit(){closeEdit();}
    void closeEdit(bool restoreFocus=true){if(!edit)return;HWND old=edit;edit=nullptr;editing=-1;SetWindowLongPtrW(old,GWLP_WNDPROC,reinterpret_cast<LONG_PTR>(editProcedure));DestroyWindow(old);if(restoreFocus)SetFocus(window);InvalidateRect(window,nullptr,FALSE);}
    static LRESULT CALLBACK editHook(HWND h,UINT m,WPARAM w,LPARAM l){
        auto* self=reinterpret_cast<EditorFormPanel*>(GetWindowLongPtrW(h,GWLP_USERDATA));const auto previous=self->editProcedure;
        if(m==WM_KEYDOWN&&w==VK_ESCAPE){self->cancelEdit();return 0;}
        if(m==WM_KEYDOWN&&w==VK_RETURN&&!(GetWindowLongPtrW(h,GWL_STYLE)&ES_MULTILINE)){self->commitEdit();return 0;}
        if(m==WM_KEYDOWN&&w==VK_TAB){self->commitEdit();return 0;}
        if(m==WM_CHAR&&(w==VK_RETURN||w==VK_ESCAPE||w==VK_TAB)&&!(GetWindowLongPtrW(h,GWL_STYLE)&ES_MULTILINE))return 0;
        if(m==WM_KILLFOCUS){const auto result=CallWindowProcW(previous,h,m,w,l);if(self->edit==h)self->commitEdit(false);return result;}
        return CallWindowProcW(previous,h,m,w,l);
    }
    void chooseOption(const Control& c,const RECT& r){
        HMENU menu=CreatePopupMenu();for(std::size_t k=0;k<c.options.size();k++)AppendMenuW(menu,MF_STRING|(c.options[k].first==c.value?MF_CHECKED:0),k+1,wide(c.options[k].second).c_str());
        POINT at{r.left,r.bottom-scroll};ClientToScreen(window,&at);const UINT chosen=automaticOption?UINT(automaticOption):TrackPopupMenu(menu,TPM_RETURNCMD|TPM_NONOTIFY|TPM_LEFTALIGN|TPM_TOPALIGN,at.x,at.y,0,window,nullptr);automaticOption=0;DestroyMenu(menu);
        if(chosen&&chosen<=c.options.size())emit({{"event","change"},{"i",c.i},{"value",c.options[chosen-1].first},{"revision",revision}});
    }
    void chooseColor(const Control& c){
        std::string value=automaticColor;automaticColor.clear();
        if(value.empty()){static COLORREF custom[16]{};const unsigned rgb=c.value.size()==7?unsigned(std::stoul(c.value.substr(1),nullptr,16)):0;CHOOSECOLORW cc{sizeof(cc)};cc.hwndOwner=GetAncestor(window,GA_ROOT);cc.rgbResult=RGB(rgb>>16&255,rgb>>8&255,rgb&255);cc.lpCustColors=custom;cc.Flags=CC_FULLOPEN|CC_RGBINIT;
            if(!ChooseColorW(&cc))return;char hex[8];std::snprintf(hex,sizeof(hex),"#%02x%02x%02x",GetRValue(cc.rgbResult),GetGValue(cc.rgbResult),GetBValue(cc.rgbResult));value=hex;}
        emit({{"event","change"},{"i",c.i},{"value",value},{"revision",revision}});
    }
    static D2D1_COLOR_F parseColor(const std::string& v){if(v.size()!=7||v[0]!='#')return {0,0,0,1};const unsigned rgb=unsigned(std::stoul(v.substr(1),nullptr,16));return {float(rgb>>16&255)/255,float(rgb>>8&255)/255,float(rgb&255)/255,1};}
    static const wchar_t* buttonGlyph(const std::string& icon){
        if(icon=="back")return L"\uE72B";
        if(icon=="forward")return L"\uE72A";
        if(icon=="up")return L"\uE74A";
        if(icon=="refresh")return L"\uE72C";
        if(icon=="list")return L"\uE8FD";
        if(icon=="tiles"||icon=="grid")return L"\uE80A";
        if(icon=="plus")return L"\uE710";
        if(icon=="close")return L"\uE711";
        if(icon=="settings")return L"\uE713";
        if(icon=="filter")return L"\uE71C";
        if(icon=="search")return L"\uE721";
        if(icon=="save")return L"\uE74E";
        if(icon=="help")return L"\uE897";
        if(icon=="folder")return L"\uE8B7";
        if(icon=="chevron")return L"\uE70D";
        return nullptr;
    }
    void hintAt(int x,int y){
        const auto* control=find(hover);
        if(!control||control->hint.empty())return;
        if(!tooltip){
            INITCOMMONCONTROLSEX common{sizeof(common),ICC_WIN95_CLASSES};InitCommonControlsEx(&common);
            tooltip=CreateWindowExW(WS_EX_TOPMOST,TOOLTIPS_CLASSW,nullptr,WS_POPUP|TTS_NOPREFIX|TTS_ALWAYSTIP,0,0,0,0,window,nullptr,GetModuleHandleW(nullptr),nullptr);
            if(!tooltip)return;
            TOOLINFOW tool{sizeof(tool),TTF_TRACK|TTF_ABSOLUTE,window,1};tool.lpszText=const_cast<wchar_t*>(L"");SendMessageW(tooltip,TTM_ADDTOOLW,0,LPARAM(&tool));
        }
        tooltipText=wide(control->hint);TOOLINFOW tool{sizeof(tool),TTF_TRACK|TTF_ABSOLUTE,window,1};tool.lpszText=tooltipText.data();
        POINT at{x,y+px(18)};ClientToScreen(window,&at);SendMessageW(tooltip,TTM_TRACKPOSITION,0,MAKELPARAM(at.x,at.y));
        SendMessageW(tooltip,TTM_UPDATETIPTEXTW,0,LPARAM(&tool));SendMessageW(tooltip,TTM_TRACKACTIVATE,TRUE,LPARAM(&tool));
    }
    void hideHint(){if(tooltip){TOOLINFOW tool{sizeof(tool),TTF_TRACK|TTF_ABSOLUTE,window,1};SendMessageW(tooltip,TTM_TRACKACTIVATE,FALSE,LPARAM(&tool));}}
    void draw()override{
        canvas->Clear(theme.background);paintedRows=0;const float w=float(bounds[2]);const float pad=float(px(8));
        for(std::size_t k=0;k<rows.size();k++){const auto& row=rows[k];const RECT r=rowRects[k];const float y=float(r.top-scroll),h=float(r.bottom-r.top);if(y+h<0||y>bounds[3])continue;++paintedRows;
            if(row.kind=="heading"){fill(0,y+h-1,w,1,theme.line);float x=pad;if(row.toggle>=0){label(row.open?L"":L"",icons,x,y,float(px(14)),h,theme.muted);x+=px(16);}label(wide(row.text),bold,x,y,w-x-pad,h,theme.text);continue;}
            if(row.kind=="message"){label(wide(row.text),text,pad,y,w-2*pad,h,theme.muted);continue;}
            if(!row.label.empty()){
                const float width=row.kind=="toolbar"?float(hits.empty()?bounds[2]:hits.front().second.left):float(std::max(px(70),int(w*.38f)));
                label(wide(row.label),text,pad,y,width-pad-px(4),h,theme.muted);
            }
            for(const auto& c:row.controls){RECT cr{};for(const auto& [i,hr]:hits)if(i==c.i)cr=hr;const float x=float(cr.left),cy=float(cr.top-scroll),cw=float(cr.right-cr.left),ch=float(cr.bottom-cr.top);const auto ink=c.disabled?theme.muted:theme.text;const bool hot=hover==c.i&&!c.disabled;
                if(c.kind=="checkbox"){const float s=float(px(16)),sy=cy+(ch-s)/2;box(x,sy,s,s,c.checked?theme.accent:theme.field,hot?theme.accent:theme.line);if(c.checked)label(L"",icons,x,sy,s,s,theme.text);if(!c.text.empty())label(wide(c.text),text,x+s+px(6),cy,cw-s-px(6),ch,ink);}
                else if(c.kind=="button"){
                    box(x,cy,cw,ch,hot||c.pressed?theme.selection:theme.raised,c.pressed?theme.accent:theme.line);
                    const auto* glyph=buttonGlyph(c.icon);
                    if(glyph)label(glyph,icons,x,cy,cw,ch,ink);
                    else{text->SetTextAlignment(DWRITE_TEXT_ALIGNMENT_CENTER);label(wide(c.text.empty()?c.hint:c.text),text,x+px(4),cy,cw-px(8),ch,ink);text->SetTextAlignment(DWRITE_TEXT_ALIGNMENT_LEADING);}
                }
                else if(c.kind=="range"){const double t=std::clamp((parse(sliding==c.i?slideValue:c.value,c.min)-c.min)/std::max(1e-9,c.max-c.min),0.0,1.0);const float my=cy+ch/2,tx=x+float(t)*cw;fill(x,my-1,cw,2,theme.line);fill(x,my-1,tx-x,2,theme.accent);brush->SetColor(hot||sliding==c.i?theme.text:theme.accent);canvas->FillEllipse(D2D1::Ellipse(D2D1::Point2F(tx,my),float(px(6)),float(px(6))),brush);}
                else if(c.kind=="color"){box(x,cy,cw,ch,theme.field,hot?theme.accent:theme.line);fill(x+px(3),cy+px(3),float(px(20)),ch-px(6),parseColor(c.value));label(wide(c.value),text,x+px(28),cy,cw-px(30),ch,ink);}
                else{box(x,cy,cw,ch,theme.field,hot||editing==c.i?theme.accent:theme.line);std::string shown=c.value;if(c.kind=="select")for(const auto& o:c.options)if(o.first==c.value)shown=o.second;
                    if(editing!=c.i)label(wide(shown.empty()?c.text:shown),text,x+px(6),cy,cw-px(c.kind=="select"?26:10),c.kind=="textarea"?float(px(22)):ch,shown.empty()?theme.muted:ink);if(c.kind=="select")label(L"",icons,x+cw-px(20),cy,float(px(16)),ch,theme.muted);}}}
        if(contentHeight>bounds[3]){const float track=float(bounds[3]),thumb=std::max(float(px(24)),track*track/contentHeight),top=(track-thumb)*scroll/std::max(1,contentHeight-bounds[3]);fill(w-px(4),top,float(px(3)),thumb,theme.line);}
    }
    LRESULT handle(UINT message,WPARAM w,LPARAM l)override{
        const int x=xOf(l),y=yOf(l);
        switch(message){
        case WM_MOUSEMOVE:{if(sliding>=0&&(w&MK_LBUTTON)){const auto* c=find(sliding);if(c){const auto v=rangeValue(*c,x,rectOf(sliding));if(v!=slideValue){slideValue=v;emit({{"event","input"},{"i",sliding},{"value",v},{"revision",revision}});InvalidateRect(window,nullptr,FALSE);}}return 0;}
            const int hit=controlAt(x,y);if(hit!=hover){hideHint();hover=hit;InvalidateRect(window,nullptr,FALSE);TRACKMOUSEEVENT t{sizeof(t),TME_LEAVE|TME_HOVER,window,HOVER_DEFAULT};TrackMouseEvent(&t);}return 0;}
        case WM_MOUSEHOVER:hintAt(x,y);return 0;
        case WM_MOUSELEAVE:hideHint();hover=-1;InvalidateRect(window,nullptr,FALSE);return 0;
        case WM_LBUTTONDOWN:{hideHint();SetFocus(window);emit({{"event","focus-panel"}});const int heading=headingAt(x,y);if(heading>=0){emit({{"event","toggle"},{"i",rows[heading].toggle},{"revision",revision}});return 0;}
            const int i=controlAt(x,y);const auto* c=i>=0?find(i):nullptr;if(!c||c->disabled)return 0;const RECT r=rectOf(i);
            if(c->kind=="text"||c->kind=="number"||c->kind=="textarea")beginEdit(*c,r);
            else if(c->kind=="checkbox")emit({{"event","change"},{"i",i},{"checked",!c->checked},{"revision",revision}});
            else if(c->kind=="select")chooseOption(*c,r);
            else if(c->kind=="color")chooseColor(*c);
            else if(c->kind=="button")emit({{"event","click"},{"i",i},{"revision",revision}});
            else if(c->kind=="range"){sliding=i;slideValue=rangeValue(*c,x,r);SetCapture(window);emit({{"event","input"},{"i",i},{"value",slideValue},{"revision",revision}});InvalidateRect(window,nullptr,FALSE);}
            return 0;}
        case WM_LBUTTONUP:{if(sliding>=0){if(GetCapture()==window)ReleaseCapture();emit({{"event","change"},{"i",sliding},{"value",slideValue},{"revision",revision}});sliding=-1;InvalidateRect(window,nullptr,FALSE);}return 0;}
        case WM_MOUSEWHEEL:{scroll-=int(GET_WHEEL_DELTA_WPARAM(w))*px(30)*3/WHEEL_DELTA;layout();InvalidateRect(window,nullptr,FALSE);return 0;}
        case WM_KEYDOWN:case WM_SYSKEYDOWN:{if(keyName(w).empty())break;forwardKey(message,w);return 0;}
        case WM_CTLCOLOREDIT:{SetTextColor(HDC(w),RGB(int(theme.text.r*255),int(theme.text.g*255),int(theme.text.b*255)));SetBkColor(HDC(w),RGB(int(theme.field.r*255),int(theme.field.g*255),int(theme.field.b*255)));static HBRUSH fieldBrush=nullptr;if(fieldBrush)DeleteObject(fieldBrush);fieldBrush=CreateSolidBrush(RGB(int(theme.field.r*255),int(theme.field.g*255),int(theme.field.b*255)));return LRESULT(fieldBrush);}
        }
        return common(message,w,l);
    }
};
