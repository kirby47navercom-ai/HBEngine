import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {ProjectService} from './project-service.mjs';
import {AssetDocuments,createAsset,validAsset} from '../prototype/asset-documents.js';
import {BlueprintWorkspace} from '../prototype/blueprint-workspace.js';
import {documentRevision,patchAsset} from '../prototype/automation.js';
import {runInNewContext} from 'node:vm';
import {makeNode} from '../prototype/blueprint-model.js';
import {parseNativeHeader,nativeSourceReference} from '../prototype/native-model.js';

const root=path.resolve(await fs.mkdtemp('native/build/asset-transaction-')),project=await new ProjectService(root).init(),cases=[];
const read=name=>fs.readFile(path.join(root,name),'utf8'),exists=name=>fs.stat(path.join(root,name)).then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e;});
const h='Source/BatchActor.h',c='Source/BatchActor.cpp',p='Assets/BP_Parent.hbblueprint.json',ch='Assets/BP_Child.hbblueprint.json';
const header='#include <HBEngine/Game.hpp>\nHB_CLASS(Blueprintable) class BatchActor : public hb::Actor {public: HB_FUNCTION(BlueprintCallable) void Move(float value);};',source='#include "BatchActor.h"\nvoid BatchActor::Move(float value){}\n';
const parent=createAsset('blueprint','BP_Parent');parent.settings.parentClass='BatchActor';parent.native=nativeSourceReference({...parseNativeHeader(header),header,source,headerPath:h,sourcePath:c});parent.nodes.push({...makeNode('nativeCall'),nativeId:'BatchActor.Move'});
const child=createAsset('blueprint','BP_Child',p),initial=[{path:h,text:header,expected:null},{path:c,text:source,expected:null},{path:p,text:JSON.stringify(parent),expected:null},{path:ch,text:JSON.stringify(child),expected:null}];
const expected=(name,text)=>JSON.stringify(name.endsWith('.hbblueprint.json')?JSON.parse(text):text);
assert.equal((await project.checkedBatch(initial,()=>{},{dryRun:true})).valid,true);assert.equal(await exists(h),false);assert.equal(await exists('Saved/Transactions'),false);cases.push('dry-run without files');
const made=await project.checkedBatch(initial);assert.equal(made.paths.length,4);const ids=Object.fromEntries(made.paths.map(n=>[n,project.index[n].id]));await project.validateBlueprint(ch,child);cases.push('joint C++/parent/child creation');

const newHeader=header.replace('Move','Jump'),newSource=source.replace('Move','Jump'),newParent=structuredClone(parent);newParent.nodes.at(-1).nativeId='BatchActor.Jump';
await assert.rejects(project.checkedBatch([{path:h,text:newHeader,expected:expected(h,header)}]),/검증|C\+\+|노드|맞지|유효/);assert.equal(await read(h),header);cases.push('unmodified dependent BP validated');
const edit=await project.checkedBatch([{path:h,text:newHeader,expected:expected(h,header)},{path:c,text:newSource,expected:expected(c,source)},{path:p,text:JSON.stringify(newParent),expected:JSON.stringify(parent)}]);
assert.equal(await read(h),newHeader);await project.validateBlueprint(ch,child);cases.push('joint C++ function/BP change');
const undo=await project.undoBatch(edit.transaction);assert.equal(await read(h),header);const redo=await project.undoBatch(undo.transaction);assert.equal(await read(h),newHeader);cases.push('whole-group undo/redo');
await fs.writeFile(path.join(root,c),newSource+'// outside\n');await assert.rejects(project.undoBatch(redo.transaction),e=>e.code==='REVISION_CONFLICT');assert.equal(await read(h),newHeader);assert.equal(await read(c),newSource+'// outside\n');await fs.writeFile(path.join(root,c),newSource);cases.push('external conflict changes no other file');

