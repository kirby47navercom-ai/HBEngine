import {widgetTypes,widgetEvents,widgetDefaults} from '../prototype/ui-assets.js';
import {mixerParameters,mixerDefaults} from '../prototype/audio-mixer.js';
import {placementCatalog} from '../prototype/placement-catalog.js';
import {randomUUID} from 'node:crypto';
import {assetTypes,assetSuffix,createAsset} from '../prototype/asset-documents.js';
import {componentDefinitions} from '../prototype/scene-components.js';
import {catalog,variableTypes} from '../prototype/blueprint-model.js';
import {materialCatalog} from '../prototype/material-runtime.js';
import {gameplayTypes,behaviorNodes,boardTypes,comparisons} from '../prototype/gameplay-assets.js';
import {blueprintClasses} from '../prototype/class-types.js';
import {physicsContract} from '../prototype/physics-world.js';

export const editorMethods={
  'profiler.read':{description:'실측 프레임·샘플·렌더 통계 조회',params:{}},
  'profiler.record':{params:{recording:'Boolean'}},
  'profiler.clear':{params:{}},
  'widget.add':{params:{path:'위젯 문서',expectedRevision:'현재 revision',type:'ui.widgets의 타입 key',parent:'부모 컨테이너 ID (생략: 루트)',name:'고유 이름 (선택)',dryRun:'검증만'}},
  'widget.reparent':{params:{path:'위젯 문서',expectedRevision:'현재 revision',node:'위젯 ID',parent:'부모 컨테이너 ID',dryRun:'검증만'}},
  'widget.duplicate':{params:{path:'위젯 문서',expectedRevision:'현재 revision',node:'위젯 ID',parent:'부모 컨테이너 ID (선택)',offset:'[x,y] (기본 16,16)',dryRun:'검증만'}},
  'widget.remove':{params:{path:'위젯 문서',expectedRevision:'현재 revision',node:'위젯 ID (자식도 함께 삭제)',dryRun:'검증만'}},
  'editor.state':{description:'현재 문서, 창, 선택, 실행 상태와 로그 조회',params:{}},
  'document.open':{params:{path:'프로젝트 상대 경로'}},
  'document.get':{params:{path:'열린 문서 경로 (생략하면 활성 문서)'}},
  'document.patch':{params:{path:'열린 문서 경로',expectedRevision:'document.get의 revision',operations:'JSON Patch test/add/replace/remove 배열'}},
  'document.save':{params:{path:'열린 문서 경로',expectedRevision:'저장할 revision'}},
  'editor.undo':{params:{path:'열린 문서 경로',expectedRevision:'되돌릴 revision'}},
  'editor.redo':{params:{path:'열린 문서 경로',expectedRevision:'다시 실행할 revision'}},
  'blueprint.connect':{params:{path:'블루프린트 문서',expectedRevision:'현재 revision',view:'event / construction / 함수 ID',from:'{node,pin}',to:'{node,pin}',dryRun:'검증만'}},
  'blueprint.variable.drop':{params:{path:'블루프린트 문서',expectedRevision:'현재 revision',view:'그래프 ID',variableId:'변수 ID',target:'{node,pin,direction: in/out} 또는 null',position:'{x,y}',mode:'get / set',dryRun:'검증만'}},
  'scene.place':{params:{path:'장면 문서',expectedRevision:'현재 revision',key:'배치 카탈로그 key',position:'[x,y,z]',dryRun:'검증만'}},
  'collision.bake':{params:{path:'장면 또는 블루프린트 문서',expectedRevision:'현재 revision',object:'장면의 소유 오브젝트 ID',component:'MeshCollider ID',dryRun:'형상 생성·검증만; 원본 모델 또는 장면 렌더 메시를 로컬 정점으로 저장'}},
  'scene.select':{params:{ids:'오브젝트 ID 배열',focus:'선택 위치로 이동 여부'}},
  'runtime.play':{params:{}},'runtime.stop':{params:{}},'runtime.pause':{params:{}},'runtime.resume':{params:{}},
  'runtime.input':{params:{key:'키 이름',value:'-1~1 (생략하면 1, 놓기는 0)'}},
  'runtime.openScene':{params:{path:'장면 에셋의 전체 프로젝트 상대 경로'}},
  'runtime.state':{params:{}},'native.build':{params:{path:'C++이 연결된 블루프린트 경로'}}
};
export function engineSchema(){return {protocolVersion:1,assetTypes:Object.fromEntries(Object.entries(assetTypes).map(([kind,info])=>[kind,{...info,suffix:assetSuffix[kind],...(kind!=='code'?{example:createAsset(kind,info.prefix+'Example')}:{})}])),ui:{widgets:widgetTypes,events:widgetEvents,defaults:widgetDefaults,maxNodes:256,maxInstances:32,anchors:{fixed:'offset x/y/width/height',stretched:'offset left/top/right/bottom'},variables:['text','value','visible','enabled','checked']},audio:{busDefaults:mixerDefaults,parameters:mixerParameters,snapshotOverride:'SetFloat overrides snapshots until ClearFloat',maxBuses:64},physics:physicsContract,components:componentDefinitions,placement:placementCatalog,blueprint:{classes:blueprintClasses,variables:variableTypes,nodes:catalog},material:{nodes:materialCatalog},gameplay:{assets:gameplayTypes,behaviorNodes,boardTypes,comparisons,sequenceTracks:['position','rotation','scale','visible','event','camera','animation','audio','light','material','timeScale'],navigation:{solver:'collision-grid-A*',planes:['XY','XZ'],maxCells:40000},perception:{events:['OnTargetPerceptionUpdated'],eventParameters:{target:'object',sense:'string',sensed:'bool',location:'vec3',tag:'string'}},tags:{grammar:'dot-separated identifiers',query:{op:'all',tags:['State.Alive'],queries:[{op:'none',tags:['State.Stunned']}]}},limits:{montage:'single full-body clip per actor',fsm:'flat state machine',behavior:'interval-driven reactive selector'}},commands:editorMethods};}

