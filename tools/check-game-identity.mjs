// Windows game identity: the build profile's version goes into the exe version resource, its .ico becomes the exe icon,
// and its splash image ships next to the exe and is named in the package manifest. Invalid values are refused.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {defaultBuildProfile,validBuildProfile} from '../prototype/build-profile.js';
import {buildGame} from './build-game.mjs';
import {createProject} from './project-manifest.mjs';

const root=path.resolve(import.meta.dirname,'..'),work=await fs.mkdtemp(path.join(root,'native/build/game-identity-'));
process.env.HB_USER_DATA_DIR=path.join(work,'UserData');
try{
  const record=await createProject('Identity',work,'3d');
  await record.project.mkdir('Assets/Branding');
  const dir=path.dirname(record.file);
  await fs.copyFile(path.join(root,'native/build/HBEngine.ico'),path.join(dir,'Assets/Branding/Game.ico'));
  const {createCanvas}=await import('@napi-rs/canvas');const canvas=createCanvas(320,180),g=canvas.getContext('2d');g.fillStyle='#2266cc';g.fillRect(0,0,320,180);await fs.writeFile(path.join(dir,'Assets/Branding/Splash.png'),canvas.toBuffer('image/png'));
  const profile={...defaultBuildProfile(record.manifest),configuration:'release',windowsVersion:'1.2.3',windowsIcon:'Assets/Branding/Game.ico',splash:'Assets/Branding/Splash.png'};
  assert.ok(validBuildProfile(profile));for(const bad of [{windowsVersion:'1.x'},{windowsIcon:'Assets/a.png'},{splash:'../s.png'}])assert.equal(validBuildProfile({...profile,...bad}),false,JSON.stringify(bad));
  const built=await buildGame(record,profile),manifest=JSON.parse(await fs.readFile(path.join(built.output,'game.hbpack.json'),'utf8'));
  assert.equal(manifest.splash,'splash.png');assert.ok((await fs.stat(path.join(built.output,'splash.png'))).size>0,'splash shipped');assert.equal(manifest.gameVersion,'1.2.3');
  const exe=built.executable,ps=execFileSync('powershell',['-NoProfile','-Command',`$v=(Get-Item -LiteralPath '${exe.replace(/'/g,"''")}').VersionInfo;"$($v.FileVersion)|$($v.ProductName)";Add-Type -AssemblyName System.Drawing;[System.Drawing.Icon]::ExtractAssociatedIcon('${exe.replace(/'/g,"''")}').Width`],{encoding:'utf8'}).trim().split(/\r?\n/);
  assert.equal(ps[0],'1.2.3|'+profile.productName,'version resource');assert.ok(Number(ps[1])>0,'icon present');
  console.log(JSON.stringify({passed:true,version:ps[0],icon:ps[1],output:built.output}));
}finally{await fs.rm(work,{recursive:true,force:true});}
