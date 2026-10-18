#pragma once
#include <atomic>
#include <chrono>
#include <condition_variable>
#include <cstdint>
#include <deque>
#include <functional>
#include <memory>
#include <mutex>
#include <stdexcept>
#include <string>
#include <thread>
#include <vector>

namespace hb::gpu::detail {
// One lazy worker. Callers own handles; abandoning a queued handle cancels its work.
// A compiler already executing finishes safely, but never touches a renderer/device.
class ShaderPreparationQueue {
public:
    enum class Status {queued,compiling,ready,failed,cancelled};
    struct Job {
        std::atomic<Status> status{Status::queued};
        std::vector<unsigned char> code;
        std::string error;
    private:
        friend class ShaderPreparationQueue;
        std::string key;
        std::function<std::vector<unsigned char>()> work;
        std::size_t cost=0;
    };
    struct Info {
        std::size_t queued=0,bytes=0,budget=0;
        std::uint64_t submitted=0,completed=0,cancelled=0,failed=0,deduplicated=0,workersStarted=0;
        bool active=false,worker=false;
    };
private:
    std::mutex mutex;
    std::condition_variable changed;
    std::deque<std::shared_ptr<Job>> queue;
    std::weak_ptr<Job> current;
    std::thread worker;
    Info counters;
    bool stopping=false,running=false;
    std::chrono::milliseconds idle;
    void discard(const std::shared_ptr<Job>& job) {
        counters.bytes-=job->cost;job->work={};job->key.clear();
        ++counters.cancelled;job->status.store(Status::cancelled,std::memory_order_release);
    }
    void collect() {
        for(auto i=queue.begin();i!=queue.end();){
            if(i->use_count()==1){discard(*i);i=queue.erase(i);}else ++i;
        }
    }
    void run() {
        std::unique_lock<std::mutex> lock(mutex);
        for(;;){
            collect();
            if(stopping){for(auto& job:queue)discard(job);queue.clear();running=false;return;}
            if(queue.empty()){
                if(!changed.wait_for(lock,idle,[&]{return stopping||!queue.empty();})){running=false;return;}
                continue;
            }
            auto job=std::move(queue.front());queue.pop_front();current=job;
            job->status.store(Status::compiling,std::memory_order_release);
            lock.unlock();
            try {job->code=job->work();}
            catch(const std::exception& e){job->error=std::string(e.what()).substr(0,4096);}
            catch(...){job->error="Shader preparation failed";}
            lock.lock();
            counters.bytes-=job->cost;job->work={};job->key.clear();current.reset();
            if(job->error.empty()){++counters.completed;job->status.store(Status::ready,std::memory_order_release);}
            else {++counters.failed;job->status.store(Status::failed,std::memory_order_release);}
        }
    }
public:
    explicit ShaderPreparationQueue(std::size_t budget=8*1024*1024,
                                    std::chrono::milliseconds idleTime=std::chrono::milliseconds(1000)):idle(idleTime) {
        if(!budget||idle.count()<=0)throw std::runtime_error("Shader preparation budget/idle invalid");
        counters.budget=budget;
    }
    ShaderPreparationQueue(const ShaderPreparationQueue&)=delete;
    ShaderPreparationQueue& operator=(const ShaderPreparationQueue&)=delete;
    ~ShaderPreparationQueue(){
        {std::lock_guard<std::mutex> lock(mutex);stopping=true;changed.notify_one();}
        if(worker.joinable())worker.join();
    }
    // cost includes key, captured source and closure storage. nullptr means retry
    // after earlier jobs finish. Invalid/oversized jobs fail without starting a thread.
    std::shared_ptr<Job> submit(std::string key,std::size_t cost,
                               std::function<std::vector<unsigned char>()> work) {
        if(key.empty()||!work||cost<key.size()||cost>counters.budget)
            throw std::runtime_error("Shader preparation source exceeds budget");
        std::lock_guard<std::mutex> lock(mutex);collect();
        if(stopping)throw std::runtime_error("Shader preparation queue closed");
        if(auto active=current.lock();active&&active->key==key){++counters.deduplicated;return active;}
        for(auto& job:queue)if(job->key==key){++counters.deduplicated;return job;}
        if(cost>counters.budget-counters.bytes)return {};
        auto job=std::make_shared<Job>();job->key=std::move(key);job->cost=cost;job->work=std::move(work);
        queue.push_back(job);counters.bytes+=cost;++counters.submitted;
        if(!running){
            if(worker.joinable())worker.join();
            running=true;
            try {worker=std::thread([this]{run();});++counters.workersStarted;}
            catch(...){running=false;counters.bytes-=cost;--counters.submitted;queue.pop_back();throw;}
        }
        changed.notify_one();return job;
    }
    Info info(){std::lock_guard<std::mutex> lock(mutex);collect();auto out=counters;
        out.queued=queue.size();out.active=!current.expired();out.worker=running;return out;}
};
}
