import {compileRayProgram} from '../prototype/ray-material-program.js';
import {rayProgramLayouts,rayOperationMask} from '../prototype/ray-materials.js';

export function channelLayoutFixture863({legacy=false,rotate=0,values=[-.125,1.25,-2.5,8],reverseLiterals=false}={}){
 const operations=[{operation:0,args:[],value:values,size:4,inputSize:4}];
 for(let lane=0;lane<4;lane++){
  const selector=(lane+rotate)%4,id=operations.length;
  operations.push({operation:6,args:[0],value:[selector,0,0,0],size:1,inputSize:4});
  operations.push({operation:8,args:[id],value:[lane,1,1,1],size:4,inputSize:4});
 }
 const compiled=compileRayProgram(operations),program=rayProgramLayouts([compiled],[3])[0];
 if(legacy)for(const row of program.instructions)if(row[0]===6)row.splice(8,3,0,0,0);
 const pointer=16,width=pointer+compiled.length*3,data=new Float32Array(width*4);
 data.set([0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,6]);
 data[5*4+2]=6;data.set([0,0,8,4],7*4);data.set([0,0,1,0],14*4);data.set([pointer,compiled.length,0,program.key],15*4);
 for(const [n,row]of compiled.entries())data.set(row,(pointer+n*3)*4);
 if(reverseLiterals)for(const[n,row]of compiled.entries())if(row[0]===6)data[(pointer+n*3+2)*4]=3-row[8];
 return {data:[...data],width,height:1,pointer,program,rayInfo:{programs:[program],fields:[3],registers:2,operations:rayOperationMask([0,6,8]),hierarchy:false},geometryInfo:[width,1,0,0],geometryRecords:[0,0,0,0],transport:[4,2,0,0],expected:Array.from({length:4},(_,i)=>values[legacy&&reverseLiterals?3-(i+rotate)%4:(i+rotate)%4])};
}
