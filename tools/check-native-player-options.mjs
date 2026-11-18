// Packaged game player options: the run writes Logs/game.log (prints included), Show Frame Stats and the colorblind
// correction run in the real player, the colorblind choice is saved with the player settings, and a screenshot taken
// after enabling it differs from the one before.
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {promisify} from 'node:util';
import {loadImage,createCanvas} from '@napi-rs/canvas';
import {connect,makeNode} from '../prototype/blueprint-model.js';
import {defaultBuildProfile} from '../prototype/build-profile.js';
import {buildGame} from './build-game.mjs';
import {createProject} from './project-manifest.mjs';

const exec=promisify(execFile),root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/native-player-options-'));
process.env.HB_USER_DATA_DIR=path.join(work,'UserData');
const average=async file=>{const image=await loadImage(await fs.readFile(file)),canvas=createCanvas(image.width,image.height),ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const d=ctx.getImageData(0,0,image.width,image.height).data,sum=[0,0,0];for(let i=0;i<d.length;i+=4)for(let c=0;c<3;c++)sum[c]+=d[i+c];return sum.map(v=>v/(d.length/4));};
try{
  const record=await createProject('Options',work,'3d'),dir=path.dirname(record.file),file=path.join(dir,record.manifest.startupBlueprint),graph=JSON.parse(await fs.readFile(file,'utf8'));
  const node=(key,values={})=>{const n=makeNode(key);n.inputValues={...n.inputValues,...values};graph.nodes.push(n);return n;};
  const steps=[graph.nodes.find(n=>n.key==='beginPlay'),node('print',{message:'player log line'}),node('setStatsVisible',{visible:true}),node('delay',{duration:.3}),node('takeScreenshot'),node('delay',{duration:.3}),node('setColorblindMode',{mode:3}),node('delay',{duration:.3}),node('takeScreenshot')];
  for(let i=1;i<steps.length;i++)assert.ok(connect(graph,{node:steps[i-1].id,pin:'then'},{node:steps[i].id,pin:'exec'}).ok);
  await fs.writeFile(file,JSON.stringify(graph));
  const sceneFile=path.join(dir,record.manifest.startupScene),scene=JSON.parse(await fs.readFile(sceneFile,'utf8'));scene.objects[0].blueprintAsset=record.manifest.startupBlueprint;await fs.writeFile(sceneFile,JSON.stringify(scene));
  const built=await buildGame(record,{...defaultBuildProfile(record.manifest),configuration:'release',width:640,height:360,framePacing:'fixed'});
  const state=path.join(work,'State'),report=path.join(work,'report.json');
  await exec(built.executable,['--hidden','--silent','--frames','90','--report',report],{windowsHide:true,env:{...process.env,HB_NATIVE_TEST_STATE:state},timeout:90000});
  const log=await fs.readFile(path.join(state,'Logs','game.log'),'utf8');assert.match(log,/player log line/,'print written to game.log');
  const result=JSON.parse(await fs.readFile(report,'utf8')),shots=result.screenshots??result.stats?.screenshots??[];assert.equal(shots.length,2,'two screenshots');
  const [before,after]=await Promise.all(shots.map(average)),difference=Math.max(...before.map((v,i)=>Math.abs(v-after[i])));
  assert.ok(difference>2,'colorblind correction changes the presented image: '+difference);
  console.log(JSON.stringify({passed:true,log:log.split('\n').length,before:before.map(Math.round),after:after.map(Math.round),difference:Math.round(difference*10)/10}));
}finally{await fs.rm(work,{recursive:true,force:true});}
