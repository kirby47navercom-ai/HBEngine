// Native audio: a clip marked for streaming that is MP3/Ogg plays through full decode instead of failing,
// and other non-WAV media are still refused for streaming.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {OfflineAudioContext} from 'node-web-audio-api';
import {createAudioMixer} from '../prototype/audio-mixer.js';
import {nativeAudioRouting} from './native-game-platform.mjs';

const dir=await fs.mkdtemp(path.join(os.tmpdir(),'hb-compressed-audio-'));
try{
  const results={};
  for(const ext of ['mp3','ogg']){
    const file=path.join(dir,'tone.'+ext);
    try{execFileSync('ffmpeg',['-loglevel','error','-y','-f','lavfi','-i','sine=frequency=440:duration=0.5','-ac','1',...(ext==='ogg'?['-c:a','libvorbis']:[]),file]);}catch{results[ext]='skipped (no ffmpeg)';continue;}
    const bytes=await fs.readFile(file),originalFetch=globalThis.fetch;
    globalThis.fetch=async url=>String(url).includes('Song.'+ext)?new Response(bytes):originalFetch(url);
    try{
      const context=new OfflineAudioContext(1,24000,48000),routing=nativeAudioRouting({readAsset:async()=>createAudioMixer('Native'),stream:async()=>{throw Error('range streaming must not be used for '+ext);}},()=>context);
      const voice=await routing.player('hbasset:'+encodeURIComponent('Assets/Song.'+ext),{streaming:true});
      assert.ok(voice,'compressed clip plays');results[ext]='decoded';voice.dispose?.();voice.stop?.();routing.dispose();
    }finally{globalThis.fetch=originalFetch;}
  }
  const routing=nativeAudioRouting({readAsset:async()=>createAudioMixer('Native'),stream:async()=>new Uint8Array()},()=>new OfflineAudioContext(1,4800,48000));
  await assert.rejects(routing.player('hbasset:Assets/Clip.aiff',{streaming:true}),/WAV·MP3·Ogg·FLAC/);routing.dispose();
  console.log(JSON.stringify({passed:true,results}));
}finally{await fs.rm(dir,{recursive:true,force:true});}
