#pragma once
#include "EditorPanelBase.hpp"
#include <cmath>
#include <unordered_map>

class EditorGraphPanel final : public EditorPanelBase {
    struct Pin {std::string id;std::wstring label;D2D1_COLOR_F color;};
    struct Node {std::string id;std::wstring title;float x,y;std::vector<Pin> inputs,outputs;};
    struct Endpoint {std::string node,pin;bool output;};
    std::vector<Node> nodes;
    std::unordered_map<std::string,std::size_t> nodeIndex;
    Json edges=Json::array(),comments=Json::array();
    std::optional<Endpoint> pending;
    std::string selected;
    D2D1_POINT_2F pan{36,36},start{},nodeStart{};
    float zoom=1;
    bool panning=false,dragging=false;

    static D2D1_COLOR_F color(const std::string& value){
        return D2D1::ColorF(value.size()==7?std::strtoul(value.c_str()+1,nullptr,16):0xaab9be);
    }
    static std::vector<Pin> pins(const Json& values){
        std::vector<Pin> result;
        for(const auto& pin:values)result.push_back({pin.at("id"),wide(pin.at("label")),color(pin.at("color"))});
        return result;
    }
    static constexpr float width=224,header=30,row=22;
    static float height(const Node& node){return header+row*std::max<std::size_t>(1,std::max(node.inputs.size(),node.outputs.size()))+6;}
    D2D1_POINT_2F point(float x,float y)const{return {pan.x+x*zoom,pan.y+y*zoom};}
    D2D1_POINT_2F pinPoint(const Node& node,bool output,std::size_t i)const{return point(node.x+(output?width-10:10),node.y+header+row*(float(i)+.5f));}
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
            if(x>=at.x&&x<=at.x+width*zoom&&y>=at.y&&y<=at.y+height(*it)*zoom)return &*it;
        }
        return nullptr;
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
        for(const auto& edge:edges){
            const auto a=endpoint(edge.at("from"),true),b=endpoint(edge.at("to"),false);
            if(!a||!b)continue;
            const float bend=std::max(26.f,std::abs(b->x-a->x)*.42f);
            ID2D1PathGeometry* path=nullptr;ID2D1GeometrySink* sink=nullptr;
            if(SUCCEEDED(factory->CreatePathGeometry(&path))){
                if(SUCCEEDED(path->Open(&sink))){
                    sink->BeginFigure(*a,D2D1_FIGURE_BEGIN_HOLLOW);
                    sink->AddBezier(D2D1::BezierSegment({a->x+bend,a->y},{b->x-bend,b->y},*b));
                    sink->EndFigure(D2D1_FIGURE_END_OPEN);sink->Close();sink->Release();canvas->DrawGeometry(path,brush,2.f);
                }
                path->Release();
            }
        }
        for(const auto& node:nodes){
            const auto at=point(node.x,node.y);const float w=width*zoom,h=height(node)*zoom;
            if(at.x+w<0||at.y+h<0||at.x>bounds[2]||at.y>bounds[3])continue;
            box(at.x,at.y,w,h,theme.field,node.id==selected?theme.accent:theme.line);
            fill(at.x+1,at.y+1,w-2,header*zoom,theme.raised);
            label(node.title,bold,at.x+8,at.y,w-16,header*zoom,theme.text);
            for(bool output:{false,true}){
                const auto& list=output?node.outputs:node.inputs;
                for(std::size_t i=0;i<list.size();++i){
                    const auto p=pinPoint(node,output,i);const auto& pin=list[i];
                    const bool active=pending&&pending->node==node.id&&pending->pin==pin.id&&pending->output==output;
                    brush->SetColor(active?theme.text:pin.color);canvas->FillEllipse(D2D1::Ellipse(p,4*zoom,4*zoom),brush);
                    text->SetTextAlignment(output?DWRITE_TEXT_ALIGNMENT_TRAILING:DWRITE_TEXT_ALIGNMENT_LEADING);
                    label(pin.label,text,output?at.x+w*.5f:at.x+19*zoom,p.y-row*zoom/2,w*.5f-19*zoom,row*zoom,theme.text);
                    text->SetTextAlignment(DWRITE_TEXT_ALIGNMENT_LEADING);
                }
            }
        }
    }
    LRESULT handle(UINT message,WPARAM w,LPARAM l)override{
        const float x=float(xOf(l)),y=float(yOf(l));
        switch(message){
        case WM_LBUTTONDOWN:{
            SetFocus(window);auto* node=hit(x,y);
            if(!node){pending.reset();selected.clear();emit({{"event","select"},{"id",""}});InvalidateRect(window,nullptr,FALSE);return 0;}
            selected=node->id;
            emit({{"event","select"},{"id",selected}});
            for(bool output:{false,true}){
                const auto& list=output?node->outputs:node->inputs;
                for(std::size_t i=0;i<list.size();++i){
                    const auto at=pinPoint(*node,output,i);
                    if(std::hypot(x-at.x,y-at.y)>9*zoom)continue;
                    const Endpoint end{node->id,list[i].id,output};
                    if(pending&&pending->output!=output){
                        const auto first=*pending;pending.reset();
                        emit({{"event","edit"},{"action","connect"},{"from",encode(output?end:first)},{"to",encode(output?first:end)}});
                    }else pending=end;
                    InvalidateRect(window,nullptr,FALSE);return 0;
                }
            }
            if(y<point(node->x,node->y).y+header*zoom){start={x,y};nodeStart={node->x,node->y};dragging=true;SetCapture(window);}
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
                    POINT screen{LONG(x),LONG(y)};ClientToScreen(window,&screen);
                    const auto choice=TrackPopupMenu(menu,TPM_RETURNCMD|TPM_NONOTIFY|TPM_RIGHTBUTTON,screen.x,screen.y,0,window,nullptr);
                    DestroyMenu(menu);
                    if(choice==1)emit(event);
                    return 0;
                }
            }
            [[fallthrough]];
        }
        case WM_MBUTTONDOWN:start={x-pan.x,y-pan.y};panning=true;SetCapture(window);return 0;
        case WM_MOUSEMOVE:
            if(panning)pan={x-start.x,y-start.y};
            if(dragging)if(auto* node=find(selected)){node->x=nodeStart.x+(x-start.x)/zoom;node->y=nodeStart.y+(y-start.y)/zoom;}
            if(panning||dragging)InvalidateRect(window,nullptr,FALSE);
            return 0;
        case WM_MBUTTONUP:case WM_RBUTTONUP:panning=false;if(GetCapture()==window)ReleaseCapture();return 0;
        case WM_LBUTTONUP:{
            const bool moved=dragging;dragging=false;if(GetCapture()==window)ReleaseCapture();
            if(moved)if(auto* node=find(selected))if(node->x!=nodeStart.x||node->y!=nodeStart.y)emit({{"event","edit"},{"action","move"},{"id",selected},{"x",node->x},{"y",node->y}});
            return 0;
        }
        case WM_CAPTURECHANGED:
            if(dragging)if(auto* node=find(selected)){node->x=nodeStart.x;node->y=nodeStart.y;}
            dragging=panning=false;InvalidateRect(window,nullptr,FALSE);return 0;
        case WM_MOUSEWHEEL:{
            POINT at{LONG(x),LONG(y)};ScreenToClient(window,&at);
            const float next=std::clamp(zoom*std::pow(1.14f,GET_WHEEL_DELTA_WPARAM(w)/120.f),.3f,2.f);
            pan={at.x-(at.x-pan.x)*next/zoom,at.y-(at.y-pan.y)*next/zoom};zoom=next;InvalidateRect(window,nullptr,FALSE);return 0;
        }
        case WM_KEYDOWN:
            if(w=='C'&&!(GetKeyState(VK_CONTROL)&0x8000)){
                auto event=spawnPosition();event["event"]="comment";event["id"]=selected;emit(event);return 0;
            }
            if(w==VK_DELETE&&!selected.empty()){emit({{"event","edit"},{"action","delete"},{"id",selected}});return 0;}
            if(w==VK_ESCAPE){pending.reset();InvalidateRect(window,nullptr,FALSE);return 0;}
            forwardKey(message,w);return 0;
        }
        return common(message,w,l);
    }
