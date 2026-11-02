import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import {pathToFileURL} from 'node:url';import {retainTestEvidence} from './test-artifacts.mjs';
const engine=path.resolve(process.argv[2]||'.'),{createNativeAudioContext}=await import(pathToFileURL(path.join(engine,'tools/native-game-platform.mjs'))),work=await fs.mkdtemp('native/build/audio-device-');retainTestEvidence(work);const calls=[],fallback=[];
class Available{constructor(options){calls.push(options);}}
createNativeAudioContext(Available);assert.deepEqual(calls.pop(),{sampleRate:48000,latencyHint:'interactive'});
class MissingDevice{constructor(options){calls.push(options);if(!options.sinkId)throw Error('no output device');}}
assert(createNativeAudioContext(MissingDevice,{onFallback:state=>fallback.push(state)}) instanceof MissingDevice);assert.equal(calls.length,2);assert.deepEqual(calls[1].sinkId,{type:'none'});assert.deepEqual(fallback,[{audible:false,reason:'no output device'}]);calls.length=0;
createNativeAudioContext(MissingDevice,{silent:true});assert.equal(calls.length,1);assert.deepEqual(calls[0].sinkId,{type:'none'});
class Broken{constructor(){throw Error('backend broken');}}
assert.throws(()=>createNativeAudioContext(Broken),error=>error instanceof AggregateError&&error.errors.length===2);assert.throws(()=>createNativeAudioContext(Broken,{silent:true}),/backend broken/);
const report={passed:true,defaultDevice:true,noDeviceFallback:true,explicitSilent:true,bothFailuresPreserved:true,scope:'constructor fault injection; not a physical unplug/replug test'};await fs.writeFile(work+'/acceptance.json',JSON.stringify(report,null,2));console.log(JSON.stringify({work,...report}));
