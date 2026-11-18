#pragma once
#include "EditorPanelBase.hpp"
#include <cmath>
#include <unordered_map>
#include <commctrl.h>

class EditorGraphPanel final : public EditorPanelBase {
    bool blueprint=false;
    struct Pin {std::string id;std::wstring label;D2D1_COLOR_F color;std::wstring type;};
    struct Node {std::string id;std::wstring title;float x,y;std::vector<Pin> inputs,outputs;bool breakpoint;std::wstring tip;float w=224;};
    struct Endpoint {std::string node,pin;bool output;};
    std::vector<Node> nodes;
    std::unordered_map<std::string,std::size_t> nodeIndex;
    Json edges=Json::array(),comments=Json::array();
    std::optional<Endpoint> pending,wireStart;
    D2D1_POINT_2F wireCursor{};
    bool wireMoved=false;
    std::string selected;
    D2D1_POINT_2F pan{36,36},start{},nodeStart{};
    float zoom=1;
    bool panning=false,dragging=false,movedContext=false,boxing=false;
    std::set<std::string> extra; // Ctrl+click / box selection besides selected
    D2D1_POINT_2F boxEnd{};std::map<std::string,D2D1_POINT_2F> groupStart;
    HWND tip=nullptr;std::wstring tipText; // hover tooltip: pin "label: type", node header "title — description"
    std::wstring hoverText(float x,float y){
        const auto* node=hit(x,y);if(!node)return {};
        for(bool output:{false,true}){const auto& list=output?node->outputs:node->inputs;for(std::size_t i=0;i<list.size();++i){const auto at=pinPoint(*node,output,i);if(std::hypot(x-at.x,y-at.y)<=9*zoom)return list[i].label+(list[i].type.empty()?L"":L": "+list[i].type);}}
        if(y<point(node->x,node->y).y+header*zoom)return node->title+(node->tip.empty()?L"":L" — "+node->tip);
        return {};
    }
    void showTip(const std::wstring& text){
        if(!tip){tip=CreateWindowExW(WS_EX_TOPMOST,TOOLTIPS_CLASSW,nullptr,WS_POPUP|TTS_ALWAYSTIP|TTS_NOPREFIX,CW_USEDEFAULT,CW_USEDEFAULT,CW_USEDEFAULT,CW_USEDEFAULT,window,nullptr,nullptr,nullptr);if(!tip)return;
            TOOLINFOW info{sizeof(info)};info.uFlags=TTF_SUBCLASS;info.hwnd=window;info.uId=1;info.rect={0,0,32767,32767};info.lpszText=const_cast<wchar_t*>(L"");SendMessageW(tip,TTM_ADDTOOLW,0,LPARAM(&info));SendMessageW(tip,TTM_SETMAXTIPWIDTH,0,420);}
        if(text==tipText)return;tipText=text;TOOLINFOW info{sizeof(info)};info.hwnd=window;info.uId=1;info.lpszText=const_cast<wchar_t*>(tipText.c_str());SendMessageW(tip,TTM_UPDATETIPTEXTW,0,LPARAM(&info));SendMessageW(tip,TTM_ACTIVATE,!tipText.empty(),0);
    }
    // Comment whose title strip (top 24 px) is under (x, y).
    std::optional<std::string> commentAt(float x,float y)const{
        for(auto it=comments.rbegin();it!=comments.rend();++it){const auto& c=*it;if(!c.contains("position")||!c.contains("size"))continue;const auto at=point(c.at("position").value("x",0.f),c.at("position").value("y",0.f));const float w=c.at("size").value("width",0.f)*zoom;
            if(x>=at.x&&x<=at.x+w&&y>=at.y&&y<=at.y+24*zoom)return c.value("id",std::string());}
        return std::nullopt;
    }
    int hoverEdge=-1; // wire under the mouse (drawn thicker; right-click deletes it)
    // Index of the wire whose curve passes within 6 px of (x, y), sampling the same Bezier the wire is drawn with.
    int edgeAt(float x,float y){
        for(std::size_t i=0;i<edges.size();++i){const auto a=endpoint(edges.at(i).at("from"),true),b=endpoint(edges.at(i).at("to"),false);if(!a||!b)continue;
            const float bend=std::max(26.f,std::abs(b->x-a->x)*.42f);const D2D1_POINT_2F p[4]={*a,{a->x+bend,a->y},{b->x-bend,b->y},*b};
            for(int k=0;k<=32;k++){const float t=k/32.f,u=1-t;const float px_=u*u*u*p[0].x+3*u*u*t*p[1].x+3*u*t*t*p[2].x+t*t*t*p[3].x,py_=u*u*u*p[0].y+3*u*u*t*p[1].y+3*u*t*t*p[2].y+t*t*t*p[3].y;if(std::hypot(px_-x,py_-y)<=6)return int(i);}}
        return -1;
    }
    bool chosen(const std::string& id)const{return id==selected||extra.count(id)>0;}
    void announce(){Json ids=Json::array();for(const auto& id:extra)ids.push_back(id);emit({{"event","selectMany"},{"id",selected},{"ids",ids}});}

