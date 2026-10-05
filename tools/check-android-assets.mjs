import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {runTool} from './mobile-android.mjs';

const root=path.resolve(import.meta.dirname,'..'),source=await fs.readFile(path.join(root,'native/mobile/android/HBActivity.java'),'utf8');
const begin=source.indexOf('    private static String singleRange('),end=source.indexOf('    private void emit(',begin);
assert.ok(begin>=0&&end>begin,'실제 Android 범위 처리 코드를 추출해야 해요.');
await fs.mkdir(path.join(root,'native/build'),{recursive:true});const out=await fs.mkdtemp(path.join(root,'native/build/android-assets-'));
const checks=`
    static void check(boolean value){if(!value)throw new AssertionError();}
    static void range(String header,long size,long start,long end){check(java.util.Arrays.equals(byteRange(header,size),new long[]{start,end}));}
    public static void main(String[] args) throws Exception {
        check(singleRange(java.util.Collections.singletonMap("rAnGe","BYTES=-8")).equals("BYTES=-8"));
        check(singleRange(java.util.Collections.singletonMap("Range","items=0-7"))==null);
        check(singleRange(java.util.Collections.singletonMap("Range","bytes=0-7,8-9"))==null);check(singleRange(java.util.Collections.emptyMap())==null);
        range("bytes=0-7",96,0,7);range("bytes=8-",96,8,95);range("bytes=-8",96,88,95);
        range("bytes=-1000",96,0,95);range("BYTES=0-1000",96,0,95);range("bytes=95-95",96,95,95);
        range("bytes=0-999999999999999999999999",96,0,95);range("bytes=-999999999999999999999999",96,0,95);
        range("bytes=000000000000000000000001-",96,1,95);range("bytes=0-",Long.MAX_VALUE,0,Long.MAX_VALUE-1);
        for(String invalid:new String[]{"bytes=", "bytes=-", "bytes=-0", "bytes=8-7", "bytes=96-", "bytes=999999999999999999999999-", "bytes=+1-2", "bytes=0-1,2-3", "items=0-7", "bytes=a-7", "bytes=0--1"})check(byteRange(invalid,96)==null);
        check(byteRange("bytes=0-",0)==null);check(byteRange(null,96)==null);
        byte[] content=new byte[96];for(int i=0;i<content.length;i++)content[i]=(byte)i;
        try(LimitedStream stream=new LimitedStream(new ByteArrayInputStream(content),8)){
            check(stream.available()==8);check(stream.skip(-1)==0);check(stream.read()==0);check(stream.skip(1000)==7);
            check(stream.read()==-1);check(stream.available()==0);check(stream.read(new byte[0],0,0)==0);check(stream.skip(2)==0);
            check(!stream.markSupported());try{stream.reset();throw new AssertionError();}catch(IOException expected){}
            try{stream.read(new byte[1],2,0);throw new AssertionError();}catch(IndexOutOfBoundsException expected){}
        }
        try(LimitedStream stream=new LimitedStream(new ByteArrayInputStream(content),8)){
            byte[] result=new byte[96];check(stream.read(result,0,result.length)==8);check(java.util.Arrays.equals(java.util.Arrays.copyOf(result,8),java.util.Arrays.copyOf(content,8)));check(stream.read(result,0,96)==-1);
        }
        System.out.println("Android production byte ranges and bounded streams passed");
    }
`;
await fs.writeFile(path.join(out,'AndroidAssetCheck.java'),'import java.io.*;\nimport java.math.BigInteger;\nimport java.util.*;\npublic final class AndroidAssetCheck {\n'+source.slice(begin,end)+checks+'}\n');
const javaHome=process.env.JAVA_HOME||(process.platform==='win32'?'C:/Program Files/Java/jdk-25':''),tool=name=>javaHome?path.join(javaHome,'bin',name+(process.platform==='win32'?'.exe':'')):name;
await runTool(tool('javac'),['--release','8','-encoding','UTF-8','-d',out,path.join(out,'AndroidAssetCheck.java')]);
console.log((await runTool(tool('java'),['-cp',out,'AndroidAssetCheck'])).trim());
await fs.writeFile(path.join(out,'acceptance.json'),JSON.stringify({ok:true,productionJava:true,rangeVerified:true,streamVerified:true,androidSdkCompiled:false},null,2));
console.log(out);
