import {loadTextureImage} from './texture-image-load.js';
import {diskMipEligible} from './texture-disk-mips.js';
import {editDiskMipSettings,textureDiskPreviewKey} from './texture-import-ui.js';
export function bindTextureDiskRequestOwner(element,viewer){const dispose=viewer.dispose;viewer.dispose=function(...args){if(element.hbTextureViewer===viewer){element.hbDiskMipRequest?.abort();element.hbDiskMipRequest=null;}return dispose.apply(this,args);};}
export async function enableLayeredDiskMips(element,doc,hooks,edit){
 element.hbDiskMipRequest?.abort();const controller=new AbortController();element.hbDiskMipRequest=controller;const data=doc.data,key=textureDiskPreviewKey(data),current=()=>{controller.signal.throwIfAborted();if(element.hbAssetDocument!==doc||element.isConnected===false||doc.data!==data||textureDiskPreviewKey(doc.data)!==key)throw Error('텍스처가 변경됐어요. 현재 에셋에서 다시 적용하세요.');};
 try{if(!diskMipEligible(data)||!data.mips?.length)throw Error('지원하는 가져오기 설정과 사용자 지정 밉을 확인하세요.');let dimensions=doc.view?.textureDimensions;
  if(!dimensions||dimensions.key!==key){if(!hooks.fileUrl||!data.images[0])throw Error('텍스처 원본 이미지를 지정하세요.');const image=await loadTextureImage(hooks.fileUrl(data.images[0]),controller.signal,element.ownerDocument.defaultView.Image);dimensions={width:image.width,height:image.height,depth:data.images.length,key};}
  current();doc.view??={};doc.view.textureDimensions=dimensions;edit(next=>editDiskMipSettings(next,{hasAttribute:()=>false},dimensions));
 }finally{if(element.hbDiskMipRequest===controller)element.hbDiskMipRequest=null;}
}
