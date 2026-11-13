#pragma once
#include "EditorPanelBase.hpp"
#include <cmath>

class EditorAssetCanvas final : public EditorPanelBase {
    Json data,rows=Json::array();
    hb::gpu::d3d12::Com<ID2D1Bitmap> frame;
    std::vector<unsigned char> pixels;
    std::string selection,track;
    int key=-1;
    double playhead=0;
    POINT start{};
    bool dragging=false,widget=false;
    static constexpr float gutter=126,heading=32,lane=28;
    float timeX(double t)const{return gutter+float(t/data.value("length",1.0))*std::max(1.f,bounds[2]-gutter-12);}
    double xTime(float x)const{return std::clamp(double(x-gutter)/std::max(1.f,bounds[2]-gutter-12),0.0,1.0)*data.value("length",1.0);}
    std::array<float,4> frameRect()const{
        const auto w=data.value("width",1),h=data.value("height",1);
        const float scale=std::min(float(bounds[2])/w,float(bounds[3])/h);
        return {(bounds[2]-w*scale)*.5f,(bounds[3]-h*scale)*.5f,w*scale,h*scale};
    }
    void draw()override{
        canvas->Clear(theme.background);
        if(data.is_null())return;
        if(widget){
            const auto [x,y,w,h]=frameRect();
            fill(x,y,w,h,theme.field);
            if(!pixels.empty()){
                const auto width=data.at("width").get<UINT>(),height=data.at("height").get<UINT>();
                const auto props=D2D1::BitmapProperties(D2D1::PixelFormat(DXGI_FORMAT_B8G8R8A8_UNORM,D2D1_ALPHA_MODE_PREMULTIPLIED),96,96);
                if(SUCCEEDED(canvas->CreateBitmap(D2D1::SizeU(width,height),pixels.data(),width*4,props,&frame.p))){
                    canvas->DrawBitmap(frame.p,D2D1::RectF(x,y,x+w,y+h));
                    frame={};
                }
            }
            const auto item=std::find_if(rows.begin(),rows.end(),[this](const Json& row){return row.at("id")==selection;});
            if(item!=rows.end()){
                const float sx=w/data.at("width").get<float>(),sy=h/data.at("height").get<float>();
                const float left=x+item->at("x").get<float>()*sx,top=y+item->at("y").get<float>()*sy;
                brush->SetColor(theme.accent);
                canvas->DrawRectangle(D2D1::RectF(left,top,left+item->at("w").get<float>()*sx,top+item->at("h").get<float>()*sy),brush,1.f);
            }
            return;
        }
        for(int i=0;i<=8;++i){
            const double time=data.value("length",1.0)*i/8;
            const float x=timeX(time);
            fill(x,heading,1,float(bounds[3]),theme.line);
            wchar_t labelText[24]{};swprintf(labelText,24,L"%.2f",time);
            label(labelText,text,x+2,0,54,heading,theme.muted);
        }
        for(std::size_t i=0;i<rows.size();++i){
            const auto& row=rows.at(i);const auto id=row.at("id").get<std::string>();
            const float y=heading+float(i)*lane;
            if(y>bounds[3])break;
            if(id==track)fill(0,y,float(bounds[2]),lane,theme.selection);
            label(wide(row.at("name")),text,7,y,gutter-14,lane,theme.text);
            const auto& keys=row.at("keys");
            for(std::size_t k=0;k<keys.size();++k){
                const float x=timeX(keys.at(k).get<double>());
                brush->SetColor(id==track&&int(k)==key?theme.text:theme.accent);
                canvas->FillEllipse(D2D1::Ellipse(D2D1::Point2F(x,y+lane/2),5,5),brush);
            }
        }
        fill(timeX(playhead),0,1,float(bounds[3]),theme.accent);
    }
    LRESULT handle(UINT message,WPARAM w,LPARAM l)override{
        const int x=xOf(l),y=yOf(l);
        switch(message){
        case WM_LBUTTONDOWN:{
            SetFocus(window);start={x,y};
            if(data.is_null())return 0;
            if(widget){
                const auto [ox,oy,dw,dh]=frameRect();
                if(dw<=0||dh<=0)return 0;
                const float px=(x-ox)*data.at("width").get<float>()/dw,py=(y-oy)*data.at("height").get<float>()/dh;
                selection.clear();
                for(auto item=rows.rbegin();item!=rows.rend();++item){
                    const float left=item->at("x"),top=item->at("y");
                    if(px>=left&&py>=top&&px<=left+item->at("w").get<float>()&&py<=top+item->at("h").get<float>()){
                        selection=item->at("id");break;
                    }
                }
                dragging=!selection.empty();if(dragging)SetCapture(window);
                emit({{"event","select"},{"id",selection}});
            }else{
                const int row=y>=heading?int((y-heading)/lane):-1;
                key=-1;
                if(row>=0&&row<int(rows.size())){
                    track=rows.at(row).at("id");
                    const auto& keys=rows.at(row).at("keys");
                    for(std::size_t i=0;i<keys.size();++i)if(std::abs(timeX(keys.at(i))-x)<=7){key=int(i);break;}
                }
                if(x>=gutter){playhead=xTime(float(x));emit({{"event","sample"},{"time",playhead}});}
                dragging=key>=0;if(dragging)SetCapture(window);
            }
            InvalidateRect(window,nullptr,FALSE);return 0;
        }
        case WM_LBUTTONDBLCLK:
            if(!widget&&y>=heading&&x>=gutter){
                const int row=int((y-heading)/lane);
                if(row<int(rows.size())){
                    track=rows.at(row).at("id");const auto& keys=rows.at(row).at("keys");
                    if(std::none_of(keys.begin(),keys.end(),[&](const Json& time){return std::abs(timeX(time)-x)<=7;}))
                        emit({{"event","edit"},{"action","add"},{"track",track},{"time",xTime(float(x))}});
                }
            }
            return 0;
        case WM_LBUTTONUP:{
            if(!dragging)return 0;
            dragging=false;if(GetCapture()==window)ReleaseCapture();
            if(std::abs(x-start.x)+std::abs(y-start.y)<3)return 0;
            if(widget){
                const auto [ox,oy,dw,dh]=frameRect();
                emit({{"event","edit"},{"action","move"},{"id",selection},{"dx",double(x-start.x)*data.at("width").get<double>()/dw},{"dy",double(y-start.y)*data.at("height").get<double>()/dh}});
            }else emit({{"event","edit"},{"action","move"},{"track",track},{"index",key},{"time",xTime(float(x))}});
            return 0;
        }
        case WM_CAPTURECHANGED:dragging=false;return 0;
        case WM_KEYDOWN:
            if(w==VK_DELETE){
                if(widget&&!selection.empty())emit({{"event","edit"},{"action","delete"},{"id",selection}});
                else if(!widget&&key>=0)emit({{"event","edit"},{"action","delete"},{"track",track},{"index",key}});
                return 0;
            }
            forwardKey(message,w);return 0;
        }
        return common(message,w,l);
    }
public:
    void attach(HWND owner,HINSTANCE instance,Post post){EditorPanelBase::attach(owner,instance,std::move(post),L"HBEngine.EditorAssetCanvas","assetCanvas");}
    void updateTimeline(Json value){
        widget=false;data=std::move(value);rows=data.at("tracks");pixels.clear();key=-1;
        playhead=std::min(playhead,data.value("length",1.0));InvalidateRect(window,nullptr,FALSE);
    }
    void updateWidget(Json value,std::vector<unsigned char> bytes,std::string selected){
        widget=true;data=std::move(value);rows=std::move(data.at("rows"));data.erase("pixels");
        pixels=std::move(bytes);selection=std::move(selected);InvalidateRect(window,nullptr,FALSE);
    }
    void layout(int x,int y,int w,int h,bool visible){bounds={x,y,w,h};shown=visible;place();}
    void probe(UINT message,WPARAM w,LPARAM l){SendMessageW(window,message,w,l);}
    void probePaint(){InvalidateRect(window,nullptr,FALSE);UpdateWindow(window);}
    void probeAddKey(){SendMessageW(window,WM_LBUTTONDBLCLK,MK_LBUTTON,MAKELPARAM(int(timeX(data.at("length").get<double>()*.25)),int(heading+lane/2)));}
    void probeMoveWidget(const std::string& id,int dx,int dy){
        const auto row=std::find_if(rows.begin(),rows.end(),[&](const Json& item){return item.at("id")==id;});
        if(row==rows.end())throw std::runtime_error("Widget layout row missing");
        const auto [ox,oy,dw,dh]=frameRect();
        const float sx=dw/data.at("width").get<float>(),sy=dh/data.at("height").get<float>();
        const int x=int(ox+(row->at("x").get<float>()+row->at("w").get<float>()/2)*sx);
        const int y=int(oy+(row->at("y").get<float>()+row->at("h").get<float>()/2)*sy);
        SendMessageW(window,WM_LBUTTONDOWN,MK_LBUTTON,MAKELPARAM(x,y));
        SendMessageW(window,WM_LBUTTONUP,0,MAKELPARAM(x+dx,y+dy));
    }
    Json inspect()const{return {{"backend",graphicsBackend()},{"paints",paints},{"rows",rows.size()}};}
};
