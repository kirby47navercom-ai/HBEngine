#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <unistd.h>
#include <thread>
#include <atomic>
#include <fstream>
#include <memory>
#include <cstring>
#include <algorithm>
#include <cctype>
#include <vector>
#include <chrono>
#include "Modules.hpp"

static NSData* encode(id value){return [NSJSONSerialization dataWithJSONObject:value options:0 error:nil];}
static id decode(NSData* value){return value?[NSJSONSerialization JSONObjectWithData:value options:NSJSONReadingMutableContainers error:nil]:nil;}
static std::string utf8(NSString* value){return value?std::string(value.UTF8String):std::string{};}
static NSString* text(const std::string& value){return [[NSString alloc] initWithBytes:value.data() length:value.size() encoding:NSUTF8StringEncoding];}
static bool safe(NSString* value){if(!value||value.length>2000||[value hasPrefix:@"/"]||[value containsString:@"\\"]||[value containsString:@":"])return false;for(NSString* part in [value componentsSeparatedByString:@"/"])if(!part.length||[part isEqual:@"."]||[part isEqual:@".."])return false;return [value rangeOfCharacterFromSet:NSCharacterSet.controlCharacterSet].location==NSNotFound;}

// Assets use a loopback HTTP origin so WKWebView retains fetch, modules and WASM.
class AssetServer {
    int socket_=-1;std::atomic<bool> active{false};std::vector<std::thread> workers;
    NSString* root;NSDictionary* inventory;
    void stop(){active=false;if(socket_>=0){shutdown(socket_,SHUT_RDWR);close(socket_);socket_=-1;}for(auto& worker:workers)if(worker.joinable())worker.join();}
    static bool sendAll(int client,const char* data,size_t size){while(size){auto n=send(client,data,size,0);if(n<=0)return false;data+=n;size-=n;}return true;}
    void serve(int client){@autoreleasepool{
        timeval timeout{5,0};setsockopt(client,SOL_SOCKET,SO_RCVTIMEO,&timeout,sizeof(timeout));setsockopt(client,SOL_SOCKET,SO_SNDTIMEO,&timeout,sizeof(timeout));int yes=1;setsockopt(client,SOL_SOCKET,SO_NOSIGPIPE,&yes,sizeof(yes));
        std::string header;char buffer[8192];while(header.find("\r\n\r\n")==std::string::npos&&header.size()<8192){auto n=recv(client,buffer,sizeof(buffer),0);if(n<=0)return;header.append(buffer,n);}auto begin=header.find(' '),end=header.find(' ',begin+1);if(header.rfind("GET ",0)!=0||end==std::string::npos)return;
        NSString* name=[text(header.substr(begin+1,end-begin-1)) stringByRemovingPercentEncoding];name=[[name componentsSeparatedByString:@"?"] firstObject];if([name hasPrefix:@"/"])name=[name substringFromIndex:1];if(!safe(name)||!inventory[name]){const char* response="HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";sendAll(client,response,strlen(response));return;}
        std::string normalized=header;std::transform(normalized.begin(),normalized.end(),normalized.begin(),[](unsigned char c){return std::tolower(c);});const auto host="\r\nhost: 127.0.0.1:"+std::to_string(port)+"\r\n";if(normalized.find(host)==std::string::npos)return;
        auto file=std::ifstream(utf8([root stringByAppendingPathComponent:name]),std::ios::binary|std::ios::ate);if(!file)return;size_t size=file.tellg(),start=0,count=size;int status=200;
        auto range=normalized.find("\r\nrange: bytes=");if(range!=std::string::npos){try{
            const auto value=normalized.substr(range+15,normalized.find("\r\n",range+2)-range-15);const auto dash=value.find('-');
            const auto number=[](const std::string& digits)->size_t{if(digits.empty()||digits.find_first_not_of("0123456789")!=std::string::npos)throw std::runtime_error("range");return std::stoull(digits);};
            if(!size||dash==std::string::npos)throw std::runtime_error("range");const auto tail=value.substr(dash+1);size_t last=size-1;
            if(dash==0){const auto suffix=number(tail);if(!suffix)throw std::runtime_error("range");start=size-std::min(size,suffix);}else{start=number(value.substr(0,dash));if(!tail.empty())last=std::min(size-1,number(tail));}
            if(start>=size||last<start)throw std::runtime_error("range");count=last-start+1;status=206;
        }catch(...){const auto response="HTTP/1.1 416 Range Not Satisfiable\r\nContent-Range: bytes */"+std::to_string(size)+"\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";sendAll(client,response.data(),response.size());return;}}
        NSDictionary* types=@{@"html":@"text/html",@"js":@"text/javascript",@"mjs":@"text/javascript",@"css":@"text/css",@"json":@"application/json",@"wasm":@"application/wasm",@"svg":@"image/svg+xml",@"png":@"image/png",@"jpg":@"image/jpeg",@"jpeg":@"image/jpeg",@"webp":@"image/webp",@"wav":@"audio/wav",@"mp3":@"audio/mpeg",@"ogg":@"audio/ogg",@"mp4":@"video/mp4",@"webm":@"video/webm",@"ttf":@"font/ttf",@"otf":@"font/otf",@"woff":@"font/woff",@"woff2":@"font/woff2"};
        auto reply="HTTP/1.1 "+std::string(status==200?"200 OK":"206 Partial Content")+"\r\nContent-Type: "+utf8(types[name.pathExtension.lowercaseString]?:@"application/octet-stream")+"\r\nContent-Length: "+std::to_string(count)+"\r\nConnection: close\r\nAccept-Ranges: bytes\r\nX-Content-Type-Options: nosniff\r\n";
        if(status==206)reply+="Content-Range: bytes "+std::to_string(start)+"-"+std::to_string(start+count-1)+"/"+std::to_string(size)+"\r\n";
        if([name hasPrefix:@"Content/"])reply+="Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox\r\n";
        else if([name isEqual:@"prototype/player.html"])reply+="Content-Security-Policy: default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'\r\n";
        reply+="\r\n";if(!sendAll(client,reply.data(),reply.size()))return;file.seekg(start);while(count){auto n=std::min(count,sizeof(buffer));file.read(buffer,n);const auto got=file.gcount();if(got<=0||!sendAll(client,buffer,got))return;count-=got;}
    }}
public:
    int port=0;
    AssetServer(NSString* directory,NSDictionary* files):root(directory),inventory(files){socket_=socket(AF_INET,SOCK_STREAM,0);sockaddr_in address{};address.sin_family=AF_INET;address.sin_addr.s_addr=htonl(INADDR_LOOPBACK);if(socket_<0||bind(socket_,reinterpret_cast<sockaddr*>(&address),sizeof(address))||listen(socket_,16)){stop();throw std::runtime_error("mobile asset server failed");}socklen_t length=sizeof(address);if(getsockname(socket_,reinterpret_cast<sockaddr*>(&address),&length)){stop();throw std::runtime_error("mobile asset port failed");}port=ntohs(address.sin_port);active=true;
        // Bounded readers prevent idle WebKit connections from blocking all assets.
        const int listener=socket_;try{for(int i=0;i<8;i++)workers.emplace_back([this,listener]{while(active){int client=accept(listener,nullptr,nullptr);if(client<0)break;serve(client);close(client);}});}catch(...){stop();throw;}
    }
    ~AssetServer(){stop();}
};

