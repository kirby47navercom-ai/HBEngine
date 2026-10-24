// Dedicated editor commands share the same profiles, conflict checks and AI API.
const command=(id,label,scope,keys=[],when)=>({id,label,scope,keys,action:id,editing:false,repeat:/^(collisionNudge|notify(Left|Right)|sequence(Previous|Next)(Frame|Key|Track)|sequenceZoom)/.test(id),...(when?{when}:{})});
export const assetShortcutKinds={terrain:'world',foliage:'world',lod:'world',material:'material',materialfunction:'material',materiallayer:'material',materialblend:'material',animation:'curve',curve:'curve',animgraph:'animation',behaviortree:'gameplay',statemachine:'gameplay',montage:'sequencer',sequenceasset:'sequencer',spriterig:'rig',tilemap:'tilemap',sprite:'sprite',spriteanimation:'spriteanimation',retargetrig:'retarget',retarget:'retarget',audiomixer:'audio',skeletalclip:'retarget'};
export const assetShortcutCategories=[['world','지형·폴리지·LOD'],['material','머테리얼'],['curve','커브·트랜스폼 애니메이션'],['animation','애니메이션 그래프'],['gameplay','행동 트리·상태 머신'],['sequencer','시퀀스·몽타주'],['rig','2D 리그'],['tilemap','타일맵'],['sprite','스프라이트'],['spriteanimation','스프라이트 애니메이션'],['retarget','3D 리타게팅'],['audio','오디오 믹서'],['uv','메시 UV'],['collision','충돌 형상']];
export const assetShortcutCommands=[
 command('worldFocus','월드 에셋 프레이밍','world',['KeyF','Home']),
 command('worldBrush','폴리지 브러시','world',['KeyB'],'foliage'),command('worldSelect','폴리지 선택','world',['KeyQ'],'foliage'),
 command('worldDuplicate','폴리지 선택 복제','world',['Primary+KeyD'],'foliage'),command('worldDelete','폴리지 선택 삭제','world',['Delete','Backspace'],'foliage'),
 command('worldRadiusDown','브러시 반경 줄이기','world',['BracketLeft'],'worldBrush'),command('worldRadiusUp','브러시 반경 늘리기','world',['BracketRight'],'worldBrush'),
 ...['Raise','Lower','Smooth','Flatten','Paint','Hole','FillHole','Stamp'].map((name,i)=>command('worldTerrain'+name,'지형 '+['높이 올리기','높이 내리기','평활','평탄화','레이어 칠하기','구멍','구멍 복원','스탬프'][i],'world',['Shift+Digit'+(i+1)],'terrain')),
 command('retargetPreview','리타게팅 포즈·재생 미리보기','retarget',['Space'],'retargetPreview'),command('retargetFirst','리타게팅 시작으로','retarget',['Home'],'retarget'),command('retargetMapExact','리타게팅 동일 이름 자동 매핑','retarget',['Primary+KeyM'],'retarget'),command('retargetMapEmpty','리타게팅 빈 항목 자동 매핑','retarget',['Primary+Shift+KeyM'],'retarget'),command('retargetMapFuzzy','리타게팅 유사 이름 자동 매핑','retarget',[],'retarget'),command('retargetDuplicatePose','리타게팅 포즈 복제','retarget',['Primary+KeyD'],'retargetrig'),command('retargetCapturePose','리타게팅 현재 포즈 캡처','retarget',[],'retargetrig'),command('retargetNewChain','리타게팅 체인 추가','retarget',['Primary+Shift+KeyA'],'retargetrig'),
 command('retargetNewPose','리타게팅 포즈 추가','retarget',[],'retargetrig'),
 command('retargetRemovePose','리타게팅 포즈 삭제','retarget',[],'retargetrig'),
 command('retargetResetPose','리타게팅 포즈 초기화','retarget',[],'retargetrig'),
 command('retargetRemoveChain','리타게팅 체인 삭제','retarget',[],'retargetrig'),
 command('retargetNewProfile','리타게팅 프로필 추가','retarget',[],'retarget'),
 command('retargetDuplicateProfile','리타게팅 프로필 복제','retarget',[],'retarget'),
 command('retargetRemoveProfile','리타게팅 프로필 삭제','retarget',[],'retarget'),
 command('retargetDefaultProfile','리타게팅 기본 프로필 지정','retarget',[],'retarget'),
 command('retargetClearMap','리타게팅 매핑 지우기','retarget',[],'retarget'),
 command('retargetRemoveMap','리타게팅 선택 매핑 삭제','retarget',[],'retarget'),
 command('retargetAddMorph','리타게팅 모프 매핑 추가','retarget',[],'retarget'),
 command('retargetBake','리타게팅 클립 베이크','retarget',[],'retarget'),
 command('retargetNewCurve','리타게팅 커브 추가','retarget',[],'skeletalclip'),
 command('audioDuplicateBus','오디오 버스 복제','audio',['Primary+KeyD']),command('audioRemoveBus','오디오 버스 삭제','audio',['Delete','Backspace']),
 ...['Mute','Solo','Bypass'].map((name,i)=>command('audio'+name,'오디오 '+['음소거','솔로','DSP 우회'][i]+' 전환','audio',[])),
 command('uvFocus','UV 선택 프레이밍','uv',['KeyF']),command('uvFit','UV 전체 프레이밍','uv',['Home']),command('uvSelectAll','UV 전체 선택','uv',['Primary+KeyA']),command('uvSelectNone','UV 선택 해제','uv',['Primary+Shift+KeyA']),
 ...[['Cut','분리'],['Unwrap','섬 펼치기'],['Stitch','경계 맞추기'],['PackIslands','섬 패킹'],['Copy','채널 복사'],['XZ','XZ 투영']].map(([id,label])=>command('uv'+id,'UV '+label,'uv',[])),
 command('collisionFit','충돌 전체 프레이밍','collision',['KeyF','Home']),command('collisionUndo','충돌 실행 취소','collision',['Primary+KeyZ']),command('collisionRedo','충돌 다시 실행','collision',['Primary+Shift+KeyZ','Primary+KeyY']),
 command('collisionAddPoint','충돌 점 추가','collision',['Insert'],'collision2d'),command('collisionRemovePoint','충돌 점 삭제','collision',['Delete','Backspace'],'collision2d'),
 ...['Left','Right','Up','Down'].flatMap(direction=>[command('collisionNudge'+direction,'충돌 점 '+direction,'collision',['Arrow'+direction],'collision2d'),command('collisionNudgeFast'+direction,'충돌 점 '+direction+' 크게','collision',['Shift+Arrow'+direction],'collision2d')]),
 command('audioPreview','오디오 미리듣기 재생·정지','audio',['Space']),command('audioStop','오디오 미리듣기 정지','audio',['Shift+Space']),command('audioAddBus','오디오 버스 추가','audio',['Primary+Shift+KeyA']),command('audioSnapshot','오디오 스냅샷 추가','audio',[]),

 ...['Copy','Cut','Paste','Duplicate','Delete','SelectAll'].map((action,i)=>command('material'+action,'머테리얼 '+['복사','잘라내기','붙여넣기','복제','삭제','모두 선택'][i],'material',i===4?['Delete','Backspace']:['Primary+Key'+['C','X','V','D','','A'][i]])),
 command('materialFocus','머테리얼 선택 프레이밍','material',['KeyF']),command('materialFit','머테리얼 전체 프레이밍','material',['Home']),command('materialPreview','머테리얼 선택 노드 미리보기','material',['Primary+KeyT']),
 command('curveDelete','커브 선택 키 삭제','curve',['Delete']),command('curveAdd','커브 현재 시간 키 추가','curve',['Enter']),command('curveFit','커브 전체 프레이밍','curve',['Home']),command('curveFocus','커브 선택 키 프레이밍','curve',['KeyF']),command('curvePlay','커브 미리보기 재생·정지','curve',['Space']),
 ...['Copy','Cut','Paste','SelectAll'].map((action,i)=>command('curve'+action,'커브 키 '+['복사','잘라내기','붙여넣기','모두 선택'][i],'curve',['Primary+Key'+['C','X','V','A'][i]])),
 command('curveFocusPlayhead','커브 재생 헤드 중심','curve',['KeyA']),
 ...['Auto','User','Break','Linear','Constant','ClampedAuto'].map((mode,i)=>command('curveMode'+mode,'커브 키 '+mode,'curve',['Digit'+(i+1)])),
 command('animationDelete','애니메이션 그래프 선택 삭제','animation',['Delete']),command('animationFocus','애니메이션 그래프 프레이밍','animation',['KeyF']),command('animationPreview','애니메이션 그래프 미리보기','animation',[]),
 command('gameplayDelete','행동 그래프 선택 삭제','gameplay',['Delete']),command('gameplayFocus','행동 그래프 프레이밍','gameplay',[]),
 command('gameplayQueryService','행동트리 EQS 서비스 추가','gameplay',[],'behaviortree'),
 command('sequencePreviousTrack','타임라인 이전 행','sequencer',['ArrowUp']),command('sequenceNextTrack','타임라인 다음 행','sequencer',['ArrowDown']),command('sequenceFindTrack','타임라인 행 검색','sequencer',['Primary+KeyF']),
 command('sequenceFitTimeline','타임라인 전체 범위','sequencer',['Alt+Home']),command('sequenceFocusItems','타임라인 선택 범위','sequencer',['KeyF']),command('sequenceZoomIn','타임라인 확대','sequencer',['Equal','Shift+Equal']),command('sequenceZoomOut','타임라인 축소','sequencer',['Minus','NumpadSubtract']),
 command('sequencePlay','시퀀스 미리보기 재생·정지','sequencer',['Space']),command('sequenceFirst','시퀀스 시작으로','sequencer',['Home']),command('sequenceLast','시퀀스 끝으로','sequencer',['End']),
 command('sequencePreviousFrame','시퀀스 이전 프레임','sequencer',['Comma']),command('sequenceNextFrame','시퀀스 다음 프레임','sequencer',['Period']),command('sequencePreviousKey','시퀀스 이전 키·경계','sequencer',['Alt+Comma']),command('sequenceNextKey','시퀀스 다음 키·경계','sequencer',['Alt+Period']),
 command('notifyLeft','몽타주 알림 구간 이전 1프레임','sequencer',['ArrowLeft'],'notify'),command('notifyRight','몽타주 알림 구간 다음 1프레임','sequencer',['ArrowRight'],'notify'),command('notifyLeftFast','몽타주 알림 구간 이전 10프레임','sequencer',['Shift+ArrowLeft'],'notify'),command('notifyRightFast','몽타주 알림 구간 다음 10프레임','sequencer',['Shift+ArrowRight'],'notify'),command('notifyDelete','몽타주 알림 구간 삭제','sequencer',['Delete'],'notify'),
 command('rigCopy','2D 리그 복사','rig',['Primary+KeyC']),command('rigPaste','2D 리그 붙여넣기','rig',['Primary+KeyV']),command('rigFocus','2D 리그 프레이밍','rig',['KeyF']),command('rigDelete','2D 리그 정점·뼈 삭제','rig',['Delete']),
 ...Object.entries({Pose:['pose','포즈','KeyQ'],Bone:['bone','뼈','KeyW'],CreateBone:['createBone','뼈 생성','KeyE'],Geometry:['geometry','메시','KeyS'],CreateVertex:['createVertex','정점 생성','KeyD'],Weights:['weights','가중치','KeyN'],IK:['ik','IK','KeyI']}).map(([id,[,label,key]])=>command('rigTool'+id,'2D 리그 '+label+' 도구','rig',['Shift+'+key])),
 command('rigSplit','2D 리그 뼈 나누기','rig',['Shift+KeyR']),command('rigGrid','2D 리그 격자 메시 생성','rig',['Shift+KeyA']),command('rigAutoWeights','2D 리그 자동 가중치','rig',['Shift+KeyZ']),command('rigReset','2D 리그 바인드 포즈','rig',['Shift+Digit1']),command('rigPlay','2D 리그 미리보기 재생·정지','rig',[]),
 ...Object.entries({Brush:['브러시','KeyB'],Erase:['지우개','KeyD'],Rectangle:['사각형','KeyU'],Fill:['채우기','KeyG'],Pick:['타일 선택','KeyI']}).map(([id,[label,key]])=>command('tile'+id,'타일맵 '+label,'tilemap',[key])),
 command('tileFit','타일맵 화면 맞춤','tilemap',[]),command('spriteFit','스프라이트 화면 맞춤','sprite',[]),command('spritePlay','스프라이트 애니메이션 재생·정지','spriteanimation',['Space']),command('spriteAnimationFit','스프라이트 애니메이션 화면 맞춤','spriteanimation',[]),
];

