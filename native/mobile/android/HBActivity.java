package com.hbengine.player;

import android.app.Activity;
import android.os.Bundle;
import android.util.AtomicFile;
import android.util.Log;
import android.webkit.*;
import android.net.Uri;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.math.BigInteger;
import java.util.*;
import java.util.concurrent.*;

public final class HBActivity extends Activity {
    static { System.loadLibrary("hbgame"); }
    private WebView web;
    private JSONObject manifest;
    private AtomicFile saves;
    private final Set<String> files = new HashSet<>();
    private final Map<String,Long> fileSizes = new HashMap<>();
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final ConcurrentHashMap<String, CompletableFuture<String>> queries = new ConcurrentHashMap<>();
    private String currentRequest;
    private volatile boolean destroyed;
    private volatile int[] safeInsets=new int[4];
    private boolean foreground=true;
    private long activeElapsed,activeMark=System.nanoTime();
    private synchronized long activeTime(){return activeElapsed+(foreground?System.nanoTime()-activeMark:0);}
    private synchronized void setActive(boolean next){long now=System.nanoTime();if(foreground)activeElapsed+=now-activeMark;activeMark=now;foreground=next;}
    private native byte[] nativeInvoke(int module, byte[] request);
    private static final String ORIGIN = "https://hbengine.local";
    private static final int LIMIT = 8388608;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        try {
            manifest = new JSONObject(read(getAssets().open("game.hbpack.json"), LIMIT));
            files.add("game.hbpack.json");
            JSONArray inventory = manifest.getJSONArray("files");
            for (int i=0;i<inventory.length();i++){JSONObject entry=inventory.getJSONObject(i);files.add(entry.getString("path"));fileSizes.put(entry.getString("path"),entry.getLong("bytes"));}
            saves = new AtomicFile(new File(getFilesDir(), "savegames.json"));
            web = new WebView(this);android.widget.FrameLayout host=new android.widget.FrameLayout(this);host.addView(web,new android.widget.FrameLayout.LayoutParams(-1,-1));setContentView(host);
            WebSettings settings = web.getSettings();
            settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
            settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);
            settings.setAllowFileAccessFromFileURLs(false);settings.setAllowUniversalAccessFromFileURLs(false);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
            settings.setMediaPlaybackRequiresUserGesture(false);
            WebView.setWebContentsDebuggingEnabled("development".equals(manifest.getString("configuration")));
            web.addJavascriptInterface(this,"HBMobile");
            web.setWebViewClient(new WebViewClient() {
                @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return !local(request.getUrl()); }
                @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) { return asset(request); }
                @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) { view.destroy();web=null;android.widget.TextView error=new android.widget.TextView(HBActivity.this);error.setText("게임 화면이 종료됐어요. 앱을 다시 열어 주세요.");setContentView(error);return true; }
            });
            web.setWebChromeClient(new WebChromeClient() {
                @Override public boolean onConsoleMessage(ConsoleMessage m) { Log.println(m.messageLevel()==ConsoleMessage.MessageLevel.ERROR?Log.ERROR:Log.INFO,"HBPlayer",m.message());return true; }
            });
            host.setOnApplyWindowInsetsListener((view,insets)->{int left=insets.getSystemWindowInsetLeft(),top=insets.getSystemWindowInsetTop(),right=insets.getSystemWindowInsetRight(),bottom=insets.getSystemWindowInsetBottom();if(android.os.Build.VERSION.SDK_INT>=28&&insets.getDisplayCutout()!=null){android.view.DisplayCutout cutout=insets.getDisplayCutout();left=Math.max(left,cutout.getSafeInsetLeft());top=Math.max(top,cutout.getSafeInsetTop());right=Math.max(right,cutout.getSafeInsetRight());bottom=Math.max(bottom,cutout.getSafeInsetBottom());}safeInsets=new int[]{left,top,right,bottom};view.setPadding(left,top,right,bottom);return insets;});
            web.loadUrl(ORIGIN+"/prototype/player.html");
        } catch(Exception e) { android.widget.TextView error=new android.widget.TextView(this);error.setText("게임 실행 실패: "+e.getMessage());setContentView(error);Log.e("HBPlayer","startup",e); }
    }

    private static boolean local(Uri url) { return "https".equals(url.getScheme())&&"hbengine.local".equals(url.getHost())&&url.getPort()==-1&&url.getUserInfo()==null; }
    private static boolean safe(String path) { if(path==null||path.length()>2000||path.startsWith("/")||path.indexOf('\\')>=0||path.indexOf(':')>=0)return false;for(String p:path.split("/",-1))if(p.isEmpty()||p.equals(".")||p.equals(".."))return false;for(char c:path.toCharArray())if(c<32)return false;return true; }
    private static String read(InputStream input,int limit) throws IOException { try(InputStream stream=input;ByteArrayOutputStream bytes=new ByteArrayOutputStream()){byte[] chunk=new byte[8192];int n;while((n=stream.read(chunk))!=-1){if(bytes.size()+n>limit)throw new IOException("파일 크기 제한");bytes.write(chunk,0,n);}return bytes.toString("UTF-8");} }
    private WebResourceResponse asset(WebResourceRequest request) {
        try {
            Uri uri=request.getUrl();String name=uri.getPath();if(!local(uri)||!"GET".equals(request.getMethod())||name==null||!name.startsWith("/"))throw new IOException("출처 오류");name=name.substring(1);
            if(!safe(name)||!files.contains(name))throw new IOException("패키지 파일 없음");
            String ext=name.substring(name.lastIndexOf('.')+1).toLowerCase(Locale.ROOT),type="application/octet-stream";
            switch(ext){case "js":case "mjs":type="text/javascript";break;case "html":type="text/html";break;case "css":type="text/css";break;case "json":type="application/json";break;case "wasm":type="application/wasm";break;case "svg":type="image/svg+xml";break;case "png":type="image/png";break;case "jpg":case "jpeg":type="image/jpeg";break;case "webp":type="image/webp";break;case "wav":type="audio/wav";break;case "mp3":type="audio/mpeg";break;case "ogg":type="audio/ogg";break;case "mp4":type="video/mp4";break;case "webm":type="video/webm";break;case "ttf":type="font/ttf";break;case "otf":type="font/otf";break;case "woff":type="font/woff";break;case "woff2":type="font/woff2";break;}
            Map<String,String> headers=new HashMap<>();headers.put("X-Content-Type-Options","nosniff");headers.put("Cache-Control","no-cache");headers.put("Accept-Ranges","bytes");
            if(name.startsWith("Content/"))headers.put("Content-Security-Policy",ext.equals("svg")?"default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox":"default-src 'none'; sandbox");
            if(name.equals("prototype/player.html"))headers.put("Content-Security-Policy","default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'");
            String range=singleRange(request.getRequestHeaders());
            if(range!=null){long size=fileSizes.getOrDefault(name,0L);long[] part=byteRange(range,size);if(part==null){headers.put("Content-Range","bytes */"+size);headers.put("Content-Length","0");return new WebResourceResponse(type,"UTF-8",416,"Range Not Satisfiable",headers,new ByteArrayInputStream(new byte[0]));}long start=part[0],end=part[1];InputStream stream=getAssets().open(name);long skip=start;while(skip>0){long n=stream.skip(skip);if(n<=0){stream.close();throw new IOException("에셋 Range 읽기 실패");}skip-=n;}headers.put("Content-Range","bytes "+start+"-"+end+"/"+size);headers.put("Content-Length",String.valueOf(end-start+1));return new WebResourceResponse(type,"UTF-8",206,"Partial Content",headers,new LimitedStream(stream,end-start+1));}
            return new WebResourceResponse(type,"UTF-8",200,"OK",headers,getAssets().open(name));
        } catch(Exception e) { return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",Collections.emptyMap(),new ByteArrayInputStream(new byte[0])); }
    }
    // ponytail: single byte range; multipart only when a supported decoder needs it.
    private static String singleRange(Map<String,String> headers) {
        for(Map.Entry<String,String> entry:headers.entrySet())if(entry.getKey().equalsIgnoreCase("Range")){String value=entry.getValue().trim();return value.regionMatches(true,0,"bytes=",0,6)&&value.indexOf(',')<0?value:null;}
        return null;
    }
    private static long[] byteRange(String value,long size) {
        if(value==null||value.length()>256||size<=0)return null;
        java.util.regex.Matcher parts=java.util.regex.Pattern.compile("(?i)bytes=(\\d*)-(\\d*)").matcher(value.trim());
        if(!parts.matches()||parts.group(1).isEmpty()&&parts.group(2).isEmpty())return null;
        BigInteger total=BigInteger.valueOf(size);long start,end=size-1;
        if(parts.group(1).isEmpty()){BigInteger suffix=new BigInteger(parts.group(2));if(suffix.signum()==0)return null;start=size-suffix.min(total).longValue();}
        else{BigInteger first=new BigInteger(parts.group(1));if(first.compareTo(total)>=0)return null;start=first.longValue();if(!parts.group(2).isEmpty())end=new BigInteger(parts.group(2)).min(total.subtract(BigInteger.ONE)).longValue();}
        return end<start?null:new long[]{start,end};
    }
    private static final class LimitedStream extends FilterInputStream {
        private long remaining;LimitedStream(InputStream stream,long length){super(stream);remaining=length;}
        @Override public int read() throws IOException {if(remaining<=0)return -1;int value=in.read();if(value>=0)remaining--;return value;}
        @Override public int read(byte[] bytes,int offset,int length) throws IOException {if(offset<0||length<0||offset>bytes.length-length)throw new IndexOutOfBoundsException();if(length==0)return 0;if(remaining<=0)return -1;int n=in.read(bytes,offset,(int)Math.min(length,remaining));if(n>0)remaining-=n;return n;}
        @Override public long skip(long count) throws IOException {if(count<=0||remaining<=0)return 0;long n=in.skip(Math.min(count,remaining));remaining-=n;return n;}
        @Override public int available() throws IOException {return (int)Math.min(in.available(),remaining);}
        @Override public boolean markSupported(){return false;}
        @Override public void mark(int limit){}
        @Override public void reset() throws IOException {throw new IOException("범위 스트림은 되감기를 지원하지 않아요.");}
    }

    private void emit(JSONObject packet) { if(destroyed)return;runOnUiThread(()->{if(!destroyed&&web!=null)web.evaluateJavascript("window.hbMobileReply&&window.hbMobileReply("+packet.toString()+")",null);}); }
    @JavascriptInterface public void postMessage(String payload) {
        if(destroyed||payload==null||payload.length()>LIMIT)return;
        try { JSONObject packet=new JSONObject(payload);String operation=packet.getString("operation"),id=packet.getString("id");if(id.length()>80)throw new JSONException("작업 ID 오류");
            if(operation.equals("queryReply")){CompletableFuture<String> query=queries.remove(id);if(query!=null)query.complete(packet.getJSONObject("data").toString());return;}
            worker.execute(()->{JSONObject reply=new JSONObject();try{reply.put("id",id);currentRequest=id;JSONObject data=packet.optJSONObject("data"),result;
                switch(operation){
                    case "native": { int module=data.getInt("module");if(module<0||module>=manifest.getJSONArray("nativeModules").length())throw new IOException("C++ 모듈 오류");byte[] response=nativeInvoke(module,data.getJSONObject("request").toString().getBytes(StandardCharsets.UTF_8));result=new JSONObject(new String(response,StandardCharsets.UTF_8));break; }
                    case "storageRead": result=loadSaves();break;
                    case "storageWrite": { result=loadSaves();JSONObject items=result.getJSONObject("items");Iterator<String> keys=data.keys();String suffix=".project."+Uri.encode(manifest.getString("id"));while(keys.hasNext()){String key=keys.next();Object value=data.get(key);if(key.length()>1000||!key.endsWith(suffix)||!key.startsWith("hbengine.savegame.")&&!key.startsWith("hbengine.storage-migrated.v1.")||value!=JSONObject.NULL&&!(value instanceof String))throw new IOException("저장 키 범위 오류");if(value==JSONObject.NULL)items.remove(key);else items.put(key,value);}byte[] bytes=result.toString().getBytes(StandardCharsets.UTF_8);if(bytes.length>16777216)throw new IOException("게임 저장 크기 제한");FileOutputStream stream=saves.startWrite();try{stream.write(bytes);saves.finishWrite(stream);}catch(Exception e){saves.failWrite(stream);throw e;}break; }
                    case "report": { if("development".equals(manifest.getString("configuration"))){data.put("mobileHost",new JSONObject().put("safeInsets",new JSONArray(safeInsets)));try(FileOutputStream stream=openFileOutput("runtime-report.json",MODE_PRIVATE)){stream.write(data.toString().getBytes(StandardCharsets.UTF_8));}JSONObject ready=new JSONObject().put("ok",data.optBoolean("ok",false)).put("frames",data.optInt("frames",0)).put("scene",data.optString("scene","")).put("error",data.opt("error"));Log.i("HBPlayer","REPORT "+ready.toString());}result=new JSONObject().put("ok",true);break; }
                    case "close": result=new JSONObject().put("ok",true);runOnUiThread(()->finish());break;
                    default: throw new IOException("모바일 호스트에 없는 작업");
                }reply.put("data",result);
            }catch(Exception e){try{reply.put("error",e.getMessage());}catch(JSONException ignored){}Log.e("HBPlayer","host operation",e);}finally{currentRequest=null;emit(reply);}});
        }catch(Exception e){Log.e("HBPlayer","invalid message",e);}
    }
    private JSONObject loadSaves() throws Exception { try{JSONObject value=new JSONObject(read(saves.openRead(),16777216));if(value.getInt("version")!=1||!(value.get("items") instanceof JSONObject))throw new IOException("게임 저장 형식 오류");return value;}catch(FileNotFoundException e){return new JSONObject().put("version",1).put("items",new JSONObject());} }
    // Called on the serialized native worker. JS queries run on the UI thread;
    // their replies arrive on WebView's bridge thread, never on this executor.
    public byte[] query(byte[] request) throws Exception {
        if(request.length>4000000||destroyed)throw new IOException("C++ 질의 범위 오류");String id=UUID.randomUUID().toString();CompletableFuture<String> result=new CompletableFuture<>();queries.put(id,result);
        try{emit(new JSONObject().put("id",currentRequest).put("queryId",id).put("query",new JSONObject(new String(request,StandardCharsets.UTF_8))));long start=activeTime();for(;;){try{return result.get(100,TimeUnit.MILLISECONDS).getBytes(StandardCharsets.UTF_8);}catch(TimeoutException e){if(activeTime()-start>=TimeUnit.SECONDS.toNanos(10))throw e;}}}finally{queries.remove(id);}
    }
    @Override protected void onPause(){setActive(false);if(web!=null)web.evaluateJavascript("window.hbMobileLifecycle&&window.hbMobileLifecycle(false)",null);super.onPause();}
    @Override protected void onResume(){super.onResume();setActive(true);if(web!=null)web.evaluateJavascript("window.hbMobileLifecycle&&window.hbMobileLifecycle(true)",null);}
    @Override public void onBackPressed(){if(web!=null)web.evaluateJavascript("document.querySelector('#pause-toggle')?.click()",null);else super.onBackPressed();}
    @Override protected void onDestroy(){destroyed=true;for(CompletableFuture<String> query:queries.values())query.completeExceptionally(new IOException("게임 창 종료"));queries.clear();worker.shutdownNow();if(web!=null){web.removeJavascriptInterface("HBMobile");web.destroy();}super.onDestroy();}
}
