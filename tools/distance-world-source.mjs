import {worldAssetSuffix,validWorldAsset,terrainMesh,createWorldAsset} from '../prototype/world-assets.js';
const kinds=Object.entries(worldAssetSuffix),kindOf=name=>kinds.find(([,suffix])=>name.endsWith(suffix))?.[0];
// Match worldBufferGeometry's Float32 positions without allocating renderer
// buffers or expanding foliage transforms. The existing baker expands triangles.
function geometrySource(data){return {attributes:{position:{count:data.vertices.length,getX:i=>Math.fround(data.vertices[i][0]),getY:i=>Math.fround(data.vertices[i][1]),getZ:i=>Math.fround(data.vertices[i][2])}},index:{count:data.indices.length,getX:i=>data.indices[i]},drawRange:{start:0,count:Infinity}};}
export async function distanceFieldWorldInputs(content,consume,{signal,maximumInputBytes=8*1024*1024,maximumSourceBytes=64*1024*1024}={}){
 if(!Number.isSafeInteger(maximumInputBytes)||maximumInputBytes<0||!Number.isSafeInteger(maximumSourceBytes)||maximumSourceBytes<0)throw Error('월드 거리장 입력 예산을 확인하세요.');
 const report={assets:{mesh:0,terrain:0,foliage:0,lod:0},geometries:0,deferred:0,unsupported:0,examples:[],rendererBuffers:0,expandedInstanceTransforms:0},done=new Set(),decoder=new TextDecoder();
 const example=(name,message)=>{if(report.examples.length<3)report.examples.push({path:name,message:String(message).slice(0,240)});};
 const leaf=async(data,name,terrain=false)=>{const count=terrain?((data.resolution[0]-1)*(data.resolution[1]-1)-(data.holes?.reduce((n,hole)=>n+(hole?1:0),0)||0))*6:data.indices.length;if(count<3||count*24>maximumInputBytes||terrain&&data.heights.length*24>maximumInputBytes){report.deferred++;example(name,'삼각형/지형 정점 입력이 비었거나 거리장 입력 예산을 넘어서 실행 중 생성으로 넘겨요.');return;}const mesh=terrain?terrainMesh(data):data;report.geometries++;await consume(geometrySource(mesh),name);};
 async function visit(name,stack=[]){
  signal?.throwIfAborted();if(stack.includes(name)||stack.length>=16)throw Error('월드 거리장 참조의 순환·깊이 제한을 확인하세요.');if(done.has(name))return;const kind=kindOf(name),bytes=content.get(name);if(!kind||!bytes)throw Error('패키지에 월드 거리장 원본이 없어요: '+name);
  if(bytes.byteLength>maximumSourceBytes){report.deferred++;example(name,'월드 거리장 원본 크기가 입력 예산을 넘어서 실행 중 생성으로 넘겨요.');done.add(name);return;}
  const data=JSON.parse(decoder.decode(bytes));if(!validWorldAsset(kind,data))throw Error('월드 거리장 원본 형식을 확인하세요: '+name);report.assets[kind]++;const chain=[...stack,name];
  if(kind==='mesh'||kind==='terrain')await leaf(data,name,kind==='terrain');
  else if(kind==='foliage'){if(data.instances.length){if(data.mesh)await visit(data.mesh,chain);else await leaf(createWorldAsset('mesh','Foliage'),name+':default');}}
  else for(const level of data.levels)await visit(level.asset,chain);
  done.add(name);
 }
 for(const name of [...content.keys()].filter(kindOf).sort())try{await visit(name);}catch(error){if(signal?.aborted)throw signal.reason;report.unsupported++;example(name,error.message||error);}
 return report;
}
