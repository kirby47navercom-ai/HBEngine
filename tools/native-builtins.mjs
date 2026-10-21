import {blueprintClasses,derivesFrom} from '../prototype/class-types.js';
export const nativeActorBases=new Set(Object.keys(blueprintClasses).filter(name=>derivesFrom(name,'Actor')));
export const nativeComponentBases=new Set(['Component','SceneComponent']);
export const nativeBases=new Set([...nativeActorBases,...nativeComponentBases,'Library']);
export const nativeReferenceTypes=new Set([...nativeBases,'Object']);
