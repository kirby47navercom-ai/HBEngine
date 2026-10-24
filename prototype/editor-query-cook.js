export function stripEditorQueryTesters(data,kind){
  if(!['scene','prefab','blueprint'].includes(kind))return data;
  const isTester=c=>c.type==='EnvironmentQueryTester';
  if(kind==='blueprint'){if(data.components?.some(isTester))throw Error('EQS 테스트 컴포넌트는 장면·프리팹에 배치하고 게임 블루프린트에서 제거하세요.');return data;}
  let changed=false;const objects=(data.objects||[]).map(object=>{if(!object.components?.some(isTester))return object;changed=true;return {...object,components:object.components.filter(c=>!isTester(c))};});
  return changed?{...data,objects}:data;
}
