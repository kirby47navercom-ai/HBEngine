import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {filterProjects} from '../prototype/project-hub.js';
import {icon} from '../prototype/icons.js';
const projects=[{name:'첫 번째 게임',file:'C:/게임 폴더/첫 게임.hbproject'},{name:'QuietGarden',file:'D:/Games/QuietGarden/QuietGarden.hbproject'}];
assert.deepEqual(filterProjects(projects,'첫 번째'),[projects[0]]);assert.deepEqual(filterProjects(projects,' QUIETgarden '),[projects[1]]);assert.deepEqual(filterProjects(projects,'게임 폴더'),[projects[0]]);assert.deepEqual(filterProjects(projects,'d:/games'),[projects[1]]);
assert.deepEqual(filterProjects([...projects,null,{name:'invalid'}],''),projects);assert.deepEqual(filterProjects(projects,'missing'),[]);
const html=await fs.readFile(new URL('../prototype/project-hub.html',import.meta.url),'utf8'),source=await fs.readFile(new URL('../prototype/project-hub.js',import.meta.url),'utf8');
// Only the DOM operations used by the actual hub are mocked; no browser or package is required.
class Element {
  constructor(tag='div'){this.tag=tag;this.dataset={};this.attributes={};this.children=[];this.listeners={};this.value='';this.disabled=false;this.hidden=false;this.open=false;this.textContent='';}
  setAttribute(key,value){this.attributes[key]=String(value);}getAttribute(key){return this.attributes[key]??null;}
  insertAdjacentHTML(){}
  set innerHTML(value){this.markup=value;this.children=[];if(value.includes('<strong'))this.children.push(new Element('strong'));if(value.includes('class="project-path"')){const path=new Element('span');path.className='project-path';this.children.push(path);}}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  querySelectorAll(selector){return this.children.flatMap(child=>[...(selector==='strong'&&child.tag==='strong'||selector==='.project-path'&&child.className==='project-path'||selector==='[role="option"]'&&child.getAttribute('role')==='option'?[child]:[]),...child.querySelectorAll(selector)]);}
  append(child){this.children.push(child);}replaceChildren(){this.children=[];}
  focus(){document.activeElement=this;}showModal(){this.open=true;}close(){this.open=false;}
  addEventListener(type,callback){(this.listeners[type]??=[]).push(callback);}
  cancel(){const event={prevented:false,preventDefault(){this.prevented=true;}};this.listeners.cancel?.forEach(callback=>callback(event));if(!event.prevented)this.close();return event;}
}
const elements=new Map(),all=[];
for(const match of html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/g)){
  const element=new Element(match[1]);for(const attribute of match[2].matchAll(/([\w-]+)="([^"]*)"/g)){element.setAttribute(attribute[1],attribute[2]);if(attribute[1].startsWith('data-'))element.dataset[attribute[1].slice(5)]=attribute[2];}
  element.disabled=/\bdisabled\b/.test(match[2]);element.hidden=/\bhidden\b/.test(match[2]);const id=element.getAttribute('id');if(id){assert.equal(elements.has(id),false,'허브 ID가 중복되면 안 돼요: '+id);elements.set(id,element);}all.push(element);
}
const get=id=>{const element=elements.get(id);assert.ok(element,'실제 HTML에 필요한 항목이 없어요: '+id);return element;};
const descendants=element=>element.children.flatMap(child=>[child,...descendants(child)]);
const document={body:new Element('body'),activeElement:null,querySelector:selector=>get(selector.slice(1)),createElement:tag=>new Element(tag),querySelectorAll:selector=>selector==='[data-icon]'?all.filter(element=>element.dataset.icon):selector==='button'?[...all,...descendants(get('recent-projects'))].filter(element=>element.tag==='button'):[]};
const requests=[],messages=[],location={href:'',search:''};let failure=null,pending=null,browsePath=null;
const fetch=async(url,options={})=>{
  requests.push({url,...options});if(pending?.url===url){const gate=pending;pending=null;return new Promise(resolve=>gate.resolve=resolve);}
  if(url===failure)return {ok:false,json:async()=>({error:'검사 요청 실패'})};
  return {ok:true,json:async()=>url==='/api/launcher'?{projects,defaultDirectory:'C:/새 게임 폴더'}:url==='/api/launcher/browse'?{path:browsePath}:{ok:true}};
};
vm.runInNewContext(source.replace(/^import \{icon\} from '\.\/icons\.js';/m,'').replace('export function filterProjects','function filterProjects'),{document,window:{chrome:{webview:{postMessage:message=>messages.push(message)}}},location,URLSearchParams,fetch,icon},{filename:'project-hub.js',timeout:1000});
const settle=()=>new Promise(resolve=>setImmediate(resolve)),submit={preventDefault(){}},rows=()=>get('recent-projects').querySelectorAll('[role="option"]');
await settle();assert.equal(document.body.dataset.busy,undefined);assert.equal(rows().length,2);assert.equal(get('open-selected').disabled,true);assert.equal(get('project-directory').value,'C:/새 게임 폴더');assert.ok(messages.includes('hbengine.ready.hub'));
rows()[0].onclick();assert.equal(get('open-selected').disabled,false);assert.equal(rows()[0].getAttribute('aria-selected'),'true');assert.equal(get('selected-project-name').textContent,projects[0].name);
get('project-search').value='Quiet';get('project-search').oninput();assert.equal(rows().length,1);assert.equal(get('open-selected').disabled,true);assert.equal(get('selected-project-name').textContent,'프로젝트 선택');
get('project-search').value='';get('project-search').oninput();assert.equal(get('open-selected').disabled,true);rows()[0].onclick();
failure='/api/launcher/open';get('open-selected').onclick();assert.equal(document.body.dataset.busy,'1');assert.equal(get('open-selected').disabled,true);await settle();assert.equal(get('hub-error').textContent,'검사 요청 실패');assert.equal(get('hub-error').hidden,false);assert.equal(get('open-selected').disabled,false);assert.equal(document.body.dataset.busy,undefined);assert.equal(location.href,'');failure=null;
const openRequest=requests.find(request=>request.url==='/api/launcher/open');assert.equal(openRequest.method,'POST');assert.equal(openRequest.headers['X-HB-Editor'],'1');assert.deepEqual(JSON.parse(openRequest.body),{file:projects[0].file});
get('open-selected').onclick();await settle();assert.equal(location.href,'/prototype/index.html');location.href='';
const dialog=get('new-project-dialog');get('new-project').onclick();assert.equal(dialog.open,true);assert.equal(document.activeElement,get('project-name'));get('cancel-new-project').onclick();assert.equal(dialog.open,false);get('new-project').onclick();assert.equal(dialog.cancel().prevented,false);assert.equal(dialog.open,false);
get('new-project').onclick();get('project-name').value='  ';get('create-project').onsubmit(submit);await settle();assert.equal(dialog.open,true);assert.match(get('create-error').textContent,/이름/);assert.equal(get('create-error').hidden,false);assert.equal(get('cancel-new-project').disabled,false);
get('project-name').value=' 새 게임 ';get('project-directory').value=' C:/게임 공백 폴더 ';failure='/api/launcher/create';get('create-project').onsubmit(submit);await settle();assert.equal(get('create-error').textContent,'검사 요청 실패');assert.equal(dialog.open,true);assert.equal(get('project-name').value,' 새 게임 ');assert.equal(get('project-directory').value,' C:/게임 공백 폴더 ');assert.equal(document.body.dataset.busy,undefined);failure=null;
const createRequest=requests.find(request=>request.url==='/api/launcher/create');assert.deepEqual(JSON.parse(createRequest.body),{name:'새 게임',directory:'C:/게임 공백 폴더'});
const gate={url:'/api/launcher/create'};pending=gate;get('create-project').onsubmit(submit);await settle();assert.equal(document.body.dataset.busy,'1');assert.equal(get('cancel-new-project').disabled,true);assert.equal(dialog.cancel().prevented,true);assert.equal(dialog.open,true);
gate.resolve({ok:false,json:async()=>({error:'저장 거절'})});await settle();assert.equal(document.body.dataset.busy,undefined);assert.equal(get('cancel-new-project').disabled,false);assert.equal(get('create-error').textContent,'저장 거절');get('close-new-project').onclick();assert.equal(dialog.open,false);
const beforeBrowse=requests.filter(request=>request.url==='/api/launcher/open').length;get('browse-project').onclick();await settle();assert.equal(requests.filter(request=>request.url==='/api/launcher/open').length,beforeBrowse,'파일 선택 취소는 프로젝트를 열면 안 돼요.');
browsePath='C:/다른 부모/새 게임 폴더';get('new-project').onclick();get('browse-directory').onclick();await settle();assert.equal(get('project-directory').value,browsePath);assert.equal(document.activeElement,get('project-directory'));get('cancel-new-project').onclick();
const browseRequests=requests.filter(request=>request.url==='/api/launcher/browse');assert.deepEqual(browseRequests.map(request=>JSON.parse(request.body).kind),['project','folder']);
get('project-file').value=' C:/외부 게임/외부.hbproject ';get('open-project').onsubmit(submit);await settle();assert.deepEqual(JSON.parse(requests.filter(request=>request.url==='/api/launcher/open').at(-1).body),{file:'C:/외부 게임/외부.hbproject'});assert.equal(location.href,'/prototype/index.html');location.href='';
rows()[0].onkeydown({key:'ArrowDown',preventDefault(){}});assert.equal(rows()[1].getAttribute('aria-selected'),'true');assert.equal(document.activeElement,rows()[1]);rows()[1].ondblclick();await settle();assert.equal(location.href,'/prototype/index.html');assert.deepEqual(JSON.parse(requests.filter(request=>request.url==='/api/launcher/open').at(-1).body),{file:projects[1].file});
location.href='';get('new-project').onclick();get('create-project').onsubmit(submit);await settle();assert.equal(location.href,'/prototype/index.html');assert.equal(document.body.dataset.busy,undefined);
console.log('프로젝트 허브 검색·선택/열기·검색 선택 해제·모달/취소·오류/입력 보존·busy 복원·키보드/더블클릭·API 계약 검사 통과');