@interface HBController : UIViewController<WKScriptMessageHandler,WKNavigationDelegate> {
    WKWebView* web;NSDictionary* manifest;NSURL* saveFile;dispatch_queue_t worker;NSMutableDictionary* queries;std::unique_ptr<AssetServer> server;
    BOOL foreground;double activeElapsed;std::chrono::steady_clock::time_point activeMark;
}
-(void)lifecycle:(BOOL)active;
-(double)activeTime;
@end
@implementation HBController
-(void)viewDidLoad {
    [super viewDidLoad];[self lifecycle:YES];NSString* root=[NSBundle.mainBundle.resourcePath stringByAppendingPathComponent:@"Assets"];manifest=decode([NSData dataWithContentsOfFile:[root stringByAppendingPathComponent:@"game.hbpack.json"]]);
    NSMutableDictionary* files=[NSMutableDictionary dictionaryWithObject:@YES forKey:@"game.hbpack.json"];for(NSDictionary* file in manifest[@"files"])files[file[@"path"]]=@YES;
    try{server=std::make_unique<AssetServer>(root,files);}catch(const std::exception& e){UILabel* error=[[UILabel alloc] initWithFrame:self.view.bounds];error.numberOfLines=0;error.text=text(e.what());[self.view addSubview:error];return;}
    NSURL* directory=[NSFileManager.defaultManager URLsForDirectory:NSApplicationSupportDirectory inDomains:NSUserDomainMask].firstObject;[NSFileManager.defaultManager createDirectoryAtURL:directory withIntermediateDirectories:YES attributes:nil error:nil];saveFile=[directory URLByAppendingPathComponent:@"savegames.json"];
    worker=dispatch_queue_create("hbengine.native",DISPATCH_QUEUE_SERIAL);queries=[NSMutableDictionary new];WKWebViewConfiguration* config=[WKWebViewConfiguration new];config.allowsInlineMediaPlayback=YES;config.mediaTypesRequiringUserActionForPlayback=WKAudiovisualMediaTypeAll;[config.userContentController addScriptMessageHandler:self name:@"hbmobile"];
    web=[[WKWebView alloc] initWithFrame:self.view.bounds configuration:config];web.navigationDelegate=self;web.autoresizingMask=UIViewAutoresizingFlexibleWidth|UIViewAutoresizingFlexibleHeight;web.scrollView.scrollEnabled=NO;[self.view addSubview:web];[web loadRequest:[NSURLRequest requestWithURL:[NSURL URLWithString:[NSString stringWithFormat:@"http://127.0.0.1:%d/prototype/player.html",server->port]]]];
}
-(void)emit:(NSDictionary*)packet {NSString* script=[@"window.hbMobileReply&&window.hbMobileReply(" stringByAppendingFormat:@"%@)",[[NSString alloc] initWithData:encode(packet) encoding:NSUTF8StringEncoding]];dispatch_async(dispatch_get_main_queue(),^{[self->web evaluateJavaScript:script completionHandler:nil];});}
-(void)userContentController:(WKUserContentController*)controller didReceiveScriptMessage:(WKScriptMessage*)message {
    if(!message.frameInfo.isMainFrame||![message.frameInfo.securityOrigin.host isEqual:@"127.0.0.1"]||message.frameInfo.securityOrigin.port!=server->port||![message.body isKindOfClass:NSString.class]||[message.body length]>8388608)return;
    NSDictionary* packet=decode([message.body dataUsingEncoding:NSUTF8StringEncoding]);if(![packet isKindOfClass:NSDictionary.class])return;NSString* operation=packet[@"operation"],*requestID=packet[@"id"];if(![requestID isKindOfClass:NSString.class]||requestID.length>80||![operation isKindOfClass:NSString.class]||![packet[@"data"] isKindOfClass:NSDictionary.class])return;
    if([operation isEqual:@"queryReply"]){@synchronized(queries){NSMutableDictionary* query=queries[requestID];if(query){query[@"reply"]=packet[@"data"];dispatch_semaphore_signal(query[@"signal"]);}}return;}
    dispatch_async(worker,^{@autoreleasepool{try{
        NSDictionary* data=packet[@"data"];id result=nil;
        if([operation isEqual:@"native"]){int index=[data[@"module"] intValue];auto input=utf8([[NSString alloc] initWithData:encode(data[@"request"]) encoding:NSUTF8StringEncoding]);
            const auto query=[&](const std::string& input){NSString* id=NSUUID.UUID.UUIDString;NSMutableDictionary* slot=[NSMutableDictionary dictionaryWithObject:dispatch_semaphore_create(0) forKey:@"signal"];@synchronized(self->queries){self->queries[id]=slot;}[self emit:@{@"id":requestID,@"queryId":id,@"query":decode([text(input) dataUsingEncoding:NSUTF8StringEncoding])}];const auto started=[self activeTime];bool timed=false;while(dispatch_semaphore_wait(slot[@"signal"],dispatch_time(DISPATCH_TIME_NOW,100*NSEC_PER_MSEC))){if([self activeTime]-started>=10){timed=true;break;}}@synchronized(self->queries){[self->queries removeObjectForKey:id];}if(timed)throw std::runtime_error("mobile query timeout");return utf8([[NSString alloc] initWithData:encode(slot[@"reply"]) encoding:NSUTF8StringEncoding]);};
            auto output=HB_mobileInvoke(index,input,query);result=decode([text(output) dataUsingEncoding:NSUTF8StringEncoding]);
        }else if([operation isEqual:@"storageRead"]||[operation isEqual:@"storageWrite"]){NSData* saved=[NSData dataWithContentsOfURL:self->saveFile];NSMutableDictionary* store=decode(saved);if(saved&&(![store isKindOfClass:NSDictionary.class]||![store[@"items"] isKindOfClass:NSDictionary.class]||![store[@"version"] isEqual:@1]))throw std::runtime_error("mobile save file invalid");if(!saved)store=[@{@"version":@1,@"items":[NSMutableDictionary new]} mutableCopy];
            if([operation isEqual:@"storageWrite"]){NSMutableDictionary* items=store[@"items"];NSString* suffix=[@".project." stringByAppendingString:self->manifest[@"id"]];for(NSString* key in data){id value=data[key];if(key.length>1000||![key hasSuffix:suffix]||![key hasPrefix:@"hbengine.savegame."]&&![key hasPrefix:@"hbengine.storage-migrated.v1."]||value!=NSNull.null&&![value isKindOfClass:NSString.class])throw std::runtime_error("mobile save key range");if(value==NSNull.null)[items removeObjectForKey:key];else items[key]=value;}NSData* bytes=encode(store);NSError* error=nil;if(bytes.length>16777216||![bytes writeToURL:self->saveFile options:NSDataWritingAtomic error:&error])throw std::runtime_error("mobile save failed");}result=store;
        }else if([operation isEqual:@"report"]){if([self->manifest[@"configuration"] isEqual:@"development"]){NSMutableDictionary* report=[data mutableCopy];report[@"mobileHost"]=@{@"assetOrigin":[NSString stringWithFormat:@"http://127.0.0.1:%d",self->server->port]};[encode(report) writeToURL:[[self->saveFile URLByDeletingLastPathComponent] URLByAppendingPathComponent:@"runtime-report.json"] atomically:YES];NSLog(@"HBPlayer REPORT %@",report);}result=@{@"ok":@YES};}
        else if([operation isEqual:@"close"]){result=@{@"ok":@YES};[self lifecycle:NO];}
        else throw std::runtime_error("unknown mobile operation");
        [self emit:@{@"id":requestID,@"data":result?:@{}}];
    }catch(const std::exception& error){[self emit:@{@"id":requestID,@"error":text(error.what())?:@"mobile native failure"}];}}});
}
-(void)webView:(WKWebView*)view decidePolicyForNavigationAction:(WKNavigationAction*)action decisionHandler:(void (^)(WKNavigationActionPolicy))handler {NSURL* url=action.request.URL;handler([url.host isEqual:@"127.0.0.1"]&&url.port.intValue==server->port?WKNavigationActionPolicyAllow:WKNavigationActionPolicyCancel);}
-(double)activeTime {@synchronized(self){return activeElapsed+(foreground?std::chrono::duration<double>(std::chrono::steady_clock::now()-activeMark).count():0);}}
-(void)lifecycle:(BOOL)active {@synchronized(self){const auto now=std::chrono::steady_clock::now();if(foreground)activeElapsed+=std::chrono::duration<double>(now-activeMark).count();activeMark=now;foreground=active;}dispatch_async(dispatch_get_main_queue(),^{[self->web evaluateJavaScript:active?@"window.hbMobileLifecycle&&window.hbMobileLifecycle(true)":@"window.hbMobileLifecycle&&window.hbMobileLifecycle(false)" completionHandler:nil];});}
@end
@interface HBApp : UIResponder<UIApplicationDelegate>
@property(strong,nonatomic) UIWindow* window;
@property(strong,nonatomic) HBController* controller;
@end
@implementation HBApp
-(BOOL)application:(UIApplication*)application didFinishLaunchingWithOptions:(NSDictionary*)options {self.window=[[UIWindow alloc] initWithFrame:UIScreen.mainScreen.bounds];self.controller=[HBController new];self.window.rootViewController=self.controller;[self.window makeKeyAndVisible];return YES;}
-(void)applicationWillResignActive:(UIApplication*)app {[self.controller lifecycle:NO];}
-(void)applicationDidBecomeActive:(UIApplication*)app {[self.controller lifecycle:YES];}
@end
int main(int argc,char* argv[]){@autoreleasepool{return UIApplicationMain(argc,argv,nil,NSStringFromClass(HBApp.class));}}
