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
#include <algorithm>

namespace hb::gpu::detail {
// Lazy workers (up to a limit) that exit after an idle period. Callers own handles; abandoning a
// queued handle cancels its work. A compiler already executing finishes safely, but never touches a renderer/device.
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
    std::vector<std::weak_ptr<Job>> current;
    std::vector<std::thread> workers;
    std::vector<std::thread::id> exited;
    Info counters;
    std::size_t limit,running=0,waiting=0;
    bool stopping=false;
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
            if(stopping){for(auto& job:queue)discard(job);queue.clear();break;}
            if(queue.empty()){
                ++waiting;const bool woke=changed.wait_for(lock,idle,[&]{return stopping||!queue.empty();});--waiting;
                if(!woke)break;
                continue;
            }
            auto job=std::move(queue.front());queue.pop_front();current.push_back(job);
            job->status.store(Status::compiling,std::memory_order_release);
            lock.unlock();
            try {job->code=job->work();}
            catch(const std::exception& e){job->error=std::string(e.what()).substr(0,4096);}
            catch(...){job->error="Shader preparation failed";}
            lock.lock();
            counters.bytes-=job->cost;job->work={};job->key.clear();
            current.erase(std::remove_if(current.begin(),current.end(),[&](const auto& w){return w.expired()||w.lock()==job;}),current.end());
            if(job->error.empty()){++counters.completed;job->status.store(Status::ready,std::memory_order_release);}
            else {++counters.failed;job->status.store(Status::failed,std::memory_order_release);}
        }
        // The submitter joins exited workers under the mutex; this thread no longer needs it after the destructor-unlock.
        --running;exited.push_back(std::this_thread::get_id());
    }
    void reap() {
        for(const auto id:exited){const auto t=std::find_if(workers.begin(),workers.end(),[&](const std::thread& w){return w.get_id()==id;});if(t!=workers.end()){t->join();workers.erase(t);}}
        exited.clear();
    }
public:
    explicit ShaderPreparationQueue(std::size_t budget=8*1024*1024,
                                    std::chrono::milliseconds idleTime=std::chrono::milliseconds(1000),std::size_t workerLimit=1):limit(workerLimit),idle(idleTime) {
        if(!budget||idle.count()<=0||!limit)throw std::runtime_error("Shader preparation budget/idle invalid");
        counters.budget=budget;
    }
    ShaderPreparationQueue(const ShaderPreparationQueue&)=delete;
    ShaderPreparationQueue& operator=(const ShaderPreparationQueue&)=delete;
    ~ShaderPreparationQueue(){
        std::vector<std::thread> joining;
        {std::lock_guard<std::mutex> lock(mutex);stopping=true;changed.notify_all();joining.swap(workers);}
        for(auto& w:joining)if(w.joinable())w.join();
    }
    // cost includes key, captured source and closure storage. nullptr means retry
    // after earlier jobs finish. Invalid/oversized jobs fail without starting a thread.
    std::shared_ptr<Job> submit(std::string key,std::size_t cost,
                               std::function<std::vector<unsigned char>()> work) {
        if(key.empty()||!work||cost<key.size()||cost>counters.budget)
            throw std::runtime_error("Shader preparation source exceeds budget");
        std::lock_guard<std::mutex> lock(mutex);collect();
        if(stopping)throw std::runtime_error("Shader preparation queue closed");
        for(const auto& w:current)if(auto active=w.lock();active&&active->key==key){++counters.deduplicated;return active;}
        for(auto& job:queue)if(job->key==key){++counters.deduplicated;return job;}
        if(cost>counters.budget-counters.bytes)return {};
        auto job=std::make_shared<Job>();job->key=std::move(key);job->cost=cost;job->work=std::move(work);
        queue.push_back(job);counters.bytes+=cost;++counters.submitted;
        // Start another worker while queued jobs outnumber idle workers.
        if(running<limit&&queue.size()>waiting){
            reap();++running;
            try {workers.emplace_back([this]{run();});++counters.workersStarted;}
            catch(...){--running;if(!running){counters.bytes-=cost;--counters.submitted;queue.pop_back();throw;}}
        }
        changed.notify_one();return job;
    }
    Info info(){std::lock_guard<std::mutex> lock(mutex);collect();auto out=counters;
        out.queued=queue.size();out.active=std::any_of(current.begin(),current.end(),[](const auto& w){return !w.expired();});out.worker=running>0;return out;}
    // Tests that hold one job to observe queued work pin the shared queue to a single worker.
    void workerLimit(std::size_t value){if(!value)throw std::runtime_error("Shader preparation workers invalid");std::lock_guard<std::mutex> lock(mutex);limit=value;}
};
}
