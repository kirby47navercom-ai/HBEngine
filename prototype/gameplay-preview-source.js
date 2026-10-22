// AssetDocuments marks authored edits dirty and replaces data on history/load.
// Reuse only a clean saved document's verified same-object signature. Dirty or
// standalone documents retain the old full comparison on every sample.
export class GameplayPreviewSource{
 constructor(){this.version=0;}
 read(doc,target,graph,scene){
  let json;const clean=doc.dirty===false&&typeof doc.saved==='string'&&doc.data&&typeof doc.data==='object'&&typeof WeakRef==='function';
  if(clean&&this.clean?.data.deref()===doc.data&&this.clean.saved===doc.saved)json=this.clean.json;
  else{json=JSON.stringify(doc.data);this.clean=clean?{data:new WeakRef(doc.data),saved:doc.saved,json}:null;}
  const meta=JSON.stringify([target,graph,scene]);if(json!==this.json||meta!==this.meta){this.version=this.version===Number.MAX_SAFE_INTEGER?0:this.version+1;this.json=json;this.meta=meta;}return this.version;
 }
 clear(){this.clean=null;this.json=undefined;this.meta=undefined;}
}
