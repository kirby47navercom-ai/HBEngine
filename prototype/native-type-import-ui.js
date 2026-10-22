export function appendNativeTypeImportUI(pane,{paths=[],files=[],disabled=false,change,error}){
 const document=pane.ownerDocument,group=document.createElement('details'),summary=document.createElement('summary');group.className='bp-detail-group';group.open=true;summary.textContent='타입 라이브러리';group.append(summary);
 const controls=[],run=async next=>{controls.forEach(n=>n.disabled=true);try{await change(next);}catch(e){error(e.message);}finally{controls.forEach(n=>n.disabled=disabled);}};
 const button=(label,callback)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=disabled;b.onclick=callback;controls.push(b);return b;};
 for(const path of paths){const row=document.createElement('div'),name=document.createElement('span');row.className='bp-detail-row';row.dataset.propertySearch=('타입 라이브러리 '+path).toLowerCase();name.textContent=path;row.append(name,button('제거',()=>run(paths.filter(p=>p!==path))));group.append(row);}
 const select=document.createElement('select');select.ariaLabel='타입 라이브러리 추가';select.disabled=disabled;controls.push(select);
 for(const file of files.filter(f=>f.kind==='typelibrary'&&!paths.includes(f.path))){const option=document.createElement('option');option.value=file.path;option.textContent=file.path;select.append(option);}
 const row=document.createElement('div');row.className='bp-detail-row';row.dataset.propertySearch='타입 라이브러리 추가';row.append(select,button('추가',()=>{if(select.value)return run([...paths,select.value]);}));group.append(row);pane.append(group);
}
