import {validWidgetAsset,validWidgetProperties,widgetDefaults} from './ui-assets.js';
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
export function widgetOverrideMap(text='{}'){const value=JSON.parse(text);if(!plain(value)||JSON.stringify(value).length>262144||Object.entries(value).some(([name,properties])=>!name||name.length>1024||!plain(properties)||Object.keys(properties).some(k=>!Object.hasOwn(widgetDefaults,k)||['widgetAsset','widgetOverrides','widgetEvents','widgetBindings'].includes(k))))throw Error('재사용 위젯의 요소별 속성을 확인하세요.');return value;}
export async function resolveWidgetComposition(data,read,{maxNodes=10000,maxDepth=16}={}){
 if(!validWidgetAsset(data))throw Error('원본 위젯 검증 실패');const cache=new Map();let count=0;
 async function expand(source,stack){if(stack.length>maxDepth)throw Error('재사용 위젯 깊이 제한을 넘었어요.');const next=structuredClone(source),output=[];
  for(const node of next.nodes){if(++count>maxNodes)throw Error('펼친 위젯 요소 예산을 넘었어요.');output.push(node);if(node.type!=='Widget'||!node.properties.widgetAsset)continue;
   const asset=node.properties.widgetAsset;if(stack.includes(asset))throw Error('재사용 위젯 순환 참조: '+asset);if(!cache.has(asset))cache.set(asset,Promise.resolve().then(()=>read(asset)).then(value=>{if(!validWidgetAsset(value))throw Error('참조 위젯 검증 실패: '+asset);return value;}));
   const child=await expand(await cache.get(asset),[...stack,asset]),root=child.nodes.find(n=>!n.parent),ids=new Map(child.nodes.map(n=>[n.id,node.id+'/'+n.id])),overrides=widgetOverrideMap(node.properties.widgetOverrides||'{}'),used=new Set(),events=JSON.parse(node.properties.widgetEvents||'{}'),bindings=JSON.parse(node.properties.widgetBindings||'{}');
   for(const row of child.nodes){if(Object.hasOwn(overrides,row.name)){row.properties={...row.properties,...overrides[row.name]};row.properties.styleOverrides=[...new Set([...(row.properties.styleOverrides||'').split(',').filter(Boolean),...Object.keys(overrides[row.name])])].join(',');used.add(row.name);if(!validWidgetProperties(row))throw Error('재사용 위젯 오버라이드 값 오류: '+row.name);}const old=row.id;row.id=ids.get(old);row.parent=row===root?node.id:ids.get(row.parent);row.name=node.name+'/'+row.name;row.compositionOwner=node.id;row.events=Object.fromEntries(Object.entries(row.events).map(([key,value])=>[key,events[value]||value]));row.bindings=Object.fromEntries(Object.entries(row.bindings).map(([key,value])=>[key,bindings[value]||value]));if(row===root){row.properties.widgetReferenceSize=[...child.referenceSize];row.slot={anchors:[0,0,1,1],offset:[0,0,0,0],alignment:[0,0],zIndex:0,fill:1};}output.push(row);}
   for(const key of Object.keys(overrides))if(!used.has(key))throw Error('참조 위젯에 없는 요소예요: '+key);
  }next.nodes=output;return next;
 }
 const result=await expand(data,[]);if(!validWidgetAsset(result,{expanded:true}))throw Error('펼친 위젯 이름·계층·속성 검증 실패');return result;
}
