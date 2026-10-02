import * as THREE from './vendor/three.module.js';
import {mountArchive} from './archive.js';
import {createMixcloud} from './mixcloud.js';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const W=1672,H=941,KEY='dj-lofi-hybrid-study-v1';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const base=await fetch('content.json').then(r=>{if(!r.ok)throw Error('Content could not be loaded');return r.json();});
let data=structuredClone(base),view='room',episodeId,noteId,playing=false,volume=.45,dirty=true,raf=0,elapsed=0,lastTick=0,editorMode='episode',videoUrl='',videoName='',journeyToken=0,journeyTimer;
const sessionAudio=new Map();let audioContext,oscillators=[],gain;
try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved){for(const kind of ['episodes','notes','collection']){const incoming=new Map((base[kind]||[]).map(item=>[item.id,item]));for(const item of saved[kind]||[]){const original=incoming.get(item.id);incoming.set(item.id,original&&kind==='notes'&&(original.contentRevision||0)>(item.contentRevision||0)?{...item,...original}:original?{...original,...Object.fromEntries(Object.entries(item).filter(([key,value])=>value!==''&&value!=null&&!(key==='cover'&&String(value).startsWith('assets/'))))}:item);}data[kind]=[...incoming.values()];}}}catch{}
data.collection??=[];
const current=()=>data.episodes.find(e=>e.id===episodeId)||data.episodes[0];
const note=()=>data.notes.find(n=>n.id===noteId)||data.notes[0];
data.episodes.sort((a,b)=>b.date.localeCompare(a.date));episodeId=data.episodes[0].id;noteId=data.notes[0].id;
const renderer=new THREE.WebGLRenderer({canvas:$('#record-layer'),alpha:true,antialias:true,powerPreference:'low-power'});
renderer.setSize(W,H,false);renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(0,W,0,H,.1,100);camera.position.z=10;
const labelGroup=new THREE.Group();labelGroup.position.set(1076,406,0);labelGroup.scale.set(24,4.1,1);scene.add(labelGroup);
const labelCanvas=document.createElement('canvas');labelCanvas.width=labelCanvas.height=256;
const labelTexture=new THREE.CanvasTexture(labelCanvas);labelTexture.colorSpace=THREE.SRGBColorSpace;
const label=new THREE.Mesh(new THREE.CircleGeometry(1,80),new THREE.MeshBasicMaterial({map:labelTexture,transparent:true,opacity:.88,side:THREE.DoubleSide}));labelGroup.add(label);
const spindle=new THREE.Mesh(new THREE.CircleGeometry(1.2,20),new THREE.MeshBasicMaterial({color:0x9f978a,side:THREE.DoubleSide}));spindle.position.set(1076,404.5,.1);scene.add(spindle);
let signOn=false,entryPhase='waiting';
const signPlacement={x:1320,y:148};
$('#sign-toggle').style.setProperty('--sign-x',`${signPlacement.x}px`);
$('#sign-toggle').style.setProperty('--sign-y',`${signPlacement.y}px`);
const signGroup=new THREE.Group();signGroup.position.set(signPlacement.x,signPlacement.y,0);scene.add(signGroup);
// Walnut light box: real geometry and procedural textures keep it switchable.
const woodCanvas=document.createElement('canvas');woodCanvas.width=512;woodCanvas.height=256;
const woodCtx=woodCanvas.getContext('2d');woodCtx.fillStyle='#986443';woodCtx.fillRect(0,0,512,256);
for(let row=0;row<256;row++){const tone=34+Math.sin(row*.57)*8+Math.sin(row*.13)*7;woodCtx.strokeStyle=`rgba(151,104,65,${.08+tone/240})`;woodCtx.lineWidth=row%7===0?1.2:.45;woodCtx.beginPath();for(let x=0;x<=512;x+=8){const y=row+Math.sin(x*.017+row*.1)*1.3;x?woodCtx.lineTo(x,y):woodCtx.moveTo(x,y);}woodCtx.stroke();}
const woodTexture=new THREE.CanvasTexture(woodCanvas);woodTexture.colorSpace=THREE.SRGBColorSpace;
const signBacking=new THREE.Mesh(new THREE.BoxGeometry(110,48,6),[0xa18166,0xbca080,0x604c3b,0xf0d3ad,0xcba889,0x604c3b].map(color=>new THREE.MeshBasicMaterial({map:woodTexture,color,side:THREE.DoubleSide})));signGroup.add(signBacking);
const rim=new THREE.Mesh(new THREE.PlaneGeometry(100,38),new THREE.MeshBasicMaterial({color:0x21140d,side:THREE.DoubleSide}));rim.position.z=3.05;signGroup.add(rim);
const signCanvas=document.createElement('canvas');signCanvas.width=784;signCanvas.height=272;
const signCtx=signCanvas.getContext('2d'),faceGradient=signCtx.createRadialGradient(392,130,10,392,136,430);
faceGradient.addColorStop(0,'#f6dcab');faceGradient.addColorStop(1,'#c99d61');signCtx.fillStyle=faceGradient;signCtx.fillRect(0,0,784,272);
for(let i=0;i<13000;i++){const x=(i*73.17)%784,y=(i*41.31)%272;signCtx.fillStyle=i%2?'rgba(255,248,222,.07)':'rgba(94,57,21,.04)';signCtx.fillRect(x,y,1.4,1.4);}
signCtx.fillStyle='#bd2110';signCtx.font='218px Impact, "Arial Narrow", sans-serif';signCtx.textAlign='center';signCtx.textBaseline='middle';signCtx.fillText('ON AIR',392,151,690);
const signTexture=new THREE.CanvasTexture(signCanvas);signTexture.colorSpace=THREE.SRGBColorSpace;
const signMaterial=new THREE.MeshStandardMaterial({map:signTexture,roughness:.92,metalness:0,emissive:0xffe5b1,emissiveMap:signTexture,emissiveIntensity:0,side:THREE.DoubleSide});
const signFace=new THREE.Mesh(new THREE.PlaneGeometry(98,36),signMaterial);signFace.position.z=3.1;signFace.scale.y=-1;signGroup.add(signFace);
const powerButton=new THREE.Mesh(new THREE.BoxGeometry(8,2,2),new THREE.MeshBasicMaterial({color:0x92794e}));powerButton.position.set(0,-24.5,1);signGroup.add(powerButton);
for(const x of [-40,40]){const foot=new THREE.Mesh(new THREE.BoxGeometry(9,2,4),new THREE.MeshBasicMaterial({color:0x241b13,side:THREE.DoubleSide}));foot.position.set(x,25,0);signGroup.add(foot);}
// Project the front onto the sill's edge, with a visible top and left return.
function projectSignGeometry(geometry){
 const corners=[[-55,-23],[55,-26],[54.5,22],[-55.5,25]];
 const [a,b,c,d]=corners,dx1=b[0]-c[0],dx2=d[0]-c[0],dy1=b[1]-c[1],dy2=d[1]-c[1],sx=a[0]-b[0]+c[0]-d[0],sy=a[1]-b[1]+c[1]-d[1],den=dx1*dy2-dx2*dy1;
 const g=(sx*dy2-dx2*sy)/den,h=(dx1*sy-sx*dy1)/den,xx=b[0]-a[0]+g*b[0],xy=d[0]-a[0]+h*d[0],yx=b[1]-a[1]+g*b[1],yy=d[1]-a[1]+h*d[1];
 const positions=geometry.attributes.position;
 for(let i=0;i<positions.count;i++){const u=(positions.getX(i)+55)/110,v=(positions.getY(i)+24)/48,z=positions.getZ(i),q=1+g*u+h*v,depth=(3.1-z)/6.1;positions.setXYZ(i,(a[0]+xx*u+xy*v)/q-depth*7,(a[1]+yx*u+yy*v)/q-depth*5.5,z);}
 positions.needsUpdate=true;geometry.computeVertexNormals();
}
// Subdivision also projects the lettering, rather than merely tilting its outline.
signFace.geometry.dispose();signFace.geometry=new THREE.PlaneGeometry(98,36,24,12);
// Its texture is flipped in the original photo coordinate system; bake that flip first.
signFace.geometry.scale(1,-1,1);signFace.scale.y=1;
for(const mesh of signGroup.children){mesh.geometry.translate(mesh.position.x,mesh.position.y,mesh.position.z);mesh.position.set(0,0,0);projectSignGeometry(mesh.geometry);}
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=256;shadowCanvas.height=128;
const shadowCtx=shadowCanvas.getContext('2d');shadowCtx.shadowColor='rgba(0,0,0,.8)';shadowCtx.shadowBlur=10;shadowCtx.fillStyle='rgba(0,0,0,.7)';shadowCtx.beginPath();shadowCtx.ellipse(128,64,104,22,0,0,Math.PI*2);shadowCtx.fill();
const contactShadow=new THREE.Mesh(new THREE.PlaneGeometry(126,10),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,opacity:.7,depthWrite:false,side:THREE.DoubleSide}));
contactShadow.position.set(-2,25,-4);contactShadow.rotation.z=-.028;signGroup.add(contactShadow);
scene.add(new THREE.AmbientLight(0xffe1bd,.55));const signLight=new THREE.PointLight(0xffbd72,0,200,2);signLight.position.set(signPlacement.x,signPlacement.y,35);scene.add(signLight);
const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=256;const glowCtx=glowCanvas.getContext('2d'),glowGradient=glowCtx.createRadialGradient(128,128,8,128,128,128);glowGradient.addColorStop(0,'rgba(255,190,100,.7)');glowGradient.addColorStop(.4,'rgba(255,150,60,.2)');glowGradient.addColorStop(1,'rgba(255,140,50,0)');glowCtx.fillStyle=glowGradient;glowCtx.fillRect(0,0,256,256);
const signGlow=new THREE.Mesh(new THREE.PlaneGeometry(164,18),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(glowCanvas),transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));signGlow.position.set(signPlacement.x,signPlacement.y+25,-3);signGlow.rotation.z=-.028;scene.add(signGlow);
const signPower={amount:0};
function paintSign(){signMaterial.emissiveIntensity=signPower.amount*.72;signLight.intensity=signPower.amount*180;signGlow.material.opacity=signPower.amount*.35;ensureRender();}
function setSign(on,animate=true){signOn=on;$('#sign-toggle').setAttribute('aria-pressed',String(on));$('#sign-toggle').ariaLabel=`Switch the ON AIR sign ${on?'off':'on'}`;gsap.killTweensOf(signPower);if(animate&&!reduced.matches)gsap.to(signPower,{amount:on?1:0,duration:.4,onUpdate:paintSign});else{signPower.amount=on?1:0;paintSign();}}
$('#sign-toggle').onclick=()=>setSign(!signOn);
function drawLabel(){const ctx=labelCanvas.getContext('2d');ctx.clearRect(0,0,256,256);ctx.fillStyle='#ceb58a';ctx.beginPath();ctx.arc(128,128,127,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#625c35';ctx.lineWidth=2;for(const radius of [112,78,17]){ctx.beginPath();ctx.arc(128,128,radius,0,Math.PI*2);ctx.stroke();}ctx.fillStyle='#353d29';ctx.fillRect(115,23,26,42);ctx.font='bold 15px Georgia';ctx.textAlign='center';ctx.fillText('DJ LOFI',128,95);ctx.font='12px Georgia';ctx.fillText('SIDE A · 33⅓',128,169);labelTexture.needsUpdate=true;ensureRender();}
function render(time=performance.now()){raf=0;const dt=Math.min((time-lastTick)/1000||0,.1);lastTick=time;if(playing){elapsed+=dt;if(view!=='book'&&!reduced.matches)label.rotation.z+=dt*Math.PI*2*33.333/60;}if(dirty||playing&&view!=='book'){renderer.render(scene,camera);dirty=false;}if(playing){updateTransport();raf=requestAnimationFrame(render);}}
function ensureRender(){dirty=true;if(!raf)raf=requestAnimationFrame(render);}
function homography(el,corners,width=400,height=400){const [a,b,c,d]=corners,dx1=b[0]-c[0],dx2=d[0]-c[0],dy1=b[1]-c[1],dy2=d[1]-c[1],sx=a[0]-b[0]+c[0]-d[0],sy=a[1]-b[1]+c[1]-d[1];const den=dx1*dy2-dx2*dy1,g=(sx*dy2-dx2*sy)/den,h=(dx1*sy-sx*dy1)/den;const xx=b[0]-a[0]+g*b[0],xy=d[0]-a[0]+h*d[0],yx=b[1]-a[1]+g*b[1],yy=d[1]-a[1]+h*d[1];el.style.transform=`matrix3d(${xx/width},${yx/width},0,${g/width},${xy/height},${yy/height},0,${h/height},0,0,1,0,${a[0]},${a[1]},0,1)`;}
for(const id of ['#desk-sleeve','#cover-records'])homography($(id),[[1196,333],[1311,333],[1306,445],[1189,441]]);
homography($('#room-sleeve'),[[1315,475],[1435,483],[1394,503],[1304,491]]);
homography($('#paper-left'),[[313,248],[771,245],[774,499],[288,503]],520,230);
homography($('#paper-right'),[[897,242],[1363,240],[1440,791],[882,790]],520,510);
let fit={scale:1,x:0,y:0},deskFocus='record',bookPage='contents',roomCenter=1130;
function fitFrame(){
 const w=innerWidth,h=innerHeight,portrait=w<=700&&h>w,stage=$('#scene-window');
 document.body.classList.toggle('portrait',portrait);
 syncNotebookPages();
 homography($('#paper-left'),portrait?[[313,248],[771,245],[784,550],[277,554]]:[[313,248],[771,245],[774,499],[288,503]],520,portrait?330:230);
 let s,x,y;
 if(portrait){
  const footerTop=$('footer').getBoundingClientRect().top,bottom=h-footerTop+10;
  const roomTop=$('header').getBoundingClientRect().bottom+12;
  const heading=view==='room'?$('#welcome'):view==='desk'?$('#desk-caption'):view==='seat'?$('#seat-caption'):$('#mobile-note-picker');
  const top=view==='room'?roomTop:heading.getBoundingClientRect().bottom+16;
  stage.style.top=`${top}px`;stage.style.bottom=`${bottom}px`;
  $('#welcome').style.top=`${roomTop+16}px`;$('#room-explore').style.bottom=`${bottom+12}px`;
  const height=stage.clientHeight,roomHeight=Math.max(1,h-bottom-roomTop),roomScale=Math.max(w/W,roomHeight/H);
  if(view==='book'){
   s=Math.max((w-24)/640,height/(H-165));x=w/2-(bookPage==='contents'?530:1160)*s;y=-165*s;
  }else{
   s=view==='room'?roomScale:view==='seat'?Math.max(w/560,height/600):Math.max(w/820,height/740);
   const center=view==='room'?roomCenter:view==='seat'?1180:deskFocus==='record'?755:1250;
   x=Math.max(w-W*s,Math.min(0,w/2-center*s));
   const focalY=view==='seat'?530:deskFocus==='record'?485:415;
   y=view==='room'?Math.min(0,(height-H*s)/2):Math.max(height-H*s,Math.min(0,height*.5-focalY*s));
  }
  $('#frame').style.setProperty('--scene-scale',s);
  const anchorButton=(id,anchor,width)=>{const screenX=x+anchor*s;const clamped=Math.max(width/2+10,Math.min(w-width/2-10,screenX));$(id).style.left=`${(clamped-x)/s}px`;};
  anchorButton('#desk-hotspot',1160,100);anchorButton('#room-book-hotspot',1280,72);
  anchorButton('#turntable-hotspot',1080,86);anchorButton('#table-records-hotspot',920,76);
  anchorButton('#desk-book-hotspot',view==='desk'?1070:1160,96);
  $('#desk-book-hotspot').style.top=`${(Math.min(height-30,y+(view==='desk'?635:490)*s)-y)/s}px`;
 }else{
  $('#welcome').style.top='';$('#room-explore').style.bottom='';
  stage.style.top=stage.style.bottom='';$('#desk-hotspot').style.left=$('#room-book-hotspot').style.left=$('#desk-book-hotspot').style.left='';$('#desk-book-hotspot').style.top='';$('#turntable-hotspot').style.left=$('#table-records-hotspot').style.left='';
  s=view==='desk'?Math.max(w/W,h/1045):Math.max(w/W,h/H)*(view==='seat'?1.65:1);
  x=view==='seat'?Math.max(w-W*s,Math.min(0,w/2-1220*s)):(w-W*s)/2;
  y=view==='desk'?(h-1045*s)/2:view==='seat'?h*.5-490*s:(h-H*s)/2;
 }
 $('#frame').style.setProperty('--scene-scale',s);fit={scale:s,x,y};gsap.set($('#frame'),{x,y,scale:s});syncRoomFocus();
 const reading=$('#paper-right .paper-scroll');reading.style.height='';
 if(portrait&&view==='book'){const bounds=reading.getBoundingClientRect(),available=stage.getBoundingClientRect().bottom-bounds.top-16,ratio=bounds.height/reading.offsetHeight;reading.style.height=`${Math.min(400,Math.max(40,available/ratio))}px`;}
 ensureRender();
}
function syncRoomFocus(){document.body.dataset.roomFocus=roomCenter<780?'shelves':'desk';}
function focusRoom(center){roomCenter=center;syncRoomFocus();if(view!=='room'||!document.body.classList.contains('portrait'))return;const frame=$('#frame');gsap.killTweensOf(frame);const previous=Number(gsap.getProperty(frame,'x'));fitFrame();const target=fit.x;if(!reduced.matches){gsap.set(frame,{x:previous});gsap.to(frame,{x:target,duration:.75,ease:'power2.inOut'});}}
$('#look-shelves').onclick=()=>focusRoom(430);$('#look-desk').onclick=()=>focusRoom(1130);$('#shelves-hotspot').onclick=()=>$('#archive').classList.add('open');
let handledTouchClick=0;
document.addEventListener('pointerdown',()=>{handledTouchClick=0;},true);
document.addEventListener('click',e=>{if(e.isTrusted&&e.detail>0&&handledTouchClick&&performance.now()-handledTouchClick<600){e.preventDefault();e.stopImmediatePropagation();}},true);
function bindTouchAction(button){let press;button.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')press={id:e.pointerId,x:e.clientX,y:e.clientY};});button.addEventListener('pointercancel',()=>{press=null;});button.addEventListener('pointerup',e=>{const start=press;press=null;if(start&&start.id===e.pointerId&&Math.hypot(e.clientX-start.x,e.clientY-start.y)<12){e.preventDefault();handledTouchClick=performance.now();button.click();}});}
['#look-shelves','#look-desk','#shelves-hotspot','#welcome button','#play','#physical-play','#enter-room','#sign-toggle','#desk-hotspot','#turntable-hotspot','#table-records-hotspot','#seat-records','#cover-records'].forEach(id=>bindTouchAction($(id)));
function focusDesk(next){if(!['record','sleeve'].includes(next))return;deskFocus=next;$$('[data-focus]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.focus===next)));if(view!=='desk'||!document.body.classList.contains('portrait'))return;const frame=$('#frame');gsap.killTweensOf(frame);const previous={x:Number(gsap.getProperty(frame,'x')),y:Number(gsap.getProperty(frame,'y')),scale:Number(gsap.getProperty(frame,'scale'))};fitFrame();const target={...fit};if(!reduced.matches){gsap.set(frame,previous);gsap.to(frame,{...target,duration:.45,ease:'power2.out'});}}
$$('[data-focus]').forEach(b=>b.onclick=()=>focusDesk(b.dataset.focus));
function syncNotebookPages(){document.body.dataset.bookPage=bookPage;$$('[data-page]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.page===bookPage)));const portrait=document.body.classList.contains('portrait');$('#paper-left').inert=portrait&&bookPage!=='contents';$('#paper-right').inert=portrait&&bookPage!=='writing';}
function focusNotebook(next){if(!['contents','writing'].includes(next))return;bookPage=next;syncNotebookPages();if(view!=='book'||!document.body.classList.contains('portrait'))return;const frame=$('#frame');gsap.killTweensOf(frame);const previous={x:Number(gsap.getProperty(frame,'x')),y:Number(gsap.getProperty(frame,'y')),scale:Number(gsap.getProperty(frame,'scale'))};fitFrame();const target={...fit};if(!reduced.matches){gsap.set(frame,previous);gsap.to(frame,{...target,duration:.45,ease:'power2.out'});}}
$$('[data-page]').forEach(b=>b.onclick=()=>focusNotebook(b.dataset.page));
function readNote(id){noteId=id;updateNotes();focusNotebook('writing');}
function bindNoteChoice(button,id){let press;button.onclick=()=>readNote(id);button.onpointerdown=e=>{if(e.pointerType==='touch')press={id:e.pointerId,x:e.clientX,y:e.clientY};};button.onpointercancel=()=>{press=null;};button.onpointerup=e=>{const start=press;press=null;if(start&&start.id===e.pointerId&&Math.hypot(e.clientX-start.x,e.clientY-start.y)<12){e.preventDefault();readNote(id);}};}
let swipeStart;
$('#scene-window').addEventListener('pointerdown',e=>{swipeStart=null;if(document.body.classList.contains('portrait')&&e.isPrimary&&!e.target.closest('button,input,a')){swipeStart={id:e.pointerId,x:e.clientX,y:e.clientY,frameX:Number(gsap.getProperty($('#frame'),'x')),scale:fit.scale};if(view==='room'){$('#scene-window').setPointerCapture(e.pointerId);gsap.killTweensOf($('#frame'));}}});
$('#scene-window').addEventListener('pointermove',e=>{if(view!=='room'||!swipeStart||swipeStart.id!==e.pointerId)return;const dx=e.clientX-swipeStart.x,dy=e.clientY-swipeStart.y;if(Math.abs(dx)<6||Math.abs(dx)<Math.abs(dy))return;const x=Math.max(innerWidth-W*swipeStart.scale,Math.min(0,swipeStart.frameX+dx));roomCenter=(innerWidth/2-x)/swipeStart.scale;fit.x=x;gsap.set($('#frame'),{x});syncRoomFocus();});
$('#scene-window').addEventListener('pointerup',e=>{if(!swipeStart||e.pointerId!==swipeStart.id)return;const dx=e.clientX-swipeStart.x,dy=e.clientY-swipeStart.y;swipeStart=null;if(view==='room'){fitFrame();return;}if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.5){if(view==='book')focusNotebook(dx<0?'writing':'contents');else if(view==='desk')focusDesk(dx<0?'sleeve':'record');}});
$('#scene-window').addEventListener('pointercancel',()=>{swipeStart=null;if(view==='room')fitFrame();});
function applyView(next){if(next==='room'&&view!=='room')roomCenter=1130;if(next==='book'&&view!=='book')focusNotebook('contents');if(next==='desk'&&view!=='desk')focusDesk('record');view=next;document.body.dataset.view=view;homography($('#device-seek'),view==='desk'?[[72,14],[535,28],[535,57],[72,42]]:[[34,7],[194,7],[194,21],[34,21]],view==='desk'?475:160,view==='desk'?32:14);fitFrame();$('#archive').classList.remove('open');$('#archive').inert=true;$('#open-archive').setAttribute('aria-expanded','false');$$('[data-go]').forEach(b=>b.classList.toggle('active',b.dataset.go===view));const desk=view==='desk',book=view==='book',shared=!book;gsap.set($('#desk-photo'),{opacity:desk?1:0});labelGroup.position.set(desk?728:1076,desk?435:406,0);labelGroup.scale.set(desk?64:24,desk?9.5:4.1,1);spindle.position.set(desk?728:1076,desk?433:404.5,.1);spindle.scale.set(desk?2:1,desk?2:1,1);signGroup.visible=signGlow.visible=!desk&&!book;for(const id of ['#desk-sleeve','#cover-records'])homography($(id),desk?[[1072,206],[1441,209],[1424,566],[1052,554]]:[[1196,333],[1311,333],[1306,445],[1189,441]]);gsap.set($('#book-photo'),{opacity:book?1:0});gsap.set($('#permanent-poster'),{opacity:0});gsap.set($('#desk-occlusion'),{opacity:shared&&!desk?1:0});gsap.set($('#record-layer'),{opacity:shared?1:0});gsap.set($('#desk-sleeve'),{opacity:shared?1:0});gsap.set($('#room-sleeve'),{opacity:0});ensureRender();}
function cancelJourney(){journeyToken++;clearTimeout(journeyTimer);const v=$('#journey');v.onended=v.onerror=null;v.pause();v.style.display='none';gsap.killTweensOf(v);document.body.classList.remove('traveling');}
function dissolve(next){
 const frame=$('#frame'),stage=$('#scene-window'),from=view;
 gsap.killTweensOf([frame,stage]);
 if(reduced.matches){applyView(next);gsap.set(frame,{opacity:1});return;}
 if(from!=='book'&&next!=='book'&&from!=='desk'&&next!=='desk'){
  const portrait=document.body.classList.contains('portrait');
  const previous={x:Number(gsap.getProperty(frame,'x')),y:Number(gsap.getProperty(frame,'y')),scale:Number(gsap.getProperty(frame,'scale'))};
  const previousStage={top:stage.offsetTop,bottom:innerHeight-stage.offsetTop-stage.offsetHeight};
  applyView(next);
  const target={...fit},targetStage={top:parseFloat(stage.style.top),bottom:parseFloat(stage.style.bottom)};
  gsap.set(frame,{...previous,opacity:1});
  const move=gsap.timeline({defaults:{duration:1.35,ease:'power2.inOut'}});
  if(portrait){gsap.set(stage,previousStage);move.to(stage,targetStage,0);}
  move.to(frame,target,0);
  return;
 }
 gsap.to(frame,{opacity:0,duration:.22,onComplete:()=>{applyView(next);gsap.set(frame,{scale:fit.scale*1.025});gsap.to(frame,{opacity:1,scale:fit.scale,duration:.65,ease:'power2.out'});}});
}
function setView(next,forceVideo=false){if(!['room','seat','desk','book'].includes(next))return;const from=view;cancelJourney();if(next==='seat'&&from==='room'&&videoUrl&&(!reduced.matches||forceVideo)){const token=journeyToken,v=$('#journey');v.src=videoUrl;v.currentTime=0;v.muted=true;v.style.display='block';gsap.set(v,{opacity:1});document.body.classList.add('traveling');const finish=()=>{if(token!==journeyToken)return;clearTimeout(journeyTimer);applyView('seat');gsap.to(v,{opacity:0,duration:reduced.matches?0:.25,onComplete:()=>{v.pause();v.style.display='none';document.body.classList.remove('traveling');}});};v.onended=finish;v.onerror=()=>{if(token===journeyToken){cancelJourney();dissolve(next);message('This video could not be played. Using the still views.');}};journeyTimer=setTimeout(()=>{if(token===journeyToken){cancelJourney();dissolve(next);}},30000);v.play().catch(()=>{if(token===journeyToken){cancelJourney();dissolve(next);message('Video playback unavailable. Using the still views.');}});return;}dissolve(next);}
function message(text){$('#message').textContent=text;$('#message').style.display='block';clearTimeout(message.timer);message.timer=setTimeout(()=>$('#message').style.display='none',4500);}
function safeUrl(value){try{const u=new URL(value);return /^https?:$/.test(u.protocol)?u.href:'';}catch{return '';}}
function sleeve(el){el.replaceChildren();const e=current();if(e.cover){const img=new Image();img.src=e.cover;img.alt=e.title;el.append(img);return;}const series=document.createElement('span');series.className='series';series.textContent='THE SEARCH FOR SKIP JAMES';const title=document.createElement('h2');title.textContent=e.title;const stamp=document.createElement('div');stamp.className='stamp';stamp.textContent=e.motif==='fish'?'≈':'✕';const signature=document.createElement('div');signature.className='signature';signature.textContent='DJ LOFI';const date=document.createElement('span');date.className='date';date.textContent=new Date(e.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});el.append(series,title,stamp,signature,date);}
function updateContent(){sleeve($('#desk-sleeve'));sleeve($('#room-sleeve'));$('#current-title').textContent=current().title;$('#transport-title').textContent=current().title;$('#audio-status').textContent=current().mixcloudKey?'Listen with the official Mixcloud player':audioSource()?'Original episode audio':'Add audio to listen to this episode';const source=safeUrl(current().source);$('#episode-source').hidden=!source;$('#episode-source').href=source||'#';archive.setData(data);updateNotes();drawLabel();for(const id of ['#volume','#device-volume'])$(id).disabled=!!current().mixcloudKey;}
function updateNotes(){const n=note();$('#note-title').textContent=n.title;$('#note-text').textContent=n.text;$('#note-kind').textContent=n.kind==='summary'?'Summary · Substack':n.excerpt?'An excerpt from Substack':'From the notebook';$('#note-date').hidden=!n.date;$('#note-date').textContent=n.date?new Date(n.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'';const url=safeUrl(n.source);$('#note-source').hidden=!url;$('#note-source').href=url||'#';$('#note-source').textContent=url.includes('substack.com')?'Read full post on Substack ↗':'Read the original ↗';$('#note-list').replaceChildren();$('#mobile-notes').replaceChildren();for(const item of data.notes){const b=document.createElement('button');b.className='note-choice'+(item.id===n.id?' active':'');b.textContent=item.title;bindNoteChoice(b,item.id);$('#note-list').append(b);const option=document.createElement('option');option.value=item.id;option.textContent=item.title;option.selected=item.id===n.id;$('#mobile-notes').append(option);}$('#paper-right .paper-scroll').scrollTop=0;}
const audio=$('#audio');function audioSource(){return sessionAudio.get(current().id)||safeUrl(current().audioUrl);}
let mixPosition=0,mixDuration=0;
const mixPlayer=createMixcloud({onPlay(){if(!current().mixcloudKey)return;playing=true;lastTick=performance.now();ensureRender();updateTransport();},onPause(){if(current().mixcloudKey){playing=false;updateTransport();}},onProgress(position,duration){if(current().mixcloudKey){mixPosition=position;mixDuration=duration;updateTransport();}},onError(){if(current().mixcloudKey){playing=false;updateTransport();message('Use the official player below, or open the original show.');}}});
const archive=mountArchive({data,selected:()=>episodeId,onSelect:selectEpisode});
$('#shelves-hotspot').onclick=()=>archive.open('collection');
function stopSound(){audio.pause();mixPlayer.pause();for(const o of oscillators){try{o.stop();o.disconnect();}catch{}}oscillators=[];if(gain){gain.disconnect();gain=null;}}
async function startSound(){if(current().mixcloudKey){await mixPlayer.play(current());return;}const src=audioSource();if(!src)throw Error('No episode audio supplied.');if(audio.dataset.episode!==current().id){audio.src=src;audio.dataset.episode=current().id;audio.load();}audio.volume=volume;await audio.play();}
let playbackToken=0;
async function togglePlay(){const token=++playbackToken;if(playing){playing=false;stopSound();updateTransport();return;}try{await startSound();if(token!==playbackToken){stopSound();return;}if(!current().mixcloudKey)playing=true;lastTick=performance.now();ensureRender();updateTransport();}catch{playing=false;stopSound();message(current().mixcloudKey?'Use the official Mixcloud player or open the original show.':'The episode could not be played. Check your connection or open its source.');updateTransport();}}
function setVolume(v){volume=Math.max(0,Math.min(1,Number(v)));audio.volume=volume;if(gain)gain.gain.setTargetAtTime(volume*.018,audioContext.currentTime,.03);$('#volume').value=$('#device-volume').value=volume;$('#volume-knob').style.setProperty('--volume-angle',`${-135+volume*270}deg`);}
function updateTransport(){const isMix=!!current().mixcloudKey,t=isMix?mixPosition:audioSource()?audio.currentTime:0,duration=isMix?mixDuration:audio.duration;$('#play').textContent=playing?'Ⅱ':'▶';$('#play').ariaLabel=playing?'Pause record':'Play record';$('#physical-play').ariaLabel=playing?'Pause record':'Play record';$('#physical-play').setAttribute('aria-pressed',String(playing));$('#physical-play .device-play-icon').textContent=playing?'Ⅱ':'▶';$('#physical-play .device-play-label').textContent=playing?'Pause':'Play';$('#play-status').textContent=playing?(isMix?'Playing on Mixcloud':'Playing episode'):'Ready to listen';$('#device-time').textContent=`${Math.floor(t/60).toString().padStart(2,'0')}:${Math.floor(t%60).toString().padStart(2,'0')}`;const seekable=(!!audioSource()||isMix)&&Number.isFinite(duration)&&duration>0;$('#device-progress').disabled=!seekable;$('#device-progress').value=seekable?100*t/duration:0;}
async function selectEpisode(id){const resume=playing;playbackToken++;playing=false;stopSound();mixPlayer.clear();episodeId=id;elapsed=mixPosition=mixDuration=0;audio.removeAttribute('src');audio.dataset.episode='';updateContent();updateTransport();setView('desk');if(current().mixcloudKey)mixPlayer.show(current());if(resume)await togglePlay();}
audio.addEventListener('ended',()=>{playing=false;updateTransport();});audio.addEventListener('error',()=>{if(playing){playing=false;updateTransport();message('The audio source is unavailable.');}});audio.addEventListener('loadedmetadata',updateTransport);
$('#device-progress').oninput=async e=>{if(current().mixcloudKey){if(!await mixPlayer.seek(Number(e.target.value)*mixDuration/100))message('Mixcloud does not allow seeking to that position.');}else if(Number.isFinite(audio.duration))audio.currentTime=Number(e.target.value)*audio.duration/100;updateTransport();};
$$('[data-go]').forEach(b=>b.onclick=e=>{e.preventDefault();setView(b.dataset.go);});$('#desk-hotspot').onclick=()=>setView('seat');$('#turntable-hotspot').onclick=()=>setView('desk');$('#table-records-hotspot').onclick=$('#seat-records').onclick=$('#cover-records').onclick=()=>archive.open('shows');$('#room-book-hotspot').onclick=$('#desk-book-hotspot').onclick=()=>setView('book');$('#play').onclick=$('#physical-play').onclick=togglePlay;$('#volume').oninput=$('#device-volume').oninput=e=>setVolume(e.target.value);$('#mobile-notes').onchange=e=>readNote(e.target.value);
function changeNote(direction){const i=data.notes.findIndex(n=>n.id===note().id);readNote(data.notes[(i+direction+data.notes.length)%data.notes.length].id);}$('#previous-note').onclick=$('#mobile-previous-note').onclick=()=>changeNote(-1);$('#next-note').onclick=$('#mobile-next-note').onclick=()=>changeNote(1);
function portlandLight(){const date=new Date();$('#portland-time').textContent=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',hour:'numeric',hourCycle:'h23'}).format(date));const daylight=Math.max(0,Math.sin((hour-6)/12*Math.PI));$('#light-wash').style.opacity=(1-daylight)*.15;}
function setEditor(mode){editorMode=mode;$$('[data-editor]').forEach(b=>b.classList.toggle('active',b.dataset.editor===mode));$('#content-form').style.display=mode==='video'?'none':'block';$('#video-editor').style.display=mode==='video'?'block':'none';$('.episode-field').style.display=mode==='episode'?'block':'none';$('.note-field').style.display=mode==='note'?'block':'none';$('.record-field').style.display=mode==='record'?'block':'none';$('#content-artist').required=mode==='record';$('#record-cover').required=mode==='record';$('#content-date').required=mode==='episode';$('#content-text').required=mode==='note';$('#editor-error').textContent='';}
$$('[data-editor]').forEach(b=>b.onclick=()=>setEditor(b.dataset.editor));$('#open-studio').onclick=()=>{$('#studio').showModal();};$('#close-studio').onclick=()=>$('#studio').close();$('#content-date').value=new Date().toISOString().slice(0,10);
async function fileData(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('The file could not be read.'));r.readAsDataURL(file);});}
$('#content-form').onsubmit=async event=>{event.preventDefault();const title=$('#content-title').value.trim();if(!title)return;const id=crypto.randomUUID();try{const next=structuredClone(data);let localFile;if(editorMode==='episode'){const file=$('#content-cover').files[0];if(file&&(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>1500000))throw Error('Choose a PNG, JPG or WebP cover under 1.5 MB.');const cover=file?await fileData(file):'';next.episodes.push({id,title,date:$('#content-date').value,cover,audioUrl:safeUrl($('#content-audio').value),source:safeUrl($('#content-source').value),motif:'fish'});next.episodes.sort((a,b)=>b.date.localeCompare(a.date));localFile=$('#content-local-audio').files[0];}else if(editorMode==='record'){const file=$('#record-cover').files[0];if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>1500000)throw Error('Choose a PNG, JPG or WebP photograph under 1.5 MB.');next.collection.unshift({id,title,artist:$('#content-artist').value.trim(),format:$('#content-format').value,cover:await fileData(file),source:safeUrl($('#content-source').value)});}else next.notes.unshift({id,title,text:$('#content-text').value.trim(),source:safeUrl($('#content-source').value),excerpt:false});localStorage.setItem(KEY,JSON.stringify(next));data=next;if(editorMode==='episode'){if(localFile)sessionAudio.set(id,URL.createObjectURL(localFile));await selectEpisode(data.episodes[0].id);}else if(editorMode==='record'){updateContent();archive.open('collection');}else{noteId=id;updateContent();setView('book');}$('#studio').close();$('#content-form').reset();$('#content-date').value=new Date().toISOString().slice(0,10);message('Added to your listening room.');}catch(e){$('#editor-error').textContent=e.name==='QuotaExceededError'?'Browser storage is full. Export content and use a smaller cover.':e.message;}};
$('#camera-video').onchange=event=>{const f=event.target.files[0];if(!f)return;if(!['video/mp4','video/webm'].includes(f.type)||f.size>80*1024*1024){$('#editor-error').textContent='Choose an MP4 or WebM video under 80 MB.';return;}cancelJourney();if(videoUrl)URL.revokeObjectURL(videoUrl);videoUrl=URL.createObjectURL(f);videoName=f.name;$('#video-status').textContent=`Ready: ${f.name} · local session only`;$('#preview-video').disabled=false;$('#editor-error').textContent='';};
$('#preview-video').onclick=()=>{$('#studio').close();cancelJourney();applyView('room');gsap.set($('#frame'),{opacity:1});setView('seat',true);};$('#remove-video').onclick=()=>{cancelJourney();if(videoUrl)URL.revokeObjectURL(videoUrl);videoUrl=videoName='';$('#camera-video').value='';$('#preview-video').disabled=true;$('#video-status').textContent='No camera video added. The same photograph zooms smoothly.';applyView(view);};
$('#export-content').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='dj-lofi-content.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);};
$('#reset-content').onclick=()=>{localStorage.removeItem(KEY);playbackToken++;playing=false;stopSound();mixPlayer.clear();for(const url of sessionAudio.values())URL.revokeObjectURL(url);sessionAudio.clear();audio.removeAttribute('src');audio.dataset.episode='';data=structuredClone(base);episodeId=data.episodes[0].id;noteId=data.notes[0].id;elapsed=0;updateContent();updateTransport();message('Imported archive restored.');};
addEventListener('resize',fitFrame);reduced.addEventListener('change',ensureRender);addEventListener('pagehide',()=>{stopSound();if(videoUrl)URL.revokeObjectURL(videoUrl);for(const url of sessionAudio.values())URL.revokeObjectURL(url);});
function finishEntrance(){entryPhase='entered';document.body.dataset.entry=entryPhase;$('#experience').inert=false;$('#entrance').hidden=true;gsap.to(document.body,{'--entry-ui':1,duration:reduced.matches?0:1.4,ease:'sine.inOut',onComplete:()=>$('#welcome button').focus({preventScroll:true})});}
const entranceLights={desk:0,globe:0,ambient:0};
const entryStages=[];
function entryStage(stage){entryPhase=stage;document.body.dataset.entry=stage;entryStages.push({stage,time:performance.now()});}
function paintEntranceLights(){for(const name of ['desk','globe','ambient'])document.body.style.setProperty(`--${name}-light`,entranceLights[name]);label.material.opacity=.88*entranceLights.desk;spindle.material.transparent=true;spindle.material.opacity=entranceLights.desk;ensureRender();}
$('#enter-room').onclick=()=>{
 if(entryPhase!=='waiting')return;
 entryStage('clearing');$('#enter-room').disabled=true;$('.entrance-hint').textContent='Opening the room…';
 const fast=reduced.matches;
 const timeline=gsap.timeline({id:'room-entrance',onComplete:()=>{entryStages.push({stage:'entered',time:performance.now()});finishEntrance();}});
 timeline.to($('.entrance-copy'),{opacity:0,y:fast?0:-8,duration:fast?0:.3},0)
 .to(document.body,{'--entry-blur':'0px','--room-brightness':1,duration:fast?0:.65,ease:'power2.out'},0)
 .call(()=>entryStage('dark')).to({},{duration:fast?0:.25})
 .call(()=>entryStage('desk-light'))
 .to(entranceLights,{desk:1,duration:fast?0:.7,ease:'power2.inOut',onUpdate:paintEntranceLights})
 .to({},{duration:fast?0:.12})
 .call(()=>entryStage('globe-light'))
 .to(entranceLights,{globe:1,ambient:1,duration:fast?0:.7,ease:'power2.inOut',onUpdate:paintEntranceLights})
 .to({},{duration:fast?0:.15})
 .call(()=>{entryStage('on-air');signOn=true;$('#sign-toggle').setAttribute('aria-pressed','true');$('#sign-toggle').ariaLabel='Switch the ON AIR sign off';})
 .to(signPower,{amount:1,duration:fast?0:.4,onUpdate:paintSign})
 .to({},{duration:fast?0:.15});
};
paintEntranceLights();
updateContent();setVolume(volume);updateTransport();applyView('room');setEditor('episode');portlandLight();setInterval(portlandLight,30000);
Promise.all([$('#room-photo').decode(),$('#room-unlit').decode()]).catch(()=>{}).then(()=>{$('#enter-room').disabled=false;$('#enter-room').focus({preventScroll:true});});
window.lofiHybrid={getState:()=>({view,playing,volume,title:current().title,noteTitle:note().title,episodes:data.episodes.length,notes:data.notes.length,collection:data.collection.length,recordAngle:label.rotation.z,hasWebGL:!!renderer.getContext(),hasVideo:!!videoUrl,traveling:document.body.classList.contains('traveling'),cover:current().cover,fit,videoName,entryPhase,entranceLights:{desk:entranceLights.desk,globe:entranceLights.globe,ambient:entranceLights.ambient},entryStages:[...entryStages],signOn,signBrightness:signPower.amount}),setView};


