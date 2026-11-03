#define NOMINMAX
#include <windows.h>
#include <objbase.h>
#include <vector>
#include <algorithm>
#include <cstring>
#include <stdexcept>
#include <iostream>
#include <chrono>
#include <cassert>
#include <nlohmann/json.hpp>
#include "../native/desktop/NativeWidgetWindow.hpp"
#include "../native/desktop/NativeUIPipe.hpp"
using Json=nlohmann::json;
int main(int argc,char** argv){
 try{
    assert(argc==3);const std::string mode=argv[2];unsigned errors=0;
    std::vector<BYTE> pixels;NativeWidgetWindow::decodeRaw({1,2,3,4,5,6,7,8},2,1,pixels);assert((pixels==std::vector<BYTE>{3,2,1,4,7,6,5,8}));
    for(const auto dims:std::vector<std::pair<unsigned,unsigned>>{{0,1},{1,0},{7681,1},{1,4321},{2,2}}){try{NativeWidgetWindow::decodeRaw({0,0,0,0},dims.first,dims.second,pixels);assert(false);}catch(const std::exception&){errors++;}}
    std::array<BYTE,40> bytes{};auto put=[&](unsigned at,std::uint32_t value){for(unsigned i=0;i<4;i++)bytes[at+i]=BYTE(value>>(i*8));};put(0,0x49554248);put(4,1);put(8,1);put(16,1);put(24,2);put(28,1);put(32,8);const auto valid=bytes;
    for(const auto change:std::vector<std::pair<unsigned,std::uint32_t>>{{0,0},{4,3},{8,0},{12,0xffffffff},{16,0},{20,0xffffffff},{24,0},{24,7681},{28,0},{28,4321},{32,0},{32,9},{36,1}}){bytes=valid;put(change.first,change.second);NativeUIPipe::Frame frame;try{NativeUIPipe::header(bytes,frame);assert(false);}catch(const std::exception&){errors++;}}
    NativeUIPipe::Frame small;NativeUIPipe::header(valid,small);assert(small.width==2&&small.height==1&&small.pixels.size()==8);
    std::vector<BYTE> patch(24,0);auto patchWord=[&](unsigned at,unsigned value){for(unsigned i=0;i<4;i++)patch[at+i]=BYTE(value>>(i*8));};patchWord(0,1);patchWord(4,1);patchWord(8,1);patchWord(12,1);patchWord(16,1);patch[20]=10;patch[21]=20;patch[22]=30;patch[23]=40;pixels.assign(16,0);NativeWidgetWindow::decodeRawTiles(patch,2,2,pixels);assert(pixels[12]==30&&pixels[13]==20&&pixels[14]==10&&pixels[15]==40);const auto unchanged=pixels;unsigned tileErrors=0;for(unsigned corrupt:{0u,4u,8u,12u,16u}){auto bad=patch;bad[corrupt]=255;try{NativeWidgetWindow::decodeRawTiles(bad,2,2,pixels);assert(false);}catch(const std::exception&){tileErrors++;}assert(pixels==unchanged);}patch.push_back(0);try{NativeWidgetWindow::decodeRawTiles(patch,2,2,pixels);assert(false);}catch(const std::exception&){tileErrors++;}assert(pixels==unchanged&&tileErrors==6);
    NativeUIPipe pipe;const auto name=pipe.start(nullptr,WM_APP+55);pipe.allow(std::stoul(argv[1]));std::cout<<Json{{"pipe",std::string(name.begin(),name.end())},{"validationCases",errors}}.dump()<<std::endl;
    const auto until=std::chrono::steady_clock::now()+std::chrono::seconds(5);unsigned frames=0;
    while(frames<3||mode!="frames"&&!pipe.closed()){pipe.consume([&](const NativeUIPipe::Frame& f){if(f.tiles)NativeWidgetWindow::decodeRawTiles(f.pixels,f.width,f.height,pixels);else NativeWidgetWindow::decodeRaw(f.pixels,f.width,f.height,pixels);std::cout<<Json{{"id",f.id},{"sequence",f.sequence},{"width",f.width},{"height",f.height},{"pixels",pixels}}.dump()<<std::endl;if(f.directAck)pipe.acknowledge(f,mode!="reject",.125,.25,"fixture native UI failure");++frames;});if(std::chrono::steady_clock::now()>until)throw std::runtime_error("fixture frame deadline");Sleep(1);}
    if(mode!="frames")assert(pipe.closed());pipe.stop();std::cout<<Json{{"passed",true},{"frames",frames}}.dump()<<std::endl;return 0;
 }catch(const std::exception& error){std::cerr<<error.what()<<std::endl;return 1;}
}