public:
    void attach(HWND parent,HINSTANCE instance,Post post){EditorPanelBase::attach(parent,instance,std::move(post),L"HBEngine.EditorGraphPanel","graph");}
    void update(const Json& model){
        nodes.clear();nodeIndex.clear();
        nodes.reserve(model.at("nodes").size());nodeIndex.reserve(model.at("nodes").size());
        for(const auto& n:model.at("nodes")){
            auto id=n.at("id").get<std::string>();nodeIndex.emplace(id,nodes.size());
            nodes.push_back({std::move(id),wide(n.at("title")),n.at("x"),n.at("y"),pins(n.at("inputs")),pins(n.at("outputs"))});
        }
        edges=model.at("edges");comments=model.at("comments");InvalidateRect(window,nullptr,FALSE);
    }
    void resetView(){selected.clear();pending.reset();pan={36,36};zoom=1;}
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
    void probePaint(){InvalidateRect(window,nullptr,FALSE);UpdateWindow(window);}
    void probeMove(const std::string& id,int dx,int dy){
        const auto* node=find(id);
        if(!node)throw std::runtime_error("Missing graph test node");
        const auto at=point(node->x+16,node->y+12);
        SendMessageW(window,WM_LBUTTONDOWN,MK_LBUTTON,MAKELPARAM(int(at.x),int(at.y)));
        SendMessageW(window,WM_MOUSEMOVE,MK_LBUTTON,MAKELPARAM(int(at.x)+dx,int(at.y)+dy));
        SendMessageW(window,WM_LBUTTONUP,0,MAKELPARAM(int(at.x)+dx,int(at.y)+dy));
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
