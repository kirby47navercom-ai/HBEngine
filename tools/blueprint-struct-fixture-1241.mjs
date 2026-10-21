import {createAsset} from '../prototype/asset-documents.js';
import {makeNode,makeDefinition,connect,splitPin,graphContext} from '../prototype/blueprint-model.js';
import {configureSwitchNode} from '../prototype/flow-pins.js';
export const pose=()=>({position:[1,2,3],rotation:[4,5,6],scale:[-1,2,3]});
export const structGraph=(name='Structures')=>({...createAsset('blueprint',name,'Actor'),nodes:[],edges:[],comments:[],variables:[],construction:{nodes:[],edges:[],comments:[]}});
export const put=(g,key,id,extra={})=>{const n={...makeNode(key),id,...extra};g.nodes.push(n);return n;};
export function wire(g,from,pin,to,input='exec'){const result=connect(g,{node:from.id||from,pin},{node:to.id||to,pin:input});if(!result.ok)throw Error(result.reason);}
export function structFixture(){
 const g=structGraph();g.variables=[{id:'Pose',name:'Pose',type:'transform',container:'single',value:pose()},{id:'Rows',name:'Rows',type:'transform',container:'array',value:[pose(),pose()]}];
 const begin=put(g,'beginPlay','Begin',{position:{x:30,y:30}}),get=put(g,'getVariable','ReadPose',{variableId:'Pose',position:{x:30,y:220}}),patch=put(g,'setMembers','PatchPose',{valueType:'transform',memberPins:['position'],inputValues:{member_position:[10,20,30]},position:{x:290,y:30}});
 wire(g,begin,'then',patch);wire(g,get,'value',patch,'value');
 const scaleRead=put(g,'getVariable','ReadScale',{variableId:'Pose'}),scale=put(g,'setMembers','PatchScale',{valueType:'vec3',memberPins:['z'],inputValues:{member_z:-4}});splitPin(g,scaleRead.id,'out','value');wire(g,scaleRead,'value.scale',scale,'value');wire(g,patch,'then',scale);
 const d=makeDefinition(g,'function','RotatePose').definition;d.inputs.push({id:'pose',label:'Pose',type:'transform',array:false});const fn=graphContext(g,d.id),[entry,exit]=d.graph.nodes,inner=put(fn,'setMembers','FunctionPatch',{valueType:'transform',memberPins:['rotation'],inputValues:{member_rotation:[6,7,8]}});wire(fn,entry,'exec',inner);wire(fn,entry,'pose',inner,'value');wire(fn,inner,'then',exit,'then');
 const call=put(g,'callFunction','RotateCall',{definitionId:d.id}),readWhole=put(g,'getVariable','ReadWhole',{variableId:'Pose'});wire(g,readWhole,'value',call,'pose');wire(g,scale,'then',call);
 const rows=put(g,'getVariable','ReadRows',{variableId:'Rows'}),reroute=put(g,'reroute','RowsRoute',{valueType:'transform',array:true}),item=put(g,'arrayGet','Item',{valueType:'transform',inputValues:{index:1}}),arrayPatch=put(g,'setMembers','ArrayPatch',{valueType:'transform',memberPins:['position'],inputValues:{member_position:[7,8,9]}});wire(g,rows,'value',reroute,'value');wire(g,reroute,'value',item,'array');wire(g,item,'return',arrayPatch,'value');wire(g,call,'then',arrayPatch);
 const branch=put(g,'switchName','NameSwitch',{inputValues:{selection:'PLAyer'}});configureSwitchNode(g,g,branch.id,{cases:[{id:'out0',value:'Enemy'},{id:'out1',value:'Player'}]});wire(g,arrayPatch,'then',branch);
 const breakPose=put(g,'breakStruct','BreakPose',{valueType:'transform',memberPins:['position','rotation','scale']}),move=put(g,'setPosition','Move',{inputValues:{target:'Actor'}});wire(g,readWhole,'value',breakPose,'value');wire(g,breakPose,'position',move,'position');wire(g,branch,'out1',move);
 const fail=put(g,'print','Mismatch',{inputValues:{message:'wrong-case'}});wire(g,branch,'default',fail);
 return {g,patch,branch,arrayPatch,call,breakPose};
}
export const structHeader=`#include <HBEngine/Struct.hpp>
using namespace hb;
HB_CLASS(Blueprintable)
class StructureActor : public Actor {
public:
 HB_FUNCTION(BlueprintPure) Transform Patch(const Transform& value,const Vec3& position);
 HB_FUNCTION(BlueprintPure) Vec3 Vector(const Vec3& value);
 HB_FUNCTION(BlueprintPure) bool Check();
};`;
export const structSource=`#include "StructureActor.h"
Transform StructureActor::Patch(const Transform& value,const Vec3& position){Transform fields;fields.position=position;return Struct::WithMembers(value,fields,1);}
Vec3 StructureActor::Vector(const Vec3& value){auto result=value;Struct::SetMembers(result,Vec3{9,8,7},2);return result;}
bool StructureActor::Check(){
 auto v2=Struct::Make(2.f,3.f);Struct::SetMembers(v2,Vec2{7,8},1);
 auto v3=Struct::Make(1.f,2.f,3.f);float x,y,z;Struct::Break(v3,x,y,z);
 auto color=Struct::Make(.1f,.2f,.3f,.4f);Struct::SetMembers(color,Color{1,1,1,1},8);
 auto transform=Struct::Make(Vec3{1,2,3},Vec3{4,5,6});Vec3 p,r,s;Struct::Break(transform,p,r,s);
 Actor actor;auto hit=Struct::Make(true,p,Vec3{0,1,0},&actor);Struct::SetMembers(hit,HitResult{},1);
 bool rejected=false;try{Struct::SetMembers(v3,Vec3{},8);}catch(...){rejected=true;}
 return v2.x==7&&v2.y==3&&x==1&&y==2&&z==3&&color.r==.1f&&color.a==1&&s.x==1&&!hit.hit&&hit.actor==&actor&&rejected
 &&Struct::Select(false,std::vector<int>{1},std::vector<int>{2})[0]==2
 &&Struct::Switch(std::vector<int>{4,9},9)==1&&Struct::Switch(std::vector<std::string>{"Player"},"PLAyer",false)==0
 &&Struct::Switch(std::vector<std::string>{"Player"},"PLAyer",true)==-1;
}`;
