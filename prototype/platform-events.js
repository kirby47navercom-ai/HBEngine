// Window focus / gamepad connection events from the native player's tick ({focused, gamepads: XInput slot bit mask}).
// The first tick is the baseline; later ticks fire On Window Focus Changed / On Gamepad Connection Changed on changes.
export async function platformEvents(previous,tick,vm){
  if(typeof tick?.focused!=='boolean'||!Number.isInteger(tick.gamepads))return previous;
  const next={focused:tick.focused,gamepads:tick.gamepads};if(!previous)return next;
  if(previous.focused!==next.focused)await vm.eventBindings('windowFocusChanged',{focused:next.focused},undefined,true);
  for(let index=0;index<4;index++){const was=!!(previous.gamepads&1<<index),now=!!(next.gamepads&1<<index);if(was!==now)await vm.eventBindings('gamepadConnectionChanged',{connected:now,index},undefined,true);}
  return next;
}
