import fs from 'node:fs/promises';
export async function projectBytes(project,name,options={}){const info=await project.read(name);options.signal?.throwIfAborted();return info.bytes??(info.readBytes?info.readBytes(options):fs.readFile(info.file,options));}
export async function projectText(project,name,options={}){return (await projectBytes(project,name,options)).toString('utf8');}
