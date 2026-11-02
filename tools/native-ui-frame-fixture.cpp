#define NOMINMAX
#include <windows.h>
#include <vector>
#include <string>
#include <stdexcept>
#include <cstring>
#include <fstream>
#include <iostream>
#include <nlohmann/json.hpp>
#include "NativeWidgetWindow.hpp"

using Json=nlohmann::json;
std::string hex(const std::vector<BYTE>& bytes){
    static constexpr char digits[]="0123456789abcdef";
    std::string text; text.reserve(bytes.size()*2);
    for(auto b:bytes){text+=digits[b>>4];text+=digits[b&15];}
    return text;
}
int main(int argc,char** argv){
    try{
        if(argc!=2)throw std::runtime_error("fixture input");
        std::ifstream input(argv[1]);const auto cases=Json::parse(input);Json results=Json::array();
        std::vector<BYTE> pixels,scratch;
        for(const auto& row:cases){
            bool failed=false;std::string message;
            try{
                const auto& frame=row.at("frame");
                if(frame.value("encoding",std::string())=="zstd-rgba8-premultiplied-xor")
                    NativeWidgetWindow::decodeDelta(frame.at("pixels"),frame.at("width"),frame.at("height"),pixels,scratch);
                else NativeWidgetWindow::decodePixels(frame.at("pixels"),frame.at("width"),frame.at("height"),pixels);
                if(row.contains("capacityLimit")&&pixels.capacity()>row.at("capacityLimit").get<std::size_t>())throw std::runtime_error("retained pixel buffer too large");
                if(row.contains("expected")&&hex(pixels)!=row.at("expected"))throw std::runtime_error("fixture pixel mismatch");
            }catch(const std::exception& error){failed=true;message=error.what();}
            if(failed!=row.value("reject",false))throw std::runtime_error(row.at("name").get<std::string>()+": "+message);
            results.push_back({{"name",row.at("name")},{"rejected",failed}});
        }
        std::cout<<Json{{"passed",true},{"cases",results}}.dump();return 0;
    }catch(const std::exception& error){std::cerr<<error.what();return 1;}
}
