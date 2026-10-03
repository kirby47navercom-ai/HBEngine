import {createRigidPhysics,physicsQueryKeys,validPhysicsSnapshot} from '../prototype/physics-world.js';
import {serviceApi} from '../prototype/core-api.js';
import {validValue} from '../prototype/blueprint-model.js';

// One bounded, read-only query world per C++ call. It shares the game's exact
// collider narrow phase without advancing its time or solving any rigid body.
export class NativePhysicsQueries {
  constructor(objects){this.ids=new Set(objects.map(o=>o.id));this.objects=[];this.count=0;this.closed=false;}
  async query(request){
    if(this.closed)throw Error('종료된 C++ 물리 질의예요.');
    if(++this.count>128||!physicsQueryKeys.has(request?.key))throw Error('C++ 물리 질의 범위 또는 개수 오류');
    const spec=serviceApi.find(s=>s.key===request.key),args=request.args;
    if(!args||spec.inputs.some(p=>!validValue(p.type,args[p.id]))||args.ignore!==null&&!this.ids.has(args.ignore))throw Error('C++ 물리 질의 입력 오류');
    if(!validPhysicsSnapshot(request.objects)||request.objects.length!==this.ids.size||request.objects.some(o=>!this.ids.has(o.id)))throw Error('C++ 물리 월드 범위 오류');
    this.objects.splice(0,this.objects.length,...structuredClone(request.objects));
    this.world??=createRigidPhysics(this.objects,{queryOnly:true});await this.world.ready();if(this.closed)throw Error('종료된 C++ 물리 질의예요.');return this.world.query(request.key,args);
  }
  close(){this.closed=true;this.world?.dispose();}
}
