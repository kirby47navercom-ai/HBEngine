// Content browser thumbnails: a mesh and a material render to cached PNGs (new file after an edit), other kinds get none.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createAsset} from '../prototype/asset-documents.js';
import {evaluateMaterial} from '../prototype/material-runtime.js';
import {assetThumbnail} from './asset-thumbnails.mjs';
import {createProject} from './project-manifest.mjs';

const root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/asset-thumbnails-'));
process.env.HB_USER_DATA_DIR=path.join(work,'UserData');
try{
  const record=await createProject('Thumbs',work,'3d'),folder=path.join(work,'Thumbs-cache');
  await record.project.write('Assets/SM_Box.hbmesh.json',JSON.stringify(createAsset('mesh','Box')));
  await record.project.write('Assets/M_Red.hbmaterial.json',JSON.stringify(createAsset('material','Red')));
  const options={readMaterial:async data=>evaluateMaterial(data)};
  const mesh=await assetThumbnail(record.project,'Assets/SM_Box.hbmesh.json',folder,options),material=await assetThumbnail(record.project,'Assets/M_Red.hbmaterial.json',folder,options);
  for(const file of [mesh,material]){const png=await fs.readFile(file);assert.deepEqual([...png.subarray(1,4)],[0x50,0x4e,0x47],'PNG written');assert.ok(png.length>300,'has content');}
  assert.equal(await assetThumbnail(record.project,'Assets/SM_Box.hbmesh.json',folder,options),mesh,'cached');
  await new Promise(r=>setTimeout(r,20));const edited={...createAsset('mesh','Box'),vertices:[[0,0,0],[1,0,0],[0,1,0]],indices:[0,1,2],uvs:[[0,0],[1,0],[0,1]]};await record.project.write('Assets/SM_Box.hbmesh.json',JSON.stringify(edited));
  assert.notEqual(await assetThumbnail(record.project,'Assets/SM_Box.hbmesh.json',folder,options),mesh,'edit makes a new thumbnail');
  assert.equal(await assetThumbnail(record.project,record.manifest.startupScene,folder,options),null,'scenes use the type icon');
  console.log(JSON.stringify({passed:true}));
}finally{await fs.rm(work,{recursive:true,force:true});}
