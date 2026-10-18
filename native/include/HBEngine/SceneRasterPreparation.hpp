#pragma once
#include "ScreenEffectsPass.hpp"
#if defined(_WIN32) && !defined(HB_COMPUTE_UNAVAILABLE)
namespace hb::gpu {
// Bytecode jobs contain no device/renderer pointers. All adoption, including
// the vertex input layout, remains on the renderer's owning thread.
class SceneRasterPreparation {
    std::shared_ptr<const std::string> source;
    std::array<std::shared_ptr<detail::ShaderPreparationQueue::Job>,3> jobs;
    std::array<bool,3> adopted{},retried{};
    std::string error;
    static const char* entry(std::size_t stage){return stage==0?"VS":stage==1?"PS":"ShadowPS";}
public:
    struct Info {std::array<unsigned,3> stages{};bool pending=false,ready=false;std::string error;};
    explicit SceneRasterPreparation(std::string text):source(std::make_shared<const std::string>(std::move(text))){}
    void poll(){
        if(!error.empty())return;
        for(std::size_t stage=0;stage<3;stage++){
            if(adopted[stage])continue;
            if(!jobs[stage]){const auto request=source;const bool refresh=retried[stage];const std::string name=entry(stage),target=stage?"ps_5_0":"vs_5_0",key="HBSceneRender:"+name+(refresh?":refresh:":":cached:")+*request;
                jobs[stage]=ScreenEffectsPass::sharedPreparationQueue().submit(key,256+key.size()*2+request->size(),[request,name,target,refresh]{return detail::ShaderBytecodeCompiler::create(*request,"HBSceneRender",name.c_str(),target.c_str(),[](const void*,std::size_t){return S_OK;},refresh).code;});}
            if(jobs[stage]&&jobs[stage]->status.load(std::memory_order_acquire)==detail::ShaderPreparationQueue::Status::failed){error=jobs[stage]->error;break;}
        }
        if(!error.empty()){source.reset();jobs={};}
    }
    Info info()const{
        Info out;out.error=error;out.ready=adopted[0]&&adopted[1]&&adopted[2];out.pending=error.empty()&&!out.ready;
        for(std::size_t i=0;i<3;i++){if(adopted[i]){out.stages[i]=3;continue;}if(!error.empty()){out.stages[i]=4;continue;}out.stages[i]=1;if(!jobs[i])continue;
            switch(jobs[i]->status.load(std::memory_order_acquire)){case detail::ShaderPreparationQueue::Status::compiling:out.stages[i]=2;break;case detail::ShaderPreparationQueue::Status::ready:out.stages[i]=3;break;case detail::ShaderPreparationQueue::Status::failed:out.stages[i]=4;break;default:break;}}
        return out;
    }
    const std::vector<unsigned char>* bytecode(std::size_t stage)const{return jobs[stage]&&jobs[stage]->status.load(std::memory_order_acquire)==detail::ShaderPreparationQueue::Status::ready?&jobs[stage]->code:nullptr;}
    void accept(std::size_t stage){adopted[stage]=true;jobs[stage].reset();if(adopted[0]&&adopted[1]&&adopted[2])source.reset();}
    void reject(std::size_t stage,HRESULT status){jobs[stage].reset();if(!retried[stage]){retried[stage]=true;return;}error="Prepared raster shader creation failed (HRESULT "+std::to_string(static_cast<unsigned long>(status))+")";source.reset();jobs={};}
};
}
#endif
