#include <HBEngine/Compute.hpp>
#include <HBEngine/Render.hpp>
#include <type_traits>
#ifdef _WIN32
#error This check must use a non-Windows target.
#endif
static_assert(!std::is_copy_constructible_v<hb::gpu::KernelPreparation>);
static_assert(std::is_move_constructible_v<hb::gpu::KernelPreparation>);
int main(){hb::gpu::KernelPreparation pending;pending.cancel();return hb::gpu::Device::available()||pending.ready()?1:0;}
