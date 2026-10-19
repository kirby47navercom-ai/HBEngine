import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {pruneShaderFunctions} from './shader-function-reachability-981.mjs';
const source=`#version 300 es
precision highp float;
struct Value {float member;};
float root(float x);
float abandoned(float x);
#define CALLBACK alias
float alias(float x){return x+1.;}
float unused(float x){return x-1.;}
highp vec3 unusedPrecision(vec3 x){return x;}
float overloaded(float x){return x;}
vec3 overloaded(vec3 x){return x;}
float root(float x){return overloaded(x)+CALLBACK(x);}
#if KEEP
float conditional(float x){return root(x);}
#else
float conditional(float x){return root(x)+1.;}
#endif
float localDirective(float x){
#if KEEP
return x;
#else
return x+2.;
#endif
}
float macroOwner(float x){
#define SHARED_ALIAS root
return x;
}
float abandoned(float x){return unused(x);}
void main(){float x=conditional(1.);}
// abandoned and unusedPrecision are not calls
`;
const p=pruneShaderFunctions(source);assert(!p.fallback);assert.deepEqual(new Set(p.removed),new Set(['unused','unusedPrecision','localDirective','abandoned']));for(const name of ['alias','root','conditional','overloaded','macroOwner'])assert(!p.removed.includes(name));assert(!p.source.includes('highp vec3 unusedPrecision'));assert(p.source.includes('#define SHARED_ALIAS root'));assert.equal(p.source.split('\n').length,source.split('\n').length);
for(const s of ['float f(){return 1.;}', 'float f(){return 1.;', 'void main(){ } }'])assert.equal(pruneShaderFunctions(s).source,s);
const global='float first(){return 1.;}\nconst float value=first();\nvoid main(){}';assert.equal(pruneShaderFunctions(global).removed.length,0);
const result={passed:true,removed:p.removed,overloadsPreserved:true,globalAndMacroReferencesPreserved:true,precisionRemovedWithFunction:true,conditionalDefinitionsPreserved:true,localDirectiveBalanced:true,macroSideEffectOwnerRetained:true,unknownEntryAndMalformedFailOpen:true,lineCountPreserved:true,scope:'Generated GLSL function/name reachability contract only; no GPU/performance claim. Conservative overload/global/macro references and unsafe syntax fallback.'};await fs.mkdir('native/build',{recursive:true});await fs.writeFile('native/build/shader-reachability-981.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
