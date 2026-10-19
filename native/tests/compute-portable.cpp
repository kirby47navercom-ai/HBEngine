#include <HBEngine/Compute.hpp>
#include <HBEngine/Render.hpp>
#include <type_traits>
#ifdef _WIN32
#error This check must use a non-Windows target.
#endif
static_assert(!std::is_copy_constructible_v<hb::gpu::KernelPreparation>);
static_assert(std::is_move_constructible_v<hb::gpu::KernelPreparation>);
static_assert(!std::is_copy_constructible_v<hb::gpu::Particles::Preparation>);
static_assert(std::is_move_constructible_v<hb::gpu::Particles::Preparation>);
static_assert(std::is_constructible_v<hb::gpu::ParticleRenderer,hb::gpu::Device&,std::uint32_t,std::uint32_t,void*,bool>);
static_assert(std::is_same_v<decltype(std::declval<const hb::gpu::ParticleRenderer&>().preparationInfo()),hb::gpu::ParticlePreparationInfo>);
int main(){hb::gpu::KernelPreparation pending;pending.cancel();return hb::gpu::Device::available()||pending.ready()?1:0;}
