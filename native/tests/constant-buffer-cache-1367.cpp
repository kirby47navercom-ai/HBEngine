#include <HBEngine/ConstantBufferCache.hpp>
#include <array>
#include <iostream>
#include <limits>
using hb::gpu::ConstantBufferCache;
int main(){try{using Block=std::array<std::uint32_t,8>;ConstantBufferCache<Block,3> cache;Block value{};for(unsigned slot=0;slot<3;slot++){if(!cache.shouldUpload(slot,value))return 1;cache.commit(slot,value);}for(unsigned i=0;i<3000;i++)if(cache.shouldUpload(i%3,value))return 2;if(cache.uploads()!=3||cache.skips()!=3000)return 3;value[7]=123;if(!cache.shouldUpload(1,value)||!cache.shouldUpload(1,value))return 4;cache.commit(1,value);if(cache.shouldUpload(1,value))return 5;Block zero{};if(cache.shouldUpload(0,zero)||!cache.shouldUpload(0,value))return 6;cache.invalidate();if(!cache.shouldUpload(1,value))return 7;bool rejected=false;try{cache.shouldUpload(3,value);}catch(const std::out_of_range&){rejected=true;}if(!rejected)return 8;rejected=false;try{cache.commit(3,value);}catch(const std::out_of_range&){rejected=true;}if(!rejected)return 9;
 ConstantBufferCache<std::array<float,4>,1> floats;std::array<float,4> scalar{0,1,2,3};floats.commit(0,scalar);scalar[0]=-0.f;if(!floats.shouldUpload(0,scalar))return 10;floats.commit(0,scalar);scalar[3]=std::numeric_limits<float>::quiet_NaN();floats.commit(0,scalar);if(floats.shouldUpload(0,scalar))return 11;std::cout<<"{\"passed\":true,\"hits\":3000,\"warmUploads\":3,\"commitAfterSuccessOnly\":true,\"slotIsolation\":true,\"invalidateAndBounds\":true,\"rawBits\":true}";
}catch(const std::exception& error){std::cerr<<error.what();return 1;}}
