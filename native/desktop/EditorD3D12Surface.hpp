#pragma once
#include <HBEngine/D3D12Direct.hpp>
#include <d2d1.h>
#include <wincodec.h>

class EditorD3D12Surface {
public:
    struct Graphics {
        std::unique_ptr<hb::gpu::d3d12::Device> device;
    };
private:
    using Swapchain=hb::gpu::d3d12::Swapchain;
    template<class T> using Com=hb::gpu::d3d12::Com<T>;
    std::shared_ptr<Graphics> graphics;
    std::unique_ptr<Swapchain> surface;
    Com<IWICImagingFactory> imaging;
    Com<IWICBitmap> bitmap;
    Com<ID2D1RenderTarget> raster;
    Com<ID2D1SolidColorBrush> brush;
    UINT width=0,height=0;
public:
    explicit EditorD3D12Surface(std::shared_ptr<Graphics> owner):graphics(std::move(owner)){}
    template<class Draw>
    bool paint(HWND window,ID2D1Factory* factory,Draw draw){
        using hb::gpu::d3d12::check;
        RECT client{};GetClientRect(window,&client);
        if(client.right<=0||client.bottom<=0)return false;
        const UINT w=UINT(client.right),h=UINT(client.bottom);
        if(!graphics->device)graphics->device=std::make_unique<hb::gpu::d3d12::Device>(hb::gpu::DeviceDriver::Automatic,false,4u<<20,64);
        auto& device=*graphics->device;
        if(!surface)surface=std::make_unique<Swapchain>(device,window,w,h,DXGI_FORMAT_B8G8R8A8_UNORM);
        if(!imaging.p)check(CoCreateInstance(CLSID_WICImagingFactory,nullptr,CLSCTX_INPROC_SERVER,IID_PPV_ARGS(&imaging.p)),"Editor raster imaging");
        if(!raster.p||width!=w||height!=h){
            if(width&&height)surface->resize(w,h);
            brush={};raster={};bitmap={};
            check(imaging->CreateBitmap(w,h,GUID_WICPixelFormat32bppPBGRA,WICBitmapCacheOnLoad,&bitmap.p),"Editor raster bitmap");
            check(factory->CreateWicBitmapRenderTarget(bitmap.p,D2D1::RenderTargetProperties(D2D1_RENDER_TARGET_TYPE_SOFTWARE,D2D1::PixelFormat(DXGI_FORMAT_B8G8R8A8_UNORM,D2D1_ALPHA_MODE_PREMULTIPLIED),96,96),&raster.p),"Editor raster target");
            check(raster->CreateSolidColorBrush(D2D1::ColorF(0xffffff),&brush.p),"Editor raster brush");
            width=w;height=h;
        }
        raster->BeginDraw();
        try{draw(raster.p,brush.p);}catch(...){raster->EndDraw();throw;}
        check(raster->EndDraw(),"Editor raster drawing");
        Com<IWICBitmapLock> lock;
        WICRect area{0,0,INT(w),INT(h)};
        check(bitmap->Lock(&area,WICBitmapLockRead,&lock.p),"Editor raster lock");
        UINT stride=0,size=0;BYTE* data=nullptr;
        check(lock->GetStride(&stride),"Editor raster stride");
        check(lock->GetDataPointer(&size,&data),"Editor raster pixels");
        device.begin();
        try{
            auto& buffer=surface->acquire();
            device.updateTexture(buffer,0,0,0,w,h,data,w*4,stride);
            surface->finish(buffer);
        }catch(...){device.end();throw;}
        device.end();surface->present(0);
        return true;
    }
    void reset(){surface.reset();width=height=0;brush={};raster={};bitmap={};}
};
