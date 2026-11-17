// Runtime window settings: Set Window Resolution / Set VSync / Set Fullscreen / Set Show Mouse Cursor / Set Max FPS (500 clamps to 240) nodes reach the platform host in order.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {connect,makeNode} from '../prototype/blueprint-model.js';
import {createProject} from './project-manifest.mjs';
import {runProject} from './run-project.mjs';

const root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/window-settings-'));
process.env.HB_USER_DATA_DIR=path.join(work,'UserData');
try{
  const record=await createProject('WindowSettings',work,'3d'),dir=path.dirname(record.file),file=path.join(dir,record.manifest.startupBlueprint),graph=JSON.parse(await fs.readFile(file,'utf8'));
  const size=makeNode('setResolution'),sync=makeNode('setVSync'),full=makeNode('setFullscreen'),cursor=makeNode('setMouseCursorVisible'),fps=makeNode('setMaxFps');fps.inputValues={fps:500};size.inputValues={width:800,height:600};sync.inputValues={enabled:false};full.inputValues={fullscreen:true};cursor.inputValues={visible:false};graph.nodes.push(size,sync,full,cursor,fps);
  const begin=graph.nodes.find(n=>n.key==='beginPlay');
  for(const [from,to] of [[begin,size],[size,sync],[sync,full],[full,cursor],[cursor,fps]])assert.ok(connect(graph,{node:from.id,pin:'then'},{node:to.id,pin:'exec'}).ok);
  await fs.writeFile(file,JSON.stringify(graph));
  const sceneFile=path.join(dir,record.manifest.startupScene),scene=JSON.parse(await fs.readFile(sceneFile,'utf8'));scene.objects[0].blueprintAsset=record.manifest.startupBlueprint;await fs.writeFile(sceneFile,JSON.stringify(scene));
  const requests=[];await runProject(record.file,{frames:2,onWindow:s=>{requests.push(s);}});
  assert.deepEqual(requests,[{width:800,height:600},{vsync:false},{fullscreen:true},{cursorVisible:false},{maxFps:240}]);
  size.inputValues={width:10,height:10};await fs.writeFile(file,JSON.stringify(graph));
  await assert.rejects(runProject(record.file,{frames:2,onWindow:()=>{}}),/해상도/);
  console.log(JSON.stringify({passed:true,requests}));
}finally{await fs.rm(work,{recursive:true,force:true});}