export class EditorAutomation {
  constructor(){this.clients=new Map();this.commands=new Map();}
  clean(){const now=Date.now();for(const [id,client] of this.clients)if(now-client.seen>15000)this.clients.delete(id);for(const [id,command] of this.commands){if(now-command.created>300000)this.commands.delete(id);else if(!['done','error'].includes(command.status)&&now-command.created>120000)Object.assign(command,{status:'error',error:{code:'TIMEOUT',message:'편집기 응답 시간이 초과됐어요.'}});}}
  state(){this.clean();return {protocolVersion:1,clients:[...this.clients].map(([id,client])=>({id,...client})),methods:editorMethods};}
  submit(data){this.clean();if(!data||!Object.hasOwn(editorMethods,data.method))throw Error('지원하지 않는 편집기 명령');if(!this.clients.has(data.clientId))throw Error('연결된 편집기 clientId가 필요해요.');if(data.requestId!==undefined&&(typeof data.requestId!=='string'||data.requestId.length>100))throw Error('requestId 형식 오류');if(data.params!==undefined&&(!data.params||typeof data.params!=='object'||Array.isArray(data.params)))throw Error('명령 인자 형식 오류');
    const existing=data.requestId&&[...this.commands.values()].find(command=>command.clientId===data.clientId&&command.requestId===data.requestId);if(existing){if(existing.method!==data.method||JSON.stringify(existing.params)!==JSON.stringify(data.params||{}))throw Error('requestId를 다른 명령에 다시 사용할 수 없어요.');return existing;}
    if([...this.commands.values()].filter(c=>!['done','error'].includes(c.status)).length>=50)throw Error('대기 명령 한도 초과');const command={id:randomUUID(),clientId:data.clientId,requestId:data.requestId,method:data.method,params:data.params||{},status:'queued',created:Date.now()};this.commands.set(command.id,command);return command;
  }
  get(id){this.clean();const command=this.commands.get(id);if(!command)throw Error('명령을 찾을 수 없어요.');return command;}
  poll(data){this.clean();if(typeof data?.clientId!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(data.clientId)||!data.state||typeof data.state!=='object'||Array.isArray(data.state)||!Array.isArray(data.results)||data.results.length>50)throw Error('편집기 상태 형식 오류');this.clients.set(data.clientId,{seen:Date.now(),state:data.state});for(const result of data.results){const command=this.commands.get(result.id);if(command?.clientId===data.clientId&&command.status==='running')Object.assign(command,result.error?{status:'error',error:result.error}:{status:'done',result:result.result});}
    const commands=[...this.commands.values()].filter(c=>c.clientId===data.clientId&&c.status==='queued');for(const command of commands)command.status='running';return {commands};
  }
}
