import {makeMaterialNode} from '../prototype/material-runtime.js';
export function materialChannelRoundTrip868(graph,target,pin,output='rg'){
 const edge=graph.edges.find(e=>e.to.node===target.id&&e.to.pin===pin);if(!edge)throw Error('Missing fixture input');const source={...edge.from},pad=makeMaterialNode('add'),split=makeMaterialNode('split'),combine=makeMaterialNode('combine');pad.inputValues.b=[0,0,0,0];graph.nodes.push(pad,split,combine);edge.from={node:combine.id,pin:output};graph.edges.push({from:source,to:{node:pad.id,pin:'a'}},{from:{node:pad.id,pin:'value'},to:{node:split.id,pin:'value'}});for(const lane of 'xyzw')graph.edges.push({from:{node:split.id,pin:lane},to:{node:combine.id,pin:lane}});return {pad,split,combine};
}
