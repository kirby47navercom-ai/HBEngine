import path from 'node:path';import {ownedBrowserCase} from './owned-browser-case.mjs';
const {work}=await ownedBrowserCase({module:'prototype/tests/particle-interactions-case.js',entry:'runParticleInteractions',prefix:'particle-webgpu',webgpu:true});
console.log(JSON.stringify({passed:true,report:path.relative(process.cwd(),path.join(work,'acceptance.json'))}));
