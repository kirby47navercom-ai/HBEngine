import {timedNormalFixture} from './rendering-187-fixture.mjs';
import {makeMaterialNode} from '../prototype/material-runtime.js';
export function sharedNormalFixture253(World){
 const f=timedNormalFixture('normal',false,World),g=f.data.graph,root=g.nodes.find(n=>n.key==='surface'),branch=g.nodes.filter(n=>n!==root),ids=new Map(branch.map(n=>[n.id,'copy_'+n.id]));
 g.nodes.push(...branch.map(n=>({...structuredClone(n),id:ids.get(n.id)})));
 const edges=g.edges.filter(e=>e.to.node!==root.id);g.edges.push(...edges.map(e=>({from:{...e.from,node:ids.get(e.from.node)},to:{...e.to,node:ids.get(e.to.node)}})));
 const output=g.edges.find(e=>e.to.node===root.id&&e.to.pin==='normal').from,add=makeMaterialNode('add'),half=makeMaterialNode('multiply');half.inputValues.b=.5;g.nodes.push(add,half);
 g.edges=g.edges.filter(e=>e.to.node!==root.id);g.edges.push({from:output,to:{node:add.id,pin:'a'}},{from:{...output,node:ids.get(output.node)},to:{node:add.id,pin:'b'}},{from:{node:add.id,pin:'value'},to:{node:half.id,pin:'a'}},{from:{node:half.id,pin:'value'},to:{node:root.id,pin:'normal'}});
 return f;
}
export function normalPacket253(f){
 f.prepare(0);f.world.commit();const p=f.prepare(.5);
 return {data:[...p.data],width:p.width,height:p.height,rayInfo:p.rayInfo,geometryInfo:[p.width,p.height,p.nodeCount,p.triangleOffset],geometryRecords:p.geometryRecords,transport:[p.materialsOffset,p.transportVersion,0,32],pathFilter:[.8,0,1,p.motionOffset],forward:[0,0,-1,p.previousMaterialTime]};
}
