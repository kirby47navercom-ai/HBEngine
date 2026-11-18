import {blueprintAccessProblem} from './blueprint-access.js';
import {annotateNativeRecordPin,validNativeRecordPin,nativeRecordDefinition,nativeRecordTemplate} from './native-records.js';
import {nativeEnumDefinition,validNativeEnumPin} from './native-enums.js';
import {sampleCurveSegment,sampleCurveOutside,validCurveWeights,validCurveInfinity} from './curve-sampling.js';
import {defaultsFor,validValue} from './pin-values.js';
import {fieldsFor,structPins,validStructNode,isStructNode,structTypes,structNodeType} from './struct-operations.js';
export {fieldsFor};
export {defaultsFor,validValue};
import {dynamicFlowPins,validFlowNode,isFlowNode,isSwitchNode,flowOutputIds} from './flow-pins.js';
import {blueprintClasses} from './class-types.js';
import {componentDefaults,validComponents} from './scene-components.js';
export {componentDefaults};
import {validNative,validNativeReference,nativePins,nativeMember} from './native-model.js';
import {coreApi,serviceApi} from './core-api.js';
const pin = (id,label,type='exec',array=false) => ({id,label,type,array});
export const variableTypes = { bool:'Boolean · 불리언', int:'Integer · 정수', float:'Float · 실수', string:'String · 문자열', vec2:'Vector2 · 벡터2', vec3:'Vector3 · 벡터3', color:'Color · 색상', transform:'Transform · 변환', object:'Object · 클래스 참조', hit:'HitResult · 구조체', record:'Record · 사용자 구조체' };
export const typeColors = { exec:'#d1dadd', bool:'#d88380', int:'#89c8c1', float:'#9dcc7f', string:'#dba0cd', vec2:'#e2bc71', vec3:'#e2bc71', color:'#99bfea', transform:'#d99f72', object:'#88b9e0', hit:'#ae9ece', record:'#86b4d5', any:'#aab9be' };
export const catalog = [
  {key:'construction',title:'Construction Script',ko:'생성 시 구성',group:'이벤트',keywords:'construction constructor 컨스트럭션 컨스트럭터 생성 구성',kind:'event',inputs:[],outputs:[pin('then','실행')]},
  {key:'beginPlay',title:'Begin Play',ko:'게임 시작',group:'이벤트',keywords:'beginplay 비긴 시작 플레이',kind:'event',inputs:[],outputs:[pin('then','실행')]},
  {key:'tick',title:'Event Tick',ko:'매 프레임',group:'이벤트',keywords:'event tick 이벤트 틱 델타 시간',kind:'event',inputs:[],outputs:[pin('then','실행'),pin('delta','Delta seconds','float')]},
  {key:'fixedTick',title:'Fixed Update',ko:'고정 물리 업데이트',group:'이벤트',keywords:'fixed update physics 물리 고정 틱 프레임',kind:'event',inputs:[],outputs:[pin('then','실행'),pin('delta','Fixed delta seconds','float')]},
  {key:'beginOverlap',title:'Begin Overlap',ko:'겹침 시작',group:'이벤트',keywords:'actor component overlap begin 비긴 오버랩 충돌 트리거',kind:'event',inputs:[],outputs:[pin('then','실행'),pin('other','Other actor','object')]},
  {key:'overlapStay',title:'Overlap Stay',ko:'겹침 유지',group:'이벤트',keywords:'trigger overlap stay 겹침 유지 접촉 물리',kind:'event',inputs:[],outputs:[pin('then','실행'),pin('other','Other actor','object'),pin('delta','Fixed delta seconds','float')]},
  {key:'endOverlap',title:'End Overlap',ko:'겹침 종료',group:'이벤트',keywords:'end overlap 끝 엔드 충돌',kind:'event',inputs:[],outputs:[pin('then','실행'),pin('other','Other actor','object')]},
  {key:'input',title:'Input Event',ko:'키·마우스 이벤트',group:'이벤트',keywords:'input key keyboard mouse click 입력 키보드 마우스 클릭 버튼',kind:'event',inputs:[],outputs:[pin('then','Pressed'),pin('released','Released')]},
  {key:'customEvent',title:'Custom Event',ko:'사용자 이벤트',group:'이벤트',keywords:'custom event 커스텀 사용자 정의',kind:'event',inputs:[],outputs:[pin('then','실행')]},
  {key:'callParent',title:'Call Parent',ko:'부모 호출',group:'클래스',keywords:'parent super 부모 상속 호출',inputs:[pin('exec','실행')],outputs:[pin('then','다음')]},
  {key:'parentEntry',title:'Parent Event',ko:'부모 이벤트',group:'클래스',internal:true,inputs:[],outputs:[]},
  {key:'branch',title:'Branch',ko:'조건 분기',group:'흐름 제어',keywords:'branch if 조건 분기 참 거짓',kind:'condition',inputs:[pin('exec','실행'),pin('condition','Condition','bool')],outputs:[pin('true','True'),pin('false','False')]},
  {key:'delay',title:'Delay',ko:'기다리기',group:'흐름 제어',keywords:'delay wait 딜레이 지연 대기',inputs:[pin('exec','실행'),pin('duration','Duration','float')],outputs:[pin('then','Completed')]},
  {key:'sequence',title:'Sequence',ko:'순서대로 실행',group:'흐름 제어',keywords:'sequence 시퀀스 순서',inputs:[pin('exec','실행')],outputs:[pin('first','Then 0'),pin('second','Then 1')]},
  {key:'print',title:'Print String',ko:'문자열 출력',group:'디버그',keywords:'print string log 문자열 로그 출력',inputs:[pin('exec','실행'),pin('message','Message','string')],outputs:[pin('then','다음')]},{key:'quitGame',title:'Quit Game',ko:'게임 종료',group:'게임 창',keywords:'quit exit close application 종료 끝내기',inputs:[pin('exec','실행')],outputs:[]},{key:'setFullscreen',title:'Set Fullscreen',ko:'전체 화면 설정',group:'게임 창',keywords:'fullscreen window mode 전체 화면 창 모드',inputs:[pin('exec','실행'),pin('fullscreen','Fullscreen','bool')],outputs:[pin('then','다음')]},{key:'setResolution',title:'Set Window Resolution',ko:'창 해상도 설정',group:'게임 창',keywords:'resolution window size 해상도 창 크기',inputs:[pin('exec','실행'),pin('width','Width','int'),pin('height','Height','int')],outputs:[pin('then','다음')]},{key:'setVSync',title:'Set VSync',ko:'수직 동기화 설정',group:'게임 창',keywords:'vsync vertical sync 수직 동기화',inputs:[pin('exec','실행'),pin('enabled','Enabled','bool')],outputs:[pin('then','다음')]},{key:'getViewportSize',title:'Get Viewport Size',ko:'게임 화면 크기',group:'게임 창',keywords:'viewport screen window size resolution width height 화면 크기 해상도',pure:true,inputs:[],outputs:[pin('width','Width','int'),pin('height','Height','int')]},{key:'launchURL',title:'Launch URL',ko:'웹 주소 열기',group:'게임 창',keywords:'launch open url web link browser 웹 링크 브라우저 주소',inputs:[pin('exec','실행'),pin('url','URL','string')],outputs:[pin('then','다음')]},{key:'copyToClipboard',title:'Copy to Clipboard',ko:'클립보드에 복사',group:'게임 창',keywords:'clipboard copy text 클립보드 복사',inputs:[pin('exec','실행'),pin('text','Text','string')],outputs:[pin('then','다음')]},{key:'takeScreenshot',title:'Take Screenshot',ko:'게임 화면 저장',group:'게임 창',keywords:'screenshot capture save image 스크린샷 캡처 화면 저장',inputs:[pin('exec','실행')],outputs:[pin('then','다음')]},{key:'getPlatformName',title:'Get Platform Name',ko:'플랫폼 이름',group:'게임 창',keywords:'platform os windows web 플랫폼 운영체제',pure:true,inputs:[],outputs:[pin('return','Platform','string')]},{key:'setMaxFps',title:'Set Max FPS',ko:'최대 FPS 설정',group:'게임 창',keywords:'max fps frame rate limit cap 프레임 제한 최대 프레임',inputs:[pin('exec','실행'),pin('fps','Max FPS','int')],outputs:[pin('then','다음')]},{key:'setMouseCursorVisible',title:'Set Show Mouse Cursor',ko:'마우스 커서 표시 설정',group:'게임 창',keywords:'show hide mouse cursor pointer 마우스 커서 숨기기 보이기',inputs:[pin('exec','실행'),pin('visible','Visible','bool')],outputs:[pin('then','다음')]},{key:'gamepadRumble',title:'Play Gamepad Rumble',ko:'게임패드 진동',group:'입력',keywords:'rumble vibration force feedback gamepad 진동 게임패드',inputs:[pin('exec','실행'),pin('player','Player Index','int'),pin('low','Low Motor','float'),pin('high','High Motor','float'),pin('duration','Duration','float')],outputs:[pin('then','다음')]},{key:'drawDebugLine',title:'Draw Debug Line',ko:'디버그 선 그리기',group:'디버그',keywords:'draw debug line gizmo 디버그 선',inputs:[pin('exec','실행'),pin('start','Start','vec3'),pin('end','End','vec3'),pin('color','Color','vec3'),pin('duration','Duration','float')],outputs:[pin('then','다음')]},{key:'drawDebugSphere',title:'Draw Debug Sphere',ko:'디버그 구 그리기',group:'디버그',keywords:'draw debug sphere 디버그 구',inputs:[pin('exec','실행'),pin('center','Center','vec3'),pin('radius','Radius','float'),pin('color','Color','vec3'),pin('duration','Duration','float')],outputs:[pin('then','다음')]},{key:'drawDebugBox',title:'Draw Debug Box',ko:'디버그 상자 그리기',group:'디버그',keywords:'draw debug box 디버그 상자',inputs:[pin('exec','실행'),pin('center','Center','vec3'),pin('extent','Half Size','vec3'),pin('color','Color','vec3'),pin('duration','Duration','float')],outputs:[pin('then','다음')]},
  {key:'location',title:'Get Position',ko:'위치 가져오기',group:'오브젝트',keywords:'get actor location position 위치 벡터 좌표',inputs:[pin('target','Target','object')],outputs:[pin('return','Return value','vec3')]},
  {key:'setPosition',title:'Set Position',ko:'위치 설정',group:'오브젝트',keywords:'set actor location position 위치 이동 설정',inputs:[pin('exec','실행'),pin('target','Target','object'),pin('position','Position','vec3')],outputs:[pin('then','다음')]},
  {key:'vec3',title:'Make Vector3',ko:'벡터3 만들기',group:'수학',keywords:'make vector vec3 vector3 xyz 벡터3',inputs:[pin('x','X','float'),pin('y','Y','float'),pin('z','Z','float')],outputs:[pin('return','Vector3','vec3')]},
  {key:'vec2',title:'Make Vector2',ko:'벡터2 만들기',group:'수학',keywords:'make vector vec2 vector2 xy 벡터2',inputs:[pin('x','X','float'),pin('y','Y','float')],outputs:[pin('return','Vector2','vec2')]},
  {key:'add',title:'Add Float',ko:'실수 더하기',group:'수학',keywords:'add float plus 덧셈 더하기 합',inputs:[pin('a','A','float'),pin('b','B','float')],outputs:[pin('return','Result','float')]},
  {key:'arrayLength',title:'Array Length',ko:'배열 길이',group:'배열',keywords:'array length size 배열 길이 크기',inputs:[pin('array','Array','any',true)],outputs:[pin('return','Length','int')]},
  {key:'trace',title:'Raycast',ko:'레이캐스트',group:'물리',keywords:'raycast line trace hit result 레이 선 충돌 검사 구조체',inputs:[pin('exec','실행'),pin('start','Start','vec3'),pin('end','End','vec3')],outputs:[pin('then','다음'),pin('return','Hit result','hit')]},
  {key:'members',title:'Get Object Members',ko:'공개 멤버 읽기',group:'오브젝트',keywords:'object class member property 클래스 객체 멤버 속성',inputs:[pin('target','Target','object')],outputs:[pin('name','Name','string'),pin('position','Position','vec3'),pin('visible','Visible','bool')]},
  {key:'door',title:'Open Door',ko:'문 열기',group:'C++ 공개 함수',keywords:'door open 문 열기 cpp c++',inputs:[pin('exec','실행')],outputs:[pin('then','다음')]},
  {key:'sound',title:'Play Sound',ko:'효과음 재생',group:'오디오',keywords:'audio play sound 효과음 소리 재생',inputs:[pin('exec','실행'),pin('name','Sound','string')],outputs:[pin('then','다음')]},
  {key:'customFunction',title:'Custom Function',ko:'사용자 함수',group:'사용자 정의',keywords:'custom function 사용자 함수 커스텀',inputs:[pin('exec','실행')],outputs:[pin('then','다음')]}
];
const spec=(key,title,ko,group,inputs,outputs,keywords='')=>({key,title,ko,group,inputs,outputs,keywords:title+' '+ko+' '+keywords});
const flow=(key,title,ko,group,inputs=[],outputs=[])=>spec(key,title,ko,group,[pin('exec','실행'),...inputs],[pin('then','다음'),...outputs]);
catalog.push(
  spec('timeline','Timeline','타임라인','시간',[pin('play','Play'),pin('start','Play from Start'),pin('stop','Stop'),pin('reverse','Reverse'),pin('reverseEnd','Reverse from End'),pin('setTime','Set New Time'),pin('time','New Time','float')],[pin('update','Update'),pin('finished','Finished'),pin('direction','Direction','string')]),
  spec('reroute','Reroute','연결 정리','사용자 정의',[pin('value','Input','float')],[pin('value','Output','float')]),
  spec('isValid','Is Valid','객체 유효성','오브젝트',[pin('target','Object','object')],[pin('return','Valid','bool')]),
  flow('cast','Cast To Class','클래스 변환','오브젝트',[pin('target','Object','object'),pin('class','Class','string')],[pin('object','Object','object'),pin('failed','Cast failed')]),
  ...[['multiply','Multiply','곱하기'],['subtract','Subtract','빼기'],['divide','Divide','나누기'],['min','Min','최솟값'],['max','Max','최댓값'],['power','Power','거듭제곱']].map(([k,en,ko])=>spec(k,en,ko,'수학',[pin('a','A','float'),pin('b','B','float')],[pin('return','Result','float')])),
  ...[['abs','Abs','절댓값'],['sqrt','Sqrt','제곱근'],['sin','Sin','사인'],['cos','Cos','코사인'],['floor','Floor','내림'],['ceil','Ceil','올림'],['round','Round','반올림']].map(([k,en,ko])=>spec(k,en,ko,'수학',[pin('value','Value','float')],[pin('return','Result','float')])),
  spec('clamp','Clamp','범위 제한','수학',[pin('value','Value','float'),pin('min','Min','float'),pin('max','Max','float')],[pin('return','Result','float')]),
  spec('lerp','Lerp','선형 보간','수학',[pin('a','A','float'),pin('b','B','float'),pin('alpha','Alpha','float')],[pin('return','Result','float')]),
  spec('random','Random Float in Range','범위 안 무작위','수학',[pin('min','Min','float'),pin('max','Max','float')],[pin('return','Value','float')]),
  spec('randomInt','Random Integer in Range','범위 안 무작위 정수','수학',[pin('min','Min','int'),pin('max','Max','int')],[pin('return','Value','int')],'dice 주사위 inclusive'),
  spec('randomBool','Random Bool','무작위 참거짓','수학',[],[pin('return','Value','bool')],'coin flip 동전'),
  ...[['greater','Greater','크다'],['less','Less','작다'],['equal','Equal','같다'],['notEqual','Not Equal','다르다']].map(([k,en,ko])=>spec(k,en,ko,'비교',[pin('a','A','float'),pin('b','B','float')],[pin('return','Result','bool')])),
  ...[['and','AND','그리고'],['or','OR','또는']].map(([k,en,ko])=>spec(k,en,ko,'논리',[pin('a','A','bool'),pin('b','B','bool')],[pin('return','Result','bool')])),
  spec('not','NOT','반전','논리',[pin('value','Value','bool')],[pin('return','Result','bool')]),
  spec('select','Select Float','조건 값 선택','논리',[pin('condition','Condition','bool'),pin('a','True value','float'),pin('b','False value','float')],[pin('return','Result','float')]),
  ...[['vectorAdd','Add Vector','벡터 더하기'],['vectorSubtract','Subtract Vector','벡터 빼기']].map(([k,en,ko])=>spec(k,en,ko,'벡터',[pin('a','A','vec3'),pin('b','B','vec3')],[pin('return','Result','vec3')])),
  spec('vectorScale','Scale Vector','벡터 배율','벡터',[pin('value','Vector','vec3'),pin('scale','Scale','float')],[pin('return','Result','vec3')]),
  spec('vectorLength','Vector Length','벡터 길이','벡터',[pin('value','Vector','vec3')],[pin('return','Length','float')]),
  spec('normalize','Normalize Vector','벡터 정규화','벡터',[pin('value','Vector','vec3')],[pin('return','Result','vec3')]),
  spec('distance','Distance','거리','벡터',[pin('a','A','vec3'),pin('b','B','vec3')],[pin('return','Distance','float')]),
  ...[['dot','Dot Product','내적','float'],['cross','Cross Product','외적','vec3']].map(([k,en,ko,t])=>spec(k,en,ko,'벡터',[pin('a','A','vec3'),pin('b','B','vec3')],[pin('return','Result',t)])),
  spec('vectorLerp','Lerp Vector','벡터 보간','벡터',[pin('a','A','vec3'),pin('b','B','vec3'),pin('alpha','Alpha','float')],[pin('return','Result','vec3')]),
  spec('makeTransform','Make Transform','트랜스폼 만들기','변환',[pin('position','Position','vec3'),pin('rotation','Rotation','vec3'),{...pin('scale','Scale','vec3'),default:[1,1,1]}],[pin('return','Transform','transform')]),
  spec('getTransform','Get Transform','트랜스폼 가져오기','변환',[pin('target','Target','object')],[pin('return','Transform','transform')]),
  flow('setTransform','Set Transform','트랜스폼 설정','변환',[pin('target','Target','object'),pin('value','Transform','transform')]),
  ...[['getRotation','Get Rotation','회전 가져오기'],['getScale','Get Scale','크기 가져오기']].map(([k,en,ko])=>spec(k,en,ko,'변환',[pin('target','Target','object')],[pin('return','Value','vec3')])),
  ...[['setRotation','Set Rotation','회전 설정'],['setScale','Set Scale','크기 설정'],['translate','Add Offset','위치 더하기'],['rotate','Add Rotation','회전 더하기']].map(([k,en,ko])=>flow(k,en,ko,'변환',[pin('target','Target','object'),pin('value','Value','vec3')])),
  spec('self','Self','자기 자신','오브젝트',[],[pin('return','Self','object')]),
  flow('spawn','Spawn Actor','액터 생성','오브젝트',[pin('class','Class','string'),pin('transform','Transform','transform')],[pin('actor','Actor','object')]),
  flow('destroy','Destroy Actor','액터 제거','오브젝트',[pin('target','Target','object')]),
  flow('setLifeSpan','Set Life Span','수명 설정','오브젝트',[pin('target','Target','object'),pin('lifeSpan','Life Span','float')],),
  flow('visibility','Set Visibility','표시 설정','오브젝트',[pin('target','Target','object'),pin('visible','Visible','bool')]),
  flow('attach','Attach To','부모에 연결','오브젝트',[pin('target','Target','object'),pin('parent','Parent','object')]),
  spec('getComponent','Get Component','컴포넌트 찾기','컴포넌트',[pin('target','Target','object'),pin('class','Component class','string')],[pin('return','Component','object')]),
  flow('addComponent','Add Component','컴포넌트 추가','컴포넌트',[pin('target','Target','object'),pin('class','Component class','string')],[pin('return','Component','object')]),
  flow('componentEnabled','Set Component Enabled','컴포넌트 활성화','컴포넌트',[pin('target','Component','object'),pin('enabled','Enabled','bool')]),
  spec('concat','Append String','문자열 합치기','문자열',[pin('a','A','string'),pin('b','B','string')],[pin('return','Result','string')]),
  spec('stringLength','String Length','문자열 길이','문자열',[pin('value','String','string')],[pin('return','Length','int')]),
  spec('contains','Contains','문자열 포함','문자열',[pin('value','String','string'),pin('search','Search','string')],[pin('return','Result','bool')]),
  spec('toString','Float To String','실수를 문자열로','문자열',[pin('value','Value','float')],[pin('return','String','string')]),
  spec('arrayGet','Array Get','배열 원소 읽기','배열',[pin('array','Array','float',true),pin('index','Index','int')],[pin('return','Item','float')]),
  flow('arraySet','Array Set','배열 원소 설정','배열',[pin('array','Array','float',true),pin('index','Index','int'),pin('item','Item','float')]),
  flow('arrayAdd','Array Add','배열 원소 추가','배열',[pin('array','Array','float',true),pin('item','Item','float')],[pin('index','Index','int')]),
  flow('arrayRemove','Array Remove Index','배열 원소 삭제','배열',[pin('array','Array','float',true),pin('index','Index','int')]),
  spec('arrayFind','Array Find','배열 원소 찾기','배열',[pin('array','Array','float',true),pin('item','Item','float')],[pin('return','Index','int')]),
  spec('arrayContains','Array Contains','배열 원소 포함','배열',[pin('array','Array','float',true),pin('item','Item','float')],[pin('return','Contains','bool')]),
  spec('forLoop','For Loop','반복 실행','흐름 제어',[pin('exec','실행'),pin('first','First index','int'),pin('last','Last index','int')],[pin('body','Loop body'),pin('index','Index','int'),pin('completed','Completed')]),
  spec('forEach','For Each Loop','배열 반복','흐름 제어',[pin('exec','실행'),pin('array','Array','float',true)],[pin('body','Loop body'),pin('item','Item','float'),pin('index','Index','int'),pin('completed','Completed')]),
  flow('doOnce','Do Once','한 번 실행','흐름 제어',[pin('reset','Reset')]),
  spec('flipFlop','Flip Flop','번갈아 실행','흐름 제어',[pin('exec','실행')],[pin('a','A'),pin('b','B'),pin('isA','Is A','bool')]),
  spec('gate','Gate','실행 게이트','흐름 제어',[pin('exec','Enter'),pin('open','Open'),pin('close','Close'),pin('toggle','Toggle'),pin('startClosed','Start Closed','bool')],[pin('then','Exit')]),
  flow('timer','Set Timer','타이머 설정','시간',[pin('duration','Time','float'),pin('loop','Looping','bool'),pin('event','Event name','string')],[pin('handle','Handle','string')]),
  flow('clearTimer','Clear Timer','타이머 해제','시간',[pin('handle','Handle','string')]),
  spec('time','Get Game Time','게임 시간','시간',[],[pin('return','Seconds','float')]),
  flow('lineTrace','Line Trace','선 충돌 검사','물리',[pin('start','Start','vec3'),pin('end','End','vec3'),pin('channel','Channel','string'),pin('ignoreSelf','Ignore Self','bool'),pin('ignore','Actors To Ignore','object',true)],[pin('hit','Hit','hit')]),
  flow('impulse','Add Impulse','충격량 추가','물리',[pin('target','Target','object'),pin('impulse','Impulse','vec3')]),
  flow('collisionEnabled','Set Collision Enabled','충돌 활성화','물리',[pin('target','Target','object'),pin('enabled','Enabled','bool')]),
  flow('playAnimation','Play Animation','애니메이션 재생','애니메이션',[pin('target','Target','object'),pin('clip','Clip','string'),pin('loop','Looping','bool')]),
  flow('stopAnimation','Stop Animation','애니메이션 정지','애니메이션',[pin('target','Target','object')]),
  flow('playSoundAt','Play Sound At Location','위치에서 소리 재생','오디오',[pin('sound','Sound','string'),pin('position','Position','vec3'),pin('volume','Volume','float')]),
  flow('stopSound','Stop Sound','소리 정지','오디오',[pin('sound','Sound','string')]),
  flow('setMaterial','Set Material','머테리얼 지정','렌더링',[pin('target','Target','object'),pin('material','Material','string'),pin('slot','Slot','int')]),
  flow('materialTexture','Set Material Texture','머테리얼 텍스처 설정','렌더링',[pin('target','Target','object'),pin('parameter','Parameter','string'),pin('texture','Texture','string')]),
  flow('materialVector','Set Material Vector','머테리얼 벡터 설정','렌더링',[pin('target','Target','object'),pin('parameter','Parameter','string'),pin('value','Value','vec3')]),
  flow('materialColor','Set Material Color','머테리얼 색상 설정','렌더링',[pin('target','Target','object'),pin('parameter','Parameter','string'),pin('value','Value','color')]),
  flow('materialFloat','Set Material Float','머테리얼 실수 설정','렌더링',[pin('target','Target','object'),pin('parameter','Parameter','string'),pin('value','Value','float')]),
  flow('lightIntensity','Set Light Intensity','광원 밝기 설정','렌더링',[pin('target','Light','object'),pin('value','Intensity','float')]),
  flow('openScene','Open Scene','장면 열기','장면',[pin('scene','Scene','string')]),
  flow('reloadScene','Reload Scene','장면 다시 불러오기','장면'),
  spec('wasRecentlyRendered','Was Recently Rendered','화면에 보이는지','렌더링',[pin('target','Target','object')],[pin('return','On Screen','bool')],'recently rendered visible on screen culling 화면 보임 최적화'),
  spec('getSupportedResolutions','Get Supported Resolutions','지원 해상도 목록','설정',[],[pin('return','Resolutions','vec2',true)],'supported resolutions display modes 해상도 목록 설정'),
  spec('getActionKeys','Get Action Keys','액션에 지정된 키','입력',[pin('action','Action','string')],[pin('return','Keys','string',true)],'action key name prompt binding 키 이름 안내'),
  flow('setMouseCursorImage','Set Mouse Cursor Image','마우스 커서 이미지','입력',[pin('texture','Texture','string'),pin('hotspotX','Hotspot X','float'),pin('hotspotY','Hotspot Y','float')]),
  flow('startCameraFade','Start Camera Fade','화면 페이드','카메라',[pin('fromAlpha','From Alpha','float'),pin('toAlpha','To Alpha','float'),pin('duration','Duration','float'),pin('color','Color','color'),pin('holdWhenFinished','Hold When Finished','bool')]),
  flow('stopCameraFade','Stop Camera Fade','화면 페이드 끄기','카메라'),
  flow('showSubtitle','Show Subtitle','자막 표시','UI',[pin('text','Text','string'),pin('duration','Duration','float')]),
  flow('clearSubtitle','Clear Subtitle','자막 지우기','UI'),
  flow('drawDebugString','Draw Debug String','디버그 글자 그리기','디버그',[pin('position','Location','vec3'),pin('text','Text','string'),pin('color','Color','color'),pin('duration','Duration','float')]),
  flow('setStatsVisible','Show Frame Stats','FPS 표시','디버그',[pin('visible','Visible','bool')]),
  flow('setUiTextScale','Set UI Text Scale','UI 글자 크기 배율','설정',[pin('scale','Scale','float')]),
  flow('setColorblindMode','Set Colorblind Mode','색맹 보정','설정',[pin('mode','Mode (0 off, 1 protan, 2 deutan, 3 tritan)','int')]),
  flow('resetPlayerSettings','Reset Player Settings','플레이어 설정 초기화','설정'),
  flow('statAdd','Add To Stat','통계 더하기','업적',[pin('name','Stat','string'),pin('amount','Amount','float')]),
  flow('statSet','Set Stat','통계 설정','업적',[pin('name','Stat','string'),pin('value','Value','float')]),
  spec('statGet','Get Stat','통계 값','업적',[pin('name','Stat','string')],[pin('return','Value','float')],'stat statistic 통계'),
  flow('achievementUnlock','Unlock Achievement','업적 달성','업적',[pin('id','Achievement','string')],[pin('return','Newly Unlocked','bool')]),
  spec('achievementUnlocked','Is Achievement Unlocked','업적 달성 여부','업적',[pin('id','Achievement','string')],[pin('return','Unlocked','bool')],'achievement unlocked 업적'),
  spec('achievementList','Get Unlocked Achievements','달성한 업적 목록','업적',[],[pin('return','Achievements','string',true)],'achievement list 업적 목록'),
  flow('achievementReset','Reset Achievements And Stats','업적·통계 초기화','업적'),
  flow('preloadAssets','Preload Assets','에셋 미리 불러오기','레벨',[pin('assets','Assets','string',true)]),
  spec('preloadProgress','Get Preload Progress','미리 불러오기 진행률','레벨',[],[pin('return','Progress','float')],'preload loading progress 로딩 진행률'),
  flow('playSoundRandom','Play Random Sound','무작위 소리 재생','오디오',[pin('sounds','Sounds','string',true),pin('position','Location','vec3'),pin('volume','Volume','float'),pin('pitchMin','Pitch Min','float'),pin('pitchMax','Pitch Max','float')]),
  spec('getHealth','Get Health','체력','체력',[pin('target','Target','object')],[pin('return','Health','float'),pin('max','Max Health','float')],'health hp 체력'),
  spec('isDead','Is Dead','죽었는지','체력',[pin('target','Target','object')],[pin('return','Dead','bool')],'dead death health 죽음'),
  flow('setHealth','Set Health','체력 설정','체력',[pin('target','Target','object'),pin('health','Health','float')]),
  flow('heal','Heal','체력 회복','체력',[pin('target','Target','object'),pin('amount','Amount','float')]),
  flow('setCheckpoint','Set Checkpoint','체크포인트 설정','게임플레이',[pin('location','Location','vec3')]),
  flow('respawnActor','Respawn','다시 생성','게임플레이',[pin('target','Target','object')]),
  flow('textRenderSetText','Set Text Render Text','월드 글자 바꾸기','렌더링',[pin('target','Target','object'),pin('text','Text','string')]),
  flow('applyDamage','Apply Damage','피해 주기','피해',[pin('target','Damaged Actor','object'),pin('damage','Damage','float')]),
  flow('applyRadialDamage','Apply Radial Damage','범위 피해 주기','피해',[pin('origin','Origin','vec3'),pin('radius','Radius','float'),pin('damage','Damage','float'),pin('falloff','Falloff','bool')],[pin('count','Hit Count','int')]),
  flow('delayNextTick','Delay Until Next Tick','다음 프레임까지 지연','흐름'),
  flow('setInputMode','Set Input Mode','입력 모드 설정','입력',[pin('mode','Mode (game / ui / gameAndUi)','string')]),
  spec('mapAdd','Map Add','맵에 추가한 사본','맵',[pin('map','Map','record'),pin('key','Key','string'),pin('value','Value','any')],[pin('return','Map','record')],'map dictionary add put 맵 사전 추가'),
  spec('mapRemove','Map Remove','맵에서 뺀 사본','맵',[pin('map','Map','record'),pin('key','Key','string')],[pin('return','Map','record')],'map dictionary remove delete 맵 사전 제거'),
  spec('mapFind','Map Find','맵에서 찾기','맵',[pin('map','Map','record'),pin('key','Key','string')],[pin('return','Value','any'),pin('found','Found','bool')],'map dictionary find get 맵 사전 찾기'),
  spec('mapContains','Map Contains','맵에 키가 있는지','맵',[pin('map','Map','record'),pin('key','Key','string')],[pin('return','Contains','bool')],'map dictionary contains has 맵 사전 포함'),
  spec('mapKeys','Map Keys','맵 키 목록','맵',[pin('map','Map','record')],[pin('return','Keys','string',true)],'map dictionary keys 맵 사전 키'),
  spec('mapValues','Map Values','맵 값 목록','맵',[pin('map','Map','record')],[pin('return','Values','any',true)],'map dictionary values 맵 사전 값'),
  spec('mapLength','Map Length','맵 크기','맵',[pin('map','Map','record')],[pin('return','Length','int')],'map dictionary length size count 맵 사전 크기'),
  spec('arrayUnion','Set Union','합집합','배열',[pin('a','A','any',true),pin('b','B','any',true)],[pin('return','Union','any',true)],'set union 집합 합집합'),
  spec('arrayIntersection','Set Intersection','교집합','배열',[pin('a','A','any',true),pin('b','B','any',true)],[pin('return','Intersection','any',true)],'set intersection 집합 교집합'),
  spec('arrayDifference','Set Difference','차집합','배열',[pin('a','A','any',true),pin('b','B','any',true)],[pin('return','Difference','any',true)],'set difference 집합 차집합'),
  spec('arraySort','Array Sort','정렬한 사본','배열',[pin('array','Array','any',true),pin('descending','Descending','bool')],[pin('return','Sorted','any',true)],'sort order array 정렬 순서'),
  spec('arrayMax','Max Of Array','배열 최댓값','배열',[pin('array','Array','any',true)],[pin('return','Max','float'),pin('index','Index','int')],'max array largest 최댓값 최대'),
  spec('arrayMin','Min Of Array','배열 최솟값','배열',[pin('array','Array','any',true)],[pin('return','Min','float'),pin('index','Index','int')],'min array smallest 최솟값 최소'),
  flow('arrayInsert','Array Insert','배열에 끼워 넣기','배열',[pin('array','Array','any',true),pin('item','Item','any'),pin('index','Index','int')]),
  flow('arrayClear','Array Clear','배열 비우기','배열',[pin('array','Array','any',true)]),
  spec('stringToFloat','String To Float','문자열을 실수로','문자열',[pin('value','String','string')],[pin('return','Float','float'),pin('valid','Valid','bool')],'string to float parse number 문자열 숫자 변환'),
  spec('stringToInt','String To Int','문자열을 정수로','문자열',[pin('value','String','string')],[pin('return','Int','int'),pin('valid','Valid','bool')],'string to int parse number 문자열 정수 변환'),
  spec('seededRandom','Random Float From Seed','시드 난수','수학',[pin('seed','Seed','int'),pin('index','Index','int')],[pin('return','Value','float')],'random stream seed deterministic 시드 난수 고정'),
  spec('seededRandomInRange','Random Integer In Range From Seed','시드 정수 난수','수학',[pin('seed','Seed','int'),pin('index','Index','int'),pin('min','Min','int'),pin('max','Max','int')],[pin('return','Value','int')],'random stream seed integer range 시드 정수 난수'),
  spec('getDisplayName','Get Display Name','오브젝트 이름','오브젝트',[pin('target','Object','object')],[pin('return','Name','string')],'display name object 이름'),
  spec('getActorBounds','Get Actor Bounds','오브젝트 경계','오브젝트',[pin('target','Object','object')],[pin('origin','Origin','vec3'),pin('extent','Box Extent','vec3')],'bounds box extent size 경계 크기'),
  spec('getDistanceTo','Get Distance To','오브젝트 사이 거리','오브젝트',[pin('target','Object','object'),pin('other','Other','object')],[pin('return','Distance','float')],'distance to actor 거리'),
  spec('getOverlappingActors','Get Overlapping Actors','겹친 오브젝트 목록','충돌',[pin('target','Object','object')],[pin('return','Actors','object',true)],'overlapping actors overlap list 겹침 목록'),
  spec('isOverlappingActor','Is Overlapping Actor','겹쳐 있는지','충돌',[pin('target','Object','object'),pin('other','Other','object')],[pin('return','Overlapping','bool')],'is overlapping actor overlap 겹침 여부'),
  spec('rinterpTo','RInterp To','회전 보간','벡터',[pin('current','Current','vec3'),pin('target','Target','vec3'),pin('deltaTime','Delta Time','float'),pin('speed','Interp Speed','float')],[pin('return','Rotation','vec3')],'rinterp rotator interp rotation 회전 보간'),
  spec('rinterpToConstant','RInterp To Constant','회전 등속 보간','벡터',[pin('current','Current','vec3'),pin('target','Target','vec3'),pin('deltaTime','Delta Time','float'),pin('speed','Interp Speed','float')],[pin('return','Rotation','vec3')],'rinterp constant rotate towards 회전 등속 목표'),
  spec('getMasterVolume','Get Master Volume','전체 볼륨','오디오',[],[pin('return','Volume','float')],'master volume sound 전체 볼륨 소리'),
  flow('setMasterVolume','Set Master Volume','전체 볼륨 설정','오디오',[pin('volume','Volume','float')]),
  flow('setViewTarget','Set View Target with Blend','카메라 전환','카메라',[pin('target','Camera','object'),pin('blendTime','Blend Time','float')]),
  flow('setFieldOfView','Set Field of View','시야각 설정','카메라',[pin('target','Camera','object'),pin('fov','Field of View','float')]),
  spec('projectWorldToScreen','Project World to Screen','월드 위치를 화면 좌표로','카메라',[pin('world','World Position','vec3')],[pin('return','On Screen','bool'),pin('screen','Screen Position','vec2')],'project world to screen ui marker 화면 좌표 표식'),
  spec('randomUnitVector','Random Unit Vector','무작위 방향','벡터',[],[pin('return','Direction','vec3')],'random direction unit vector 무작위 방향'),
  spec('randomPointInRadius','Random Point in Radius','반경 안 무작위 위치','벡터',[pin('center','Center','vec3'),pin('radius','Radius','float')],[pin('return','Point','vec3')],'random point radius sphere 무작위 위치 반경'),
  spec('arrayShuffle','Array Shuffle','배열 섞은 사본','배열',[pin('array','Array','any',true)],[pin('return','Shuffled','any',true)],'shuffle random order array 섞기 무작위 순서'),
  flow('drawDebugArrow','Draw Debug Arrow','디버그 화살표 그리기','디버그',[pin('start','Start','vec3'),pin('end','End','vec3'),pin('color','Color','vec3'),pin('duration','Duration','float')]),
  spec('isGamePaused','Is Game Paused','게임 일시정지 여부','시간',[],[pin('return','Paused','bool')],'paused pause 일시정지 멈춤'),
  spec('now','Now','현재 날짜와 시각','시간',[],[pin('year','Year','int'),pin('month','Month','int'),pin('day','Day','int'),pin('hour','Hour','int'),pin('minute','Minute','int'),pin('second','Second','int'),pin('text','Text','string')],'now date time clock today 날짜 시각 시계 오늘'),
  spec('formatText','Format Text','문장 만들기','문자열',[pin('format','Format','string'),pin('arg0','{0}','string'),pin('arg1','{1}','string'),pin('arg2','{2}','string'),pin('arg3','{3}','string')],[pin('return','Text','string')],'format text placeholder template 서식 문장 자리'),
  spec('getCurrentScene','Get Current Scene','현재 장면 가져오기','장면',[],[pin('return','Scene','string')],'level map 레벨 맵 current'),
  flow('createWidget','Create Widget','위젯 생성','UI',[pin('class','Widget class','string')],[pin('widget','Widget','object')]),
  flow('addViewport','Add To Viewport','뷰포트에 위젯 추가','UI',[pin('widget','Widget','object')]),
  flow('setText','Set Text','텍스트 설정','UI',[pin('widget','Widget','object'),pin('text','Text','string')]),
  flow('saveGame','Save Game','게임 저장','저장',[pin('slot','Slot','string')],[pin('success','Success','bool')]),
  spec('doesSaveGameExist','Does Save Game Exist','저장 데이터 있는지 확인','저장',[pin('slot','Slot','string')],[pin('return','Exists','bool')],'save slot exists check 세이브 슬롯 존재'),
  spec('getSaveSlotNames','Get Save Slot Names','저장 슬롯 목록','저장',[],[pin('return','Slots','string',true)],'save slot list names 세이브 슬롯 목록'),
  flow('deleteSaveGame','Delete Save Game','저장 데이터 삭제','저장',[pin('slot','Slot','string')],[pin('success','Success','bool')]),
  flow('loadGame','Load Game','게임 불러오기','저장',[pin('slot','Slot','string')],[pin('data','Data','object')])
);
catalog.push(
  spec('doN','Do N','정해진 횟수 실행','흐름 제어',[pin('exec','Enter'),pin('reset','Reset'),pin('count','N','int')],[pin('then','Exit'),pin('counter','Counter','int')]),
  spec('multiGate','Multi Gate','여러 경로 순차 실행','흐름 제어',[pin('exec','Enter'),pin('reset','Reset'),pin('loop','Loop','bool'),pin('random','Random','bool'),pin('startIndex','Start index','int')],[pin('out0','Out 0'),pin('out1','Out 1'),pin('out2','Out 2'),pin('index','Index','int')]),
  spec('whileLoop','While Loop','조건 반복','흐름 제어',[pin('exec','Enter'),pin('condition','Condition','bool')],[pin('body','Loop body'),pin('completed','Completed')]),
  spec('forLoopBreak','For Loop With Break','중단 가능한 반복','흐름 제어',[pin('exec','Enter'),pin('break','Break'),pin('first','First index','int'),pin('last','Last index','int')],[pin('body','Loop body'),pin('index','Index','int'),pin('completed','Completed')]),
  spec('forEachBreak','For Each With Break','중단 가능한 배열 반복','흐름 제어',[pin('exec','Enter'),pin('break','Break'),pin('array','Array','float',true)],[pin('body','Loop body'),pin('item','Item','float'),pin('index','Index','int'),pin('completed','Completed')]),
  flow('retriggerDelay','Retriggerable Delay','다시 시작하는 지연','흐름 제어',[pin('duration','Duration','float')]),
  ...[['switchInt','int','정수'],['switchString','string','문자열']].map(([key,type,ko])=>spec(key,'Switch '+(type==='int'?'Integer':'String'),ko+' 분기','흐름 제어',[pin('exec','Enter'),pin('selection','Selection',type),...Array.from({length:3},(_,i)=>pin('case'+i,'Case '+i,type))],[...Array.from({length:3},(_,i)=>pin('out'+i,'Case '+i)),pin('default','Default')]))
);
catalog.find(s=>s.key==='forEachBreak').arrayType=true;
catalog.find(s=>s.key==='doN').defaults={count:1};
catalog.filter(s=>s.group==='배열'&&s.key!=='arrayLength'||s.key==='forEach').forEach(s=>s.arrayType=true);
catalog.push(
  {key:'windowFocusChanged',title:'On Window Focus Changed',ko:'게임 창 포커스 변경',group:'이벤트',keywords:'window focus lost gained alt tab pause 포커스 창 활성 비활성',kind:'event',inputs:[],outputs:[pin('then','실행'),pin('focused','Focused','bool')]},
  {key:'gamepadConnectionChanged',title:'On Gamepad Connection Changed',ko:'게임패드 연결 변경',group:'이벤트',keywords:'gamepad controller connected disconnected 게임패드 컨트롤러 연결 해제',kind:'event',inputs:[],outputs:[pin('then','실행'),pin('connected','Connected','bool'),pin('index','Gamepad index','int')]},
  {key:'onClicked',title:'On Clicked',ko:'클릭했을 때',group:'이벤트',keywords:'clicked click mouse 클릭 마우스 누름',kind:'event',inputs:[],outputs:[pin('then','실행'),pin('button','Button','string')]},
{key:'beginCursorOver',title:'Begin Cursor Over',ko:'커서가 올라갔을 때',group:'이벤트',keywords:'cursor over hover mouse enter 커서 올림 호버',kind:'event',inputs:[],outputs:[pin('then','실행')]},
{key:'endCursorOver',title:'End Cursor Over',ko:'커서가 벗어났을 때',group:'이벤트',keywords:'cursor over hover mouse leave 커서 벗어남 호버',kind:'event',inputs:[],outputs:[pin('then','실행')]},
{key:'onDeath',title:'On Death',ko:'체력이 0이 됐을 때',group:'이벤트',keywords:'death die health 죽음 사망 체력',kind:'event',inputs:[],outputs:[pin('then','실행'),pin('instigator','Instigator','object')]},
{key:'onAchievementUnlocked',title:'On Achievement Unlocked',ko:'업적 달성했을 때',group:'이벤트',keywords:'achievement unlocked 업적 달성',kind:'event',inputs:[],outputs:[pin('then','실행'),pin('id','Achievement','string')]},
{key:'endPlay',title:'End Play',ko:'게임 종료',group:'이벤트',keywords:'end play 종료 끝',kind:'event',inputs:[],outputs:[pin('then','실행'),pin('reason','Reason','string')]},
  {key:'hitEvent',title:'Event Hit',ko:'충돌 이벤트',group:'이벤트',keywords:'hit collision 충돌 히트',kind:'event',inputs:[],outputs:[pin('then','실행'),pin('other','Other actor','object'),pin('hit','Hit result','hit')]},
  {key:'hitStay',title:'Collision Stay',ko:'충돌 유지',group:'이벤트',keywords:'hit collision stay 접촉 충돌 유지 물리',kind:'event',inputs:[],outputs:[pin('then','실행'),pin('other','Other actor','object'),pin('hit','Hit result','hit'),pin('delta','Fixed delta seconds','float')]},
  {key:'endHit',title:'Collision Exit',ko:'충돌 종료',group:'이벤트',keywords:'hit collision exit end 접촉 충돌 종료 끝',kind:'event',inputs:[],outputs:[pin('then','실행'),pin('other','Other actor','object'),pin('hit','Last contact','hit')]},
  {key:'inputAction',title:'Input Action',ko:'입력 액션 이벤트',group:'이벤트',keywords:'input action ia 입력 액션 started triggered completed',kind:'event',inputs:[],outputs:[pin('started','Started'),pin('triggered','Triggered'),pin('completed','Completed'),pin('ongoing','Ongoing'),pin('canceled','Canceled'),pin('value','Action value','bool'),pin('elapsed','Elapsed seconds','float')]},
  {key:'inputAxis',title:'Input Axis',ko:'축 입력',group:'이벤트',keywords:'input axis 입력 축 이동 마우스',kind:'event',inputs:[],outputs:[pin('then','실행'),pin('value','Axis value','float')]},
  {key:'anyDamage',title:'Any Damage',ko:'피해 이벤트',group:'이벤트',keywords:'damage hit 피해 데미지',kind:'event',inputs:[],outputs:[pin('then','실행'),pin('damage','Damage','float'),pin('instigator','Instigator','object')]},
  spec('makeColor','Make Color','색상 만들기','수학',[pin('r','R','float'),pin('g','G','float'),pin('b','B','float'),pin('a','A','float')],[pin('return','Color','color')])
);
for(const entry of [...coreApi,...serviceApi]){const existing=catalog.find(n=>n.key===entry.key);if(existing)Object.assign(existing,entry,{keywords:(existing.keywords||'')+' '+entry.keywords});else catalog.push(entry);}
catalog.push(
 spec('makeStruct','Make Struct','구조체 만들기','구조체',[],[],'make vector transform color hit result 구조체 생성'),
 spec('breakStruct','Break Struct','구조체 풀기','구조체',[],[],'break vector transform color hit result 구조체 분해'),
 spec('setMembers','Set Members in Struct','구조체 멤버 설정','구조체',[],[],'set members struct field reference 구조체 필드 선택 수정'),
 spec('selectValue','Select Value','자료형별 값 선택','논리',[],[],'select bool int vector color transform array 값 선택'),
 spec('switchName','Switch on Name','이름 분기','흐름 제어',[],[],'switch name 이름 대소문자 분기')
);
for(const s of catalog){if(isStructNode(s)){s.inputs=structPins({key:s.key},'in');s.outputs=structPins({key:s.key},'out');s.pure=s.key!=='setMembers';}else if(s.key==='selectValue'){s.inputs=[pin('condition','Condition','bool'),pin('a','True value','float'),pin('b','False value','float')];s.outputs=[pin('return','Value','float')];s.pure=true;}else if(s.key==='switchName'){s.inputs=[pin('exec','Enter'),pin('selection','Selection','string')];s.outputs=[pin('default','Default')];}}
const catalogByKey=new Map(catalog.map(node=>[node.key,node]));
export function defaultInputValue(n,p){return n.inputValues?.[p.id]??catalogByKey.get(n.key)?.defaults?.[p.id]??p.default??(p.array?[]:defaultsFor(p.type));}
export function basePins(node,direction,graph){return rawPins(node,direction,graph).map(pin=>annotateNativeRecordPin(graph?.native,pin.type==='record'&&!pin.structName&&node.structName?{...pin,structName:node.structName}:pin));}
function rawPins(node,direction,graph){
  const structure=structPins(node,direction,graph?.native);if(structure)return structure;
  if(node.key==='selectValue'){const type=node.valueType||'float',array=node.array||false;return direction==='in'?[pin('condition','Condition','bool'),pin('a','True value',type,array),pin('b','False value',type,array)]:[pin('return','Value',type,array)];}
  const flow=dynamicFlowPins(node,direction);if(flow){const definition=node.key==='switchInt'&&nativeEnumDefinition(graph.native,node);if(definition)return flow.map(p=>p.id==='selection'?{...p,enumName:definition.name,enumInfo:definition}:p.type==='exec'&&Object.hasOwn(node.caseValues||{},p.id)?{...p,label:definition.entries.find(entry=>!entry.hidden&&entry.value===node.caseValues[p.id])?.label||p.label}:p);return flow;}
  if(node.key==='parentEntry')return basePins({...node,key:node.parentKey},direction,graph);
  if(node.key==='callParent'){
    const d=(graph.functions||[]).find(d=>d.id===node.parentDefinitionId);if(d)return direction==='in'?d.inputs:d.outputs;
    const entry=[...(graph.parentNodes||graph.nodes),...((graph.parentConstruction||graph.construction)?.nodes||[])].find(n=>n.id===node.parentEntryId);const data=entry?basePins(entry,'out',graph).filter(p=>p.type!=='exec'):[];
    return direction==='in'?[pin('exec','실행'),...data]:[pin('then','다음')];
  }
  if(node.key==='inputAction')return direction==='in'?[]:catalog.find(s=>s.key==='inputAction').outputs.map(p=>p.id==='value'?{...p,type:node.valueType||'bool'}:p);
  if(node.key==='timeline'){const s=catalog.find(s=>s.key==='timeline');return direction==='in'?s.inputs:[...s.outputs,...(node.timeline?.tracks||[]).map(t=>pin(t.id,t.name,t.type==='event'?'exec':t.type))];}
  if(node.key==='reroute')return [pin('value',direction==='in'?'Input':'Output',node.valueType||'float',node.array??false)];
  if(node.key.startsWith('native'))return nativePins(graph,node,direction);
  if(['dispatcherCall','dispatcherBind','dispatcherUnbind','dispatcherEvent','interfaceCall'].includes(node.key)){
    const d=[...(graph.dispatchers||[]),...(graph.interfaces||[])].find(d=>d.id===node.symbolId);if(!d)return [];
    const target=pin('target','Target','object');
    if(node.key==='dispatcherEvent')return direction==='out'?[pin('then','실행'),...d.inputs]:[];
    if(node.key==='dispatcherBind'||node.key==='dispatcherUnbind')return direction==='in'?[pin('exec','실행'),target,pin('event','Event name','string')]:[pin('then','다음')];
    return direction==='in'?[pin('exec','실행'),target,...d.inputs]:[pin('then','다음'),...(d.outputs||[])];
  }
  if(['callFunction','callMacro','functionInput','functionOutput','macroInput','macroOutput'].includes(node.key)){
    const definition=[...(graph.functions||[]),...(graph.macros||[])].find(d=>d.id===node.definitionId);if(!definition)return [];
    if(node.key.endsWith('Input'))return direction==='out'?definition.inputs:[];
    if(node.key.endsWith('Output'))return direction==='in'?definition.outputs:[];
    return direction==='in'?definition.inputs:definition.outputs;
  }
  if(node.key==='getVariable'||node.key==='setVariable'){const v=graph.variables.find(v=>v.id===node.variableId);if(!v)return [];const value={...pin('value',v.name,v.type,v.container==='array'),...(v.structName?{structName:v.structName}:{}),...(v.enumName?{enumName:v.enumName,enumInfo:nativeEnumDefinition(graph.native,v)}:{})};return node.key==='getVariable'?(direction==='out'?[value]:[]):direction==='in'?[pin('exec','실행'),value]:[pin('then','다음')];}
  const s=catalog.find(s=>s.key===node.key);return [...(s?.[direction==='out'?'outputs':'inputs']||[]).map(p=>s.arrayType&&p.type==='float'?{...p,type:node.valueType||'float',...(node.valueType==='record'?{structName:node.structName}:{})}:p),...(direction==='out'?node.customOutputs:node.customInputs)||[]];
}
export function structFieldPins(node,p,graph){const value=defaultInputValue(node,p);return fieldsFor(p.type,p.structInfo,graph?.native).map((f,i)=>({...f,id:p.id+'.'+f.id,parent:p.id,default:Array.isArray(value)?value[i]:value?.[f.id]??defaultsFor(f.type)}));}
export function effectivePins(node,direction,graph){
  const expand=p=>!p.array&&(node.splitPins||[]).includes(direction+':'+p.id)&&fieldsFor(p.type,p.structInfo,graph?.native).length?structFieldPins(node,p,graph).flatMap(expand): [p];
  return basePins(node,direction,graph).flatMap(expand);
}
function pinForId(node,direction,graph,id){const parts=id.split('.'),first=parts.shift();let p=basePins(node,direction,graph).find(p=>p.id===first);for(const field of parts)p=p&&structFieldPins(node,p,graph).find(f=>f.id===p.id+'.'+field);return p;}
export function canConnect(graph,from,to){

  const a=graph.nodes.find(n=>n.id===from.node),b=graph.nodes.find(n=>n.id===to.node);const out=a&&effectivePins(a,'out',graph).find(p=>p.id===from.pin),input=b&&effectivePins(b,'in',graph).find(p=>p.id===to.pin);
  if(!out||!input)return {ok:false,reason:'연결할 핀을 찾을 수 없어요.'};
  if(out.enumName&&input.enumName&&out.enumName!==input.enumName)return {ok:false,reason:'서로 다른 enum이에요: '+out.enumName+' → '+input.enumName};
  if(out.type==='record'&&input.type==='record'&&out.structName&&input.structName&&out.structName!==input.structName)return {ok:false,reason:'서로 다른 구조체예요: '+out.structName+' → '+input.structName};
  if(out.array!==input.array||(out.type!==input.type&&out.type!=='any'&&input.type!=='any'))return {ok:false,reason:`타입이 달라요: ${out.type}${out.array?'[]':''} → ${input.type}${input.array?'[]':''}`};
  if(out.type==='exec'&&input.type==='exec'&&['break','reset','open','close','toggle'].includes(to.pin))return {ok:true};
  if(from.node===to.node)return {ok:false,reason:'같은 노드에는 연결할 수 없어요.'};
  const reaches=(id,seen=new Set())=>{if(id===from.node)return true;if(seen.has(id))return false;seen.add(id);return graph.edges.filter(e=>e.from.node===id&&!['break','reset','open','close','toggle'].includes(e.to.pin)).some(e=>reaches(e.to.node,seen));};
  if(reaches(to.node))return {ok:false,reason:'이 프로토타입에서는 순환 연결을 지원하지 않아요.'};return {ok:true};
}
export function connect(graph,from,to){const result=canConnect(graph,from,to);if(!result.ok)return result;const output=effectivePins(graph.nodes.find(n=>n.id===from.node),'out',graph).find(p=>p.id===from.pin),input=effectivePins(graph.nodes.find(n=>n.id===to.node),'in',graph).find(p=>p.id===to.pin);graph.edges=graph.edges.filter(e=>!(input.type!=='exec'&&e.to.node===to.node&&e.to.pin===to.pin)&&!(output.type==='exec'&&e.from.node===from.node&&e.from.pin===from.pin));graph.edges.push({from:{...from},to:{...to}});return result;}
export function splitPin(graph,nodeId,direction,pinId,recombine=false){
 const n=graph.nodes.find(n=>n.id===nodeId);if(!n)return false;const pins=effectivePins(n,direction,graph),p=pins.find(p=>p.id===pinId)||pinForId(n,direction,graph,pinId),key=direction+':'+pinId;
 if(!p||p.array||!fieldsFor(p.type,p.structInfo,graph.native).length)return false;const previous=n.splitPins||[],read=pin=>{if(!previous.includes('in:'+pin.id))return structuredClone(defaultInputValue(n,pin));const fields=structFieldPins(n,pin,graph),values=fields.map(read);return ['vec2','vec3','color'].includes(pin.type)?values:Object.fromEntries(fields.map((f,i)=>[f.id.slice(f.id.lastIndexOf('.')+1),values[i]]));},value=direction==='in'?read(p):undefined;
 n.splitPins=recombine?previous.filter(k=>k!==key&&!k.startsWith(key+'.')):previous.includes(key)?previous:[...previous,key];
 if(direction==='in'){n.inputValues??={};if(recombine){n.inputValues[pinId]=value;for(const id of Object.keys(n.inputValues))if(id.startsWith(pinId+'.'))delete n.inputValues[id];}else for(const field of structFieldPins(n,p,graph))n.inputValues[field.id]=structuredClone(defaultInputValue(n,field));}
 graph.edges=graph.edges.filter(e=>{const end=direction==='out'?e.from:e.to;return !(end.node===nodeId&&(end.pin===pinId||end.pin.startsWith(pinId+'.')));});return true;
}

