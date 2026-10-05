import * as THREE from 'three';

export const viewportModes={lit:'라이팅 포함',unlit:'라이팅 제외',wireframe:'와이어프레임',lighting:'조명만',detailLighting:'상세 조명',normals:'월드 노멀'};
export const viewportDirections={'3d':'원근','2d':'2D · XY',top:'위',bottom:'아래',front:'앞',back:'뒤',left:'왼쪽',right:'오른쪽'};
export const viewportFlags={grid:'그리드',helpers:'편집 아이콘',selection:'선택 윤곽',collision:'충돌',sky:'하늘',fog:'안개',lights:'광원',particles:'입자',decals:'데칼',sprites:'2D 스프라이트',meshes:'메시'};
export const defaultViewportSettings={mode:'lit',gameView:false,realtime:true,exposure:1,flags:Object.fromEntries(Object.keys(viewportFlags).map(k=>[k,k!=='collision'])),camera:{fov:60,near:.05,far:100000}};

export function validViewportSettings(v){return !!v&&Object.hasOwn(viewportModes,v.mode)&&['gameView','realtime'].every(k=>typeof v[k]==='boolean')&&Number.isFinite(v.exposure)&&v.exposure>=.05&&v.exposure<=10&&v.flags&&Object.keys(viewportFlags).every(k=>typeof v.flags[k]==='boolean')&&v.camera&&Number.isFinite(v.camera.fov)&&v.camera.fov>=5&&v.camera.fov<=150&&Number.isFinite(v.camera.near)&&v.camera.near>=.001&&Number.isFinite(v.camera.far)&&v.camera.far>v.camera.near&&v.camera.far<=10000000;}

