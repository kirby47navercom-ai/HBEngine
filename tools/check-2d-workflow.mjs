import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {create2DAsset,valid2DAsset,spriteImage,spriteSlices,sliceSpriteGrid,spriteAnimationDuration,spriteAnimationFrame,tileAtlasRect,tileLine,applyTileTool,tileCollisionBoxes,twoDSuffix} from '../prototype/two-d-assets.js';
import {TwoDEditor} from '../prototype/two-d-editor.js';
import {AssetDocuments,assetSuffix,validAsset} from '../prototype/asset-documents.js';

const clone=structuredClone,near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-10,`${actual} != ${expected}`);
for(const kind of ['sprite','tilemap','spriteanimation']){
  const data=create2DAsset(kind,'Test');assert.ok(valid2DAsset(kind,data));assert.ok(validAsset(kind,data));assert.equal(assetSuffix[kind],twoDSuffix[kind]);
}
assert.throws(()=>create2DAsset('sprite',''));
const sprite={...create2DAsset('sprite','Hero'),texture:'Assets/Hero.png',pixelsPerUnit:32,rect:[16,32,32,16],pivot:[0,1]};
const image={width:128,height:96},resolved=spriteImage(sprite,image);
assert.deepEqual(resolved.rect,[16,32,32,16]);assert.deepEqual(resolved.size,[1,.5]);assert.deepEqual(resolved.offset,[.5,-.25]);assert.deepEqual(resolved.uv.repeat,[.25,1/6]);near(resolved.uv.offset[1],.5);
assert.deepEqual(spriteImage({...sprite,rect:[0,0,0,0]},image).rect,[0,0,128,96]);
assert.equal(spriteImage({...sprite,rect:[127,0,2,1]},image),null);
const nine={...sprite,border:[8,4,8,4]},nineMesh=spriteSlices(nine,image,{size:[3,2]});assert.equal(nineMesh.positions.length,9*6*3);assert.deepEqual(nineMesh.offset,[1.5,-1]);near(nineMesh.positions[3]-nineMesh.positions[0],.25);near(nineMesh.positions[7]-nineMesh.positions[1],.125);assert.ok(nineMesh.uvs.every(v=>v>=0&&v<=1));assert.ok(spriteSlices(nine,image,{size:[3.1,2],mode:'tiled'}).positions.length>nineMesh.positions.length);const tiny=spriteSlices(nine,image,{size:[.1,.1]});near(Math.max(...tiny.positions.filter((_,i)=>i%3===0))-.05,0);assert.throws(()=>spriteSlices({...nine,border:[20,0,20,0]},image,{size:[1,1]}),/테두리/);assert.ok(valid2DAsset('sprite',{...sprite,border:undefined}),'기존 스프라이트 JSON 호환');
for(const texture of ['../outside.png','C:/outside.png','/outside.png','Assets/\u0000.png'])assert.equal(valid2DAsset('sprite',{...sprite,texture}),false);
assert.equal(valid2DAsset('sprite',{...sprite,pixelsPerUnit:0}),false);
assert.equal(valid2DAsset('sprite',{...sprite,pivot:[-1,.5]}),false);
const slices=sliceSpriteGrid({...sprite,name:'Atlas',rect:[0,0,80,48]},image,{width:16,height:16,margin:2,spacing:2});
assert.equal(slices.length,8);assert.deepEqual(slices[5].rect,[20,20,16,16]);assert.equal(slices[0].name,'Atlas_001');assert.deepEqual(sprite.rect,[16,32,32,16]);assert.ok(slices.every(data=>valid2DAsset('sprite',data)));
assert.throws(()=>sliceSpriteGrid({...sprite,rect:[0,0,0,0]},{width:1024,height:1024},{width:1,height:1}));

