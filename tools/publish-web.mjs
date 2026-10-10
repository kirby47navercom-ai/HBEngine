import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {digest} from './build-game.mjs';
import {runTool} from './mobile-android.mjs';

const safe=name=>typeof name==='string'&&name.length>0&&name.length<=2000&&!/[\\:\x00-\x1f]/.test(name)&&!name.startsWith('/')&&!name.split('/').some(v=>!v||v==='.'||v==='..'||v==='.git');
export async function webFiles(directory){
  const root=await fs.realpath(directory),manifest=JSON.parse(await fs.readFile(path.join(root,'game.hbpack.json'),'utf8'));
  if(manifest.version!==1||manifest.target!=='web'||!Array.isArray(manifest.files)||!manifest.id)throw Error('웹 게임 빌드 폴더를 선택하세요.');
  const files=new Map();for(const entry of manifest.files){
    if(!safe(entry.path)||files.has(entry.path)||!/^[0-9a-f]{64}$/.test(entry.sha256))throw Error('웹 패키지 파일 목록 오류');
    const file=await fs.realpath(path.join(root,entry.path));if(!file.toLowerCase().startsWith((root+path.sep).toLowerCase()))throw Error('웹 패키지 경로 이탈');
    const bytes=await fs.readFile(file);if(bytes.length!==entry.bytes||digest(bytes)!==entry.sha256)throw Error('웹 패키지 파일 변조: '+entry.path);files.set(entry.path,bytes);
  }
  if(!files.has('index.html')||!files.has('.nojekyll'))throw Error('웹 게임 시작 파일이 없어요.');
  files.set('game.hbpack.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n'));return {manifest,files};
}

export async function publishWeb(directory,remote,{signal,onProgress=()=>{}}={}){
  const match=/^https:\/\/(?:([A-Za-z0-9_-]+)@)?github\.com\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/.exec(remote||'');
  if(!match)throw Error('GitHub HTTPS 저장소 주소를 입력하세요.');
  const [,username,owner,repo]=match,{manifest,files}=await webFiles(directory),env={...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'Never'};
  // Read the existing credential without placing it in an argument or log.
  const raw=execFileSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\n'+(username?'username='+username+'\n':'')+'\n',encoding:'utf8',env,stdio:['pipe','pipe','pipe']});
  const credentials=Object.fromEntries(raw.trim().split('\n').map(row=>{const i=row.indexOf('=');return [row.slice(0,i),row.slice(i+1)];}));if(!credentials.password)throw Error('GitHub Git 인증이 필요해요.');
  const api=async(method,body)=>{
    const response=await fetch('https://api.github.com/repos/'+owner+'/'+repo+'/pages',{method,signal,headers:{Authorization:'Bearer '+credentials.password,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
    const value=await response.json().catch(()=>({}));if(!response.ok&&!(method==='GET'&&response.status===404))throw Error('GitHub Pages: '+response.status+' '+(value.message||''));return {...value,httpStatus:response.status};
  };
  const page=await api('GET');if(page.httpStatus!==404&&(page.source?.branch!=='gh-pages'||page.source?.path!=='/'))throw Error('기존 GitHub Pages의 다른 게시 설정을 덮어쓰지 않아요.');
  const work=await fs.mkdtemp(path.join(os.tmpdir(),'hbengine-pages-'));
  const checkedWork=await fs.realpath(work),temporary=await fs.realpath(os.tmpdir());if(!checkedWork.toLowerCase().startsWith((temporary+path.sep).toLowerCase()))throw Error('게시 임시 경로 오류');
  const git=(args)=>runTool('git',args,{cwd:work,env,signal});
  try{
    const exists=(await git(['ls-remote','--heads',remote,'refs/heads/gh-pages'])).trim();
    if(exists){
      await git(['clone','--depth','1','--single-branch','--branch','gh-pages',remote,'.']);
      let previous;try{previous=JSON.parse(await fs.readFile(path.join(work,'game.hbpack.json'),'utf8'));}catch{}
      if(previous?.target!=='web'||previous.id!==manifest.id)throw Error('gh-pages에 다른 게임이나 사이트가 있어요. 별도 저장소를 사용하세요.');
      await git(['rm','--quiet','-r','-f','--','.']);
    }else{await git(['init','-b','gh-pages']);await git(['remote','add','origin',remote]);}
    for(const [name,bytes] of files){const file=path.join(work,name);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,bytes);}
    const name=execFileSync('git',['config','user.name'],{encoding:'utf8'}).trim(),email=execFileSync('git',['config','user.email'],{encoding:'utf8'}).trim();
    await git(['config','user.name',name]);await git(['config','user.email',email]);await git(['add','--force','--all']);
    const changes=(await git(['status','--porcelain'])).trim();
    if(changes){await fs.writeFile(path.join(work,'.git/publish-message.txt'),'웹 게임 빌드 게시\n\n검증한 정적 플레이어·에셋·WebAssembly를 GitHub Pages에 게시해요.\n');await git(['commit','-F','.git/publish-message.txt']);onProgress('GitHub Pages 업로드');await git(['push','origin','HEAD:gh-pages']);}
    let result=page;
    if(page.httpStatus===404){try{result=await api('POST',{build_type:'legacy',source:{branch:'gh-pages',path:'/'}});}catch(error){
      // A failed HTTP reply may follow a successful Pages configuration.
      const confirmed=await api('GET');if(confirmed.httpStatus!==200||confirmed.source?.branch!=='gh-pages'||confirmed.source?.path!=='/')throw error;result=confirmed;
    }}
    return {url:result.html_url||'https://'+owner+'.github.io/'+repo+'/',branch:'gh-pages',files:files.size,commit:(await git(['rev-parse','HEAD'])).trim()};
  }finally{const checked=await fs.realpath(work),base=await fs.realpath(os.tmpdir());if(!checked.toLowerCase().startsWith((base+path.sep).toLowerCase()))throw Error('게시 임시 경로 오류');await fs.rm(checked,{recursive:true,force:true});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)publishWeb(process.argv[2],process.argv[3],{onProgress:console.log}).then(value=>console.log(JSON.stringify(value))).catch(error=>{console.error(error.message);process.exitCode=1;});
