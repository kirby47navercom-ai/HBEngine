import {meshEdges} from './mesh-topology.js';
import {assetShortcutKinds} from './asset-shortcut-commands.js';
export function assetShortcutScope(pane,kind,focused,target){if(kind==='animgraph'&&target?.closest?.('.anim-blend-space,.anim-sync-timeline'))return 'other';return pane?.id===focused?kind==='widget'?'widget':kind==='mesh'?'modeling':kind==='prefab'?'viewport':assetShortcutKinds[kind]||'other':'other';}
export function assetShortcutContexts(editor,event){const id=event?.target?.closest?.('[data-select-item]')?.dataset.selectItem;return [editor?.doc?.kind,...(editor?.doc?.kind==='montage'&&editor.doc.data.notifyStates?.some(n=>n.id===id)?['notify']:[])].filter(Boolean);}
export function dispatchAssetShortcut(id,editor,event){
 if(!editor||editor.disposed)return false;
 if(editor.hooks?.running?.()||editor.testing)return false;
 const kind=editor.doc?.kind;
 const click=selector=>{const button=editor.element?.querySelector(selector);if(button&&!button.disabled)button.click();};
 if(id.startsWith('retarget')&&['retargetrig','retarget'].includes(kind)){const action={retargetPreview:kind==='retargetrig'?'rig-preview':'play',retargetFirst:'rewind',retargetMapExact:'map-exact',retargetMapEmpty:'map-empty',retargetMapFuzzy:'map-fuzzy',retargetDuplicatePose:'duplicate-pose',retargetCapturePose:'capture-pose',retargetNewChain:'chain'}[id];if(action){click('[data-rt-act="'+action+'"]');return true;}}
 if(id.startsWith('audio')&&kind==='audiomixer'){if(id==='audioStop'){editor.stopPreview();editor.render();return true;}const selector={audioPreview:'[data-mixer-preview]',audioAddBus:'[data-mixer-add]',audioSnapshot:'[data-mixer-snapshot]'}[id];if(selector){click(selector);return true;}}
 if(id.startsWith('material')&&assetShortcutKinds[kind]==='material'){
  const actions={materialCopy:()=>editor.copySelection(),materialCut:()=>{editor.copySelection();editor.deleteSelection();},materialPaste:()=>editor.pasteSelection(),materialDuplicate:()=>editor.duplicateSelection(),materialDelete:()=>editor.deleteSelection(),materialSelectAll:()=>{editor.selected=new Set(editor.graph.nodes.map(n=>n.id));editor.render();},materialFocus:()=>editor.fit(true),materialFit:()=>editor.fit(),materialPreview:()=>{const node=[...editor.selected][0];if(node)editor.preview(editor.doc.view.materialPreview?.node===node?null:{node});}};
  if(actions[id]){actions[id]();return true;}
 }
 if(id.startsWith('curve')&&typeof editor.getNode==='function'){
  const actions={curveDelete:()=>editor.removeKeys(),curveAdd:()=>editor.addKey(editor.time),curveFit:()=>{editor.fit();editor.draw();},curveFocus:()=>{editor.fit(true);editor.draw();},curvePlay:()=>{editor.playing=editor.playing?0:1;}};
  if(actions[id]){actions[id]();return true;}
 }
 if(id.startsWith('animation')&&kind==='animgraph'){
  if(id==='animationDelete'){editor.machineView?click('[data-as-act="delete"]'):editor.remove();return true;}if(id==='animationFocus'){editor.fit();return true;}if(id==='animationPreview'){click('[data-anim-act="preview"]');return true;}
 }
 if(id.startsWith('gameplay')&&['behaviortree','statemachine'].includes(kind)){if(id==='gameplayDelete'){editor.removeNode();return true;}if(id==='gameplayFocus'){click('[data-act="fit"]');return true;}}
 if(id.startsWith('sequence')&&['montage','sequenceasset'].includes(kind)){
  const actions={sequencePlay:()=>click('[data-act="preview"]'),sequenceFirst:()=>editor.scrub(0),sequenceLast:()=>editor.scrub(editor.doc.data.length),sequencePreviousFrame:()=>editor.timelineMove(-1),sequenceNextFrame:()=>editor.timelineMove(1),sequencePreviousKey:()=>editor.timelineMove(-1,true),sequenceNextKey:()=>editor.timelineMove(1,true)};if(actions[id]){actions[id]();return true;}
 }
 if(id.startsWith('notify')&&assetShortcutContexts(editor,event).includes('notify')){
  const target=event.target.closest('[data-select-item]'),selected=target.dataset.selectItem,handle=event.target.dataset.notifyResize,step=(id.includes('Left')?-1:1)*(id.endsWith('Fast')?10:1)/60;
  editor.change(data=>{const n=data.notifyStates.find(n=>n.id===selected);if(id==='notifyDelete')data.notifyStates=data.notifyStates.filter(n=>n.id!==selected);else if(handle==='start'){const end=n.time+n.duration;n.time=Math.max(0,Math.min(end-.001,n.time+step));n.duration=end-n.time;}else if(handle==='end')n.duration=Math.max(.001,Math.min(data.length-n.time,n.duration+step));else n.time=Math.max(0,Math.min(data.length-n.duration,n.time+step));});
  const current=[...editor.element.querySelectorAll('[data-select-item]')].find(n=>n.dataset.selectItem===selected);(handle?current?.querySelector('[data-notify-resize="'+handle+'"]'):current)?.focus();return true;
 }
 if(id.startsWith('rig')&&kind==='spriterig'){
  const tool={rigToolPose:'pose',rigToolBone:'bone',rigToolCreateBone:'createBone',rigToolGeometry:'geometry',rigToolCreateVertex:'createVertex',rigToolWeights:'weights',rigToolIK:'ik'}[id];if(tool){editor.flush();editor.tool=tool;editor.playing=false;editor.render();return true;}
  const action={rigSplit:'split-bone',rigGrid:'grid',rigAutoWeights:'auto-weights',rigReset:'reset',rigPlay:'play'}[id];if(action){editor.actionClick(action);return true;}
  if(id==='rigFocus'){editor.fit();return true;}if(id==='rigDelete'){editor.actionClick(editor.vertices.size?'remove-vertices':'remove-bone');return true;}if(id==='rigCopy'){editor.copy();return true;}if(id==='rigPaste'){editor.paste();return true;}
 }
 if(kind==='tilemap'&&id.startsWith('tile')){const tool={tileBrush:'brush',tileErase:'erase',tileRectangle:'rectangle',tileFill:'fill',tilePick:'pick'}[id];if(tool){editor.finishStroke();editor.tool=tool;editor.updateTools();return true;}if(id==='tileFit'){editor.fit();return true;}}
 if(kind==='sprite'&&id==='spriteFit'||kind==='spriteanimation'&&id==='spriteAnimationFit'){editor.fit();return true;}
 if(kind==='spriteanimation'&&id==='spritePlay'){editor.togglePlay();return true;}
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
