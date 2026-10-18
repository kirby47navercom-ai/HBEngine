export const transmittedSpreadGPU=(spread,ratio,inCosine,outCosine)=>spread.mul(ratio).mul(inCosine).div(outCosine.max(.01)).min(1.57);
