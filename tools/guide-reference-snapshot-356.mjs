import {execFileSync} from 'node:child_process';import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
// Freeze the interacting shader/pass modules together. Mixing an old program
// generator with a new denoiser can otherwise call a helper the reference lacks.
export async function guideReferenceSnapshot356(revision){
 assert.match(revision,/^[a-f0-9]{7,40}$/);const source=file=>execFileSync('git',['show',revision+':prototype/'+file],{encoding:'utf8'}),sha=text=>createHash('sha256').update(text).digest('hex'),files=['ray-previous-context.js','ray-material-shader.js','path-denoise.js','path-guide-specialization.js','screen-effects.js','screen-effects-gl.js'],sources=Object.fromEntries(files.map(file=>[file,source(file)])),unchanged={};
 for(const file of ['path-curved-guide.js','path-tangent-guide.js','path-previous-camera.js','ray-uv-footprint.js','shared-ray-record-gl.js','path-guide-affine.js','geometry-gi-shader.js','path-tracing-shader.js','path-guide-shader.js']){const current=await fs.readFile('prototype/'+file,'utf8'),old=source(file);assert.equal(current,old,'reference shared shader dependency changed: '+file);unchanged[file]=sha(current);}
 return {revision,files,sources,hashes:Object.fromEntries(files.map(file=>[file,sha(sources[file])])),unchanged};
}
export function installGuideReference356(reference){return `(async()=>{
 const source=${JSON.stringify(reference.sources)},files=${JSON.stringify(reference.files)},urls=new Map(),modules=new Map();
 for(const file of files){const text=source[file].replace(/from ['"](\\.\\/[^'"]+)['"]/g,(_,specifier)=>'from '+JSON.stringify(urls.get(specifier.slice(2))||location.origin+'/prototype/'+specifier.slice(2))),url='data:text/javascript;charset=utf-8,'+encodeURIComponent(text);modules.set(file,await import(url));urls.set(file,url);}
 const current=await import('/prototype/ray-material-shader.js');if(current.rayMaterialGLSL!==modules.get('ray-material-shader.js').rayMaterialGLSL)throw Error('reference shared base material API changed');window.reference296={oldRay:modules.get('ray-material-shader.js'),oldGuide:modules.get('path-guide-specialization.js'),oldPass:modules.get('screen-effects-gl.js')};window.proof296={done:false,rows:[],error:null};return true;
})()`;}
