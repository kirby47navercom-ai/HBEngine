import fs from 'node:fs/promises';
import path from 'node:path';
import {engine169Fixture} from './engine-169-fixture.mjs';
import {parseNativeHeader} from '../prototype/native-model.js';
import {createAsset} from '../prototype/asset-documents.js';
export async function engine170Fixture(dir){
 const f=await engine169Fixture(dir),{record}=f,assetPath=record.manifest.startupBlueprint,bp=JSON.parse(await fs.readFile((await record.project.read(assetPath)).file,'utf8'));
 const header=bp.native.header.replace('};','HB_PROPERTY(BlueprintReadWrite) int realVoices=0; HB_PROPERTY(BlueprintReadWrite) int virtualVoices=0; HB_FUNCTION(BlueprintCallable) void StartVoices(); HB_FUNCTION(BlueprintCallable) void ReadVoices(); HB_FUNCTION(BlueprintCallable) void RotateBody();};');
 const source=bp.native.source+'\nvoid AuthoringProbe::StartVoices(){hb::Audio::SetVoiceBudget(this,2,32);for(int i=0;i<8;++i){auto h=hb::Audio::Play("Assets/Silent.wav");if(i==7)hb::Audio::SetPriority(h,0);}}void AuthoringProbe::ReadVoices(){realVoices=hb::Audio::GetRealVoiceCount(this);virtualVoices=hb::Audio::GetVirtualVoiceCount(this);}void AuthoringProbe::RotateBody(){auto rig=hb::Scene::FindActorById("IK");hb::AnimationGraph::SetIKEffectorActor(rig,"BodySolve","Hand",nullptr);hb::AnimationGraph::SetIKEffectorWeight(rig,"BodySolve","Elbow",0);hb::AnimationGraph::SetIKEffectorTarget(rig,"BodySolve","Hand",{5,0,0});hb::AnimationGraph::SetIKEffectorRotation(rig,"BodySolve","Hand",{0,0,90});hb::AnimationGraph::SetIKEffectorRotationWeight(rig,"BodySolve","Hand",1);hb::AnimationGraph::SetIKRootSettings(rig,"BodySolve","prePull",1,2);}';
 bp.native={...parseNativeHeader(header),header,source,headerPath:bp.native.headerPath,sourcePath:bp.native.sourcePath};await record.project.write(assetPath,JSON.stringify(bp));await record.project.write(bp.native.headerPath,header);await record.project.write(bp.native.sourcePath,source);
 const length=48000*8,wav=Buffer.alloc(44+length*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(48000,24);wav.writeUInt32LE(96000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(length*2,40);await fs.writeFile(path.join(record.root,'Assets/Silent.wav'),wav);
 const mesh={version:1,name:'UVQuad',vertices:[[0,0,0],[2,0,0],[2,1,0],[0,1,0]],indices:[0,1,2,0,2,3],uvs:[[0,0],[2,0],[2,1],[0,1]]};await record.project.write('Assets/SM_UV.hbmesh.json',JSON.stringify(mesh));
 return {...f,blueprint:bp};
}
