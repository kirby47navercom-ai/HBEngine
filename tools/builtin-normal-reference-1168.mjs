import * as G from 'three';

export async function builtinNormalReference1168(){
 const renderer=new G.WebGLRenderer({antialias:false});renderer.setSize(32,16);renderer.outputColorSpace=G.LinearSRGBColorSpace;
 const scene=new G.Scene(),camera=new G.OrthographicCamera(-1,1,1,-1,.1,10),geometry=new G.PlaneGeometry(2,2),baseUV=new Float32Array(geometry.attributes.uv.array),baseIndices=Array.from(geometry.index.array),texture=new G.DataTexture(new Float32Array([1,.7,1,1]),1,1,G.RGBAFormat,G.FloatType),target=new G.WebGLRenderTarget(32,16,{type:G.FloatType,depthBuffer:false}),material=new G.MeshStandardMaterial({normalMap:texture,side:G.DoubleSide,toneMapped:false}),mesh=new G.Mesh(geometry,material);
 camera.position.z=2;texture.matrixAutoUpdate=false;texture.minFilter=texture.magFilter=G.NearestFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
 material.onBeforeCompile=shader=>{if(!shader.fragmentShader.includes('#include <opaque_fragment>'))throw Error('Three normal reference output owner changed');shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','gl_FragColor=vec4(normal*.5+.5,1.0);');};material.customProgramCacheKey=()=> 'hb-builtin-normal-reference1168';scene.add(mesh);
 let cases=0,error=0;
 try{
  for(const reverse of [false,true])for(const uv of [[1,1],[-1,1],[2,.5]])for(const matrix of [[1,0,0,1],[0,-1,1,0],[1,.4,.2,1]])for(const value of [[1,.4,1],[-1,.2,.1]])for(const strength of [[1,1],[-1,2]]){
   const indices=[...baseIndices];if(reverse)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];geometry.index.array.set(indices);geometry.index.needsUpdate=true;for(let i=0;i<baseUV.length;i++)geometry.attributes.uv.array[i]=baseUV[i]*uv[i%2];geometry.attributes.uv.needsUpdate=true;
   texture.image.data.set([...value.map(v=>v*.5+.5),1]);texture.needsUpdate=true;texture.matrix.set(matrix[0],matrix[1],.37,matrix[2],matrix[3],-.2,0,0,1);material.normalScale.set(...strength);
   renderer.setRenderTarget(target);renderer.render(scene,camera);const pixels=new Float32Array(32*16*4);renderer.readRenderTargetPixels(target,0,0,32,16,pixels);const encoded=texture.image.data,mapped=[(encoded[0]*2-1)*strength[0],(encoded[1]*2-1)*strength[1],encoded[2]*2-1],tx=matrix[0]*uv[0],ty=matrix[1]*uv[1],bx=matrix[2]*uv[0],by=matrix[3]*uv[1],scale=Math.max(Math.hypot(tx,ty),Math.hypot(bx,by)),world=[(tx*mapped[0]+bx*mapped[1])/scale,(ty*mapped[0]+by*mapped[1])/scale,mapped[2]*(reverse?-1:1)],length=Math.hypot(...world),expected=world.map(v=>v/length*.5+.5),actual=Array.from(pixels.subarray((8*32+16)*4,(8*32+16)*4+3));
   for(let c=0;c<3;c++){const delta=Math.abs(actual[c]-expected[c]);error=Math.max(error,delta);if(!Number.isFinite(actual[c])||delta>5e-5)throw Error('standard GL normal reference '+JSON.stringify({reverse,uv,matrix,value,strength,actual,expected}));}cases++;
  }
  if(renderer.getContext().getError())throw Error('GL normal reference context error');return{cases,maxError:error,tolerance:5e-5,scope:'Actual Three0.180 standard texture-normal path (no authored tangents), canonical valid inputs and transformed/mirrored UV/front/back against analytic plane basis. Raw GL zero/degenerate/overflow behavior is not claimed.'};
 }finally{material.dispose();geometry.dispose();texture.dispose();target.dispose();renderer.dispose();renderer.forceContextLoss();}
}
