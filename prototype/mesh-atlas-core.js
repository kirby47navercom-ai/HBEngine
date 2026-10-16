const attributes=['vertices','uvs','uvs1','normals','colors'];
export async function computeMeshAtlas(data,{channel=1,resolution=512,padding=4,iterations=2}={},progress=()=>{}){
 if(![0,1].includes(channel)||!Number.isInteger(resolution)||resolution<32||resolution>8192||!Number.isInteger(padding)||padding<0||padding>resolution/8||!Number.isInteger(iterations)||iterations<1||iterations>8)throw Error('UV 채널·해상도·여백·반복 수를 확인하세요.');
 const count=data?.vertices?.length;if(!count||count>1000000||!data.vertices.every(v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite))||!Array.isArray(data.indices)||!data.indices.length||data.indices.length%3||data.indices.some(i=>!Number.isInteger(i)||i<0||i>=count))throw Error('삼각형 메시가 필요해요.');
 for(const key of attributes)if(data[key]&&data[key].length!==count)throw Error('정점 속성 개수가 일치하지 않아요.');
 const {default:create}=await import('../node_modules/xatlas-wasm/dist/index.mjs'),api=await create(),atlas=api.createAtlas();
 try{
  atlas.setProgressCallback((category,value)=>{progress({category:api.progressCategoryString(category),value});return true;});
  const used=[...new Set(data.indices)],compact=new Map(used.map((id,i)=>[id,i]));
  const error=atlas.addMesh({positions:new Float32Array(used.flatMap(i=>data.vertices[i])),indices:new Uint32Array(data.indices.map(i=>compact.get(i))),...(data.normals?{normals:new Float32Array(used.flatMap(i=>data.normals[i]))}:{})});
  if(error!==api.AddMeshError.Success)throw Error('UV 펼치기: '+api.addMeshErrorString(error));
  atlas.generate({maxIterations:iterations},{resolution,padding,bilinear:true,rotateCharts:true});
  if(atlas.atlasCount!==1||!atlas.width||!atlas.height)throw Error('단일 UV 아틀라스를 만들 수 없어요.');
  const mesh=atlas.getMesh(0);if(mesh.vertexCount>1000000||mesh.indexCount!==data.indices.length)throw Error('UV 결과의 정점·면 개수를 확인하세요.');
  const next={...data,indices:Array.from(mesh.indices)};
  for(const key of attributes)if(data[key])next[key]=mesh.vertices.map(v=>{if(!Number.isInteger(v.xref)||v.xref<0||v.xref>=used.length)throw Error('UV 정점 참조 오류');return [...data[key][used[v.xref]]];});
  next[channel===1?'uvs1':'uvs']=mesh.vertices.map(v=>{if(v.atlasIndex!==0||v.uv.some(n=>!Number.isFinite(n)))throw Error('UV 아틀라스 좌표 오류');return[v.uv[0]/atlas.width,v.uv[1]/atlas.height];});
  return {data:next,layout:{channel,width:atlas.width,height:atlas.height,charts:mesh.chartCount,utilization:atlas.getUtilization(0),padding,vertices:mesh.vertexCount,triangles:mesh.indexCount/3}};
 }finally{atlas.destroy();}
}
