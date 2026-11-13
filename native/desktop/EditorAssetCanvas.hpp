#pragma once
#include "EditorPanelBase.hpp"
#include <cmath>
#include <limits>

class EditorAssetCanvas final : public EditorPanelBase {
    Json data,rows=Json::array();
    hb::gpu::d3d12::Com<ID2D1Bitmap> frame;
    std::vector<unsigned char> pixels;
    std::string selection,track,clipSelection;
    int key=-1;
    int scroll=0;
    double playhead=0;
    POINT start{};
    bool dragging=false,widget=false,image=false,resizingWidget=false,uv=false;
    unsigned uvButton=0;
    Json curve;
    Json tilemap;
    Json waveform;
    Json atlas;
    std::vector<unsigned char> atlasPixels;
    std::array<long long,2> tileOrigin{};
    static constexpr int cellSize=32;
    bool isometric=false;
    D2D1_POINT_2F tilePoint(long long x,long long y)const{
        const float a=float(x-tileOrigin[0]),b=float(y-tileOrigin[1]);
        return isometric?D2D1::Point2F(bounds[2]*.5f+(a-b)*cellSize*.5f,cellSize+(a+b)*cellSize*.25f)
            :D2D1::Point2F(a*cellSize,b*cellSize);
    }
    Json tileCell(int x,int y)const{
        const double a=isometric?(x-bounds[2]*.5)/(cellSize*.5):double(x)/cellSize;
        const double b=isometric?(y-cellSize)/(cellSize*.25):double(y)/cellSize;
        return {{"x",tileOrigin[0]+static_cast<long long>(std::floor(isometric?(a+b)*.5:a))},
                {"y",tileOrigin[1]+static_cast<long long>(std::floor(isometric?(b-a)*.5:b))}};
    }
    int curveChannel=-1;
    std::set<std::pair<int,int>> selectedCurveKeys;
    std::optional<POINT> curveBoxEnd;
    bool extendCurveBox=false;
    Json handles=Json::array();
    std::string draggedHandle;
    double curveMin=0,curveMax=1;
    static constexpr float gutter=126,heading=32,lane=28;
    float timeX(double t)const{return gutter+float(t/data.value("length",1.0))*std::max(1.f,bounds[2]-gutter-12);}
    double xTime(float x)const{return std::clamp(double(x-gutter)/std::max(1.f,bounds[2]-gutter-12),0.0,1.0)*data.value("length",1.0);}
    float curveY(double value)const{return float(heading+8+(curveMax-value)/(curveMax-curveMin)*std::max(1.f,bounds[3]-heading-24));}
    double curveValue(int y)const{return curveMax-double(y-heading-8)/std::max(1.f,bounds[3]-heading-24)*(curveMax-curveMin);}
    void drawCurve(){
        static const std::array<D2D1_COLOR_F,4> colors{D2D1::ColorF(0xf17b78),D2D1::ColorF(0x75d096),D2D1::ColorF(0x84b4fa),D2D1::ColorF(0xe6c77a)};
        label(wide(curve.at("name")),text,8,0,float(bounds[2]-16),heading,theme.text);
        for(int i=0;i<=4;++i){
            const double value=curveMin+(curveMax-curveMin)*i/4;
            const auto y=curveY(value);
            fill(gutter,y,float(bounds[2]-gutter),1,theme.line);
            wchar_t number[32]{};swprintf(number,32,L"%.3g",value);
            label(number,text,8,y-9,gutter-10,18,theme.muted);
        }
        const auto& samples=curve.at("samples");
        const auto point=[this](const Json& row,int channel){return D2D1::Point2F(timeX(row.at("time")),curveY(row.at("value").at(channel)));};
        for(int channel=0;channel<int(samples.front().at("value").size());++channel){
            brush->SetColor(colors.at(channel));
            for(std::size_t i=1;i<samples.size();++i)canvas->DrawLine(point(samples.at(i-1),channel),point(samples.at(i),channel),brush,1.4f);
            for(const auto& row:curve.at("keys")){
                const bool selected=selectedCurveKeys.count({row.at("index"),channel})!=0;
                brush->SetColor(selected?theme.text:colors.at(channel));
                canvas->FillEllipse(D2D1::Ellipse(point(row,channel),4,4),brush);
            }
        }
        if(curveBoxEnd){
            const auto left=float(std::min(start.x,curveBoxEnd->x)),right=float(std::max(start.x,curveBoxEnd->x));
            const auto top=float(std::min(start.y,curveBoxEnd->y)),bottom=float(std::max(start.y,curveBoxEnd->y));
            auto fillColor=theme.accent;fillColor.a=.15f;
            fill(left,top,right-left,bottom-top,fillColor);
            brush->SetColor(theme.accent);
            canvas->DrawRectangle(D2D1::RectF(left,top,right,bottom),brush);
        }
        if(key>=0&&curveChannel>=0&&std::size_t(key)<curve.at("keys").size()){
            const auto origin=point(curve.at("keys").at(key),curveChannel);
            brush->SetColor(theme.accent);
            for(const auto& handle:handles){
                const auto endpoint=D2D1::Point2F(timeX(handle.at("time")),curveY(handle.at("value")));
                canvas->DrawLine(origin,endpoint,brush,1);
                canvas->DrawRectangle(D2D1::RectF(endpoint.x-4,endpoint.y-4,endpoint.x+4,endpoint.y+4),brush);
            }
        }
    }
    void drawTilemap(){
        const auto [originX,originY]=tileOrigin;
        if(isometric){
            const auto [columns,rows]=tileViewport();
            const long long reach=std::max(columns,rows);
            const long long x0=std::max(0LL,originX-reach),y0=std::max(0LL,originY-reach);
            const long long x1=std::min(tilemap.at("width").get<long long>(),originX+reach);
            const long long y1=std::min(tilemap.at("height").get<long long>(),originY+reach);
            brush->SetColor(theme.line);
            for(auto x=x0;x<=x1;++x)canvas->DrawLine(tilePoint(x,y0),tilePoint(x,y1),brush);
            for(auto y=y0;y<=y1;++y)canvas->DrawLine(tilePoint(x0,y),tilePoint(x1,y),brush);
        }else{
        const int width=int(std::min<long long>(bounds[2]/cellSize+1,tilemap.at("width").get<long long>()-originX));
        const int height=int(std::min<long long>(bounds[3]/cellSize+1,tilemap.at("height").get<long long>()-originY));
        for(int x=0;x<=width;++x)fill(float(x*cellSize),0,1,float(height*cellSize),theme.line);
        for(int y=0;y<=height;++y)fill(0,float(y*cellSize),float(width*cellSize),1,theme.line);
        }
        hb::gpu::d3d12::Com<ID2D1Bitmap> texture;
        if(!atlas.is_null()){
            const auto w=atlas.at("width").get<UINT>(),h=atlas.at("height").get<UINT>();
            const auto properties=D2D1::BitmapProperties(D2D1::PixelFormat(DXGI_FORMAT_B8G8R8A8_UNORM,D2D1_ALPHA_MODE_PREMULTIPLIED),96,96);
            canvas->CreateBitmap(D2D1::SizeU(w,h),atlasPixels.data(),w*4,properties,&texture.p);
        }
        for(const auto& tile:tilemap.at("tiles")){
            const auto point=tilePoint(tile.at("x"),tile.at("y"));
            const float x=point.x-(isometric?cellSize*.5f:0.f),y=point.y-(isometric?cellSize*.5f:0.f);
            if(x+cellSize<0||y+cellSize<0||x>bounds[2]||y>bounds[3])continue;
            const int index=tile.at("index");
            if(texture.p&&index<atlas.at("columns").get<int>()*atlas.at("rows").get<int>()){
                const int columns=atlas.at("columns");
                const float tileWidth=atlas.at("tileWidth"),tileHeight=atlas.at("tileHeight");
                const float tx=(index%columns)*tileWidth,ty=(index/columns)*tileHeight;
                const auto center=D2D1::Point2F(x+cellSize/2.f,y+cellSize/2.f);
                const auto rotation=(tile.value("rotation",0LL)%4)*90;
                canvas->SetTransform(D2D1::Matrix3x2F::Scale(tile.value("flipX",false)?-1.f:1.f,tile.value("flipY",false)?-1.f:1.f,center)
                    *D2D1::Matrix3x2F::Rotation(float(rotation),center));
                canvas->DrawBitmap(texture.p,D2D1::RectF(x,y,x+cellSize,y+cellSize),1.f,D2D1_BITMAP_INTERPOLATION_MODE_NEAREST_NEIGHBOR,D2D1::RectF(tx,ty,tx+tileWidth,ty+tileHeight));
                canvas->SetTransform(D2D1::Matrix3x2F::Identity());
            }else{
                fill(x+1,y+1,cellSize-1,cellSize-1,theme.selection);
                label(std::to_wstring(index),text,x+3,y,cellSize-5,cellSize,theme.text);
            }
        }
    }
    float clipWidth(const Json& clip)const{
        const double begin=clip.at("start"),duration=clip.at("duration");
        return std::max(5.f,timeX(begin+duration)-timeX(begin));
    }
    std::string hitClip(const Json& row,int x)const{
        if(!row.contains("clips"))return {};
        const auto& clips=row.at("clips");
        for(auto clip=clips.rbegin();clip!=clips.rend();++clip){
            const float left=timeX(clip->at("start"));
            if(x>=left-3&&x<=left+clipWidth(*clip)+3)return clip->at("id");
        }
        return {};
    }
    std::array<float,4> frameRect()const{
        const auto w=data.value("width",1),h=data.value("height",1);
        const float scale=std::min(float(bounds[2])/w,float(bounds[3])/h);
        return {(bounds[2]-w*scale)*.5f,(bounds[3]-h*scale)*.5f,w*scale,h*scale};
    }
    void draw()override{
        canvas->Clear(theme.background);
        if(!waveform.is_null()){
            const auto& bins=waveform.at("bins");
            wchar_t duration[32]{};swprintf(duration,32,L"%.2f s",waveform.at("duration").get<double>());
            label(duration,text,8,0,float(bounds[2]-16),heading,theme.text);
            const float middle=(bounds[3]+heading)/2,scale=std::max(1.f,(bounds[3]-heading)*.46f);
            fill(8,middle,float(bounds[2]-16),1,theme.line);
            brush->SetColor(theme.accent);
            for(std::size_t i=0;i<bins.size();++i){
                const float x=8+float(i)*std::max(1,bounds[2]-16)/std::max<std::size_t>(1,bins.size()-1);
                canvas->DrawLine(D2D1::Point2F(x,middle-bins.at(i).at(0).get<float>()*scale),D2D1::Point2F(x,middle-bins.at(i).at(1).get<float>()*scale),brush,1.5f);
            }
            return;
        }
        if(!tilemap.is_null()){drawTilemap();return;}
        if(data.is_null())return;
        if(!curve.is_null()){drawCurve();return;}
        if(widget||image){
            const auto [x,y,w,h]=frameRect();
            fill(x,y,w,h,theme.field);
            if(!pixels.empty()){
                const auto width=data.at("width").get<UINT>(),height=data.at("height").get<UINT>();
                const auto props=D2D1::BitmapProperties(D2D1::PixelFormat(DXGI_FORMAT_B8G8R8A8_UNORM,D2D1_ALPHA_MODE_PREMULTIPLIED),96,96);
                if(SUCCEEDED(canvas->CreateBitmap(D2D1::SizeU(width,height),pixels.data(),width*4,props,&frame.p))){
                    canvas->DrawBitmap(frame.p,D2D1::RectF(x,y,x+w,y+h),1.f,
                        data.value("nearest",false)?D2D1_BITMAP_INTERPOLATION_MODE_NEAREST_NEIGHBOR:D2D1_BITMAP_INTERPOLATION_MODE_LINEAR);
                    frame={};
                }
            }
            const auto item=std::find_if(rows.begin(),rows.end(),[this](const Json& row){return row.at("id")==selection;});
            if(item!=rows.end()){
                const float sx=w/data.at("width").get<float>(),sy=h/data.at("height").get<float>();
                const float left=x+item->at("x").get<float>()*sx,top=y+item->at("y").get<float>()*sy;
                brush->SetColor(theme.accent);
                const float right=left+item->at("w").get<float>()*sx,bottom=top+item->at("h").get<float>()*sy;
                canvas->DrawRectangle(D2D1::RectF(left,top,right,bottom),brush,1.f);
                if(item->value("editable",false))fill(right-4,bottom-4,8,8,theme.accent);
            }
            return;
        }
        for(int i=0;i<=8;++i){
            const double time=data.value("length",1.0)*i/8;
            const float x=timeX(time);
            fill(x,heading,1,float(bounds[3]),theme.line);
        }
        for(std::size_t i=std::min(rows.size(),std::size_t(scroll/lane));i<rows.size();++i){
            const auto& row=rows.at(i);const auto id=row.at("id").get<std::string>();
            const float y=heading+float(i)*lane-scroll;
            if(y>bounds[3])break;
            if(id==track)fill(0,y,float(bounds[2]),lane,theme.selection);
            label(wide(row.at("name")),text,7,y,gutter-14,lane,theme.text);
            const auto& keys=row.at("keys");
            if(row.contains("clips"))for(const auto& clip:row.at("clips")){
                const float x=timeX(clip.at("start")),width=clipWidth(clip);
                fill(x,y+3,width,lane-6,clip.at("id")==clipSelection?theme.accent:theme.raised);
                if(width>=24)label(wide(clip.at("label")),text,x+4,y,width-7,lane,theme.text);
            }
            for(std::size_t k=0;k<keys.size();++k){
                const float x=timeX(keys.at(k).get<double>());
                brush->SetColor(id==track&&int(k)==key?theme.text:theme.accent);
                canvas->FillEllipse(D2D1::Ellipse(D2D1::Point2F(x,y+lane/2),5,5),brush);
            }
        }
        fill(0,0,float(bounds[2]),heading,theme.background);
        for(int i=0;i<=8;++i){
            const double time=data.value("length",1.0)*i/8;
            wchar_t labelText[24]{};swprintf(labelText,24,L"%.2f",time);
            label(labelText,text,timeX(time)+2,0,54,heading,theme.muted);
        }
        fill(timeX(playhead),0,1,float(bounds[3]),theme.accent);
    }
    LRESULT handle(UINT message,WPARAM w,LPARAM l)override{
        if(image&&tilemap.is_null()){
            if(uv&&message==WM_MOUSEWHEEL){emit({{"event","uvZoom"},{"delta",short(HIWORD(w))/120.0}});return 0;}
            if(uv&&(message==WM_LBUTTONDOWN||message==WM_MBUTTONDOWN||message==WM_RBUTTONDOWN)){
                SetFocus(window);SetCapture(window);start={xOf(l),yOf(l)};
                uvButton=message==WM_LBUTTONDOWN?1:message==WM_MBUTTONDOWN?2:3;return 0;
            }
            if(uv&&(message==WM_LBUTTONUP||message==WM_MBUTTONUP||message==WM_RBUTTONUP)&&uvButton){
                const auto button=std::exchange(uvButton,0u);if(GetCapture()==window)ReleaseCapture();
                const auto [x,y,width,height]=frameRect();
                const auto scale=data.at("width").get<double>()/width;
                const auto dx=(xOf(l)-start.x)*scale,dy=(yOf(l)-start.y)*scale;
                if(button==2)emit({{"event","uvPan"},{"dx",dx},{"dy",dy}});
                else if(std::hypot(dx,dy)>3&&button==1)emit({{"event","uvTranslate"},{"dx",dx},{"dy",dy}});
                else emit({{"event","uvPick"},{"point",{(xOf(l)-x)*scale,(yOf(l)-y)*scale}},{"add",(w&MK_CONTROL)!=0},{"island",button==3}});
                return 0;
            }
            if(uv&&message==WM_CAPTURECHANGED){uvButton=0;return 0;}
            if(message==WM_KEYDOWN){forwardKey(message,w);return 0;}
            if(message==WM_LBUTTONDOWN){SetFocus(window);return 0;}
            return common(message,w,l);
        }
        const int x=xOf(l),y=yOf(l);
        if(!tilemap.is_null()){
            if(message==WM_LBUTTONDOWN||message==WM_RBUTTONDOWN){
                SetFocus(window);start={x,y};dragging=true;SetCapture(window);return 0;
            }
            if((message==WM_LBUTTONUP||message==WM_RBUTTONUP)&&dragging){
                dragging=false;if(GetCapture()==window)ReleaseCapture();
                emit({{"event","tilePaint"},{"from",tileCell(start.x,start.y)},{"to",tileCell(x,y)},{"erase",message==WM_RBUTTONUP}});
                return 0;
            }
            if(message==WM_CAPTURECHANGED){dragging=false;return 0;}
            if(message==WM_MOUSEWHEEL){
                emit({{"event","tileScroll"},{"amount",-GET_WHEEL_DELTA_WPARAM(w)/WHEEL_DELTA*5},{"horizontal",(GET_KEYSTATE_WPARAM(w)&MK_SHIFT)!=0}});
                return 0;
            }
            if(message==WM_KEYDOWN){forwardKey(message,w);return 0;}
            return common(message,w,l);
        }
        if(!curve.is_null()){
            if(message==WM_LBUTTONDOWN){
                SetFocus(window);start={x,y};draggedHandle.clear();
                if(!(w&MK_CONTROL)&&selectedCurveKeys.size()<=1)for(const auto& handle:handles){
                    const auto dx=timeX(handle.at("time"))-x,dy=curveY(handle.at("value"))-y;
                    if(dx*dx+dy*dy<64){draggedHandle=handle.at("side");dragging=true;SetCapture(window);return 0;}
                }
                key=curveChannel=-1;
                float nearest=64;
                for(const auto& row:curve.at("keys")){
                    const float dx=timeX(row.at("time"))-x;
                    for(int channel=0;channel<int(row.at("value").size());++channel){
                        const float dy=curveY(row.at("value").at(channel))-y,distance=dx*dx+dy*dy;
                        if(distance<nearest){nearest=distance;key=row.at("index");curveChannel=channel;}
                    }
                }
                if(key<0){
                    if(x>=gutter&&y>=heading){
                        curveBoxEnd=POINT{x,y};extendCurveBox=(w&(MK_CONTROL|MK_SHIFT))!=0;
                        SetCapture(window);InvalidateRect(window,nullptr,FALSE);return 0;
                    }
                    selectedCurveKeys.clear();
                }else{
                    const auto point=std::pair{key,curveChannel};
                    if(w&MK_CONTROL){
                        if(!selectedCurveKeys.erase(point))selectedCurveKeys.insert(point);
                        if(!selectedCurveKeys.empty()){const auto anchor=*selectedCurveKeys.rbegin();key=anchor.first;curveChannel=anchor.second;}
                        else key=curveChannel=-1;
                        emit({{"event","curveSelect"},{"track",curve.at("track")},{"index",key},{"component",curveChannel}});
                        InvalidateRect(window,nullptr,FALSE);return 0;
                    }
                    if(!selectedCurveKeys.count(point)){selectedCurveKeys.clear();selectedCurveKeys.insert(point);}
                }
                dragging=key>=0;
                if(dragging)SetCapture(window);
                emit({{"event","curveSelect"},{"track",curve.at("track")},{"index",key},{"component",curveChannel}});
                InvalidateRect(window,nullptr,FALSE);return 0;
            }
            if(message==WM_MOUSEMOVE&&curveBoxEnd){
                curveBoxEnd=POINT{x,y};InvalidateRect(window,nullptr,FALSE);return 0;
            }
            if(message==WM_LBUTTONUP&&curveBoxEnd){
                curveBoxEnd.reset();if(GetCapture()==window)ReleaseCapture();
                if(!extendCurveBox)selectedCurveKeys.clear();
                if(std::abs(x-start.x)+std::abs(y-start.y)>=3){
                    const int left=std::min<int>(start.x,x),right=std::max<int>(start.x,x);
                    const int top=std::min<int>(start.y,y),bottom=std::max<int>(start.y,y);
                    for(const auto& row:curve.at("keys")){
                        const float at=timeX(row.at("time"));
                        if(at<left||at>right)continue;
                        const auto& values=row.at("value");
                        for(int channel=0;channel<int(values.size());++channel){
                            const float ordinate=curveY(values.at(channel));
                            if(ordinate>=top&&ordinate<=bottom)selectedCurveKeys.insert({row.at("index"),channel});
                        }
                    }
                }
                if(!selectedCurveKeys.empty()){
                    const auto anchor=*selectedCurveKeys.rbegin();
                    key=anchor.first;curveChannel=anchor.second;
                }
                emit({{"event","curveSelect"},{"track",curve.at("track")},{"index",key},{"component",curveChannel}});
                InvalidateRect(window,nullptr,FALSE);return 0;
            }
            if(message==WM_LBUTTONUP&&dragging){
                dragging=false;if(GetCapture()==window)ReleaseCapture();
                if(std::abs(x-start.x)+std::abs(y-start.y)>=3){
                    Json event={{"event",draggedHandle.empty()?"curveMove":"curveHandleMove"},{"track",curve.at("track")},{"index",key},{"component",curveChannel},{"side",draggedHandle},{"time",xTime(float(x))},{"value",curveValue(y)}};
                    if(draggedHandle.empty()&&selectedCurveKeys.size()>1){
                        Json selections=Json::array();
                        for(const auto& [index,channel]:selectedCurveKeys){
                            if(selections.empty()||selections.back().at("index")!=index)selections.push_back({{"index",index},{"channels",Json::array()}});
                            selections.back().at("channels").push_back(channel);
                        }
                        event["selections"]=std::move(selections);
                    }
                    emit(event);
                }
                draggedHandle.clear();
                return 0;
            }
            if(message==WM_CAPTURECHANGED||message==WM_KEYDOWN&&w==VK_ESCAPE&&curveBoxEnd){
                const bool selecting=curveBoxEnd.has_value();
                dragging=false;curveBoxEnd.reset();
                if(selecting){
                    if(!selectedCurveKeys.empty()){const auto anchor=*selectedCurveKeys.rbegin();key=anchor.first;curveChannel=anchor.second;}
                    if(GetCapture()==window)ReleaseCapture();
                    InvalidateRect(window,nullptr,FALSE);
                }
                return 0;
            }
            if(message==WM_KEYDOWN){forwardKey(message,w);return 0;}
            return common(message,w,l);
        }
        switch(message){
        case WM_LBUTTONDOWN:{
            SetFocus(window);start={x,y};
            if(data.is_null())return 0;
            if(widget){
                const auto [ox,oy,dw,dh]=frameRect();
                if(dw<=0||dh<=0)return 0;
                const float px=(x-ox)*data.at("width").get<float>()/dw,py=(y-oy)*data.at("height").get<float>()/dh;
                resizingWidget=false;
                for(const auto& row:rows)if(row.at("id")==selection&&row.value("editable",false)){
                    const auto right=ox+(row.at("x").get<float>()+row.at("w").get<float>())*dw/data.at("width").get<float>();
                    const auto bottom=oy+(row.at("y").get<float>()+row.at("h").get<float>())*dh/data.at("height").get<float>();
                    if(std::abs(x-right)<=7&&std::abs(y-bottom)<=7){resizingWidget=dragging=true;SetCapture(window);return 0;}
                    break;
                }
                selection.clear();
                dragging=false;
                for(auto item=rows.rbegin();item!=rows.rend();++item){
                    const float left=item->at("x"),top=item->at("y");
                    if(px>=left&&py>=top&&px<=left+item->at("w").get<float>()&&py<=top+item->at("h").get<float>()){
                        selection=item->at("id");dragging=item->value("editable",false);break;
                    }
                }
                if(dragging)SetCapture(window);
                emit({{"event","select"},{"id",selection}});
            }else{
                const int row=y>=heading?int((y-heading+scroll)/lane):-1;
                key=-1;clipSelection.clear();track.clear();
                if(row>=0&&row<int(rows.size())){
                    track=rows.at(row).at("id");
                    const auto& keys=rows.at(row).at("keys");
                    for(std::size_t i=0;i<keys.size();++i)if(std::abs(timeX(keys.at(i))-x)<=7){key=int(i);break;}
                    if(key<0)clipSelection=hitClip(rows.at(row),x);
                }
                emit({{"event","timelineSelect"},{"track",track},{"id",clipSelection},{"index",key}});
                if(x>=gutter){playhead=xTime(float(x));emit({{"event","sample"},{"time",playhead}});}
                dragging=key>=0||!clipSelection.empty();if(dragging)SetCapture(window);
            }
            InvalidateRect(window,nullptr,FALSE);return 0;
        }
        case WM_LBUTTONDBLCLK:
            if(!widget&&y>=heading&&x>=gutter){
                const int row=int((y-heading+scroll)/lane);
                if(row<int(rows.size())){
                    track=rows.at(row).at("id");const auto& keys=rows.at(row).at("keys");
                    if(hitClip(rows.at(row),x).empty()&&std::none_of(keys.begin(),keys.end(),[&](const Json& time){return std::abs(timeX(time)-x)<=7;})){
                        const auto type=rows.at(row).at("type").get<std::string>();
                        const bool clips=type=="slot"||type=="notifies"||type=="sections"||type=="notify-state-add"||type=="animation"||type=="audio"||type=="shot"||type=="subsequence";
                        if(type!="notify-state")
                            emit({{"event","edit"},{"action",clips?"clipAdd":"add"},{"track",track},{"type",type},{"time",xTime(float(x))}});
                    }
                }
            }
            return 0;
        case WM_LBUTTONUP:{
            if(!dragging)return 0;
            dragging=false;if(GetCapture()==window)ReleaseCapture();
            if(std::abs(x-start.x)+std::abs(y-start.y)<3)return 0;
            if(widget){
                const auto [ox,oy,dw,dh]=frameRect();
                emit({{"event","edit"},{"action",resizingWidget?"resize":"move"},{"id",selection},{"dx",double(x-start.x)*data.at("width").get<double>()/dw},{"dy",double(y-start.y)*data.at("height").get<double>()/dh}});
            }else if(!clipSelection.empty()){
                for(const auto& row:rows)if(row.at("id")==track&&row.contains("clips"))for(const auto& clip:row.at("clips"))if(clip.at("id")==clipSelection){
                    const double time=std::clamp(clip.at("start").get<double>()+xTime(float(x))-xTime(float(start.x)),0.0,data.at("length").get<double>());
                    emit({{"event","edit"},{"action","clipMove"},{"track",track},{"id",clipSelection},{"time",time}});return 0;
                }
            }else emit({{"event","edit"},{"action","move"},{"track",track},{"index",key},{"time",xTime(float(x))}});
            return 0;
        }
        case WM_CAPTURECHANGED:dragging=false;return 0;
        case WM_MOUSEWHEEL:
            if(!widget){scroll=std::clamp(scroll-int(GET_WHEEL_DELTA_WPARAM(w)/120)*int(lane)*3,0,std::max(0,int(rows.size()*lane+heading)-bounds[3]));InvalidateRect(window,nullptr,FALSE);}
            return 0;
        case WM_KEYDOWN:
            if(w==VK_DELETE){
                if(widget&&!selection.empty())emit({{"event","edit"},{"action","delete"},{"id",selection}});
                else if(!widget&&!clipSelection.empty())emit({{"event","edit"},{"action","clipDelete"},{"track",track},{"id",clipSelection}});
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
        waveform=tilemap=curve=nullptr;widget=image=uv=false;data=std::move(value);rows=data.at("tracks");pixels.clear();key=-1;selectedCurveKeys.clear();
        if(!clipSelection.empty()&&std::none_of(rows.begin(),rows.end(),[this](const Json& row){
            return row.at("id")==track&&row.contains("clips")&&std::any_of(row.at("clips").begin(),row.at("clips").end(),[this](const Json& clip){return clip.at("id")==clipSelection;});
        }))clipSelection.clear();
        playhead=std::min(playhead,data.value("length",1.0));scroll=std::min(scroll,std::max(0,int(rows.size()*lane+heading)-bounds[3]));InvalidateRect(window,nullptr,FALSE);
    }
    void resetTimeline(){key=curveChannel=-1;curveBoxEnd.reset();selectedCurveKeys.clear();handles=Json::array();clipSelection.clear();track.clear();playhead=0;scroll=0;}
    void updateCurve(Json value){
        if(curve.is_null()||curve.at("track")!=value.at("track"))selectedCurveKeys.clear();
        waveform=tilemap=nullptr;widget=image=uv=false;curve=std::move(value);data={{"length",curve.at("length")}};
        rows=Json::array();pixels.clear();
        curveMin=std::numeric_limits<double>::infinity();curveMax=-curveMin;
        for(const auto* values:{&curve.at("samples"),&curve.at("keys")})for(const auto& row:*values)for(const auto& item:row.at("value")){
            const auto number=item.get<double>();curveMin=std::min(curveMin,number);curveMax=std::max(curveMax,number);
        }
        const double padding=std::max(.01,(curveMax-curveMin)*.1);curveMin-=padding;curveMax+=padding;
        InvalidateRect(window,nullptr,FALSE);
    }
    void updateCurveHandles(int index,int channel,Json next){
        key=index;curveChannel=channel;
        if(index>=0&&channel>=0&&selectedCurveKeys.empty())selectedCurveKeys.insert({index,channel});
        handles=selectedCurveKeys.size()<=1?std::move(next):Json::array();InvalidateRect(window,nullptr,FALSE);
    }
    void remapCurveSelection(const Json& indices,int oldIndex,int newIndex){
        std::set<std::pair<int,int>> next;
        for(const auto& [index,channel]:selectedCurveKeys){
            const auto value=indices.value(std::to_string(index),index==oldIndex?newIndex:index);
            if(value>=0)next.insert({value,channel});
        }
        selectedCurveKeys.swap(next);
    }
    void updateTilemap(Json value,std::array<long long,2> origin){
        isometric=value.value("layout",std::string())=="isometric";
        tilemap=std::move(value);tileOrigin=origin;widget=image=uv=false;waveform=curve=data=nullptr;rows=Json::array();pixels.clear();
        InvalidateRect(window,nullptr,FALSE);
    }
    void updateAtlas(Json value,std::vector<unsigned char> bytes){atlas=std::move(value);atlasPixels=std::move(bytes);}
    void updateWaveform(Json value){
        updateImage(nullptr,{});waveform=std::move(value);
    }
    std::array<int,2> tileViewport()const{return {std::max(1,bounds[2]/cellSize+1),std::max(1,bounds[3]/cellSize+1)};}
    void updateWidget(Json value,std::vector<unsigned char> bytes,std::string selected){
        waveform=tilemap=curve=nullptr;widget=true;image=uv=false;data=std::move(value);rows=std::move(data.at("rows"));data.erase("pixels");
        pixels=std::move(bytes);selection=std::move(selected);InvalidateRect(window,nullptr,FALSE);
    }
    void updateImage(Json value,std::vector<unsigned char> bytes){
        waveform=tilemap=curve=nullptr;widget=uv=false;image=true;data=std::move(value);rows=Json::array();pixels=std::move(bytes);
        InvalidateRect(window,nullptr,FALSE);
    }
    void updateUV(Json value,std::vector<unsigned char> bytes){updateImage(std::move(value),std::move(bytes));uv=true;}
    std::array<int,2> canvasSize()const{return {bounds[2],bounds[3]};}
    void layout(int x,int y,int w,int h,bool visible){bounds={x,y,w,h};shown=visible;place();}
    void probe(UINT message,WPARAM w,LPARAM l){SendMessageW(window,message,w,l);}
    void probePaint(){RedrawWindow(window,nullptr,nullptr,RDW_INVALIDATE|RDW_UPDATENOW);paint();}
    void probeAddKey(){SendMessageW(window,WM_LBUTTONDBLCLK,MK_LBUTTON,MAKELPARAM(int(timeX(data.at("length").get<double>()*.25)),int(heading+lane/2)));}
    void probeSelectFirstKey(){
        const int x=int(timeX(rows.at(0).at("keys").at(0))),y=int(heading+lane/2);
        SendMessageW(window,WM_LBUTTONDOWN,MK_LBUTTON,MAKELPARAM(x,y));
        SendMessageW(window,WM_LBUTTONUP,0,MAKELPARAM(x,y));
    }
    void probeCurveDrag(){
        const auto& first=curve.at("keys").front();
        const int x=int(std::lround(timeX(first.at("time")))),y=int(std::lround(curveY(first.at("value").at(0))));
        SendMessageW(window,WM_LBUTTONDOWN,MK_LBUTTON,MAKELPARAM(x,y));
        SendMessageW(window,WM_LBUTTONUP,0,MAKELPARAM(x,y-24));
    }
    void probeCurveHandle(){
        const auto& handle=handles.front();
        const int x=int(std::lround(timeX(handle.at("time")))),y=int(std::lround(curveY(handle.at("value"))));
        SendMessageW(window,WM_LBUTTONDOWN,MK_LBUTTON,MAKELPARAM(x,y));
        SendMessageW(window,WM_LBUTTONUP,0,MAKELPARAM(x+6,y-36));
    }
    void probeCurveGroup(){
        for(int i=0;i<2;++i){
            const auto& row=curve.at("keys").at(i);
            const int x=int(std::lround(timeX(row.at("time")))),y=int(std::lround(curveY(row.at("value").at(0))));
            SendMessageW(window,WM_LBUTTONDOWN,MK_LBUTTON|(i?MK_CONTROL:0),MAKELPARAM(x,y));
            SendMessageW(window,WM_LBUTTONUP,0,MAKELPARAM(x,y));
        }
        const auto& row=curve.at("keys").front();
        const int x=int(std::lround(timeX(row.at("time")))),y=int(std::lround(curveY(row.at("value").at(0))));
        SendMessageW(window,WM_LBUTTONDOWN,MK_LBUTTON,MAKELPARAM(x,y));
        SendMessageW(window,WM_LBUTTONUP,0,MAKELPARAM(x,y-25));
    }
    void probeCurveBox(){
        const int left=int(gutter),top=int(heading),right=bounds[2]-3,bottom=bounds[3]-3;
        SendMessageW(window,WM_LBUTTONDOWN,MK_LBUTTON,MAKELPARAM(left,top));
        SendMessageW(window,WM_MOUSEMOVE,MK_LBUTTON,MAKELPARAM(right,bottom));
        SendMessageW(window,WM_LBUTTONUP,0,MAKELPARAM(right,bottom));
        if(selectedCurveKeys.size()<2)throw std::runtime_error("Native curve selection box");
        probeCurveDrag();
    }
    void probeTileCell(long long x,long long y){
        const auto point=tilePoint(x,y);
        const int cx=int(point.x)+(isometric?0:cellSize/2),cy=int(point.y)+(isometric?cellSize/4:cellSize/2);
        SendMessageW(window,WM_LBUTTONDOWN,MK_LBUTTON,MAKELPARAM(cx,cy));
        SendMessageW(window,WM_LBUTTONUP,0,MAKELPARAM(cx,cy));
    }
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
    void probeResizeWidget(const std::string& id,int dx,int dy){
        const auto row=std::find_if(rows.begin(),rows.end(),[&](const Json& item){return item.at("id")==id;});
        if(row==rows.end())throw std::runtime_error("Widget resize target missing");
        const auto [ox,oy,dw,dh]=frameRect();
        const int x=int(std::lround(ox+(row->at("x").get<float>()+row->at("w").get<float>())*dw/data.at("width").get<float>()));
        const int y=int(std::lround(oy+(row->at("y").get<float>()+row->at("h").get<float>())*dh/data.at("height").get<float>()));
        SendMessageW(window,WM_LBUTTONDOWN,MK_LBUTTON,MAKELPARAM(x,y));
        SendMessageW(window,WM_LBUTTONUP,0,MAKELPARAM(x+dx,y+dy));
    }
    Json inspect()const{return {{"backend",graphicsBackend()},{"paints",paints},{"rows",rows.size()},{"graphicsError",graphicsError},{"shown",shown},{"rect",bounds},{"pixelBytes",pixels.size()}};}
};
