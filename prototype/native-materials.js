import {compileMaterial,materialDefaults,materialParameters,materialFloatProperty,materialVectorProperty,materialVectorValue} from './material-runtime.js';
import {materialTextureBindings} from './material-texture-bindings.js';
import {captureMaterialGraph} from './material-source-key.js';
import {normalMapGLSL} from './normal-map.js';
export const nativeSurfaceProgramContract=Object.freeze({version:1,
 marker:'#define HB_NODE_SURFACE 1\n',cpp:'SceneRenderer::createSurfaceProgram',
 inputs:'complete node surface owns base/normal/roughness/metallic/emission/AO texture inputs; default-map reads are removed before compilation',
 legacy:'createProgram remains a partial low-level shader extension with its existing bindings',
 samplerSlots:16,reserved:Object.freeze({effects2D:Object.freeze([13,14,15]),transmissionAndProbes:Object.freeze([14])}),
 binding:'independent existing programSampling entries; hardware/system reservations remain enforced',
 resources:'no additional GPU buffers, textures, sampler objects or per-frame work'});
function hlsl(code){
  code=code.replace(/\bvec([234])\b/g,'float$1').replace(/\bmix\b/g,'lerp').replace(/\bfract\b/g,'frac').replace(/\bmod\b/g,'hbMod');
  for(const match of [...code.matchAll(/\bfloat([234])\(/g)].reverse()){let depth=1,comma=false;for(let i=match.index+match[0].length;i<code.length&&depth;i++){if(code[i]==='(')depth++;else if(code[i]===')')depth--;else if(code[i]===','&&depth===1)comma=true;}if(!comma)code=code.slice(0,match.index)+'hbSplat'+match[1]+code.slice(match.index+6);}
  return code;
}
const helpers=`StructuredBuffer<float> hbParameters:register(t7);
${[2,3,4].map(n=>`float${n} hbSplat${n}(float v){return float${n}(${Array(n).fill('v').join(',')});}float${n} hbSplat${n}(float${n} v){return v;}`).join('\n')}
${hlsl(normalMapGLSL)}
float3 hbSRGB(float3 c){return lerp(c/12.92,pow((c+.055)/1.055,2.4),step(.04045,c));}
float hbHash(float2 p){return frac(sin(dot(p,float2(127.1,311.7)))*43758.5453);}
float hbNoise(float2 p){float2 i=floor(p),f=frac(p);f=f*f*(3-2*f);return lerp(lerp(hbHash(i),hbHash(i+float2(1,0)),f.x),lerp(hbHash(i+float2(0,1)),hbHash(i+float2(1,1)),f.x),f.y);}
float2 hbRotate(float2 uv,float a,float2 center){float s=sin(a),c=cos(a);float2 p=uv-center;return float2(c*p.x-s*p.y,s*p.x+c*p.y)+center;}
${['float','float2','float3','float4'].map(t=>`${t} hbMod(${t} a,${t} b){return a-b*floor(a/b);} ${t} hbSmooth(${t} a,${t} b,${t} v){${t} x=saturate((v-a)/max(b-a,0.000001));return x*x*(3-2*x);}`).join('\n')}
float3 hbNormal(float3 eyePosition,float3 n,float3 mapN,float2 uv){float3 q0=ddx(eyePosition),q1=ddy(eyePosition);float2 st0=ddx(uv),st1=ddy(uv);float3 s=safeNormal(q0*st1.y-q1*st0.y),t=safeNormal(-q0*st1.x+q1*st0.x);return safeNormal(s*mapN.x+t*mapN.y+n*mapN.z);}`;
export function compileNativeMaterial(data){
  const plan=compileMaterial(data,{uniformParameters:true});
  if(plan.textures.length>16)throw Error('DirectX 11 셰이더의 샘플러 16개 한도를 넘었어요.');
  const declarations=nativeSurfaceProgramContract.marker+helpers+'\n'+plan.textures.map((t,i)=>{
    const type={texture2d:'Texture2D',texturecube:'TextureCube',texturearray:'Texture2DArray',texture3d:'Texture3D'}[t.type];if(!type)throw Error('DirectX 텍스처 자료형을 확인하세요.');
    const cube=t.type==='texturecube',args=t.type==='texture2d'?'float2 uv':cube?'float3 uv,float lod':'float3 uv';
    return `${type} ${t.uniform}:register(t${8+i});SamplerState hbSampler${i}:register(s${i});float4 hbSample${i}(${args}){return ${t.uniform}.${cube?'SampleLevel':'Sample'}(hbSampler${i},uv${cube?',lod':''});}`;
  }).join('\n');
  let lines=hlsl(plan.lines);for(const [i,t] of plan.textures.entries())for(const call of ['texture2D','textureLod','texture'])lines=lines.replaceAll(call+'('+t.uniform+',','hbSample'+i+'(');
  // The existing GLSL graph plan is already typed, flattened and topologically ordered.
  const vectorBindings=plan.vectorBindings.map((b,i)=>({...b,offset:plan.floatBindings.length+i*3})),uniformValues=[...plan.floatBindings.map(b=>b.value),...vectorBindings.flatMap(b=>b.value)];
  const evaluation='float2 hbUv=i.uv;float3 hbWorldPosition=i.at,hbWorldNormal=n,cameraPosition=eye.xyz;float hbTime=normalScale.w;\n'+plan.floatBindings.map((b,i)=>`float ${b.uniform}=hbParameters[${i}];`).join('\n')+'\n'+vectorBindings.map(b=>`float3 ${b.uniform}=float3(hbParameters[${b.offset}],hbParameters[${b.offset+1}],hbParameters[${b.offset+2}]);`).join('\n')+'\n'+lines+`\nbase.rgb=${hlsl(plan.values.baseColor)};base.a=${hlsl(plan.values.opacity)};rough=clamp(${hlsl(plan.values.roughness)},.04,1);metal=saturate(${hlsl(plan.values.metallic)});emit=${hlsl(plan.values.emissive)}*emissive.a;ao=saturate(${hlsl(plan.values.ao)});coat=saturate(${hlsl(plan.values.clearcoat)});coatRough=clamp(${hlsl(plan.values.clearcoatRoughness)},.04,1);ior=clamp(${hlsl(plan.values.ior)},1,2.5);transmission=saturate(${hlsl(plan.values.transmission)});thickness=max(${hlsl(plan.values.thickness)},0);attenuationColor=saturate(${hlsl(plan.values.attenuationColor)});attenuationDistance=max(${hlsl(plan.values.attenuationDistance)},0);dispersion=clamp(${hlsl(plan.values.dispersion)},0,10);sheen=saturate(${hlsl(plan.values.sheen)});sheenTint=saturate(${hlsl(plan.values.sheenColor)});sheenRough=clamp(${hlsl(plan.values.sheenRoughness)},.07,1);anisotropy=saturate(${hlsl(plan.values.anisotropy)});anisotropyRotation=${hlsl(plan.values.anisotropyRotation)};filmWeight=saturate(${hlsl(plan.values.iridescence)});filmIOR=clamp(${hlsl(plan.values.iridescenceIOR)},1,3);filmThickness=clamp(${hlsl(plan.values.iridescenceThickness)},0,2000);specularIntensity=saturate(${hlsl(plan.values.specularIntensity)});specularTint=saturate(${hlsl(plan.values.specularColor)});skin=saturate(${hlsl(plan.values.subsurface)});foliage=saturate(${hlsl(plan.values.foliage)});hair=saturate(${hlsl(plan.values.hair)});scatterTint=saturate(${hlsl(plan.values.subsurfaceColor)});scatterThickness=max(${hlsl(plan.values.subsurfaceThickness)},0);hairAxis=${hlsl(plan.values.hairTangent)};hairShift=clamp(${hlsl(plan.values.hairShift)},-1,1);`+`cn=hbNormal(i.at,cn,${hlsl(plan.values.clearcoatNormal)},hbUv);n=hbNormal(i.at,n,${hlsl(plan.values.normal)},hbUv);`;
  return {...plan,vectorBindings,uniformValues,declarations,evaluation};
}
export function createNativeMaterial(THREE,input,{fileUrl,onError=()=>{},renderer}={}){
  const data=captureMaterialGraph(structuredClone(input)),plan=compileNativeMaterial(data),surface={...materialDefaults,...data.surface},bindings=materialTextureBindings(THREE,{resources:data.textureAssets,fileUrl,renderer,onError}),maps=[],values=plan.uniformValues.slice();let disposed=false,time=0;
  const material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:surface.roughness,metalness:surface.metalness,emissive:'#ffffff',emissiveIntensity:surface.emissiveIntensity,transparent:surface.blendMode==='translucent',alphaTest:surface.blendMode==='masked'?surface.alphaTest:0,side:surface.doubleSided?THREE.DoubleSide:THREE.FrontSide});
  const program={id:crypto.randomUUID(),declarations:plan.declarations,evaluation:plan.evaluation,uniforms:values,maps,transmissive:plan.transmissionConnected||surface.transmission>0,animated:/\bhbTime\b/.test(plan.lines+Object.values(plan.values).join(' '))};
  material.userData.hbMaterial=true;material.userData.hbNativeProgram=program;material.userData.materialSource=data;
  material.userData.ready=Promise.all(plan.textures.map((texture,i)=>bindings.add(texture,map=>{maps[i]=map;})));
  material.userData.updateTime=value=>{time=value;renderer.hbTime=value;};
  material.userData.updateFloat=(key,value)=>{
    if(disposed)return false;if(!Number.isFinite(value))throw Error('Float 파라미터 값을 확인하세요.');const property=materialFloatProperty(key);
    const parameter=plan.floatBindings.findIndex(b=>b.kind==='parameter'&&b.key===key),index=parameter>=0?parameter:plan.floatBindings.findIndex(b=>b.kind==='surface'&&b.key===property);
    if(index>=0){values[index]=value;if(parameter>=0)data.parameters={...data.parameters,[key]:value};else{data.surface={...data.surface,[property]:value};if(property==='transmission')program.transmissive=plan.transmissionConnected||value>0;}return true;}
    if(materialParameters(data).some(p=>p.name===key&&p.type!=='float'))throw Error('Float 파라미터가 아니에요.');
    if(property==='emissiveIntensity'){material.emissiveIntensity=value;data.surface={...data.surface,[property]:value};return true;}return false;
  };
  material.userData.floatKeys=[...plan.floatBindings.map(b=>b.kind+':'+b.key),'surface:emissiveIntensity'];
  material.userData.vectorKeys=plan.vectorBindings.map(b=>b.kind+":"+b.key);
  material.userData.updateVector=(key,value)=>{if(disposed)return false;value=materialVectorValue(value);if(materialParameters(data).some(p=>p.name===key&&p.type!=='vec3'))throw Error('Vector3 파라미터가 아니에요.');const property=materialVectorProperty(key),parameter=plan.vectorBindings.find(b=>b.kind==='parameter'&&b.key===key),binding=parameter||plan.vectorBindings.find(b=>b.kind==='surface'&&b.key===property);if(!binding){if(materialParameters(data).some(p=>p.name===key))throw Error('Vector3 파라미터가 아니에요.');return false;}values.splice(binding.offset,3,...value);if(parameter)data.parameters={...data.parameters,[key]:value};else data.surface={...data.surface,[property]:value};return true;};
  material.userData.textureState=bindings.state;material.userData.rayTextures=bindings.textures;
  material.userData.materialState=()=>({backend:'D3D11',time,uniforms:values.slice(),program:program.id});
  material.userData.prepareTexture=async(key,path,resources)=>{const transaction=await bindings.prepare(key,path,resources),commit=transaction.commit;transaction.commit=()=>{if(!commit())return false;data.parameters={...data.parameters,[key]:path};return true;};return transaction;};
  const dispose=material.dispose.bind(material);material.dispose=()=>{if(disposed)return;disposed=true;bindings.dispose();dispose();};material.clone=()=>createNativeMaterial(THREE,data,{fileUrl,onError,renderer});return material;
}