// All overrides are restored after each render: other viewports and saved materials keep their data.
export class ViewportPresentation{
  constructor(settings){this.settings=structuredClone(validViewportSettings(settings)?settings:defaultViewportSettings);this.cache=new Map();this.needsRender=true;}
  pickable(node,objects){const {flags,gameView}=this.settings;const object=objects.find(o=>o.id===node.userData.objectId);if(!object||!object.visible||object.locked)return false;for(let p=node;p;p=p.parent)if(p.visible===false)return false;if(node.userData.editorHelper&&(!flags.helpers||gameView))return false;const kind=object.kind;return kind==='particles'?flags.particles:kind==='decal'?flags.decals:['sprite','character2d','tilemap'].includes(kind)?flags.sprites:['camera','light','light2d','directionalLight','pointLight','spotLight','skyAtmosphere','skyLight','volumetricCloud','heightFog'].includes(kind)?flags.helpers&&!gameView:flags.meshes;}
  configure(patch){const next={...this.settings,...patch,flags:{...this.settings.flags,...patch.flags},camera:{...this.settings.camera,...patch.camera}};if(!validViewportSettings(next))throw Error('뷰포트 보기 설정을 확인하세요.');this.settings=next;this.needsRender=true;return structuredClone(next);}
  material(original){const mode=this.settings.mode;if(mode==='lit')return original;let modes=this.cache.get(original);if(!modes)this.cache.set(original,modes=new Map());let m=modes.get(mode);if(m){if(mode==='unlit'){m.color.copy(original.color||new THREE.Color(0xffffff));if(m.map!==original.map||m.alphaTest!==original.alphaTest||m.transparent!==original.transparent)m.needsUpdate=true;m.map=original.map||null;m.opacity=original.opacity;m.alphaTest=original.alphaTest;m.transparent=original.transparent;}else if(mode==='detailLighting'){if(m.normalMap!==original.normalMap||m.bumpMap!==original.bumpMap)m.needsUpdate=true;m.normalMap=original.normalMap;m.bumpMap=original.bumpMap;m.bumpScale=original.bumpScale;m.normalScale.copy(original.normalScale||new THREE.Vector2(1,1));}m.side=mode==='wireframe'?THREE.DoubleSide:original.side;return m;}
    if(mode==='normals'){m=new THREE.MeshNormalMaterial({side:original.side});m.userData.viewInverse={value:new THREE.Matrix4()};m.onBeforeCompile=shader=>{shader.uniforms.hbViewInverse=m.userData.viewInverse;shader.fragmentShader='uniform mat4 hbViewInverse;\n'+shader.fragmentShader.replace('packNormalToRGB( normal )','packNormalToRGB( normalize(mat3(hbViewInverse) * normal) )');};m.customProgramCacheKey=()=> 'hb-world-normals-v1';}
    else if(mode==='wireframe')m=new THREE.MeshBasicMaterial({color:0xb7c5d5,wireframe:true,side:THREE.DoubleSide});
    else if(mode==='unlit')m=new THREE.MeshBasicMaterial({color:original.color||0xffffff,map:original.map||null,transparent:original.transparent,opacity:original.opacity,alphaTest:original.alphaTest,side:original.side});
    else m=new THREE.MeshStandardMaterial({color:0xbfbfbf,roughness:.8,metalness:0,side:original.side,normalMap:mode==='detailLighting'?original.normalMap||null:null,bumpMap:mode==='detailLighting'?original.bumpMap||null:null,bumpScale:original.bumpScale??1});
    if(mode==='detailLighting'&&original.normalScale)m.normalScale.copy(original.normalScale);modes.set(mode,m);return m;
  }
  render(renderer,scene,camera,{grid,helpers=[],selection,collision,sky=[],objects=[],prepare2D}={}){
    const {flags,gameView,mode,exposure}=this.settings,changes=[],materials=[],oldFog=scene.fog,oldEnvironment=scene.environment,oldExposure=renderer.toneMappingExposure,fogEnabled=scene.userData.heightFogUniforms?.hbHeightFogEnabled,oldHeightFog=fogEnabled?.value;
    const hide=o=>{if(o&&o.visible){changes.push(o);o.visible=false;}},editorMaterials=new Set(),sceneMaterials=new Set();
    for(const root of [grid,...helpers,selection,collision,...sky].filter(Boolean))root.traverse(o=>editorMaterials.add(o));
    try{
      if(!flags.grid||gameView)hide(grid);if(!flags.helpers||gameView)helpers.forEach(hide);if(!flags.selection||gameView)hide(selection);if(!flags.collision||gameView)hide(collision);if(!flags.sky)sky.forEach(hide);if(!flags.fog||mode!=='lit'&&mode!=='detailLighting'&&mode!=='lighting')scene.fog=null;
      if(fogEnabled&&!scene.fog)fogEnabled.value=0;
      const objectKinds=new Map(objects.map(o=>[o.id,o.kind]));scene.traverse(o=>{
        for(const material of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])sceneMaterials.add(material);
        if(o.userData.editorHelper&&(!flags.helpers||gameView))hide(o);
        const kind=objectKinds.get(o.userData.objectId);
        if(kind&&(kind==='particles'&&!flags.particles||kind==='decal'&&!flags.decals||['sprite','character2d','tilemap'].includes(kind)&&!flags.sprites||!['sprite','character2d','tilemap','particles','decal','camera','light','light2d','directionalLight','pointLight','spotLight','skyAtmosphere','skyLight','volumetricCloud','heightFog'].includes(kind)&&!flags.meshes))hide(o);
        if(o.isLight&&!flags.lights)hide(o);
        if(o.isMesh&&o.material&&mode!=='lit'&&!editorMaterials.has(o)&&!o.userData.editorHelper){materials.push([o,o.material]);o.material=Array.isArray(o.material)?o.material.map(m=>this.material(m)):this.material(o.material);if(mode==='normals')for(const m of Array.isArray(o.material)?o.material:[o.material])m.userData.viewInverse.value.copy(camera.matrixWorld);}
      });
      // Only diagnostic copies belong to this viewport; source assets stay alive.
      for(const [original,modes] of this.cache)if(!sceneMaterials.has(original)){for(const material of modes.values())material.dispose();this.cache.delete(original);}
      if(!flags.lights)scene.environment=null;renderer.toneMappingExposure=oldExposure*exposure;prepare2D?.({lights:flags.lights});renderer.render(scene,camera);this.needsRender=false;
    }finally{for(const [o,m] of materials)o.material=m;for(const o of changes)o.visible=true;scene.fog=oldFog;scene.environment=oldEnvironment;renderer.toneMappingExposure=oldExposure;if(fogEnabled)fogEnabled.value=oldHeightFog;}
  }
  dispose(){for(const modes of this.cache.values())for(const m of modes.values())m.dispose();this.cache.clear();}
}

