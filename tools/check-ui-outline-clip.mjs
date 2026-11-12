// UI 글자 테두리(outlineWidth/outlineColor)와 이미지 다각형 자르기(clipPolygon): 검증 규칙과 네이티브 그림 결과.
import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import {createWidgetNode,validWidgetProperties} from '../prototype/ui-assets.js';
import {paintWidgetImageDirect,paintWidgetText,beginWidgetPaint} from './native-widget-paint.mjs';

const node=(type,extra)=>{const n=createWidgetNode(type,'n');Object.assign(n.properties,extra);return n;};
assert(validWidgetProperties(node('Text',{outlineWidth:2,outlineColor:'#000000'})));
assert(!validWidgetProperties(node('Text',{outlineWidth:33})));
assert(!validWidgetProperties(node('Text',{outlineWidth:-1})));
assert(validWidgetProperties(node('Image',{clipPolygon:[0,0,40,0,0,40]})));
for(const clipPolygon of [[0,0,1,1],[0,0,1,1,2],[0,0,1,1,NaN,0],Array(34).fill(0)])assert(!validWidgetProperties(node('Image',{clipPolygon})));
assert(!validWidgetProperties(node('Text',{clipPolygon:[0,0,40,0,0,40]})),'clipPolygon is Image-only');

const pixel=(ctx,x,y)=>[...ctx.getImageData(x,y,1,1).data];
const art=createCanvas(40,40),a=art.getContext('2d');a.fillStyle='#ff0000';a.fillRect(0,0,40,40);
{const c=createCanvas(40,40),ctx=c.getContext('2d');paintWidgetImageDirect(ctx,art,40,40,{clipPolygon:[0,0,40,0,0,40]},1);
  assert.equal(pixel(ctx,5,5)[3],255,'inside triangle painted');assert.equal(pixel(ctx,35,35)[3],0,'outside triangle clipped');}
{const c=createCanvas(120,60),ctx=c.getContext('2d'),end=beginWidgetPaint(ctx),p={...createWidgetNode('Text','t').properties,text:'H',fontSize:40,color:'#ffffff',outlineWidth:4,outlineColor:'#00ff00',padding:0};
  paintWidgetText(ctx,'Text',p,120,60,1,'sans-serif');end();const data=ctx.getImageData(0,0,120,60).data;let green=0;for(let i=0;i<data.length;i+=4)if(data[i+1]>200&&data[i]<60&&data[i+3]>200)green++;
  assert(green>20,'outline stroke drawn: '+green);}
console.log(JSON.stringify({ok:true,scope:'UI outline/clipPolygon validation and native canvas paint; browser runtime uses CSS text-stroke/clip-path (not pixel-compared).'}));
