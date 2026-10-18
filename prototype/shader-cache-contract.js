// Read-only diagnostics: human profiler and editor automation use the same data.
export const shaderBytecodeCacheContract=Object.freeze({
 version:1,backend:'d3d11',defaultBudgetBytes:8388608,scope:'shared compiled shader bytecode across projects and engine versions',
 location:'LOCALAPPDATA/HBEngine/Cache/ShaderBytecode; explicit HB_USER_DATA_DIR isolates the cache under that directory',
 sdk:'no filesystem access until SceneRenderer::configureShaderCache(directory)',
 identity:['complete assembled HLSL','entry point','target profile','compiler flags','compiler DLL size and last-write stamp'],
 fallback:'miss, corruption, lock contention, write failure or device rejection compiles from source; compilation errors still propagate',
 diagnostics:{method:'profiler.read',field:'rendering[].shaderDiskCache',counters:['hits','misses','writes','evictions','lastScannedBytes','budgetBytes','invalid','errors','busy','configured'],lastScannedBytes:'last directory scan, not a live filesystem poll'},
 stableFrames:'no cache file access or directory scans after an unchanged program is ready',
 limitations:['does not reduce the first uncached source compilation','does not cache WebGL or WebGPU driver pipelines','does not cache Device::compile user compute kernels','does not measure gameplay FPS']
});
