// Content browser thumbnails for engine assets the Windows shell cannot preview: meshes (flat-shaded triangles in a
// three-quarter view) and materials (a shaded ball in the evaluated surface colour). PNGs are cached by path + mtime.
import {createCanvas} from '@napi-rs/canvas';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const hex=c=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c)?[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)):[136,152,120];

export function meshThumbnail(data,size=128){
  const canvas=createCanvas(size,size),g=canvas.getContext('2d');g.fillStyle='#262626';g.fillRect(0,0,size,size);
  const v=Array.isArray(data?.vertices)?data.vertices:[],ix=Array.isArray(data?.indices)?data.indices:[];if(!v.length||ix.length<3)return canvas.toBuffer('image/png');
  const yaw=-.6,pitch=.45,cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
  const view=v.map(([x,y,z])=>{const rx=x*cy-z*sy,rz=x*sy+z*cy;return [rx,y*cp-rz*sp,y*sp+rz*cp];});
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const [x,y] of view){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
  const scale=size*.8/Math.max(maxX-minX,maxY-minY,1e-6),ox=size/2-(minX+maxX)/2*scale,oy=size/2+(minY+maxY)/2*scale,light=[.4,.8,.45];
  const tris=[];for(let i=0;i+2<ix.length&&tris.length<200000;i+=3){const a=view[ix[i]],b=view[ix[i+1]],c=view[ix[i+2]];if(!a||!b||!c)continue;
    const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],w=[c[0]-a[0],c[1]-a[1],c[2]-a[2]],n=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]],len=Math.hypot(...n)||1;
    const shade=Math.abs(n[0]*light[0]+n[1]*light[1]+n[2]*light[2])/len;tris.push({a,b,c,depth:a[2]+b[2]+c[2],shade});}
  tris.sort((p,q)=>p.depth-q.depth); // ponytail: painter's sort, no depth buffer; fine for thumbnails
  for(const t of tris){const k=Math.round(70+150*t.shade);g.fillStyle=`rgb(${k},${k},${Math.min(255,k+12)})`;g.beginPath();g.moveTo(ox+t.a[0]*scale,oy-t.a[1]*scale);g.lineTo(ox+t.b[0]*scale,oy-t.b[1]*scale);g.lineTo(ox+t.c[0]*scale,oy-t.c[1]*scale);g.closePath();g.fill();}
  return canvas.toBuffer('image/png');
}

export function materialThumbnail(surface,size=128){
  const canvas=createCanvas(size,size),g=canvas.getContext('2d');g.fillStyle='#262626';g.fillRect(0,0,size,size);
  const [r,gr,b]=hex(surface?.color),[er,eg,eb]=hex(surface?.emissive),glow=Math.max(0,Math.min(4,surface?.emissiveIntensity??1)),rough=Math.max(0,Math.min(1,surface?.roughness??.7));
  const tone=(c,e,k)=>Math.min(255,Math.round(c*k+e*glow));
  const radius=size*.4,cx=size/2,cyy=size/2,ball=g.createRadialGradient(cx-radius*.35,cyy-radius*.4,radius*.05,cx,cyy,radius);
  ball.addColorStop(0,`rgb(${tone(r,er,1.25)},${tone(gr,eg,1.25)},${tone(b,eb,1.25)})`);ball.addColorStop(.7,`rgb(${tone(r,er,.8)},${tone(gr,eg,.8)},${tone(b,eb,.8)})`);ball.addColorStop(1,`rgb(${tone(r,er,.3)},${tone(gr,eg,.3)},${tone(b,eb,.3)})`);
  g.globalAlpha=Math.max(.25,Math.min(1,surface?.opacity??1));g.fillStyle=ball;g.beginPath();g.arc(cx,cyy,radius,0,Math.PI*2);g.fill();
  const spot=g.createRadialGradient(cx-radius*.4,cyy-radius*.45,0,cx-radius*.4,cyy-radius*.45,radius*(.2+rough*.6));spot.addColorStop(0,`rgba(255,255,255,${.7*(1-rough)+.08})`);spot.addColorStop(1,'rgba(255,255,255,0)');
  g.globalAlpha=1;g.fillStyle=spot;g.beginPath();g.arc(cx,cyy,radius,0,Math.PI*2);g.fill();
  return canvas.toBuffer('image/png');
}

// Returns the cached PNG path, or null for kinds without an engine thumbnail.
export async function assetThumbnail(project,name,folder,{readMaterial}={}){
  const kind=/\.hbmesh\.json$/i.test(name)?'mesh':/\.hbmaterial\.json$/i.test(name)?'material':null;if(!kind)return null;
  const {file}=await project.read(name),stat=await fs.stat(file),key=createHash('sha1').update(name+'\0'+stat.mtimeMs+'\0'+stat.size).digest('hex');
  const out=path.join(folder,key+'.png');
  try{await fs.access(out);return out;}catch{}
  const data=JSON.parse(await fs.readFile(file,'utf8'));
  const png=kind==='mesh'?meshThumbnail(data):materialThumbnail(await readMaterial(data));
  await fs.mkdir(folder,{recursive:true});await fs.writeFile(out,png);
  const files=(await fs.readdir(folder)).filter(f=>f.endsWith('.png'));
  if(files.length>1000){const dated=await Promise.all(files.map(async f=>({f,t:(await fs.stat(path.join(folder,f))).mtimeMs})));dated.sort((a,b)=>a.t-b.t);for(const {f} of dated.slice(0,files.length-800))await fs.rm(path.join(folder,f),{force:true});}
  return out;
}
