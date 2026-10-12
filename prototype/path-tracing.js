// One history per viewport; scene/pose/material/light or exact camera changes invalidate it.
export class ProgressivePathState {
 constructor(){this.key=null;this.samples=0;}
 prepare(packed,world,reset=false){const key=JSON.stringify([packed.currentVP,packed.eye,packed.size,packed.path.slice(0,3),packed.pathQuality,packed.pathEnvironment,packed.pathLens,packed.geometryLimits,packed.transport.slice(1),world.builds]);if(reset||key!==this.key){this.samples=0;this.key=key;}packed.path[3]=this.samples;return packed;}
 commit(packed,success=true){if(!success){this.reset();return;}this.samples=Math.min(packed.path[2],this.samples+packed.pathQuality[0]);}
 reset(){this.key=null;this.samples=0;}
}
export function configurePathLens(packed,camera,p){packed.pathLens=[p?.pathTracingDOF&&camera.userData?.cameraProperties?.physicalLens?Math.max(0,(camera.userData.cameraProperties.focalLength??50)*.001/(2*(camera.userData.cameraProperties.aperture??2.8))):0,p?.focusDistance??10,0,0];}
export function bindTransport(packed,world,scene){const transport=packed.path[0]>0||packed.transport[2]>0,p=world.prepare(scene,transport);packed.geometryInfo=[p.width,p.height,p.nodeCount,p.triangleOffset];packed.geometryLimits[2]=p.lightsOffset;packed.geometryLimits[3]=p.lightCount;packed.transport[0]=p.materialsOffset;packed.transport[1]=transport?1:0;packed.pathQuality[1]=p.emitterOffset;packed.pathQuality[2]=p.emitterCount;return p;}
