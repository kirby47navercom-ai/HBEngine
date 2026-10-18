// Read-only diagnostics: human profiler and editor automation use the same data.
export const shaderBytecodeCacheContract=Object.freeze({
 version:1,backend:'d3d11',defaultBudgetBytes:8388608,scope:'shared compiled shader bytecode across projects and engine versions',
 location:'LOCALAPPDATA/HBEngine/Cache/ShaderBytecode; explicit HB_USER_DATA_DIR isolates the cache under that directory',
 sdk:'no filesystem access until SceneRenderer::configureShaderCache(directory) or Device::configureShaderCache(directory)',
 compute:Object.freeze({method:'Device::compile',cache:'same shared store; source/entry/target/flags/compiler identity',creation:'owner device under its mutex; cache and FXC outside device mutex',dispatch:'no cache I/O; existing buffers and frame resources',asynchronous:false}),
 identity:['complete assembled HLSL','entry point','target profile','compiler flags','compiler DLL size and last-write stamp'],
 fallback:'miss, corruption, lock contention, write failure or device rejection compiles from source; compilation errors still propagate',
 diagnostics:{method:'profiler.read',field:'rendering[].shaderDiskCache',counters:['hits','misses','writes','evictions','lastScannedBytes','budgetBytes','invalid','errors','busy','configured'],lastScannedBytes:'last directory scan, not a live filesystem poll'},
 stableFrames:'no cache file access or directory scans after an unchanged program is ready',
 limitations:['does not reduce the first uncached source compilation','does not cache WebGL or WebGPU driver pipelines','does not make Device::compile asynchronous','does not measure gameplay FPS']
});
