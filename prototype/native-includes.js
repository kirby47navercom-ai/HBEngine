// Literal include discovery, shared by reflection/watch and project layout.
// Conditional branches and macro-expanded headers remain compiler-owned.
export function nativeIncludeDirectives(text){
 const out=[],length=text.length;
 const splice=i=>text[i]==='\\'?(text[i+1]==='\n'?2:text[i+1]==='\r'&&text[i+2]==='\n'?3:0):0;
 const advance=i=>{let n;while(n=splice(i))i+=n;return i;};
 const pair=(i,a,b)=>text[i]===a&&text[advance(i+1)]===b?advance(i+1)+1:0;
 const block=i=>{let newline=false;while(i<length){const n=splice(i);if(n){i+=n;continue;}const end=pair(i,'*','/');if(end)return {end,newline};if(text[i]==='\n'||text[i]==='\r')newline=true;i++;}return {end:length,newline};};
 const line=i=>{let value='',headerEnd='';while(i<length){const n=splice(i);if(n){i+=n;continue;}if(text[i]==='\n'||text[i]==='\r')break;if(headerEnd){const c=text[i++];value+=c;if(c===headerEnd)headerEnd='';continue;}if((text[i]==='"'||text[i]==='<')&&/^(?:#|%:)\s*include\s*$/.test(value)){headerEnd=text[i]==='"'?'"':'>';value+=text[i++];continue;}const comment=pair(i,'/','*');if(comment){value+=' ';i=block(comment).end;continue;}if(pair(i,'/','/'))break;value+=text[i++];}return {value,end:i};};
 let i=0,start=true;
 while(i<length){
  const c=text[i],n=splice(i);if(n){i+=n;continue;}
  if(c==='\n'||c==='\r'){start=true;i++;continue;}
  if(/\s/.test(c)){i++;continue;}
  const comment=pair(i,'/','/');if(comment){i=comment;while(i<length&&text[i]!=='\n'&&text[i]!=='\r')i+=splice(i)||1;continue;}
  const opening=pair(i,'/','*');if(opening){const b=block(opening);if(b.newline)start=true;i=b.end;continue;}
  if(start&&(c==='#'||text.startsWith('%:',i))){
   const logical=line(i),match=logical.value.match(/^(?:#|%:)\s*include\s*(?:"([^"\r\n]+)"|<([^>\r\n]+)>)/);
   if(match){out.push({name:match[1]??match[2],style:match[1]!==undefined?'quote':'angle',start:i,end:logical.end,standalone:!logical.value.slice(match[0].length).trim()});i=logical.end;start=false;continue;}
  }
  if('uULR'.includes(c)){
   let prefix='',at=i;const offsets=[];while(prefix.length<22&&at<length){at=advance(at);if(at>=length)break;prefix+=text[at++];offsets.push(at);}const raw=prefix.match(/^(?:u8|u|U|L)?R"([^\s()\\]{0,16})\(/);
   if(raw){const closing=')'+raw[1]+'"',end=text.indexOf(closing,offsets[raw[0].length-1]);i=end<0?length:end+closing.length;start=false;continue;}
  }
  if(/[0-9]/.test(c)||c==='.'&&/[0-9]/.test(text[i+1]||'')){i++;while(i<length&&(/[A-Za-z_0-9.']/.test(text[i])||/[+-]/.test(text[i])&&/[eEpP]/.test(text[i-1])))i++;start=false;continue;}
  if(c==='"'||c==="'"){
   const quote=c;i++;while(i<length){const n=splice(i);if(n){i+=n;continue;}const at=text[i++];if(at==='\\'){i++;continue;}if(at===quote)break;}start=false;continue;
  }
  // Skip identifiers together: an R within an identifier is not a raw prefix.
  if(/[A-Za-z_]/.test(c)){i++;while(i<length){i=advance(i);if(!/[A-Za-z_0-9]/.test(text[i]||''))break;i++;}}else i++;
  start=false;
 }
 return out;
}
// Legacy inline builds already inject their authored header as User.hpp.
// Blank real local-header directives without modifying examples in literals.
export function stripNativeInlineHeaderIncludes(text){
 const rows=nativeIncludeDirectives(text).filter(row=>row.style==='quote'&&row.standalone&&/\.(?:h|hpp)$/.test(row.name));if(!rows.length)return text;
 const out=[];let at=0;for(const row of rows){out.push(text.slice(at,row.start),text.slice(row.start,row.end).replace(/[^\r\n]/g,' '));at=row.end;}out.push(text.slice(at));return out.join('');
}