let guards=0;await assert.rejects(project.checkedBatch([{path:h,text:newHeader+'\n// pending',expected:expected(h,newHeader)},{path:c,text:newSource+'\n// pending',expected:expected(c,newSource)}],()=>{if(++guards===4)throw Error('injected project switch');}),/injected/);assert.equal(await read(h),newHeader);assert.equal(await read(c),newSource);cases.push('failure after first write rolls whole group back');
await assert.rejects(project.checkedBatch([{path:h,text:header,expected:expected(h,newHeader)},{path:'../outside.cpp',text:'bad',expected:null}]),/파일|경로/);assert.equal(await read(h),newHeader);
await assert.rejects(project.checkedBatch([{path:h,text:newHeader,expected:expected(h,newHeader)},{path:h.toUpperCase(),text:newHeader,expected:expected(h,newHeader)}]),/중복|파일|경로/);cases.push('paths and aliases rejected before writing');

const base=await project.undoBatch(redo.transaction);assert.equal(await read(h),header);const removed=await project.undoBatch(made.transaction);assert.equal(await exists(h),false);await project.undoBatch(removed.transaction);assert.equal(await read(h),header);for(const n of made.paths)assert.equal(project.index[n].id,ids[n]);cases.push('created group removal/restore preserves asset IDs');

const crash=await project.checkedBatch([{path:c,text:source+'// crash',expected:expected(c,source)},{path:h,text:header+'\n// crash',expected:expected(h,header)}]);
const journalPath=path.join(root,crash.backup),journal=JSON.parse(await fs.readFile(journalPath,'utf8'));journal.state='prepared';await fs.writeFile(journalPath,JSON.stringify(journal));await fs.writeFile(path.join(root,h),header);
await new ProjectService(root).init();assert.equal(await read(c),source);assert.equal(await read(h),header);assert.equal(JSON.parse(await fs.readFile(journalPath,'utf8')).state,'rolledBack');cases.push('restart recovers partially applied prepared journal');

const docs=new AssetDocuments(),doc=docs.open('Source/note.cpp','text','before');let finish;const wait=new Promise(r=>finish=r),saving=docs.save(doc,async()=>wait);doc.data='typed while saving';finish();await saving;assert.equal(doc.data,'typed while saving');assert.equal(doc.saved,JSON.stringify('before'));assert.equal(doc.dirty,true);cases.push('saving preserves newer in-memory edits');

