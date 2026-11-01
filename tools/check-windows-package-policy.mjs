import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {windowsSigningSettings,executableSignature,signWindowsPackage} from './windows-package-signing.mjs';
import {portableWindowsRuntime} from './windows-portable-runtime.mjs';
import {packagedModuleError} from './packaged-module-error.mjs';
import {validBuildProfile,defaultBuildProfile} from '../prototype/build-profile.js';
import {WidgetSystem} from '../prototype/ui-runtime.js';
import {createWidgetAsset,createWidgetNode} from '../prototype/ui-assets.js';

const work=await fs.mkdtemp(path.resolve('native/build/package-policy-'));
const profile=defaultBuildProfile({name:'Policy',startupScene:'Assets/Scene.hbscene.json'});
assert(validBuildProfile(profile));const releaseSettings=windowsSigningSettings({...profile,configuration:'release'},{});assert.equal(releaseSettings.thumbprint,'');const unsigned=await signWindowsPackage([],releaseSettings);assert.equal(unsigned.state,'unsigned');assert.equal(unsigned.distributionReady,true);assert.equal(unsigned.antivirusVerdict,'not-tested-on-recipient-PC');
assert.equal(windowsSigningSettings(profile,{}).thumbprint,'');assert(!validBuildProfile({...profile,windowsSigning:{certificateThumbprint:'not-a-certificate'}}));
assert(!validBuildProfile({...profile,windowsSigning:{certificateThumbprint:'a'.repeat(40),timestampServer:'file:///bad'}}));
assert.throws(()=>windowsSigningSettings({...profile,windowsSigning:{timestampServer:'https://name:password@example.com'}},{}));
const signature=await executableSignature(path.resolve('dist/HBEngine/runtime/node.exe'));assert.equal(signature.status,'Valid');
await assert.rejects(signWindowsPackage([],{thumbprint:'0'.repeat(40),timestampServer:'http://timestamp.digicert.com'}));
const vc=await portableWindowsRuntime(path.resolve('dist/HBEngine'));assert.equal(vc.signature.status,'Valid');assert.equal(vc.target,'runtime/vcruntime140.dll');
for(const [code,expected] of [['ENOENT','HB_PACKAGE_MODULE_MISSING'],['UNKNOWN','HB_PACKAGE_MODULE_BLOCKED'],['EACCES','HB_PACKAGE_MODULE_BLOCKED']]){const error=packagedModuleError('Binaries/test.exe',{code});assert.equal(error.code,expected);assert.match(error.message,/백신|Windows 보안/);assert.match(error.message,/Binaries/);}
const ordinary=Error('ordinary');assert.equal(packagedModuleError('test',ordinary),ordinary);
const owner={id:'owner',components:[]},system=new WidgetSystem(),vm={objects:[owner],object:id=>id==='owner'?owner:null,bindings:[],core:{delta:.1}};
const states=['HUD','Front'].map(instance=>{const data=createWidgetAsset(instance);for(let i=0;i<70;i++){const node=createWidgetNode('Text','node'+i);node.name='node'+i;node.properties.text='Original '+i;data.nodes.push(node);}let updates=0;const state={owner:'owner',instance,data,view:{update(){updates++;},endFrame(){},dispose(){}},updates:()=>updates};system.instances.set(system.key('owner',instance),state);system.sync(state,vm);return state;});
const old=owner.gameplayDebug.ui,peer=old.Front;states[0].data.nodes[1].properties.text='Changed';system.sync(states[0],vm);assert.equal(owner.gameplayDebug.ui.Front,peer);assert.equal(old.HUD.node0.text,'Original 0');assert.equal(owner.gameplayDebug.ui.HUD.node0.text,'Changed');assert(Object.isFrozen(owner.gameplayDebug.ui));
for(const node of states[0].data.nodes.slice(1))system.animations.set(node.id,{state:states[0],node,property:'opacity',from:1,to:0,duration:1,elapsed:0});
await system.tick(vm);assert.equal(states[0].updates(),1);assert.equal(owner.gameplayDebug.ui.Front,peer);assert.equal(owner.gameplayDebug.ui.HUD.node0.opacity,.9);system.dispose();
const result={passed:true,signedVendorRuntime:signature.status,vcRuntime:{sha256:vc.sha256,status:vc.signature.status},releaseWithoutCertificateAllowed:true,unsignedPackageStatus:unsigned.state,invalidConfiguredCertificateRejected:true,missingAndBlockedModuleDiagnostics:true,animatedNodes:70,instanceRefreshes:1,unchangedPeerSnapshotReused:true,oldSnapshotsImmutable:true};await fs.writeFile(path.join(work,'acceptance.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({work,...result}));