const animation={...create2DAsset('spriteanimation','Walk'),frames:[{sprite:'Assets/A.hbsprite.json',duration:.1},{sprite:'Assets/B.hbsprite.json',duration:.2}],playRate:2};
near(spriteAnimationDuration(animation),.3);
assert.equal(spriteAnimationFrame(animation,.049).index,0);assert.equal(spriteAnimationFrame(animation,.05).index,1);
assert.equal(spriteAnimationFrame(animation,.15).index,0);assert.equal(spriteAnimationFrame(animation,.3,{rate:1}).index,0);
assert.equal(spriteAnimationFrame(animation,.3,{rate:1,loop:false}).finished,true);
assert.equal(spriteAnimationFrame(animation,2,{loop:false}).index,1);near(spriteAnimationFrame(animation,2,{loop:false}).elapsed,.2);
assert.equal(spriteAnimationFrame(create2DAsset('spriteanimation','Empty'),0),null);assert.equal(spriteAnimationFrame(animation,-1),null);
assert.equal(valid2DAsset('spriteanimation',{...animation,frames:[{sprite:'',duration:.1}]}),false);
assert.equal(valid2DAsset('spriteanimation',{...animation,frames:[{sprite:'Assets/A.hbsprite.json',duration:0}]}),false);

let map={...create2DAsset('tilemap','Map'),width:8,height:6,tileset:'Assets/Tiles.png'};
assert.deepEqual(tileAtlasRect(map,5,{width:128,height:96}).rect,[32,32,32,32]);assert.equal(tileAtlasRect(map,12,{width:128,height:96}),null);
assert.deepEqual(tileLine({x:0,y:0},{x:4,y:4}),[0,1,2,3,4].map(x=>({x,y:x})));
map=applyTileTool(map,'ground','brush',{x:0,y:0},{x:4,y:4},3).data;
assert.equal(map.layers[0].tiles.length,5);
assert.equal(applyTileTool(map,'ground','brush',{x:0,y:0},{x:4,y:4},3).changed,false);
map=applyTileTool(map,'ground','erase',{x:1,y:1},{x:3,y:3}).data;assert.equal(map.layers[0].tiles.length,2);
map=applyTileTool(map,'ground','rectangle',{x:6,y:4},{x:20,y:20},1).data;assert.equal(map.layers[0].tiles.length,6);
const invalid=clone(map);invalid.layers[0].tiles.push(clone(invalid.layers[0].tiles[0]));assert.equal(valid2DAsset('tilemap',invalid),false);
assert.equal(valid2DAsset('tilemap',{...map,width:0}),false);
const layerMap={...create2DAsset('tilemap','Layers'),width:4,height:3};
layerMap.layers.push({...clone(layerMap.layers[0]),id:'detail',name:'Detail'});
let filled=applyTileTool(layerMap,'ground','fill',{x:1,y:1},undefined,2).data;assert.equal(filled.layers[0].tiles.length,12);assert.equal(filled.layers[1].tiles.length,0);
assert.equal(applyTileTool(filled,'ground','fill',{x:0,y:0},undefined,2).changed,false);
filled=applyTileTool(filled,'ground','rectangle',{x:1,y:0},{x:1,y:2},4).data;
filled=applyTileTool(filled,'ground','fill',{x:0,y:0},undefined,5).data;
assert.equal(filled.layers[0].tiles.filter(tile=>tile.index===5).length,3);assert.equal(filled.layers[0].tiles.filter(tile=>tile.index===2).length,6);
const collision={...create2DAsset('tilemap','Collision'),width:4,height:4,cellSize:[2,.5]};
collision.layers[0].collision=true;collision.layers[0].visible=false;collision.layers[0].tiles=[{x:0,y:0,index:0},{x:1,y:0,index:1},{x:0,y:1,index:2},{x:1,y:1,index:3}];
collision.layers.push({...clone(collision.layers[0]),id:'other',name:'Other'});
assert.deepEqual(tileCollisionBoxes(collision),[{x:0,y:0,width:2,height:2,center:[2,-.5,0],size:[4,1,.1]}]);
collision.layers.forEach(layer=>layer.collision=false);assert.deepEqual(tileCollisionBoxes(collision),[]);

