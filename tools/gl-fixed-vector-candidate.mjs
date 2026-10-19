// Private comparison candidate; no production hook. Preserve x/y/z evaluation
// order while avoiding ANGLE's switch-based dynamic vec3 component emulation.
export function fixedGLVectorLoops(source){
 let result=source,axisLoops=0,vertexLoops=0;
 for(const [token,index]of [['for(int axis=0;axis<3;axis++){','axis'],['for(int vertexIndex=0;vertexIndex<3;vertexIndex++){','vertexIndex']]){let cursor=0;while(true){const start=result.indexOf(token,cursor);if(start<0)break;const open=start+token.length-1;let depth=1,end=open+1;for(;end<result.length&&depth;end++){if(result[end]==='{')depth++;else if(result[end]==='}')depth--;}if(depth)throw Error('고정 벡터 반복문 구역을 확인하세요.');const body=result.slice(open+1,end-1),blocks=['x','y','z'].map((axis,n)=>body.replaceAll('['+index+']','.'+axis).replaceAll('float('+index+')',n+'.0'));if(blocks.some(s=>new RegExp('\\b'+index+'\\b').test(s)))throw Error('새 동적 인덱스는 명시적으로 검토해야 해요.');const replacement=blocks.map(s=>'{'+s+'}').join('');result=result.slice(0,start)+replacement+result.slice(end);cursor=start+replacement.length;if(index==='axis')axisLoops++;else vertexLoops++;}}
 return {source:result,axisLoops,vertexLoops,sourceBytesBefore:source.length,sourceBytesAfter:result.length};
}
