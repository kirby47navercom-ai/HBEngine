import {retainTestEvidence} from './test-artifacts.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import {widgetDefaults} from '../prototype/ui-assets.js';
import {paintWidgetText,clearWidgetPaintCaches} from './native-widget-paint.mjs';

const work=await fs.mkdtemp('native/build/widget-text-cache-'),owner=path.resolve('tools/native-widget-paint.mjs'),source=await fs.readFile(owner,'utf8'),cached="const {lines,ascent,descent}=textLayout(ctx,p.text||(type==='TextInput'?p.placeholder:''),innerWidth,p.wrap&&type!=='TextInput',size),lineHeight=size*widgetLineHeight;",direct="const lines=widgetTextLines(p.text||(type==='TextInput'?p.placeholder:''),innerWidth,p.wrap&&type!=='TextInput',text=>ctx.measureText(text).width),lineHeight=size*widgetLineHeight,metrics=ctx.measureText('Hg한'),ascent=metrics.fontBoundingBoxAscent||size*.8,descent=metrics.fontBoundingBoxDescent||size*.2;";assert(source.includes(cached));await fs.writeFile(work+'/baseline.mjs',source.replace(cached,direct).replace(/(from\s*['"])(\.\.?\/[^'"]+)(['"])/g,(_,a,b,c)=>a+pathToFileURL(path.resolve(path.dirname(owner),b)).href+c));const baseline=(await import(pathToFileURL(path.resolve(work,'baseline.mjs')))).paintWidgetText;
retainTestEvidence(work);
const a=createCanvas(640,360),b=createCanvas(640,360),ca=a.getContext('2d'),cb=b.getContext('2d');let cases=0;
try{
 for(const type of ['Text','Button','CheckBox','TextInput'])for(const width of [172,333])for(const wrap of [false,true])for(const scale of [1,1.5])for(const font of ['sans-serif','serif','monospace']){
  const p={...widgetDefaults,text:type==='TextInput'?'':'한글 HUD 줄바꿈 test 123\n두 번째 줄',placeholder:'입력 placeholder',wrap,fontSize:18,borderWidth:2};
  for(const [ctx,paint]of [[ca,baseline],[cb,paintWidgetText]]){ctx.resetTransform();ctx.globalAlpha=1;ctx.fillStyle='#224466';ctx.fillRect(0,0,640,360);ctx.translate(.25,.5);ctx.globalAlpha=.6;paint(ctx,type,p,width,140,scale,font);}
  assert(Buffer.from(a.data()).equals(Buffer.from(b.data())),'exact pixels '+[type,width,wrap,scale,font]);cases++;
 }
 clearWidgetPaintCaches(cb);let measurements=0;const original=cb.measureText.bind(cb);cb.measureText=(text)=>{measurements++;return original(text);};cb.resetTransform();cb.globalAlpha=1;const p={...widgetDefaults,text:'반복 HUD 글자 text',fontSize:20,wrap:true};paintWidgetText(cb,'Text',p,300,100,1,'sans-serif');const first=measurements;assert(first>0);for(let i=0;i<100;i++)paintWidgetText(cb,'Text',p,300,100,1,'sans-serif');assert.equal(measurements,first,'unchanged layout measures zero times');
 p.text='바뀐 글자';paintWidgetText(cb,'Text',p,300,100,1,'sans-serif');assert(measurements>first);const changed=measurements;cb.letterSpacing='2px';paintWidgetText(cb,'Text',p,300,100,1,'sans-serif');assert(measurements>changed,'letter spacing invalidates layout');cb.letterSpacing='0px';
 for(let i=0;i<200;i++)paintWidgetText(cb,'Text',{...p,text:'unique '+i+' '.repeat(160)},300,100,1,'sans-serif');const before=measurements;paintWidgetText(cb,'Text',p,300,100,1,'sans-serif');assert(measurements>before,'bounded cache evicts old layouts');clearWidgetPaintCaches(cb);const reset=measurements;paintWidgetText(cb,'Text',p,300,100,1,'sans-serif');assert(measurements>reset,'font registration and dispose can invalidate caches');cb.measureText=original;
 const samples={direct:[],cached:[]};p.text='변하지 않는 HUD 설명과 버튼 text 123 한글 줄바꿈';for(let round=0;round<10;round++)for(const name of round%2?['direct','cached']:['cached','direct']){const ctx=name==='direct'?ca:cb,canvas=name==='direct'?a:b,paint=name==='direct'?baseline:paintWidgetText,start=performance.now();for(let i=0;i<30;i++){ctx.clearRect(0,0,640,360);paint(ctx,'Text',p,300,100,1,'sans-serif');canvas.data();}if(round>1)samples[name].push((performance.now()-start)/30);}
 const median=values=>[...values].sort((a,b)=>a-b)[values.length>>1],result={passed:true,exactPixelCases:cases,unchangedLayoutMeasurements:0,textAndTypographyInvalidation:true,boundedLayoutCache:true,explicitFontInvalidation:true,benchmark:{directMedianMs:median(samples.direct),cachedMedianMs:median(samples.cached),scope:'CPU text layout and Skia painting, flush each frame; not whole-game FPS'}};await fs.writeFile(work+'/acceptance.json',JSON.stringify(result,null,2));console.log(JSON.stringify({work,...result}));
}finally{clearWidgetPaintCaches(ca);clearWidgetPaintCaches(cb);a.width=a.height=b.width=b.height=1;}