export const retargetShortcutActions={"retargetNewPose":"pose","retargetRemovePose":"remove-pose","retargetResetPose":"reset-pose","retargetRemoveChain":"remove-chain","retargetNewProfile":"profile","retargetDuplicateProfile":"duplicate-profile","retargetRemoveProfile":"remove-profile","retargetDefaultProfile":"default-profile","retargetClearMap":"clear-map","retargetRemoveMap":"remove-map","retargetAddMorph":"morph-add","retargetBake":"bake","retargetNewCurve":"curve"};
export const authoringShortcutButtons={...Object.fromEntries(['Mute','Solo','Bypass'].map(id=>['audio'+id,'[data-mixer-toggle="'+id.toLowerCase()+'"]'])),...Object.fromEntries(['Cut','Unwrap','Stitch','PackIslands','Copy','XZ'].map(id=>['uv'+id,'[data-world-mesh="uv'+id+'"]'])),...Object.fromEntries(Object.entries(retargetShortcutActions).map(([id,act])=>[id,'[data-rt-act="'+act+'"]'])),audioDuplicateBus:'[data-mixer-duplicate]',audioRemoveBus:'[data-mixer-remove]',retargetPreview:'[data-rt-act="play"],[data-rt-act="rig-preview"]',retargetFirst:'[data-rt-act="rewind"]',retargetMapExact:'[data-rt-act="map-exact"]',retargetMapEmpty:'[data-rt-act="map-empty"]',retargetMapFuzzy:'[data-rt-act="map-fuzzy"]',retargetDuplicatePose:'[data-rt-act="duplicate-pose"]',retargetCapturePose:'[data-rt-act="capture-pose"]',retargetNewChain:'[data-rt-act="chain"]',audioPreview:'[data-mixer-preview]',audioAddBus:'[data-mixer-add]',audioSnapshot:'[data-mixer-snapshot]'};
export function authoringShortcutHints(element,shortcut){if(!shortcut)return;for(const[id,selector]of Object.entries(authoringShortcutButtons))for(const button of element.querySelectorAll(selector)){const keys=shortcut(id);if(keys)button.title=keys;else button.removeAttribute('title');}}
