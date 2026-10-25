const starts=(path,prefix)=>prefix.every((part,i)=>path[i]===part);
// Scope selections to authored relationship fields, preserving independent edits.
export function graphEdgeConflictPaths(result,row,{graphPath=[],includeResolved=false}={}){
 const scopes=['base','ours','theirs'].flatMap(side=>row?.[side]?.mergePath?[[...graphPath,...row[side].mergePath]]:[]),conflicts=includeResolved?[...result.conflicts,...result.resolved]:result.conflicts;
 return conflicts.filter(conflict=>scopes.some(scope=>starts(conflict.path,scope))).map(conflict=>conflict.id);
}
