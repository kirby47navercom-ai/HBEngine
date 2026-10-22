import {createDistanceFieldCookedSource,setDistanceFieldCookedSource,readDistanceFieldCookedResponse} from './mesh-distance-field-cooked.js';
import {distanceFieldGeometryHash,encodeDistanceField,distanceFieldCookMaxBytes} from './mesh-distance-field-codec.js';
import {distanceFieldMeshEligible,distanceFieldMaterialEligible} from './mesh-distance-field-scene.js';
import {distanceFieldVertices} from './mesh-distance-field-upgrades.js';
import {bakeMeshDistanceFieldAsync} from './mesh-distance-field-bake.js';
import {editorRequest} from './project-browser.js';
const endpoint=(geometry,resolution)=>'/api/distance-fields/cache?geometry='+geometry+'&resolution='+resolution;
export function createEditorDistanceFieldSource(request=editorRequest){
 return createDistanceFieldCookedSource(async(_path,options)=>{
  const row=options.candidate,response=await request(endpoint(row.geometry,row.cacheResolution??row.resolution),{signal:options.signal});return readDistanceFieldCookedResponse(response,options);
 },{lookup:async(geometry,resolution,options)=>{
  try{return await(await request(endpoint(geometry,resolution)+'&metadata=1&analytic='+(options.preferAnalytic?'1':'0'),{signal:options.signal})).json();}
  catch(error){if(error.status===404)return null;throw error;}
 }});
}
export function installEditorDistanceFieldSource(){const source=createEditorDistanceFieldSource();setDistanceFieldCookedSource(source);return source;}
export async function prepareEditorDistanceFields(roots,{resolution=24,dryRun=false,signal,guard=async()=>{},onProgress=()=>{},source=createEditorDistanceFieldSource(),request=editorRequest}={}){
 if(!Number.isInteger(resolution)||resolution<8||resolution>64||typeof dryRun!=='boolean')throw Error('거리장 해상도와 dryRun을 확인하세요.');signal?.throwIfAborted();await guard();
 const geometries=new Set(),report={resolution,dryRun,geometries:0,baked:0,reused:0,stored:0,bytes:0,skipped:{deformed:0,material:0,inputBudget:0},cacheBudget:128*1024*1024};
 for(const root of roots)root.traverse(mesh=>{if(!distanceFieldMeshEligible(mesh)){if(mesh.isSkinnedMesh||mesh.geometry?.morphAttributes.position?.length)report.skipped.deformed++;return;}if(!(Array.isArray(mesh.material)?mesh.material:[mesh.material]).every(distanceFieldMaterialEligible)){report.skipped.material++;return;}geometries.add(mesh.geometry);});
 const reader=source.reader();let index=0;
 for(const geometry of geometries){
  signal?.throwIfAborted();await guard();const position=geometry.attributes.position,start=geometry.drawRange.start,count=Math.floor((Math.min(geometry.index?.count??position.count,start+geometry.drawRange.count)-start)/3)*3;
  if(!Number.isSafeInteger(start)||start<0||!Number.isSafeInteger(count)||count<3||count*24>8*1024*1024){report.skipped.inputBudget++;continue;}
  report.geometries++;onProgress({index:++index,total:geometries.size});if(dryRun)continue;
  const vertices=distanceFieldVertices(position,geometry.index,start,count),options={resolution,minimumResolution:resolution,preferAnalytic:true,byteBudget:64**3*4,inputByteBudget:8*1024*1024,signal};
  const existing=await reader.load(vertices,options);if(existing){report.reused++;continue;}
  // Hash before transfer detaches the worker's input; only one geometry is owned at a time.
  const hash=await distanceFieldGeometryHash(vertices),field=await bakeMeshDistanceFieldAsync(vertices,{...options,transfer:true}),bytes=encodeDistanceField(field,hash);assertBytes(bytes);report.baked++;await guard();signal?.throwIfAborted();
  await request(endpoint(hash,field.resolution),{method:'PUT',signal,headers:{'Content-Type':'application/octet-stream'},body:bytes});report.stored++;report.bytes+=bytes.byteLength;
 }await guard();return report;
}
function assertBytes(bytes){if(bytes.byteLength>distanceFieldCookMaxBytes)throw Error('거리장 캐시 예산을 넘었어요.');}
export function editorDistanceFieldDialog(ownerDocument,{resolution,run,error}){
 const dialog=ownerDocument.createElement('dialog');dialog.className='close-document-dialog distance-field-dialog';dialog.innerHTML='<h2>거리장 사전 생성</h2><form><label>해상도<input data-distance-resolution type="number" min="8" max="64" required></label><output></output><footer><button type="button" data-distance-cancel>취소</button><button type="submit" class="primary-button">생성</button></footer></form>';
 const form=dialog.querySelector('form'),input=dialog.querySelector('input'),output=dialog.querySelector('output'),start=dialog.querySelector('[type=submit]');input.value=resolution;let controller;dialog.querySelector('[data-distance-cancel]').onclick=()=>dialog.close();dialog.oncancel=()=>controller?.abort();dialog.onclose=()=>{controller?.abort();dialog.remove();};
 form.onsubmit=async event=>{event.preventDefault();if(controller)return;controller=new AbortController();input.disabled=start.disabled=true;try{const report=await run({ownerDialog:dialog,resolution:Number(input.value),signal:controller.signal,onProgress:p=>{output.textContent=p.index+' / '+p.total;}});output.textContent=report.stored+' 생성 · '+report.reused+' 재사용';dialog.querySelector('[data-distance-cancel]').textContent='닫기';start.textContent='다시 생성';}catch(e){if(!controller.signal.aborted)error(e.message);}finally{controller=null;if(dialog.isConnected)input.disabled=start.disabled=false;}};ownerDocument.body.append(dialog);dialog.showModal();return dialog;
}
