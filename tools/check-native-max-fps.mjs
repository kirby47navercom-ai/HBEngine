// Set Max FPS in a packaged native game: Begin Play asks for 30 FPS; the native player's report shows the applied frame rate
// and ~30 frames per second of wall time instead of the project's 120.
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {promisify} from 'node:util';
import {connect,makeNode} from '../prototype/blueprint-model.js';
import {defaultBuildProfile} from '../prototype/build-profile.js';
import {buildGame} from './build-game.mjs';
import {createProject} from './project-manifest.mjs';

const exec=promisify(execFile),root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/native-max-fps-'));
process.env.HB_USER_DATA_DIR=path.join(work,'UserData');
try{
  const record=await createProject('MaxFps',work,'3d'),dir=path.dirname(record.file),file=path.join(dir,record.manifest.startupBlueprint),graph=JSON.parse(await fs.readFile(file,'utf8'));
  const node=makeNode('setMaxFps');node.inputValues={fps:30};graph.nodes.push(node);
  const begin=graph.nodes.find(n=>n.key==='beginPlay');assert.ok(connect(graph,{node:begin.id,pin:'then'},{node:node.id,pin:'exec'}).ok);await fs.writeFile(file,JSON.stringify(graph));
  const sceneFile=path.join(dir,record.manifest.startupScene),scene=JSON.parse(await fs.readFile(sceneFile,'utf8'));scene.objects[0].blueprintAsset=record.manifest.startupBlueprint;await fs.writeFile(sceneFile,JSON.stringify(scene));
  const built=await buildGame(record,{...defaultBuildProfile(record.manifest),configuration:'release',width:640,height:360,framePacing:'fixed'});
  const report=path.join(work,'report.json'),started=performance.now();
  await exec(built.executable,['--hidden','--silent','--frames','60','--report',report],{windowsHide:true,env:{...process.env,HB_NATIVE_TEST_STATE:path.join(work,'State')},timeout:60000});
  const seconds=(performance.now()-started)/1000,result=JSON.parse(await fs.readFile(report,'utf8')),rate=result.frameRate??result.stats?.frameRate;
  assert.equal(rate,30,'applied frame rate: '+JSON.stringify(Object.keys(result)));
  assert.ok(seconds>1.5,'60 frames at 30 FPS take about 2 s, took '+seconds.toFixed(2));
  console.log(JSON.stringify({passed:true,rate,seconds:+seconds.toFixed(2)}));
}finally{await fs.rm(work,{recursive:true,force:true});}
