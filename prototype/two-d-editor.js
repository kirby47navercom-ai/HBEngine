import {sliceSprite,mergeSpriteSlices,trimSpriteRect,resolveSprite} from './sprite-import.js';
import {editorAnimationFrame,cancelEditorAnimationFrame} from './detached-window.js';
import {icon} from './icons.js';
import {twoDTypes,valid2DAsset,spriteImage,sliceSpriteGrid,spriteAnimationFrame,spriteAnimationDuration,tileAtlasRect,applyTileTool,tileCellPoint,tileLocalToCell,tileCellPolygon,tileRenderRect} from './two-d-assets.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const fileUrl=path=>'/api/file?path='+encodeURIComponent(path);
const number=(field,label,value,min=0,max=100000,step=1)=>`<label>${label}<input data-two-d-field="${field}" type="number" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;
export function spritePixels(image,ownerDocument){if(!image)throw Error('텍스처를 선택하세요.');if(image.width*image.height>16777216)throw Error('픽셀 분석은 1600만 픽셀까지 지원해요.');const c=ownerDocument.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);return ctx.getImageData(0,0,c.width,c.height);}
export function renderTwoDEditor(element,doc,files,hooks={}){return new TwoDEditor(element,doc,files,hooks);}
export class TwoDEditor {
  constructor(element,doc,files,hooks={}){
    this.el=element;this.doc=doc;this.files=files;this.hooks=hooks;this.images=new Map();this.assets=new Map();this.zoom=1;this.tool='brush';this.tile=0;this.palettePage=0;this.layer=doc.data.layers?.[0]?.id;this.time=0;this.frame=0;this.playing=false;this.slice={mode:'size',width:32,height:32,columns:4,rows:4,margin:0,spacing:0,keepEmpty:true,threshold:0,method:'smart'};this.showSlices=true;this.sliceDraft=null;this.sliceSelected=null;
    this.onBlur=()=>this.finishStroke({render:true});globalThis.addEventListener?.('blur',this.onBlur);
    element.classList.add('two-d-editor');this.render();
  }
  fileList(){return typeof this.files==='function'?this.files():this.files||[];}
  reference(field,label,kind,value){
    const files=this.fileList().filter(file=>file.kind===kind),choices=[['','선택'],...files.map(file=>[file.path,file.name||file.path])];
    if(value&&!choices.some(([path])=>path===value))choices.push([value,value]);
    return `<label>${label}<select data-two-d-field="${field}">${choices.map(([path,name])=>`<option value="${esc(path)}" ${path===value?'selected':''}>${esc(name)}</option>`).join('')}</select></label>`;
  }
  async image(path){
    if(!path)return null;
    if(!this.images.has(path))this.images.set(path,new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>{this.images.delete(path);reject(Error('텍스처를 읽을 수 없어요: '+path));};image.src=this.hooks.imageUrl?.(path)||fileUrl(path);}));
    return this.images.get(path);
  }
  async asset(path){
    if(!this.assets.has(path))this.assets.set(path,Promise.resolve(this.hooks.read?this.hooks.read(path):fetch(fileUrl(path)).then(response=>{if(!response.ok)throw Error('에셋 읽기 실패: '+path);return response.json();})).catch(error=>{this.assets.delete(path);throw error;}));
    return this.assets.get(path);
  }
  edit(change){
    this.flush();const next=structuredClone(this.doc.data);change(next);
    if(!valid2DAsset(this.doc.kind,next)){this.hooks.error?.('값이나 참조를 확인하세요.');this.render();return false;}
    if(JSON.stringify(next)===JSON.stringify(this.doc.data))return false;
    this.hooks.before?.();this.doc.data=next;this.hooks.change?.();this.render();return true;
  }
  render(){
    if(this.disposed)return;this.flush();this.viewport={left:this.scroll?.scrollLeft||0,top:this.scroll?.scrollTop||0};const propertyScroll=this.properties?.scrollTop||0,hadFocus=this.el.contains(document.activeElement);this.cancelFrame();this.assets.clear();this.source=null;const data=this.doc.data,kind=this.doc.kind;this.token=(this.token||0)+1;
    if(kind==='tilemap'&&!data.layers.some(layer=>layer.id===this.layer))this.layer=data.layers[0].id;
    this.el.innerHTML=`<header class="two-d-toolbar"><strong>${esc(data.name)}</strong><span>${twoDTypes[kind].label}</span><button data-two-d-action="place" ${this.hooks.placeAsset?'':'disabled'}>${icon('plus')} 장면에 배치</button></header><div class="two-d-body"><aside class="two-d-properties"></aside><main class="two-d-workspace"><div class="two-d-tools"></div><div class="two-d-scroll"><canvas data-preview tabindex="0" aria-label="${twoDTypes[kind].label} 편집"></canvas></div><div class="two-d-status" role="status"></div></main></div>`;
    this.canvas=this.el.querySelector('[data-preview]');this.scroll=this.el.querySelector('.two-d-scroll');this.properties=this.el.querySelector('.two-d-properties');this.tools=this.el.querySelector('.two-d-tools');
    if(kind==='sprite')this.spriteForm();else if(kind==='tilemap')this.tilemapForm();else this.animationForm();
    this.properties.scrollTop=propertyScroll;if(hadFocus)this.canvas.focus({preventScroll:true});
    this.el.onchange=event=>this.changeField(event.target);
    this.el.onclick=event=>{const button=event.target.closest('button');if(button&&this.el.contains(button)){event.stopPropagation();this.action(button);}};
    this.el.onkeydown=event=>{
      if(event.isComposing||event.target.matches('input,textarea,select,[contenteditable]')||event.ctrlKey||event.metaKey||event.altKey)return;
      if(kind==='tilemap'&&({b:'brush',d:'erase',u:'rectangle',g:'fill',i:'pick'})[event.key.toLowerCase()]){event.preventDefault();event.stopPropagation();this.tool=({b:'brush',d:'erase',u:'rectangle',g:'fill',i:'pick'})[event.key.toLowerCase()];this.updateTools();}
      else if(kind==='spriteanimation'&&event.code==='Space'){event.preventDefault();event.stopPropagation();this.togglePlay();}
    };
    this.canvas.oncontextmenu=event=>{event.preventDefault();event.stopPropagation();};
    this.canvas.onpointerdown=event=>this.pointerDown(event);this.canvas.onpointermove=event=>this.pointerMove(event);this.canvas.onpointerup=event=>this.pointerUp(event);this.canvas.onpointercancel=()=>this.finishStroke();this.canvas.onlostpointercapture=()=>{if(this.pointerId!==null&&this.pointerId!==undefined)this.finishStroke();};
    this.scroll.onwheel=event=>{if(!event.ctrlKey)return;event.preventDefault();event.stopPropagation();const bounds=this.canvas.getBoundingClientRect(),x=(event.clientX-bounds.left)/this.zoom,y=(event.clientY-bounds.top)/this.zoom,previous=this.zoom;this.setZoom(this.zoom*(event.deltaY<0?1.2:1/1.2));this.scroll.scrollLeft+=x*(this.zoom-previous);this.scroll.scrollTop+=y*(this.zoom-previous);};
    if(kind==='tilemap')this.drawMap();else if(kind==='sprite')this.drawSprite();this.ready=this.loadPreview();
  }
  spriteForm(){
    const data=this.doc.data;
    this.properties.innerHTML=`<section><h3>텍스처</h3>${this.reference('texture','이미지','texture',data.texture)}${number('pixelsPerUnit','Pixels Per Unit',data.pixelsPerUnit,.01,100000,.1)}<label>필터<select data-two-d-field="filter"><option value="nearest" ${data.filter==='nearest'?'selected':''}>Nearest</option><option value="linear" ${data.filter==='linear'?'selected':''}>Linear</option></select></label></section><section><h3>영역</h3><div class="two-d-pair">${number('rect.0','X',data.rect[0],0,32768)}${number('rect.1','Y',data.rect[1],0,32768)}</div><div class="two-d-pair">${number('rect.2','폭',data.rect[2],0,32768)}${number('rect.3','높이',data.rect[3],0,32768)}</div><div class="two-d-pair">${number('pivot.0','Pivot X',data.pivot[0],0,1,.05)}${number('pivot.1','Pivot Y',data.pivot[1],0,1,.05)}</div><div class="two-d-pair">${number('border.0','왼쪽 테두리',data.border?.[0]||0,0,32768)}${number('border.2','오른쪽 테두리',data.border?.[2]||0,0,32768)}</div><div class="two-d-pair">${number('border.3','위 테두리',data.border?.[3]||0,0,32768)}${number('border.1','아래 테두리',data.border?.[1]||0,0,32768)}</div><button data-two-d-action="whole">전체 영역</button></section><section><h3>스프라이트 분할</h3><label>방식<select data-slice="mode">${['size','count','automatic'].map((v,i)=>`<option value="${v}" ${this.slice.mode===v?'selected':''}>${['셀 크기','열·행 개수','투명도 자동'][i]}</option>`).join('')}</select></label>${this.slice.mode==='size'?`<div class="two-d-pair">${this.sliceField('width','폭')}${this.sliceField('height','높이')}</div>`:this.slice.mode==='count'?`<div class="two-d-pair">${this.sliceField('columns','열')}${this.sliceField('rows','행')}</div>`:''}<div class="two-d-pair">${this.sliceField('margin','여백')}${this.sliceField('spacing','간격')}</div>${this.sliceField('threshold','알파 기준')}<label class="two-d-inline"><input data-slice="keepEmpty" type="checkbox" ${this.slice.keepEmpty?'checked':''}>빈 셀 유지</label><label>기존 분할<select data-slice="method">${['delete','smart','safe'].map((v,i)=>`<option value="${v}" ${this.slice.method===v?'selected':''}>${['교체','Smart','Safe'][i]}</option>`).join('')}</select></label><div class="two-d-pair"><button data-two-d-action="slice-preview">분할 미리 보기</button><button data-two-d-action="slice-apply" ${this.sliceDraft?'':'disabled'}>적용</button><button data-two-d-action="slice-revert" ${this.sliceDraft?'':'disabled'}>되돌리기</button><button data-two-d-action="slice" ${this.hooks.createAsset?'':'disabled'}>에셋 만들기</button></div><div class="two-d-slice-list">${(this.sliceDraft||data.slices||[]).map((v,i)=>`<div class="two-d-pair"><button data-two-d-action="slice-select" data-id="${esc(v.id)}" aria-pressed="${this.sliceSelected===v.id}">${esc(v.name)}</button><button data-two-d-action="slice-remove" data-id="${esc(v.id)}" aria-label="분할 삭제">${icon('close')}</button></div>`).join('')}</div><button data-two-d-action="slice-add">현재 영역 추가</button><button data-two-d-action="trim">투명 여백 자르기</button></section>`;
    const slice=(this.sliceDraft||data.slices||[]).find(s=>s.id===this.sliceSelected);if(slice)this.properties.insertAdjacentHTML('beforeend',`<section><h3>선택 분할</h3><label>이름<input data-slice-record="name" value="${esc(slice.name)}" maxlength="120"></label>${['rect','pivot','border'].map(key=>`<div class="two-d-pair">${slice[key].map((v,i)=>`<label>${({rect:['X','Y','폭','높이'],pivot:['Pivot X','Pivot Y'],border:['왼쪽','아래','오른쪽','위']})[key][i]}<input data-slice-record="${key}.${i}" type="number" value="${v}" min="0" max="${key==='pivot'?1:32768}" step="${key==='pivot'?.01:1}"></label>`).join('')}</div>`).join('')}</section>`);
    if(data.sheet)this.properties.insertAdjacentHTML('beforeend',`<section><h3>원본 시트</h3><span>${esc(data.sheet)}</span><button data-two-d-action="detach-sheet">독립 스프라이트로 전환</button></section>`);
    this.tools.innerHTML=this.zoomTools();
  }
  sliceField(key,label){return `<label>${label}<input data-slice="${key}" type="number" min="${['width','height','columns','rows'].includes(key)?1:0}" max="4096" value="${this.slice[key]}"></label>`;}
  tilemapForm(){
    const data=this.doc.data;
    this.properties.innerHTML=`<section><h3>타일셋</h3><label>격자<select data-two-d-field="layout"><option value="rectangular" ${(data.layout||'rectangular')==='rectangular'?'selected':''}>직사각형</option><option value="isometric" ${data.layout==='isometric'?'selected':''}>등각</option></select></label>${this.reference('tileset','텍스처','texture',data.tileset)}<div class="two-d-pair">${number('tileSize.0','타일 폭',data.tileSize[0],1,4096)}${number('tileSize.1','타일 높이',data.tileSize[1],1,4096)}</div><div class="two-d-pair">${number('cellSize.0','셀 X',data.cellSize[0],.001,10000,.1)}${number('cellSize.1','셀 Y',data.cellSize[1],.001,10000,.1)}</div><div class="two-d-pair">${number('width','맵 폭',data.width,1,256)}${number('height','맵 높이',data.height,1,256)}</div></section><section><div class="two-d-section-heading"><h3>레이어</h3><button data-two-d-action="add-layer" aria-label="레이어 추가">${icon('plus')}</button></div><div class="two-d-layers">${data.layers.map((layer,index)=>`<div class="two-d-layer ${layer.id===this.layer?'active':''}" data-layer="${esc(layer.id)}"><button data-two-d-action="layer" data-id="${esc(layer.id)}" aria-label="${esc(layer.name)} 선택">${icon('layers')}</button><input data-layer-name="${index}" aria-label="레이어 이름" value="${esc(layer.name)}"><label title="표시"><input data-layer-visible="${index}" type="checkbox" ${layer.visible?'checked':''}>표시</label><label title="충돌"><input data-layer-collision="${index}" type="checkbox" ${layer.collision?'checked':''}>충돌</label><button data-two-d-action="layer-up" data-index="${index}" aria-label="레이어 위로" ${index===0?'disabled':''}>↑</button><button data-two-d-action="layer-down" data-index="${index}" aria-label="레이어 아래로" ${index===data.layers.length-1?'disabled':''}>↓</button><button data-two-d-action="remove-layer" data-index="${index}" aria-label="레이어 삭제" ${data.layers.length===1?'disabled':''}>${icon('close')}</button></div>`).join('')}</div></section><section><h3>팔레트</h3><div class="two-d-palette-tools"><span data-tile-label>타일 ${this.tile}</span><select data-palette-page aria-label="팔레트 페이지"></select></div><div class="two-d-palette"></div></section>`;
    this.tools.innerHTML=Object.entries({brush:'페인트',erase:'지우기',rectangle:'영역',fill:'채우기',pick:'스포이드'}).map(([tool,label])=>`<button data-two-d-tool="${tool}" aria-pressed="${this.tool===tool}">${label}</button>`).join('')+this.zoomTools();
  }
  animationForm(){
    const data=this.doc.data,fps=data.frames.length?1/data.frames[0].duration:10;
    this.properties.innerHTML=`<section><h3>재생</h3>${number('fps','FPS',Number(fps.toFixed(3)),.1,1000,.1)}${number('playRate','재생 배율',data.playRate,.01,100,.1)}<label class="two-d-inline"><input data-two-d-field="loop" type="checkbox" ${data.loop?'checked':''}>반복</label></section><section><h3>프레임 추가</h3>${this.reference('newFrame','스프라이트','sprite','')}<button data-two-d-action="add-frame">프레임 추가</button></section>`;
    this.tools.innerHTML=`<button data-two-d-action="play" ${data.frames.length?'':'disabled'}>${icon(this.playing?'pause':'play')} ${this.playing?'일시정지':'재생'}</button><button data-two-d-action="stop">${icon('stop')}</button><input data-time type="range" min="0" max="${spriteAnimationDuration(data)||1}" step=".001" value="${this.time}" aria-label="재생 위치"><output data-frame-label></output>`;
    const frameList=document.createElement('div');frameList.className='two-d-frames';frameList.innerHTML=data.frames.map((frame,index)=>`<div class="two-d-frame ${index===this.frame?'active':''}"><button data-two-d-action="frame" data-index="${index}"><strong>${index+1}</strong><span>${esc(frame.sprite.split('/').at(-1).replace('.hbsprite.json',''))}</span></button><input data-frame-duration="${index}" type="number" min=".001" max="3600" step=".01" value="${frame.duration}" aria-label="${index+1} 프레임 시간"><button data-two-d-action="frame-up" data-index="${index}" aria-label="프레임 앞으로" ${index===0?'disabled':''}>↑</button><button data-two-d-action="frame-down" data-index="${index}" aria-label="프레임 뒤로" ${index===data.frames.length-1?'disabled':''}>↓</button><button data-two-d-action="remove-frame" data-index="${index}" aria-label="프레임 삭제">${icon('close')}</button></div>`).join('');this.el.querySelector('.two-d-workspace').append(frameList);
    this.el.querySelector('[data-time]').oninput=event=>{this.time=Number(event.target.value);this.drawAnimation();};
  }
  zoomTools(){return `<span class="two-d-tool-spacer"></span><button data-two-d-action="zoom-out" aria-label="축소">−</button><span data-zoom>${Math.round(this.zoom*100)}%</span><button data-two-d-action="zoom-in" aria-label="확대">+</button><button data-two-d-action="fit">맞춤</button>`;}
  changeField(input){
    const data=this.doc.data;
    if(input.dataset.sliceRecord){this.sliceDraft=structuredClone(this.sliceDraft||data.slices||[]);const selected=this.sliceDraft.find(s=>s.id===this.sliceSelected),path=input.dataset.sliceRecord.split('.');if(selected){if(path.length===1)selected.name=input.value;else selected[path[0]][Number(path[1])]=Number(input.value);}this.drawSprite();return;}
    if(input.dataset.slice){this.slice[input.dataset.slice]=input.type==='checkbox'?input.checked:input.type==='number'?Number(input.value):input.value;this.render();return;}
    if(input.hasAttribute('data-slices')){this.showSlices=input.checked;this.drawSprite();return;}
    if(input.hasAttribute('data-palette-page')){this.palettePage=Number(input.value);this.drawPalette();return;}
    if(input.dataset.twoDField==='newFrame')return;
    if(input.dataset.twoDField){const path=input.dataset.twoDField.split('.'),value=input.type==='checkbox'?input.checked:input.type==='number'?Number(input.value):input.value;
      this.edit(next=>{if(path[0]==='fps'){for(const frame of next.frames)frame.duration=1/value;}else if(path.length===2){if(path[0]==='border')next.border??=[0,0,0,0];next[path[0]][Number(path[1])]=value;}else next[path[0]]=value;if(next.layers)for(const layer of next.layers)layer.tiles=layer.tiles.filter(tile=>tile.x<next.width&&tile.y<next.height);});
    }else if(input.dataset.layerName!==undefined)this.edit(next=>next.layers[Number(input.dataset.layerName)].name=input.value);
    else if(input.dataset.layerVisible!==undefined)this.edit(next=>next.layers[Number(input.dataset.layerVisible)].visible=input.checked);
    else if(input.dataset.layerCollision!==undefined)this.edit(next=>next.layers[Number(input.dataset.layerCollision)].collision=input.checked);
    else if(input.dataset.frameDuration!==undefined)this.edit(next=>next.frames[Number(input.dataset.frameDuration)].duration=Number(input.value));
  }
  action(button){
    if(button.disabled)return;const action=button.dataset.twoDAction,index=Number(button.dataset.index);
    if(button.dataset.twoDTool){this.tool=button.dataset.twoDTool;this.updateTools();return;}
    if(button.dataset.tile!==undefined){this.tile=Number(button.dataset.tile);this.drawPaletteSelection();return;}
    if(action==='detach-sheet')this.edit(next=>{Object.assign(next,this.resolvedSprite);delete next.sheet;delete next.sliceId;});else if(action==='place')Promise.resolve(this.hooks.placeAsset?.(this.doc)).catch(error=>this.hooks.error?.(error.message));
    else if(action==='zoom-in')this.setZoom(this.zoom*1.2);else if(action==='zoom-out')this.setZoom(this.zoom/1.2);else if(action==='fit')this.fit();
    else if(action==='slice-preview')this.previewSlices();else if(action==='slice-apply'){const next=this.sliceDraft;if(next){this.edit(data=>data.slices=structuredClone(next));this.sliceDraft=null;this.render();}}else if(action==='slice-revert'){this.sliceDraft=null;this.sliceSelected=null;this.render();}else if(action==='slice-select'){this.sliceSelected=button.dataset.id;this.render();}else if(action==='slice-remove'){this.sliceDraft=structuredClone(this.sliceDraft||this.doc.data.slices||[]).filter(v=>v.id!==button.dataset.id);this.render();}else if(action==='slice-add'){const rect=spriteImage(this.doc.data,this.source)?.rect;if(rect){this.sliceDraft=structuredClone(this.sliceDraft||this.doc.data.slices||[]);this.sliceDraft.push({id:crypto.randomUUID(),name:'Sprite_'+(this.sliceDraft.length+1),rect,pivot:[...this.doc.data.pivot],border:[0,0,0,0]});this.render();}}else if(action==='trim')this.trim();
    else if(action==='whole')this.edit(next=>next.rect=[0,0,0,0]);else if(action==='slice')this.createSlices(button);
    else if(action==='layer'){this.layer=button.dataset.id;this.properties.querySelectorAll('.two-d-layer').forEach(row=>row.classList.toggle('active',row.dataset.layer===this.layer));}
    else if(action==='add-layer')this.edit(next=>{let number=1;while(next.layers.some(layer=>layer.id==='layer'+number))number++;next.layers.push({id:'layer'+number,name:'Layer '+number,visible:true,collision:false,tiles:[]});this.layer='layer'+number;});
    else if(action==='remove-layer')this.edit(next=>next.layers.splice(index,1));
    else if(action==='layer-up'||action==='layer-down')this.edit(next=>{const to=index+(action==='layer-up'?-1:1);[next.layers[index],next.layers[to]]=[next.layers[to],next.layers[index]];});
    else if(action==='add-frame'){const sprite=this.el.querySelector('[data-two-d-field=newFrame]').value,fps=Number(this.el.querySelector('[data-two-d-field=fps]').value);if(sprite)this.edit(next=>next.frames.push({sprite,duration:1/fps}));}
    else if(action==='remove-frame')this.edit(next=>next.frames.splice(index,1));
    else if(action==='frame-up'||action==='frame-down')this.edit(next=>{const to=index+(action==='frame-up'?-1:1);[next.frames[index],next.frames[to]]=[next.frames[to],next.frames[index]];});
    else if(action==='frame'){this.frame=index;this.time=this.doc.data.frames.slice(0,index).reduce((sum,frame)=>sum+frame.duration,0);this.drawAnimation();}
    else if(action==='play')this.togglePlay();else if(action==='stop'){this.playing=false;this.time=0;this.cancelFrame();this.updatePlay();this.drawAnimation();}
  }
  async loadPreview(){
    const token=this.token;
    try{
      if(this.doc.kind==='sprite'){const resolved=await resolveSprite(this.doc.data,path=>this.asset(path));const image=await this.image(resolved.texture);if(this.disposed||token!==this.token)return;this.resolvedSprite=resolved;this.source=image;this.drawSprite();}
      else if(this.doc.kind==='tilemap'){const image=await this.image(this.doc.data.tileset);if(this.disposed||token!==this.token)return;this.source=image;this.drawPalette();this.drawMap();}
      else await this.drawAnimation();
      if(this.disposed||token!==this.token)return;if(!this.hasFit){this.fit();this.hasFit=true;}else if(this.viewport){this.scroll.scrollLeft=this.viewport.left;this.scroll.scrollTop=this.viewport.top;}if(this.playing)this.startFrame();
    }catch(error){if(token===this.token)this.hooks.error?.(error.message);}
  }
  setCanvas(width,height,pixelRatio=1){this.canvasLogicalSize=[width,height];this.canvas.width=Math.ceil(width*pixelRatio);this.canvas.height=Math.ceil(height*pixelRatio);this.canvas.style.width=width*this.zoom+'px';this.canvas.style.height=height*this.zoom+'px';const context=this.canvas.getContext('2d');if(pixelRatio!==1)context.scale(pixelRatio,pixelRatio);return context;}
  background(context,width,height){context.fillStyle='#25282e';context.fillRect(0,0,width,height);context.fillStyle='#353a43';for(let y=0;y<height;y+=16)for(let x=0;x<width;x+=16)if((x+y)/16%2===0)context.fillRect(x,y,16,16);}
  drawSprite(){
    if(this.disposed||!this.canvas)return;const data=this.resolvedSprite||this.doc.data,image=this.source,width=image?.width||256,height=image?.height||256;this.previewScale=Math.min(1,2048/Math.max(width,height));const context=this.setCanvas(Math.max(1,Math.round(width*this.previewScale)),Math.max(1,Math.round(height*this.previewScale)));this.background(context,this.canvas.width,this.canvas.height);context.scale(this.previewScale,this.previewScale);context.imageSmoothingEnabled=data.filter==='linear';if(image)context.drawImage(image,0,0);
    const resolved=image&&spriteImage(data,image);if(!resolved){this.status(image?'영역 범위 초과':'텍스처 없음');return;}const [x,y,w,h]=this.cropPreview||resolved.rect;
    context.fillStyle='#10131888';context.fillRect(0,0,width,y);context.fillRect(0,y+h,width,height-y-h);context.fillRect(0,y,x,h);context.fillRect(x+w,y,width-x-w,h);context.strokeStyle='#78b1ef';context.lineWidth=1/(this.zoom*this.previewScale);context.strokeRect(x,y,w,h);
    const px=x+data.pivot[0]*w,py=y+(1-data.pivot[1])*h,marker=6/(this.zoom*this.previewScale);context.beginPath();context.moveTo(px-marker,py);context.lineTo(px+marker,py);context.moveTo(px,py-marker);context.lineTo(px,py+marker);context.stroke();
    const [left,bottom,right,top]=data.border||[0,0,0,0];context.strokeStyle=left+right>w||top+bottom>h?'#df8b8b':'#8dcdb0';context.beginPath();for(const bx of [x+left,x+w-right]){context.moveTo(bx,y);context.lineTo(bx,y+h);}for(const by of [y+top,y+h-bottom]){context.moveTo(x,by);context.lineTo(x+w,by);}context.stroke();
    if(this.showSlices){try{context.strokeStyle='#8dcdb0';for(const sprite of this.sliceDraft||data.slices||[]){context.strokeStyle=sprite.id===this.sliceSelected?'#f3cb7a':'#8dcdb0';context.strokeRect(...sprite.rect);};}catch(error){this.hooks.error?.(error.message);}}
    this.status(`${width} × ${height} px · ${w} × ${h} px · ${(w/data.pixelsPerUnit).toFixed(2)} × ${(h/data.pixelsPerUnit).toFixed(2)} u`);
    this.canvas.style.imageRendering=data.filter==='nearest'?'pixelated':'auto';
  }
  drawPalette(){
    const palette=this.el.querySelector('.two-d-palette');if(!palette)return;palette.replaceChildren();const image=this.source,data=this.doc.data,columns=image?Math.floor(image.width/data.tileSize[0]):0,rows=image?Math.floor(image.height/data.tileSize[1]):0,total=Math.min(1048576,columns*rows),pages=Math.ceil(total/256);this.palettePage=clamp(this.palettePage,0,Math.max(0,pages-1));
    const select=this.el.querySelector('[data-palette-page]');select.innerHTML=Array.from({length:pages},(_,page)=>`<option value="${page}" ${page===this.palettePage?'selected':''}>${page*256}–${Math.min(total-1,(page+1)*256-1)}</option>`).join('');select.hidden=pages<=1;
    this.tile=clamp(this.tile,0,Math.max(0,total-1));
    for(let index=this.palettePage*256;index<Math.min(total,(this.palettePage+1)*256);index++){const button=document.createElement('button');button.dataset.tile=index;button.title='타일 '+index;button.ariaLabel='타일 '+index;const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;const context=canvas.getContext('2d');context.imageSmoothingEnabled=false;context.drawImage(image,...tileAtlasRect(data,index,image).rect,0,0,32,32);button.append(canvas);palette.append(button);}this.drawPaletteSelection();
  }
  drawPaletteSelection(){this.el.querySelectorAll('[data-tile]').forEach(button=>button.classList.toggle('active',Number(button.dataset.tile)===this.tile));const label=this.el.querySelector('[data-tile-label]');if(label)label.textContent='타일 '+this.tile;}
  drawMap(){
    if(this.disposed)return;const data=this.doc.data,iso=data.layout==='isometric',[w,h]=data.cellSize,artHeight=w*data.tileSize[1]/data.tileSize[0],minX=iso?-data.height*w/2:0,maxX=iso?data.width*w/2:data.width*w,top=iso?Math.max(0,artHeight-h):0,bottom=iso?-(data.width+data.height)*h/2:-data.height*h,scale=Math.min(24/w,2048/Math.max(maxX-minX,top-bottom));this.mapPreview={scale,minX,top};const width=Math.max(1,Math.ceil((maxX-minX)*scale)),height=Math.max(1,Math.ceil((top-bottom)*scale)),ratio=Math.min(Math.max(1,this.zoom*(globalThis.devicePixelRatio||1)),2048/Math.max(width,height)),pixel=p=>[(p[0]-minX)*scale,(top-p[1])*scale],context=this.setCanvas(width,height,ratio);context.fillStyle='#22252a';context.fillRect(0,0,width,height);context.imageSmoothingEnabled=false;
    if(this.source)for(const layer of data.layers.filter(layer=>layer.visible)){const tiles=iso?[...layer.tiles].sort((a,b)=>a.x+a.y-b.x-b.y||a.y-b.y||a.x-b.x):layer.tiles;for(const tile of tiles){const atlas=tileAtlasRect(data,tile.index,this.source),[x,y,rw,rh]=tileRenderRect(data,tile),[px,py]=pixel([x,y+rh]);if(atlas)context.drawImage(this.source,...atlas.rect,px,py,rw*scale,rh*scale);}}
    const line=(a,b)=>{context.moveTo(...pixel(a));context.lineTo(...pixel(b));};context.strokeStyle='#7c8999aa';context.lineWidth=1/this.zoom;context.beginPath();for(let x=0;x<=data.width;x++)line(tileCellPoint(data,x,0),tileCellPoint(data,x,data.height));for(let y=0;y<=data.height;y++)line(tileCellPoint(data,0,y),tileCellPoint(data,data.width,y));context.stroke();
    if(this.rectangle){const {from,to}=this.rectangle,points=tileCellPolygon(data,Math.min(from.x,to.x),Math.min(from.y,to.y),Math.abs(from.x-to.x)+1,Math.abs(from.y-to.y)+1);context.beginPath();context.moveTo(...pixel(points[0]));for(const p of points.slice(1))context.lineTo(...pixel(p));context.closePath();context.fillStyle='#5089c933';context.fill();context.strokeStyle='#78b1ef';context.stroke();}
    this.status(`${data.width} × ${data.height} · ${data.layers.reduce((sum,layer)=>sum+layer.tiles.length,0)} 타일`);
  }
  async drawAnimation(){
    if(this.disposed||this.doc.kind!=='spriteanimation')return;const token=this.token,request=this.previewRequest=(this.previewRequest||0)+1,data=this.doc.data,frame=spriteAnimationFrame(data,Math.max(0,this.time),{rate:1});this.frame=frame?.index||0;
    const context=this.setCanvas(512,320);this.background(context,512,320);this.canvas.style.imageRendering='pixelated';
    const slider=this.el.querySelector('[data-time]');if(slider)slider.value=String(this.time);const label=this.el.querySelector('[data-frame-label]');if(label)label.textContent=data.frames.length?`${this.frame+1} / ${data.frames.length}`:'0 / 0';
    this.el.querySelectorAll('.two-d-frame').forEach((row,index)=>row.classList.toggle('active',index===this.frame));if(!frame)return;
    try{const sprite=await this.asset(frame.sprite);if(!valid2DAsset('sprite',sprite))throw Error('스프라이트 검증 실패: '+frame.sprite);const image=await this.image(sprite.texture);if(this.disposed||token!==this.token||request!==this.previewRequest)return;const resolved=image&&spriteImage(sprite,image);if(!resolved)throw Error('스프라이트 영역을 확인하세요: '+frame.sprite);const [x,y,w,h]=resolved.rect,scale=Math.min(230/(w*Math.max(sprite.pivot[0],1-sprite.pivot[0])),135/(h*Math.max(sprite.pivot[1],1-sprite.pivot[1])));context.imageSmoothingEnabled=sprite.filter==='linear';context.drawImage(image,x,y,w,h,256-sprite.pivot[0]*w*scale,160-(1-sprite.pivot[1])*h*scale,w*scale,h*scale);this.status(`${this.time.toFixed(2)} / ${frame.duration.toFixed(2)} s`);}catch(error){if(this.disposed||token!==this.token||request!==this.previewRequest)return;this.playing=false;this.cancelFrame();this.updatePlay();this.hooks.error?.(error.message);}
  }
  updateTools(){this.tools.querySelectorAll('[data-two-d-tool]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.twoDTool===this.tool)));}
  updatePlay(){const button=this.el.querySelector('[data-two-d-action=play]');if(button)button.innerHTML=icon(this.playing?'pause':'play')+' '+(this.playing?'일시정지':'재생');}
  togglePlay(){if(!this.doc.data.frames.length)return;this.playing=!this.playing;this.updatePlay();if(this.playing){const duration=spriteAnimationDuration(this.doc.data);if(this.time>=duration)this.time=0;this.startFrame();}else this.cancelFrame();}
  startFrame(){
    this.cancelFrame();let last=performance.now();const tick=now=>{if(this.disposed||!this.playing)return;const data=this.doc.data,duration=spriteAnimationDuration(data);this.time+=Math.min(.1,(now-last)/1000)*data.playRate;last=now;if(this.time>=duration){if(data.loop)this.time%=duration;else{this.time=duration;this.playing=false;this.updatePlay();}}this.drawAnimation();if(this.playing)this.raf=editorAnimationFrame(this.el,tick);};this.raf=editorAnimationFrame(this.el,tick);
  }
  cancelFrame(){if(this.raf!==undefined)cancelEditorAnimationFrame(this.el,this.raf);this.raf=undefined;}
  setZoom(value){this.zoom=clamp(value,.125,8);if(this.canvas){if(this.doc.kind==='tilemap'&&this.mapPreview)this.drawMap();else{const [width,height]=this.canvasLogicalSize||[this.canvas.width,this.canvas.height];this.canvas.style.width=width*this.zoom+'px';this.canvas.style.height=height*this.zoom+'px';}}const label=this.el.querySelector('[data-zoom]');if(label)label.textContent=Math.round(this.zoom*100)+'%';}
  fit(){const [width,height]=this.canvasLogicalSize||[this.canvas.width,this.canvas.height];if(!width||!this.scroll.clientWidth)return;this.setZoom(Math.min((this.scroll.clientWidth-24)/width,(this.scroll.clientHeight-24)/height));this.scroll.scrollLeft=0;this.scroll.scrollTop=0;}
  point(event){const bounds=this.canvas.getBoundingClientRect(),scale=this.doc.kind==='sprite'?(this.previewScale||1):1,[width,height]=this.canvasLogicalSize||[this.canvas.width,this.canvas.height];return {x:(event.clientX-bounds.left)*width/Math.max(1,bounds.width)/scale,y:(event.clientY-bounds.top)*height/Math.max(1,bounds.height)/scale};}
  cell(event){const point=this.point(event),p=this.mapPreview;if(!p)return null;const [x,y]=tileLocalToCell(this.doc.data,[point.x/p.scale+p.minX,p.top-point.y/p.scale]);return x>=0&&y>=0&&x<this.doc.data.width&&y<this.doc.data.height?{x,y}:null;}
  pointerDown(event){
    if(![0,1,2].includes(event.button)||this.doc.kind==='spriteanimation')return;this.flush();event.preventDefault();event.stopPropagation();this.canvas.focus();this.pointerId=event.pointerId;this.canvas.setPointerCapture(event.pointerId);
    if(event.button===1){this.pan={x:event.clientX,y:event.clientY,left:this.scroll.scrollLeft,top:this.scroll.scrollTop};return;}
    if(this.doc.kind==='sprite'){if(!this.source||event.button!==0)return;this.cropStart=this.point(event);return;}
    const cell=this.cell(event),tool=event.button===2?'erase':this.tool;if(!cell)return;
    if(tool==='pick'){const tile=this.doc.data.layers.find(layer=>layer.id===this.layer).tiles.find(tile=>tile.x===cell.x&&tile.y===cell.y);if(tile){this.tile=tile.index;this.tool='brush';this.drawPaletteSelection();this.updateTools();}return;}
    if(tool!=='erase'&&!this.source)return;this.stroke={from:cell,last:cell,tool,changed:false};if(tool==='rectangle'){this.rectangle={from:cell,to:cell};this.drawMap();}else this.paint(cell);
  }
  paint(cell){const stroke=this.stroke,result=applyTileTool(this.doc.data,this.layer,stroke.tool,stroke.last,cell,this.tile);if(result.changed){if(!stroke.changed)this.hooks.before?.();stroke.changed=true;this.doc.data=result.data;this.drawMap();}stroke.last=cell;}
  pointerMove(event){
    if(this.pointerId!==null&&this.pointerId!==undefined&&event.pointerId!==this.pointerId)return;
    if(this.pan){this.scroll.scrollLeft=this.pan.left+this.pan.x-event.clientX;this.scroll.scrollTop=this.pan.top+this.pan.y-event.clientY;return;}
    if(this.cropStart){const end=this.point(event),x=clamp(Math.floor(Math.min(this.cropStart.x,end.x)),0,this.source.width-1),y=clamp(Math.floor(Math.min(this.cropStart.y,end.y)),0,this.source.height-1);this.cropPreview=[x,y,clamp(Math.ceil(Math.abs(end.x-this.cropStart.x)),1,this.source.width-x),clamp(Math.ceil(Math.abs(end.y-this.cropStart.y)),1,this.source.height-y)];this.drawSprite();return;}
    if(!this.stroke)return;const cell=this.cell(event);if(!cell)return;if(this.stroke.tool==='rectangle'){this.rectangle.to=cell;this.drawMap();}else if(this.stroke.tool!=='fill')this.paint(cell);
  }
  pointerUp(event){
    if(event.pointerId!==this.pointerId)return;this.finishStroke({commitPreview:true});
  }
  finishStroke({render=true,commitPreview=false}={}){
    if(commitPreview&&this.stroke?.tool==='rectangle')this.paint(this.rectangle.to);
    let changed=!!this.stroke?.changed;const rect=commitPreview&&this.cropPreview,canvas=this.canvas,pointer=this.pointerId;
    this.stroke=null;this.rectangle=null;this.pan=null;this.cropStart=null;this.cropPreview=null;this.pointerId=null;
    if(pointer!==undefined&&pointer!==null&&canvas?.hasPointerCapture?.(pointer))canvas.releasePointerCapture(pointer);
    if(rect&&JSON.stringify(rect)!==JSON.stringify(this.doc.data.rect)){this.hooks.before?.();this.doc.data={...this.doc.data,rect};changed=true;}
    if(changed){this.hooks.change?.();if(render){if(this.doc.kind==='tilemap')this.drawMap();else this.render();}}else if(render){if(this.doc.kind==='tilemap')this.drawMap();else if(this.doc.kind==='sprite')this.drawSprite();}
    return changed;
  }
  flush(){return this.finishStroke({render:false,commitPreview:true});}
  pixels(){return spritePixels(this.source,this.el.ownerDocument);}
  previewSlices(){try{const image=this.slice.mode==='automatic'||!this.slice.keepEmpty?this.pixels():this.source;this.sliceDraft=mergeSpriteSlices(this.doc.data.slices||[],sliceSprite(this.doc.data,image,this.slice),this.slice.method);this.render();}catch(error){this.hooks.error?.(error.message);}}
  trim(){try{const data=this.doc.data,selected=(this.sliceDraft||data.slices||[]).find(s=>s.id===this.sliceSelected),rect=trimSpriteRect(this.pixels(),selected?.rect||spriteImage(data,this.source).rect,this.slice.threshold);if(!rect){this.status('불투명 픽셀이 없어요.');return;}if(selected){this.sliceDraft=structuredClone(this.sliceDraft||data.slices);this.sliceDraft.find(s=>s.id===selected.id).rect=rect;this.render();}else this.edit(next=>next.rect=rect);}catch(error){this.hooks.error?.(error.message);}}
  async createSlices(button){
    if(!this.source||!this.hooks.createAsset)return;if(this.sliceDraft){this.hooks.error?.('분할을 적용한 뒤 에셋을 만드세요.');return;}button.disabled=true;const exported=[];
    try{
      const data=this.doc.data;if(data.slices?.length){for(const slice of data.slices){if(slice.asset&&this.fileList().some(f=>f.path===slice.asset)){const existing=await this.asset(slice.asset);if(existing.sheet!==this.doc.path||existing.sliceId!==slice.id)throw Error('분할 에셋 참조가 다른 파일을 가리켜요.');continue;}const sprite={...structuredClone(data),slices:undefined,name:slice.name.slice(0,80),rect:slice.rect,pivot:slice.pivot,border:slice.border,sheet:this.doc.path,sliceId:slice.id},result=await this.hooks.createAsset('sprite',sprite.name,sprite);if(result?.path)exported.push({id:slice.id,path:result.path});}this.status(data.slices.length+'개 분할 에셋');}
      else{const sprites=sliceSpriteGrid({...data,name:data.name.slice(0,75)},this.source,this.slice);for(const sprite of sprites)await this.hooks.createAsset('sprite',sprite.name,sprite);this.status(sprites.length+'개 스프라이트');}
    }catch(error){this.hooks.error?.(error.message);}finally{if(exported.length)this.edit(data=>{for(const entry of exported){const slice=data.slices.find(s=>s.id===entry.id);if(slice)slice.asset=entry.path;}});if(button.isConnected)button.disabled=false;}
  }
  status(text){const status=this.el.querySelector('.two-d-status');if(status)status.textContent=text;}
  dispose(){this.flush();this.disposed=true;this.token++;this.cancelFrame();globalThis.removeEventListener?.('blur',this.onBlur);this.el.onchange=this.el.onclick=this.el.onkeydown=null;this.images.clear();this.assets.clear();}
}
