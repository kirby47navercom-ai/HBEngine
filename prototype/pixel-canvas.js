// Pixel transforms share one canvas contract across the browser and native Skia.
export const createPixelCanvas=()=>globalThis.hbNativeCanvas?.()||document.createElement('canvas');
