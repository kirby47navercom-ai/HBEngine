// Stack transitions are explicit expectations; directions use an independent 2D Snell construction.
export function previousBranchCases373(){
 const a={id:11,ior:1.3},b={id:22,ior:1.5},full=Array.from({length:16},(_,i)=>({id:i+1,ior:1.3})),critical=Math.asin(1/1.5),cases=[
  {name:'thin-entry',side:true,ior:1.5,ratio:1/1.5,stack:[],after:[]},
  {name:'thin-exit',side:false,ior:1.5,ratio:1.5,stack:[],after:[]},
  {name:'nested-entry',side:true,ior:1.5,ratio:1.3/1.5,volume:22,stack:[a],after:[a,b],theta:.3},
  {name:'top-exit',side:false,ior:1.5,ratio:1.5/1.3,volume:22,stack:[a,b],after:[a],theta:.3},
  {name:'buried-exit',side:false,ior:1.3,ratio:1,volume:11,stack:[a,b],after:[b],theta:.4},
  {name:'unknown-exit',side:false,ior:1.5,volume:22,stack:[a],after:[a],invalid:true},
  {name:'wrong-front',side:true,front:false,ior:1.5,stack:[a],after:[a],invalid:true},
  {name:'opaque-old-surface',side:true,ior:1.5,transmission:.49,stack:[a],after:[a],invalid:true},
  {name:'wrong-reflection-flag',side:true,ior:1.5,reflection:true,stack:[a],after:[a],invalid:true},
  {name:'total-internal-reflection',side:false,ior:1.5,ratio:1.5,volume:22,theta:.9,reflection:true,stack:[b],after:[b]},
  {name:'wrong-transmission-flag',side:false,ior:1.5,volume:22,theta:.9,reflection:false,stack:[b],after:[b],invalid:true},
  {name:'below-critical',side:false,ior:1.5,ratio:1.5,volume:22,theta:critical-.002,stack:[b],after:[]},
  {name:'above-critical',side:false,ior:1.5,ratio:1.5,volume:22,theta:critical+.002,reflection:true,stack:[b],after:[b]},
  {name:'failed-seed',side:true,ior:1.5,count:-1,stack:[],after:[],afterCount:-1,invalid:true},
  {name:'stack-overflow',side:true,ior:1.5,volume:99,stack:full,after:[],afterCount:-1,invalid:true},
  {name:'tilted-normal',side:true,ior:1.5,ratio:1/1.5,theta:.3,normalAngle:.15,stack:[],after:[]},
  {name:'index-matched',side:true,ior:1,ratio:1,theta:.4,stack:[],after:[]},
  {name:'tilted-exit',side:false,ior:1.5,ratio:1.5,theta:.2,normalAngle:.1,stack:[],after:[]}
 ];
 for(const c of cases){
  const theta=c.theta??.2,normal=c.normalAngle??0,view=[Math.sin(theta),0,(c.side?1:-1)*Math.cos(theta)],n=[Math.sin(normal),0,Math.cos(normal)],reflection=c.reflection??false,front=c.front??c.side;let branch=[0,0,0,0];
  if(!c.invalid){const angle=c.side?theta-normal:theta+normal,sine=c.ratio*Math.sin(angle);if(reflection){branch=c.side?[Math.sin(2*normal-theta),0,Math.cos(2*normal-theta),c.ratio]:[-Math.sin(theta+2*normal),0,-Math.cos(theta+2*normal),c.ratio];}else{if(Math.abs(sine)>=1)throw Error('Invalid independent Snell case '+c.name);const cosine=Math.sqrt(1-sine*sine);branch=c.side?[-Math.sin(normal)*cosine-Math.cos(normal)*sine,0,-Math.cos(normal)*cosine+Math.sin(normal)*sine,c.ratio]:[Math.sin(normal)*cosine-Math.cos(normal)*sine,0,Math.cos(normal)*cosine+Math.sin(normal)*sine,c.ratio];}}
  const count=c.afterCount??c.after.length,state=[count,count>0?c.after.at(-1).ior:1,count>0?c.after[0].id:0,count>0?c.after.at(-1).id:0],data=[...view,(front?1:0)+(reflection?2:0),...n,c.ior,0,0,1,c.volume??0,c.transmission??1,c.count??c.stack.length,0,0,...Array.from({length:16},(_,i)=>c.stack[i]?.id||0),...Array.from({length:16},(_,i)=>c.stack[i]?.ior||0),...branch,...state];
  if(data.length!==56)throw Error('Branch case layout');Object.assign(c,{data,expected:[...branch,...state],view,normal:n,front,reflection});
 }
 return cases;
}

export const branchProbeGLSL373=`
vec4 hbTransport=vec4(0,0,0,64),hbGeometry=vec4(1,100,16,1),hbGeometryLimits=vec4(4096,.00001,0,0),hbPathOptions=vec4(1,1,0,0),hbForward=vec4(0,0,-1,0);
vec4 hbGeometryLoad(float index){return vec4(0,0,0,readCase(2.0).w);}
vec3 hbRayPreviousGeometric(float id){return readCase(2.0).xyz;}
vec4 hbRayPreviousField0TimeLod(float id,vec3 p,vec3 view,float width,vec2 time){return vec4(0,.1,readCase(3.0).x,readCase(1.0).w);}
vec4 hbPreviousGeometryTrace(vec3 origin,vec3 direction,float distance){return vec4(distance,-1,0,1);}
`;
export const branchProbeBody373=`
vec4 first=readCase(0.0),second=readCase(1.0),settings=readCase(3.0);float ids[16],media[16];int count=int(settings.y);for(int fill=0;fill<16;fill++){ids[fill]=readCase(4.0+floor(float(fill)/4.0))[fill%4];media[fill]=readCase(8.0+floor(float(fill)/4.0))[fill%4];}
vec4 branch=hbPreviousMediumBranch(0.0,first.xyz,second.xyz,vec4(0,.1,settings.x,second.w),mod(first.w,2.0)>.5,first.w>1.5,ids,media,count),state=vec4(float(count),count>0?media[clamp(count-1,0,15)]:1.0,count>0?ids[0]:0.0,count>0?ids[clamp(count-1,0,15)]:0.0);
`;