// Exercise the actual editor pointer transaction, retaining host-provided undo/save hooks.
function editorHarness(kind,data){
  const editor=Object.create(TwoDEditor.prototype),history=[],states=[],errors=[];
  Object.assign(editor,{doc:{kind,data:clone(data)},hooks:{before:()=>history.push(clone(editor.doc.data)),change:()=>states.push(clone(editor.doc.data)),error:error=>errors.push(error)},source:{width:128,height:128},zoom:1,layer:'ground',tool:'brush',tile:3,scroll:{scrollLeft:0,scrollTop:0},images:new Map(),assets:new Map(),el:{querySelector:()=>null,onchange:null,onclick:null,onkeydown:null},drawMap(){},drawSprite(){},render(){this.renderCount=(this.renderCount||0)+1;},updateTools(){},drawPaletteSelection(){}});
  const captures=new Set();editor.canvas={width:192,height:144,focus(){},setPointerCapture:id=>captures.add(id),hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>captures.delete(id),getBoundingClientRect:()=>({left:0,top:0,width:192,height:144}),style:{}};
  return {editor,history,states,errors,captures};
}
const event=(x,y,button=0)=>({button,pointerId:1,clientX:x*24+12,clientY:y*24+12,preventDefault(){},stopPropagation(){}});
const harness=editorHarness('tilemap',{...create2DAsset('tilemap','Stroke'),width:8,height:6}),editor=harness.editor;editor.mapPreview={scale:24,minX:0,top:0};
editor.pointerDown(event(0,0));editor.pointerMove(event(4,4));assert.equal(harness.history.length,1);assert.equal(harness.states.length,0);assert.equal(editor.doc.data.layers[0].tiles.length,5);
editor.pointerUp(event(4,4));assert.equal(harness.states.length,1);assert.equal(harness.captures.size,0);assert.equal(editor.renderCount,undefined,'A brush stroke must retain canvas focus and scroll.');
const after=clone(editor.doc.data);editor.doc.data=clone(harness.history[0]);assert.equal(editor.doc.data.layers[0].tiles.length,0);editor.doc.data=after;
editor.pointerDown(event(0,0));editor.pointerUp(event(0,0));assert.equal(harness.history.length,1);assert.equal(harness.states.length,1);
editor.tool='rectangle';editor.pointerDown(event(5,1));editor.pointerMove(event(6,2));assert.equal(harness.history.length,1);editor.flush();assert.equal(harness.history.length,2);assert.equal(harness.states.length,2);assert.equal(editor.doc.data.layers[0].tiles.length,9);assert.equal(harness.captures.size,0);
editor.pointerDown(event(5,1,2));editor.dispose();assert.equal(editor.doc.data.layers[0].tiles.length,8);assert.equal(harness.states.length,3);assert.equal(editor.disposed,true);
const crop=editorHarness('sprite',sprite);crop.editor.canvas.width=128;crop.editor.canvas.height=96;crop.editor.canvas.getBoundingClientRect=()=>({left:0,top:0,width:128,height:96});
crop.editor.pointerDown({ ...event(0,0),clientX:20,clientY:30 });crop.editor.pointerMove({...event(0,0),clientX:52,clientY:46});crop.editor.flush();assert.deepEqual(crop.editor.doc.data.rect,[20,30,32,16]);assert.equal(crop.history.length,1);assert.equal(crop.states.length,1);