    static D2D1_COLOR_F color(const std::string& value){
        return D2D1::ColorF(value.size()==7?std::strtoul(value.c_str()+1,nullptr,16):0xaab9be);
    }
    static std::vector<Pin> pins(const Json& values){
        std::vector<Pin> result;
        for(const auto& pin:values)result.push_back({pin.at("id"),wide(pin.at("label")),color(pin.at("color")),wide(pin.value("type",std::string()))});
        return result;
    }
    static constexpr float width=224,header=30,row=22;
    static std::wstring shownLabel(const Pin& p){return p.type==L"exec"&&(p.label==L"실행"||p.label==L"다음"||p.label==L"Exec"||p.label==L"Then")?std::wstring():p.label;}
    static float height(const Node& node){return header+row*std::max<std::size_t>(1,std::max(node.inputs.size(),node.outputs.size()))+6;}
    D2D1_POINT_2F point(float x,float y)const{return {pan.x+x*zoom,pan.y+y*zoom};}
    D2D1_POINT_2F pinPoint(const Node& node,bool output,std::size_t i)const{return point(node.x+(output?node.w-10:10),node.y+header+row*(float(i)+.5f));}
    Node* find(const std::string& id){const auto it=nodeIndex.find(id);return it==nodeIndex.end()?nullptr:&nodes[it->second];}
    std::optional<D2D1_POINT_2F> endpoint(const Json& end,bool output){
        const auto* node=find(end.value("node",std::string()));
        if(!node)return {};
        const auto& list=output?node->outputs:node->inputs;
        for(std::size_t i=0;i<list.size();++i)if(list[i].id==end.value("pin",std::string()))return pinPoint(*node,output,i);
        return {};
    }
    Node* hit(float x,float y){
        for(auto it=nodes.rbegin();it!=nodes.rend();++it){
            const auto at=point(it->x,it->y);
            if(x>=at.x&&x<=at.x+it->w*zoom&&y>=at.y&&y<=at.y+height(*it)*zoom)return &*it;
        }
        return nullptr;
    }
    std::optional<Endpoint> pinHit(const Node& node,float x,float y)const{
        for(bool output:{false,true}){
            const auto& list=output?node.outputs:node.inputs;
            for(std::size_t i=0;i<list.size();++i){
                const auto at=pinPoint(node,output,i);
                if(std::hypot(x-at.x,y-at.y)<=9*zoom)return Endpoint{node.id,list[i].id,output};
            }
        }
        return {};
    }
    void connect(const Endpoint& first,const Endpoint& last){
        Json event={{"event","edit"},{"action","connect"},{"from",encode(first.output?first:last)},{"to",encode(first.output?last:first)}};
        pending.reset();emit(std::move(event));
    }
    static Json encode(const Endpoint& end){return {{"node",end.node},{"pin",end.pin}};}
    void draw()override{
        canvas->Clear(theme.background);
        const float step=24*zoom;
        for(float x=std::fmod(pan.x,step);x<bounds[2];x+=step)fill(x,0,1,float(bounds[3]),theme.line);
        for(float y=std::fmod(pan.y,step);y<bounds[3];y+=step)fill(0,y,float(bounds[2]),1,theme.line);
        for(const auto& comment:comments){
            const auto& pos=comment.at("position");const auto& size=comment.at("size");
            const auto at=point(pos.at("x"),pos.at("y"));
            const float w=size.at("width").get<float>()*zoom,h=size.at("height").get<float>()*zoom;
            box(at.x,at.y,w,h,theme.background,color(comment.value("color",std::string())));
            label(wide(comment.value("text",std::string())),bold,at.x+7,at.y,w-14,24,theme.text);
        }
        brush->SetColor(theme.accent);
        for(std::size_t edgeIndex=0;edgeIndex<edges.size();++edgeIndex){const auto& edge=edges.at(edgeIndex);
            const auto a=endpoint(edge.at("from"),true),b=endpoint(edge.at("to"),false);
            if(!a||!b)continue;
            const float bend=std::max(26.f,std::abs(b->x-a->x)*.42f);
            ID2D1PathGeometry* path=nullptr;ID2D1GeometrySink* sink=nullptr;
            if(SUCCEEDED(factory->CreatePathGeometry(&path))){
                if(SUCCEEDED(path->Open(&sink))){
                    sink->BeginFigure(*a,D2D1_FIGURE_BEGIN_HOLLOW);
                    sink->AddBezier(D2D1::BezierSegment({a->x+bend,a->y},{b->x-bend,b->y},*b));
                    sink->EndFigure(D2D1_FIGURE_END_OPEN);sink->Close();sink->Release();canvas->DrawGeometry(path,brush,int(edgeIndex)==hoverEdge?4.f:2.f);
                }
                path->Release();
            }
        }
        if(wireStart&&wireMoved)if(const auto at=endpoint(encode(*wireStart),wireStart->output))
            canvas->DrawLine(*at,wireCursor,brush,2.f);
        for(const auto& node:nodes){
            const auto at=point(node.x,node.y);const float w=node.w*zoom,h=height(node)*zoom;
            if(at.x+w<0||at.y+h<0||at.x>bounds[2]||at.y>bounds[3])continue;
            box(at.x,at.y,w,h,theme.field,chosen(node.id)?theme.accent:theme.line);
            fill(at.x+1,at.y+1,w-2,header*zoom,theme.raised);
            if(node.breakpoint){brush->SetColor(D2D1::ColorF(0xef6368));canvas->FillEllipse(D2D1::Ellipse({at.x+w-13*zoom,at.y+header*zoom*.5f},5*zoom,5*zoom),brush);}
            label(node.title,bold,at.x+8,at.y,w-16,header*zoom,theme.text);
            for(bool output:{false,true}){
                const auto& list=output?node.outputs:node.inputs;
                for(std::size_t i=0;i<list.size();++i){
                    const auto p=pinPoint(node,output,i);const auto& pin=list[i];
                    const bool active=pending&&pending->node==node.id&&pending->pin==pin.id&&pending->output==output;
                    brush->SetColor(active?theme.text:pin.color);canvas->FillEllipse(D2D1::Ellipse(p,4*zoom,4*zoom),brush);
                    text->SetTextAlignment(output?DWRITE_TEXT_ALIGNMENT_TRAILING:DWRITE_TEXT_ALIGNMENT_LEADING);
                    {const bool alone=(output?node.inputs:node.outputs).empty();const float lw=alone?w-38*zoom:w*.5f-19*zoom;label(shownLabel(pin),text,output?at.x+w-19*zoom-lw:at.x+19*zoom,p.y-row*zoom/2,lw,row*zoom,theme.text);}
                    text->SetTextAlignment(DWRITE_TEXT_ALIGNMENT_LEADING);
                }
            }
        }
        if(boxing){ // marquee
            const float l=std::min(start.x,boxEnd.x),tp=std::min(start.y,boxEnd.y);brush->SetColor(theme.accent);canvas->DrawRectangle(D2D1::RectF(l,tp,l+std::abs(boxEnd.x-start.x),tp+std::abs(boxEnd.y-start.y)),brush,1.f);}
    }
    LRESULT handle(UINT message,WPARAM w,LPARAM l)override{
        const float x=float(xOf(l)),y=float(yOf(l));
        switch(message){
        case WM_LBUTTONDBLCLK:{if(const auto* node=hit(x,y);node&&!pinHit(*node,x,y)){emit({{"event","activate"},{"id",node->id}});return 0;}return 0;}
        case WM_LBUTTONDOWN:{
            SetFocus(window);auto* node=hit(x,y);
            const bool ctrl=(GetKeyState(VK_CONTROL)&0x8000)!=0;
            // Empty space: drag a selection box (Ctrl keeps the current selection).
            if(!node){pending.reset();if(!ctrl){selected.clear();extra.clear();emit({{"event","select"},{"id",""}});announce();}boxing=true;start=boxEnd={x,y};SetCapture(window);InvalidateRect(window,nullptr,FALSE);return 0;}
            // Ctrl+click toggles a node in the selection.
            if(ctrl&&!pinHit(*node,x,y)){
                if(node->id==selected){selected=extra.empty()?std::string():*extra.begin();extra.erase(selected);}else if(extra.erase(node->id)==0){if(selected.empty())selected=node->id;else extra.insert(node->id);}
                emit({{"event","select"},{"id",selected}});announce();InvalidateRect(window,nullptr,FALSE);return 0;}
            if(!chosen(node->id))extra.clear();else if(node->id!=selected){extra.erase(node->id);if(!selected.empty())extra.insert(selected);}
            selected=node->id;
            emit({{"event","select"},{"id",selected}});announce();
            if(const auto end=pinHit(*node,x,y);end&&(GetKeyState(VK_MENU)&0x8000)){emit({{"event","edit"},{"action","disconnect"},{"id",node->id},{"pin",end->pin},{"output",end->output}});return 0;}
            if(const auto end=pinHit(*node,x,y)){
                wireStart=end;start=wireCursor={x,y};wireMoved=false;SetCapture(window);
                InvalidateRect(window,nullptr,FALSE);return 0;
            }
            if(y<point(node->x,node->y).y+header*zoom){start={x,y};nodeStart={node->x,node->y};dragging=true;groupStart.clear();for(const auto& id:extra)if(const auto* n=find(id))groupStart[id]={n->x,n->y};SetCapture(window);}
            InvalidateRect(window,nullptr,FALSE);return 0;
        }
        case WM_RBUTTONDOWN:{
            if(const auto* node=hit(x,y))for(bool output:{false,true}){
                const auto& list=output?node->outputs:node->inputs;
                for(std::size_t i=0;i<list.size();++i){
                    const auto at=pinPoint(*node,output,i);
                    if(std::hypot(x-at.x,y-at.y)>9*zoom)continue;
                    const Json event={{"event","edit"},{"action","disconnect"},{"id",node->id},{"pin",list[i].id},{"output",output}};
                    HMENU menu=CreatePopupMenu();
                    AppendMenuW(menu,MF_STRING,1,L"핀 연결 끊기");
                    if(output&&blueprint)AppendMenuW(menu,MF_STRING,2,L"출력 값 관찰 / 해제");
                    POINT screen{LONG(x),LONG(y)};ClientToScreen(window,&screen);
                    const auto choice=TrackPopupMenu(menu,TPM_RETURNCMD|TPM_NONOTIFY|TPM_RIGHTBUTTON,screen.x,screen.y,0,window,nullptr);
                    DestroyMenu(menu);
                    if(choice==1)emit(event);
                    if(choice==2){auto watch=event;watch["action"]="watch";emit(watch);}
                    return 0;
                }
            }
            if(const auto* node=hit(x,y)){if(!chosen(node->id)){selected=node->id;extra.clear();emit({{"event","select"},{"id",selected}});announce();}POINT screen{LONG(x),LONG(y)};ClientToScreen(window,&screen);emit({{"event","nodeMenu"},{"x",screen.x},{"y",screen.y}});InvalidateRect(window,nullptr,FALSE);return 0;}
            if(const auto comment=commentAt(x,y)){POINT screen{LONG(x),LONG(y)};ClientToScreen(window,&screen);emit({{"event","commentMenu"},{"id",*comment},{"x",screen.x},{"y",screen.y}});return 0;}
            if(!hit(x,y))if(const int e=edgeAt(x,y);e>=0){HMENU menu=CreatePopupMenu();AppendMenuW(menu,MF_STRING,1,L"연결 끊기");POINT screen{LONG(x),LONG(y)};ClientToScreen(window,&screen);
                const auto choice=TrackPopupMenu(hb::editor_english::translateMenu(menu),TPM_RETURNCMD|TPM_NONOTIFY|TPM_RIGHTBUTTON,screen.x,screen.y,0,window,nullptr);DestroyMenu(menu);
                if(choice==1)emit({{"event","edit"},{"action","disconnectEdge"},{"from",edges.at(e).at("from")},{"to",edges.at(e).at("to")}});hoverEdge=-1;return 0;}
            start={x-pan.x,y-pan.y};wireCursor={x,y};movedContext=false;panning=true;SetCapture(window);return 0;
        }
        case WM_MBUTTONDOWN:start={x-pan.x,y-pan.y};panning=true;SetCapture(window);return 0;
        case WM_MOUSEMOVE:
            if(wireStart){wireCursor={x,y};wireMoved=wireMoved||std::hypot(x-start.x,y-start.y)>4;InvalidateRect(window,nullptr,FALSE);return 0;}
            if(panning){
                if((w&MK_RBUTTON)&&std::hypot(x-wireCursor.x,y-wireCursor.y)<=4&&!movedContext)return 0;
                movedContext=true;pan={x-start.x,y-start.y};
            }
            if(boxing){boxEnd={x,y};InvalidateRect(window,nullptr,FALSE);return 0;}
            if(!panning&&!dragging){showTip(hoverText(x,y));const int over=hit(x,y)?-1:edgeAt(x,y);if(over!=hoverEdge){hoverEdge=over;InvalidateRect(window,nullptr,FALSE);}}
            if(dragging)if(auto* node=find(selected)){node->x=nodeStart.x+(x-start.x)/zoom;node->y=nodeStart.y+(y-start.y)/zoom;for(const auto& [id,from]:groupStart)if(auto* n=find(id)){n->x=from.x+(x-start.x)/zoom;n->y=from.y+(y-start.y)/zoom;}}
            if(panning||dragging)InvalidateRect(window,nullptr,FALSE);
            return 0;
        case WM_MBUTTONUP:case WM_RBUTTONUP:{
            const bool choose=message==WM_RBUTTONUP&&panning&&!movedContext;
            panning=false;if(GetCapture()==window)ReleaseCapture();
            if(choose){SetFocus(window);emit({{"event","palette"},{"x",(x-pan.x)/zoom},{"y",(y-pan.y)/zoom}});}
            return 0;
        }
        case WM_LBUTTONUP:{
            if(wireStart){
                const auto first=*wireStart;wireStart.reset();
                if(GetCapture()==window)ReleaseCapture();
                if(wireMoved){
                    pending.reset();
                    if(const auto* node=hit(x,y)){if(const auto last=pinHit(*node,x,y);last&&last->output!=first.output)connect(first,*last);}
                    else emit({{"event","palette"},{"x",(x-pan.x)/zoom},{"y",(y-pan.y)/zoom},{"wire",encode(first)},{"wireOutput",first.output}});
                }else if(pending&&pending->output!=first.output)connect(*pending,first);
                else pending=first;
                InvalidateRect(window,nullptr,FALSE);return 0;
            }
            if(boxing){boxing=false;if(GetCapture()==window)ReleaseCapture();
                const float l=std::min(start.x,boxEnd.x),r=std::max(start.x,boxEnd.x),tp=std::min(start.y,boxEnd.y),b=std::max(start.y,boxEnd.y);
                if(r-l>3||b-tp>3)for(auto& n:nodes){const auto at=point(n.x,n.y);if(at.x<r&&at.x+n.w*zoom>l&&at.y<b&&at.y+height(n)*zoom>tp){if(selected.empty())selected=n.id;else if(n.id!=selected)extra.insert(n.id);}}
                emit({{"event","select"},{"id",selected}});announce();InvalidateRect(window,nullptr,FALSE);return 0;}
            const bool moved=dragging;dragging=false;if(GetCapture()==window)ReleaseCapture();
            if(moved)if(auto* node=find(selected))if(node->x!=nodeStart.x||node->y!=nodeStart.y){
                if(groupStart.empty())emit({{"event","edit"},{"action","move"},{"id",selected},{"x",node->x},{"y",node->y}});
                else{Json rows=Json::array({{{"id",selected},{"x",node->x},{"y",node->y}}});for(const auto& [id,from]:groupStart)if(const auto* n=find(id))rows.push_back({{"id",id},{"x",n->x},{"y",n->y}});emit({{"event","edit"},{"action","moveMany"},{"id",selected},{"value",rows}});}}
            return 0;
        }
        case WM_CAPTURECHANGED:
            if(dragging)if(auto* node=find(selected)){node->x=nodeStart.x;node->y=nodeStart.y;}
            wireStart.reset();dragging=panning=false;InvalidateRect(window,nullptr,FALSE);return 0;
        case WM_MOUSEWHEEL:{
            POINT at{LONG(x),LONG(y)};ScreenToClient(window,&at);
            const float next=std::clamp(zoom*std::pow(1.14f,GET_WHEEL_DELTA_WPARAM(w)/120.f),.3f,2.f);
            pan={at.x-(at.x-pan.x)*next/zoom,at.y-(at.y-pan.y)*next/zoom};zoom=next;InvalidateRect(window,nullptr,FALSE);return 0;
        }
        case WM_KEYDOWN:
            if(w=='C'&&!(GetKeyState(VK_CONTROL)&0x8000)){
                auto event=spawnPosition();event["event"]="comment";event["id"]=selected;emit(event);return 0;
            }
            if(w==VK_F9&&!selected.empty()){emit({{"event","edit"},{"action","breakpoint"},{"id",selected}});return 0;}
            if(w==VK_DELETE&&!selected.empty()){if(extra.empty())emit({{"event","edit"},{"action","delete"},{"id",selected}});else{Json ids=Json::array({selected});for(const auto& id:extra)ids.push_back(id);emit({{"event","edit"},{"action","deleteMany"},{"id",selected},{"ids",ids}});}return 0;}
            if(w=='A'&&(GetKeyState(VK_CONTROL)&0x8000)){selectAll();return 0;}
            if(w=='F'&&!(GetKeyState(VK_CONTROL)&0x8000)){std::vector<std::string> ids;if(!selected.empty())ids.push_back(selected);ids.insert(ids.end(),extra.begin(),extra.end());frame(ids);return 0;}
            if(w==VK_HOME){frame({});return 0;}
            if(w=='Q'&&!selected.empty()){straighten();return 0;}
            if((w=='W'||w=='A'||w=='S'||w=='D')&&(GetKeyState(VK_SHIFT)&0x8000)&&!(GetKeyState(VK_CONTROL)&0x8000)&&!extra.empty()){emit({{"event","align"},{"mode",w=='W'?"top":w=='A'?"left":w=='S'?"bottom":"right"}});return 0;}
            if(w==VK_ESCAPE){pending.reset();if(GetCapture()==window)ReleaseCapture();InvalidateRect(window,nullptr,FALSE);return 0;}
            if(w==VK_SPACE){auto event=spawnPosition();event["event"]="palette";emit(event);return 0;}
            if(w=='F'&&(GetKeyState(VK_CONTROL)&0x8000)){emit({{"event","find"}});return 0;}
            forwardKey(message,w);return 0;
        }
        return common(message,w,l);
    }
public:
    void attach(HWND parent,HINSTANCE instance,Post post){EditorPanelBase::attach(parent,instance,std::move(post),L"HBEngine.EditorGraphPanel","graph");}
    void update(const Json& model){
        blueprint=model.value("kind",std::string())=="blueprint";
        nodes.clear();nodeIndex.clear();
        nodes.reserve(model.at("nodes").size());nodeIndex.reserve(model.at("nodes").size());
        for(const auto& n:model.at("nodes")){
            auto id=n.at("id").get<std::string>();nodeIndex.emplace(id,nodes.size());
            nodes.push_back({std::move(id),wide(n.at("title")),n.at("x"),n.at("y"),pins(n.at("inputs")),pins(n.at("outputs")),n.value("breakpoint",false),wide(n.value("tip",std::string()))});
            {auto& made=nodes.back();const auto span=[](const std::wstring& s){float w=0;for(const wchar_t c:s)w+=c>=0x1100?13.f:7.5f;return w;};float in=0,out=0;for(const auto& p:made.inputs)in=std::max(in,span(shownLabel(p)));for(const auto& p:made.outputs)out=std::max(out,span(shownLabel(p)));
                const float pins=made.inputs.empty()||made.outputs.empty()?std::max(in,out)+40:in+out+60;made.w=std::clamp(std::max(pins,span(made.title)+24),224.f,480.f);}
        }
        edges=model.at("edges");comments=model.at("comments");for(auto it=extra.begin();it!=extra.end();)it=find(*it)?std::next(it):extra.erase(it);InvalidateRect(window,nullptr,FALSE);
    }
    std::vector<std::string> extraIds()const{return {extra.begin(),extra.end()};}
    std::optional<std::string> commentAtPoint(int x,int y)const{return commentAt(float(x),float(y));}
    float nodeWidth(const std::string& id){const auto* n=find(id);return n?n->w:224.f;}
    float nodeHeight(const std::string& id){const auto* n=find(id);return n?height(*n):60.f;}
    int wireAt(int x,int y){return edgeAt(float(x),float(y));}
    std::wstring hoverAt(int x,int y){return hoverText(float(x),float(y));}
    std::optional<POINT> wireMiddle(std::size_t i){if(i>=edges.size())return std::nullopt;const auto a=endpoint(edges.at(i).at("from"),true),b=endpoint(edges.at(i).at("to"),false);if(!a||!b)return std::nullopt;return POINT{LONG((a->x+b->x)/2),LONG((a->y+b->y)/2)};}
    // Acceptance hooks: messages go through the real window procedure; view and pin positions in client pixels.
    void probe(UINT message,WPARAM w,LPARAM l){SendMessageW(window,message,w,l);}
    std::array<float,3> view()const{return {pan.x,pan.y,zoom};}
    std::optional<POINT> pinAt(const std::string& id,const std::string& pin,bool output){const auto* node=find(id);if(!node)return std::nullopt;const auto& list=output?node->outputs:node->inputs;for(std::size_t i=0;i<list.size();++i)if(list[i].id==pin){const auto p=pinPoint(*node,output,i);return POINT{LONG(p.x),LONG(p.y)};}return std::nullopt;}
    std::optional<POINT> headerAt(const std::string& id){const auto* node=find(id);if(!node)return std::nullopt;const auto p=point(node->x,node->y);return POINT{LONG(p.x+node->w*zoom*.5f),LONG(p.y+header*zoom*.5f)};}
    // Fit the given nodes (all when empty) in the panel, zoom 0.25-1.
    void frame(const std::vector<std::string>& ids){
        float l=1e9f,t=1e9f,r=-1e9f,b=-1e9f;for(const auto& n:nodes)if(ids.empty()||std::find(ids.begin(),ids.end(),n.id)!=ids.end()){l=std::min(l,n.x);t=std::min(t,n.y);r=std::max(r,n.x+n.w);b=std::max(b,n.y+height(n));}
        if(l>r||bounds[2]<=0||bounds[3]<=0)return;const float margin=40;zoom=std::clamp(std::min((bounds[2]-2*margin)/(r-l),(bounds[3]-2*margin)/(b-t)),.25f,1.f);
        pan={bounds[2]*.5f-(l+r)*.5f*zoom,bounds[3]*.5f-(t+b)*.5f*zoom};InvalidateRect(window,nullptr,FALSE);
    }
    // Straighten (Q): each selected node moves vertically so its first linked input pin lines up with the source pin.
    void straighten(){
        std::vector<std::string> ids{selected};ids.insert(ids.end(),extra.begin(),extra.end());Json rows=Json::array();
        const auto index=[](const std::vector<Pin>& pins,const std::string& id){for(std::size_t i=0;i<pins.size();++i)if(pins[i].id==id)return int(i);return -1;};
        for(const auto& id:ids){auto* node=find(id);if(!node)continue;for(const auto& e:edges){if(e.at("to").at("node")!=id)continue;const auto* from=find(e.at("from").at("node").get<std::string>());if(!from)continue;
            const int out=index(from->outputs,e.at("from").at("pin").get<std::string>()),in=index(node->inputs,e.at("to").at("pin").get<std::string>());if(out<0||in<0)continue;
            node->y=from->y+row*float(out-in);rows.push_back({{"id",id},{"x",node->x},{"y",node->y}});break;}}
        if(!rows.empty()){emit({{"event","edit"},{"action","moveMany"},{"id",selected},{"value",rows}});InvalidateRect(window,nullptr,FALSE);}
    }
    void selectPair(const std::string& a,const std::string& b){selected=a;extra={b};announce();InvalidateRect(window,nullptr,FALSE);}
    void selectAll(){if(nodes.empty())return;selected=nodes.front().id;extra.clear();for(const auto& n:nodes)if(n.id!=selected)extra.insert(n.id);emit({{"event","select"},{"id",selected}});announce();InvalidateRect(window,nullptr,FALSE);}
    void resetView(){selected.clear();extra.clear();pending.reset();wireStart.reset();pan={36,36};zoom=1;}
    void focusNode(const std::string& id){
        if(const auto* node=find(id)){
            pan={bounds[2]*.5f-(node->x+node->w*.5f)*zoom,bounds[3]*.5f-(node->y+height(*node)*.5f)*zoom};
            selected=id;InvalidateRect(window,nullptr,FALSE);emit({{"event","select"},{"id",id}});
        }
    }
    void layout(int x,int y,int width,int height,bool visible){
        bounds={x,y,width,height};shown=visible;place();
    }
    Json inspect()const{
        auto info=common();
        info["backend"]=graphicsBackend();
        info["graphicsError"]=graphicsError;
        return info;
    }
    Json spawnPosition()const{return {{"x",(bounds[2]*.35f-pan.x)/zoom},{"y",(bounds[3]*.25f-pan.y)/zoom}};}
    void probePaint(){InvalidateRect(window,nullptr,FALSE);SendMessageW(window,WM_PAINT,0,0);}
    void probeMove(const std::string& id,int dx,int dy){
        const auto* node=find(id);
        if(!node)throw std::runtime_error("Missing graph test node");
        const auto at=point(node->x+16,node->y+12);
        SendMessageW(window,WM_LBUTTONDOWN,MK_LBUTTON,MAKELPARAM(int(at.x),int(at.y)));
        SendMessageW(window,WM_MOUSEMOVE,MK_LBUTTON,MAKELPARAM(int(at.x)+dx,int(at.y)+dy));
        SendMessageW(window,WM_LBUTTONUP,0,MAKELPARAM(int(at.x)+dx,int(at.y)+dy));
    }
    void probeFind(){emit({{"event","find"}});}
    void probePalette(int x,int y){
        SendMessageW(window,WM_RBUTTONDOWN,MK_RBUTTON,MAKELPARAM(x,y));
        SendMessageW(window,WM_RBUTTONUP,0,MAKELPARAM(x,y));
    }
    void probeWire(const Json& from,const Json& to){
        const auto a=endpoint(from,true),b=endpoint(to,false);
        if(!a||!b)throw std::runtime_error("Missing graph drag pin");
        SendMessageW(window,WM_LBUTTONDOWN,MK_LBUTTON,MAKELPARAM(int(a->x),int(a->y)));
        SendMessageW(window,WM_MOUSEMOVE,MK_LBUTTON,MAKELPARAM(int(b->x),int(b->y)));
        SendMessageW(window,WM_LBUTTONUP,0,MAKELPARAM(int(b->x),int(b->y)));
    }
    void probeConnect(const Json& from,const Json& to){
        for(bool output:{true,false}){
            const auto at=endpoint(output?from:to,output);
            if(!at)throw std::runtime_error("Missing graph test pin");
            SendMessageW(window,WM_LBUTTONDOWN,MK_LBUTTON,MAKELPARAM(int(at->x),int(at->y)));
            SendMessageW(window,WM_LBUTTONUP,0,MAKELPARAM(int(at->x),int(at->y)));
        }
    }
};
