export const ropeShape=p=>p.topology==='rope'||p.topology===undefined&&p.particles!==undefined;
export function clothPins(p){
 if(ropeShape(p))p={...p,columns:p.particles,rows:1};const count=p.columns*p.rows,pins=new Set();
 if(p.pinMode==='topEdge')for(let u=0;u<p.columns;u++)pins.add(u*p.rows);
 if(p.pinMode==='topCorners'){pins.add(0);pins.add((p.columns-1)*p.rows);}
 if(p.pinMode==='start'||p.pinMode==='both')pins.add(0);
 if(p.pinMode==='end'||p.pinMode==='both')pins.add(count-1);
 if(p.pinMode==='all')for(let i=0;i<count;i++)pins.add(i);
 if(!Array.isArray(p.pinOverrides)||new Set(p.pinOverrides.map(v=>v?.index)).size!==p.pinOverrides.length)throw Error('고정 입자 중복·배열을 확인하세요.');
 for(const row of p.pinOverrides){if(!row||Object.keys(row).some(k=>!['index','pinned'].includes(k))||!Number.isInteger(row.index)||row.index<0||row.index>=count||typeof row.pinned!=='boolean')throw Error('천 고정 입자 범위를 확인하세요.');if(row.pinned)pins.add(row.index);else pins.delete(row.index);}
 return pins;
}
export function validCloth(p){try{clothPins(p);return Number.isSafeInteger(p.columns*p.rows)&&(!ropeShape(p)||p.start.every(Number.isFinite)&&p.end.every(Number.isFinite)&&Math.hypot(...p.end.map((v,i)=>v-p.start[i]))>.0001);}catch{return false;}}
export function clothLocalPoint(p,index,out){return out.set(-p.width/2+Math.floor(index/p.rows)*p.width/(p.columns-1),p.height/2-(index%p.rows)*p.height/(p.rows-1),0);}

export const rope3DContract={recipe:'rope3d',component:'Cloth',field:'topology',value:'rope',properties:['particles','start','end','pinMode','pinOverrides','renderWidth','renderSides'],physics:'Existing Rapier 3D soft-body world, XYZ chain/force/impulse, inherited pins and rigid attachment, collision/masks/sleep. No extra solver worker/world.',rendering:'Fixed circular tube buffers and seam vertices; shared clothFrame/version/generation, no per-frame geometry rebuild.',operations:['physicsClothPin','physicsClothImpulse','physicsClothAttach','physicsClothReset','physicsClothCount','physicsClothParticle'],inspection:'runtime.cloth and gameplayDebug.cloth; bounded page',sdk:'hb::Physics Cloth particle methods; absent first physics count/vehicle snapshots return zero consistently with JS.',limits:['open tube ends','arbitrary mesh/skinned cloth/tether/continuous pin weights','tear/cut/volumetric/GPU solver','new backend pixels and physical devices unverified']};
