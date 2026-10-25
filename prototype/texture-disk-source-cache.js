import {DiskMipSource,validDiskMipSettings} from './texture-disk-mips.js';
// Ephemeron keys do not retain abandoned assets, URL owners or renderers.
// Only active/candidate leases retain decoded pixels, including across roots.
const assets=new WeakMap(),withoutRenderer={};
function matches(source,asset,limits){
 if(source.dimension!==asset.dimension||source.limits?.maxSize!==(limits.maxSize||null)||source.limits?.maxLayers!==(limits.maxLayers||null))return false;
 const first=source.levels[0],s=asset.streaming;if(first.width!==s.width||first.height!==s.height||first.depth!==(s.depth??1))return false;
 const paths=[asset.images,...asset.mips.map(m=>m.images)];return paths.length===source.levels.length&&paths.every((row,i)=>row.length===source.levels[i].paths.length&&row.every((p,j)=>p===source.levels[i].paths[j]));
}
export function sharedDiskMipSource(asset,fileUrl,renderer,limits={}){
 if(!validDiskMipSettings(asset)||!asset.streaming?.enabled)throw Error('디스크 밉 설정과 전체 사용자 지정 밉을 확인하세요.');
 if(typeof fileUrl!=='function')throw Error('텍스처 파일 URL 소유자가 필요해요.');
 let urls=assets.get(asset);if(!urls)assets.set(asset,urls=new WeakMap());let devices=urls.get(fileUrl);if(!devices)urls.set(fileUrl,devices=new WeakMap());const owner=renderer||withoutRenderer;
 let source=devices.get(owner);if(!source||!matches(source,asset,limits)){source=new DiskMipSource(asset,fileUrl,{limits});devices.set(owner,source);}return source;
}
