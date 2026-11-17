// Take Screenshot in a packaged native game: Begin Play asks for a screenshot; the runner writes a PNG of the presented frame
// under the game state folder (Screenshots/Screenshot_*.png) and lists it in the report.
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {promisify} from 'node:util';
import {connect,makeNode} from '../prototype/blueprint-model.js';
import {defaultBuildProfile} from '../prototype/build-profile.js';
import {buildGame} from './build-game.mjs';
import {createProject} from './project-manifest.mjs';

const exec=promisify(execFile),root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/native-screenshot-'));
process.env.HB_USER_DATA_DIR=path.join(work,'UserData');
try{
  const record=await createProject('Shot',work,'3d'),dir=path.dirname(record.file),file=path.join(dir,record.manifest.startupBlueprint),graph=JSON.parse(await fs.readFile(file,'utf8'));
  const node=makeNode('takeScreenshot');graph.nodes.push(node);
  const begin=graph.nodes.find(n=>n.key==='beginPlay');assert.ok(connect(graph,{node:begin.id,pin:'then'},{node:node.id,pin:'exec'}).ok);await fs.writeFile(file,JSON.stringify(graph));
  const sceneFile=path.join(dir,record.manifest.startupScene),scene=JSON.parse(await fs.readFile(sceneFile,'utf8'));scene.objects[0].blueprintAsset=record.manifest.startupBlueprint;await fs.writeFile(sceneFile,JSON.stringify(scene));
  const built=await buildGame(record,{...defaultBuildProfile(record.manifest),configuration:'release',width:640,height:360,framePacing:'fixed'});
  const report=path.join(work,'report.json'),started=performance.now();
  await exec(built.executable,['--hidden','--silent','--frames','60','--report',report],{windowsHide:true,env:{...process.env,HB_NATIVE_TEST_STATE:path.join(work,'State')},timeout:60000});
  const result=JSON.parse(await fs.readFile(report,'utf8')),shots=result.screenshots??result.stats?.screenshots??[];
  assert.equal(shots.length,1,'one screenshot: '+JSON.stringify(Object.keys(result)));
  const png=await fs.readFile(shots[0]);assert.equal(png.subarray(1,4).toString('latin1'),'PNG');assert.ok(png.readUInt32BE(16)>=320&&png.readUInt32BE(20)>=180,'image size');
  assert.ok(shots[0].includes('Screenshots'),'saved under Screenshots');
  console.log(JSON.stringify({passed:true,width:png.readUInt32BE(16),height:png.readUInt32BE(20),bytes:png.length}));
}finally{await fs.rm(work,{recursive:true,force:true});}
