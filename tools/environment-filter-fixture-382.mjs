import {FloatType} from 'three';import {packPathEnvironment} from '../prototype/path-environment.js';import {prepareLightmapEnvironment} from '../prototype/lightmap-environment.js';
export function environmentFilterFixture382(rotation=0){
 const width=17,height=9,data=Float32Array.from({length:width*height*4},(_,i)=>i%4===3?1:((i*31)%67)/23),packed=packPathEnvironment({image:{width,height,data},type:FloatType,version:0}),prepared=prepareLightmapEnvironment({texture:{width,height,pixels:data,float:true},rotation,intensity:1.7}),directions=[[0,1,0],[0,-1,0],[1,0,0],[0,0,1],[-1,0,1e-7],[-1,0,-1e-7],[.6,.8,0],[1e-4,Math.sqrt(1-1e-8),0],[0,-Math.sqrt(1-1e-8),1e-4]],cases=[];
 for(const a of [...Array.from({length:16},(_,i)=>-Math.PI+i*Math.PI/8),Math.PI/8-1e-6,Math.PI/8+1e-6,-Math.PI/8-1e-6,-Math.PI/8+1e-6])directions.push([Math.cos(a),0,Math.sin(a)],[Math.cos(a),Math.sin(a),0]);
 for(const direction of directions)for(const spread of [0,.15,.5,1.2]){const value=[...Float32Array.from([...direction,spread])];cases.push({data:value,expected:prepared.sample(value.slice(0,3),value[3])});}
 return{packed:{data:[...packed.values],width:packed.textureWidth,height:packed.textureHeight,map:[packed.texels,width,height,rotation*Math.PI/180],options:[1.7,0,packed.mipOffset,0]},cases};
}
