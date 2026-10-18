import assert from 'node:assert/strict';import fs from 'node:fs';

export function opticalConeCases374(){
 // Guard the declared compatibility model against an integrator change.
 const gl=fs.readFileSync('prototype/path-tracing-shader.js','utf8').replace(/\s/g,''),gpu=fs.readFileSync('prototype/path-tracing-gpu.js','utf8').replace(/\s/g,'');assert.ok(gl.includes('spread=min(1.57,spread*ratio*inCosine/max(.01,abs(dot(n,direction))))'));assert.ok(gpu.includes('spread.mul(ratio).mul(inCosine).div(n.dot(direction).abs().max(.01)).min(1.57)'));
 const rows=[];for(const ratio of [.5,2/3,1,1.3,1.5,2])for(const spread of [0,.01,.2,2])for(const theta of [0,Math.min(.5,ratio>1?Math.asin(1/ratio)-.03:.5)]){
  const outCos=Math.sqrt(1-ratio*ratio*Math.sin(theta)**2),step=1e-6,rate=(Math.asin(ratio*Math.sin(theta+step))-Math.asin(ratio*Math.sin(theta-step)))/(2*step);rows.push({data:[spread,ratio,Math.cos(theta),outCos],expected:Math.min(1.57,spread*rate),basis:'independent finite difference of the 2D Snell angle'});
 }
 rows.push({data:[1e-4,1.5,Math.sqrt(1-(1-.001*.001)/(1.5*1.5)),.001],expected:1e-4*1.5*Math.sqrt(1-(1-.001*.001)/(1.5*1.5))/.01,basis:'explicit existing grazing-floor policy'});
 return rows;
}
