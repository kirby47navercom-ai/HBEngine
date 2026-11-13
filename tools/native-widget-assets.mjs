import {widgetImageSource} from '../prototype/ui-assets.js';
const textTypes=new Set(['Text','Button','TouchButton','TextInput','CheckBox','ListView','TreeView']);
// Match native draw visibility before decoding assets. Hidden menu trees should
// not allocate their full-size pictures just because their widget exists.
export const nativeWidgetVisible=(node,touch=false)=>node.properties.visible!==false&&(touch?node.properties.deviceVisibility!=='mouse':node.properties.deviceVisibility!=='touch');
export function visibleWidgetNodes(data,touch=false){
 const children=new Map();for(const node of data.nodes){const list=children.get(node.parent)||[];list.push(node);children.set(node.parent,list);}
 const result=[],visit=node=>{if(!nativeWidgetVisible(node,touch)||node.properties.opacity===0)return;result.push(node);for(const child of children.get(node.id)||[])visit(child);};for(const root of children.get('')||[])visit(root);return result;
}
export function visibleWidgetAssets(data,scale=1,touch=false){
 const nodes=visibleWidgetNodes(data,touch),images=new Set(),fonts=new Set();let text=false;
 for(const node of nodes){const p=node.properties;if(textTypes.has(node.type)&&(['ListView','TreeView'].includes(node.type)||p.text||(node.type==='TextInput'&&p.placeholder))){text=true;if(p.font)fonts.add(p.font);}const names=node.type==='ProgressBar'?[p.backgroundTexture,p.fillTexture]:['Image','Button','TouchButton'].includes(node.type)?[widgetImageSource(p,scale)]:[];for(const name of names)if(name)images.add(name);}
 return {nodes,images,fonts,text};
}
