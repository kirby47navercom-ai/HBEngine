// Keep draining owned resources when one disposer fails. Preserve the original
// runtime error alongside cleanup errors instead of masking it in a finally.
export async function closeNativeRuntime(steps,primaryError){
 const errors=[];
 for(const dispose of steps){try{await dispose();}catch(error){errors.push(error);}}
 if(errors.length)throw new AggregateError(primaryError?[primaryError,...errors]:errors,'네이티브 게임 자원 해제 실패');
}
