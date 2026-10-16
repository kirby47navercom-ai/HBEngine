import fs from 'node:fs/promises';
import {engine179Fixture} from './engine-179-fixture.mjs';
import {createWidgetAsset,createWidgetNode} from '../prototype/ui-assets.js';
import {parseNativeHeader} from '../prototype/native-model.js';
import {makeNode} from '../prototype/blueprint-model.js';
export function namedSlotFixture(){
 const base=createWidgetAsset('DialogFrame');base.referenceSize=[320,100];base.nodes[0].properties.padding=0;
 const slot=createWidgetNode('NamedSlot','body');slot.name='Body';slot.slot.anchors=[0,0,1,1];slot.slot.offset=[0,0,0,0];slot.properties.padding=0;base.nodes.push(slot);
 const fallback=createWidgetNode('Text','fallback','body');fallback.name='Fallback';fallback.properties.text='기본 내용';base.nodes.push(fallback);
 const content=createWidgetAsset('DialogContent');content.referenceSize=[320,100];content.nodes[0].properties.padding=0;
 const label=createWidgetNode('Text','label');label.name='Label';label.slot.offset=[12,10,296,36];label.properties.text='슬롯 체력 100';label.properties.color='#ffdf83';content.nodes.push(label);
 const button=createWidgetNode('Button','action');button.name='Action';button.slot.offset=[12,52,296,36];button.properties.text='슬롯 확인';button.events.click='SlotClick';content.nodes.push(button);
 const parent=createWidgetAsset('SlottedHUD');parent.referenceSize=[320,100];parent.scaleMode='scale';parent.nodes[0].properties.padding=0;
 const mount=createWidgetNode('Widget','dialog');mount.name='Dialog';mount.slot.anchors=[0,0,1,1];mount.slot.offset=[0,0,0,0];mount.properties.padding=0;mount.properties.widgetAsset='Assets/W_Frame.hbwidget.json';mount.properties.widgetSlots=JSON.stringify({Body:'Source/UI/W_Content.hbwidget.json'});mount.properties.widgetEvents=JSON.stringify({SlotClick:'CardClicked'});parent.nodes.push(mount);
 return {base,content,parent,files:new Map([['Assets/W_Frame.hbwidget.json',base],['Source/UI/W_Content.hbwidget.json',content],['Assets/W_Slots.hbwidget.json',parent]])};
}
export async function engine181Fixture(dir){
 const f=await engine179Fixture(dir),{record,blueprint:bp}=f,slots=namedSlotFixture();for(const [name,data]of slots.files)await record.project.write(name,JSON.stringify(data));
 const header=bp.native.header.replace('};','HB_FUNCTION(BlueprintCallable) void SlotLabel();};'),source=bp.native.source+'\nvoid AuthoringProbe::SlotLabel(){hb::UI::SetText(hb::Scene::FindActorById("UIAnchor"),"WorldCard","Dialog/Body/Content/Label","C++ 슬롯 체력 50");}';
 bp.native={...parseNativeHeader(header),header,source,headerPath:bp.native.headerPath,sourcePath:bp.native.sourcePath};await record.project.write(bp.native.headerPath,header);await record.project.write(bp.native.sourcePath,source);await record.project.write(record.manifest.startupBlueprint,JSON.stringify(bp));
 const scene=JSON.parse(await fs.readFile((await record.project.read(record.manifest.startupScene)).file)),owner=scene.objects.find(o=>o.id==='UIAnchor');owner.components.find(c=>c.type==='UIWidget').properties.asset='Assets/W_Slots.hbwidget.json';await record.project.write(record.manifest.startupScene,JSON.stringify(scene));
 const widgetBP=JSON.parse(await fs.readFile((await record.project.read(owner.blueprintAsset)).file));const event=makeNode('customEvent');event.options={eventName:'CardClicked'};const write=makeNode('uiSetText');write.inputValues={instance:'WorldCard',element:'Dialog/Body/Content/Label',text:'사람 슬롯 클릭'};widgetBP.nodes=[event,write];widgetBP.edges=[{from:{node:event.id,pin:'then'},to:{node:write.id,pin:'exec'}}];await record.project.write(owner.blueprintAsset,JSON.stringify(widgetBP));
 return {...f,blueprint:bp,slots};
}
