// On-demand two-stage discovery. Browsing never edits a document or imports a type.
export async function pickProjectNativeType(document,read){
 const dialog=document.createElement('dialog');dialog.className='native-type-picker';dialog.dataset.nativeTypePicker='';
 const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;},button=(label,run)=>{const b=node('button',label);b.type='button';b.onclick=run;return b;};
 const heading=node('header'),title=node('h2','프로젝트 자료형'),close=button('닫기',()=>dialog.close());heading.append(title,close);
 const search=node('form'),input=node('input'),submit=node('button','찾기');input.type='search';input.ariaLabel='자료형 검색';input.placeholder='이름 또는 경로';submit.type='submit';search.append(input,submit);
 const navigation=node('div'),back=button('에셋 목록',()=>{source=null;offset=0;input.value='';void load();}),status=node('span'),list=node('div'),pages=node('footer'),previous=button('이전',()=>{offset=Math.max(0,offset-32);void load();}),next=button('다음',()=>{offset+=32;void load();});navigation.append(back,status);list.className='native-type-picker-list';pages.append(previous,next);dialog.append(heading,search,navigation,list,pages);document.body.append(dialog);
 let source=null,offset=0,serial=0,chosen=null;const controls=[input,submit,back,previous,next];
 async function load(){
  const token=++serial;controls.forEach(c=>c.disabled=true);status.textContent='불러오는 중';list.replaceChildren();
  try{const result=await read({...(source?{source}:{}),offset,limit:32,query:input.value});if(token!==serial||!dialog.open)return;
   for(const item of result.items){const row=button(item.label||item.name,()=>{if(source){chosen={source,declarationId:item.id,sourceRevision:result.sourceRevision};dialog.close();}else{source=item.path;offset=0;input.value='';void load();}}),detail=node('small',source?item.name:item.path);row.dataset.typeCatalogChoice=source?item.id:item.path;row.append(detail);list.append(row);}
   status.textContent=(source?source+' · ':'')+result.count+'개';controls.forEach(c=>c.disabled=false);back.hidden=!source;previous.disabled=offset===0;next.disabled=result.nextOffset===null;
  }catch(error){if(token!==serial||!dialog.open)return;status.textContent=error.message;input.disabled=submit.disabled=false;back.disabled=false;back.hidden=!source;previous.disabled=next.disabled=true;}
 }
 search.onsubmit=event=>{event.preventDefault();offset=0;void load();};
 const result=new Promise(resolve=>dialog.addEventListener('close',()=>{++serial;dialog.remove();resolve(chosen);},{once:true}));dialog.showModal();input.focus();void load();return result;
}
