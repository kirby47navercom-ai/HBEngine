import {Matrix4,Vector3,Box3} from 'three';
import {reflectionProbeVolume} from '../prototype/reflection-probe-volume.js';

export function probeSpatialFixture1157(grid=false){
 let seed=912731;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),count=grid?4096:513,records=new Float32Array(count*36),probes=[],points=[];
 for(let index=0;index<count;index++){
  const position=grid?[(index*1999%count)%16*10,Math.floor((index*1999%count)/16)%16*10,Math.floor((index*1999%count)/256)*10]:[random()*60-30,random()*60-30,random()*60-30];
  const matrix=grid?new Matrix4().makeTranslation(...position):new Matrix4().set((index%3?-1:1)*(.5+random()*2),.15,0,position[0],.08,.5+random()*2,.12,position[1],.04,.06,(index%7?-1:1)*(.5+random()*2),position[2],0,0,0,1),local=grid?[-3,-3,-3]:[-4,-5,-3],maximum=local.map(v=>-v),box=reflectionProbeVolume(matrix,local,maximum),world=new Box3();
  for(let corner=0;corner<8;corner++){const p=new Vector3(...local.map((v,k)=>corner&(1<<k)?maximum[k]:v)).applyMatrix4(matrix);world.expandByPoint(p);if(!grid&&index<8)points.push(p.toArray().map(Math.fround));}
  const at=index*36;records.set([...position,1,...local,1,...maximum,1,...box.localX,...box.localY,...box.localZ,...box.faceScale.slice(0,3),0,0,0,0,0,0,0,0,0],at);
  probes.push({id:'P'+String(index).padStart(5,'0'),p:{importance:count-index},volume:box.volume,localBox:box,minimum:world.min.toArray(),maximum:world.max.toArray()});
  if(grid&&index<512||!grid)points.push(position.map(Math.fround));
 }
 if(!grid){const at=(count-1)*36;records.set([1,1,0,0,1,1.000001,0,0,0,0,1,0],at+12);points.push([1e6,-1e6,0]);}
 for(let n=0;n<(grid?128:1024);n++)points.push([random()*(grid?180:100)-10,random()*(grid?180:100)-10,random()*(grid?180:100)-10].map(Math.fround));
 return{records,probes,points};
}

// Independent full-list float arithmetic; the spatial selector is never used.
export function probeSpatialLinear1157(records,point){
 const indices=[],weights=[],f=Math.fround;
 for(let i=0;i<records.length/36;i++){
  const at=i*36,local=[12,16,20].map(k=>f(f(f(f(records[at+k]*point[0])+f(records[at+k+1]*point[1]))+f(records[at+k+2]*point[2]))+records[at+k+3]));
  const distance=Math.min(...local.map((v,k)=>f(Math.min(f(v-records[at+4+k]),f(records[at+8+k]-v))*records[at+24+k]))),weight=distance<0?0:records[at+7]>0?Math.min(1,f(distance/records[at+7])):1;
  if(weight>0){indices.push(i);weights.push(weight);if(indices.length===2)break;}
 }
 return{indices,weights};
}
