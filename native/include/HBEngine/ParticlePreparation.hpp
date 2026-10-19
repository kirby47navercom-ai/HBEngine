#pragma once
#include "ShaderBytecodeCompiler.hpp"
namespace hb::gpu {
struct ParticlePreparationInfo {std::array<unsigned,5> stages{};bool enabled=false,requested=false,sorting=false,pending=false,ready=true;std::string error;};
#if defined(_WIN32) && !defined(HB_COMPUTE_UNAVAILABLE)
// This service owns bytecode requests only. Renderer/device adoption stays on
// the calling thread; unused particle and optional sorting stages do no work.
class ParticlePreparation {
    const char* text;
    std::shared_ptr<const std::string> source;
    std::array<std::shared_ptr<detail::ShaderPreparationQueue::Job>,5> jobs;
    std::array<bool,5> adopted{},retried{};
    bool requested=false,sorting=false;
    std::string error;
public:
    using Info=ParticlePreparationInfo;
    static const char* entry(std::size_t stage){return stage==0?"VS":stage==1?"PS":stage==2?"Compact":stage==3?"SortInitial":"SortStep";}
    explicit ParticlePreparation(const char* sourceText):text(sourceText){}
    void request(bool sort=false){requested=true;sorting=sorting||sort;}
    void poll(){
        if(!requested||!error.empty())return;
        for(std::size_t stage=0;stage<(sorting?5u:3u);stage++){
            if(adopted[stage])continue;
            if(!jobs[stage]){if(!source)source=std::make_shared<const std::string>(text);const auto input=source;const bool refresh=retried[stage];const std::string name=entry(stage),target=stage==0?"vs_5_0":stage==1?"ps_5_0":"cs_5_0",label=stage<3?"HBParticleRender":"HBParticleSort",key=label+":"+name+(refresh?":refresh:":":cached:")+*input;
                jobs[stage]=detail::sharedShaderPreparationQueue().submit(key,256+key.size()*2+input->size(),[input,name,target,label,refresh]{return detail::ShaderBytecodeCompiler::create(*input,label.c_str(),name.c_str(),target.c_str(),[](const void*,std::size_t){return S_OK;},refresh).code;});}
            if(jobs[stage]&&jobs[stage]->status.load(std::memory_order_acquire)==detail::ShaderPreparationQueue::Status::failed){error=jobs[stage]->error;break;}
        }
        if(!error.empty()){source.reset();jobs={};}
    }
    Info info()const{
        Info out;out.enabled=true;out.requested=requested;out.sorting=sorting;out.error=error;
        for(std::size_t stage=0;stage<5;stage++){
            if(adopted[stage]){out.stages[stage]=3;continue;}
            if(!requested||(!sorting&&stage>=3))continue;
            out.ready=false;out.stages[stage]=error.empty()?1:4;if(!jobs[stage])continue;
            switch(jobs[stage]->status.load(std::memory_order_acquire)){case detail::ShaderPreparationQueue::Status::compiling:out.stages[stage]=2;break;case detail::ShaderPreparationQueue::Status::ready:out.stages[stage]=3;break;case detail::ShaderPreparationQueue::Status::failed:out.stages[stage]=4;break;default:break;}
        }
        out.pending=error.empty()&&!out.ready;return out;
    }
    const std::vector<unsigned char>* bytecode(std::size_t stage)const{return jobs[stage]&&jobs[stage]->status.load(std::memory_order_acquire)==detail::ShaderPreparationQueue::Status::ready?&jobs[stage]->code:nullptr;}
    void accept(std::size_t stage){adopted[stage]=true;jobs[stage].reset();if(info().ready)source.reset();}
    void reject(std::size_t stage,HRESULT status){jobs[stage].reset();if(!retried[stage]){retried[stage]=true;return;}error="Prepared particle shader creation failed (HRESULT "+std::to_string(static_cast<unsigned long>(status))+")";source.reset();jobs={};}
    void cancelPending(){jobs={};source.reset();requested=sorting=false;retried={};error.clear();}
};
#endif
}