// Execute the production editor functions with real files and the real resolver.
const app=await fs.readFile(new URL('../prototype/app.js',import.meta.url),'utf8'),start=app.indexOf('let authoringBatchBusy=false;'),end=app.indexOf('\nfunction automationGraph(',start);assert.ok(start>=0&&end>start);
const editorDocs=new AssetDocuments();editorDocs.open(p,'blueprint',parent);editorDocs.open(ch,'blueprint',child);editorDocs.select(p);
const context={assetDocs:editorDocs,BlueprintWorkspace,documentRevision,patchAsset,validAsset,clone:structuredClone,undoLimit:40,running:false,startingPlay:false,stoppingPlay:false,diskModified:new Map(),projectBrowsers:new Map(),captureDocument(){},automationEditable(){},installDocumentData(){},renderDocumentTabs(){},queueRecovery(){},refreshAssetIndex(){},refreshMaterialAssets(){},materialAssetKinds:['material','materialfunction','materiallayer','materialblend','materialinstance'],removeDocumentViews(path){editorDocs.close(path,true);},log(){},fileUrl:path=>'/file?path='+encodeURIComponent(path)};
context.blueprintWorkspace=new BlueprintWorkspace(async name=>JSON.parse(await read(name)),name=>editorDocs.items.get(name)?.data,read);context.history=editorDocs.current.history;context.future=editorDocs.current.future;
let afterCommit;context.editorRequest=async(url,options={})=>{let result;
  if(url.startsWith('/api/asset/document?'))result=await project.inspectDocument(new URL(url,'http://test').searchParams.get('path'));
  else if(url.startsWith('/file?')){const text=await read(new URL(url,'http://test').searchParams.get('path'));return {text:async()=>text,json:async()=>JSON.parse(text)};}
  else if(url==='/api/asset/batch'){const body=JSON.parse(options.body);result=await project.checkedBatch(body.entries,()=>{},{dryRun:body.dryRun??false});if(!body.dryRun)afterCommit?.();}
  else if(url==='/api/asset/batch/undo')result=await project.undoBatch(JSON.parse(options.body).transaction);
  else throw Error(url);return {json:async()=>result};
};
const editor=runInNewContext(app.slice(start,end)+'\n({automationFile,applyFileBatch,replayFileBatch});',context);
const info=await Promise.all([h,c,p].map(name=>editor.automationFile(name))),entries=info.map(file=>({path:file.path,expectedRevision:file.revision,expectedEditorRevision:file.editorRevision,data:file.path===h?newHeader:file.path===c?newSource:newParent}));
if(process.platform==='win32'){assert.equal((await editor.automationFile('Assets/BP_PARENT.hbblueprint.json')).editorRevision,info[2].editorRevision);await assert.rejects(project.checkedBatch([{path:h,text:header,expected:expected(h,header)},{path:'Source/BATCHACTOR.h',text:header,expected:expected(h,header)}]),/중복/);cases.push('Windows case aliases keep the same open-document revision and cannot duplicate a file');}
assert.equal((await editor.applyFileBatch({entries,dryRun:true})).valid,true);assert.equal(await read(h),header);assert.equal(editorDocs.current.history.length,0);cases.push('editor whole-group dry-run leaves files/history unchanged');
const applied=await editor.applyFileBatch({entries});assert.equal(await read(h),newHeader);assert.equal(editorDocs.current.data.nodes.at(-1).nativeId,'BatchActor.Jump');assert.equal(editorDocs.current.dirty,false);assert.equal(editorDocs.current.history.at(-1).batch,applied.transaction);
await editor.replayFileBatch(applied.transaction,false,true);assert.equal(await read(h),header);assert.equal(editorDocs.current.data.nodes.at(-1).nativeId,'BatchActor.Move');assert.equal(editorDocs.current.future.at(-1).batch,applied.transaction);
await editor.replayFileBatch(applied.transaction,true,true);assert.equal(await read(h),newHeader);assert.equal(editorDocs.current.data.nodes.at(-1).nativeId,'BatchActor.Jump');cases.push('real editor group save, history Undo and Redo include C++ source and BP');
await assert.rejects(editor.applyFileBatch({entries}),e=>e.code==='REVISION_CONFLICT');assert.equal(await read(h),newHeader);cases.push('stale editor file revision changes no file');
await editor.replayFileBatch(applied.transaction);const next=await Promise.all([h,c,p].map(name=>editor.automationFile(name))),again=next.map(file=>({path:file.path,expectedRevision:file.revision,expectedEditorRevision:file.editorRevision,data:file.path===h?newHeader:file.path===c?newSource:newParent}));
afterCommit=()=>{editorDocs.current.data.name='TypedDuringSave';editorDocs.current.dirty=true;};await assert.rejects(editor.applyFileBatch({entries:again}),e=>e.code==='REVISION_CONFLICT');assert.equal(editorDocs.current.data.name,'TypedDuringSave');assert.equal(editorDocs.current.dirty,true);assert.equal(await read(h),header);assert.equal(JSON.parse(await read(p)).name,parent.name);assert.equal(editorDocs.current.data.nodes.at(-1).nativeId,'BatchActor.Move');cases.push('human edit during group save retained; entire disk group rolled back');
const conflicting=await project.checkedBatch([{path:c,text:source+'// crash two',expected:expected(c,source)},{path:h,text:header+'\n// crash two',expected:expected(h,header)}]),conflictingPath=path.join(root,conflicting.backup),pending=JSON.parse(await fs.readFile(conflictingPath,'utf8'));pending.state='prepared';await fs.writeFile(conflictingPath,JSON.stringify(pending));await fs.writeFile(path.join(root,c),source+'// third party');const headerBeforeRecovery=await read(h);await assert.rejects(new ProjectService(root).init(),e=>e.code==='TRANSACTION_CONFLICT');assert.equal(await read(h),headerBeforeRecovery);assert.equal(await read(c),source+'// third party');assert.equal(JSON.parse(await fs.readFile(conflictingPath,'utf8')).state,'prepared');cases.push('restart conflict preserves external content and every other file, retaining the recovery journal');
await fs.writeFile(path.join(root,'acceptance.json'),JSON.stringify({passed:true,cases},null,2));console.log(JSON.stringify({root,passed:true,cases}));
