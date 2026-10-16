import {meshEdges} from './mesh-topology.js';
export function assetShortcutScope(pane,kind,focused){return pane?.id===focused?kind==='widget'?'widget':kind==='mesh'?'modeling':kind==='prefab'?'viewport':'other':'other';}
export function dispatchAssetShortcut(id,editor){
 if(!editor||editor.disposed)return false;
 if(id.startsWith('widget')&&editor.doc.kind==='widget'){
  if(editor.testing)return false;
  const actions={widgetCopy:()=>editor.copy(),widgetCut:()=>editor.copy(true),widgetPaste:()=>editor.paste(),widgetDuplicate:()=>editor.duplicate(),widgetDelete:()=>editor.remove(),widgetFocus:()=>editor.element.querySelector('[data-ui-action=fit]')?.click()};
  if(actions[id]){actions[id]();return true;}
  const nudge=/^widgetNudge(Fast)?(Left|Right|Up|Down)$/.exec(id);if(nudge){const axis=['Left','Right'].includes(nudge[2])?0:1,delta=(nudge[1]?10:1)*(['Left','Up'].includes(nudge[2])?-1:1);editor.edit(data=>{const node=data.nodes.find(n=>n.id===editor.selected);if(!node?.parent)return;node.slot.offset[axis]+=delta;if(node.slot.anchors[axis]!==node.slot.anchors[axis+2])node.slot.offset[axis+2]-=delta;});return true;}
 }
 if(id.startsWith('mesh')&&editor.doc.kind==='mesh'){
  if(editor.hooks.running())return false;if(id==='meshFocus'){editor.fit();return true;}
  if(id==='meshSelectAll'){if(editor.selectionMode==='vertex')editor.vertices=new Set(editor.doc.data.vertices.map((_,i)=>i));else if(editor.selectionMode==='edge')editor.edges=meshEdges(editor.doc.data);else editor.faces=new Set(editor.doc.data.indices.filter((_,i)=>i%3===0).map((_,i)=>i));editor.updateSelection();editor.render();return true;}
  const operation={meshBridge:'bridge',meshInset:'insetRegion',meshRetriangulate:'retriangulateRegion',meshDuplicateFaces:'duplicateFaces',meshDeleteFaces:'deleteFaces',meshFlipFaces:'flip'}[id];if(operation){editor.action(editor.element.querySelector('[data-world-mesh='+operation+']'));return true;}
 }
 return false;
}
