export function authoredMipFields(data,{assetField,files,icon}){
 if(!['texture2d','texturearray','volumetexture','cubemap'].includes(data.dimension))return '';
 return '<section><div class="form-section-heading"><h3>사용자 지정 밉</h3><button data-texture-mip-add>'+icon('plus')+' 밉 추가</button></div>'+(data.mips||[]).map((mip,i)=>'<div class="form-section-heading"><h4>밉 '+(i+1)+'</h4><button data-texture-mip-remove="'+i+'" aria-label="이하 밉 삭제">'+icon('close')+'</button></div>'+mip.images.map((source,z)=>assetField(data.dimension==='texture2d'?'이미지':data.dimension==='cubemap'?['+X','−X','+Y','−Y','+Z','−Z'][z]:'슬라이스 '+z,'mips.'+i+'.images.'+z,source,files,['texture'])).join('')).join('')+'</section>';
}
export function editAuthoredMip(data,button){
 if(button.hasAttribute('data-texture-mip-add')){data.mips??=[];const depth=data.dimension==='volumetexture'?Math.max(1,Math.floor(data.images.length/2**(data.mips.length+1))):data.images.length;data.mips.push({images:Array(depth).fill('')});}
 else{const index=Number(button.dataset.textureMipRemove);if(Number.isInteger(index)&&index>=0&&index<(data.mips?.length||0))data.mips.splice(index);}
}
export function editTextureSlices(data,button){
 if(button.hasAttribute('data-texture-add')){data.images.push('');for(const mip of data.mips||[])if(data.dimension==='texturearray')mip.images.push('');}
 else if(button.dataset.textureRemove!==undefined){const index=Number(button.dataset.textureRemove);data.images.splice(index,1);for(const mip of data.mips||[])if(data.dimension==='texturearray')mip.images.splice(index,1);}
 else{const index=Number(button.dataset.textureMove),to=index+Number(button.dataset.direction);if(to>=0&&to<data.images.length){[data.images[index],data.images[to]]=[data.images[to],data.images[index]];for(const mip of data.mips||[])if(data.dimension==='texturearray')[mip.images[index],mip.images[to]]=[mip.images[to],mip.images[index]];}}
 if(data.dimension==='volumetexture'){let depth=data.images.length;for(const mip of data.mips||[]){depth=Math.max(1,Math.floor(depth/2));mip.images.length=Math.min(mip.images.length,depth);while(mip.images.length<depth)mip.images.push('');}}
}
