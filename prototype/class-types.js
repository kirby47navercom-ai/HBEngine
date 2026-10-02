export const blueprintClasses = {
  Actor: {label:'Actor', ko:'액터', icon:'cube', base:null, components:['Transform','MeshRenderer'], placeable:true},
  Pawn: {label:'Pawn', ko:'폰', icon:'pawn', base:'Actor', components:['Transform','MeshRenderer','PawnMovement'], placeable:true},
  Character: {label:'Character', ko:'캐릭터', icon:'character', base:'Pawn', components:['Transform','CapsuleCollider','MeshRenderer','CharacterMovement'], placeable:true},
  PlayerController: {label:'Player Controller', ko:'플레이어 컨트롤러', icon:'controller', base:'Actor', components:[], placeable:false},
  GameMode: {label:'Game Mode', ko:'게임 모드', icon:'game', base:'Actor', components:[], placeable:false},
  Component: {label:'Actor Component', ko:'액터 컴포넌트', icon:'component', base:null, components:[], placeable:false},
  SceneComponent: {label:'Scene Component', ko:'씬 컴포넌트', icon:'layers', base:'Component', components:['Transform'], placeable:false}
};
export function derivesFrom(type,base){for(let next=type;next;next=blueprintClasses[next]?.base)if(next===base)return true;return false;}
