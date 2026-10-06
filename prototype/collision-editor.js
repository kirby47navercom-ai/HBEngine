import * as THREE from 'three';
import {createViewportControls} from './viewport-controls.js';
import {fitViewportSelection} from './viewport-presentation.js';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
import {validColliderGeometry,geometryColliderTypes} from './collision-geometry.js';
import {icon} from './icons.js';

const clone=v=>structuredClone(v);
export function geometrySummary(type,p){return type==='MeshCollider'?`${p.vertices.length} 정점 · ${p.indices.length/3} 삼각형`:type==='PolygonCollider2D'?`${p.paths.length} 경로 · ${p.paths.flat().length} 점`:`${p.points.length} 점 · 열린 선분`;}
export function geometryControls(type,p,id,{blueprint=false,disabled=false}={}){
  if(type==='ShadowCaster2D')return p.source==='shape'?`<div class="collider-geometry-controls"><span>${p.shapePath.length} 점</span><button data-edit-collider="${id}" data-collider-scope="${blueprint?'blueprint':'scene'}" ${disabled?'disabled':''}>${icon('edit')} 모양 편집</button></div>`:'';
  if(type==='Light2D')return p.lightType==='freeform'?`<div class="collider-geometry-controls"><span>${p.shapePath.length} 점</span><button data-edit-collider="${id}" data-collider-scope="${blueprint?'blueprint':'scene'}" ${disabled?'disabled':''}>${icon('edit')} 모양 편집</button></div>`:'';
  if(!geometryColliderTypes.has(type))return '';
  return `<div class="collider-geometry-controls"><span>${geometrySummary(type,p)}</span><button data-edit-collider="${id}" data-collider-scope="${blueprint?'blueprint':'scene'}" ${disabled?'disabled':''}>${icon('edit')} 형상 편집</button>${type==='MeshCollider'?`<button data-bake-collider="${id}" data-collider-scope="${blueprint?'blueprint':'scene'}" ${disabled?'disabled':''}>${icon('cube')} 메시에서 생성</button>`:''}</div>`;
}

