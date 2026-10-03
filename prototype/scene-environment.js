import * as THREE from 'three';
export const skyPresets={
  day:{top:0x548baf,horizon:0xc2d4cc,ground:0x536f70,cloud:0xe4eee8,ambient:1.1,exposure:.83,light:3.2,elevation:50},
  overcast:{top:0x74858e,horizon:0xb9c8c6,ground:0x52666b,cloud:0xb8c9c8,ambient:1.25,exposure:.88,light:1.2,elevation:40},
  sunset:{top:0x596487,horizon:0xe9b18b,ground:0x635858,cloud:0xeac5ae,ambient:.65,exposure:.9,light:3,elevation:15},
  night:{top:0x111e37,horizon:0x415672,ground:0x293849,cloud:0x64788d,ambient:.3,exposure:1,light:.45,elevation:25}
};
export function createSky(scene){
  let skyDome,cloudGroup;
  const skyMaterial=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{topColor:{value:new THREE.Color()},horizonColor:{value:new THREE.Color()},sunDirection:{value:new THREE.Vector3()},sunColor:{value:new THREE.Color(0xffe5bd)}},
    vertexShader:'varying vec3 skyDirection; void main(){ skyDirection=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:'varying vec3 skyDirection; uniform vec3 topColor; uniform vec3 horizonColor; uniform vec3 sunDirection; uniform vec3 sunColor; void main(){ vec3 d=normalize(skyDirection); float h=smoothstep(-0.12,0.85,d.y); vec3 c=mix(horizonColor,topColor,h); c+=sunColor*pow(max(dot(d,normalize(sunDirection)),0.0),350.0)*0.55; gl_FragColor=vec4(c,1.0); }'});
  skyDome=new THREE.Mesh(new THREE.SphereGeometry(80,32,16),skyMaterial);skyDome.renderOrder=-1000;scene.add(skyDome);
  cloudGroup=new THREE.Group();const cloudMaterial=new THREE.MeshBasicMaterial({color:0xe4eee8,transparent:true,opacity:.60,depthWrite:false});
  for(let i=0;i<10;i++){const cluster=new THREE.Group(),angle=i*Math.PI/5;cluster.position.set(Math.cos(angle)*16,4+Math.sin(i*2)*1.2,Math.sin(angle)*16);
    for(let j=0;j<5;j++){const puff=new THREE.Mesh(new THREE.SphereGeometry(.65+((i+j)%3)*.2,16,10),cloudMaterial);puff.position.set((j-2)*.8,Math.sin(j*2)*.23,Math.cos(j)*.3);puff.scale.set(1.3,.55,1);cluster.add(puff);}cluster.rotation.y=-angle;cloudGroup.add(cluster);
  }scene.add(cloudGroup);
return {skyDome,cloudGroup};
}
export function applySceneEnvironment({scene,environment,surface,runtimeSettings,ambientLight,mainRenderer,groundFloor,skyDome,cloudGroup,sun,objects}){
  const p=skyPresets[environment.preset];
  if(scene){scene.background.set(environment.skyEnabled?p.ground:0x272f34);scene.fog=environment.fogEnabled?new THREE.Fog(p.ground,10,90-environment.fogAmount*66):null;scene.environmentIntensity=environment.skyEnabled?.6:.12;ambientLight.intensity=environment.skyEnabled?p.ambient:.25;ambientLight.color.set(p.horizon);mainRenderer.toneMappingExposure=p.exposure;groundFloor.material.color.set(p.ground);groundFloor.visible=runtimeSettings.dimension!=='2d';
    skyDome.visible=environment.skyEnabled;skyDome.material.uniforms.topColor.value.set(p.top);skyDome.material.uniforms.horizonColor.value.set(p.horizon);
    const az=THREE.MathUtils.degToRad(environment.sunAzimuth),el=THREE.MathUtils.degToRad(environment.sunElevation),direction=new THREE.Vector3(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el));
    skyDome.material.uniforms.sunDirection.value.copy(environment.sunEnabled?direction:new THREE.Vector3(0,-1,0));
    if(sun){sun.castShadow=environment.shadowEnabled!==false;mainRenderer.shadowMap.needsUpdate=true;sun.intensity=environment.sunEnabled?surface.light:0;sun.color.set(environment.preset==='night'?0xa5b9e1:environment.preset==='sunset'?0xffbb80:0xffeed7);sun.parent.position.copy(direction.multiplyScalar(10));const o=objects.find(o=>o.id==='sun-light');if(o)o.position=sun.parent.position.toArray().map(n=>+n.toFixed(3));}
    cloudGroup.visible=environment.cloudsEnabled;cloudGroup.children.forEach((c,i)=>{c.visible=i<Math.ceil(environment.cloudDensity*10);c.children[0].material.color.set(p.cloud);});
  }
}
