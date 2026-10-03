import * as THREE from 'three';
import {colliderBounds,sceneWorldMatrix} from './scene-runtime.js';
import {objectComponents} from './scene-components.js';

// Display the bounds the current physics solver actually uses, including its
// capsule AABB approximation. Preview resources never enter the saved world.
export class CollisionPreview {
  constructor(scene){
    this.group=new THREE.Group();this.group.userData.editorHelper=true;scene.add(this.group);this.items=new Map();
    const box=new THREE.BoxGeometry(1,1,1);this.geometry=new THREE.EdgesGeometry(box);box.dispose();
    this.solid=new THREE.LineBasicMaterial({color:0x6fbad1,depthTest:false,transparent:true,opacity:.8});
    this.trigger=new THREE.LineBasicMaterial({color:0xe8c576,depthTest:false,transparent:true,opacity:.9});
  }
  update(objects,selection,{all=false,visible=true}={}){
    this.group.visible=visible;if(!visible)return;const active=new Set(),cache=new Map();
    for(const object of objects){if(object.visible===false||object.collisionEnabled===false||!all&&!selection.has(object.id))continue;
      for(const component of [...objectComponents(object),...(object.tileColliders||[])]){
        if(!['BoxCollider','SphereCollider','CapsuleCollider','BoxCollider2D','CircleCollider2D','CapsuleCollider2D'].includes(component.type)||component.properties?.enabled===false)continue;
        const matrix=sceneWorldMatrix(object,objects,cache),bounds=colliderBounds(object,component,matrix),key=object.id+':'+component.id;active.add(key);let line=this.items.get(key);
        if(!line){line=new THREE.LineSegments(this.geometry,this.solid);line.userData.editorHelper=true;line.renderOrder=1001;this.items.set(key,line);this.group.add(line);}
        line.position.fromArray(bounds.center);line.scale.fromArray(bounds.extent.map((v,i)=>bounds.is2D&&i===2?.01:Math.max(.001,v*2)));if(bounds.is2D)line.position.z=matrix.elements[14];line.material=bounds.p.trigger?this.trigger:this.solid;
      }
    }
    for(const [key,line] of this.items)if(!active.has(key)){line.removeFromParent();this.items.delete(key);}
  }
  dispose(){this.group.removeFromParent();this.geometry.dispose();this.solid.dispose();this.trigger.dispose();this.items.clear();}
}
