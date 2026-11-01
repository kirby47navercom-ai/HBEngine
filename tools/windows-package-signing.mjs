import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';

const exec=promisify(execFile);
export async function windowsPowerShell(source,{signal,timeout=60000}={}){
 const env={...process.env};delete env.PSModulePath;
 const file=path.join(process.env.SystemRoot||'C:/Windows','System32/WindowsPowerShell/v1.0/powershell.exe');
 return exec(file,['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from("$ErrorActionPreference='Stop';[Console]::OutputEncoding=[Text.UTF8Encoding]::new();"+source,'utf16le').toString('base64')],{env,signal,windowsHide:true,timeout,maxBuffer:1048576});
}
const literal=value=>"'"+value.replaceAll("'","''")+"'";
export function windowsSigningSettings(profile,env=process.env){
 const thumbprint=profile.windowsSigning?.certificateThumbprint||env.HB_CODE_SIGN_THUMBPRINT||'',timestampServer=profile.windowsSigning?.timestampServer||'http://timestamp.digicert.com';
 if(thumbprint&&!/^[a-f0-9]{40}$/i.test(thumbprint))throw Error('코드 서명 인증서 지문은 40자리 SHA-1이어야 해요.');
 const url=new URL(timestampServer);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||timestampServer.length>512)throw Error('타임스탬프 서버 주소를 확인하세요.');
 return {thumbprint:thumbprint.toUpperCase(),timestampServer};
}
export async function executableSignature(file){
 const {stdout}=await windowsPowerShell('$s=Get-AuthenticodeSignature -LiteralPath '+literal(file)+';[pscustomobject]@{status=$s.Status.ToString();signer=$s.SignerCertificate.Subject}|ConvertTo-Json -Compress');return JSON.parse(stdout);
}
export async function signWindowsPackage(files,settings,{signal}={}){
 if(!settings.thumbprint)return {state:'unsigned',distributionReady:true,antivirusVerdict:'not-tested-on-recipient-PC',reason:'코드 서명 없이 만든 패키지예요. 다른 PC에 배포할 수 있으며, 해당 PC의 보안 정책에 따라 경고나 차단이 발생할 수 있어요.'};
 const script='$cert=Get-Item -LiteralPath '+literal('Cert:/CurrentUser/My/'+settings.thumbprint)+';if(!$cert.HasPrivateKey -or $cert.NotAfter -le (Get-Date) -or $cert.NotBefore -gt (Get-Date) -or !($cert.EnhancedKeyUsageList.ObjectId -contains "1.3.6.1.5.5.7.3.3")){throw "유효한 개인 키·코드 서명 용도의 인증서가 필요해요."};$results=@();foreach($file in @('+files.map(literal).join(',')+')){$signed=Set-AuthenticodeSignature -LiteralPath $file -Certificate $cert -HashAlgorithm SHA256 -TimestampServer '+literal(settings.timestampServer)+';if($signed.Status -ne "Valid"){throw ("코드 서명 검증 실패: "+$file+" / "+$signed.Status)};$checked=Get-AuthenticodeSignature -LiteralPath $file;if($checked.Status -ne "Valid" -or $checked.SignerCertificate.Thumbprint -ne $cert.Thumbprint){throw "서명 후 검증 실패"};if(!$checked.TimeStamperCertificate){throw "타임스탬프 서명이 확인되지 않았어요."};$results+=[pscustomobject]@{file=[IO.Path]::GetFileName($file);status=$checked.Status.ToString();timestamped=[bool]$checked.TimeStamperCertificate}};ConvertTo-Json -InputObject $results -Compress';
 const {stdout}=await windowsPowerShell(script,{signal,timeout:120000});return {state:'signed',distributionReady:true,files:JSON.parse(stdout),antivirusVerdict:'not-tested-on-recipient-PC'};
}
export async function finalizeWindowsPackage({player,out,productName,executables,artifacts,settings,signal}){
 const files=executables.map(name=>path.join(out,name));
 for(const file of files)await exec(player,['--stamp-game',file,productName],{windowsHide:true,signal,timeout:30000});
 const signing=await signWindowsPackage(files,settings,{signal});
 for(const name of executables){const bytes=await fs.readFile(path.join(out,name));Object.assign(artifacts.find(row=>row.path===name),{bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
 return signing;
}
