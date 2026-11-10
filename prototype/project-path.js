// Match Windows' extended path envelope; the filesystem checks the absolute path.
export const projectPathLimit=32767;
export function validProjectPath(value,{empty=false}={}){
  return typeof value==='string'&&value.length<=projectPathLimit&&(value===''?empty:value.split('/').every(part=>part&&!/[<>:"\\|?*\x00-\x1f]/.test(part)&&!/[. ]$/.test(part)&&!/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)));
}