export const defaultTimeline={length:1,loop:false,autoplay:false,playRate:1,lastKeyframe:false,ignoreTimeDilation:false,tracks:[{id:'Alpha',name:'Alpha',type:'float',interpolation:'linear',keys:[{time:0,value:0},{time:1,value:1}]}]};
export const curveModes=['auto','clampedAuto','user','break','linear','constant','step'];
export function validTimeline(t){
  return t&&Number.isFinite(t.length)&&t.length>0&&t.length<=10000&&typeof t.loop==='boolean'&&typeof t.autoplay==='boolean'&&['lastKeyframe','ignoreTimeDilation'].every(k=>t[k]===undefined||typeof t[k]==='boolean')&&(t.playRate===undefined||Number.isFinite(t.playRate)&&t.playRate>0&&t.playRate<=100)&&Array.isArray(t.tracks)&&t.tracks.length<=16&&new Set(t.tracks.map(t=>t?.id)).size===t.tracks.length&&t.tracks.every(track=>track&&/^[A-Za-z_][A-Za-z0-9_]{0,79}$/.test(track.id)&&!['update','finished','direction'].includes(track.id)&&typeof track.name==='string'&&track.name.length<=80&&['float','vec3','color','event'].includes(track.type)&&(track.type==='event'||curveModes.includes(track.interpolation))&&validCurveInfinity(track,track.type!=='event')&&Array.isArray(track.keys)&&track.keys.length<=128&&track.keys.every((k,i)=>k&&Number.isFinite(k.time)&&k.time>=0&&k.time<=t.length&&(!i||track.keys[i-1].time<k.time)&&(track.type==='event'||validValue(track.type,k.value))&&(k.interpolation===undefined||curveModes.includes(k.interpolation))&&['arriveTangent','leaveTangent'].every(p=>k[p]===undefined||validValue(track.type,k[p]))&&validCurveWeights(k,track.type==='event'?undefined:k.value)));
}
export function timelineLength(t){return t.lastKeyframe?Math.max(.001,...t.tracks.flatMap(track=>track.keys.map(k=>k.time))):t.length;}
export function sampleTimeline(track,time){
  if(track.type==='event')return undefined;if(!track.keys.length)return defaultsFor(track.type);const outside=sampleCurveOutside(track.keys,time,track,track.interpolation||'auto');if(outside!==undefined)return outside;
  let lo=0,hi=track.keys.length;while(lo<hi){const mid=(lo+hi)>>>1;if(track.keys[mid].time<=time)lo=mid+1;else hi=mid;}const i=lo-1;if(i<0)return structuredClone(track.keys[0].value);return sampleCurveSegment(track.keys,i,time,track.interpolation||'auto');
}
export function makeNode(key,x=40,y=40,variableId){return {id:'node_'+crypto.randomUUID().replaceAll('-',''),key,position:{x,y},splitPins:[],...(isFlowNode({key})?{flowOutputs:key==='sequence'?['first','second']:isSwitchNode({key})?[]:['out0','out1','out2'],...(isSwitchNode({key})?{caseValues:{}}:{})}:{}),...(variableId?{variableId}:{}),...(isStructNode({key})?{valueType:'transform',...(key==='setMembers'?{memberPins:[]}:{})}:{}),...(key==='timeline'?{timeline:JSON.parse(JSON.stringify(defaultTimeline))}:{})};}
export function nodeTitle(n,graph){const v=graph.variables.find(v=>v.id===n.variableId),d=[...(graph.functions||[]),...(graph.macros||[])].find(d=>d.id===n.definitionId),native=n.key.startsWith('native')?nativeMember(graph,n):null,s=[...(graph.dispatchers||[]),...(graph.interfaces||[])].find(d=>d.id===n.symbolId);return n.title||(n.key==='switchInt'&&n.enumName?'Switch '+(nativeEnumDefinition(graph.native,n)?.label||n.enumName):isStructNode(n)?(n.key==='makeStruct'?'Make ':n.key==='breakStruct'?'Break ':'Set Members in ')+(nativeRecordDefinition(graph.native,n)?.label||structTypes[structNodeType(n)]||n.structName):n.key==='selectValue'?'Select '+variableTypes[n.valueType||'float'].split(' · ')[0]+(n.array?'[]':''):native?(n.key==='nativeGet'?'Get ':n.key==='nativeSet'?'Set ':n.key==='nativeEvent'?'Event ':'')+(n.key==='nativeMembers'?'Members · '+native.c?.name:native.f?.label||native.p?.name||'C++'):s?({dispatcherCall:'Call ',dispatcherBind:'Bind ',dispatcherUnbind:'Unbind ',dispatcherEvent:'Event ',interfaceCall:'Message '}[n.key])+s.name:n.key.endsWith('Input')?'Entry · 입력':n.key.endsWith('Output')?'Return · 출력':d?.name||((n.key==='getVariable'?'Get ':n.key==='setVariable'?'Set ':'')+(v?.name||catalog.find(s=>s.key===n.key)?.title||'Node')));}
export const defaultBlueprint={version:1,name:'BP_Garden',components:[{id:'transform',name:'Transform',type:'Transform'},{id:'mesh',name:'Mesh renderer',type:'MeshRenderer'},{id:'collider',name:'Box collider',type:'BoxCollider'}],variables:[
  {id:'hasKey',name:'hasKey',type:'bool',container:'single',value:false},{id:'doorName',name:'doorName',type:'string',container:'single',value:'GardenDoor'},
  {id:'targetPosition',name:'targetPosition',type:'vec3',container:'single',value:[0,0,0]},{id:'speed',name:'speed',type:'float',container:'single',value:3},{id:'waypoints',name:'waypoints',type:'vec3',container:'array',value:[[0,0,0],[1,0,1]]}],
  nodes:[{id:'begin',key:'beginPlay',position:{x:28,y:30},splitPins:[]},{id:'print',key:'print',position:{x:270,y:30},splitPins:[]},{id:'overlap',key:'beginOverlap',position:{x:28,y:205},splitPins:[]},{id:'branch',key:'branch',position:{x:270,y:205},splitPins:[]},{id:'door',key:'door',position:{x:512,y:205},splitPins:[]},{id:'tick',key:'tick',position:{x:28,y:410},splitPins:[]},{id:'location',key:'location',position:{x:512,y:410},splitPins:[]},{id:'getKey',key:'getVariable',variableId:'hasKey',position:{x:270,y:395},splitPins:[]}],
  edges:[{from:{node:'begin',pin:'then'},to:{node:'print',pin:'exec'}},{from:{node:'overlap',pin:'then'},to:{node:'branch',pin:'exec'}},{from:{node:'branch',pin:'true'},to:{node:'door',pin:'exec'}},{from:{node:'getKey',pin:'value'},to:{node:'branch',pin:'condition'}}],
  functions:[],macros:[],comments:[],construction:{nodes:[{id:'construction',key:'construction',position:{x:28,y:50},splitPins:[]}],edges:[],comments:[]}
};
// Earlier asset creation copied this exact example, including its implicit zero
// location. Only the unedited generated graph is removed from the runtime copy.
export function legacyTemplateConstruction(graph){
  const template={nodes:[{id:'construction',key:'construction',position:{x:28,y:50},splitPins:[]},{id:'setup',key:'setPosition',position:{x:290,y:50},splitPins:[]}],edges:[{from:{node:'construction',pin:'then'},to:{node:'setup',pin:'exec'}}],comments:[]};
  const same=(a,b)=>{if(Object.is(a,b))return true;if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(k=>Object.hasOwn(b,k)&&same(a[k],b[k]));};return same(graph,template);
}
// A view shares metadata, but writes node/link changes back to its own saved graph.
export function graphContext(root,view='event'){
  const target=view==='event'?root:view==='construction'?root.construction:[...(root.functions||[]),...(root.macros||[])].find(d=>d.id===view)?.graph;
  if(!target)return root;if(target===root)return root;
  return {variables:root.variables,components:root.components,functions:root.functions,macros:root.macros,native:root.native,settings:root.settings,inheritance:root.inheritance,parentNodes:root.nodes,parentConstruction:root.construction,dispatchers:root.dispatchers,interfaces:root.interfaces,get nodes(){return target.nodes;},set nodes(v){target.nodes=v;},get edges(){return target.edges;},set edges(v){target.edges=v;},get comments(){return target.comments||[];},set comments(v){target.comments=v;}};
}
export function allGraphContexts(root){return ['event',...(root.construction?['construction']:[]),...(root.functions||[]).map(d=>d.id),...(root.macros||[]).map(d=>d.id)].map(v=>graphContext(root,v));}
export function blueprintGraphView(root,graph){if(graph.nodes===root.nodes)return 'event';if(graph.nodes===root.construction?.nodes)return 'construction';const d=[...(root.functions||[]),...(root.macros||[])].find(d=>d.graph.nodes===graph.nodes);if(!d)throw Error('그래프의 소유 문서를 확인하세요.');return d.id;}
export function cloneCollapsedDefinitions(root,nodes,extra=[]){
 const definitions=new Map([...(root.macros||[]),...(Array.isArray(extra)?extra:[])].map(d=>[d.id,d])),names=new Set([...(root.functions||[]),...(root.macros||[])].map(d=>d.name));root.macros??=[];
 const visit=(node,stack=[])=>{const source=definitions.get(node.definitionId);if(node.key!=='callMacro'||!source?.collapsed)return;if(stack.includes(source.id)||stack.length>=32)throw Error('접힌 그래프 순환 또는 깊이 제한 초과');const d=structuredClone(source),id='def_'+crypto.randomUUID().replaceAll('-',''),ids=new Map(d.graph.nodes.map(n=>[n.id,makeNode(n.key).id]));d.id=id;let suffix=1,name;do{name=source.name.slice(0,65)+' Copy'+(suffix===1?'':' '+suffix);suffix++;}while(names.has(name));d.name=name;names.add(name);
  for(const n of d.graph.nodes){n.id=ids.get(n.id);if(['macroInput','macroOutput'].includes(n.key)&&n.definitionId===source.id)n.definitionId=id;else visit(n,[...stack,source.id]);}
  d.graph.edges=d.graph.edges.map(e=>({from:{...e.from,node:ids.get(e.from.node)},to:{...e.to,node:ids.get(e.to.node)}}));d.graph.comments=(d.graph.comments||[]).map(c=>({...c,id:'comment_'+crypto.randomUUID().replaceAll('-',''),nodeIds:c.nodeIds.map(n=>ids.get(n)).filter(Boolean)}));root.macros.push(d);node.definitionId=id;
 };for(const n of nodes)visit(n);
}
export function blueprintClipboard(root,graph,ids){const selected=new Set(ids),nodes=graph.nodes.filter(n=>selected.has(n.id)&&!n.key.endsWith('Input')&&!n.key.endsWith('Output')&&n.key!=='construction'),kept=new Set(nodes.map(n=>n.id)),definitions=[],seen=new Set();const collect=nodes=>{for(const n of nodes){const d=root.macros?.find(d=>n.key==='callMacro'&&d.id===n.definitionId&&d.collapsed);if(!d||seen.has(d.id))continue;seen.add(d.id);definitions.push(d);collect(d.graph.nodes);}};collect(nodes);return structuredClone({nodes,edges:graph.edges.filter(e=>kept.has(e.from.node)&&kept.has(e.to.node)),collapsedDefinitions:definitions});}
export function pasteNodes(root,view,clipboard,position){
  if(!clipboard||!Array.isArray(clipboard.nodes)||!clipboard.nodes.length||!Array.isArray(clipboard.edges))return {ok:false,reason:'복사한 노드가 없어요.'};
  const candidate=JSON.parse(JSON.stringify(root)),graph=graphContext(candidate,view);if(graph.nodes.length+clipboard.nodes.length>1000)return {ok:false,reason:'그래프의 노드 1000개 제한이에요.'};
  const ids=new Map(),left=Math.min(...clipboard.nodes.map(n=>n.position.x)),top=Math.min(...clipboard.nodes.map(n=>n.position.y));
  const nodes=clipboard.nodes.map(n=>{const next=JSON.parse(JSON.stringify(n));next.id=makeNode(n.key).id;ids.set(n.id,next.id);next.position={x:Math.max(-10000,Math.min(10000,position.x+n.position.x-left)),y:Math.max(-10000,Math.min(10000,position.y+n.position.y-top))};return next;});
  try{cloneCollapsedDefinitions(candidate,nodes,clipboard.collapsedDefinitions);}catch(error){return {ok:false,reason:error.message};}graph.nodes.push(...nodes);graph.edges.push(...clipboard.edges.map(e=>({from:{node:ids.get(e.from.node),pin:e.from.pin},to:{node:ids.get(e.to.node),pin:e.to.pin}})));
  if(!validBlueprint(candidate,{resolved:!!candidate.inheritance}))return {ok:false,reason:'이 그래프의 타입·이벤트·함수 규칙에 맞지 않는 노드예요.'};
  const original=graphContext(root,view);original.nodes=graph.nodes;original.edges=graph.edges;const known=new Set((root.macros||[]).map(d=>d.id));root.macros??=[];root.macros.push(...candidate.macros.filter(d=>!known.has(d.id)));return {ok:true,nodes};
}
export function makeDefinition(root,kind,name){
  if(!['function','macro'].includes(kind)||!name?.trim()||name.length>80||[...(root.functions||[]),...(root.macros||[])].some(d=>d.name===name.trim()))return {ok:false,reason:'이름을 확인하세요.'};
  const id='def_'+crypto.randomUUID().replaceAll('-',''),entry={...makeNode(kind+'Input',35,50),definitionId:id},exit={...makeNode(kind+'Output',370,50),definitionId:id};
  const definition={id,name:name.trim(),inputs:[pin('exec','실행')],outputs:[pin('then','다음')],graph:{nodes:[entry,exit],edges:[{from:{node:entry.id,pin:'exec'},to:{node:exit.id,pin:'then'}}],comments:[]}};
  root[kind==='function'?'functions':'macros']??=[];root[kind==='function'?'functions':'macros'].push(definition);return {ok:true,definition};
}
export function makeComment(graph,ids,position={x:40,y:40}){
  const nodes=graph.nodes.filter(n=>ids.includes(n.id)),left=nodes.length?Math.min(...nodes.map(n=>n.position.x))-25:position.x,top=nodes.length?Math.min(...nodes.map(n=>n.position.y))-35:position.y;
  return {id:'comment_'+crypto.randomUUID().replaceAll('-',''),text:'주석',position:{x:Math.max(-10000,left),y:Math.max(-10000,top)},size:{width:nodes.length?Math.min(10000,Math.max(...nodes.map(n=>n.position.x+205))-left):360,height:nodes.length?Math.min(10000,Math.max(...nodes.map(n=>n.position.y+85+Math.max(effectivePins(n,'in',graph).length,effectivePins(n,'out',graph).length)*27))-top):190},color:'#657b59',fontSize:14,moveNodes:true,nodeIds:nodes.map(n=>n.id)};
}
// Derived inspection tables belong to native metadata, not persisted tunnels.
function storedTunnelPin(pin,id){const {structInfo,enumInfo,maskInfo,parent,...stored}=pin;return {...stored,id};}
export function collapseNodes(root,graph,ids,kind,name,viewHint){
  if(!Array.isArray(ids)||ids.some(id=>root.inheritance?.inherited.nodes.includes(id)))return {ok:false,reason:'상속된 노드는 부모 블루프린트에서 편집하세요.'};const collapsed=kind==='graph';if(collapsed)kind='macro';const view=viewHint??blueprintGraphView(root,graph);
  const selected=new Set(ids),nodes=graph.nodes.filter(n=>selected.has(n.id));
  if(!['function','macro'].includes(kind)||!name?.trim()||name.length>80)return {ok:false,reason:'이름을 1~80자로 입력하세요.'};
  if(!nodes.length)return {ok:false,reason:'먼저 묶을 노드를 선택하세요.'};
  if(nodes.some(n=>catalog.find(s=>s.key===n.key)?.kind==='event'||['nativeEvent','dispatcherEvent'].includes(n.key)||n.key.endsWith('Input')||n.key.endsWith('Output')))return {ok:false,reason:'이벤트와 Entry / Return은 묶음 밖에 두세요.'};
  if(kind==='function'&&nodes.some(n=>['delay','retriggerDelay'].includes(n.key)||n.key==='callMacro'&&!(root.macros||[]).find(d=>d.id===n.definitionId)?.collapsed))return {ok:false,reason:'Delay·매크로 호출이 있는 흐름은 매크로로 묶어주세요.'};
  if([...(root.functions||[]),...(root.macros||[])].some(d=>d.name===name.trim()))return {ok:false,reason:'이미 있는 함수·매크로 이름이에요.'};
  const incoming=graph.edges.filter(e=>!selected.has(e.from.node)&&selected.has(e.to.node)),outgoing=graph.edges.filter(e=>selected.has(e.from.node)&&!selected.has(e.to.node));
  const inputs=[],outputs=[],inputMap=new Map(),outputMap=new Map(),execInputs=new Map();
  for(const e of incoming){const key=e.from.node+':'+e.from.pin;if(!inputMap.has(key)){const p=effectivePins(graph.nodes.find(n=>n.id===e.to.node),'in',graph).find(p=>p.id===e.to.pin);const destination=e.to.node+':'+e.to.pin,shared=p.type==='exec'?execInputs.get(destination):null;if(shared){inputMap.set(key,shared);continue;}const port=storedTunnelPin(p,'in'+inputs.length);delete port.parent;inputs.push(port);inputMap.set(key,port.id);if(p.type==='exec')execInputs.set(destination,port.id);}}
  for(const e of outgoing){const key=e.from.node+':'+e.from.pin;if(!outputMap.has(key)){const p=effectivePins(graph.nodes.find(n=>n.id===e.from.node),'out',graph).find(p=>p.id===e.from.pin);const port=storedTunnelPin(p,'out'+outputs.length);delete port.parent;outputs.push(port);outputMap.set(key,port.id);}}
  // Open ports make a newly collapsed group useful even before wiring it externally.
  for(const n of nodes)for(const direction of ['in','out'])for(const p of effectivePins(n,direction,graph)){
    const connected=graph.edges.some(e=>{const end=direction==='in'?e.to:e.from;return end.node===n.id&&end.pin===p.id;});if(connected)continue;
    const ports=direction==='in'?inputs:outputs,map=direction==='in'?inputMap:outputMap,key=n.id+':'+p.id,port=storedTunnelPin(p,(direction==='in'?'in':'out')+ports.length);delete port.parent;if(direction==='in'&&p.type!=='exec')port.default=structuredClone(defaultInputValue(n,p));ports.push(port);map.set(key,port.id);
  }
  if(inputs.length>30||outputs.length>30)return {ok:false,reason:'묶음의 입력·출력은 각각 30개까지 지원해요.'};
  if(kind==='function'&&(inputs.filter(p=>p.type==='exec').length>1||outputs.filter(p=>p.type==='exec').length>1))return {ok:false,reason:'여러 실행 입출력이 있는 흐름은 매크로로 묶어주세요.'};
  const id='def_'+crypto.randomUUID().replaceAll('-',''),x=Math.min(...nodes.map(n=>n.position.x)),y=Math.min(...nodes.map(n=>n.position.y));
  const inside=nodes.map(n=>({...structuredClone(n),position:{x:Math.min(10000,n.position.x-x+260),y:Math.min(10000,n.position.y-y+40)}})),right=Math.max(...inside.map(n=>n.position.x))+250;
  const entry={...makeNode(kind+'Input',30,40),definitionId:id},exit={...makeNode(kind+'Output',Math.min(10000,right),40),definitionId:id};
  const edges=graph.edges.filter(e=>selected.has(e.from.node)&&selected.has(e.to.node)).map(e=>structuredClone(e));
  for(const e of incoming){const pin=inputMap.get(e.from.node+':'+e.from.pin);if(!edges.some(edge=>edge.from.node===entry.id&&edge.from.pin===pin&&edge.to.node===e.to.node&&edge.to.pin===e.to.pin))edges.push({from:{node:entry.id,pin},to:{...e.to}});}
  for(const e of outgoing)if(!edges.some(x=>x.to.node===exit.id&&x.to.pin===outputMap.get(e.from.node+':'+e.from.pin)))edges.push({from:{...e.from},to:{node:exit.id,pin:outputMap.get(e.from.node+':'+e.from.pin)}});
  for(const n of nodes)for(const p of effectivePins(n,'in',graph)){const port=inputMap.get(n.id+':'+p.id);if(port)edges.push({from:{node:entry.id,pin:port},to:{node:n.id,pin:p.id}});}
  for(const n of nodes)for(const p of effectivePins(n,'out',graph)){const port=outputMap.get(n.id+':'+p.id);if(port&&!edges.some(e=>e.to.node===exit.id&&e.to.pin===port))edges.push({from:{node:n.id,pin:p.id},to:{node:exit.id,pin:port}});}
  const definition={id,name:name.trim(),inputs,outputs,...(collapsed?{collapsed:true}:{}),pure:![...inputs,...outputs].some(p=>p.type==='exec'),graph:{nodes:[entry,...inside,exit],edges,comments:[]}};
  const call={...makeNode(kind==='function'?'callFunction':'callMacro',x,y),definitionId:id,inputValues:Object.fromEntries(inputs.filter(p=>p.type!=='exec'&&p.default!==undefined).map(p=>[p.id,structuredClone(p.default)]))};
  const rewired=graph.edges.filter(e=>!selected.has(e.from.node)&&!selected.has(e.to.node));
  for(const e of incoming)if(!rewired.some(x=>x.to.node===call.id&&x.to.pin===inputMap.get(e.from.node+':'+e.from.pin)&&x.from.node===e.from.node&&x.from.pin===e.from.pin))rewired.push({from:{...e.from},to:{node:call.id,pin:inputMap.get(e.from.node+':'+e.from.pin)}});
  for(const e of outgoing)rewired.push({from:{node:call.id,pin:outputMap.get(e.from.node+':'+e.from.pin)},to:{...e.to}});
  const candidate={...graph,nodes:graph.nodes.filter(n=>!selected.has(n.id)).concat(call),edges:rewired,functions:[...(root.functions||[]),...(kind==='function'?[definition]:[])],macros:[...(root.macros||[]),...(kind==='macro'?[definition]:[])]};
  if(candidate.edges.some(e=>!canConnect({...candidate,edges:candidate.edges.filter(x=>x!==e)},e.from,e.to).ok))return {ok:false,reason:'선택 사이의 외부 노드 때문에 순환 연결이 생겨요. 중간 노드도 함께 선택하세요.'};
  const staged=structuredClone(root),target=graphContext(staged,view),collection=kind==='function'?'functions':'macros';staged[collection]??=[];staged[collection].push(definition);target.nodes=target.nodes.filter(n=>!selected.has(n.id)).concat(call);const ownedNodes=new Set(graph.nodes.map(n=>n.id));target.edges=target.edges.filter(e=>!ownedNodes.has(e.from.node)||!ownedNodes.has(e.to.node)).concat(rewired);const comments=graph.comments||[],moved=comments.filter(c=>c.nodeIds.length&&c.nodeIds.every(id=>selected.has(id)));definition.graph.comments=moved.map(c=>({...structuredClone(c),position:{x:Math.max(-10000,Math.min(10000,c.position.x-x+260)),y:Math.max(-10000,Math.min(10000,c.position.y-y+40))}}));const ownComments=comments.filter(c=>!moved.includes(c)).map(c=>({...structuredClone(c),nodeIds:c.nodeIds.some(id=>selected.has(id))?[...new Set([...c.nodeIds.filter(id=>!selected.has(id)),call.id])]:[...c.nodeIds]}));const ownedComments=new Set(comments.map(c=>c.id));target.comments=(target.comments||[]).filter(c=>!ownedComments.has(c.id)).concat(ownComments);if(staged.watches)staged.watches=staged.watches.map(w=>w.view===view&&selected.has(w.node)?{...w,view:id}:w);if(!validBlueprint(staged,{resolved:!!staged.inheritance}))return {ok:false,reason:'묶음의 타입·기본값·실행·함수 규칙을 확인하세요.'};root[collection]??=[];root[collection].push(definition);graph.nodes=graph.nodes.filter(n=>!selected.has(n.id)).concat(call);graph.edges=rewired;graph.comments=ownComments;if(staged.watches)root.watches=staged.watches;
  return {ok:true,definition,call};
}
const safeId=s=>typeof s==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(s);
export const isBlueprintParent=s=>typeof s==='string'&&s.startsWith('Assets/')&&s.endsWith('.hbblueprint.json')&&s.length<=1000&&!/[\\:\x00-\x1f]/.test(s)&&s.split('/').every(p=>p&&p!=='.'&&p!=='..');
export function boundedBlueprintValue(value,budget={left:200000},depth=0){if(--budget.left<0||depth>(budget.maximumDepth??6))return false;if(value===null||typeof value==='boolean')return true;if(typeof value==='number')return Number.isFinite(value);if(typeof value==='string')return value.length<=100000;if(Array.isArray(value))return value.length<=65536&&value.every(v=>boundedBlueprintValue(v,budget,depth+1));return !!value&&typeof value==='object'&&Object.keys(value).length<=128&&Object.entries(value).every(([k,v])=>k.length<=200&&!['__proto__','prototype','constructor'].includes(k)&&boundedBlueprintValue(v,budget,depth+1));}
export function validBlueprint(g,{resolved=false}={}){
  if(g?.inheritance!==undefined&&!resolved)return false;
  const deferred=(isBlueprintParent(g?.settings?.parentClass)||validNativeReference(g?.native))&&!resolved;
  const unresolvedNode=n=>deferred&&(isStructNode(n)&&n.valueType==='record'&&typeof n.structName==='string'||['getVariable','setVariable'].includes(n.key)&&safeId(n.variableId)&&!g.variables.some(v=>v.id===n.variableId)||['nativeCall','nativeEvent','nativeGet','nativeSet','nativeMembers'].includes(n.key)&&typeof n.nativeId==='string'&&/^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?$/.test(n.nativeId)&&n.nativeId.length<=200&&!nativeMember(g,n).c||['callFunction','callMacro'].includes(n.key)&&safeId(n.definitionId)&&![...(g.functions||[]),...(g.macros||[])].some(d=>d.id===n.definitionId)||['dispatcherCall','dispatcherBind','dispatcherUnbind','dispatcherEvent','interfaceCall'].includes(n.key)&&safeId(n.symbolId)&&![...(g.dispatchers||[]),...(g.interfaces||[])].some(d=>d.id===n.symbolId)||n.key==='callParent'&&(safeId(n.parentFunctionId)||n.parentEvent&&typeof n.parentEvent.key==='string'&&boundedBlueprintValue(n.parentEvent)));
  if(!g||g.version!==1||typeof g.name!=='string'||g.name.length>200||!Array.isArray(g.nodes)||g.nodes.length>1000||!Array.isArray(g.variables)||g.variables.length>100||!Array.isArray(g.components)||g.components.length>100||!Array.isArray(g.edges)||g.edges.length>5000)return false;
  if(new Set(g.nodes.map(n=>n?.id)).size!==g.nodes.length||new Set(g.variables.map(v=>v?.id)).size!==g.variables.length||new Set(g.variables.map(v=>v?.name)).size!==g.variables.length)return false;
  if(!g.variables.every(v=>v&&(v.private===undefined||typeof v.private==='boolean')&&validNativeEnumPin(g.native,v,v.value,{deferred})&&validNativeRecordPin(g.native,v,v.value,{deferred})&&safeId(v.id)&&typeof v.name==='string'&&v.name.length>0&&v.name.length<=80&&Object.hasOwn(variableTypes,v.type)&&['single','array'].includes(v.container)&&(v.container==='array'?Array.isArray(v.value)&&v.value.length<=128&&v.value.every(x=>validValue(v.type,x)):validValue(v.type,v.value))))return false;
  if(!validComponents(g.components))return false;
  if(g.native!==undefined&&!validNative(g.native,validValue))return false;
  if(g.native?.header!==undefined&&(typeof g.native.header!=='string'||g.native.header.length>100000))return false;
  if(g.settings?.inputMapping!==undefined&&(typeof g.settings.inputMapping!=='string'||g.settings.inputMapping.length>1000||g.settings.inputMapping.includes('..')))return false;
  if(g.settings?.nativeDefaults!==undefined){const values=g.settings.nativeDefaults;if(!values||typeof values!=='object'||Array.isArray(values)||Object.keys(values).length>100)return false;for(const [key,value] of Object.entries(values)){const {p}=nativeMember(g,{nativeId:key});if(p&&(!validNativeEnumPin(g.native,p,value)||!validNativeRecordPin(g.native,p,value)))return false;if(!p?!(deferred&&/^[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*$/.test(key)&&key.length<=200&&boundedBlueprintValue(value,{left:200000,maximumDepth:20})):p.array?!(Array.isArray(value)&&value.length<=128&&value.every(v=>validValue(p.type,v))):!validValue(p.type,value))return false;}}
  for(const key of ['variableDefaults','componentOverrides'])if(g.settings?.[key]!==undefined){const values=g.settings[key];if(!values||Array.isArray(values)||typeof values!=='object'||Object.keys(values).length>100||!Object.entries(values).every(([id,value])=>safeId(id)&&boundedBlueprintValue(value,{left:200000,maximumDepth:20})))return false;if(!deferred&&!resolved)return false;}
  if(g.watches!==undefined&&(!Array.isArray(g.watches)||g.watches.length>100||!g.watches.every(w=>w&&safeId(w.view)&&safeId(w.node)&&['in','out'].includes(w.direction)&&typeof w.pin==='string'&&/^[A-Za-z0-9_.-]{1,100}$/.test(w.pin))))return false;
  if(g.settings!==undefined&&(!g.settings||typeof g.settings!=='object'||(g.settings.parentClass!==undefined&&!deferred&&![...Object.keys(blueprintClasses),...(g.native?.classes.filter(c=>c.blueprintable).map(c=>c.name)||[])].includes(g.settings.parentClass))||['tickEnabled','overlapEnabled'].some(k=>g.settings[k]!==undefined&&typeof g.settings[k]!=='boolean')||(g.settings.tickInterval!==undefined&&(!Number.isFinite(g.settings.tickInterval)||g.settings.tickInterval<0||g.settings.tickInterval>10000))))return false;
  const definitions=[...(Array.isArray(g.functions)?g.functions:[]),...(Array.isArray(g.macros)?g.macros:[])];
  for(const key of ['functions','macros'])if(g[key]!==undefined&&(!Array.isArray(g[key])||g[key].length>50))return false;
  const validPorts=ports=>Array.isArray(ports)&&ports.length<=30&&new Set(ports.map(p=>p?.id)).size===ports.length&&ports.every(p=>p&&safeId(p.id)&&typeof p.label==='string'&&p.label.length<=80&&(p.type==='exec'||p.type==='any'||Object.hasOwn(variableTypes,p.type))&&typeof p.array==='boolean'&&!(p.type==='exec'&&p.array)&&(p.default===undefined||p.type!=='exec'&&(p.type==='any'?boundedBlueprintValue(p.default):p.array?Array.isArray(p.default)&&p.default.length<=128&&p.default.every(v=>validValue(p.type,v)):validValue(p.type,p.default))));
  for(const key of ['dispatchers','interfaces'])if(g[key]!==undefined&&(!Array.isArray(g[key])||g[key].length>50||new Set(g[key].map(d=>d?.id)).size!==g[key].length||!g[key].every(d=>d&&safeId(d.id)&&typeof d.name==='string'&&d.name.length>0&&d.name.length<=80&&validPorts(d.inputs)&&validPorts(d.outputs)&&![...d.inputs,...d.outputs].some(p=>p.type==='exec'||['exec','then','target','event'].includes(p.id))&&(key!=='dispatchers'||d.outputs.length===0))))return false;
  const symbols=[...(g.dispatchers||[]),...(g.interfaces||[])];if(new Set(symbols.map(d=>d.id)).size!==symbols.length)return false;
  const validNativeNode=n=>{const {c,f,p}=nativeMember(g,n);return n.key==='nativeMembers'?!!c:n.key==='nativeCall'?!!f:n.key==='nativeEvent'?!!f&&f.event!=='none'&&c.name===g.settings?.parentClass:n.key==='nativeGet'?!!p:n.key==='nativeSet'?!!p&&!p.readOnly:false;};
  const validSymbolNode=n=>n.key==='interfaceCall'?(g.interfaces||[]).some(d=>d.id===n.symbolId):['dispatcherCall','dispatcherBind','dispatcherUnbind','dispatcherEvent'].includes(n.key)&&(g.dispatchers||[]).some(d=>d.id===n.symbolId);
  if(new Set(definitions.map(d=>d?.id)).size!==definitions.length||new Set(definitions.map(d=>d?.name)).size!==definitions.length||!definitions.every(d=>d&&safeId(d.id)&&typeof d.name==='string'&&d.name.length>0&&d.name.length<=80&&validPorts(d.inputs)&&validPorts(d.outputs)&&(d.access===undefined||['public','protected','private'].includes(d.access))&&d.graph&&(d.collapsed===undefined||typeof d.collapsed==='boolean')))return false;
  const contexts=allGraphContexts(g);if(blueprintAccessProblem(g,contexts))return false;
  for(const context of contexts){
    if(!Array.isArray(context.nodes)||context.nodes.length>1000||!Array.isArray(context.edges)||context.edges.length>5000||new Set(context.nodes.map(n=>n?.id)).size!==context.nodes.length)return false;
    if(context.comments!==undefined&&(!Array.isArray(context.comments)||context.comments.length>100||new Set(context.comments.map(c=>c?.id)).size!==context.comments.length||!context.comments.every(c=>c&&safeId(c.id)&&typeof c.text==='string'&&c.text.length<=2000&&c.position&&['x','y'].every(k=>Number.isFinite(c.position[k])&&Math.abs(c.position[k])<=10000)&&c.size&&Number.isFinite(c.size.width)&&c.size.width>=120&&c.size.width<=10000&&Number.isFinite(c.size.height)&&c.size.height>=80&&c.size.height<=10000&&/^#[0-9a-f]{6}$/i.test(c.color)&&Number.isFinite(c.fontSize)&&c.fontSize>=10&&c.fontSize<=32&&typeof c.moveNodes==='boolean'&&Array.isArray(c.nodeIds)&&c.nodeIds.length<=1000&&c.nodeIds.every(safeId))))return false;
    if(!context.nodes.every(n=>(n.enumName===undefined||n.key==='switchInt'&&validNativeEnumPin(g.native,{type:'int',enumName:n.enumName},n.inputValues?.selection??0,{deferred}))&&validFlowNode(n)&&validStructNode(n,g.native,{deferred})))return false;
    if(!context.nodes.every(n=>n&&safeId(n.id)&&typeof n.key==='string'&&(catalog.some(s=>s.key===n.key)||validNativeNode(n)||validSymbolNode(n)||(['getVariable','setVariable'].includes(n.key)&&(g.variables.some(v=>v.id===n.variableId)||deferred&&safeId(n.variableId)))||(['callFunction','callMacro','functionInput','functionOutput','macroInput','macroOutput'].includes(n.key)&&(definitions.some(d=>d.id===n.definitionId)||deferred&&safeId(n.definitionId)))||unresolvedNode(n)&&(!n.key.startsWith('native')||typeof n.nativeId==='string'&&/^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?$/.test(n.nativeId)&&n.nativeId.length<=200))&&n.position&&['x','y'].every(k=>Number.isFinite(n.position[k])&&Math.abs(n.position[k])<=10000)&&Array.isArray(n.splitPins)&&n.splitPins.length<=30&&n.splitPins.every(k=>typeof k==='string'&&/^(in|out):[a-zA-Z0-9_.-]+$/.test(k))&&(n.title===undefined||(typeof n.title==='string'&&n.title.length<=80))))return false;
    for(const n of context.nodes){if(n.key==='parentEntry'&&(!resolved||!catalog.some(s=>s.key===n.parentKey&&s.kind==='event')&&n.parentKey!=='nativeEvent'&&n.parentKey!=='dispatcherEvent'))return false;if(n.key==='callParent'&&(!deferred&&!resolved||resolved&&!safeId(n.parentEntryId)&&!safeId(n.parentDefinitionId)))return false;if(n.key==='callFunction'&&!(g.functions||[]).some(d=>d.id===n.definitionId)&&!deferred)return false;if(n.key==='callMacro'&&!(g.macros||[]).some(d=>d.id===n.definitionId)&&!deferred)return false;}
    for(const n of context.nodes){
      if(n.key==='inputAction'&&(!['bool','float','vec2','vec3'].includes(n.valueType||'bool')||(n.options?.action!==undefined&&(typeof n.options.action!=='string'||n.options.action.length>1000))))return false;
      if(n.key==='timeline'&&(context!==g||!validTimeline(n.timeline)))return false;
      if(n.array!==undefined&&typeof n.array!=='boolean')return false;
      if(n.key==='selectValue'&&!Object.hasOwn(variableTypes,n.valueType||'float'))return false;
      if(n.valueType!==undefined&&!Object.hasOwn(variableTypes,n.valueType))return false;
      if(n.comment!==undefined&&(typeof n.comment!=='string'||n.comment.length>2000))return false;
      if(['enabled','breakpoint'].some(k=>n[k]!==undefined&&typeof n[k]!=='boolean'))return false;
      if(n.options!==undefined&&(!n.options||typeof n.options!=='object'||(n.options.tickInterval!==undefined&&(!Number.isFinite(n.options.tickInterval)||n.options.tickInterval<0||n.options.tickInterval>10000))||['componentId','key','eventName'].some(k=>n.options[k]!==undefined&&(typeof n.options[k]!=='string'||n.options[k].length>80))))return false;
      if(n.inputValues!==undefined){if(!n.inputValues||typeof n.inputValues!=='object'||Array.isArray(n.inputValues)||Object.keys(n.inputValues).length>(isSwitchNode(n)?30+flowOutputIds(n).length:30))return false;for(const [id,value] of Object.entries(n.inputValues)){const p=pinForId(n,'in',context,id);if(p&&(!validNativeEnumPin(g.native,p,value,{deferred})||p.type==='record'&&!validNativeRecordPin(g.native,p,value,{deferred})))return false;if(!p?!(unresolvedNode(n)&&/^[A-Za-z0-9_.-]{1,100}$/.test(id)&&boundedBlueprintValue(value,n.nativeId||n.valueType==='record'?{left:200000,maximumDepth:20}:undefined)):p.type==='exec'||(p.array?!(Array.isArray(value)&&value.length<=128&&value.every(v=>p.type==='any'||validValue(p.type,v))):!validValue(p.type,value)))return false;}}
    }
    for(const n of context.nodes)for(const key of ['customInputs','customOutputs'])if(n[key]!==undefined&&(!['customEvent','customFunction'].includes(n.key)||!Array.isArray(n[key])||n[key].length>20||!n[key].every(p=>p&&safeId(p.id)&&typeof p.label==='string'&&p.label.length<=80&&Object.hasOwn(variableTypes,p.type)&&typeof p.array==='boolean')))return false;
    for(const n of context.nodes)for(const direction of ['in','out']){const pins=basePins(n,direction,context);if(new Set(pins.map(p=>p.id)).size!==pins.length||pins.some(p=>p.type==='record'&&!validNativeRecordPin(g.native,p,undefined,{identityOnly:true,deferred})))return false;}
    const usedInputs=new Set(),usedExec=new Set();
    for(const e of context.edges){if(!e?.from||!e?.to||!['from','to'].every(k=>safeId(e[k].node)&&typeof e[k].pin==='string'&&/^[A-Za-z0-9_.-]{1,100}$/.test(e[k].pin)))return false;const a=context.nodes.find(n=>n.id===e.from.node),b=context.nodes.find(n=>n.id===e.to.node);if(!a||!b||a===b)return false;const inputKey=e.to.node+':'+e.to.pin;if(pinForId(b,'in',context,e.to.pin)?.type!=='exec'){if(usedInputs.has(inputKey))return false;usedInputs.add(inputKey);}const result=canConnect({...context,edges:context.edges.filter(x=>x!==e)},e.from,e.to);if(!result.ok&&!(deferred&&result.reason==='연결할 핀을 찾을 수 없어요.'&&(unresolvedNode(a)||unresolvedNode(b))))return false;const p=effectivePins(a,'out',context).find(p=>p.id===e.from.pin);if(p?.type==='exec'){const k=e.from.node+':'+e.from.pin;if(usedExec.has(k))return false;usedExec.add(k);}}
  }
  const definitionsById=new Map(definitions.map(d=>[d.id,d]));const latentGraph=(nodes,seen=new Set())=>nodes.some(n=>['delay','retriggerDelay'].includes(n.key)||n.key==='callMacro'&&(!definitionsById.get(n.definitionId)?.collapsed||seen.has(n.definitionId)||latentGraph(definitionsById.get(n.definitionId).graph.nodes,new Set([...seen,n.definitionId]))));const foldOwners=new Map();for(const c of allGraphContexts(g))for(const n of c.nodes)if(n.key==='callMacro')foldOwners.set(n.definitionId,(foldOwners.get(n.definitionId)||0)+1);for(const d of g.macros||[])if(d.collapsed&&(foldOwners.get(d.id)||0)>1)return false;
  for(const [collection,kind] of [['functions','function'],['macros','macro']])for(const d of g[collection]||[]){
    if(!['Input','Output'].every(s=>d.graph.nodes.filter(n=>n.key===kind+s&&n.definitionId===d.id).length===1))return false;
    if(d.graph.nodes.some(n=>catalog.find(s=>s.key===n.key)?.kind==='event'||['nativeEvent','dispatcherEvent'].includes(n.key)))return false;
    if(d.collapsed&&collection!=='macros')return false;if(d.pure!==undefined&&typeof d.pure!=='boolean')return false;
    if(d.pure&&[...d.inputs,...d.outputs].some(p=>p.type==='exec'))return false;
    if(kind==='function'&&(d.inputs.filter(p=>p.type==='exec').length>1||d.outputs.filter(p=>p.type==='exec').length>1||latentGraph(d.graph.nodes)))return false;
  }
  return true;
}
