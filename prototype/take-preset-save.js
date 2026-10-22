import {createTakePreset,takePresetPath,validTakePreset} from './take-preset-assets.js';
export function openTakePresetSave(document,{folder='Assets',name='TP_Take',profile,write}){
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.className='asset-reference-dialog';dialog.dataset.takePresetSave='';dialog.innerHTML='<form><div class="dialog-heading"><h2>Take 프리셋 저장</h2></div><label>폴더<input data-take-preset-folder aria-label="프리셋 폴더" required></label><label>이름<input data-take-preset-name aria-label="프리셋 이름" maxlength="80" required></label><p data-take-preset-error role="alert"></p><div class="dialog-footer"><button type="button" data-take-preset-cancel>취소</button><button class="primary-button" type="submit">저장</button></div></form>';
  dialog.querySelector('[data-take-preset-folder]').value=folder;dialog.querySelector('[data-take-preset-name]').value=name.slice(0,80);let saved=null,busy=false;
  dialog.querySelector('[data-take-preset-cancel]').onclick=()=>dialog.close();dialog.oncancel=e=>{if(busy)e.preventDefault();};dialog.onclose=()=>{dialog.remove();resolve(saved);};
  dialog.querySelector('form').onsubmit=async event=>{event.preventDefault();if(busy)return;busy=true;const controls=[...dialog.querySelectorAll('button,input')];controls.forEach(c=>c.disabled=true);
   try{const name=dialog.querySelector('[data-take-preset-name]').value.trim(),folder=dialog.querySelector('[data-take-preset-folder]').value.trim().replace(/\/$/,'');if(!name||/[<>:"/\\|?*\x00-\x1f]/.test(name))throw Error('프리셋 이름을 확인하세요.');const path=folder+'/'+name+'.hbtakepreset.json',data=createTakePreset(name,{fps:profile.fps,tolerance:profile.tolerance,settings:profile,sources:profile.sources});if(!takePresetPath(path)||!validTakePreset(data))throw Error('프리셋 경로·설정을 확인하세요.');await write(path,data,dialog);saved=path;dialog.close();}
   catch(error){dialog.querySelector('[data-take-preset-error]').textContent=error.message;}
   finally{busy=false;controls.forEach(c=>c.disabled=false);}
  };
  document.body.append(dialog);dialog.showModal();dialog.querySelector('[data-take-preset-name]').focus();dialog.querySelector('[data-take-preset-name]').select();
 });
}
