#pragma once
#include "ComputePlatform.hpp"
#if defined(_WIN32) && !defined(HB_COMPUTE_UNAVAILABLE)
// MinGW returns small structs in registers unless asked; D3D12 methods such as
// GetCPUDescriptorHandleForHeapStart use the MSVC hidden-pointer ABI.
#ifndef WIDL_EXPLICIT_AGGREGATE_RETURNS
#define WIDL_EXPLICIT_AGGREGATE_RETURNS
#endif
#include <d3d12.h>
#include <d3d11on12.h>
#include <dxgi1_4.h>
#include <memory>

namespace hb::gpu::detail {
struct D3D12Libraries {
    HMODULE d3d=LoadLibraryExW(L"d3d12.dll",nullptr,LOAD_LIBRARY_SEARCH_SYSTEM32),dxgi=LoadLibraryExW(L"dxgi.dll",nullptr,LOAD_LIBRARY_SEARCH_SYSTEM32);
    ~D3D12Libraries(){if(dxgi)FreeLibrary(dxgi);if(d3d)FreeLibrary(d3d);}
};
inline D3D12Libraries& libraries12(){static D3D12Libraries value;return value;}

// Transitional renderer: real D3D12 device/queue/swapchain, with the existing
// D3D11 shaders and draws submitted by Microsoft's D3D11On12 driver.
struct D3D12Interop {
    Com<ID3D12Device> device;Com<ID3D12CommandQueue> queue;Com<ID3D12Fence> fence;Com<ID3D11On12Device> bridge;Com<IDXGIFactory4> factory;
    HANDLE event=CreateEventW(nullptr,FALSE,FALSE,nullptr);std::uint64_t serial=0;bool software=false;
    D3D12Interop(){if(!event)throw std::runtime_error("Direct3D12 fence event creation failed");}
    ~D3D12Interop(){if(event)CloseHandle(event);}
    void initialize(bool warp,Com<ID3D11Device>& outDevice,Com<ID3D11DeviceContext>& outContext){
        auto& dll=libraries();auto& dll12=libraries12();
        const auto create=dll.symbol<decltype(&D3D12CreateDevice)>(dll12.d3d,"D3D12CreateDevice");const auto createFactory=dll.symbol<decltype(&CreateDXGIFactory2)>(dll12.dxgi,"CreateDXGIFactory2");
        check(createFactory(0,__uuidof(IDXGIFactory4),reinterpret_cast<void**>(&factory.p)),"Direct3D12 DXGI factory");
        Com<IDXGIAdapter> adapter;if(warp)check(factory->EnumWarpAdapter(__uuidof(IDXGIAdapter),reinterpret_cast<void**>(&adapter.p)),"Direct3D12 WARP adapter");
        check(create(adapter.p,D3D_FEATURE_LEVEL_11_0,__uuidof(ID3D12Device),reinterpret_cast<void**>(&device.p)),"Direct3D12 device");
        D3D12_COMMAND_QUEUE_DESC descriptor{};descriptor.Type=D3D12_COMMAND_LIST_TYPE_DIRECT;
        check(device->CreateCommandQueue(&descriptor,__uuidof(ID3D12CommandQueue),reinterpret_cast<void**>(&queue.p)),"Direct3D12 command queue");
        check(device->CreateFence(0,D3D12_FENCE_FLAG_NONE,__uuidof(ID3D12Fence),reinterpret_cast<void**>(&fence.p)),"Direct3D12 completion fence");
        const auto create11=dll.symbol<decltype(&D3D11On12CreateDevice)>(dll.d3d,"D3D11On12CreateDevice");
        IUnknown* queues[]={queue.p};const D3D_FEATURE_LEVEL requested=D3D_FEATURE_LEVEL_11_0;D3D_FEATURE_LEVEL actual{};
        check(create11(device.p,0,&requested,1,queues,1,0,&outDevice.p,&outContext.p,&actual),"Direct3D11On12 device");
        check(outDevice->QueryInterface(__uuidof(ID3D11On12Device),reinterpret_cast<void**>(&bridge.p)),"Direct3D11On12 resource bridge");software=warp;
    }
    void waitIdle(){if(!queue.p)return;const auto next=++serial;check(queue->Signal(fence.p,next),"Direct3D12 completion signal");if(fence->GetCompletedValue()<next){check(fence->SetEventOnCompletion(next,event),"Direct3D12 completion event");if(WaitForSingleObject(event,10000)!=WAIT_OBJECT_0)throw std::runtime_error("Direct3D12 completion timeout");}}
    Com<IDXGISwapChain1> swapchain(HWND window,UINT width,UINT height){
        DXGI_SWAP_CHAIN_DESC1 descriptor{};descriptor.Width=width;descriptor.Height=height;descriptor.Format=DXGI_FORMAT_R8G8B8A8_UNORM;descriptor.SampleDesc.Count=1;descriptor.BufferUsage=DXGI_USAGE_RENDER_TARGET_OUTPUT;descriptor.BufferCount=3;descriptor.SwapEffect=DXGI_SWAP_EFFECT_FLIP_DISCARD;
        Com<IDXGISwapChain1> result;check(factory->CreateSwapChainForHwnd(queue.p,window,&descriptor,nullptr,nullptr,&result.p),"Direct3D12 window swapchain");check(factory->MakeWindowAssociation(window,DXGI_MWA_NO_ALT_ENTER),"Direct3D12 window association");return result;
    }
};
class D3D12SwapBuffers {
    D3D12Interop& gpu;Com<IDXGISwapChain3> swap;
    std::array<Com<ID3D12Resource>,3> native;
    std::array<Com<ID3D11Texture2D>,3> wrapped;
public:
    D3D12SwapBuffers(D3D12Interop& owner,IDXGISwapChain1* chain):gpu(owner){check(chain->QueryInterface(__uuidof(IDXGISwapChain3),reinterpret_cast<void**>(&swap.p)),"Direct3D12 indexed swapchain");}
    ID3D11Texture2D* acquire(){const UINT index=swap->GetCurrentBackBufferIndex();if(index>=wrapped.size())throw std::runtime_error("Direct3D12 swapchain index invalid");if(!wrapped[index].p){check(swap->GetBuffer(index,__uuidof(ID3D12Resource),reinterpret_cast<void**>(&native[index].p)),"Direct3D12 swap buffer");D3D11_RESOURCE_FLAGS flags{};flags.BindFlags=D3D11_BIND_RENDER_TARGET;check(gpu.bridge->CreateWrappedResource(native[index].p,&flags,D3D12_RESOURCE_STATE_COPY_DEST,D3D12_RESOURCE_STATE_PRESENT,__uuidof(ID3D11Texture2D),reinterpret_cast<void**>(&wrapped[index].p)),"Direct3D12 wrapped swap buffer");}ID3D11Resource* resource=wrapped[index].p;gpu.bridge->AcquireWrappedResources(&resource,1);return wrapped[index].p;}
    void release(ID3D11Texture2D* target,ID3D11DeviceContext* context){ID3D11Resource* resource=target;gpu.bridge->ReleaseWrappedResources(&resource,1);context->Flush();}
    void clear(ID3D11DeviceContext* context){for(auto& resource:wrapped)resource={};context->Flush();gpu.waitIdle();for(auto& resource:native)resource={};}
};
}
#endif
