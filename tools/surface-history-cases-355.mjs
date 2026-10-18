import {sameHistoryRefraction} from '../prototype/path-surface-history.js';
import assert from 'node:assert/strict';
export function surfaceHistoryCases355(){
 const critical=Math.asin(1/1.5),angles=[0,.4,1.1,1.45,critical-.001,critical+.001,critical-.00001,critical+.00001],cases=[];
 for(const angle of angles)for(const eta of [2/3,1,1.5])for(let code=0;code<8;code++){
  const theta=Math.fround(angle),ratio=Math.fround(eta),side=code&1?1:-1,front=!!(code&2),reflection=!!(code&4),view=[Math.sin(theta),0,side*Math.cos(theta)],expected=front===(side>0)&&reflection===(ratio*Math.sin(theta)>1);
  assert.equal(sameHistoryRefraction(view,[0,0,1],[0,0,1],ratio,front,reflection),expected);
  cases.push([theta,ratio,code,expected?1:0]);
 }return cases;
}