// Component data stays untouched while the modal owns its draft and undo stack.
export function editCollisionGeometry(type,properties,{apply,error,title,maximumPoints=512,singlePath=false}){
  let draft=clone(properties),path=0,vertex=0,scale=90,origin=[0,0],snap=.1,drag=null,renderer,world,camera,controls,mesh,observer,frame;
  const past=[],future=[],dialog=document.createElement('dialog'),is3D=type==='MeshCollider';dialog.className='collision-editor';
  dialog.innerHTML=`<div class="dialog-heading"><h2>${title|| (is3D?'메시 충돌':'2D 충돌 형상')}</h2><button data-close aria-label="닫기">${icon('close')}</button></div><div class="collision-editor-toolbar"><button data-undo aria-label="형상 실행 취소">${icon('undo')}</button><button data-redo aria-label="형상 다시 실행">${icon('redo')}</button><button data-fit>전체 보기</button>${is3D?'<label>방식 <select data-mode aria-label="형상 방식"><option value="convex">Convex · 볼록</option><option value="mesh">Triangle Mesh · 삼각형 표면</option></select></label>':'<label>격자 <input data-snap type="number" value="0.1" min="0" max="100" step="0.1" aria-label="형상 격자 간격"></label>'}<output data-stats></output></div><div class="collision-editor-body"><canvas tabindex="0" aria-label="충돌 형상 뷰포트"></canvas><aside>${is3D?'<label>정점 <textarea data-json="vertices" spellcheck="false" aria-label="충돌 정점"></textarea></label><label>삼각형 인덱스 <textarea data-json="indices" spellcheck="false" aria-label="충돌 삼각형 인덱스"></textarea></label>':'<div class="collision-paths"></div><div class="collision-point-actions"><button data-add-point>점 추가</button><button data-remove-point>점 삭제</button></div><div class="collision-point-list"></div>'}</aside></div><div class="collision-editor-footer"><output data-error role="status"></output><button data-close>취소</button><button data-apply class="primary-button">적용</button></div>`;
  document.body.append(dialog);const find=s=>dialog.querySelector(s),canvas=find('canvas'),ctx=is3D?null:canvas.getContext('2d');
  const points=()=>type==='PolygonCollider2D'?draft.paths[path]:draft.points;
  const checkpoint=()=>{past.push(clone(draft));if(past.length>100)past.shift();future.length=0;};
  const report=message=>{find('[data-error]').textContent=message||'';find('[data-apply]').disabled=!!message;};
  const validate=()=>{const valid=validColliderGeometry(type,draft)&&(is3D||(draft.paths?.flat()||draft.points).length<=maximumPoints);report(valid?'':is3D?'정점·삼각형을 확인하세요. 볼록 형상에는 입체적인 점이 필요해요.':'경로가 교차·겹치거나 점이 중복돼요.');return valid;};
  function fit(){
    const all=is3D?draft.vertices:type==='PolygonCollider2D'?draft.paths.flat():draft.points;if(!all?.length)return;
    const bounds=new THREE.Box3().setFromPoints(all.map(p=>new THREE.Vector3(p[0],p[1],p[2]||0))),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
    if(is3D){const distance=Math.max(size.length(),1);camera.near=Math.max(.001,distance/1000);camera.far=Math.max(1000,distance*100);controls.setSettings({speed:distance});fitViewportSelection(camera,controls,bounds);}
    else{origin=[center.x,center.y];scale=Math.min(canvas.clientWidth/Math.max(size.x,1),canvas.clientHeight/Math.max(size.y,1))*.72;draw2D();}
  }
  function draw2D(){
    const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(devicePixelRatio,2);canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#1b1e22';ctx.fillRect(0,0,w,h);
    const screen=p=>[(p[0]-origin[0])*scale+w/2,h/2-(p[1]-origin[1])*scale],spacing=10**Math.ceil(Math.log10(32/scale));ctx.strokeStyle='#30363d';ctx.lineWidth=1;
    for(let x=Math.floor((origin[0]-w/2/scale)/spacing)*spacing;x<origin[0]+w/2/scale;x+=spacing){const sx=screen([x,0])[0];ctx.beginPath();ctx.moveTo(sx,0);ctx.lineTo(sx,h);ctx.stroke();}
    for(let y=Math.floor((origin[1]-h/2/scale)/spacing)*spacing;y<origin[1]+h/2/scale;y+=spacing){const sy=screen([0,y])[1];ctx.beginPath();ctx.moveTo(0,sy);ctx.lineTo(w,sy);ctx.stroke();}
    const paths=type==='PolygonCollider2D'?draft.paths:[draft.points],valid=validColliderGeometry(type,draft);
    paths.forEach((list,k)=>{ctx.beginPath();list.forEach((p,i)=>{const [x,y]=screen(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});if(type==='PolygonCollider2D'){ctx.closePath();ctx.fillStyle=k===path?'#39648444':'#30414a33';ctx.fill();}ctx.strokeStyle=valid?(k===path?'#80bfd8':'#627e8c'):'#df847d';ctx.lineWidth=2;ctx.stroke();list.forEach((p,i)=>{const [x,y]=screen(p);ctx.beginPath();ctx.arc(x,y,k===path&&i===vertex?6:4,0,Math.PI*2);ctx.fillStyle=k===path&&i===vertex?'#f4d48a':'#c5dce5';ctx.fill();ctx.fillStyle='#d1d5da';ctx.font='11px sans-serif';ctx.fillText(String(i+1),x+9,y-8);});});
  }
  function preview3D(){
    if(mesh){mesh.geometry.dispose();mesh.material.dispose();mesh.removeFromParent();mesh=null;}if(!validColliderGeometry(type,draft))return;
    let geometry;if(draft.mode==='convex')geometry=new ConvexGeometry(draft.vertices.map(p=>new THREE.Vector3(...p)));else{geometry=new THREE.BufferGeometry().setFromPoints(draft.vertices.map(p=>new THREE.Vector3(...p)));geometry.setIndex(draft.indices);geometry.computeVertexNormals();}
    mesh=new THREE.Mesh(geometry,new THREE.MeshNormalMaterial({side:THREE.DoubleSide,wireframe:true}));world.add(mesh);
  }
  function render(){
    if(!is3D){path=Math.min(path,(draft.paths?.length||1)-1);vertex=Math.min(vertex,points().length-1);
      find('.collision-paths').innerHTML=singlePath?'':type==='PolygonCollider2D'?`<label>경로 <select aria-label="충돌 경로">${draft.paths.map((_,i)=>`<option value="${i}" ${i===path?'selected':''}>경로 ${i+1}</option>`).join('')}</select></label><button data-add-path ${draft.paths.length>=16?'disabled':''}>경로 추가</button><button data-remove-path ${draft.paths.length<=1?'disabled':''}>경로 삭제</button>`:'<strong>열린 경로</strong>';
      find('.collision-point-list').innerHTML=points().map((p,i)=>`<div class="collision-point ${i===vertex?'selected':''}"><button data-select-point="${i}" aria-label="점 ${i+1} 선택">${i+1}</button>${p.map((n,a)=>`<label>${['X','Y'][a]}<input type="number" value="${n}" step="0.1" min="-10000" max="10000" data-point="${i}" data-axis="${a}" aria-label="점 ${i+1} ${['X','Y'][a]}"></label>`).join('')}</div>`).join('');find('[data-remove-point]').disabled=points().length<=(type==='PolygonCollider2D'?3:2);find('[data-add-point]').disabled=(draft.paths?.flat()||draft.points).length>=maximumPoints;draw2D();
    }else{find('[data-mode]').value=draft.mode;for(const key of ['vertices','indices'])find(`[data-json="${key}"]`).value=JSON.stringify(draft[key]);preview3D();}
    find('[data-stats]').textContent=geometrySummary(type,draft);find('[data-undo]').disabled=!past.length;find('[data-redo]').disabled=!future.length;validate();
  }
  function addPoint(){if((draft.paths?.flat()||draft.points).length>=maximumPoints)return;checkpoint();const list=points(),next=list[(vertex+1)%list.length];list.splice(vertex+1,0,type==='EdgeCollider2D'&&vertex===list.length-1?[list[vertex][0]+.5,list[vertex][1]+.5]:list[vertex].map((v,i)=>+((v+next[i])/2).toFixed(6)));vertex++;render();}
  function removePoint(){if(points().length<=(type==='PolygonCollider2D'?3:2))return;checkpoint();points().splice(vertex,1);render();}
  dialog.onclick=async e=>{const b=e.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-close'))dialog.close();else if(b.hasAttribute('data-fit'))fit();
    else if(b.hasAttribute('data-undo')&&past.length){future.push(clone(draft));draft=past.pop();render();}else if(b.hasAttribute('data-redo')&&future.length){past.push(clone(draft));draft=future.pop();render();}
    else if(b.hasAttribute('data-select-point')){vertex=Number(b.dataset.selectPoint);render();}
    else if(b.hasAttribute('data-add-point'))addPoint();else if(b.hasAttribute('data-remove-point'))removePoint();
    else if(b.hasAttribute('data-add-path')){checkpoint();const x=Math.max(...draft.paths.flat().map(p=>p[0]))+1;draft.paths.push([[x,0],[x+1,0],[x+1,1],[x,1]]);path=draft.paths.length-1;vertex=0;render();}
    else if(b.hasAttribute('data-remove-path')){checkpoint();draft.paths.splice(path,1);render();}
    else if(b.hasAttribute('data-apply')&&validate()){b.disabled=true;try{await apply(clone(draft));dialog.close();}catch(reason){report(reason.message);error?.(reason.message);}}
  };
  dialog.onchange=e=>{const el=e.target;try{
    if(el.hasAttribute('data-point')){const value=Number(el.value);if(!Number.isFinite(value)||Math.abs(value)>10000)throw Error('좌표 범위는 -10,000~10,000이에요.');checkpoint();points()[Number(el.dataset.point)][Number(el.dataset.axis)]=value;render();}
    else if(el.hasAttribute('data-json')){const candidate={...draft,vertices:JSON.parse(find('[data-json="vertices"]').value),indices:JSON.parse(find('[data-json="indices"]').value)};if(!validColliderGeometry(type,candidate))throw Error('정점·삼각형 자료형과 범위를 확인하세요.');checkpoint();draft=candidate;render();}
    else if(el.hasAttribute('data-mode')){checkpoint();draft.mode=el.value;render();}
    else if(el.hasAttribute('data-snap'))snap=Math.max(0,Math.min(100,Number(el.value)||0));
    else if(el.matches('.collision-paths select')){path=Number(el.value);vertex=0;render();}
  }catch(reason){report(reason.message);}};
  dialog.onkeydown=e=>{if(e.target===canvas&&!is3D&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();checkpoint();const axis=e.key==='ArrowLeft'||e.key==='ArrowRight'?0:1,step=(snap||.01)*(e.shiftKey?10:1),direction=e.key==='ArrowLeft'||e.key==='ArrowDown'?-1:1;points()[vertex][axis]=+Math.max(-10000,Math.min(10000,points()[vertex][axis]+step*direction)).toFixed(6);render();}if(e.target===canvas&&['Delete','Backspace'].includes(e.key)&&!is3D){e.preventDefault();removePoint();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!e.target.matches('input,textarea')){e.preventDefault();find(e.shiftKey?'[data-redo]':'[data-undo]').click();}e.stopPropagation();};
  if(!is3D){
    const local=e=>{const r=canvas.getBoundingClientRect();return [(e.clientX-r.left-canvas.clientWidth/2)/scale+origin[0],(canvas.clientHeight/2-e.clientY+r.top)/scale+origin[1]];};
    canvas.oncontextmenu=e=>e.preventDefault();canvas.onpointerdown=e=>{canvas.focus();if(e.button===1||e.button===2){drag={pan:[...origin],x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);e.preventDefault();return;}if(e.button!==0)return;const p=local(e);let hit=null;const paths=type==='PolygonCollider2D'?draft.paths:[draft.points];paths.forEach((list,k)=>list.forEach((q,i)=>{if(Math.hypot(q[0]-p[0],q[1]-p[1])*scale<10)hit=[k,i];}));
      if(hit){[path,vertex]=hit;if(e.ctrlKey||e.metaKey){removePoint();return;}checkpoint();drag={point:true};}
      else{let edge=null,best=8/scale;paths.forEach((list,k)=>{for(let i=0;i<(type==='PolygonCollider2D'?list.length:list.length-1);i++){const a=list[i],b=list[(i+1)%list.length],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy))),q=[a[0]+t*dx,a[1]+t*dy],d=Math.hypot(q[0]-p[0],q[1]-p[1]);if(d<best){best=d;edge={path:k,index:i,next:(i+1)%list.length,point:q};}}});if(!edge)return;path=edge.path;vertex=edge.index;
        if(e.shiftKey){checkpoint();drag={edge:[edge.index,edge.next],start:p,original:clone(points())};}
        else if((e.ctrlKey||e.metaKey)){removePoint();return;}
        else{if((draft.paths?.flat()||draft.points).length>=maximumPoints)return;checkpoint();points().splice(vertex+1,0,edge.point.map(v=>+v.toFixed(6)));vertex++;drag={point:true};}
      }canvas.setPointerCapture(e.pointerId);render();};
    canvas.onpointermove=e=>{if(!drag)return;if(drag.pan){origin=[drag.pan[0]-(e.clientX-drag.x)/scale,drag.pan[1]+(e.clientY-drag.y)/scale];draw2D();}else{const p=local(e),round=v=>+(snap?Math.round(v/snap)*snap:v).toFixed(6);if(drag.edge){const delta=p.map((v,i)=>round(v-drag.start[i]));for(const index of drag.edge)points()[index]=drag.original[index].map((v,i)=>+(v+delta[i]).toFixed(6));}else points()[vertex]=p.map(round);draw2D();validate();}};
    canvas.onpointerup=canvas.onpointercancel=()=>{drag=null;render();};canvas.onwheel=e=>{e.preventDefault();const before=local(e);scale=Math.max(.01,Math.min(10000,scale*Math.exp(-e.deltaY*.001)));const after=local(e);origin=origin.map((v,i)=>v+before[i]-after[i]);draw2D();};
  }
  dialog.onclose=()=>{cancelAnimationFrame(frame);observer?.disconnect();controls?.dispose();if(mesh){mesh.geometry.dispose();mesh.material.dispose();}renderer?.dispose();dialog.remove();};
  dialog.showModal();
  if(is3D){try{renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));world=new THREE.Scene();world.background=new THREE.Color('#1b1e22');camera=new THREE.PerspectiveCamera(45,Math.max(1,canvas.clientWidth)/Math.max(1,canvas.clientHeight),.01,1000);camera.position.set(1,1,1);controls=createViewportControls(camera,canvas,{onFocus:fit});const tick=()=>{if(!dialog.open)return;controls.update();renderer.render(world,camera);frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);}catch(reason){dialog.close();error?.(reason.message);return;}}
  observer=new ResizeObserver(()=>{if(is3D){renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);camera.aspect=canvas.clientWidth/canvas.clientHeight;camera.updateProjectionMatrix();}else draw2D();});observer.observe(canvas);render();fit();canvas.focus();
}
