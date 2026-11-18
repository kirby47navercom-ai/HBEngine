// Line Trace ignore list (self / actors), Get Action Keys after rebinding, Get Supported Resolutions (headless default),
// Was Recently Rendered returns a bool, Set Mouse Cursor Image sends the image bytes and hotspot to the platform window.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createCanvas} from '@napi-rs/canvas';
import {connect,makeNode} from '../prototype/blueprint-model.js';
import {createProject} from './project-manifest.mjs';
import {runProject} from './run-project.mjs';

const root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/utility-nodes-4-'));
process.env.HB_USER_DATA_DIR=path.join(work,'UserData');
try{
  const record=await createProject('Utility4',work,'3d'),dir=path.dirname(record.file),file=path.join(dir,record.manifest.startupBlueprint),graph=JSON.parse(await fs.readFile(file,'utf8'));
  const canvas=createCanvas(16,16),ctx=canvas.getContext('2d');ctx.fillStyle='#ff0000';ctx.fillRect(0,0,16,16);await fs.mkdir(path.join(dir,'Assets/UI'),{recursive:true});await fs.writeFile(path.join(dir,'Assets/UI/Cursor.png'),canvas.toBuffer('image/png'));
  const cursor=makeNode('setMouseCursorImage');cursor.inputValues={...cursor.inputValues,texture:'Assets/UI/Cursor.png',hotspotX:3,hotspotY:4};graph.nodes.push(cursor);
  assert.ok(connect(graph,{node:graph.nodes.find(n=>n.key==='beginPlay').id,pin:'then'},{node:cursor.id,pin:'exec'}).ok);await fs.writeFile(file,JSON.stringify(graph));
  const sceneFile=path.join(dir,record.manifest.startupScene),scene=JSON.parse(await fs.readFile(sceneFile,'utf8'));scene.objects[0].blueprintAsset=record.manifest.startupBlueprint;await fs.writeFile(sceneFile,JSON.stringify(scene));
  const windows=[];const result={};
  await runProject(record.file,{frames:3,onWindow:w=>windows.push(w),beforeFrame:async(frame,vm,services)=>{if(frame!==2)return;const b=vm.bindings[0],op=(k,a)=>services.operation(k,a,b,vm);
    const first=(await op('lineTrace',{start:[0,20,0],end:[0,-20,0]})).hit;result.first=first;if(first.hit)result.second=(await op('lineTrace',{start:[0,20,0],end:[0,-20,0],ignore:[first.actor]})).hit;
    result.self=(await op('lineTrace',{start:[0,20,0],end:[0,-20,0],ignoreSelf:true})).hit;
    b.input.addContext('check',{mappings:[{action:'Jump',key:'Space',axis:0,scale:1},{action:'Jump',key:'e',axis:0,scale:1}]},10);result.keys=(await op('getActionKeys',{action:'Jump'})).return;
    await op('inputRebindKey',{action:'Jump',oldKey:'e',newKey:'F'});result.rebound=(await op('getActionKeys',{action:'Jump'})).return;await op('inputResetBindings',{});
    result.modes=(await op('getSupportedResolutions',{})).return;result.rendered=(await op('wasRecentlyRendered',{target:b.self})).return;}});
  assert.ok(result.first.hit,'something under the start point');assert.notEqual(result.second?.actor,result.first.actor,'ignored actor skipped: '+JSON.stringify(result));
  if(result.first.actor===scene.objects[0].id)assert.notEqual(result.self.actor,scene.objects[0].id,'ignore self');
  assert.deepEqual(result.keys,['Space','E']);assert.deepEqual(result.rebound,['Space','F'],'rebinding shows the new key');
  assert.ok(result.modes.length>=1&&result.modes.every(m=>m.length===2));assert.equal(typeof result.rendered,'boolean');
  const sent=windows.find(w=>w.cursorImage);assert.ok(sent&&sent.cursorImage.image?.length>0&&sent.cursorImage.hotX===3&&sent.cursorImage.hotY===4,'cursor image to the window: '+JSON.stringify(windows.map(Object.keys)));
  console.log(JSON.stringify({passed:true,first:result.first.actor,second:result.second?.actor,keys:result.rebound}));
}finally{await fs.rm(work,{recursive:true,force:true});}
