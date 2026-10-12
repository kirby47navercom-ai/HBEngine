export function windowsGameIdentity(projectId){
  if(typeof projectId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId))throw Error('Windows 게임 프로젝트 ID를 확인하세요.');
  const key=projectId.toLowerCase().replaceAll('-','');return {id:'HBEngine.Game.'+key,executable:'HBGame_'+key+'.exe'};
}
