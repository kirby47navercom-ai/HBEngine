import {sampleCurveSegment} from './curve-sampling.js';
export function animationCurveSampler(keys){const result=new Float64Array(1);return {evaluate(time){let low=0,high=keys.length;while(low<high){const mid=(low+high)>>>1;if(keys[mid].time<=time)low=mid+1;else high=mid;}result[0]=sampleCurveSegment(keys,Math.max(0,low-1),time);return result;}};}