export function applyViewportDirection(camera,direction,target=new THREE.Vector3()){
  const poses={top:[[0,1,0],[0,0,-1]],bottom:[[0,-1,0],[0,0,1]],front:[[0,0,1],[0,1,0]],'2d':[[0,0,1],[0,1,0]],back:[[0,0,-1],[0,1,0]],left:[[-1,0,0],[0,1,0]],right:[[1,0,0],[0,1,0]]};
  if(!poses[direction])throw Error('직교 뷰 방향을 확인하세요.');const [offset,up]=poses[direction],distance=Math.max(1,camera.position.distanceTo(target));camera.up.fromArray(up);camera.position.copy(target).addScaledVector(new THREE.Vector3(...offset),distance);camera.lookAt(target);camera.updateProjectionMatrix();
}

export function fitViewportSelection(camera,controls,bounds){
  if(bounds.isEmpty())return false;const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());if(!center.toArray().every(Number.isFinite))return false;
  const direction=camera.position.clone().sub(controls.target).normalize();if(direction.lengthSq()<.5)direction.set(1,1,1).normalize();controls.target.copy(center);
  if(camera.isPerspectiveCamera){const radius=Math.max(.05,size.length()/2),vertical=THREE.MathUtils.degToRad(camera.fov)/2,horizontal=Math.atan(Math.tan(vertical)*camera.aspect);camera.position.copy(center).addScaledVector(direction,radius/Math.sin(Math.min(vertical,horizontal))*1.15);}
  else{const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion),up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);const extents=axis=>Math.abs(axis.x)*size.x+Math.abs(axis.y)*size.y+Math.abs(axis.z)*size.z;camera.zoom=Math.min((camera.right-camera.left)/Math.max(.1,extents(right)),(camera.top-camera.bottom)/Math.max(.1,extents(up)))/1.15;camera.position.copy(center).addScaledVector(direction,Math.max(20,size.length()*2));}
  camera.updateProjectionMatrix();camera.lookAt(center);controls.update();return true;
}

export function createViewportOrientationWidget(parent,{camera,onDirection}){
  const doc=parent.ownerDocument,element=doc.createElement('div');element.className='viewport-orientation';element.ariaLabel='뷰포트 방향 선택';
  const axes=[['right','X',1,0,0],['left','−X',-1,0,0],['top','Y',0,1,0],['bottom','−Y',0,-1,0],['front','Z',0,0,1],['back','−Z',0,0,-1]].map(([key,label,x,y,z])=>{
    const button=doc.createElement('button');button.textContent=label;button.ariaLabel=viewportDirections[key]+' 방향 보기';button.title=button.ariaLabel;button.dataset.axis=label.replace('−','');button.dataset.negative=String(label.startsWith('−'));button.onclick=()=>onDirection(key);element.append(button);return {button,axis:new THREE.Vector3(x,y,z)};
  });
  const perspective=doc.createElement('button');perspective.textContent='P';perspective.ariaLabel='원근 보기';perspective.title='원근 보기';perspective.className='viewport-orientation-center';perspective.onclick=()=>onDirection('3d');element.append(perspective);parent.append(element);
  const update=()=>{const surface=parent.querySelector(':scope > canvas');if(surface)element.style.top=(surface.offsetTop+9)+'px';const inverse=camera().quaternion.clone().invert();for(const {axis,button} of axes){const point=axis.clone().applyQuaternion(inverse);button.style.left=(30+point.x*22)+'px';button.style.top=(30-point.y*22)+'px';button.style.zIndex=String(Math.round(point.z*20)+25);button.style.opacity=point.z<-.1?'.55':'1';}};
  update();return {element,update,dispose:()=>element.remove()};
}

