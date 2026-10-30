import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pathToFileURL} from 'node:url';
import {createCanvas} from '@napi-rs/canvas';
import {createProject} from './project-manifest.mjs';
import {createPlacedObject} from '../prototype/placement-catalog.js';
import {createAsset} from '../prototype/asset-documents.js';
import {makeSceneComponent} from '../prototype/scene-components.js';
import {defaultBuildProfile} from '../prototype/build-profile.js';
import {makeNode,connect} from '../prototype/blueprint-model.js';
import {parseNativeHeader} from '../prototype/native-model.js';
import {retainTestEvidence} from './test-artifacts.mjs';

const root=path.resolve(import.meta.dirname,'..'),engine=process.argv[2]?path.resolve(process.argv[2]):root;
const {buildGame}=await import(pathToFileURL(path.join(engine,'tools/build-game.mjs')));
const work=await fs.mkdtemp(path.join(root,'native/build/native-tiled-'));retainTestEvidence(work);
const exec=promisify(execFile),record=await createProject('네이티브 반복 타일',path.join(work,'Project'),'2d');
const write=(name,value)=>record.project.write(name,JSON.stringify(value));
const art='<rect width="16" height="16" fill="red"/><rect x="16" width="16" height="16" fill="lime"/><rect y="16" width="16" height="16" fill="blue"/><rect x="16" y="16" width="16" height="16" fill="yellow"/>';
await record.project.write('Assets/tile.svg','<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">'+art+'</svg>');
await record.project.write('Assets/atlas.svg','<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32"><rect width="64" height="32" fill="magenta"/><g transform="translate(32)">'+art+'</g></svg>');
await write('Assets/crop.hbsprite.json',{...createAsset('sprite','Crop'),texture:'Assets/atlas.svg',pixelsPerUnit:32,rect:[32,0,32,32]});
const header='#include <HBEngine/Game.hpp>\nHB_CLASS(Blueprintable) class NativeTile : public hb::Actor { public: HB_FUNCTION(BlueprintCallable) void Resize(hb::Actor* target); HB_FUNCTION(BlueprintCallable) void Mode(hb::Actor* target); };';
const source='#include "NativeTile.h"\nvoid NativeTile::Resize(hb::Actor* target){hb::Sprites::SetSize(target,hb::Vec2{4.5f,2.5f});}\nvoid NativeTile::Mode(hb::Actor* target){hb::Components::SetString(target,"SpriteRenderer","drawMode","tiled");}';
const bp=createAsset('blueprint','BP_Tile');bp.native={...parseNativeHeader(header),headerPath:'Source/NativeTile.h',sourcePath:'Source/NativeTile.cpp'};bp.settings.parentClass='NativeTile';bp.construction={nodes:[],edges:[],comments:[]};
let previous='beginPlay';for(const [method,target] of [['Resize','case6'],['Mode','case7']]){const call=makeNode('nativeCall');call.nativeId='NativeTile.'+method;call.inputValues={target};bp.nodes.push(call);assert.ok(connect(bp,{node:previous,pin:'then'},{node:call.id,pin:'exec'}).ok);previous=call.id;}
await record.project.write('Source/NativeTile.h',header);await record.project.write('Source/NativeTile.cpp',source);await write('Assets/BP_Tile.hbblueprint.json',bp);
const scene=JSON.parse(await fs.readFile((await record.project.read(record.manifest.startupScene)).file,'utf8'));
scene.environment.sunEnabled=false;scene.environment.skyEnabled=false;
const cases=[{mode:'simple'},{mode:'tiled'},{mode:'tiled',origin:'topLeft'},{mode:'tiled',crop:true},{mode:'tiled',flipX:true},{mode:'tiled',flipY:true},{mode:'tiled',resize:true},{mode:'tiled',changeMode:true}];
scene.objects=[{...createPlacedObject('empty',{id:'Director'}),blueprintAsset:'Assets/BP_Tile.hbblueprint.json'},{...createPlacedObject('camera',{id:'Camera'}),position:[0,0,10],components:[makeSceneComponent('Camera',{main:true,projection:'orthographic',orthographicSize:6})]},...cases.map((c,i)=>({...createPlacedObject('sprite',{id:'case'+i}),position:[-9+6*(i%4),i<4?3:-3,0],components:[makeSceneComponent('SpriteRenderer',{texture:c.crop?'':'Assets/tile.svg',sprite:c.crop?'Assets/crop.hbsprite.json':'',pixelsPerUnit:32,useCustomSize:true,width:c.resize?1:4.5,height:c.resize?1:2.5,drawMode:c.changeMode?'simple':c.mode,tileOrigin:c.origin||'bottomLeft',flipX:!!c.flipX,flipY:!!c.flipY,shading:'unlit',toneMapping:'display'})]}))];
await write(record.manifest.startupScene,scene);
const built=await buildGame(record,{...defaultBuildProfile(record.manifest),width:960,height:480});
const report=path.join(work,'runtime.json');await exec(built.executable,['--hidden','--silent','--frames','4','--report',report],{windowsHide:true,timeout:90000,maxBuffer:1000000,env:{...process.env,HB_NATIVE_TEST_STATE:path.join(work,'State')}});
const result=JSON.parse(await fs.readFile(report,'utf8')),rgba=await fs.readFile(report+'.rgba');assert.equal(rgba.length,960*480*4);assert.equal(result.frames,4);assert.equal(result.webview,false);
const palette=[[0,0,255],[255,255,0],[255,0,0],[0,255,0]],checks=[];
for(const [i,c] of cases.entries()){
 const errors=[];let samples=0;
 for(const x of [-1.95,-1.65,-.95,-.65,.05,.35,1.05,1.35,1.95])for(const y of [-.95,-.65,.05,.35,.95]){
  const worldX=-9+6*(i%4)+x,worldY=(i<4?3:-3)+y,px=Math.floor((worldX+12)*40),py=Math.floor((6-worldY)*40);
  // Derive the expected texel from the pixel center, independent of engine UVs.
  const localX=(px+.5)/40-12-(-9+6*(i%4)),localY=6-(py+.5)/40-(i<4?3:-3);
  const sx=(c.flipX?-localX:localX)+2.25,sy=(c.flipY?-localY:localY)+1.25;
  const fract=v=>v-Math.floor(v),u=c.mode==='simple'?sx/4.5:fract(sx),v=c.mode==='simple'?sy/2.5:c.origin==='topLeft'?1-fract(2.5-sy):fract(sy);
  const expected=palette[(v>=.5?2:0)+(u>=.5?1:0)],actual=[...rgba.subarray((py*960+px)*4,(py*960+px)*4+3)];samples++;
  if(actual.some((n,j)=>Math.abs(n-expected[j])>5))errors.push({pixel:[px,py],actual,expected});
 }
 checks.push({case:i,...c,samples,errors:errors.length,examples:errors.slice(0,3)});
}
const canvas=createCanvas(960,480),ctx=canvas.getContext('2d'),image=ctx.createImageData(960,480);image.data.set(rgba);ctx.putImageData(image,0,0);await fs.writeFile(path.join(work,'capture.png'),canvas.toBuffer('image/png'));
const receipt={passed:checks.every(c=>!c.errors),engine,work,frames:result.frames,renderer:result.renderer,checks};await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify({passed:receipt.passed,engine,work,checks,draws:result.renderer.info.calls,meshes:result.renderer.meshes,automaticReadbacks:result.renderer.automaticReadbacks}));assert.ok(receipt.passed,'native sprite pixels must match tile size, crop, flip and C++ writes');
