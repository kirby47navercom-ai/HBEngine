import {makeMaterialNode} from '../prototype/material-runtime.js';
export async function addSampledCoordinate503(write,material){
 const graph=material.graph,sample=graph.nodes.find(n=>n.key==='texture'),edge=graph.edges.find(e=>e.to.node===sample.id&&e.to.pin==='uv'),warp=makeMaterialNode('texture'),combine=makeMaterialNode('combine'),scale=makeMaterialNode('multiply');
 warp.texture='Assets/WarpCoordinate503.svg';warp.parameter='Warp';warp.colorSpace='linear';warp.sampler={mipmaps:false,minFilter:'linear',magFilter:'linear',wrapS:'clamp',wrapT:'clamp'};scale.inputValues={b:8};graph.nodes.push(warp,combine,scale);graph.edges.push({from:edge.from,to:{node:warp.id,pin:'uv'}},{from:{node:warp.id,pin:'r'},to:{node:combine.id,pin:'x'}},{from:{node:warp.id,pin:'g'},to:{node:combine.id,pin:'y'}},{from:{node:combine.id,pin:'rg'},to:{node:scale.id,pin:'a'}});edge.from={node:scale.id,pin:'value'};
 await write(warp.texture,'<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4">'+Array.from({length:16},(_,i)=>'<rect x="'+i%4+'" y="'+Math.floor(i/4)+'" width="1" height="1" fill="rgb('+Math.round(i%4/3*255)+','+Math.round(Math.floor(i/4)/3*255)+',0)"/>').join('')+'</svg>');
 return material;
}
