#pragma once
#include <wincodec.h>
#include <wrl/client.h>
#include <wincrypt.h>
// A transparent owned Win32 surface. It never takes focus or input from the game.
class NativeWidgetWindow {
    HWND window=nullptr;std::vector<BYTE> pixels;unsigned width=0,height=0;
public:
    void place(HWND owner){if(!window)return;POINT point{};ClientToScreen(owner,&point);SetWindowPos(window,HWND_TOP,point.x,point.y,0,0,SWP_NOSIZE|SWP_NOACTIVATE);ShowWindow(window,IsWindowVisible(owner)&&!IsIconic(owner)?SW_SHOWNOACTIVATE:SW_HIDE);}
    void update(HWND owner,const std::string& encoded){
        using Microsoft::WRL::ComPtr;DWORD size=0;if(!CryptStringToBinaryA(encoded.data(),DWORD(encoded.size()),CRYPT_STRING_BASE64,nullptr,&size,nullptr,nullptr)||size>128*1024*1024)throw std::runtime_error("UI PNG invalid");std::vector<BYTE> png(size);if(!CryptStringToBinaryA(encoded.data(),DWORD(encoded.size()),CRYPT_STRING_BASE64,png.data(),&size,nullptr,nullptr))throw std::runtime_error("UI PNG decode");
        ComPtr<IWICImagingFactory> factory;ComPtr<IWICStream> stream;ComPtr<IWICBitmapDecoder> decoder;ComPtr<IWICBitmapFrameDecode> frame;ComPtr<IWICFormatConverter> converter;
        auto check=[](HRESULT hr){if(FAILED(hr))throw std::runtime_error("Native UI image conversion");};check(CoCreateInstance(CLSID_WICImagingFactory,nullptr,CLSCTX_INPROC_SERVER,IID_PPV_ARGS(&factory)));check(factory->CreateStream(&stream));check(stream->InitializeFromMemory(png.data(),size));check(factory->CreateDecoderFromStream(stream.Get(),nullptr,WICDecodeMetadataCacheOnLoad,&decoder));check(decoder->GetFrame(0,&frame));check(frame->GetSize(&width,&height));if(!width||!height||width>7680||height>4320)throw std::runtime_error("UI dimensions invalid");check(factory->CreateFormatConverter(&converter));check(converter->Initialize(frame.Get(),GUID_WICPixelFormat32bppPBGRA,WICBitmapDitherTypeNone,nullptr,0,WICBitmapPaletteTypeCustom));pixels.resize(std::size_t(width)*height*4);check(converter->CopyPixels(nullptr,width*4,UINT(pixels.size()),pixels.data()));
        if(!window){window=CreateWindowExW(WS_EX_LAYERED|WS_EX_TRANSPARENT|WS_EX_NOACTIVATE|WS_EX_TOOLWINDOW,L"STATIC",L"",WS_POPUP,0,0,width,height,owner,nullptr,GetModuleHandleW(nullptr),nullptr);if(!window)throw std::runtime_error("Native UI window");}
        BITMAPINFO bitmap{};bitmap.bmiHeader.biSize=sizeof(BITMAPINFOHEADER);bitmap.bmiHeader.biWidth=width;bitmap.bmiHeader.biHeight=-LONG(height);bitmap.bmiHeader.biPlanes=1;bitmap.bmiHeader.biBitCount=32;bitmap.bmiHeader.biCompression=BI_RGB;void* bits=nullptr;HDC screen=GetDC(nullptr),memory=CreateCompatibleDC(screen);HBITMAP image=CreateDIBSection(memory,&bitmap,DIB_RGB_COLORS,&bits,nullptr,0);if(!image){DeleteDC(memory);ReleaseDC(nullptr,screen);throw std::runtime_error("Native UI bitmap");}std::memcpy(bits,pixels.data(),pixels.size());auto previous=SelectObject(memory,image);POINT origin{},position{};ClientToScreen(owner,&position);SIZE extent{LONG(width),LONG(height)};BLENDFUNCTION blend{AC_SRC_OVER,0,255,AC_SRC_ALPHA};const bool ok=UpdateLayeredWindow(window,screen,&position,&extent,memory,&origin,0,&blend,ULW_ALPHA);SelectObject(memory,previous);DeleteObject(image);DeleteDC(memory);ReleaseDC(nullptr,screen);if(!ok)throw std::runtime_error("Native UI surface update");place(owner);
    }
    ~NativeWidgetWindow(){if(window)DestroyWindow(window);}
};
