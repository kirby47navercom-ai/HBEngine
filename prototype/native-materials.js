import {compileMaterial,materialDefaults,materialParameters} from './material-runtime.js';
import {materialTextureBindings} from './material-texture-bindings.js';
function hlsl(code){
  code=code.replace(/\bvec([234])\b/g,'float$1').replace(/\bmix\b/g,'lerp').replace(/\bfract\b/g,'frac').replace(/\bmod\b/g,'hbMod');
  for(const match of [...code.matchAll(/\bfloat([234])\(/g)].reverse()){let depth=1,comma=false;for(let i=match.index+match[0].length;i<code.length&&depth;i++){if(code[i]==='(')depth++;else if(code[i]===')')depth--;else if(code[i]===','&&depth===1)comma=true;}if(!comma)code=code.slice(0,match.index)+'hbSplat'+match[1]+code.slice(match.index+6);}
  return code;
}
const helpers=`StructuredBuffer<float> hbParameters:register(t7);
${[2,3,4].map(n=>`float${n} hbSplat${n}(float v){return float${n}(${Array(n).fill('v').join(',')});}float${n} hbSplat${n}(float${n} v){return v;}`).join('\n')}
float3 hbSRGB(float3 c){return lerp(c/12.92,pow((c+.055)/1.055,2.4),step(.04045,c));}
float hbHash(float2 p){return frac(sin(dot(p,float2(127.1,311.7)))*43758.5453);}
float hbNoise(float2 p){float2 i=floor(p),f=frac(p);f=f*f*(3-2*f);return lerp(lerp(hbHash(i),hbHash(i+float2(1,0)),f.x),lerp(hbHash(i+float2(0,1)),hbHash(i+float2(1,1)),f.x),f.y);}
float2 hbRotate(float2 uv,float a,float2 center){float s=sin(a),c=cos(a);float2 p=uv-center;return float2(c*p.x-s*p.y,s*p.x+c*p.y)+center;}
${['float','float2','float3','float4'].map(t=>`${t} hbMod(${t} a,${t} b){return a-b*floor(a/b);} ${t} hbSmooth(${t} a,${t} b,${t} v){${t} x=saturate((v-a)/max(b-a,0.000001));return x*x*(3-2*x);}`).join('\n')}
float3 hbNormal(float3 eyePosition,float3 n,float3 mapN,float2 uv){float3 q0=ddx(eyePosition),q1=ddy(eyePosition);float2 st0=ddx(uv),st1=ddy(uv);float3 s=safeNormal(q0*st1.y-q1*st0.y),t=safeNormal(-q0*st1.x+q1*st0.x);return safeNormal(s*mapN.x+t*mapN.y+n*mapN.z);}`;
export function compileNativeMaterial(data){
  const plan=compileMaterial(data,{uniformParameters:true});
  if(plan.textures.some(t=>t.type!=='texture2d'))throw Error('DirectX 큐브·배열·볼륨 텍스처 셰이더 변환이 필요해요.');
  if(plan.textures.length>16)throw Error('DirectX 11 셰이더의 샘플러 16개 한도를 넘었어요.');
  if(plan.values.clearcoat!=='0.0'||plan.values.transmission!=='0.0')throw Error('DirectX 코팅·투과 노드 셰이더 변환이 필요해요.');
  const declarations=helpers+'\n'+plan.textures.map((t,i)=>`Texture2D ${t.uniform}:register(t${8+i});SamplerState hbSampler${i}:register(s${i});float4 hbSample${i}(float2 uv){return ${t.uniform}.Sample(hbSampler${i},uv);}`).join('\n');
  let lines=hlsl(plan.lines);for(const [i,t] of plan.textures.entries())lines=lines.replaceAll('texture2D('+t.uniform+',','hbSample'+i+'(');
  // The existing GLSL graph plan is already typed, flattened and topologically ordered.
  const evaluation='float2 hbUv=i.uv;float3 hbWorldPosition=i.at,hbWorldNormal=n,cameraPosition=eye.xyz;float hbTime=normalScale.w;\n'+plan.floatBindings.map((b,i)=>`float ${b.uniform}=hbParameters[${i}];`).join('\n')+'\n'+lines+`\nbase.rgb=${hlsl(plan.values.baseColor)};base.a=${hlsl(plan.values.opacity)};rough=clamp(${hlsl(plan.values.roughness)},.04,1);metal=saturate(${hlsl(plan.values.metallic)});emit=${hlsl(plan.values.emissive)}*emissive.a;ao=saturate(${hlsl(plan.values.ao)});`+(plan.normalConnected?`n=hbNormal(i.at,n,${hlsl(plan.values.normal)},hbUv);`:'');
  return {...plan,declarations,evaluation};
}
export function createNativeMaterial(THREE,input,{fileUrl,onError=()=>{},renderer}={}){
  const data=structuredClone(input),plan=compileNativeMaterial(data),surface={...materialDefaults,...data.surface},bindings=materialTextureBindings(THREE,{resources:data.textureAssets,fileUrl,renderer,onError}),maps=[],values=plan.floatBindings.map(b=>b.value);let disposed=false,time=0;
  const material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:surface.roughness,metalness:surface.metalness,emissive:'#ffffff',emissiveIntensity:surface.emissiveIntensity,transparent:surface.blendMode==='translucent',alphaTest:surface.blendMode==='masked'?surface.alphaTest:0,side:surface.doubleSided?THREE.DoubleSide:THREE.FrontSide});
  const program={id:crypto.randomUUID(),declarations:plan.declarations,evaluation:plan.evaluation,uniforms:values,maps};
  material.userData.hbMaterial=true;material.userData.hbNativeProgram=program;material.userData.materialSource=data;
  material.userData.ready=Promise.all(plan.textures.map((texture,i)=>bindings.add(texture,map=>{maps[i]=map;map.colorSpace=THREE.NoColorSpace;})));
  material.userData.updateTime=value=>{time=value;renderer.hbTime=value;};
  material.userData.updateFloat=(key,value)=>{
    if(disposed)return false;if(!Number.isFinite(value))throw Error('Float 파라미터 값을 확인하세요.');const property={Roughness:'roughness',Metallic:'metalness',Opacity:'opacity',EmissiveIntensity:'emissiveIntensity'}[key]||key;
    const parameter=plan.floatBindings.findIndex(b=>b.kind==='parameter'&&b.key===key),index=parameter>=0?parameter:plan.floatBindings.findIndex(b=>b.kind==='surface'&&b.key===property);
    if(index>=0){values[index]=value;if(parameter>=0)data.parameters={...data.parameters,[key]:value};else data.surface={...data.surface,[property]:value};return true;}
    if(materialParameters(data).some(p=>p.name===key&&p.type!=='float'))throw Error('Float 파라미터가 아니에요.');
    if(property==='emissiveIntensity'){material.emissiveIntensity=value;data.surface={...data.surface,[property]:value};return true;}return false;
  };
  material.userData.textureState=bindings.state;
  material.userData.materialState=()=>({backend:'D3D11',time,uniforms:values.slice(),program:program.id});
  material.userData.prepareTexture=async(key,path,resources)=>{const transaction=await bindings.prepare(key,path,resources),commit=transaction.commit;transaction.commit=()=>{if(!commit())return false;data.parameters={...data.parameters,[key]:path};return true;};return transaction;};
  const dispose=material.dispose.bind(material);material.dispose=()=>{if(disposed)return;disposed=true;bindings.dispose();dispose();};material.clone=()=>createNativeMaterial(THREE,data,{fileUrl,onError,renderer});return material;
}
