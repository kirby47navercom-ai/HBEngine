import {EditorShortcuts,shortcutLabel} from './editor-shortcuts.js';
const defaultShortcuts=new EditorShortcuts();
// Modal commands have their own scope. Global Save/Play/Undo must never escape
// into the scene while a collision draft and its local history are open.
export function collisionShortcut(event,{shortcuts,is3D=false,canvas,drag=false}={}){
 if(event.isComposing||drag)return{};
 const editing=!!event.target.closest?.('input,textarea,select,[contenteditable]');
 const result=(shortcuts||defaultShortcuts).resolve(event,{scope:'collision',editing,contexts:!is3D&&event.target===canvas?['collision2d']:[]});
 if(result.command&&!result.command.id.startsWith('collision'))return{};
 return result;
}
export function collisionShortcutHints(dialog,shortcuts){
 const bindings=shortcuts||defaultShortcuts;for(const[id,selector]of [['collisionFit','[data-fit]'],['collisionUndo','[data-undo]'],['collisionRedo','[data-redo]'],['collisionAddPoint','[data-add-point]'],['collisionRemovePoint','[data-remove-point]']]){const button=dialog.querySelector(selector);if(button)button.title=bindings.keys(id).map(shortcutLabel).join(' / ');}
}
