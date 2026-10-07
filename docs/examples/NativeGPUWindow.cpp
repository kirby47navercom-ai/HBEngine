#include <HBEngine/Render.hpp>
#include <chrono>
#include <thread>
#include <iostream>

#if defined(_WIN32) && !defined(HB_COMPUTE_UNAVAILABLE)
LRESULT CALLBACK gpuWindowProc(HWND window,UINT message,WPARAM w,LPARAM l){
    if(message==WM_CLOSE||(message==WM_KEYDOWN&&w==VK_ESCAPE)){DestroyWindow(window);return 0;}
    return DefWindowProcW(window,message,w,l);
}
int main(){
    const auto instance=GetModuleHandleW(nullptr);WNDCLASSW cls{};cls.lpfnWndProc=gpuWindowProc;cls.hInstance=instance;cls.lpszClassName=L"HBEngineNativeGPUSample";cls.hCursor=LoadCursorW(nullptr,MAKEINTRESOURCEW(32512));
    if(!RegisterClassW(&cls))return 1;
    HWND window=CreateWindowExW(0,cls.lpszClassName,L"HBEngine GPU particles",WS_OVERLAPPEDWINDOW,CW_USEDEFAULT,CW_USEDEFAULT,960,540,nullptr,nullptr,instance,nullptr);
    if(!window){UnregisterClassW(cls.lpszClassName,instance);return 1;}
    try{
        std::vector<hb::gpu::Particle> initial(65537);
        for(std::size_t i=0;i<initial.size();i++){const float x=float(i%257)/256*1.8f-.9f,y=float(i/257)/256*1.8f-.9f;initial[i].position={x,y,.5f};initial[i].velocity={-y*.15f,x*.15f,0};initial[i].lifetime=300;}
        hb::gpu::ParticleEffect effect(initial,960,540,window);effect.style.size=.006f;effect.style.color={.2f,.7f,1,1};effect.style.endColor={1,.3f,.7f,1};effect.style.viewProjection=hb::gpu::orthographic(2,2);
        ShowWindow(window,SW_SHOW);auto previous=std::chrono::steady_clock::now();
        while(IsWindow(window)){
            MSG msg;while(PeekMessageW(&msg,nullptr,0,0,PM_REMOVE)){TranslateMessage(&msg);DispatchMessageW(&msg);}if(!IsWindow(window))break;
            RECT client{};GetClientRect(window,&client);if(client.right<=0||client.bottom<=0){std::this_thread::sleep_for(std::chrono::milliseconds(20));previous=std::chrono::steady_clock::now();continue;}
            effect.resize(client.right,client.bottom);const auto start=std::chrono::steady_clock::now();const float dt=std::min(.05f,std::chrono::duration<float>(start-previous).count());previous=start;
            effect.update(dt);const bool visible=effect.draw({.015f,.025f,.04f,1});
            // Presentation rate stays bounded without reading simulation state back.
            std::this_thread::sleep_until(start+std::chrono::microseconds(visible?8333:50000));
        }
    }catch(const std::exception& error){std::cerr<<error.what()<<'\n';if(IsWindow(window))DestroyWindow(window);UnregisterClassW(cls.lpszClassName,instance);return 1;}
    UnregisterClassW(cls.lpszClassName,instance);return 0;
}
#else
int main(){std::cerr<<"Windows Direct3D11 hardware required\n";return 1;}
#endif
