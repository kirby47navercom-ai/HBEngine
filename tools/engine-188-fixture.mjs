import {createProject} from './project-manifest.mjs';
import {createAsset,assetSuffix,validAsset} from '../prototype/asset-documents.js';
import {makeMaterialNode} from '../prototype/material-runtime.js';
import {makeAnimationNotifyState} from '../prototype/animation-sync.js';
export async function engine188Fixture(dir){
 const record=await createProject('Shortcuts188-'+Date.now(),dir,'2d'),paths={};
 for(const kind of ['material','materialfunction','curve','animation','animgraph','behaviortree','statemachine','montage','sequenceasset','spriterig','tilemap','sprite','spriteanimation']){
  const data=createAsset(kind,'QA_'+kind);
  if(kind==='materialfunction')data.graph.nodes.push(makeMaterialNode('scalar',250,250));
  if(kind==='montage')data.notifyStates=[makeAnimationNotifyState('Window',.2,.4)];
  if(!validAsset(kind,data))throw Error('Invalid shortcut fixture: '+kind);
  const file='Assets/QA_'+kind+assetSuffix[kind];await record.project.write(file,JSON.stringify(data,null,2));paths[kind]=file;
 }
 return {record,paths};
}
