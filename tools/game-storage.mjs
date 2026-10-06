import {createPersistentQueries} from '../prototype/runtime-storage.js';

export function configureNativePersistence(native,store,readAsset){
  const key=slot=>'hbengine.savegame.json.'+slot+store.suffix;
  native.persistentQueries=createPersistentQueries({readAsset,readSave:async slot=>(await store.read()).items[key(slot)]??null,writeSave:(slot,json)=>store.patch({[key(slot)]:json}),deleteSave:slot=>store.patch({[key(slot)]:null})});
}
