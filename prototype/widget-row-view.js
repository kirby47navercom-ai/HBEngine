import {bindWidgetRow,widgetRowBindings} from './widget-row.js';
import {renderWidgetTree} from './ui-runtime.js';
export function widgetRowRenderer(node,options){
 if(!node.rowTemplate)return undefined;
 const template=node.rowTemplate,bindings=widgetRowBindings(node.properties.rowBindings||'{}',template);
 return(host,item,index)=>{
  const budget=options.rowBudget,cost=template.nodes.length;if(budget&&budget.used+cost>budget.maxNodes){host.textContent='UI 요소 예산 초과';host.dataset.uiBudgetExceeded='';return{blocked:true,update(){},dispose(){}};}if(budget)budget.used+=cost;delete host.dataset.uiBudgetExceeded;
  const data=structuredClone(template),inner=host.ownerDocument.createElement('div');Object.assign(inner.style,{position:'relative',width:'100%',height:node.properties.autoRows?template.referenceSize[1]+'px':'100%'});host.style.padding='0';host.replaceChildren(inner);
  let current=item,position=index;bindWidgetRow(data,template,bindings,item,index);
  let view;try{view=renderWidgetTree(inner,data,{...options,event:(child,type)=>options.event({...child,id:node.id,rowIndex:position,rowElement:child.name,rowItem:current},type)});}catch(error){if(budget)budget.used-=cost;throw error;}
  let disposed=false;return{update(next,at){if(next===current&&at===position)return;view.resetControls(true);current=next;position=at;bindWidgetRow(data,template,bindings,next,at);view.update();},fontsReady:()=>view.fontsReady(),endFrame:()=>view.endFrame(),resetControls:emit=>view.resetControls(emit),dispose:()=>{if(disposed)return;disposed=true;view.dispose('row-recycled');if(budget)budget.used-=cost;}};
 };
}
