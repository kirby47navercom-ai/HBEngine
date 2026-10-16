import {resolveWidgetComposition} from './widget-composition.js';
import {validPresentationAsset} from './localization.js';
export async function resolveWidgetPresentation(data,read,localization){
 const next=await resolveWidgetComposition(data,read),styles=new Map();await Promise.all(next.nodes.map(async node=>{const p=node.properties;await localization?.load(p.stringTable);if(!p.style)return;if(!styles.has(p.style))styles.set(p.style,Promise.resolve(read(p.style)).then(style=>{if(!validPresentationAsset('uistyle',style))throw Error('위젯 스타일 오류');return style;}));const style=await styles.get(p.style),values=style.styles.find(s=>s.name===(p.styleName||'Default'));if(!values)throw Error('위젯 스타일 이름 오류');const overrides=new Set((p.styleOverrides||'').split(',').map(s=>s.trim()));for(const [key,value] of Object.entries(values))if(key!=='name'&&!overrides.has(key))p[key]=value;}));return next;
}
