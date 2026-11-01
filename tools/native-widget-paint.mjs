import {widgetImageBox,widgetTextLines,widgetLineHeight} from '../prototype/widget-visual-contract.js';
import {cachedWidgetImage,clearWidgetImageCache} from './native-widget-image-cache.mjs';

const textLayouts=new WeakMap();
export function clearWidgetPaintCaches(ctx){textLayouts.delete(ctx);clearWidgetImageCache(ctx);}
function textLayout(ctx,text,width,wrap,size){
 let cache=textLayouts.get(ctx);if(!cache){cache={metrics:new Map(),lines:new Map(),characters:0};textLayouts.set(ctx,cache);}
 const font=JSON.stringify([ctx.font,ctx.fontKerning,ctx.fontStretch,ctx.fontVariantCaps,ctx.letterSpacing,ctx.wordSpacing,ctx.direction,ctx.textRendering]);
 let metrics=cache.metrics.get(font);if(!metrics){metrics=ctx.measureText('Hg한');if(cache.metrics.size>=64)cache.metrics.delete(cache.metrics.keys().next().value);cache.metrics.set(font,metrics);}
 const key=JSON.stringify([font,text,width,wrap]);let lines=cache.lines.get(key);
 if(!lines){lines=widgetTextLines(text,width,wrap,value=>ctx.measureText(value).width);const characters=key.length+lines.reduce((n,line)=>n+line.length,0);if(characters<=32768){while(cache.lines.size>=128||cache.characters+characters>32768){const first=cache.lines.keys().next().value,old=cache.lines.get(first);cache.characters-=first.length+old.reduce((n,line)=>n+line.length,0);cache.lines.delete(first);}cache.lines.set(key,lines);cache.characters+=characters;}}
 return {lines,ascent:metrics.fontBoundingBoxAscent||size*.8,descent:metrics.fontBoundingBoxDescent||size*.2};
}

export function paintWidgetImage(ctx,image,width,height,properties,scale){
 if(!image)return;if(!cachedWidgetImage(ctx,image,width,height,properties,scale,paintWidgetImageDirect))paintWidgetImageDirect(ctx,image,width,height,properties,scale);
}
export function paintWidgetImageDirect(ctx,image,width,height,properties,scale){
 if(!image)return;const border=properties.nineSlice||[0,0,0,0];ctx.save();ctx.beginPath();ctx.rect(0,0,width,height);ctx.clip();ctx.imageSmoothingEnabled=properties.imageRendering!=='pixelated';
 if(border.some(v=>v>0)){
  const [l,b,r,t]=border,sourceX=image.width/(image.hbSourceWidth||image.width),sourceY=image.height/(image.hbSourceHeight||image.height),dx=[0,Math.min(l*scale,width/2),Math.max(width/2,width-r*scale),width],dy=[0,Math.min(t*scale,height/2),Math.max(height/2,height-b*scale),height],sx=[0,l*sourceX,image.width-r*sourceX,image.width],sy=[0,t*sourceY,image.height-b*sourceY,image.height];
  for(let y=0;y<3;y++)for(let x=0;x<3;x++)if(sx[x+1]>sx[x]&&sy[y+1]>sy[y])ctx.drawImage(image,sx[x],sy[y],sx[x+1]-sx[x],sy[y+1]-sy[y],dx[x],dy[y],dx[x+1]-dx[x],dy[y+1]-dy[y]);
 }else ctx.drawImage(image,...widgetImageBox(image,width,height,properties.imageFit||'contain'));
 ctx.restore();
}
export function paintWidgetText(ctx,type,p,width,height,scale,font){
 const size=p.fontSize*scale,border=p.borderWidth*scale,padding=type==='TextInput'?8*scale:0,check=type==='CheckBox'?28*scale:0,innerWidth=Math.max(0,width-border*2-padding*2-check);
 ctx.font=size+'px '+font;ctx.fillStyle=p.color;ctx.textBaseline='alphabetic';ctx.textAlign=type==='Button'||type==='TouchButton'?'center':p.align;
 const {lines,ascent,descent}=textLayout(ctx,p.text||(type==='TextInput'?p.placeholder:''),innerWidth,p.wrap&&type!=='TextInput',size),lineHeight=size*widgetLineHeight;
 const centered=['Button','TouchButton','CheckBox','TextInput'].includes(type),top=centered?(height-lines.length*lineHeight)/2:border,tx=ctx.textAlign==='center'?width/2:ctx.textAlign==='right'?width-border-padding:border+padding+check;
 ctx.save();ctx.beginPath();ctx.rect(border+padding,border,Math.max(0,width-2*(border+padding)),Math.max(0,height-2*border));ctx.clip();for(let i=0;i<lines.length;i++)ctx.fillText(lines[i],tx,top+i*lineHeight+(lineHeight-ascent-descent)/2+ascent);ctx.restore();
}
export function widgetFlexBox(node,box,parentType,index,siblings,scale){
 const a=node.slot.anchors,o=node.slot.offset,al=node.slot.alignment;
 let x=box.x+a[0]*box.w+o[0]*scale,y=box.y+a[1]*box.h+o[1]*scale,w=a[0]===a[2]?o[2]*scale:(a[2]-a[0])*box.w-(o[0]+o[2])*scale,h=a[1]===a[3]?o[3]*scale:(a[3]-a[1])*box.h-(o[1]+o[3])*scale;
 if(parentType==='NamedSlot'){x=box.x;y=box.y;w=box.w;h=box.h;}
 if(['VerticalBox','HorizontalBox'].includes(parentType)){
  const vertical=parentType==='VerticalBox',axis=vertical?3:2,totalFill=siblings.reduce((n,v)=>n+v.slot.fill,0),free=Math.max(0,(vertical?box.h:box.w)-box.gap*Math.max(0,siblings.length-1)-siblings.reduce((n,v)=>n+(v.slot.fill?0:v.slot.offset[axis]*scale),0)),extent=v=>v.slot.fill&&totalFill?free*v.slot.fill/totalFill:v.slot.offset[axis]*scale,before=siblings.slice(0,index).reduce((n,v)=>n+extent(v)+box.gap,0);
  x=box.x+(vertical?0:before);y=box.y+(vertical?before:0);if(vertical){h=extent(node);if(node.slot.fill)w=box.w;}else w=extent(node);
 }
 if(parentType==='Grid'){const columns=box.columns||2,column=(box.w-box.gap*(columns-1))/columns,row=Math.floor(index/columns);x=box.x+(index%columns)*(column+box.gap);y=box.y;for(let r=0;r<row;r++)y+=Math.max(...siblings.slice(r*columns,(r+1)*columns).map(v=>v.slot.offset[3]*scale))+box.gap;if(node.slot.fill)w=column;}
 return {x:x-al[0]*w,y:y-al[1]*h,w,h};
}
