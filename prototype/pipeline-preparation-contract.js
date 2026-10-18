export const pipelinePreparationContract=Object.freeze({
 version:1,scope:'WebGPU optional path/post/filter descriptor preparation; WebGL existing link submission policy unchanged',
 scheduling:'submit post synchronously, then deduplicated RTT descriptors before awaiting native pipeline completion; no guarantee of parallel driver execution',
 diagnostics:Object.freeze(['pending','currentStage','elapsedMS','stages','completed','submitted','total','cancelled','error','concurrent']),
 timing:'stage wall times overlap; submitMS is CPU descriptor submission, afterSubmitMS includes scheduling/driver waiting; do not sum stages or interpret as GPU execution/FPS',
 lifecycle:'renderer target/MRT/color/tone/hook/render epoch/device method restored before yielding; no warmup draw; cancellation freezes stage diagnostics and wakes waiters; late completion cannot publish into failed/cancelled state',
 resources:'no added GPU buffers, targets, textures, readbacks, worker or disk cache; existing temporary preparation promises per stage',
 limitations:Object.freeze(['does not reduce synchronous graph construction or source generation','does not remove first shader compilation','native compilation already submitted cannot be interrupted','driver scheduling/cache/load determine elapsed time'])
});
