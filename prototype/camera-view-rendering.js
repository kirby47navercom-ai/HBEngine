import {Vector2,Vector4,Color} from 'three';
import {cameraScreenRect,pixelPerfectViewport} from './game-camera.js';
// One scene/device and shared assets. Only post-process histories are camera-owned.
export class CameraViewRendering {
  constructor(factory){this.factory=factory;this.views=new Map();}
  render(renderer,scene,camera,objects,drawDefault,prepare,beforeView){
    const views=camera.userData.gameViews;
    if(!views){this.releaseRenderer(renderer);return drawDefault();}
    let states=this.views.get(renderer);if(!states)this.views.set(renderer,states=new Map());
    const ids=new Set(views.map(v=>v.id));for(const [id,view] of states)if(!ids.has(id)){view.dispose();states.delete(id);}
    const ratio=renderer.getPixelRatio(),size=renderer.getDrawingBufferSize(new Vector2()).divideScalar(ratio),viewport=renderer.getViewport(new Vector4()),scissor=renderer.getScissor(new Vector4()),test=renderer.getScissorTest(),color=renderer.getClearColor(new Color()),alpha=renderer.getClearAlpha();
    const render=()=>{renderer.setScissorTest(false);renderer.setClearColor(0,1);renderer.clear();renderer.setClearColor(color,alpha);for(let index=0;index<views.length;index++){
      const view=views[index],rect=cameraScreenRect(view.region,size.x,size.y,ratio);if(!states.has(view.id))states.set(view.id,this.factory(renderer));
      let area=rect;view.camera.userData.gameViewPixelRatio=ratio;const p=view.camera.userData.cameraProperties;if(p?.pixelPerfect&&view.camera.isOrthographicCamera){renderer.setViewport(rect.x,rect.y,rect.width,rect.height);renderer.setScissor(rect.x,rect.y,rect.width,rect.height);renderer.setScissorTest(true);renderer.setClearColor(0,1);renderer.clear();renderer.setClearColor(color,alpha);const fit=pixelPerfectViewport(rect.width,rect.height,p,ratio);area={x:rect.x+fit.x,y:rect.y+fit.y,width:fit.width,height:fit.height};view.camera.userData.pixelViewport={...fit,x:area.x,y:area.y};}
      renderer.hbSetCameraView?.(view.id,index,views.length,rect);
      renderer.setViewport(area.x,area.y,area.width,area.height);renderer.setScissor(area.x,area.y,area.width,area.height);renderer.setScissorTest(true);
      const drawView=()=>{beforeView?.(view.camera);prepare(view.camera);states.get(view.id).render(renderer,scene,view.camera,objects);};if(renderer.hbWithCameraView)renderer.hbWithCameraView(view.id,drawView);else drawView();
    }};
    try{return renderer.hbCaptureViews?renderer.hbCaptureViews(views.map(v=>v.id),render):render();}
    finally{renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(test);renderer.setClearColor(color,alpha);}
  }
  releaseRenderer(renderer){const states=this.views.get(renderer);if(states){for(const view of states.values())view.dispose();this.views.delete(renderer);}renderer.hbPruneCameraViews?.([]);}
  dispose(){for(const renderer of [...this.views.keys()])this.releaseRenderer(renderer);}
}
