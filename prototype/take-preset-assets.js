import {resolveTakeSettings,validTakeSettings} from './take-settings.js';
export const takePresetPath=path=>typeof path==='string'&&/^Assets\/.+\.hbtakepreset\.json$/.test(path)&&!/[\\:\x00-\x1f]/.test(path)&&!path.split('/').some(p=>!p||p==='.'||p==='..');
export const validTakeTolerance=value=>Number.isFinite(value)&&value>=0;
export function createTakePreset(name,options={}){return {version:1,name,fps:options.fps===undefined?30:options.fps,tolerance:options.tolerance===undefined?1e-4:options.tolerance,settings:resolveTakeSettings(options.settings),description:options.description??''};}
export function validTakePreset(data){return !!data&&data.version===1&&Object.keys(data).every(k=>['version','name','fps','tolerance','settings','description'].includes(k))&&typeof data.name==='string'&&!!data.name&&data.name.length<=80&&!data.name.includes('\0')&&Number.isInteger(data.fps)&&data.fps>=1&&data.fps<=240&&validTakeTolerance(data.tolerance)&&validTakeSettings(data.settings)&&(data.description===undefined||typeof data.description==='string'&&data.description.length<=1000&&!data.description.includes('\0'));}
export function takePresetOptions(data,overrides={}){
 if(!validTakePreset(data))throw Error('Take 녹화 프리셋을 확인하세요.');
 if(!overrides||typeof overrides!=='object'||Array.isArray(overrides)||overrides.spawnFilter!==undefined&&(!overrides.spawnFilter||typeof overrides.spawnFilter!=='object'||Array.isArray(overrides.spawnFilter)))throw Error('프리셋 덮어쓰기 설정을 확인하세요.');
 const settings=resolveTakeSettings({...data.settings,...overrides,...overrides.spawnFilter?{spawnFilter:{...data.settings.spawnFilter,...overrides.spawnFilter}}:{}});
 const fps=overrides.fps===undefined?data.fps:overrides.fps,tolerance=overrides.tolerance===undefined?data.tolerance:overrides.tolerance;if(!Number.isInteger(fps)||fps<1||fps>240||!validTakeTolerance(tolerance))throw Error('녹화 FPS·키 오차를 확인하세요.');
 return {...settings,fps,tolerance};
}
export function applyTakePreset(sequence,preset){
 const {fps,tolerance,...settings}=takePresetOptions(preset);return {...sequence,fps,recordingTolerance:tolerance,recordingSettings:settings};
}
export function takePresetFromSequence(sequence,name){return createTakePreset(name,{fps:sequence.fps??30,tolerance:sequence.recordingTolerance??1e-4,settings:sequence.recordingSettings});}
export const takePresetContract=Object.freeze({kind:'takepreset',suffix:'.hbtakepreset.json',owner:'prototype/take-preset-assets.js',creation:'Content Browser and sequence recording settings Save As; existing document.patch/save/history/files.apply',fields:Object.freeze(['settings','fps','tolerance','description']),apply:'sequence.take.preset.apply with sequence path/expectedRevision and presetAsset/optional expectedPresetRevision; copies a snapshot, retains sequence tracks and key values',runtime:'runtime.take.start presetAsset/optional expectedPresetRevision, then explicit options override the snapshot; current recording never rereads the preset',output:'recordingSettings/fps/recordingTolerance copied into the recorded sequence; C++/BP LevelSequence playback uses the ordinary sequence asset without preset dependency',resources:'on-demand small asset read/copy; no new resident cache/worker/timer/GPU resource',remaining:Object.freeze(['Actor/source binding lists','Preset inheritance','Clock/timecode and external capture sources'])});
