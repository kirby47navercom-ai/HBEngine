import * as THREE from 'three';
import {sceneWorldMatrix} from './scene-runtime.js';
import {componentDefaults,objectComponents} from './scene-components.js';

// Edit mode matches physics-world.js geometry; Play uses the solver's own
// vertices and joints. Preview resources never enter the saved world.
export class CollisionPreview {
  constructor(scene){
    this.group=new THREE.Group();this.group.userData.editorHelper=true;scene.add(this.group);this.items=new Map();
    this.runtime=new Map();this.debugMaterial=new THREE.LineBasicMaterial({vertexColors:true,depthTest:false,transparent:true,opacity:.85});
    this.solid=new THREE.LineBasicMaterial({color:0x6fbad1,depthTest:false,transparent:true,opacity:.8});
    this.trigger=new THREE.LineBasicMaterial({color:0xe8c576,depthTest:false,transparent:true,opacity:.9});
  }
  geometry(type,p,s){
    const is2D=type.endsWith('2D');let shape;
    if(type.includes('Sphere')||type.includes('Circle')){const r=p.radius*Math.max(...s.slice(0,is2D?2:3));if(is2D){const vertices=[];for(let i=0;i<40;i++)for(const n of [i,i+1])vertices.push(Math.cos(n*Math.PI/20)*r,Math.sin(n*Math.PI/20)*r,0);return new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));}shape=new THREE.SphereGeometry(r,20,12);}
    else if(type.startsWith('Capsule')){const r=p.radius*(is2D?s[0]:Math.max(s[0],s[2])),length=Math.max(0,p.height*s[1]-2*r);if(is2D){const vertices=[],points=[];for(let i=0;i<=20;i++){const angle=i*Math.PI/20;points.push([Math.cos(angle)*r,length/2+Math.sin(angle)*r]);}for(let i=0;i<=20;i++){const angle=Math.PI+i*Math.PI/20;points.push([Math.cos(angle)*r,-length/2+Math.sin(angle)*r]);}for(let i=0;i<points.length;i++)for(const point of [points[i],points[(i+1)%points.length]])vertices.push(...point,0);return new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));}shape=new THREE.CapsuleGeometry(r,length,8,16);}
    else shape=new THREE.BoxGeometry(p.extent[0]*s[0]*2,p.extent[1]*s[1]*2,is2D?.001:p.extent[2]*s[2]*2);
    const edges=new THREE.EdgesGeometry(shape,1);shape.dispose();return edges;
  }
  update(objects,selection,{all=false,visible=true,physicsDebug=null}={}){
    this.group.visible=visible;if(!visible)return;const active=new Set();
    if(all&&physicsDebug){for(const state of physicsDebug){let line=this.runtime.get(state.dimension);if(!line){line=new THREE.LineSegments(new THREE.BufferGeometry(),this.debugMaterial);line.renderOrder=1001;line.userData.editorHelper=true;this.runtime.set(state.dimension,line);this.group.add(line);}const colors=new Float32Array(state.colors.length/4*3);for(let i=0;i<colors.length/3;i++)colors.set(state.colors.slice(i*4,i*4+3),i*3);line.geometry.setAttribute('position',new THREE.BufferAttribute(state.vertices,3));line.geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));line.geometry.computeBoundingSphere();line.visible=true;}}
    else for(const line of this.runtime.values())line.visible=false;
    if(!all||!physicsDebug)for(const object of objects){if(object.visible===false||object.collisionEnabled===false||!all&&!selection.has(object.id))continue;
      const position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();sceneWorldMatrix(object,objects).decompose(position,rotation,scale);const s=scale.toArray().map(Math.abs);
      for(const component of [...objectComponents(object),...(object.tileColliders||[])]){
        if(!['BoxCollider','SphereCollider','CapsuleCollider','BoxCollider2D','CircleCollider2D','CapsuleCollider2D'].includes(component.type)||component.properties?.enabled===false||component.properties?.collisionMode==='none')continue;
        const p={...componentDefaults(component.type),...component.properties},key=object.id+':'+component.id,signature=JSON.stringify([component.type,p,s]),is2D=component.type.endsWith('2D');active.add(key);let line=this.items.get(key);
        if(!line){line=new THREE.LineSegments(this.geometry(component.type,p,s),this.solid);line.userData.editorHelper=true;line.renderOrder=1001;this.items.set(key,line);this.group.add(line);}else if(line.userData.signature!==signature){line.geometry.dispose();line.geometry=this.geometry(component.type,p,s);}line.userData.signature=signature;
        if(is2D)line.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1),new THREE.Euler().setFromQuaternion(rotation).z);else line.quaternion.copy(rotation);
        line.position.copy(position).add(new THREE.Vector3(...p.center).multiply(scale).applyQuaternion(line.quaternion));line.material=p.trigger||p.collisionMode==='query'?this.trigger:this.solid;
      }
    }
    for(const [key,line] of this.items)if(!active.has(key)){line.geometry.dispose();line.removeFromParent();this.items.delete(key);}
  }
  dispose(){this.group.removeFromParent();for(const line of [...this.items.values(),...this.runtime.values()])line.geometry.dispose();this.solid.dispose();this.trigger.dispose();this.debugMaterial.dispose();this.items.clear();this.runtime.clear();}
}
