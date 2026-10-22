import {nativeComponentBases,nativeReferenceTypes} from './native-builtins.mjs';
// The generated friend sees only explicitly reflected members. The author's
// header stays unchanged, including its ordinary C++ access restrictions.
export function nativeAccess(metadata,{userNamespace=''}={}){
 if(userNamespace&&!/^[A-Za-z_]\w*$/.test(userNamespace))throw Error('C++ 모듈 namespace를 확인하세요.');
 const groups=new Map(),classTypes=new Map(),enumTypes=new Map(),owners=new Map();
 const group=names=>{const key=JSON.stringify(names||[]);if(!groups.has(key))groups.set(key,{names:names||[],index:groups.size,code:[]});return groups.get(key);};
 const actual=name=>'::'+[userNamespace,name].filter(Boolean).join('::');
 metadata.classes.forEach((c,index)=>{
  const g=group(c.cppNamespace),type='C_'+index;classTypes.set(c.name,'HB_NativeAccess::'+type);
  g.code.push('using '+type+'='+actual(c.cppName||c.name)+';');
  const info={type:'HB_NativeAccess::'+type,properties:new Map(),functions:new Map(),actor:'HB_NativeAccess::A_'+index};owners.set(c.name,info);
  c.properties.forEach((p,n)=>{const stem=index+'_'+n,alias='T_'+stem,method='P_'+stem;g.code.push('using '+alias+'=decltype('+type+'::'+p.name+');static auto& '+method+'('+type+'& value){return value.'+p.name+';}');info.properties.set(p.name,{type:'HB_NativeAccess::'+alias,get:value=>'HB_NativeAccess::'+method+'('+value+')'});});
  c.functions.forEach((f,n)=>{const stem=index+'_'+n,method='F_'+stem,base='B_'+stem,signature='S_'+stem;g.code.push('using '+signature+'=HB_NativeFunctionTraits<decltype(&'+type+'::'+f.name+')>;');
   const args=f.parameters.map((p,i)=>{const name='Arg_'+stem+'_'+i;g.code.push('using '+name+'=typename '+signature+'::template Arg<'+i+'>;');return 'HB_NativeAccess::'+name;});
   g.code.push('template<class...Args>static decltype(auto) '+method+'('+(f.static?'':type+'& value,')+'Args&&...args){return '+(f.static?type+'::':'value.')+f.name+'(std::forward<Args>(args)...);}');
   if(f.event==='native')g.code.push('template<class...Args>static void '+base+'('+type+'& value,Args&&...args){value.'+type+'::'+f.name+'(std::forward<Args>(args)...);}');
   info.functions.set(f.name,{args,invoke:(receiver,args,baseCall=false)=>'HB_NativeAccess::'+(baseCall?base:method)+'('+[...f.static?[]:[receiver],...args].join(',')+')'});
  });
  if(nativeComponentBases.has(c.base))g.code.push('static auto& A_'+index+'('+type+'& value){return value.'+type+'::actor;}');
 });
 (metadata.enums||[]).forEach((e,index)=>{const type='E_'+index;group(e.cppNamespace).code.push('using '+type+'='+actual(e.name)+';');enumTypes.set(e.name,'HB_NativeAccess::'+type);});
 const traits='template<class T>struct HB_NativeFunctionTraits;template<class R,class C,class...A>struct HB_NativeFunctionTraits<R(C::*)(A...)>{template<size_t I>using Arg=std::tuple_element_t<I,std::tuple<A...>>;};template<class R,class C,class...A>struct HB_NativeFunctionTraits<R(C::*)(A...)const>:HB_NativeFunctionTraits<R(C::*)(A...)>{};template<class R,class...A>struct HB_NativeFunctionTraits<R(*)(A...)>{template<size_t I>using Arg=std::tuple_element_t<I,std::tuple<A...>>;};\n';
 const scopes=[...groups.values()].map(g=>{
  const names=[...userNamespace?[userNamespace]:[],...g.names],open=names.map(name=>'namespace '+name+' {').join(''),close='}'.repeat(names.length);
  return open+'struct HB_ReflectionAccess{'+g.code.join('\n')+'};using HB_AccessGroup_'+g.index+'=HB_ReflectionAccess;'+close;
 }).join('\n');
 const bases=[...groups.values()].map(g=>'public ::'+[userNamespace,...g.names.filter(Boolean),'HB_AccessGroup_'+g.index].filter(Boolean).join('::')).join(',');
 const code='#include <tuple>\n#include <utility>\n'+traits+scopes+'\nnamespace {struct HB_NativeAccess'+(bases?':'+bases:'')+'{};}\n';
 const cpp={bool:'bool',int:'int',float:'float',string:'std::string',vec2:'hb::Vec2',vec3:'hb::Vec3',color:'hb::Color',transform:'hb::Transform',object:'hb::Actor*',hit:'hb::HitResult'};
 const cppType=p=>p.array?'std::vector<'+cppType({...p,array:false})+'>':p.enumName?enumTypes.get(p.enumName):p.type==='record'?actual(p.structName):p.type==='object'?(classTypes.get(p.className)|| (nativeReferenceTypes.has(p.className)?'hb::'+(p.className==='Object'?'Actor':p.className):p.className||'hb::Actor'))+'*':cpp[p.type];
 return {code,owners,enumTypes,cppType};
}
