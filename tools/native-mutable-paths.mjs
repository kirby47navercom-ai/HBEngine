import {existsSync} from 'node:fs';import path from 'node:path';import os from 'node:os';
export function nativeMutablePaths(engineRoot){
 const root=path.resolve(engineRoot),installed=existsSync(path.join(root,'HBEngine.install.json'));
 const cache=installed?(path.basename(path.dirname(root)).toLowerCase()==='versions'?path.join(path.dirname(path.dirname(root)),'Cache'):path.join(process.env.LOCALAPPDATA||path.join(os.homedir(),'.cache'),'HBEngine/Cache')):path.join(root,'native/build');
 return {root,installed,cache,modules:installed?path.join(cache,'NativeModules'):path.join(root,'native/build/plugins'),dependencies:installed?path.join(cache,'Dependencies/nlohmann/3.12.0'):path.join(root,'native/build/deps')};
}
