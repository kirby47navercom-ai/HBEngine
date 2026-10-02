import {icon} from './icons.js';
export function filterProjects(projects,query){const term=query.trim().toLocaleLowerCase();return projects.filter(p=>typeof p?.name==='string'&&typeof p.file==='string'&&(!term||(p.name+' '+p.file).toLocaleLowerCase().includes(term)));}
if(typeof document!=='undefined')initialize();
function initialize(){
  window.hbEngineRequestClose=async()=>{window.chrome?.webview?.postMessage('hbengine.close');return true;};
  const $=selector=>document.querySelector(selector),dialog=$('#new-project-dialog');let projects=[],selected=null;
  document.querySelectorAll('[data-icon]').forEach(element=>element.insertAdjacentHTML('afterbegin',icon(element.dataset.icon)));
  const showError=(message,target=$('#hub-error'))=>{target.textContent=message;target.hidden=!message;};
  const syncOpen=()=>{$('#open-selected').disabled=!!document.body.dataset.busy||!selected;$('#selected-project-name').textContent=selected?.name||'프로젝트 선택';};
  async function request(path,data){const response=await fetch('/api/launcher'+path,{method:data?'POST':'GET',headers:{'X-HB-Editor':'1',...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});const result=await response.json();if(!response.ok)throw Error(result.error||'프로젝트 요청 실패');return result;}
  async function busy(action){if(document.body.dataset.busy)return;document.body.dataset.busy='1';showError('');showError('',$('#create-error'));document.querySelectorAll('button').forEach(button=>button.disabled=true);try{await action();}catch(e){showError(e.message,dialog.open?$('#create-error'):$('#hub-error'));}finally{delete document.body.dataset.busy;document.querySelectorAll('button').forEach(button=>button.disabled=false);syncOpen();}}
  async function open(file){if(!file?.trim())throw Error('프로젝트 파일을 선택하세요.');await request('/open',{file:file.trim()});location.href='/prototype/index.html';}
  function select(project){selected=project;$('#recent-projects').querySelectorAll('[role="option"]').forEach(row=>row.setAttribute('aria-selected',String(row.dataset.file===project?.file)));syncOpen();}
  function render(){
    const visible=filterProjects(projects,$('#project-search').value),list=$('#recent-projects');if(!visible.some(p=>p.file===selected?.file))selected=null;list.replaceChildren();
    for(const project of visible){const row=document.createElement('button');row.className='recent-project';row.dataset.file=project.file;row.setAttribute('role','option');row.setAttribute('aria-selected',String(selected?.file===project.file));row.title=project.file;row.innerHTML='<span class="project-info"><span class="project-symbol">'+icon('scene')+'</span><strong></strong></span><span class="project-path"></span>';row.querySelector('strong').textContent=project.name;row.querySelector('.project-path').textContent=project.file;row.onclick=()=>select(project);row.ondblclick=()=>busy(()=>open(project.file));row.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();select(project);busy(()=>open(project.file));}else if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();const next=visible[Math.max(0,Math.min(visible.length-1,visible.indexOf(project)+(e.key==='ArrowDown'?1:-1)))];select(next);[...list.children].find(r=>r.dataset.file===next.file)?.focus();}};list.append(row);}
    if(!visible.length){const empty=document.createElement('p');empty.className='empty';empty.textContent=projects.length?'검색 결과 없음':'최근 프로젝트 없음';list.append(empty);}$('#project-count').textContent=$('#project-search').value.trim()?visible.length+' / '+projects.length+'개':projects.length+'개';syncOpen();
  }
  async function refresh(){const data=await request('');if(!Array.isArray(data.projects)||typeof data.defaultDirectory!=='string')throw Error('프로젝트 목록을 확인하세요.');projects=filterProjects(data.projects,'');render();if(!$('#project-directory').value)$('#project-directory').value=data.defaultDirectory;}
  $('#project-search').oninput=render;$('#open-selected').onclick=()=>busy(()=>open(selected?.file));
  $('#open-project').onsubmit=e=>{e.preventDefault();busy(()=>open($('#project-file').value));};
  $('#new-project').onclick=()=>{showError('',$('#create-error'));dialog.showModal();$('#project-name').focus();};
  for(const id of ['close-new-project','cancel-new-project'])$('#'+id).onclick=()=>dialog.close();
  dialog.addEventListener('cancel',e=>{if(document.body.dataset.busy)e.preventDefault();});
  $('#create-project').onsubmit=e=>{e.preventDefault();busy(async()=>{const name=$('#project-name').value.trim(),directory=$('#project-directory').value.trim();if(!name||!directory)throw Error('이름과 저장 위치를 입력하세요.');await request('/create',{name,directory,template:$('#project-template').value});location.href='/prototype/index.html';});};
  $('#browse-project').onclick=()=>busy(async()=>{const result=await request('/browse',{kind:'project'});if(result.path)await open(result.path);});
  $('#browse-directory').onclick=()=>busy(async()=>{const result=await request('/browse',{kind:'folder'});if(result.path){$('#project-directory').value=result.path;$('#project-directory').focus();}});
  $('#refresh-projects').onclick=()=>busy(refresh);
  const initialError=new URLSearchParams(location.search).get('error');busy(refresh).then(()=>{if(initialError&&!$('#hub-error').textContent)showError(initialError);window.chrome?.webview?.postMessage('hbengine.ready.hub');});
}
