const materialKeys=['frequency','bendFrequency','dampingRatio','edgePlasticYield','edgePlasticCreep','edgePlasticMax','edgePlasticFlow'];
export const deformableHotProperties=Object.freeze([...materialKeys,'iterations','friction','restitution','layer','mask']);
const gridKeys=['width','height','columns','rows'],ropeKeys=['particles','start','end'];
export function deformableColdProperties(p,rope){const value={...p,force:undefined,renderWidth:undefined,renderSides:undefined,endCaps:undefined};for(const key of deformableHotProperties)value[key]=undefined;for(const key of rope?gridKeys:ropeKeys)value[key]=undefined;return value;}
export function deformableMaterial(R,p){const material=R.SoftBodyMaterial.uniform(p.frequency,p.dampingRatio);material.bendSoftness={naturalFrequency:p.bendFrequency,dampingRatio:p.dampingRatio};material.edgePlasticYield=p.edgePlasticYield??0;material.edgePlasticCreep=p.edgePlasticCreep??1;material.edgePlasticMax=p.edgePlasticMax??1;material.edgePlasticFlow=R.SoftEdgePlasticFlow[({both:'Both',tension:'Tension',compression:'Compression'})[p.edgePlasticFlow??'both']];return material;}
export function updateDeformableProperties(item,p,space){
 const before=item.p;let changed=false;
 if(materialKeys.some(key=>before[key]!==p[key])){item.body.setMaterial(deformableMaterial(space.R,p));changed=true;}
 if(before.iterations!==p.iterations){item.body.setAdditionalPgsIterations(p.iterations);changed=true;}
 const friction=before.friction!==p.friction,restitution=before.restitution!==p.restitution,filter=before.layer!==p.layer||before.mask!==p.mask;
 if(friction||restitution||filter){for(const handle of item.colliders){const row=space.colliders.get(handle);if(!row)continue;if(friction)row.collider.setFriction(p.friction);if(restitution)row.collider.setRestitution(p.restitution);if(filter){row.p.layer=p.layer;row.p.mask=p.mask;}}changed=true;}
 if(changed){item.body.wakeUp();item.dirty=true;}return changed;
}
export const deformablePropertyContract={hot:deformableHotProperties,cold:'Mass/distribution, tension-only structural edges, dimensions/topology, pin authoring, thickness, self-collision, linear drag, gravity scale, sleep capability and surface presence still rebuild. Backend setters absent for some particle parameters; no force/damping approximation.',preserve:'Hot changes keep current particles, velocities, rest state, runtime pins/rigid attachments and generation; wake body to reevaluate constraints/contact. No material creation on unchanged sync.',filters:'Existing symmetric contact/query layer-mask hooks; refilter metadata updated on current owned colliders.',visual:'Width/sides/end caps do not rebuild; sleeping display frame republished. New object or captured component ID still rebuilds.'};
