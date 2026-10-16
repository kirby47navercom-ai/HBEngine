import {editorRequest} from './project-browser.js';
export function captureSaveSettings({folder='Assets/Recordings',name}={}){
 name??='Mix_'+new Date().toISOString().replace(/[:.]/g,'-')+'_'+crypto.randomUUID().slice(0,8);if(typeof name!=='string')throw Error('WAV 이름을 확인하세요.');name=name.replace(/\.wav$/i,'');
 if(typeof folder!=='string'||!/^Assets(?:\/[^/\\:\x00-\x1f<>"|?*]+)*$/.test(folder)||folder.split('/').some(p=>p==='.'||p==='..'||/[. ]$/.test(p))||typeof name!=='string'||!name||name.length>100||/[<>:"/\\|?*\x00-\x1f]/.test(name)||/[. ]$/.test(name))throw Error('녹음 폴더·WAV 이름을 확인하세요.');
 return{folder,name};
}
export async function saveCapturedAudio({bytes,info},settings={}){
 const {folder,name}=captureSaveSettings(settings);if(!(bytes instanceof Uint8Array)||!info?.frames)throw Error('저장할 녹음 신호가 없어요.');await editorRequest('/api/folder',{method:'POST',body:JSON.stringify({path:folder})});const saved=await(await editorRequest('/api/import?'+new URLSearchParams({folder,name:name+'.wav'}),{method:'POST',body:bytes})).json();return{...info,path:saved.path};
}
