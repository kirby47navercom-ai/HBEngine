// Only built-in value representations use the narrow rollback path. An alias
// with user-defined JSON conversion/assignment can execute arbitrary C++.
export function nativeCheckpointSafety(metadata,cppType){
 const definitions=new Map((metadata.structs||[]).map((definition,index)=>[definition.name,{definition,index}])),done=new Set(),active=new Set(),declarations=[];
 const safeType=(pin,actual)=>{
  const exact='std::is_same_v<'+actual+','+cppType(pin)+'>';
  if(pin.type==='record')return '('+exact+'&&'+record(pin.structName)+')';
  if(pin.type==='float')return '('+exact+'||std::is_same_v<'+actual+','+(pin.array?'std::vector<double>':'double')+'>)';
  return exact;
 };
 const record=name=>{
  const found=definitions.get(name);if(!found||active.has(name))throw Error('체크포인트 구조체 선언을 확인하세요.');const id='HB_checkpointSafeRecord_'+found.index;
  if(done.has(name))return id;active.add(name);
  const fields=found.definition.fields.map(field=>safeType(field,'decltype('+name+'::'+field.name+')'));
  active.delete(name);done.add(name);declarations.push('static constexpr bool '+id+'='+fields.join('&&')+';');return id;
 };
 const cases=[];for(const owner of metadata.classes)for(const property of owner.properties){const safe=safeType(property,'decltype('+owner.name+'::'+property.name+')');cases.push('if(id=='+JSON.stringify(owner.name+'.'+property.name)+')return '+(property.readOnly?'!writing&&':'')+'('+safe+')&&dynamic_cast<HB_'+owner.name+'*>(cell)!=nullptr;');}
 return declarations.join('\n')+'\nstatic bool HB_checkpointPropertySafe(const std::string& id,hb::BridgeCell* cell,bool writing){(void)id;(void)cell;(void)writing;'+cases.join('')+'return false;}\n';
}
