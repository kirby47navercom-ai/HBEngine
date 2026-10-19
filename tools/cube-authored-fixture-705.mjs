import * as G from 'three';
export const cubeDirections705=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
export function authoredCubeCase705(){
 const images={},dimensions=[[4,4,6],[2,2,6],[1,1,6]],colors=dimensions.map(([w,h,d],level)=>Array.from({length:d},(_,face)=>{const color=level===0?[100+face*20,16,32,255]:level===1?[20,120+face*15,40,255]:[30,20,120+face*15,255],file='Assets/Cube-'+level+'-'+face+'.svg';images[file]='<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'"><path fill="rgb('+color.slice(0,3).join(',')+')" d="M0 0h'+w+'v'+h+'H0z"/></svg>';return color;})),paths=dimensions.map((_,level)=>cubeDirections705.map((_,face)=>'Assets/Cube-'+level+'-'+face+'.svg'));
 return {kind:'cubemap',type:'texturecube',directions:cubeDirections705,dimensions,colors,images,file:'Assets/T_Custom.hbcubemap.json',asset:{version:1,name:'TC_Custom',dimension:'cubemap',images:paths[0],mips:paths.slice(1).map(images=>({images}))}};
}
export function authoredCubeMap705(row=authoredCubeCase705()){
 const levels=row.dimensions.map(([width,height,depth],level)=>{const data=new Uint8Array(width*height*depth*4);for(let face=0;face<6;face++)for(let i=face*width*height*4;i<(face+1)*width*height*4;i+=4)data.set(row.colors[level][face],i);return {width,height,depth,data};}),wrap=level=>new G.CubeTexture(Array.from({length:6},(_,face)=>new G.DataTexture(level.data.subarray(face*level.width*level.height*4,(face+1)*level.width*level.height*4),level.width,level.height)));
 const map=wrap(levels[0]);map.mipmaps=levels.slice(1).map(wrap);map.generateMipmaps=false;map.userData.hbAuthoredMips=true;map.minFilter=G.NearestMipmapNearestFilter;map.magFilter=G.NearestFilter;map.needsUpdate=true;return map;
}
