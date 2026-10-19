export const transmittedSpreadGPU=(spread,ratio,inCosine,outCosine)=>spread.mul(ratio).mul(inCosine).div(outCosine.max(.01)).min(1.57);
export const reflectedSpreadGPU=(spread,roughness)=>{const r=roughness.max(.02);return spread.add(r.mul(r).mul(.5)).min(1.57);};
