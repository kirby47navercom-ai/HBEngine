const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>{const length=Math.hypot(...a);return a.map(v=>v/length);},fract=x=>x-Math.floor(x);
function reverse(index){let bits=index>>>0;bits=((bits<<16)|(bits>>>16))>>>0;bits=(((bits&0x55555555)<<1)|((bits&0xaaaaaaaa)>>>1))>>>0;bits=(((bits&0x33333333)<<2)|((bits&0xcccccccc)>>>2))>>>0;bits=(((bits&0x0f0f0f0f)<<4)|((bits&0xf0f0f0f0)>>>4))>>>0;bits=(((bits&0x00ff00ff)<<8)|((bits&0xff00ff00)>>>8))>>>0;return bits/4294967296;}
function around(axis,cosine,angle){const tangent=unit(cross(Math.abs(axis[1])<.9?[0,1,0]:[1,0,0],axis)),bitangent=cross(axis,tangent),sine=Math.sqrt(Math.max(0,1-cosine*cosine));return axis.map((n,k)=>n*cosine+tangent[k]*sine*Math.cos(angle)+bitangent[k]*sine*Math.sin(angle));}
// Keep the pre-387 cosine sequence byte-for-byte equivalent for other environments.
export function lightmapHemisphere(normal,index,count,rotation=0){const r=Math.sqrt((index+.5)/count),angle=2*Math.PI*(reverse(index)+rotation),t=unit(cross(Math.abs(normal[1])<.9?[0,1,0]:[1,0,0],normal)),b=cross(normal,t);return normal.map((n,k)=>n*Math.sqrt(1-r*r)+t[k]*r*Math.cos(angle)+b[k]*r*Math.sin(angle));}

// One-sample mixture: the cosine component covers every contributing direction.
export function prepareSkyDirections(environment){
 const sky=!environment?.texture&&environment?.procedural;if(!sky||!(environment.intensity??1))return null;
 const power=sky.sunDiskPower,lobes=['sun','moon'].map(prefix=>({axis:sky[prefix+'Direction'],color:sky[prefix+'Color']})).filter(l=>l.color?.some(v=>v>0));if(!lobes.length)return null;
 if(!Number.isFinite(power)||power<=0||lobes.some(l=>!Array.isArray(l.axis)||l.axis.length!==3||!l.axis.every(Number.isFinite)||Math.hypot(...l.axis)<1e-20||l.color.length!==3||!l.color.every(v=>Number.isFinite(v)&&v>=0)))throw Error('하늘 원반의 방향·색·지수를 확인하세요.');
 let total=0;for(const lobe of lobes){lobe.axis=unit(lobe.axis);lobe.weight=dot(lobe.color,[.2126,.7152,.0722]);total+=lobe.weight;}if(!(total>0)||!Number.isFinite(total))return null;for(const lobe of lobes)lobe.weight/=total;
 const background=(dot(sky.topColor,[.2126,.7152,.0722])+dot(sky.horizonColor,[.2126,.7152,.0722])),disk=.55*total/(power+1),probability=Math.min(.5,disk/(disk+Math.max(0,background)));if(!(probability>0))return null;
 const pdf=(normal,direction)=>(1-probability)*Math.max(0,dot(normal,direction))/Math.PI+probability*lobes.reduce((sum,l)=>sum+l.weight*(power+1)/(2*Math.PI)*Math.max(0,dot(l.axis,direction))**power,0);
 return {pdf,sample(normal,index,count,rotation=0){let u=fract((index+.5)/count+rotation),axis=normal,cosine;const angle=2*Math.PI*fract(reverse(index)+rotation*.7548776662466927);
   if(u<1-probability)cosine=Math.sqrt(1-u/(1-probability));else{u=(u-(1-probability))/probability;let selected=lobes.at(-1);for(const lobe of lobes){if(u<lobe.weight){selected=lobe;break;}u-=lobe.weight;}axis=selected.axis;cosine=Math.max(0,Math.min(1,u/selected.weight))**(1/(power+1));}
   const direction=around(axis,cosine,angle),density=pdf(normal,direction),cos=Math.max(0,dot(normal,direction));return {direction,weight:density?cos/(Math.PI*density):0,pdf:density};
  },contract:{model:'single-sample balance mixture of cosine hemisphere and shared sun/moon power lobes',lobes:lobes.length,cosineProbability:1-probability,additionalRays:0}};
}