// Canvas coordinates stay in original texture pixels despite bounded preview buffers.
function previewHarness(kind,data,source){
  const {editor}=editorHarness(kind,data),draws=[],scales=[];
  const context={fillRect(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},scale:(...args)=>scales.push(args),drawImage:(...args)=>draws.push(args)};
  delete editor.drawMap;delete editor.drawSprite;editor.source=source;editor.canvas.getContext=()=>context;editor.el.querySelectorAll=()=>[];editor.background=()=>{};
  editor.canvas.getBoundingClientRect=()=>({left:0,top:0,width:editor.canvas.width,height:editor.canvas.height});return {editor,draws,scales};
}
const largePreview=previewHarness('sprite',{...sprite,rect:[0,0,0,0]},{width:8192,height:4096});largePreview.editor.drawSprite();
assert.deepEqual([largePreview.editor.canvas.width,largePreview.editor.canvas.height],[2048,1024]);assert.deepEqual(largePreview.scales,[[.25,.25]]);assert.deepEqual(largePreview.editor.point({clientX:512,clientY:256}),{x:2048,y:1024});
const mapPreview=previewHarness('tilemap',{...create2DAsset('tilemap','Large'),width:256,height:256},{width:128,height:128});mapPreview.editor.drawMap();assert.equal(mapPreview.editor.canvas.width,2048);assert.equal(mapPreview.editor.mapPreview.scale,8);assert.deepEqual(mapPreview.editor.cell({clientX:12,clientY:20}),{x:1,y:2});
const previousDpr=globalThis.devicePixelRatio;try{globalThis.devicePixelRatio=2;const zoomed=previewHarness('tilemap',{...create2DAsset('tilemap','Zoom'),width:4,height:3},{width:128,height:128});zoomed.editor.zoom=2;zoomed.editor.drawMap();assert.deepEqual([zoomed.editor.canvas.width,zoomed.editor.canvas.height],[384,288]);assert.deepEqual(zoomed.scales,[[4,4]]);zoomed.editor.canvas.getBoundingClientRect=()=>({left:0,top:0,width:parseFloat(zoomed.editor.canvas.style.width),height:parseFloat(zoomed.editor.canvas.style.height)});assert.deepEqual(zoomed.editor.cell({clientX:72,clientY:72}),{x:1,y:1},'high-DPI crisp grid must keep logical pointer cells');mapPreview.editor.zoom=8;mapPreview.editor.drawMap();assert.equal(mapPreview.editor.canvas.width,2048,'zoomed high-DPI preview retains its bitmap bound');}finally{if(previousDpr===undefined)delete globalThis.devicePixelRatio;else globalThis.devicePixelRatio=previousDpr;}
const framePreview=previewHarness('spriteanimation',animation,null);Object.assign(framePreview.editor,{token:1,time:0});
let resolveOld,calls=0;framePreview.editor.asset=()=>++calls===1?new Promise(resolve=>resolveOld=resolve):Promise.resolve({...sprite,texture:'New.png'});framePreview.editor.image=async texture=>({width:128,height:96,texture});
const oldDraw=framePreview.editor.drawAnimation();await framePreview.editor.drawAnimation();resolveOld({...sprite,texture:'Old.png'});await oldDraw;
assert.equal(framePreview.draws.length,1);assert.equal(framePreview.draws[0][0].texture,'New.png');const [, , , , ,dx,dy,dw,dh]=framePreview.draws[0];assert.ok(dx>=0&&dy>=0&&dx+dw<=512&&dy+dh<=320,'Animation preview must fit extreme pivots.');

const directory=await mkdtemp(join(tmpdir(),'hbengine-2d-workflow-'));
try{
  const documents=new AssetDocuments();
  for(const [kind,data] of [['sprite',sprite],['tilemap',editor.doc.data],['spriteanimation',animation]]){
    const path='Saved'+twoDSuffix[kind],doc=documents.open(path,kind,data);await documents.save(doc,(path,text)=>writeFile(join(directory,path),text,'utf8'));
    assert.equal(doc.dirty,false);const reopened=new AssetDocuments().open(path,kind,JSON.parse(await readFile(join(directory,path),'utf8')));assert.deepEqual(reopened.data,data);
  }
  const slicing=editorHarness('sprite',{...sprite,name:'Slice',rect:[0,0,64,32]}),created=[];
  slicing.editor.source={width:64,height:32};slicing.editor.slice={width:32,height:32,margin:0,spacing:0};slicing.editor.hooks.createAsset=async(kind,name,data)=>{assert.equal(kind,'sprite');await writeFile(join(directory,name+twoDSuffix[kind]),JSON.stringify(data),'utf8');created.push(name);};
  const button={disabled:false,isConnected:true};await slicing.editor.createSlices(button);assert.deepEqual(created,['Slice_001','Slice_002']);assert.equal(button.disabled,false);assert.deepEqual(JSON.parse(await readFile(join(directory,'Slice_002.hbsprite.json'),'utf8')).rect,[32,0,32,32]);
}finally{await rm(directory,{recursive:true,force:true});}
console.log('2D workflow passed: asset validation, atlas slicing, frame timing, tools/layers/collision, pointer undo/flush, bounded/stale-safe previews, disk save/reopen.');
