export const exactIds={geometry:9007199254741000n,first:9007199254740992n,second:9007199254740993n,pose:9223372036854775806n};
export function exactAsciiFbx(){const {geometry,first,second}=exactIds;return Buffer.from(`; FBX 7.4.0 project file
FBXHeaderExtension: {
 FBXVersion: 7400
}
GlobalSettings: {
 Properties70: {
  P: "UnitScaleFactor", "double", "Number", "",1
  P: "UpAxis", "int", "Integer", "",1
 }
}
Objects: {
 Geometry: ${geometry}, "Geometry::Triangle", "Mesh" {
  Vertices: *9 {
   a: 0,0,0,1,0,0,0,1,0
  }
  PolygonVertexIndex: *3 {
   a: 0,1,-3
  }
 }
 Model: ${first}, "Model::Twin", "Mesh" {
  Version: 232
 }
 Model: ${second}, "Model::Twin", "Mesh" {
  Version: 232
 }
}
Connections: {
 C: "OO",${geometry},${first}
 C: "OO",${geometry},${second}
 C: "OO",${first},0
 C: "OO",${second},0
}
`.replace(/^ +/gm,spaces=>'\t'.repeat(spaces.length)));}
export function exactBinaryFbx(version=7500){
 const {geometry,first,second,pose}=exactIds,wide=version>=7500,headerSize=wide?25:13,n=(name,props=[],children=[])=>({name,props,children});
 const prop=value=>{if(typeof value==='bigint'){const b=Buffer.alloc(9);b.write('L');b.writeBigInt64LE(value,1);return b;}if(typeof value==='number'){const b=Buffer.alloc(5);b.write('I');b.writeInt32LE(value,1);return b;}if(Array.isArray(value)){const type=typeof value[0]==='bigint'?'l':'d',body=Buffer.alloc(value.length*8);value.forEach((v,i)=>type==='l'?body.writeBigInt64LE(v,i*8):body.writeDoubleLE(v,i*8));const b=Buffer.alloc(13);b.write(type);b.writeUInt32LE(value.length,1);b.writeUInt32LE(body.length,9);return Buffer.concat([b,body]);}const body=Buffer.from(value),b=Buffer.alloc(5);b.write('S');b.writeUInt32LE(body.length,1);return Buffer.concat([b,body]);};
 const size=(b,value,at)=>wide?b.writeBigUInt64LE(BigInt(value),at):b.writeUInt32LE(value,at);
 const encode=(node,at)=>{const name=Buffer.from(node.name),properties=Buffer.concat(node.props.map(prop)),children=[];let end=at+headerSize+name.length+properties.length;for(const child of node.children){const bytes=encode(child,end);children.push(bytes);end+=bytes.length;}if(children.length){children.push(Buffer.alloc(headerSize));end+=headerSize;}const b=Buffer.alloc(headerSize);size(b,end,0);size(b,node.props.length,wide?8:4);size(b,properties.length,wide?16:8);b[headerSize-1]=name.length;return Buffer.concat([b,name,properties,...children]);};
 const nodes=[n('GlobalSettings',[],[n('Properties70',[],[n('P',['UnitScaleFactor','double','Number','',1])])]),n('Objects',[],[
  n('Geometry',[geometry,'Triangle\0\x01Geometry','Mesh'],[n('Vertices',[[0,0,0,1,0,0,0,1,0]]),n('PolygonVertexIndex',[[0,1,-3]])]),
  n('Model',[first,'Twin\0\x01Model','Mesh']),n('Model',[second,'Twin\0\x01Model','Mesh']),
  n('Pose',[pose,'Bind\0\x01Pose','BindPose'],[n('NbPoseNodes',[1]),n('PoseNode',[],[n('Node',[first]),n('Matrix',[[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]])])]),
  n('TimeProbe',[100n,'Time\0\x01AnimationCurve',''],[n('KeyTime',[[9007199254740993n,46186158000n]]),n('Default',[27])])
 ]),n('Connections',[],[n('C',['OO',geometry,first]),n('C',['OO',geometry,second]),n('C',['OO',first,0n]),n('C',['OO',second,0n])])];
 const header=Buffer.alloc(27);Buffer.from('Kaydara FBX Binary  \0\x1a\0','binary').copy(header);header.writeUInt32LE(version,23);const result=[header];let at=27;for(const node of nodes){const bytes=encode(node,at);result.push(bytes);at+=bytes.length;}result.push(Buffer.alloc(headerSize));return Buffer.concat(result);
}