export function createViewportToolbar(parent,{presentation,controls,camera,direction,onDirection,onAction,onChange}){
  const doc=parent.ownerDocument,bar=doc.createElement('div');bar.className='viewport-options';
  const select=(label,options,value,change)=>{const input=doc.createElement('select');input.ariaLabel=label;input.title=label;for(const [key,text] of Object.entries(options)){const o=doc.createElement('option');o.value=key;o.textContent=text;input.append(o);}input.value=value;input.onchange=()=>{change(input.value);onChange?.();};bar.append(input);return input;};
  const dir=select('뷰포트 방향',viewportDirections,direction(),onDirection),mode=select('뷰포트 보기 모드',viewportModes,presentation.settings.mode,value=>presentation.configure({mode:value}));
  const menu=(label)=>{const details=doc.createElement('details');details.className='viewport-options-menu';const summary=doc.createElement('summary');summary.textContent=label;details.append(summary);const body=doc.createElement('div');body.popover='auto';details.append(body);bar.append(details);
    details.addEventListener('toggle',()=>{if(!details.open){if(body.matches(':popover-open'))body.hidePopover();return;}for(const other of details.ownerDocument.querySelectorAll('.viewport-options-menu[open]'))if(other!==details)other.open=false;const rect=summary.getBoundingClientRect(),win=details.ownerDocument.defaultView;body.style.left=Math.max(8,Math.min(rect.left,win.innerWidth-246))+'px';body.style.top=Math.min(rect.bottom+4,Math.max(8,win.innerHeight-180))+'px';body.style.maxHeight=Math.max(80,win.innerHeight-parseFloat(body.style.top)-12)+'px';if(!body.matches(':popover-open'))body.showPopover();});
    body.addEventListener('toggle',e=>{if(e.newState==='closed')details.open=false;});return body;};
  const show=menu('표시');for(const [key,label] of Object.entries(viewportFlags)){const row=doc.createElement('label'),input=doc.createElement('input');input.type='checkbox';input.checked=presentation.settings.flags[key];input.dataset.viewportFlag=key;input.onchange=()=>{presentation.configure({flags:{[key]:input.checked}});onChange?.();};row.append(input,label);show.append(row);}
  const options=menu('카메라');
  const number=(body,label,value,min,max,step,change)=>{const row=doc.createElement('label'),input=doc.createElement('input');input.type='number';input.value=value;input.min=min;input.max=max;input.step=step;input.ariaLabel=label;input.onchange=()=>{const v=Number(input.value);try{if(!Number.isFinite(v)||v<min||v>max)throw Error();change(v);input.setCustomValidity('');onChange?.();}catch{input.setCustomValidity('범위를 확인하세요.');input.reportValidity();}};row.append(label,input);body.append(row);return input;};
  const ctrl=()=>controls();number(options,'이동 속도',ctrl().getSettings().speed,.01,1000000,.5,v=>ctrl().setSettings({speed:v}));number(options,'속도 배율',ctrl().getSettings().speedScalar,.01,10000,.25,v=>ctrl().setSettings({speedScalar:v}));number(options,'마우스 감도',ctrl().getSettings().sensitivity,.0001,.05,.0001,v=>ctrl().setSettings({sensitivity:v}));
  for(const [key,label,min,max,step] of [['fov','시야각',5,150,1],['near','근거리 클립',.001,1000,.01],['far','원거리 클립',1,10000000,1000]])number(options,label,presentation.settings.camera[key],min,max,step,v=>{const c=camera();presentation.configure({camera:{fov:c.fov||presentation.settings.camera.fov,near:c.near,far:c.far,[key]:v}});if(c.isPerspectiveCamera&&key==='fov')c.fov=v;else if(key!=='fov')c[key]=v;c.updateProjectionMatrix();});
  number(options,'노출 배율',presentation.settings.exposure,.05,10,.05,v=>presentation.configure({exposure:v}));
  number(options,'빠른 이동 배율',ctrl().getSettings().fastMultiplier,1,100,1,v=>ctrl().setSettings({fastMultiplier:v}));number(options,'휠 확대 속도',ctrl().getSettings().scrollZoomSpeed,.01,100,.1,v=>ctrl().setSettings({scrollZoomSpeed:v}));
  for(const [key,label] of [['distanceBasedSpeed','거리에 따른 이동 속도'],['zoomToCursor','커서 기준 확대'],['worldSpaceVerticalPan','월드 수직 패닝'],['invertLookY','마우스 상하 반전'],['invertOrbitY','회전 상하 반전'],['invertMiddleMousePan','패닝 반전'],['invertDolly','돌리 반전'],['restoreFov','조작 종료 후 시야각 복원']]){const row=doc.createElement('label'),input=doc.createElement('input');input.type='checkbox';input.checked=!!ctrl().getSettings()[key];input.dataset.viewportControl=key;input.onchange=()=>{ctrl().setSettings({[key]:input.checked});onChange?.();};row.append(input,label);options.append(row);}
  const flight=doc.createElement('select');flight.ariaLabel='비행 이동 키 활성화';for(const [key,label] of [['rmb','우클릭 중'],['always','뷰포트 포커스 중'],['never','사용 안 함']]){const o=doc.createElement('option');o.value=key;o.textContent=label;flight.append(o);}flight.value=ctrl().getSettings().flightMode;flight.onchange=()=>{ctrl().setSettings({flightMode:flight.value});onChange?.();};const flightLabel=doc.createElement('label');flightLabel.append('비행 이동 키',flight);options.append(flightLabel);
  const actions=menu('뷰포트');for(const [key,label] of [['focus','선택에 초점 · F'],['game','게임 보기 · G'],['realtime','실시간 · Ctrl R'],['immersive','몰입 보기 · F11'],['pilot','선택 카메라 조종'],['unpilot','카메라 조종 종료'],['align-object','선택을 뷰에 맞춤'],['align-camera','선택 카메라로 이동'],['camera','현재 뷰로 카메라 만들기'],['floor','바닥에 맞춤 · End'],['pivot-center','선택 중심을 피벗으로'],['pivot-reset','피벗 초기화'],['surface-snap','표면 스냅 전환'],['surface-normal','표면 방향 정렬 전환'],['screenshot','스크린샷']]){const b=doc.createElement('button');b.textContent=label;b.dataset.viewportAction=key;b.onclick=()=>{actions.parentElement.open=false;onAction(key);onChange?.();};actions.append(b);}
  const bookmarks=menu('북마크');for(let i=0;i<10;i++){const row=doc.createElement('div');row.className='viewport-bookmark-row';for(const [key,label] of [['restore','이동'],['save','저장']]){const b=doc.createElement('button');b.textContent=`${i} ${label}`;b.title=key==='save'?`Ctrl ${i}`:String(i);b.onclick=()=>{key==='save'?ctrl().saveBookmark(i):ctrl().restoreBookmark(i);onChange?.();};row.append(b);}bookmarks.append(row);}
  const sync=()=>{dir.value=direction();mode.value=presentation.settings.mode;const s=ctrl().getSettings();for(const el of options.querySelectorAll('[data-viewport-control]'))el.checked=s[el.dataset.viewportControl];flight.value=s.flightMode;const values={'이동 속도':s.speed,'속도 배율':s.speedScalar,'마우스 감도':s.sensitivity,'빠른 이동 배율':s.fastMultiplier,'휠 확대 속도':s.scrollZoomSpeed,'시야각':camera().fov||presentation.settings.camera.fov,'근거리 클립':camera().near,'원거리 클립':camera().far,'노출 배율':presentation.settings.exposure};for(const el of options.querySelectorAll('input[type=number]'))el.value=values[el.ariaLabel];for(const el of show.querySelectorAll('[data-viewport-flag]'))el.checked=presentation.settings.flags[el.dataset.viewportFlag];};for(const details of bar.querySelectorAll('details'))details.addEventListener('toggle',sync);
  parent.append(bar);return {element:bar,sync,setDirection:value=>{dir.value=value;}};
}
