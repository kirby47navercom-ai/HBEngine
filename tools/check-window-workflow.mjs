import assert from 'node:assert/strict';
import {DockLayout,dockDropZone,moveLayoutTab,restoreLayout,validLayout,defaultDockRatio} from '../prototype/dock-layout.js';
import {ProjectBrowser,savedBrowserIds} from '../prototype/project-browser.js';
import {storageKey} from '../prototype/project-session.js';

const clone=value=>structuredClone(value),ids=new Set(['scene','project','project:2','console']);
const rect={left:10,top:100,width:600,height:400};
for(const height of [720,768,1080,1244,2160]){const ratio=defaultDockRatio(height);assert.ok(ratio>=.60&&ratio<=.82);assert.ok((height-110)*ratio>=360,'주 작업창은 작은 화면에서도 360px 이상을 확보한다');assert.ok((height-110)*(1-ratio)>=240,'기본 콘텐츠 브라우저는 도구와 여러 파일 행을 함께 보여준다');}
assert.equal(dockDropZone(rect,{x:300,y:112}),'center','탭줄에서 놓으면 위로 분할하지 않고 탭을 합친다');
assert.equal(dockDropZone(rect,{x:300,y:150}),'top','본문의 위쪽은 분할한다');
assert.equal(dockDropZone(rect,{x:300,y:300}),'center');
assert.equal(dockDropZone(rect,{x:300,y:150},{explicitZone:'center'}),'center','명시적 중앙 도킹 표적');
assert.equal(DockLayout.prototype.dropZone.call({}, {getBoundingClientRect:()=>rect}, {clientX:30,clientY:110,target:{closest:selector=>selector==='.dock-tabs'?{}:null}}),'center');

const original={axis:'column',ratio:.61,a:{tabs:['scene'],active:'scene'},b:{axis:'row',ratio:.37,a:{tabs:['project','console'],active:'project'},b:{tabs:['project:2'],active:'project:2'}}};
let tree=clone(original),target=tree.b.a;
tree=moveLayoutTab(tree,'scene',target,'center');
assert.ok(validLayout(tree,ids));assert.equal(tree.ratio,.37,'병합은 다른 사용자가 조절한 split 비율을 보존한다');
assert.deepEqual(tree.a.tabs,['project','console','scene']);assert.equal(tree.a.active,'scene');
tree=moveLayoutTab(tree,'console',tree.a,'right');assert.ok(validLayout(tree,ids));assert.equal(tree.a.axis,'row');assert.equal(tree.a.b.active,'console');
const unchanged=JSON.stringify(tree);assert.equal(moveLayoutTab(tree,'scene',{tabs:[]},'center'),tree);assert.equal(JSON.stringify(tree),unchanged,'지난 render의 무효 target은 레이아웃을 망가뜨리지 않는다');
assert.deepEqual(restoreLayout(original,ids),original,'저장된 사용자 배치를 초기 배치로 덮어쓰지 않는다');
const harness={tree:clone(original),entries:new Map([...ids].map(id=>[id,{id}])),leaves:DockLayout.prototype.leaves,render(){this.rendered=true;},focus(id){this.focused=id;}};
DockLayout.prototype.move.call(harness,'project:2',harness.tree.b.a,'center');assert.equal(harness.focused,'project:2');assert.ok(harness.rendered);assert.ok(validLayout(harness.tree,ids));

