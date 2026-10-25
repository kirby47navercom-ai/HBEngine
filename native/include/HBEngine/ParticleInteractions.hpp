#pragma once
#include <array>
#include <cmath>
#include <stdexcept>
#include <cstdint>
namespace hb::gpu {
struct ParticleInteraction {
    unsigned mode=0,capacity=256;std::uint64_t generation=0;std::array<float,3> normal{0,1,0};float offset=0,restitution=.5f,friction=0,time=0;bool death=false,collision=false;
    void validate()const{const auto length=std::hypot(normal[0],normal[1],normal[2]);if(mode>2||capacity<1||capacity>4096||!std::isfinite(length)||length<1e-8f||!std::isfinite(time)||!std::isfinite(offset)||!std::isfinite(restitution)||restitution<0||restitution>1||!std::isfinite(friction)||friction<0||friction>1)throw std::runtime_error("Particle interaction settings invalid");}
};
inline constexpr const char* particleInteractionSource=R"(
struct Particle {float4 positionAge;float4 velocityLife;};
RWStructuredBuffer<Particle> particles:register(u0);
cbuffer Step:register(b0){float delta;float3 force;float gravity;float drag;float mode;float bounce;float3 normal;float offset;float friction;uint eventCapacity;float death;float collision;float time;float3 padding;};
#if HB_PARTICLE_EVENTS
RWStructuredBuffer<uint> events:register(u1);
void eventRecord(uint kind,uint index,Particle p){uint slot;InterlockedAdd(events[0],1,slot);if(slot>=eventCapacity)return;uint a=4+slot*12;events[a]=kind;events[a+1]=index;events[a+2]=asuint(p.positionAge.x);events[a+3]=asuint(p.positionAge.y);events[a+4]=asuint(p.positionAge.z);events[a+5]=asuint(p.positionAge.w);events[a+6]=asuint(p.velocityLife.x);events[a+7]=asuint(p.velocityLife.y);events[a+8]=asuint(p.velocityLife.z);events[a+9]=asuint(p.velocityLife.w);events[a+10]=asuint(time);events[a+11]=0;}
#endif
[numthreads(64,1,1)]void Main(uint3 id:SV_DispatchThreadID){uint index=id.x+id.y*(64*65535);uint count,stride;particles.GetDimensions(count,stride);if(index>=count)return;Particle p=particles[index];if(p.positionAge.w>=p.velocityLife.w)return;
float dt=min(delta,p.velocityLife.w-p.positionAge.w);float3 f=force+float3(0,-9.81*gravity,0);p.positionAge.xyz+=p.velocityLife.xyz*dt+f*(dt*dt*.5);p.velocityLife.xyz=(p.velocityLife.xyz+f*dt)*exp(-drag*dt);p.positionAge.w+=delta;
if(mode>0){float distance=dot(p.positionAge.xyz,normal)-offset;if(distance<0){p.positionAge.xyz-=normal*distance;float speed=dot(p.velocityLife.xyz,normal);if(speed<0){if(mode>1)p.positionAge.w=p.velocityLife.w;else p.velocityLife.xyz=(p.velocityLife.xyz-normal*speed)*(1-friction)-normal*speed*bounce;
#if HB_PARTICLE_EVENTS
if(collision>0)eventRecord(2,index,p);
#endif
}}}
#if HB_PARTICLE_EVENTS
if(p.positionAge.w>=p.velocityLife.w&&death>0)eventRecord(1,index,p);
#endif
particles[index]=p;}
)";
}
