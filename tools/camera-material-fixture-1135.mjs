import {createAsset} from '../prototype/asset-documents.js';
import {makeMaterialNode} from '../prototype/material-runtime.js';

export function cameraMaterial1135(){
 const asset=createAsset('material','ViewDirection'),surface=makeMaterialNode('surface',0,0),view=makeMaterialNode('viewDirection',0,0),scale=makeMaterialNode('multiply',0,0),bias=makeMaterialNode('add',0,0);
 scale.inputValues={b:.5};bias.inputValues={b:[.5,.5,.5]};asset.surface.color='#000000';
 asset.graph={nodes:[surface,view,scale,bias],edges:[[view,'value',scale,'a'],[scale,'value',bias,'a'],[bias,'value',surface,'emissive']].map(([a,ap,b,bp])=>({from:{node:a.id,pin:ap},to:{node:b.id,pin:bp}}))};return asset;
}
export function fresnelMaterial1135(){
 const asset=createAsset('material','Fresnel'),surface=makeMaterialNode('surface',0,0),fresnel=makeMaterialNode('fresnel',0,0);asset.surface.color='#000000';
 asset.graph={nodes:[surface,fresnel],edges:[{from:{node:fresnel.id,pin:'value'},to:{node:surface.id,pin:'emissive'}}]};return asset;
}
export function normalMaterial1135(value){
 const asset=createAsset('material','Normal'),surface=makeMaterialNode('surface',0,0),normal=makeMaterialNode('vector3',0,0),large=value.some(v=>Math.abs(v)>10000);normal.value=large?value.map(v=>v/1e28):value;
 const nodes=[surface,normal],edges=[];let output=normal;
 // Authoring literals stay within the existing limit; graph arithmetic may
 // still produce large finite intermediates that must normalize safely.
 if(large)for(let i=0;i<7;i++){const multiply=makeMaterialNode('multiply',0,0);multiply.inputValues={b:10000};nodes.push(multiply);edges.push({from:{node:output.id,pin:'value'},to:{node:multiply.id,pin:'a'}});output=multiply;}
 edges.push({from:{node:output.id,pin:'value'},to:{node:surface.id,pin:'normal'}});asset.graph={nodes,edges};return asset;
}
