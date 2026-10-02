#include <HBEngine/Game.hpp>
#include <cassert>
#include <iostream>
using namespace hb;
static bool near(float a,float b){return std::abs(a-b)<1e-5f;}
int main(){
    assert(near(Math::AddFloat(2,3),5));assert(near(Math::MapRange(.5f,0,1,10,20),15));assert(near(Math::SmoothStep(0,1,.5f),.5f));
    bool rejected=false;try{Math::Divide(1,0);}catch(const std::invalid_argument&){rejected=true;}assert(rejected);
    auto n=VectorMath::NormalizeVector({3,4,0});assert(near(n.x,.6f)&&near(n.y,.8f));assert(near(VectorMath::VectorLength(VectorMath::NormalizeVector({})),0));
    auto v=VectorMath::MoveTowards({0,0,0},{3,0,0},1);assert(near(v.x,1));assert(near(VectorMath::MoveTowards(v,{3,0,0},10).x,3));
    assert(near(VectorMath::VInterpTo({0,0,0},{10,0,0},.1f,2).x,2));assert(near(VectorMath::ReflectVector({1,-1,0},{0,1,0}).y,1));
    Actor actor;Scene::SetPosition(&actor,{1,2,3});Scene::AddOffset(&actor,{2,0,0});assert(near(Scene::GetPosition(&actor).x,3));assert(Scene::MoveActorTowards(&actor,{4,2,3},2,.5f));
    Clock::Reset();auto timer=Timers::SetTimer(1,false,"Opened");AdvanceFrame(.25f);assert(near(Clock::GetGameTime(),.25f));assert(near(Timers::GetTimerRemaining(timer),.75f));
    Timers::PauseTimer(timer);AdvanceFrame(.25f);assert(near(Timers::GetTimerElapsed(timer),.25f));Timers::ResumeTimer(timer);
    Clock::SetPaused(true);AdvanceFrame(1);assert(near(Clock::GetWorldDeltaSeconds(),0));assert(near(Timers::GetTimerElapsed(timer),.25f));Clock::SetPaused(false);AdvanceFrame(.75f);
    assert(!Timers::IsTimerActive(timer));auto events=Timers::TakeEvents();assert(events.size()==1&&events[0]=="Opened");
    auto loop=Timers::SetTimer(.5f,true,"Tick");AdvanceFrame(.75f);assert(near(Timers::GetTimerElapsed(loop),.25f));assert(Timers::TakeEvents().size()==1);Timers::ClearTimer(loop);assert(!Timers::IsTimerActive(loop));
    auto watch=Timers::StartStopwatch("measure");const auto seconds=Timers::StopStopwatch(watch);assert(seconds>=0&&near(Timers::GetStopwatchElapsed(watch),seconds));
    std::cout<<"HBEngine C++ core: math, vectors, actor movement, clock, timer, stopwatch OK\n";
}
