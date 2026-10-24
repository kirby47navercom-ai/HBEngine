import {modelImportDefaults,modelUnitChoices,modelUpChoices,validModelImport,remapModelOverrides} from './model-import.js';
import {ModelPreview} from './model-preview.js';
import {createVirtualList} from './virtual-list.js';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kinds={mesh:'메시',material:'머테리얼',animation:'애니메이션',skin:'스킨'};
export class ModelImportEditor {
  constructor(element,doc,hooks){
    this.element=element;this.doc=doc;this.hooks=hooks;this.selected=null;this.disposed=false;
    element.classList.add('model-import-workspace');
    element.innerHTML='<header class="document-toolbar"><span data-model-source></span><button data-model-fit>초점</button><button data-model-reimport>다시 가져오기</button><button data-model-save>저장하고 적용</button></header><div class="model-import-body"><div class="model-import-preview"></div><aside class="model-import-properties"><div class="model-import-settings asset-form"></div><div class="model-import-detail asset-form"></div></aside></div><section class="model-import-assets"><header class="document-toolbar"><input type="search" aria-label="하위 에셋 검색" placeholder="하위 에셋 검색"><select aria-label="하위 에셋 종류"><option value="">모든 종류</option>'+Object.entries(kinds).map(([key,label])=>'<option value="'+key+'">'+label+'</option>').join('')+'</select><span data-model-count></span></header><div class="model-import-subassets"><div class="model-import-list"></div></div></section>';
    this.settings=element.querySelector('.model-import-settings');this.detail=element.querySelector('.model-import-detail');
    this.list=createVirtualList(element.querySelector('.model-import-list'),{rowHeight:32,items:[],label:row=>(row.unresolved?'미연결 · ':'')+kinds[row.kind]+' · '+(row.name||'(이름 없음)'),select:(_,row)=>{this.selected=row.id;this.renderDetail();}});
    this.preview=new ModelPreview(element.querySelector('.model-import-preview'),{load:()=>hooks.load(doc.data.source,{metadata:null}),visible:hooks.visible,error:message=>this.showError(message)});
    this.preview.format=doc.data.source.toLowerCase().endsWith('.fbx')?'fbx':doc.data.source.toLowerCase().endsWith('.obj')?'obj':'gltf';
    element.querySelector('input[type=search]').oninput=()=>this.renderList();element.querySelector('[aria-label="하위 에셋 종류"]').onchange=()=>this.renderList();
    element.querySelector('[data-model-fit]').onclick=()=>this.preview.fit();
    element.querySelector('[data-model-save]').onclick=async()=>{try{await hooks.save();}catch(e){hooks.error(e.message);}};
    element.querySelector('[data-model-reimport]').onclick=async()=>{try{await hooks.reimport();}catch(e){hooks.error(e.message);}};
    this.settings.onchange=event=>this.editSetting(event.target);
    this.detail.onchange=event=>{
      const key=event.target.dataset.modelOverride;if(!key)return;
      this.edit(next=>{const row=next.subassets.find(row=>row.id===this.selected);if(event.target.value==='inherit')delete row.overrides[key];else row.overrides[key]=event.target.value==='true';});
    };
    this.detail.onclick=async event=>{
      const material=event.target.closest('[data-model-material]');if(material){const id=this.selected;material.disabled=true;try{const result=await hooks.extractMaterial({subasset:id,name:this.detail.querySelector('[data-model-material-name]').value});if(!this.disposed&&this.selected===id){this.previewMessage='머테리얼 생성 · '+result.path;this.renderDetail();}}catch(error){if(!this.disposed)hooks.error(error.message);}finally{if(material.isConnected)material.disabled=false;}return;}
      const extract=event.target.closest('[data-model-extract]');if(extract){const id=this.selected;extract.disabled=true;try{const result=await hooks.extractClip({subasset:id,name:this.detail.querySelector('[data-model-extract-name]').value,custom:this.detail.querySelector('[data-model-extract-bake]').checked?'bake':'reject',fps:Number(this.detail.querySelector('[data-model-extract-fps]').value),start:Number(this.detail.querySelector('[data-model-extract-start]').value),...(this.detail.querySelector('[data-model-extract-end]').value.trim()?{end:Number(this.detail.querySelector('[data-model-extract-end]').value)}:{})});if(!this.disposed&&this.selected===id){this.previewMessage='클립 생성 · '+result.path;this.renderDetail();}}catch(error){if(!this.disposed)hooks.error(error.message);}finally{if(extract.isConnected)extract.disabled=false;}return;}
      if(event.target.closest('[data-model-reset]'))this.edit(next=>next.subassets.find(row=>row.id===this.selected).overrides={});
      const target=event.target.closest('[data-model-remap]')?.dataset.modelRemap;
      if(target)this.edit(next=>Object.assign(next,remapModelOverrides(next,this.selected,target)));
    };
    this.detail.oninput=event=>{if(event.target.matches('[data-model-remap-query]'))this.renderRemap(event.target.value);};this.render();
  }
  showError(message){if(this.disposed)return;this.previewMessage=message;this.renderDetail();}
  edit(operation){
    try{const next=structuredClone(this.doc.data);operation(next);if(!validModelImport(next))throw Error('모델 가져오기 설정을 확인하세요.');
      this.hooks.before();this.doc.data=next;this.hooks.change();this.previewMessage='';this.render();
    }catch(e){this.hooks.error(e.message);this.render();}
  }
  editSetting(input){
    const key=input.dataset.modelSetting;if(!key)return;
    this.edit(next=>{next.settings={...structuredClone(modelImportDefaults),...next.settings};
      if(input.dataset.axis!==undefined)next.settings[key][Number(input.dataset.axis)]=Number(input.value);
      else next.settings[key]=input.type==='checkbox'?input.checked:input.type==='number'?Number(input.value):input.value;
    });
  }
  render(){
    if(this.disposed)return;const p={...modelImportDefaults,...this.doc.data.settings};
    this.element.querySelector('[data-model-source]').textContent=this.doc.path.replace(/\.import\.json$/i,'');
    const input=(label,key,type='number',choices)=>'<label>'+label+(choices?'<select data-model-setting="'+key+'">'+choices.map(([v,l])=>'<option value="'+v+'" '+(p[key]===v?'selected':'')+'>'+l+'</option>').join('')+'</select>':'<input data-model-setting="'+key+'" type="'+type+'" '+(type==='checkbox'?(p[key]?'checked':''):'step="any" value="'+p[key]+'"')+'>')+'</label>';
    this.settings.innerHTML='<section><h3>변환</h3>'+input('배율','scale')+input('파일 단위 변환','convertUnits','checkbox')+input('원본 단위','sourceUnit','select',modelUnitChoices)+input('원본 위 축','sourceUp','select',modelUpChoices)+input('앞 방향 뒤집기','flipForward','checkbox')+['translation','rotation'].map(key=>'<div class="model-import-vector"><span>'+(key==='translation'?'이동 (m)':'회전 (°)')+'</span>'+p[key].map((v,i)=>'<label>'+['X','Y','Z'][i]+'<input type="number" step="any" data-model-setting="'+key+'" data-axis="'+i+'" value="'+v+'"></label>').join('')+'</div>').join('')+'</section>';
    this.renderList();try{this.preview.update(this.doc.data);}catch(e){this.showError(e.message);}
  }
  renderList(){
    const query=this.element.querySelector('input[type=search]').value.toLocaleLowerCase(),kind=this.element.querySelector('[aria-label="하위 에셋 종류"]').value;
    this.rows=[...this.doc.data.subassets,...(this.doc.data.unresolvedSubassets||[]).map(row=>({...row,unresolved:true}))].filter(row=>(!kind||row.kind===kind)&&(!query||(row.name+' '+row.id).toLocaleLowerCase().includes(query)));
    this.list.items(this.rows);this.list.selection(this.rows.findIndex(row=>row.id===this.selected));
    this.element.querySelector('[data-model-count]').textContent=this.rows.length+'개';this.renderDetail();
  }
  renderDetail(){
    const row=this.rows?.find(row=>row.id===this.selected);
    this.detail.innerHTML=(this.previewMessage?'<p class="model-import-error" role="alert">'+escape(this.previewMessage)+'</p>':'')+(!row?'':
      '<section><h3>'+escape(row.name||kinds[row.kind])+'</h3><dl><dt>ID</dt><dd>'+escape(row.id)+'</dd><dt>원본</dt><dd>'+escape(row.sourceObjectId??row.sourceIndex??'')+'</dd></dl>'+(row.unresolved?'<p>원본에서 대응을 확인할 수 없어요.</p><input type="search" data-model-remap-query aria-label="연결할 메시 검색" placeholder="연결할 메시 이름 또는 ID"><div data-model-remap-results></div>':row.kind==='mesh'?['visible','castShadow','receiveShadow'].map(key=>'<label>'+({visible:'표시',castShadow:'그림자 생성',receiveShadow:'그림자 받기'}[key])+'<select data-model-override="'+key+'">'+[['inherit','원본 설정'],['true','켜기'],['false','끄기']].map(([value,label])=>'<option value="'+value+'" '+(String(row.overrides[key]??'inherit')===value?'selected':'')+'>'+label+'</option>').join('')+'</select></label>').join('')+'<button data-model-reset>원본 설정 사용</button>':row.kind==='animation'?this.extractionControls(row):row.kind==='material'?'<label>새 머테리얼 이름<input data-model-material-name value="'+escape(('M_'+(row.name||'Material')).replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').slice(0,70))+'"></label><button data-model-material>독립 머테리얼 생성</button>':'')+'</section>');
    if(row?.unresolved)this.renderRemap('');
  }
  extractionControls(row){const name='SK_'+(row.name||'Clip').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').slice(0,70);return '<label>새 클립 이름<input data-model-extract-name value="'+escape(name)+'"></label><label><input type="checkbox" data-model-extract-bake>곡선·사용자 보간 베이크</label><label>베이크 FPS<input type="number" min="1" max="240" data-model-extract-fps value="30"></label><label>시작(초)<input type="number" min="0" step="any" data-model-extract-start value="0"></label><label>끝(초)<input type="number" min="0" step="any" data-model-extract-end placeholder="클립 끝"></label><button data-model-extract>독립 클립 생성</button>';}
  renderRemap(query){
    const element=this.detail.querySelector('[data-model-remap-results]');if(!element)return;
    const normalized=query.toLocaleLowerCase(),rows=this.doc.data.subassets.filter(row=>row.kind==='mesh'&&(!query||(row.name+' '+row.id).toLocaleLowerCase().includes(normalized)));
    element.innerHTML=rows.slice(0,30).map(row=>'<button data-model-remap="'+escape(row.id)+'" title="'+escape(row.id)+'">'+escape(row.name||row.id)+'</button>').join('')+(rows.length>30?'<p>검색으로 범위를 좁히세요. '+rows.length+'개</p>':'');
  }
  dispose(){if(this.disposed)return;this.disposed=true;this.list.dispose();this.preview.dispose();this.element.onchange=null;this.rows=[];}
}
