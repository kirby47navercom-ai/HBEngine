#pragma once
#include <wincodec.h>
#include <wrl/client.h>
#include <wincrypt.h>
#include <zstd.h>
#include <chrono>
#include <array>
#include <cstdint>
#if defined(__SSE2__) || defined(_M_X64)
#include <emmintrin.h>
#endif
// A transparent owned Win32 surface. It never takes focus or input from the game.
class NativeWidgetWindow {
public:
    struct PixelRect {unsigned x,y,width,height;std::size_t offset;};
    using Composite=std::function<bool(const std::vector<BYTE>&,unsigned,unsigned,const std::vector<PixelRect>*)>;
    Composite composite;
private:
    HWND window=nullptr;std::vector<BYTE> pixels,scratch;std::uint64_t pixelSequence=0;unsigned width=0,height=0;
    HDC memory=nullptr;HBITMAP image=nullptr;HGDIOBJ previous=nullptr;void* bits=nullptr;unsigned bitmapWidth=0,bitmapHeight=0;
    static std::vector<BYTE> base64(const std::string& encoded){
        DWORD size=0;if(encoded.size()>180*1024*1024||!CryptStringToBinaryA(encoded.data(),DWORD(encoded.size()),CRYPT_STRING_BASE64,nullptr,&size,nullptr,nullptr)||size>128*1024*1024)throw std::runtime_error("UI frame invalid");std::vector<BYTE> bytes(size);if(!CryptStringToBinaryA(encoded.data(),DWORD(encoded.size()),CRYPT_STRING_BASE64,bytes.data(),&size,nullptr,nullptr))throw std::runtime_error("UI frame decode");return bytes;
    }
    static std::vector<BYTE> frameBytes(const std::string& text){
        if(text.empty()||text.size()%4||text.size()>180*1024*1024)throw std::runtime_error("UI pixel base64 size invalid");
        static const auto digit=[](){std::array<int,256> result{};result.fill(-1);const std::string alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";for(unsigned i=0;i<alphabet.size();i++)result[BYTE(alphabet[i])]=int(i);return result;}();
        const auto size=text.size()/4*3-(text.back()=='=')-(text[text.size()-2]=='=');if(size>128*1024*1024)throw std::runtime_error("UI pixel bytes invalid");std::vector<BYTE> bytes(size);std::size_t at=0;
        for(std::size_t i=0;i<text.size();i+=4){const int a=digit[BYTE(text[i])],b=digit[BYTE(text[i+1])],c=digit[BYTE(text[i+2])],d=digit[BYTE(text[i+3])];const bool padC=text[i+2]=='=',padD=text[i+3]=='=';
            if(a<0||b<0||(!padC&&c<0)||(!padD&&d<0)||(padC&&!padD)||((padC||padD)&&i+4!=text.size())||(padC&&(b&15))||(padD&&!padC&&(c&3)))throw std::runtime_error("UI pixel base64 encoding invalid");
            bytes[at++]=BYTE((a<<2)|(b>>4));if(!padC)bytes[at++]=BYTE((b<<4)|(c>>2));if(!padD)bytes[at++]=BYTE((c<<6)|d);
        }return bytes;
    }
    void resetBitmap(){if(image){SelectObject(memory,previous);DeleteObject(image);image=nullptr;bits=nullptr;}if(memory){DeleteDC(memory);memory=nullptr;}bitmapWidth=bitmapHeight=0;}
    void present(HWND owner,const std::vector<PixelRect>* dirty=nullptr){
        if(composite&&composite(pixels,width,height,dirty)){
            if(window){DestroyWindow(window);window=nullptr;resetBitmap();}
            return;
        }
        if(!window){window=CreateWindowExW(WS_EX_LAYERED|WS_EX_TRANSPARENT|WS_EX_NOACTIVATE|WS_EX_TOOLWINDOW,L"STATIC",L"",WS_POPUP,0,0,width,height,owner,nullptr,GetModuleHandleW(nullptr),nullptr);if(!window)throw std::runtime_error("Native UI window");}
        if(!image||bitmapWidth!=width||bitmapHeight!=height){dirty=nullptr;resetBitmap();memory=CreateCompatibleDC(nullptr);if(!memory)throw std::runtime_error("Native UI device context");BITMAPINFO bitmap{};bitmap.bmiHeader.biSize=sizeof(BITMAPINFOHEADER);bitmap.bmiHeader.biWidth=width;bitmap.bmiHeader.biHeight=-LONG(height);bitmap.bmiHeader.biPlanes=1;bitmap.bmiHeader.biBitCount=32;bitmap.bmiHeader.biCompression=BI_RGB;image=CreateDIBSection(memory,&bitmap,DIB_RGB_COLORS,&bits,nullptr,0);if(!image){resetBitmap();throw std::runtime_error("Native UI bitmap");}previous=SelectObject(memory,image);bitmapWidth=width;bitmapHeight=height;}
        if(dirty){for(const auto& rect:*dirty)for(unsigned row=0;row<rect.height;row++){const auto at=(std::size_t(rect.y+row)*width+rect.x)*4;std::memcpy(static_cast<BYTE*>(bits)+at,pixels.data()+at,std::size_t(rect.width)*4);}}else std::memcpy(bits,pixels.data(),pixels.size());HDC screen=GetDC(nullptr);POINT origin{},position{};ClientToScreen(owner,&position);SIZE extent{LONG(width),LONG(height)};BLENDFUNCTION blend{AC_SRC_OVER,0,255,AC_SRC_ALPHA};const bool ok=UpdateLayeredWindow(window,screen,&position,&extent,memory,&origin,0,&blend,ULW_ALPHA);ReleaseDC(nullptr,screen);if(!ok)throw std::runtime_error("Native UI surface update");place(owner);
    }
public:
    double decodeMS=0,presentMS=0;
    void place(HWND owner){if(!window)return;POINT point{};ClientToScreen(owner,&point);const bool visible=IsWindowVisible(owner)&&!IsIconic(owner);auto previousWindow=GetWindow(owner,GW_HWNDPREV);UINT flags=SWP_NOSIZE|SWP_NOACTIVATE;if(previousWindow==window)flags|=SWP_NOZORDER;if(bool(IsWindowVisible(window))!=visible)flags|=visible?SWP_SHOWWINDOW:SWP_HIDEWINDOW;SetWindowPos(window,previousWindow?previousWindow:HWND_TOP,point.x,point.y,0,0,flags);}
    static void decodePixels(const std::string& encoded,unsigned width,unsigned height,std::vector<BYTE>& pixels){
        if(!width||!height||width>7680||height>4320)throw std::runtime_error("UI dimensions invalid");auto compressed=frameBytes(encoded);const auto required=std::size_t(width)*height*4;if(pixels.capacity()>required*2)std::vector<BYTE>(required).swap(pixels);else pixels.resize(required);const auto length=ZSTD_decompress(pixels.data(),pixels.size(),compressed.data(),compressed.size());if(ZSTD_isError(length)||length!=pixels.size())throw std::runtime_error("Native UI pixel decode");for(std::size_t at=0;at<pixels.size();at+=4)std::swap(pixels[at],pixels[at+2]);
    }
    static void decodeDelta(const std::string& encoded,unsigned width,unsigned height,std::vector<BYTE>& pixels,std::vector<BYTE>& scratch){
        if(!width||!height||width>7680||height>4320||pixels.size()!=std::size_t(width)*height*4)throw std::runtime_error("UI delta dimensions invalid");decodePixels(encoded,width,height,scratch);for(std::size_t i=0;i<pixels.size();i++)pixels[i]^=scratch[i];
    }
    static void decodeRect(const std::string& encoded,unsigned width,unsigned height,unsigned x,unsigned y,unsigned w,unsigned h,std::vector<BYTE>& pixels,std::vector<BYTE>& scratch){
        if(!width||!height||width>7680||height>4320||pixels.size()!=std::size_t(width)*height*4||!w||!h||x>=width||y>=height||w>width-x||h>height-y)throw std::runtime_error("UI rectangle dimensions invalid");
        decodePixels(encoded,w,h,scratch);for(unsigned row=0;row<h;row++)std::memcpy(pixels.data()+(std::size_t(y+row)*width+x)*4,scratch.data()+std::size_t(row)*w*4,std::size_t(w)*4);
    }
    void updateRect(HWND owner,const std::string& encoded,unsigned nextWidth,unsigned nextHeight,std::uint64_t sequence,std::uint64_t baseSequence,unsigned x,unsigned y,unsigned w,unsigned h){
        const auto start=std::chrono::steady_clock::now();if(!sequence||!baseSequence||sequence!=baseSequence+1||pixelSequence!=baseSequence||width!=nextWidth||height!=nextHeight)throw std::runtime_error("UI rectangle base mismatch");
        decodeRect(encoded,nextWidth,nextHeight,x,y,w,h,pixels,scratch);pixelSequence=sequence;const auto decoded=std::chrono::steady_clock::now();present(owner);decodeMS=std::chrono::duration<double,std::milli>(decoded-start).count();presentMS=std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-decoded).count();
    }
    static void copyRaw(const BYTE* source,BYTE* destination,std::size_t size){
        std::size_t i=0;
#if defined(__SSE2__) || defined(_M_X64)
        const auto rbMask=_mm_set1_epi32(0x00ff00ff),keepMask=_mm_set1_epi32(int(0xff00ff00u));
        for(;i+16<=size;i+=16){const auto value=_mm_loadu_si128(reinterpret_cast<const __m128i*>(source+i)),rb=_mm_and_si128(value,rbMask);const auto swapped=_mm_or_si128(_mm_and_si128(value,keepMask),_mm_or_si128(_mm_slli_epi32(rb,16),_mm_srli_epi32(rb,16)));_mm_storeu_si128(reinterpret_cast<__m128i*>(destination+i),swapped);}
#endif
        for(;i<size;i+=4){destination[i]=source[i+2];destination[i+1]=source[i+1];destination[i+2]=source[i];destination[i+3]=source[i+3];}
    }
    static void decodeRaw(const std::vector<BYTE>& source,unsigned width,unsigned height,std::vector<BYTE>& pixels){
        if(!width||!height||width>7680||height>4320||source.size()!=std::size_t(width)*height*4)throw std::runtime_error("Native binary UI dimensions invalid");
        if(pixels.capacity()>source.size()*2)std::vector<BYTE>().swap(pixels);pixels.resize(source.size());copyRaw(source.data(),pixels.data(),source.size());
    }
    static std::vector<PixelRect> decodeRawTiles(const std::vector<BYTE>& source,unsigned width,unsigned height,std::vector<BYTE>& pixels){
        if(!width||!height||width>7680||height>4320||pixels.size()!=std::size_t(width)*height*4||source.size()<4)throw std::runtime_error("Native UI tile dimensions invalid");
        const auto word=[&](std::size_t at){return std::uint32_t(source[at])|(std::uint32_t(source[at+1])<<8)|(std::uint32_t(source[at+2])<<16)|(std::uint32_t(source[at+3])<<24);};const auto count=word(0);if(!count||count>8192)throw std::runtime_error("Native UI tile count invalid");
        std::vector<PixelRect> rects;rects.reserve(count);std::size_t at=4;
        for(unsigned index=0;index<count;index++){if(at>source.size()||source.size()-at<16)throw std::runtime_error("Native UI tile header truncated");PixelRect rect{word(at),word(at+4),word(at+8),word(at+12),at+16};at+=16;if(!rect.width||!rect.height||rect.x>=width||rect.y>=height||rect.width>width-rect.x||rect.height>height-rect.y||std::uint64_t(rect.width)*rect.height*4>source.size()-at)throw std::runtime_error("Native UI tile range invalid");at+=std::size_t(rect.width)*rect.height*4;rects.push_back(rect);}
        if(at!=source.size())throw std::runtime_error("Native UI tile trailing bytes");
        for(const auto& rect:rects)for(unsigned row=0;row<rect.height;row++)copyRaw(source.data()+rect.offset+std::size_t(row)*rect.width*4,pixels.data()+(std::size_t(rect.y+row)*width+rect.x)*4,std::size_t(rect.width)*4);return rects;
    }
    void updateRawTiles(HWND owner,const std::vector<BYTE>& source,unsigned nextWidth,unsigned nextHeight,std::uint64_t sequence){
        const auto start=std::chrono::steady_clock::now();if(sequence<2||pixelSequence!=sequence-1||width!=nextWidth||height!=nextHeight)throw std::runtime_error("Native UI tile base mismatch");const auto dirty=decodeRawTiles(source,nextWidth,nextHeight,pixels);pixelSequence=sequence;const auto decoded=std::chrono::steady_clock::now();present(owner,&dirty);decodeMS=std::chrono::duration<double,std::milli>(decoded-start).count();presentMS=std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-decoded).count();
    }
    void updateRaw(HWND owner,const std::vector<BYTE>& source,unsigned nextWidth,unsigned nextHeight,std::uint64_t sequence){
        const auto start=std::chrono::steady_clock::now();if(!sequence)throw std::runtime_error("Native binary UI sequence invalid");decodeRaw(source,nextWidth,nextHeight,pixels);pixelSequence=sequence;width=nextWidth;height=nextHeight;std::vector<BYTE>().swap(scratch);const auto decoded=std::chrono::steady_clock::now();present(owner);decodeMS=std::chrono::duration<double,std::milli>(decoded-start).count();presentMS=std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-decoded).count();
    }
    void updatePixels(HWND owner,const std::string& encoded,unsigned nextWidth,unsigned nextHeight,std::uint64_t sequence=0,std::uint64_t baseSequence=0,bool delta=false){const auto start=std::chrono::steady_clock::now();if(delta){if(!sequence||!baseSequence||sequence!=baseSequence+1||pixelSequence!=baseSequence||width!=nextWidth||height!=nextHeight)throw std::runtime_error("UI delta base mismatch");decodeDelta(encoded,nextWidth,nextHeight,pixels,scratch);}else{if(width!=nextWidth||height!=nextHeight)std::vector<BYTE>().swap(scratch);decodePixels(encoded,nextWidth,nextHeight,pixels);}pixelSequence=sequence;width=nextWidth;height=nextHeight;const auto decoded=std::chrono::steady_clock::now();present(owner);decodeMS=std::chrono::duration<double,std::milli>(decoded-start).count();presentMS=std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-decoded).count();}
    void update(HWND owner,const std::string& encoded){
        pixelSequence=0;using Microsoft::WRL::ComPtr;auto png=base64(encoded);ComPtr<IWICImagingFactory> factory;ComPtr<IWICStream> stream;ComPtr<IWICBitmapDecoder> decoder;ComPtr<IWICBitmapFrameDecode> frame;ComPtr<IWICFormatConverter> converter;
        auto check=[](HRESULT hr){if(FAILED(hr))throw std::runtime_error("Native UI image conversion");};check(CoCreateInstance(CLSID_WICImagingFactory,nullptr,CLSCTX_INPROC_SERVER,IID_PPV_ARGS(&factory)));check(factory->CreateStream(&stream));check(stream->InitializeFromMemory(png.data(),DWORD(png.size())));check(factory->CreateDecoderFromStream(stream.Get(),nullptr,WICDecodeMetadataCacheOnLoad,&decoder));check(decoder->GetFrame(0,&frame));check(frame->GetSize(&width,&height));if(!width||!height||width>7680||height>4320)throw std::runtime_error("UI dimensions invalid");check(factory->CreateFormatConverter(&converter));check(converter->Initialize(frame.Get(),GUID_WICPixelFormat32bppPBGRA,WICBitmapDitherTypeNone,nullptr,0,WICBitmapPaletteTypeCustom));pixels.resize(std::size_t(width)*height*4);check(converter->CopyPixels(nullptr,width*4,UINT(pixels.size()),pixels.data()));present(owner);
    }
    ~NativeWidgetWindow(){resetBitmap();if(window)DestroyWindow(window);}
};
