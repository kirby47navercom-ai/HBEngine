import {curveKeyTangent,curveKeyWeight,curveBezierParameter,sampleCurveSegment} from './curve-sampling.js';

// Authoring only: exact de Casteljau subdivision in (time,value), per channel.
// Existing weighted-handle schema is retained; unrepresentable handles reject.
export function subdivideCurve(track,times){
  const result=structuredClone(track),mode=(keys,i)=>keys[i].interpolation||track.interpolation||'linear';
  const shaped=(value,fn)=>Array.isArray(value)?value.map((_,c)=>fn(c)):fn(0);
  const part=(value,c)=>Array.isArray(value)?value[c]:value;
  for(const time of [...new Set(times)].sort((a,b)=>a-b)){
    const keys=result.keys;
    if(!Number.isFinite(time)||time<keys[0].time||time>keys.at(-1).time)throw Error('부분 베이크 범위는 첫 키와 마지막 키 사이여야 해요.');
    if(keys.some(k=>k.time===time))continue;
    let i=0;while(i+1<keys.length&&keys[i+1].time<time)i++;
    const original=structuredClone(keys),a=keys[i],b=keys[i+1],duration=b.time-a.time,u=(time-a.time)/duration,kind=mode(original,i);
    const freeze=index=>{const key=keys[index];for(const field of ['arriveTangent','leaveTangent'])key[field]=shaped(key.value,c=>curveKeyTangent(original,index,c,field,track.interpolation||'linear'));if(mode(original,index)==='clampedAuto')for(const field of ['arriveWeight','leaveWeight'])delete key[field];if(!['linear','constant','step'].includes(mode(original,index)))key.interpolation='break';};
    freeze(i);freeze(i+1);
    if(i===1&&mode(original,0)==='clampedAuto')freeze(0);
    if(i===keys.length-3&&mode(original,keys.length-1)==='clampedAuto')freeze(keys.length-1);
    const key={time,value:sampleCurveSegment(original,i,time,track.interpolation||'linear'),interpolation:kind};
    if(!['linear','constant','step'].includes(kind)){
      const fields={leaveA:[],arrive:[],leave:[],arriveB:[]};
      const lerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
      const handle=(from,to,interval)=>{
        const dx=to[0]-from[0],dy=to[1]-from[1],weight=dx/interval;
        if(!Number.isFinite(weight)||weight< -1e-12||weight>1+1e-12||dx===0&&dy!==0)throw Error('이 경계의 수직·범위 밖 시간 핸들은 현재 가중치 형식으로 보존할 수 없어요. 다른 경계를 선택하세요.');
        const tangent=dx===0?0:dy/(dx*duration);
        if(!Number.isFinite(tangent))throw Error('분할 탄젠트가 유한한 범위를 벗어났어요.');
        return [tangent,Math.max(0,Math.min(1,weight))];
      };
      const values=[];for(let c=0;c<(Array.isArray(a.value)?a.value.length:1);c++){
        const w0=kind==='clampedAuto'?1/3:curveKeyWeight(original[i],c,'leaveWeight'),w1=mode(original,i+1)==='clampedAuto'?1/3:curveKeyWeight(original[i+1],c,'arriveWeight');
        const y0=part(a.value,c),y3=part(b.value,c),m0=curveKeyTangent(original,i,c,'leaveTangent',track.interpolation||'linear'),m1=curveKeyTangent(original,i+1,c,'arriveTangent',track.interpolation||'linear'),t=curveBezierParameter(u,w0,w1);
        const p0=[0,y0],p1=[w0,y0+duration*m0*w0],p2=[1-w1,y3-duration*m1*w1],p3=[1,y3];
        const q0=lerp(p0,p1,t),q1=lerp(p1,p2,t),q2=lerp(p2,p3,t),r0=lerp(q0,q1,t),r1=lerp(q1,q2,t),point=lerp(r0,r1,t);
        // The inverse solver locates the requested authored time. Store that
        // same value and normalize each surviving handle to its new interval.
        values.push(point[1]);fields.leaveA.push(handle(p0,q0,u));fields.arrive.push(handle(r0,point,u));fields.leave.push(handle(point,r1,1-u));fields.arriveB.push(handle(q2,p3,1-u));
      }
      const shape=value=>Array.isArray(a.value)?value:value[0];key.value=shape(values);key.interpolation='break';
      for(const[target,field,name]of [[a,'leave','leaveA'],[key,'arrive','arrive'],[key,'leave','leave'],[b,'arrive','arriveB']]){target[field+'Tangent']=shape(fields[name].map(v=>v[0]));target[field+'Weight']=shape(fields[name].map(v=>v[1]));}
    }
    keys.splice(i+1,0,key);
  }
  return result;
}