const oldStorage=globalThis.localStorage,oldFetch=globalThis.fetch;
const values=new Map();globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key),get length(){return values.size;},key:index=>[...values.keys()][index]??null};
const requests=[],fixtures={Assets:[{name:'Root.hbscene.json',path:'Assets/Root.hbscene.json',kind:'scene'}],'Assets/Meshes':[{name:'Cube.glb',path:'Assets/Meshes/Cube.glb',kind:'model'}],'Assets/Animation':[{name:'Walk.hbanimation.json',path:'Assets/Animation/Walk.hbanimation.json',kind:'animation'}],'Assets/Materials':[{name:'Stone.hbmaterial.json',path:'Assets/Materials/Stone.hbmaterial.json',kind:'material'}]};
globalThis.fetch=async url=>{const query=new URL(url,'http://localhost').searchParams;requests.push(Object.fromEntries(query));return {ok:true,json:async()=>({root:'C:/Project',folders:Object.keys(fixtures).map(path=>({path,name:path.split('/').at(-1)})),entries:fixtures[query.get('folder')]||[]})};};
function browserElement(){
  const controls=new Map(['search','type','contents','recursive','back','forward','up','folders','results','grid'].map(name=>['[data-project-'+name+']',{value:name==='type'?'all':'',checked:name==='recursive',dataset:{},disabled:false,focus(){this.focused=true;}}]));
  controls.set('[data-contents]',controls.get('[data-project-contents]'));controls.set('[data-recursive]',controls.get('[data-project-recursive]'));
  const heading={},buttons=['list','tiles'].map(view=>({dataset:{projectView:view},setAttribute(key,value){this[key]=value;}})),handlers=new Map(),labels=[];
  return {dataset:{},controls,handlers,labels,buttons,querySelector:selector=>controls.get(selector)||(selector==='.project-list-heading'?heading:null),querySelectorAll:selector=>selector==='[data-project-view]'?buttons:selector==='[data-project-entry] .asset-name'?labels:[],addEventListener:(name,handler)=>handlers.set(name,handler)};
}
try{
  values.set(storageKey('hbengine.project.folder'),'Assets');values.set(storageKey('hbengine.project.view'),'tiles');
  const aElement=browserElement(),bElement=browserElement(),a=new ProjectBrowser(aElement,{}, {},{id:'project'}),b=new ProjectBrowser(bElement,{}, {},{id:'project:2',folder:'Assets/Materials'});
  await Promise.all([a.ready,b.ready]);assert.equal(a.view,'tiles','이전 기본 브라우저 표시 설정을 유지한다');assert.equal(b.view,'list');
  assert.doesNotMatch(aElement.innerHTML,/\bid="asset-/,'반복 생성되는 DOM에 전역 asset ID를 만들지 않는다');
  await a.navigate('Assets/Meshes');aElement.controls.get('[data-project-search]').value='cube';aElement.controls.get('[data-project-type]').value='model';await a.refresh();a.select(0,{});
  const bState=JSON.stringify(b.snapshot());await a.navigate('Assets/Animation');assert.equal(await a.navigateHistory(-1),true);
  assert.equal(a.folder,'Assets/Meshes');assert.equal(a.snapshot().query,'cube');assert.equal(a.snapshot().type,'model');assert.ok(a.selected.has('Assets/Meshes/Cube.glb'),'뒤로 가기는 폴더별 선택도 복원한다');
  assert.equal(JSON.stringify(b.snapshot()),bState,'다른 창의 폴더·검색·필터·선택을 바꾸지 않는다');
  assert.equal(await a.navigateHistory(1),true);assert.equal(a.folder,'Assets/Animation');await a.navigateHistory(-1);await a.navigate('Assets');assert.equal(await a.navigateHistory(1),false,'뒤로 간 다음 새 폴더를 열면 앞으로 기록을 교체한다');
  bElement.controls.get('[data-project-search]').value='stone';bElement.controls.get('[data-contents]').checked=true;b.setView('tiles');await b.refresh();b.select(0,{});
  const restored=new ProjectBrowser(browserElement(),{}, {},{id:'project:2'});await restored.ready;assert.equal(restored.folder,'Assets/Materials');assert.equal(restored.snapshot().query,'stone');assert.equal(restored.snapshot().contents,true);assert.equal(restored.view,'tiles');assert.ok(restored.selected.has('Assets/Materials/Stone.hbmaterial.json'));
  assert.deepEqual(savedBrowserIds().sort(),['project','project:2']);
  const requestCount=requests.length;assert.equal(await a.navigate('../Outside'),false);assert.equal(await a.navigate('C:/Outside'),false);assert.equal(requests.length,requestCount);
  b.dispose();const count=requests.length;await b.refresh();assert.equal(requests.length,count,'닫힌 browser의 남은 timer/request는 다시 실행하지 않는다');
  assert.ok(requests.some(query=>query.folder==='Assets/Meshes'&&query.q==='cube'&&query.type==='model'),'실제 API 호출은 활성 인스턴스의 폴더·필터를 사용한다');
}finally{globalThis.localStorage=oldStorage;globalThis.fetch=oldFetch;}
console.log('HBEngine Windows: 탭줄 병합·분할·배치 비율 보존, 독립 콘텐츠 브라우저·폴더 기록·필터·선택 복원 검사 통과');
