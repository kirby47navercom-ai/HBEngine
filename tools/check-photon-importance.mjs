import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),reflect=(d,h)=>d.map((v,i)=>v-2*dot(d,h)*h[i]),smith=(c,a2)=>2*c/(c+Math.sqrt(a2+(1-a2)*c*c));let cases=0,reflections=0,transmissions=0,tir=0,maxError=0;
for(const rough of [.06,.25,.5,.9])for(const nv of [.1,.5,1])for(const tilt of [.05,.2,.5])for(const angle of [.5,1,2,4])for(const ratio of [.5,2/3,1.5,2]){
 const view=[Math.sqrt(1-nv*nv),0,nv],incident=view.map(v=>-v),h=[Math.sin(tilt)*Math.cos(angle),Math.sin(tilt)*Math.sin(angle),Math.cos(tilt)],vh=dot(view,h);if(vh<=0)continue;const k=1-ratio*ratio*(1-vh*vh),ct=Math.sqrt(Math.max(0,k)),rs=(ratio*vh-ct)/(ratio*vh+ct),rp=(vh-ratio*ct)/(vh+ratio*ct),f=k<0?1:(rs*rs+rp*rp)*.5;
 if(k<0)tir++;
 for(const reflection of [true,false]){if(!reflection&&k<0)continue;const light=reflection?reflect(incident,h):incident.map((v,i)=>ratio*v+(ratio*vh-ct)*h[i]),nl=Math.abs(light[2]);if(nl<=1e-6||(light[2]>0)!==reflection)continue;const lh=dot(light,h),a2=rough**4,den=h[2]**2*(a2-1)+1,d=a2/(Math.PI*den*den),gv=smith(nv,a2),gl=smith(nl,a2),g=1/(1/gv+1/gl-1),normalPDF=d*gv*vh/nv,j2=(lh+vh*ratio)**2;let value,pdf;
  if(reflection){value=f*d*g/(4*nv*nl);pdf=f*normalPDF/(4*vh);reflections++;}else{value=(1-f)*d*g*Math.abs(lh*vh)/(nv*nl*j2);pdf=(1-f)*normalPDF*Math.abs(lh)/j2;transmissions++;}if(pdf<=1e-30)continue;const expected=value*nl/pdf,compact=gl/(gv+gl-gv*gl),error=Math.abs(expected-compact);assert.ok(Number.isFinite(compact)&&compact>=0&&compact<=1.000001);assert.ok(error<1e-10,{rough,nv,ratio,expected,compact});maxError=Math.max(maxError,error);cases++;
 }
}
assert.ok(cases>500&&reflections>0&&transmissions>0&&tir>0);const result={passed:true,independentFullBSDFOverPDFMatchesCompactWeight:true,importanceModeHasNoRadianceEtaSquare:true,cases,reflections,transmissions,tir,maxError};if(process.argv.includes('--record'))await fs.writeFile('native/build/photon-importance-120.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
