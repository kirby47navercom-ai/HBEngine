import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pruneTestArtifacts} from './test-artifacts.mjs';
const root=path.resolve(import.meta.dirname,'..');
await assert.rejects(pruneTestArtifacts(root));await assert.rejects(pruneTestArtifacts(path.join(root,'Projects')));
const work=await fs.mkdtemp(path.join(root,'native/build/artifact-storage-')),fixture=path.join(work,'Fixture'),out=path.join(fixture,'Builds/one');await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(fixture,'Fixture.hbproject'),'{}');await fs.writeFile(path.join(fixture,'source.cpp'),'retained source');await fs.writeFile(path.join(work,'acceptance.json'),'retained evidence');const manifest='{"files":[],"version":1}';await fs.writeFile(path.join(out,'game.hbpack.json'),manifest);await fs.writeFile(path.join(out,'runtime.bin'),Buffer.alloc(8192));
const result=await pruneTestArtifacts(work);assert.equal(result.deleted,1);assert.equal(await fs.readFile(path.join(work,'acceptance.json'),'utf8'),'retained evidence');assert.equal(await fs.readFile(path.join(fixture,'source.cpp'),'utf8'),'retained source');await assert.rejects(fs.access(out));const receipt=JSON.parse(await fs.readFile(path.join(result.receipt,'plan.json'),'utf8'));assert.equal(receipt.manifests.length,1);assert.equal(await fs.readFile(path.join(result.receipt,receipt.manifests[0].retained),'utf8'),manifest);console.log(JSON.stringify({passed:true,outsidePathsRejected:true,sourceAndEvidenceRetained:true,buildRemoved:true,manifestRetained:true}));
