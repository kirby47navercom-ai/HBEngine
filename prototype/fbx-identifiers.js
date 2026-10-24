const signature='Kaydara FBX Binary  \0\x1a\0';
const decoder=new TextDecoder(),encoder=new TextEncoder();
const identitySlots=(parents,name)=>parents.length===1&&parents[0]==='Objects'?[0]:parents.length===1&&parents[0]==='Connections'&&name==='C'?[1,2]:parents.at(-1)==='PoseNode'&&name==='Node'?[0]:[];
// Three's FBX parser uses Number keys. Give it collision-free temporary keys;
// keep the original file/hash and exact decimal IDs for import override matching.
export function prepareFbxIdentifiers(buffer){
 const bytes=buffer instanceof ArrayBuffer?new Uint8Array(buffer):buffer;
 if(!(bytes instanceof Uint8Array))throw Error('FBX 바이트 자료를 확인하세요.');
 const slots=[],declared=new Set();let nodes=0;
 const collect=(parents,name,values)=>{if(++nodes>1000000)throw Error('FBX 식별자 노드 예산 초과');for(const index of identitySlots(parents,name)){const slot=values[index];if(!slot||!/^[-+]?\d+$/.test(slot.value))throw Error('FBX 정수 식별자 오류');const id=BigInt(slot.value);if(id<-(1n<<63n)||id>=(1n<<63n))throw Error('FBX 식별자 64비트 범위 초과');slot.id=id.toString();if(parents.length===1&&parents[0]==='Objects'){if(declared.has(slot.id))throw Error('중복 FBX 객체 식별자: '+slot.id);declared.add(slot.id);}slots.push(slot);}};
 const binary=bytes.length>=23&&decoder.decode(bytes.subarray(0,23))===signature;
 let text;
 if(binary){
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let at=27;
  const range=n=>{if(!Number.isSafeInteger(n)||n<0||at+n>bytes.length)throw Error('FBX 식별자 바이너리 범위 오류');};
  if(bytes.length<27)throw Error('FBX 바이너리 헤더 오류');const version=view.getUint32(23,true),wide=version>=7500,header=wide?25:13;if(version<7000||version>8000)throw Error('지원하지 않는 FBX 버전');
  const u32=()=>{range(4);const v=view.getUint32(at,true);at+=4;return v;},size=()=>{if(!wide)return u32();range(8);const n=Number(view.getBigUint64(at,true));at+=8;if(!Number.isSafeInteger(n))throw Error('FBX 오프셋 오류');return n;};
  const property=()=>{range(1);const type=String.fromCharCode(bytes[at++]);if('fdilbc'.includes(type)){u32();u32();const length=u32();range(length);at+=length;return null;}if(type==='S'||type==='R'){const length=u32();range(length);at+=length;return null;}const length={Y:2,C:1,I:4,F:4,D:8,L:8}[type];if(!length)throw Error('FBX 속성 형식 오류');range(length);const start=at;at+=length;return{start,type,value:type==='L'?view.getBigInt64(start,true).toString():type==='I'?String(view.getInt32(start,true)):''};};
  const node=(parents=[])=>{if(parents.length>128)throw Error('FBX 깊이 예산 초과');range(header);const start=at,end=size(),count=size(),length=size(),nameLength=bytes[at++];if(!end)return false;if(end<=start||end>bytes.length||count>1000000)throw Error('FBX 노드 범위 오류');range(nameLength);const name=decoder.decode(bytes.subarray(at,at+nameLength));at+=nameLength;const propertyEnd=at+length;if(propertyEnd>end)throw Error('FBX 속성 범위 오류');const values=[];for(let i=0;i<count;i++){const value=property();if(i<3)values.push(value);}if(at!==propertyEnd)throw Error('FBX 속성 길이 오류');collect(parents,name,values);while(at<end){if(!node([...parents,name])){at=end;break;}if(at>end)throw Error('FBX 자식 범위 오류');}return true;};
  while(at+header<=bytes.length&&node()){}
 }else{
  text=decoder.decode(bytes);const version=Number(text.match(/FBXVersion\s*:\s*(\d+)/)?.[1]);if(version<7000||version>8000||!version)throw Error('FBX ASCII 버전 오류');
  const parents=[];let statement=[],quoted=false,escaped=false,start=0;
  const token=value=>{if(statement.length<10)statement.push(value);};
  const flush=()=>{if(statement[1]?.value===':')collect(parents,statement[0].value,statement.slice(2).filter(t=>t.value!==','));statement=[];};
  // A lexical walk preserves quoted strings, comments, CRLF and inline nodes.
  for(let i=0;i<=text.length;i++){const c=text[i];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"'){quoted=false;token({start,end:i+1,value:text.slice(start,i+1)});}continue;}if(c==='"'){quoted=true;start=i;continue;}if(c===';'){flush();while(i<text.length&&!/[\r\n]/.test(text[i]))i++;continue;}if(c==='{' ){const name=statement[0]?.value||'';flush();parents.push(name);if(parents.length>128)throw Error('FBX 깊이 예산 초과');continue;}if(c==='}'){flush();if(!parents.length)throw Error('FBX 괄호 오류');parents.pop();continue;}if(c===undefined||c==='\n'||c==='\r'){flush();continue;}if(/\s/.test(c))continue;if(c===':'||c===','){token({start:i,end:i+1,value:c});continue;}start=i;while(i+1<text.length&&!/[\s,:{};"\r\n]/.test(text[i+1]))i++;token({start,end:i+1,value:text.slice(start,i+1)});}
  if(quoted||parents.length)throw Error('FBX 문자열·괄호 오류');
 }
 if(!slots.some(s=>!Number.isSafeInteger(Number(s.id))))return{bytes:buffer,originalIds:null};
 const ids=new Map([['0',0]]),originalIds=new Map();for(const s of slots)if(!ids.has(s.id)){const id=ids.size;ids.set(s.id,id);originalIds.set(id,s.id);}
 if(binary){const copy=new Uint8Array(bytes),view=new DataView(copy.buffer);for(const s of slots){const id=ids.get(s.id);if(s.type==='L')view.setBigInt64(s.start,BigInt(id),true);else view.setInt32(s.start,id,true);}return{bytes:copy.buffer,originalIds};}
 let result='',at=0;for(const s of slots.sort((a,b)=>a.start-b.start)){result+=text.slice(at,s.start)+ids.get(s.id);at=s.end;}result+=text.slice(at);return{bytes:encoder.encode(result).buffer,originalIds};
}
