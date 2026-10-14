import assert from 'node:assert/strict';import * as T from 'three/tsl';
import {gpuFn} from '../prototype/gpu-function-scope.js';
const value=T.uniform(2),fn=gpuFn(([x])=>x.mul(value)).setLayout({name:'ScopeProbe',type:'float',inputs:[{name:'x',type:'float'}]}),first={},second={};
const a=fn(T.float(1)).setup(first),b=fn(T.float(2)).setup(first),c=fn(T.float(1)).setup(second);assert.equal(a.shaderNode,b.shaderNode);assert.notEqual(a.shaderNode,c.shaderNode);assert.equal(a.shaderNode.layout.name,'ScopeProbe');assert.equal(c.shaderNode.layout.inputs.length,1);assert.equal(typeof fn(T.float(1)).cache,'function');
const ordinary=gpuFn(([x])=>x.mul(2))(T.float(1));assert.ok(ordinary.isNode);assert.equal(ordinary.shaderNode.layout,null);console.log(JSON.stringify({passed:true,sameBuilderSharesFunction:true,newBuilderHasFreshUniformBindings:true,nodeCacheMethodPreserved:true,ordinaryFunctionsUnchanged:true}));
