import assert from 'node:assert/strict';
import {componentPropertyVisible,editComponentProperty,validComponentProperties} from '../prototype/scene-components.js';
import {componentInspector} from '../prototype/scene-inspector.js';
import {detailsMarkup} from '../prototype/blueprint-details.js';
import {createAsset} from '../prototype/asset-documents.js';
import {createPlacedObject} from '../prototype/placement-catalog.js';
import {engineOperations} from '../prototype/engine-services.js';
import {engineSchema} from './editor-automation.mjs';
import {assetReferences} from './project-service.mjs';
import {NativeHost} from './native-host.mjs';
import {nativeWorld} from '../prototype/native-model.js';

const lamp=createPlacedObject('spriteLight2d',{id:'lamp'}),world=[lamp],binding={self:lamp.id},vm={objects:world,object:id=>world.find(o=>o.id===id)},services=engineOperations({update(){},mesh(){return null;},physicsOptions:{backend:'legacy'}}),op=(key,args={})=>services.operation(key,{target:lamp.id,...args},binding,vm);
assert.ok(validComponentProperties('Light2D',lamp.components.find(c=>c.type==='Light2D').properties));
for(const p of [{cookieWidth:0},{cookieHeight:Infinity},{cookieSprite:'../outside.json'},{cookieTexture:'http://x/a.png'},{volumeIntensity:1.001},{volumeShadowStrength:-.1},{volumetric:'yes'}])assert.equal(validComponentProperties('Light2D',p),false);
assert.ok(componentPropertyVisible('Light2D','cookieSprite',{lightType:'sprite'}));assert.equal(componentPropertyVisible('Light2D','cookieSprite',{lightType:'point'}),false);assert.equal(componentPropertyVisible('Light2D','volumeIntensity',{lightType:'point',volumetric:false}),false);assert.equal(componentPropertyVisible('Light2D','volumetric',{lightType:'global'}),false);
assert.deepEqual(assetReferences({cookieSprite:'Images/S_Lamp.hbsprite.json',cookieTexture:'Images/Lamp.svg'},'Map.hbscene.json'),['Images/Lamp.svg','Images/S_Lamp.hbsprite.json']);
assert.equal(editComponentProperty('Light2D',{cookieSprite:'Images/S_Lamp.hbsprite.json'},'cookieTexture','Images/Lamp.svg').cookieSprite,'');assert.equal(editComponentProperty('Light2D',{cookieTexture:'Images/Lamp.svg'},'cookieSprite','Images/S_Lamp.hbsprite.json').cookieTexture,'');
const assets=[{path:'Images/Lamp.svg',kind:'texture',name:'Lamp'},{path:'Images/S_Lamp.hbsprite.json',kind:'sprite',name:'Sprite'}],bp=createAsset('blueprint','Cookie');bp.components=[...lamp.components];
for(const html of [componentInspector(lamp,assets),detailsMarkup(bp,bp,{kind:'component',id:lamp.components.find(c=>c.type==='Light2D').id},world,assets)]){assert.ok(html.includes('광원 스프라이트'));assert.ok(html.includes('광원 텍스처'));}
const host=new NativeHost();
try{
  const before=structuredClone(world);for(const [key,args] of [['light2dSetCookieSprite',{sprite:'../outside'}],['light2dSetCookieTexture',{texture:'Assets/A.png',width:0,height:1}],['light2dSetVolume',{enabled:true,intensity:2,shadowStrength:1}]])await assert.rejects(op(key,args));assert.deepEqual(world,before);
  const header='#include <HBEngine/Game.hpp>\nHB_CLASS() class CookieProbe : public hb::Library {public:HB_FUNCTION(BlueprintCallable) static bool Run(hb::Actor* lamp);};';
  const source='bool CookieProbe::Run(hb::Actor* lamp){bool enabled;float intensity,shadow,w,h;hb::Light2D::GetVolumetric(lamp,enabled,intensity,shadow);bool defaults=!enabled&&intensity==.1f&&shadow==1;hb::Light2D::SetType(lamp,"sprite");hb::Light2D::SetCookieSprite(lamp,"Images/S_Lamp.hbsprite.json");bool sprite=hb::Light2D::GetCookieSprite(lamp)=="Images/S_Lamp.hbsprite.json"&&hb::Light2D::GetCookieTexture(lamp).empty();hb::Light2D::SetCookieTexture(lamp,"Images/Lamp.svg",2,3);hb::Light2D::GetCookieSize(lamp,w,h);hb::Light2D::SetVolumetric(lamp,true,.5f,.25f);hb::Light2D::GetVolumetric(lamp,enabled,intensity,shadow);bool bad=false;try{hb::Light2D::SetCookieTexture(lamp,"../outside",1,1);}catch(const std::exception&){bad=true;}return defaults&&sprite&&bad&&hb::Light2D::GetCookieSprite(lamp).empty()&&hb::Light2D::GetCookieTexture(lamp)=="Images/Lamp.svg"&&w==2&&h==3&&enabled&&intensity==.5f&&shadow==.25f;}';
  const build=await host.build(header,source),reply=await host.call(build.token,{key:'nativeCall',nativeId:'CookieProbe.Run',args:{lamp:lamp.id},objects:nativeWorld(world,new Set())});assert.equal(reply.outputs.result,true);for(const command of reply.operations)await services.operation(command.key,command.args,binding,vm);
  assert.equal((await op('light2dGetCookieTexture')).return,'Images/Lamp.svg');assert.equal((await op('light2dGetCookieSprite')).return,'');assert.deepEqual(await op('light2dGetCookieSize'),{width:2,height:3});assert.deepEqual(await op('light2dGetVolume'),{enabled:true,intensity:.5,shadowStrength:.25});
  await op('light2dSetCookieSprite',{sprite:'Images/S_Lamp.hbsprite.json'});assert.equal((await op('light2dGetCookieTexture')).return,'');await op('light2dSetCookieSprite',{sprite:''});assert.equal((await op('light2dGetCookieSprite')).return,'');
  for(const key of ['light2dSetCookieSprite','light2dGetCookieSprite','light2dSetCookieTexture','light2dGetCookieTexture','light2dGetCookieSize','light2dSetVolume','light2dGetVolume'])assert.ok(engineSchema().blueprint.nodes.some(n=>n.key===key));
  assert.ok(engineSchema().components.Light2D.properties.cookieSprite);
  console.log('2D Sprite/볼륨 광원: 경계·공유 C++/JS 읽기 쓰기·BP/AI 서명·외부 폴더 빌드 의존성 PASS');
}finally{host.close();services.dispose();}
