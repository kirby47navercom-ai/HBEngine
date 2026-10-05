import {ik2dTypes,makeRigIKSolver,rigIKChain} from './ik2d-assets.js';
import {rigMatrices,transform2D} from './sprite-rig-assets.js';
import {icon} from './icons.js';
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createEditorIK(editor,type){return editor.change(data=>{let i=1,name='IK '+i;while(data.solvers?.some(s=>s.name===name))name='IK '+(++i);const s=makeRigIKSolver(data,{name,type,effector:editor.boneId});s.target=transform2D(rigMatrices(data).get(s.effector),[0,0]);(data.solvers??=[]).push(s);editor.solverId=s.id;editor.tool='ik';});}
export function rigIKTree(editor){
  const tree=editor.element.querySelector('.rig-tree'),solvers=editor.doc.data.solvers||[];
  tree.insertAdjacentHTML('beforeend','<h3>IK 솔버</h3><div class="rig-ik-create"><select data-rig-ik-create aria-label="IK 솔버 종류"><option value="ccd">CCD</option><option value="fabrik">FABRIK</option><option value="limb">Limb</option></select><button data-rig-ik-add aria-label="IK 솔버 추가">'+icon('plus')+'</button></div>'+solvers.map(s=>'<button data-rig-solver="'+s.id+'" draggable="true" class="'+(s.id===editor.solverId?'selected':'')+'">'+icon('animation')+'<span>'+esc(s.name)+'</span></button>').join(''));
  tree.querySelector('[data-rig-ik-add]').onclick=()=>createEditorIK(editor,tree.querySelector('[data-rig-ik-create]').value);
  for(const button of tree.querySelectorAll('[data-rig-solver]')){
    button.onclick=()=>{editor.solverId=button.dataset.rigSolver;editor.tool='ik';editor.playing=false;editor.render();};
    button.ondragstart=event=>event.dataTransfer.setData('application/x-hb-rig-ik',button.dataset.rigSolver);button.ondragover=event=>event.preventDefault();
    button.ondrop=event=>{event.preventDefault();const id=event.dataTransfer.getData('application/x-hb-rig-ik');if(!id)return;editor.change(data=>{const from=data.solvers.findIndex(s=>s.id===id),to=data.solvers.findIndex(s=>s.id===button.dataset.rigSolver);if(from<0||to<0)throw Error('IK 솔버 순서를 확인하세요.');const [item]=data.solvers.splice(from,1);data.solvers.splice(to,0,item);});};
  }
}
export function rigIKProperties(editor,props){
  const d=editor.doc.data,s=d.solvers?.find(s=>s.id===editor.solverId);if(!s)return;
  const base='solvers.'+d.solvers.indexOf(s),field=(label,key,value,type='number',choices)=>editor.field(label,base+'.'+key,value,type,choices),check=(label,key)=>'<label class="rig-check"><input data-rig-field="'+base+'.'+key+'" type="checkbox" '+(s[key]?'checked':'')+'>'+esc(label)+'</label>',live=editor.hooks.running()?editor.liveIK?.solvers.find(v=>v.id===s.id):null;
  const roots=d.bones.filter(b=>{try{const n=rigIKChain(d,b.id,s.effector).length;return n>=2&&(s.type!=='limb'||n===3);}catch{return false;}}).map(b=>[b.id,b.name]),ends=d.bones.filter(b=>{try{const n=rigIKChain(d,s.root,b.id).length;return n>=2&&(s.type!=='limb'||n===3);}catch{return false;}}).map(b=>[b.id,b.name]);
  props.insertAdjacentHTML('beforeend','<section><h3>'+esc(s.name)+'</h3>'+field('이름','name',s.name,'text')+field('솔버','type',s.type,'text',Object.entries(ik2dTypes))+field('루트','root',s.root,'text',roots)+field('이펙터','effector',s.effector,'text',ends)+editor.pair('목표 위치',base+'.target',live?.target||s.target)+field('목표 회전','targetRotation',live?.targetRotation??s.targetRotation)+field('가중치','weight',live?.weight??s.weight)+check('활성화','enabled')+check('기준 포즈에서 계산','restorePose')+check('목표 회전 고정','constrainRotation')+(s.type==='limb'?check('굽힘 반전','flip'):field('반복 횟수','iterations',s.iterations)+field('허용 거리','tolerance',s.tolerance)+(s.type==='ccd'?field('회전 적용 비율','velocity',s.velocity):''))+check('기즈모','gizmo')+field('기즈모 색상','color',s.color,'color')+'<div class="rig-ik-order"><button data-rig-ik-order="-1" aria-label="솔버 위로">↑</button><button data-rig-ik-order="1" aria-label="솔버 아래로">↓</button><button data-rig-ik-remove>삭제</button></div>'+(live?'<output class="rig-ik-result">'+(live.reached?'도달':'거리 '+(live.distance??0).toFixed(4))+' · '+live.iterations+'회'+(live.limited?' · 계산 한도':'')+'</output>':'')+'</section>');
  props.querySelector('[data-rig-ik-remove]').onclick=()=>editor.change(data=>{data.solvers=data.solvers.filter(v=>v.id!==s.id);editor.solverId=null;});
  props.querySelectorAll('[data-rig-ik-order]').forEach(button=>button.onclick=()=>editor.change(data=>{const at=data.solvers.findIndex(v=>v.id===s.id),to=Math.max(0,Math.min(data.solvers.length-1,at+Number(button.dataset.rigIkOrder)));const [item]=data.solvers.splice(at,1);data.solvers.splice(to,0,item);}));
}
export function previewRigIK(editor){if(editor.tool!=='ik'||editor.hooks.running())return;try{editor.pose.ik.update();}catch(error){if(editor.ikError!==error.message)editor.hooks.error(error.message);editor.ikError=error.message;}}
export function drawRigIK(editor,ctx){
  if(!editor.showIK)return;for(const s of editor.doc.data.solvers||[]){if(!s.gizmo)continue;const live=editor.hooks.running()?editor.liveIK?.solvers.find(v=>v.id===s.id):null,p=editor.screen(live?.target||s.target);ctx.strokeStyle=s.color;ctx.lineWidth=s.id===editor.solverId?2.5:1.5;ctx.beginPath();ctx.arc(...p,9,0,Math.PI*2);ctx.moveTo(p[0]-13,p[1]);ctx.lineTo(p[0]+13,p[1]);ctx.moveTo(p[0],p[1]-13);ctx.lineTo(p[0],p[1]+13);ctx.stroke();ctx.fillStyle=s.color;ctx.font='12px sans-serif';ctx.fillText(s.name,p[0]+14,p[1]-10);}
}
export function hitRigIK(editor,point){if(editor.tool!=='ik'||!editor.showIK)return;return (editor.doc.data.solvers||[]).findLast(s=>s.gizmo&&Math.hypot(...editor.screen(s.target).map((n,i)=>n-(i?point.y:point.x)))<14);}
