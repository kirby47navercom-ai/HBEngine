import {encodeLightmapPixels,lightmapHalf,validLightmapAsset} from './lightmap-assets.js';
export async function packLightmapPages(result,{name='Lightmap',pageSize=Math.max(2048,...result.maps.map(m=>Math.max(m.width,m.height)+2))}={}){
 if(!Number.isInteger(pageSize)||pageSize<32||pageSize>8192)throw Error('라이트맵 페이지 크기를 확인하세요.');const groups=[];let current;
 for(const map of result.maps){const size=Math.max(map.width,map.height)+2,side=Math.floor(pageSize/size);if(!side)throw Error('라이트맵 페이지보다 수신 해상도가 커요.');if(!current||current.size!==size||current.items.length===current.side**2){current={size,side,items:[]};groups.push(current);}current.items.push(map);}
 const maps=[],bindings=[];let clampedComponents=0;
 for(let page=0;page<groups.length;page++){const{size,side,items}=groups[page],columns=Math.min(side,Math.ceil(Math.sqrt(items.length))),rows=Math.ceil(items.length/columns),width=columns*size,height=rows*size,pixels=new Uint16Array(width*height*4);
  for(let index=0;index<items.length;index++){const map=items[index],x0=index%columns*size+1,y0=Math.floor(index/columns)*size+1;for(let y=-1;y<=map.height;y++)for(let x=-1;x<=map.width;x++){const source=(Math.max(0,Math.min(map.height-1,y))*map.width+Math.max(0,Math.min(map.width-1,x)))*4,target=((y0+y)*width+x0+x)*4;for(let c=0;c<4;c++){const value=map.pixels[source+c];if(value>65504)clampedComponents++;pixels[target+c]=lightmapHalf(value);}}bindings.push({key:map.key,geometrySHA256:map.geometrySHA256,page,scaleOffset:[map.width/width,map.height/height,x0/width,y0/height]});}
  maps.push({key:'page_'+page,width,height,encoding:'rgba16f-gzip',pixels:await encodeLightmapPixels(pixels)});
 }
 const asset={version:1,name,mode:'indirect',maps,bindings};if(!validLightmapAsset(asset))throw Error('라이트맵 페이지 검증 실패');return{asset,stats:{...result.stats,clampedComponents,pages:maps.length,receivers:bindings.length},settings:result.settings};
}
