#include <HBEngine/Compute.hpp>
#include <HBEngine/Render.hpp>
#ifdef _WIN32
#error This check must use a non-Windows target.
#endif
int main(){return hb::gpu::Device::available()?1:0;}
