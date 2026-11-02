#pragma once
#include "ComputePlatform.hpp"

namespace hb::gpu {
enum class DeviceDriver { Automatic, Hardware, Software };
#if defined(_WIN32) && !defined(HB_COMPUTE_UNAVAILABLE)
namespace detail {
template<class Create>
D3D_DRIVER_TYPE createCompatibleDevice(Create create,DeviceDriver preference,Com<ID3D11Device>& device,Com<ID3D11DeviceContext>& context){
    const D3D_FEATURE_LEVEL requested=D3D_FEATURE_LEVEL_11_0;D3D_FEATURE_LEVEL actual{};
    const auto attempt=[&](D3D_DRIVER_TYPE driver){
        device=Com<ID3D11Device>{};context=Com<ID3D11DeviceContext>{};
        return create(nullptr,driver,nullptr,0,&requested,1,D3D11_SDK_VERSION,&device.p,&actual,&context.p);
    };
    HRESULT hardware=E_FAIL;
    if(preference!=DeviceDriver::Software){hardware=attempt(D3D_DRIVER_TYPE_HARDWARE);if(SUCCEEDED(hardware))return D3D_DRIVER_TYPE_HARDWARE;if(preference==DeviceDriver::Hardware)check(hardware,"Direct3D11 hardware device");}
    const auto software=attempt(D3D_DRIVER_TYPE_WARP);
    if(FAILED(software))throw std::runtime_error("Direct3D11 device creation failed: hardware HRESULT "+std::to_string(static_cast<unsigned long>(hardware))+", WARP HRESULT "+std::to_string(static_cast<unsigned long>(software)));
    return D3D_DRIVER_TYPE_WARP;
}
}
#endif
}
