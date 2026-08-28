window.__NUO_BUILD__="20260828-codex-v1"; console.info("[NUO BUILD]", window.__NUO_BUILD__);
window.addEventListener("error",(e)=>{
  const box=document.getElementById("runtimeError");
  if(box){
    box.style.display="block";
    box.textContent="运行错误："+(e.message||"unknown");
  }
  console.error(e.error||e.message);
});
window.addEventListener("unhandledrejection",(e)=>{
  const box=document.getElementById("runtimeError");
  if(box){
    box.style.display="block";
    box.textContent="运行错误："+String(e.reason||"Promise rejected");
  }
  console.error(e.reason);
});

if (!window.gsap || !window.THREE || typeof window.createThresholdScene !== "function") {
  throw new Error("离线启动失败：本地动画或场景文件未加载。请确认未单独移动 index.html，并保留 vendor、src 与 assets 文件夹。");
}

const createThresholdScene = window.createThresholdScene;

/* =========================================================
   CORE STATE
========================================================= */
const $ = (s)=>document.querySelector(s);
const state = {
  muted:false,
  introDone:false,
  ritualStep:0,
  name:"",
  wish:"",
  selected:0,
  storyStep:0,
  choices:[],
  getFace:null,
  portraitMode:"unseen",
  portraitStream:null,
  portraitTimer:null,
  holdValue:0,
  doorOpened:false,
  thresholdReady:false,
  gamepadHolding:false,
};

/* =========================================================
   DATA LAYER / INTERFACES
   可被后续接真实 API 替换
========================================================= */
const GET_FACE_DATA = window.NuoGetFaceData;
const GET_FACE_DOMAIN = window.NuoGetFaceDomain;
if (!GET_FACE_DATA || !GET_FACE_DOMAIN) throw new Error("得面内容未加载，请保留 src/get-face-data.js 与 src/get-face-domain.js。");
const MASKS = GET_FACE_DATA.masks;
const STORY = GET_FACE_DATA.story;
const CODEX_DATA = GET_FACE_DATA.codex;
const CodexCollection = window.NuoCodexCollection;
const MaskReliefViewer = window.NuoMaskReliefViewer;
if (!CODEX_DATA || !CodexCollection || !MaskReliefViewer) throw new Error("傩谱模块未加载，请保留 codex-collection.js 与 mask-relief-viewer.js。");
$("#ritual")?.style.setProperty("--altar-focus",CODEX_DATA.altar?.focalPoint || "50% 50%");
let codexViewer = null;
let codexActiveMaskId = null;
let codexFocusReturn = null;
let codexOpening = false;
let codexTimeline = null;
let codexState = "locked";
let altarOrbitTimeline = null;
let altarSelectionTimeline = null;
let altarScenePhase = "idle";
let selectedSceneMask = null;

/* =========================================================
   EVENT BUS
========================================================= */
const EventBus = {
  map:new Map(),
  on(name, handler){
    if(!this.map.has(name)) this.map.set(name, []);
    this.map.get(name).push(handler);
  },
  emit(name, payload){
    (this.map.get(name) || []).forEach(fn=>fn(payload));
  }
};

/* =========================================================
   AUDIO LAYER
   可替换成真实素材或 WebAudio 混音
========================================================= */
const AudioEngine = {
  ac:null, master:null, started:false,
  init(){
    if(this.started) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return;
    const ac = this.ac = new AC();
    const master = this.master = ac.createGain();
    master.gain.value = .9;
    master.connect(ac.destination);
    this._createDrone();
    this.started = true;
  },
  _createDrone(){
    if(!this.ac) return;
    const ac = this.ac;
    [46.25,69.3].forEach((f,i)=>{
      const o=ac.createOscillator(), g=ac.createGain();
      o.type=i?"triangle":"sine"; o.frequency.value=f; g.gain.value=i?.03:.05;
      o.connect(g); g.connect(this.master); o.start();
    });
  },
  resume(){
    if(this.ac && this.ac.state==="suspended") this.ac.resume();
  },
  setMuted(m){
    state.muted = m;
    if(this.master && this.ac){
      this.master.gain.linearRampToValueAtTime(m?0:.9,this.ac.currentTime+.2);
    }
    $("#soundBtn").textContent = m ? "声 · 关" : "声 · 开";
  },
  playCue(type="wood"){
    this.init();
    this.resume();
    if(!this.ac || state.muted) return;
    const ac=this.ac,t=ac.currentTime;
    if(type==="wood"){
      const o=ac.createOscillator(),g=ac.createGain();
      o.type="triangle";o.frequency.setValueAtTime(210,t);o.frequency.exponentialRampToValueAtTime(150,t+.18);
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.24,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+.25);
      o.connect(g);g.connect(this.master);o.start();o.stop(t+.27);
    }else if(type==="gong" || type==="heavy"){
      const sum=ac.createGain();sum.gain.value=type==="heavy"?.38:.24;sum.connect(this.master);
      [52,78,111,146].forEach((f,i)=>{
        const o=ac.createOscillator(),g=ac.createGain();
        o.frequency.value=f;o.type=i<2?"sine":"triangle";
        g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime([1,.5,.22,.1][i],t+.01);
        g.gain.exponentialRampToValueAtTime(.0001,t+2.8+i*.3);
        o.connect(g);g.connect(sum);o.start();o.stop(t+4);
      });
    }else if(type==="suck"){
      const len=ac.sampleRate*1.2;
      const buf=ac.createBuffer(1,len,ac.sampleRate);
      const d=buf.getChannelData(0);
      for(let i=0;i<len;i++) d[i]=(Math.random()*2-1);
      const src=ac.createBufferSource(),bp=ac.createBiquadFilter(),g=ac.createGain();
      src.buffer=buf;
      bp.type="bandpass"; bp.frequency.setValueAtTime(280,t); bp.frequency.exponentialRampToValueAtTime(90,t+1.2);
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.12,t+.08);g.gain.exponentialRampToValueAtTime(.0001,t+1.2);
      src.connect(bp);bp.connect(g);g.connect(this.master);src.start(t);src.stop(t+1.25);
    }
  }
};

/* =========================================================
   INPUT LAYER
   鼠标 / 键盘 / 手柄
========================================================= */
const InputLayer = {
  mouse:{x:0,y:0},
  gamepadIndex:null,
  init(){
    window.addEventListener("mousemove", (e)=>{
      this.mouse.x = (e.clientX / innerWidth - .5);
      this.mouse.y = (e.clientY / innerHeight - .5);
      EventBus.emit("mouse:move", {...this.mouse});
    });

    window.addEventListener("keydown", (e)=>{
      if(state.thresholdReady && !state.doorOpened){
        if(e.code==="Space" || e.code==="Enter"){
          e.preventDefault();
          startHold("keyboard");
        }
      }
    });
    window.addEventListener("keyup", (e)=>{
      if(e.code==="Space" || e.code==="Enter"){
        cancelHold("keyboard");
      }
    });

    window.addEventListener("gamepadconnected", (e)=>{
      this.gamepadIndex = e.gamepad.index;
      EventBus.emit("gamepad:connected", e.gamepad);
    });
    window.addEventListener("gamepaddisconnected", ()=>{
      this.gamepadIndex = null;
    });

    this.loopGamepad();
  },
  loopGamepad(){
    const loop = ()=>{
      if(this.gamepadIndex !== null){
        const gp = navigator.getGamepads()[this.gamepadIndex];
        if(gp){
          const aPressed = gp.buttons[0]?.pressed;
          if(state.thresholdReady && !state.doorOpened){
            if(aPressed && !state.gamepadHolding){
              state.gamepadHolding = true;
              startHold("gamepad");
            }else if(!aPressed && state.gamepadHolding){
              state.gamepadHolding = false;
              cancelHold("gamepad");
            }
          }
        }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
};

/* =========================================================
   GLOBAL API EXPOSED
========================================================= */
window.NuoDemoAPI = {
  version:"0.5-continuous-threshold",
  config:{
    introDurationMs:1350,
    doorHoldMs:1200,
    setIntroDuration(ms){ this.introDurationMs=Math.max(800,Number(ms)||2200); },
    setDoorHold(ms){ this.doorHoldMs=Math.max(300,Number(ms)||1200); },
  },
  data:{
    getMasks:()=>MASKS,
    getStory:()=>STORY,
    getRoles:()=>GET_FACE_DATA.roles.map(({id,name,duty,kind,maskIndex})=>({id,name,duty,kind,maskIndex})),
    getCurrentResult:()=>state.getFace ? structuredClone(state.getFace) : null,
    provider:null,
    setProvider(fn){ this.provider=typeof fn==="function"?fn:null; },
    async fetchMasks(){
      return this.provider ? await this.provider() : MASKS;
    },
    selectMaskByText(text){
      return MASKS[GET_FACE_DOMAIN.resolveVisual(GET_FACE_DATA, text || "")];
    }
  },
  audio:{
    customCues:new Map(),
    init:()=>AudioEngine.init(),
    playCue(name){
      const custom=this.customCues.get(name);
      if(custom){ custom(); return; }
      AudioEngine.playCue(name);
    },
    registerCue(name,handler){
      if(typeof handler==="function") this.customCues.set(name,handler);
    },
    mute:()=>AudioEngine.setMuted(true),
    unmute:()=>AudioEngine.setMuted(false),
    setMuted:(v)=>AudioEngine.setMuted(v),
  },
  input:{
    bindings:new Map(),
    getMouse:()=>({...InputLayer.mouse}),
    getGamepad:()=>{
      const i=InputLayer.gamepadIndex;
      return i===null?null:navigator.getGamepads()[i];
    },
    bind(action,handler){
      if(typeof handler==="function") this.bindings.set(action,handler);
    },
    trigger(action,payload){
      const fn=this.bindings.get(action);
      if(fn) fn(payload);
    },
    onMouseMove:(fn)=>EventBus.on("mouse:move", fn),
    onGamepadConnect:(fn)=>EventBus.on("gamepad:connected", fn),
    onMaskDragStart:(fn)=>EventBus.on("mask:dragStart", fn),
    onMaskSnap:(fn)=>EventBus.on("mask:snapToFace", fn),
    onDoorOpened:(fn)=>EventBus.on("door:opened", fn),
  },
  events:{
    on:(name,fn)=>EventBus.on(name,fn),
    emit:(name,payload)=>EventBus.emit(name,payload),
  },
  result:{
    getCurrent:()=>state.getFace ? structuredClone(state.getFace) : null,
    retryOmen:()=>requestOmen()
  },
  codex:{
    getCollection:()=>CodexCollection.list(CODEX_DATA.storageKey),
    getEntry:(maskId)=>CodexCollection.get(CODEX_DATA.storageKey,maskId),
    open:(maskId)=>openCodexEntry(maskId),
    clear:()=>clearCodexCollection(),
    getState:()=>codexState
  },
  ceremony:{
    getState:()=>altarScenePhase,
    replay:()=>{ if(state.ritualStep>=2) playMaskSelectionCinematic(); },
    reset:()=>{ altarSelectionTimeline?.kill(); altarScenePhase="idle"; altarSelectionActive=false; setAltarOrbit(0,0); startAltarOrbit(); }
  },
  portrait:{
    getMode:()=>state.portraitMode,
    stop:()=>stopPortraitPreview(),
    // 保留给后续真实采集适配器；默认流程不会调用摄像头。
    requestCameraPreview:()=>startPortraitPreview()
  },
  debugState:state,
};

/* =========================================================
   HELPERS
========================================================= */
const app = $("#app");
function setDepth(p){ gsap.to("#depthFill",{width:`${p}%`,duration:.6,ease:"power2.out"}) }
function setPhase(t){ $("#phase").textContent = t; }

function switchScreen(el,{immediate=false}={}){
  ["#intro","#ritual","#outro"].forEach(sel=>{
    const s=$(sel); s.classList.remove("active"); s.style.pointerEvents="none";
  });
  el.classList.add("active");
  el.style.pointerEvents="auto";
  gsap.killTweensOf(el);
  if(immediate) gsap.set(el,{opacity:1});
  else gsap.fromTo(el,{opacity:0},{opacity:1,duration:.55});
}
function impact(level=1){
  const px=level>1.2?10:6;
  gsap.timeline().to(app,{x:-px,y:2,rotationZ:-.12*level,duration:.04})
    .to(app,{x:px*.7,y:-2,rotationZ:.08*level,duration:.05})
    .to(app,{x:0,y:0,rotationZ:0,duration:.18,ease:"elastic.out(1,.45)"});
  gsap.fromTo("#shock",{opacity:.42*level,scale:.25},{opacity:0,scale:7+level*2,duration:1.1,ease:"power2.out"});
  gsap.fromTo("#lens",{opacity:.2,scale:.9},{opacity:0,scale:1.35,duration:.8,ease:"power2.out"});
  gsap.fromTo("#flash",{opacity:0},{opacity:.05+.05*level,duration:.05,yoyo:true,repeat:1});
}
function crush(level=1){
  gsap.timeline().to(app,{scaleY:.94,scaleX:1.025,y:8,duration:.17,ease:"power2.in"})
    .to(app,{scaleY:1.01,scaleX:.996,y:-3,duration:.2})
    .to(app,{scaleY:1,scaleX:1,y:0,duration:.28,ease:"elastic.out(1,.55)"});
}
function setCopy(eyebrow,title,desc){
  const e=$("#ritualEyebrow"), t=$("#ritualTitle"), d=$("#ritualDesc");
  gsap.timeline().to([e,t,d],{opacity:0,y:-8,duration:.25})
    .add(()=>{e.textContent=eyebrow; t.textContent=title; d.textContent=desc;})
    .to(e,{opacity:1,y:0,duration:.4})
    .to(t,{opacity:1,y:0,duration:.5},"-=.3")
    .to(d,{opacity:1,y:0,duration:.5},"-=.34");
}
function showInput(placeholder){
  $("#choiceWrap").style.pointerEvents="none";
  gsap.to("#choiceWrap",{opacity:0,duration:.2});
  gsap.to("#continueWrap",{opacity:0,duration:.2,pointerEvents:"none"});
  $("#textInput").value="";
  $("#textInput").placeholder=placeholder;
  gsap.to("#inputWrap",{opacity:1,pointerEvents:"auto",duration:.4});
  setTimeout(()=>$("#textInput").focus(),100);
}
function hideInput(){ gsap.to("#inputWrap",{opacity:0,pointerEvents:"none",duration:.2}); }
function showPortraitRite(){
  hideInput();
  state.portraitMode="symbolic";
  setCopy("照 · 相", "汝之状貌", "傩引以影采相。无需取镜，不分析、不保存、不上传你的面部。 ");
  $("#portraitFrame").classList.add("portrait-fallback");
  $("#portraitNote").textContent="象征采相正在进行，约两秒后将自动入坛。";
  gsap.to("#portraitRite",{opacity:1,pointerEvents:"auto",duration:.45});
  clearTimeout(state.portraitTimer);
  state.portraitTimer=setTimeout(()=>confirmPortrait("symbolic"),1900);
}
function hidePortraitRite(){
  clearTimeout(state.portraitTimer);
  state.portraitTimer=null;
  gsap.to("#portraitRite",{opacity:0,pointerEvents:"none",duration:.22});
  stopPortraitPreview();
}
function stopPortraitPreview(){
  const stream=state.portraitStream;
  if(stream) stream.getTracks().forEach(track=>track.stop());
  state.portraitStream=null;
  const video=$("#portraitVideo");
  if(video) video.srcObject=null;
}
async function startPortraitPreview(){
  const note=$("#portraitNote");
  if(!navigator.mediaDevices?.getUserMedia || !window.isSecureContext){
    state.portraitMode="silhouette";
    note.textContent="当前环境无法安全启镜，已改用象征剪影；不会采集任何面部资料。";
    $("#portraitFrame").classList.add("portrait-fallback");
    return;
  }
  try{
    stopPortraitPreview();
    state.portraitStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user"},audio:false});
    $("#portraitVideo").srcObject=state.portraitStream;
    $("#portraitFrame").classList.remove("portrait-fallback");
    state.portraitMode="preview";
    note.textContent="取景仅在本机预览。确认后将立即关闭镜头；系统不会截帧、识别或上传。";
  }catch(error){
    console.warn("portrait preview unavailable",error?.name);
    state.portraitMode="silhouette";
    $("#portraitFrame").classList.add("portrait-fallback");
    note.textContent="未取得镜头权限，已改用象征剪影；不会采集任何面部资料。";
  }
}
function confirmPortrait(mode){
  state.portraitMode=mode || state.portraitMode || "silhouette";
  hidePortraitRite();
  chooseMask();
}
function showContinue(txt){
  $("#continueBtn").textContent = txt;
  gsap.to("#continueWrap",{opacity:1,pointerEvents:"auto",duration:.4});
}

$("#portraitStart").addEventListener("click",()=>startPortraitPreview());
$("#portraitConfirm").addEventListener("click",()=>confirmPortrait());
$("#portraitSkip").addEventListener("click",()=>confirmPortrait("symbolic"));
document.addEventListener("visibilitychange",()=>{ if(document.hidden) stopPortraitPreview(); });
window.addEventListener("pagehide",()=>{
  stopPortraitPreview();
  altarOrbitTimeline?.kill();
  altarSelectionTimeline?.kill();
  codexTimeline?.kill();
  codexViewer?.dispose();
});
function hideContinue(){ gsap.to("#continueWrap",{opacity:0,pointerEvents:"none",duration:.2}); }
function showChoices(arr){
  const wrap = $("#choiceWrap");
  wrap.innerHTML = "";
  arr.forEach((label, idx)=>{
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.textContent = label;
    btn.onclick = ()=>chooseStory(idx);
    wrap.appendChild(btn);
  });
  gsap.to(wrap,{opacity:1,pointerEvents:"auto",duration:.4});
}

/* =========================================================
   INTRO AUTO ABSORB FLOW
========================================================= */
function startExperience(){
  thresholdScene.ready.then(runIntro).catch((error)=>{
    console.error(error);
    $("#runtimeError").textContent="开场资源加载失败，请刷新重试。";
    $("#runtimeError").style.display="block";
  });
}

const thresholdScene=createThresholdScene({
  canvas:$("#thresholdCanvas"),
  onComplete:showGate,
  onDoorOpened:()=>EventBus.emit("threshold:crossed",{}),
  onReady:()=>EventBus.emit("threshold:ready",{})
});
window.addEventListener("resize",()=>thresholdScene.resize());

function runIntro(){
  const INTRO_MS=1350;
  setPhase("OPENING");
  setDepth(8);
  gsap.set([".topbar",".depth",".sound-btn",".dev-chip","#thresholdUI"],{autoAlpha:0});
  EventBus.emit("intro:pullStart",{duration:INTRO_MS});
  setDepth(34);
  thresholdScene.intro();
}

/* =========================================================
   GATE FLOW
========================================================= */
function showGate(){
  state.thresholdReady=true;
  setPhase("NUO GATE");
  setDepth(82);
  gsap.to([".topbar",".depth",".sound-btn",".dev-chip","#thresholdUI"],{autoAlpha:1,duration:.28,overwrite:"auto"});
  EventBus.emit("gate:ready",{});
  EventBus.emit("intro:complete",{duration:1350});
}

let holdTween = null;
function applyHoldProgress(p){
  state.holdValue = p;
  $("#holdProgress").style.setProperty("--p", (360*p) + "deg");
  if(p>.18 && p<.92){
    gsap.to("#holdTip",{opacity:.78,duration:.1});
  }
}
function startHold(source="mouse"){
  if(state.doorOpened) return;
  if(holdTween) return;
  EventBus.emit("door:holdStart", {source});
  AudioEngine.init();
  AudioEngine.resume();
  AudioEngine.playCue("wood");
  $("#holdTip").textContent = "门在回应";
  holdTween = gsap.to({p:state.holdValue},{
    p:1,duration:window.NuoDemoAPI?.config?.doorHoldMs/1000 || 1.2,ease:"none",
    onUpdate:function(){ applyHoldProgress(this.targets()[0].p); },
    onComplete:()=>openDoor(source)
  });
}
function cancelHold(source="mouse"){
  if(state.doorOpened) return;
  EventBus.emit("door:holdCancel", {source});
  if(holdTween){ holdTween.kill(); holdTween = null; }
  gsap.to({p:state.holdValue},{
    p:0,duration:.22,ease:"power2.out",
    onUpdate:function(){ applyHoldProgress(this.targets()[0].p); }
  });
  $("#holdTip").textContent = "按住门环";
}

$("#holdBtn").addEventListener("pointerdown",(e)=>{ e.preventDefault(); startHold("mouse"); });
["pointerup","pointerleave","pointercancel"].forEach(ev=>$("#holdBtn").addEventListener(ev,()=>cancelHold("mouse")));

function openDoor(source="mouse"){
  state.doorOpened = true;
  holdTween = null;
  EventBus.emit("door:opened", {source});
  setPhase("THRESHOLD");
  setDepth(100);
  AudioEngine.playCue("heavy");
  impact(1.25); crush(1);

  gsap.to("#thresholdUI",{autoAlpha:0,duration:.2,overwrite:"auto"});
  const passage=thresholdScene.openDoor();
  passage?.eventCallback("onComplete",()=>{
    // The interior plane is already framed by the same camera.  Let ritual UI
    // take over on that exact frame; a DOM fade here would reintroduce a seam.
    startRitual();
  });
}

/* =========================================================
   RITUAL / DRAGON ALTAR
========================================================= */
function makeDust(){
  const field = $("#particleField");
  for(let i=0;i<18;i++){
    const d=document.createElement("i");
    d.className="dust";
    d.style.left=Math.random()*100+"%";
    d.style.top=Math.random()*100+"%";
    d.style.transform=`scale(${.6+Math.random()*1.7})`;
    field.appendChild(d);
    gsap.to(d,{
      x:(Math.random()-.5)*80,y:-20-Math.random()*120,opacity:.08+Math.random()*.24,
      duration:5+Math.random()*5,repeat:-1,yoyo:true,ease:"sine.inOut",delay:Math.random()*3
    });
  }
}
makeDust();

function maskImage(i, className=""){
  const m=MASKS[i];
  return `<img class="mask-source ${className}" src="${m.asset}" alt="${m.name}面" draggable="false">`;
}

const ALTAR_MASK_INDICES=[0,2,1,3,0,1,2];
const ALTAR_AMBIENT_LAYOUT=[
  {maskIndex:2,className:"altar-ambient altar-foreground altar-left"},
  {maskIndex:1,className:"altar-ambient altar-foreground altar-right"},
  {maskIndex:3,className:"altar-ambient altar-mid altar-left-mid"},
  {maskIndex:0,className:"altar-ambient altar-mid altar-right-mid"},
  {maskIndex:2,className:"altar-ambient altar-far altar-center-far"}
];

function createAltarAtmosphere(){
  const field=$("#ritualAmbientMasks");
  field.innerHTML="";
  ALTAR_AMBIENT_LAYOUT.forEach(({maskIndex,className})=>{
    const node=document.createElement("div");
    node.className=className;
    node.innerHTML=maskImage(maskIndex,"altar-ambient-image");
    field.appendChild(node);
  });
}
createAltarAtmosphere();

ALTAR_MASK_INDICES.forEach((maskIndex,slotIndex)=>{
  const el=document.createElement("div");
  el.className="mask scene-mask";
  el.dataset.maskIndex=String(maskIndex);
  el.dataset.slotIndex=String(slotIndex);
  el.innerHTML=`<div class="mask-card mask-photo"><div class="face">${maskImage(maskIndex,"scene-mask-image")}</div><div class="back scene-mask-back"><span>傩</span><i aria-hidden="true"></i></div><i aria-hidden="true"></i></div>`;
  $("#maskRing").appendChild(el);
});
const masks=[...document.querySelectorAll(".mask")];
let altarSelectionActive=false;

function altarOrbitPosition(slot, phase=0){
  const angle=phase+slot*Math.PI*2/masks.length;
  const depth=(Math.sin(angle)+1)/2;
  return {
    x:Math.cos(angle)*innerWidth*.31,
    y:Math.sin(angle)*innerHeight*.16-innerHeight*.07,
    scale:.40+depth*.52,
    opacity:.14+depth*.50,
    zIndex:String(8+Math.round(depth*24)),
    rotationZ:Math.cos(angle)*3
  };
}
function setAltarOrbit(phase=0,duration=.7){
  masks.forEach((mask,slot)=>{
    const pose=altarOrbitPosition(slot,phase);
    mask.style.zIndex=pose.zIndex;
    gsap.to(mask,{...pose,duration,ease:"power2.inOut",overwrite:"auto"});
  });
}
function startAltarOrbit(){
  altarOrbitTimeline?.kill();
  altarOrbitTimeline=gsap.timeline({repeat:-1,defaults:{ease:"sine.inOut"}});
  for(let step=1;step<=4;step++){
    masks.forEach((mask,slot)=>{
      const pose=altarOrbitPosition(slot,step*Math.PI/2);
      altarOrbitTimeline.to(mask,{...pose,duration:4.4+(slot%3)*.32,overwrite:"auto"},(step-1)*4.2);
    });
  }
}
setAltarOrbit(0,0); startAltarOrbit();

function startRitual(){
  switchScreen($("#ritual"),{immediate:true});
  document.body.classList.add("ritual-active");
  $("#ritual").classList.add("ritual-invocation");
  setPhase("DRAGON ALTAR");
  AudioEngine.playCue("gong");

  gsap.timeline()
    .from("#ritualAtmosphere",{opacity:0,duration:1.25,ease:"power2.out"})
    .from(".altar-ambient",{opacity:0,stagger:.11,duration:1.2,ease:"power2.out"},"-=.92")
    .from(".scene-mask",{opacity:0,scale:"-=.12",y:"+=16",stagger:.09,duration:1.1,ease:"power3.out"},"-=1.02")
    .to(["#ritualEyebrow","#ritualTitle"],{opacity:1,stagger:.08,duration:.48},"-=.58")
    .to("#inputWrap",{opacity:1,pointerEvents:"auto",duration:.38},"-=.24");
}

$("#inputBtn").onclick = submitRitual;
$("#textInput").addEventListener("keydown",(e)=>{ if(e.key==="Enter") submitRitual(); });

function submitRitual(){
  const v = $("#textInput").value.trim();
  if(!v) return;
  AudioEngine.playCue("wood");

  if(state.ritualStep===0){
    state.name=v; state.ritualStep=1;
    $("#ritual").classList.remove("ritual-invocation");
    setCopy("问 · 愿", `${v}，你为何而来？`, "说出此刻最放不下的一件事。不必说得完整，傩引只需要知道，你真正被什么卡住。");
    showInput("例如：工作、感情、前路、家人、恐惧……");
    EventBus.emit("ritual:name",{name:v});
  }else{
    state.wish=v; state.ritualStep=2;
    EventBus.emit("ritual:wish",{wish:v});
    showPortraitRite();
  }
}

function pickMask(text){
  return GET_FACE_DOMAIN.resolveVisual(GET_FACE_DATA,text||"");
}

function chooseMask(){
  state.selected = pickMask(state.wish);
  altarSelectionActive=true;
  selectedSceneMask=masks.find(mask=>Number(mask.dataset.maskIndex)===state.selected) || masks[0];
  playMaskSelectionCinematic();
}

$("#continueBtn").onclick = ()=>{
  hideContinue();
  if(state.storyStep < STORY.length){
    startStoryStep(state.storyStep++);
  }else{
    finishStory();
  }
};

function startStoryStep(i){
  const sc = STORY[i];
  impact(.5);
  setCopy(sc.eyebrow, sc.title, sc.desc);
  showChoices(sc.choices);
}
function chooseStory(idx){
  AudioEngine.playCue("heavy");
  state.choices.push(idx);
  impact(1); crush(.5);
  gsap.to("#choiceWrap",{opacity:0,pointerEvents:"none",duration:.25});

  const textMap = [
    idx===0 ? "你走了进去。路没有变亮，但鼓点替你把下一步敲了出来。" : "你停了一步。于是你听见的，不再只是鼓声，而是自己的犹豫。",
    idx===0 ? "你直视火光。真正让你难受的，不一定是那件事本身，而是你一直不肯承认的害怕。" : "你避开火光，可它还是从侧面照见了你。答案没有消失，只是被你暂时放在了一边。",
    idx===0 ? "你承认了恐惧，影子便不再追你。" : "你守住所求，影子退后一步。你第一次知道自己为什么不想退。"
  ];
  const titleMap = ["门已经开了","火已经照过","影已经认了"];
  setCopy("幕 · 已过", titleMap[state.storyStep-1], textMap[state.storyStep-1]);
  showContinue(state.storyStep===STORY.length ? "出戏" : "进入下一幕");
}

function buildEndingEmbers(){
  const box=$("#endingEmbers");
  box.innerHTML="";
  for(let i=0;i<26;i++){
    const p=document.createElement("i");
    p.style.left=(8+Math.random()*84)+"%";
    p.style.top=(60+Math.random()*38)+"%";
    box.appendChild(p);
    gsap.fromTo(p,{opacity:0,y:20+Math.random()*30},{
      opacity:.08+Math.random()*.28,
      y:-100-Math.random()*180,
      x:(Math.random()-.5)*50,
      duration:4+Math.random()*5,
      delay:Math.random()*1.6,
      repeat:-1,
      ease:"none"
    });
  }
}

function escapeHtml(value){
  return String(value||"").replace(/[&<>"']/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[char]);
}
function buildGetFace(){
  const resolved=GET_FACE_DOMAIN.resolveRole(GET_FACE_DATA,{
    name:state.name,wish:state.wish,choices:state.choices,maskIndex:state.selected
  });
  const variant=GET_FACE_DOMAIN.buildVariant(GET_FACE_DATA,{name:state.name,wish:state.wish,choices:state.choices},resolved.role);
  const sourceMap=new Map(GET_FACE_DATA.sources.map(source=>[source.id,source]));
  state.getFace={
    role:resolved.role,
    mask:resolved.mask,
    variant,
    evidence:{wish:state.wish,choices:[...state.choices],score:resolved.score},
    sources:resolved.role.sources.map(id=>sourceMap.get(id)).filter(Boolean),
    omen:{status:"idle",qian:"神意正在成形",jie:"傩引正在将此回的愿望与选择结成一段未定的解释。",error:null,meta:null}
  };
  return state.getFace;
}
function makeCollectionEntry(result=state.getFace){
  if(!result) return null;
  const role=result.role;
  return {
    mask:result.mask,
    role,
    variant:result.variant,
    visualText:`视觉母体：${result.mask.name}。固定标志为${role.signs.join("、")}；本回变体采用${result.variant.tint}色调与${result.variant.mark}，${state.portraitMode==="preview"?"镜头仅作本机预览，不参与分析。":"以象征剪影入坛。"}`,
    reasonText:`本回愿望主题与三幕选择共同指向此面。${role.reason}`,
    sources:result.sources,
    omen:result.omen
  };
}
function persistCurrentResult(){
  const entry=makeCollectionEntry();
  if(entry) CodexCollection.upsert(CODEX_DATA.storageKey,entry);
}
function renderResultScroll(result=state.getFace){
  if(!result) return;
  const role=result.role, omen=result.omen;
  $("#resultVisual").textContent=result.visualText || makeCollectionEntry(result).visualText;
  $("#resultReason").textContent=result.reasonText || makeCollectionEntry(result).reasonText;
  $("#resultQian").textContent=omen.qian;
  $("#resultJie").textContent=omen.jie;
  $("#resultBackground").textContent=role.background;
  const kind=role.kind==="traditional_reference"?"传统职司借鉴":"项目新创";
  $("#resultSources").innerHTML=`<p class="source-status">${kind} · ${GET_FACE_DATA.localAssetNotice}</p>`+result.sources.map(source=>`<a class="source-link" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer"><b>${escapeHtml(source.title)}</b><small>${escapeHtml(source.institution)} · ${escapeHtml(source.accessedAt)}</small><em>${escapeHtml(source.meaning)}</em><i>${escapeHtml(source.imageRights)}</i></a>`).join("");
  const canRetry=result===state.getFace;
  $("#retryOmen").hidden=!canRetry;
  $("#retryOmen").disabled=omen.status==="pending";
  $("#retryOmen").textContent=omen.status==="pending"?"傩引正在结签":"重新求签";
}
async function requestOmen(){
  const result=state.getFace;
  if(!result || result.omen.status==="pending") return;
  result.omen.status="pending";
  result.omen.qian="神意正在成形";
  result.omen.jie="傩引正在结签，请稍候。";
  renderResultScroll();
  const payload={
    request_id:crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    wish:state.wish,
    choices:state.choices,
    role:{id:result.role.id,name:result.role.name,duty:result.role.duty,reason:result.role.reason,kind:result.role.kind},
    evidence:{mask_id:result.mask.id,signs:result.role.signs,prompt_version:GET_FACE_DATA.promptVersion}
  };
  try{
    const response=await fetch("/api/v1/omen",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const body=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(body.message || body.code || "傩签未能成形");
    result.omen={status:"ready",qian:body.qian,jie:body.jie,error:null,meta:body.meta};
    $("#endingQianText").textContent=`${body.qian}。`;
  }catch(error){
    result.omen={status:"error",qian:"神意未成",jie:"这一次傩引未能结出文字。你可以保留已得之面，或在网络与本地服务可用后重新求签。",error:error.message||"请求失败",meta:null};
    $("#endingQianText").textContent="神意未成，可入谱后重新求签。";
  }
  persistCurrentResult();
  renderResultScroll();
}

function finishStory(){
  buildGetFace();
  persistCurrentResult();
  document.body.classList.remove("ritual-active");
  setPhase("REVELATION");
  AudioEngine.playCue("heavy");
  impact(1.25);
  crush(.9);
  gsap.to("#ritual",{opacity:0,duration:.6,onComplete:()=>{
    switchScreen($("#outro"));
    playEndingCinematic();
    requestOmen();
  }});
}

function playEndingCinematic(){
  const result=state.getFace;
  const m=result.mask;
  const role=result.role;
  const end=$("#endingCinematic");
  const codex=$("#codexWorld");

  codex.style.display="none";
  end.style.display="block";
  end.style.opacity=1;
  end.style.pointerEvents="none";

  $("#endingMask").innerHTML=maskImage(state.selected,"ending-source");
  $("#endingMask").dataset.tint=result.variant.tint;
  $("#endingName").textContent=`傩 · ${role.name}`;
  $("#endingDuty").textContent=`职司 · ${role.duty}`;
  $("#endingQianText").textContent="神意正在成形。";
  buildEndingEmbers();

  gsap.set(["#endingDisc","#endingMask","#endingKicker","#endingName","#endingDuty","#endingQian","#endingSeal","#endingRecord","#endingEnter",".ending-fog"],{opacity:0});
  gsap.set("#endingDisc",{scale:.64});
  gsap.set("#endingMask",{scale:1.9,filter:"blur(10px) drop-shadow(0 34px 52px rgba(0,0,0,.92))"});
  gsap.set("#endingSeal",{scale:1.8,rotation:-7});

  const tl=gsap.timeline({defaults:{ease:"power3.out"}});
  tl
    .to(".ending-fog",{opacity:.62,duration:1.2,stagger:.12},"+=.18")
    .to("#endingDisc",{opacity:1,scale:1,duration:1.3,ease:"power2.out"},"-=.9")
    .to("#endingMask",{opacity:.18,duration:.35},"-=.65")
    .to("#endingMask",{opacity:1,scale:1.02,filter:"blur(0px) drop-shadow(0 34px 52px rgba(0,0,0,.92))",duration:1.35,ease:"power4.out"},"-=.12")
    .add(()=>{AudioEngine.playCue("heavy");impact(1.35);crush(.8);},"-=.02")
    .to("#endingKicker",{opacity:1,duration:.35},"+=.25")
    .fromTo("#endingName",{opacity:0,x:-30},{opacity:1,x:0,duration:.62,ease:"power4.out"},"-=.16")
    .fromTo("#endingDuty",{opacity:0,x:-14},{opacity:1,x:0,duration:.42},"-=.32")
    .to("#endingQian",{opacity:1,duration:.58},"-=.15")
    .add(()=>AudioEngine.playCue("wood"),"+=.16")
    .to("#endingSeal",{opacity:.78,scale:1,rotation:-7,duration:.30,ease:"back.out(1.7)"},"<")
    .to("#endingRecord",{opacity:1,duration:.42},"+=.12")
    .to("#endingEnter",{opacity:.62,duration:.48},"+=.58")
    .add(()=>{
      end.style.pointerEvents="auto";
      end.style.cursor="pointer";
      end.onclick=enterCodex;
    });
}

function codexGlyph(kind){
  const common=`<svg viewBox="0 0 100 132" aria-hidden="true"><path d="M50 8 C76 10 88 35 84 68 C81 102 65 122 50 126 C35 122 19 102 16 68 C12 35 24 10 50 8 Z"/><circle cx="34" cy="60" r="8"/><circle cx="66" cy="60" r="8"/>`;
  const tails={
    mountain:`<path class="secondary" d="M25 89 L41 73 L50 82 L62 64 L78 89 M30 104 Q50 94 70 104"/>`,
    knot:`<path class="secondary" d="M27 87 C38 75 46 77 50 88 C54 77 62 75 73 87 C64 101 55 105 50 96 C45 105 36 101 27 87Z"/>`,
    scale:`<path class="secondary" d="M50 76 V108 M30 88 H70 M29 90 L21 106 H37 Z M71 90 L63 106 H79 Z"/>`,
    lamp:`<path class="secondary" d="M50 80 C39 96 39 105 50 112 C61 105 61 96 50 80 Z M31 92 Q50 80 69 92"/>`,
    unknown:`<path class="secondary" d="M36 85 Q50 71 64 85 M39 101 H61"/>`
  };
  return common+(tails[kind]||tails.unknown)+`</svg>`;
}
function codexNumber(index){ return String(index+1).padStart(2,"0"); }
function buildCodex(){
  codexTimeline?.kill();
  codexState="locked";
  const wall=$("#codexWall");
  const entries=CodexCollection.list(CODEX_DATA.storageKey);
  const collected=Object.keys(entries).length;
  $("#codexCount").textContent=`已获得 ${collected} / ${CODEX_DATA.slots.length}`;
  $("#codexTitleCount").textContent=`（${collected} / ${CODEX_DATA.slots.length}）`;
  $("#codexDetail").setAttribute("aria-hidden","false");
  $("#codexEmptyState").hidden=false;
  $("#codexViewer").hidden=true;
  $("#codexViewerFallback").hidden=true;
  wall.innerHTML="";
  CODEX_DATA.slots.forEach((slot,index)=>{
    const mask=MASKS.find(item=>item.id===slot.id);
    const entry=mask ? entries[mask.id] : null;
    const visual=mask?.visual?.card || {primary:"#61594d",secondary:"#766f63",glyph:"unknown"};
    const stateClass=entry?"acquired-idle":"locked";
    const label=entry?entry.role.name:"未得之面";
    const card=document.createElement("div");
    card.className=`codex-person ${stateClass}`;
    card.style.setProperty("--card-a",visual.primary);
    card.style.setProperty("--card-b",visual.secondary);
    card.innerHTML=`<div class="codex-card" role="${entry?"button":"img"}" tabindex="${entry?"0":"-1"}" aria-label="${escapeHtml(entry?`查看已收录的${mask.name}`:`${label}面具`)}">
      <div class="codex-card-face codex-card-back"><div class="codex-card-glyph">${codexGlyph(visual.glyph)}</div><div class="codex-card-meta"><span class="codex-card-index">谱 · ${codexNumber(index)}</span><span class="codex-card-name">${escapeHtml(label)}</span></div></div>
      <div class="codex-card-face codex-card-flip"></div>
    </div>`;
    if(entry){
      const activate=()=>openCodexEntry(mask.id,card);
      card.querySelector(".codex-card").addEventListener("click",activate);
      card.querySelector(".codex-card").addEventListener("keydown",event=>{ if(event.key==="Enter"||event.key===" "){ event.preventDefault(); activate(); } });
    }
    wall.appendChild(card);
  });
}

async function openCodexEntry(maskId, trigger){
  const entry=CodexCollection.get(CODEX_DATA.storageKey,maskId);
  const mask=MASKS.find(item=>item.id===maskId);
  if(!entry || !mask || codexOpening) return false;
  if(codexActiveMaskId===maskId && codexState==="revealed") return true;
  codexOpening=true;
  try{
  codexTimeline?.kill();
  codexState="selected";
  codexFocusReturn=trigger?.querySelector?.(".codex-card") || document.activeElement;
  const card=trigger || [...document.querySelectorAll(".codex-person")].find(item=>item.querySelector(".codex-card")?.getAttribute("aria-label")?.includes(mask.name));
  document.querySelectorAll(".codex-person.selected").forEach(item=>item.classList.remove("selected"));
  card?.classList.add("selected","opening");
  codexActiveMaskId=maskId;
  $("#codexDetailNum").textContent=`第${["壹","贰","叁","肆"][MASKS.indexOf(mask)]||"未定"}面 · 已收录`;
  $("#codexDetailName").textContent=entry.role.name;
  $("#codexDetailDuty").textContent=`职司 · ${entry.role.duty}`;
  $("#codexDetailText").textContent=`视觉母体 · ${mask.name}`;
  renderResultScroll(entry);
  const detail=$("#codexDetail");
  detail.setAttribute("aria-hidden","false");
  document.body.classList.add("codex-detail-open");
  $("#codexEmptyState").hidden=true;
  $("#codexViewer").hidden=false; $("#codexViewerFallback").hidden=true;
  if(codexViewer) codexViewer.dispose();
  codexViewer=new MaskReliefViewer($("#codexViewer"),{...CODEX_DATA.relief, ...(mask.visual?.relief||{})});
  try{
    await codexViewer.mount(mask);
  }catch(error){
    console.warn("codex relief unavailable",error?.message);
    codexViewer?.dispose(); codexViewer=null;
    $("#codexViewer").hidden=true;
    const fallback=$("#codexViewerFallback");
    fallback.hidden=false;
    fallback.innerHTML=`<img src="${escapeHtml(mask.asset)}" alt="${escapeHtml(mask.name)} 原始面具图"/><p>3D 查看不可用，已显示原始视觉母体。</p>`;
  }
  const sourceRect=card?.getBoundingClientRect();
  const viewerRect=($("#codexViewer").hidden ? $("#codexViewerFallback") : $("#codexViewer")).getBoundingClientRect();
  const fromX=sourceRect ? sourceRect.left+sourceRect.width/2-viewerRect.left-viewerRect.width/2 : -viewerRect.width*.56;
  const fromY=sourceRect ? sourceRect.top+sourceRect.height/2-viewerRect.top-viewerRect.height/2 : 0;
  const stage=$(".codex-viewer-column");
  codexTimeline=gsap.timeline({onComplete:()=>{codexState="revealed";card?.classList.remove("opening");}})
    .set(stage,{transformPerspective:1500})
    .fromTo(stage,{x:fromX,y:fromY,scale:.26,rotationY:0,opacity:.35},{x:0,y:0,scale:1,rotationY:180,opacity:1,duration:.54,ease:"power3.inOut"})
    .to(stage,{rotationY:360,duration:.48,ease:"power2.out"})
    .fromTo(".codex-detail-copy",{opacity:0,y:14},{opacity:1,y:0,duration:.52,ease:"power2.out"},"-=.14");
  AudioEngine.playCue("wood");
  setTimeout(()=>$("#codexClose").focus(),30);
  return true;
  }finally{ codexOpening=false; }
}

function closeCodexDetail(){
  const detail=$("#codexDetail");
  if(codexState==="locked") return;
  codexTimeline?.kill();
  codexViewer?.dispose(); codexViewer=null; codexActiveMaskId=null;
  codexState="locked";
  document.querySelectorAll(".codex-person.selected,.codex-person.opening").forEach(item=>item.classList.remove("selected","opening"));
  $("#codexEmptyState").hidden=false;
  $("#codexViewer").hidden=true;
  $("#codexViewerFallback").hidden=true;
  gsap.set(".codex-viewer-column",{clearProps:"transform"});
  gsap.set(".codex-detail-copy",{opacity:0});
  document.body.classList.remove("codex-detail-open");
  codexFocusReturn?.focus?.();
}

function clearCodexCollection(){
  if(!window.confirm("清空本机已收录的傩面与傩签？此操作不会保存愿望或人像，也无法恢复。")) return false;
  CodexCollection.clear(CODEX_DATA.storageKey);
  closeCodexDetail(); buildCodex();
  return true;
}

function enterCodex(){
  const end=$("#endingCinematic");
  const codex=$("#codexWorld");
  end.style.pointerEvents="none";
  AudioEngine.playCue("wood");

  gsap.timeline({defaults:{ease:"power3.inOut"}})
    .to(["#endingName","#endingDuty","#endingKicker","#endingQian","#endingRecord","#endingSeal"],{opacity:0,duration:.28})
    .to("#endingMask",{scale:.82,opacity:0,duration:.45},"-=.18")
    .to("#endingDisc",{scale:1.18,opacity:0,duration:.42},"-=.38")
    .to(end,{opacity:0,duration:.38},"-=.18")
    .add(()=>{
      end.style.display="none";
      buildCodex();
      codex.style.display="block";
      setPhase("CODEX");
      gsap.fromTo(codex,{opacity:0},{opacity:1,duration:.52});
      gsap.fromTo(".codex-person",{opacity:0,y:18},{opacity:1,y:0,stagger:.045,duration:.48});
      gsap.fromTo("#codexRestart",{opacity:0},{opacity:1,duration:.4,delay:.35});
      AudioEngine.playCue("gong");
    });
}

$("#codexRestart").addEventListener("click",()=>location.reload());
$("#retryOmen").addEventListener("click",()=>requestOmen());
$("#codexClose").addEventListener("click",closeCodexDetail);
$("#codexViewerReset").addEventListener("click",()=>codexViewer?.reset());
$("#codexClear").addEventListener("click",clearCodexCollection);
document.addEventListener("keydown",event=>{ if(event.key==="Escape") closeCodexDetail(); });

/* =========================================================
   SUBTLE MOUSE PARALLAX / DEV INPUT
========================================================= */
const ritualParallax={x:0,y:0,queued:false};
function queueRitualParallax(x,y){
  ritualParallax.x=x; ritualParallax.y=y;
  if(ritualParallax.queued) return;
  ritualParallax.queued=true;
  requestAnimationFrame(()=>{
    ritualParallax.queued=false;
    if(!$("#ritual").classList.contains("active") || dragMask) return;
    const px=ritualParallax.x*5, py=ritualParallax.y*3;
    $("#maskRing").style.transform=`translate3d(${px}px,${py}px,0)`;
    $("#ritualAtmosphere").style.transform=`translate3d(${-px*.48}px,${-py*.48}px,0)`;
  });
}
EventBus.on("mouse:move",({x,y})=>queueRitualParallax(x,y));

window.addEventListener("resize",()=>{ if(!altarSelectionActive) layoutRing(-Math.PI/2,.25); });


/* =========================================================
   RICH MOUSE / MASK INTERACTION — STABLE
========================================================= */
const cursorDot=$("#cursorDot");
const cursorRing=$("#cursorRing");

let cursorX=innerWidth/2;
let cursorY=innerHeight/2;
let ringX=cursorX;
let ringY=cursorY;

let dragMask=null;
let dragIndex=-1;
let dragPointerId=null;
let canDragSelected=false;

function cursorLoop(){
  if(cursorDot && cursorRing){
    ringX += (cursorX-ringX)*.16;
    ringY += (cursorY-ringY)*.16;
    cursorDot.style.left=cursorX+"px";
    cursorDot.style.top=cursorY+"px";
    cursorRing.style.left=ringX+"px";
    cursorRing.style.top=ringY+"px";
  }
  requestAnimationFrame(cursorLoop);
}
requestAnimationFrame(cursorLoop);

function faceZoneMetrics(){
  const zone=$("#faceZone");
  if(!zone) return null;
  const r=zone.getBoundingClientRect();
  return {
    el:zone,
    cx:r.left+r.width/2,
    cy:r.top+r.height/2,
    width:r.width,
    height:r.height
  };
}

function dragMaskToPointer(clientX,clientY){
  if(!dragMask) return;

  const z=faceZoneMetrics();
  if(!z) return;

  const dx=clientX-z.cx;
  const dy=clientY-z.cy;
  const dist=Math.sqrt(dx*dx+dy*dy);
  const attract=Math.max(0,1-Math.min(dist/210,1));

  // Pointer position translated into the mask-ring coordinate system.
  const targetX=clientX-innerWidth/2;
  const targetY=clientY-innerHeight*.43;

  // As it gets close to the center, reduce pointer freedom and increase scale:
  // this is the "being sucked onto the face" feeling.
  const magneticX=targetX*(1-attract*.34);
  const magneticY=targetY*(1-attract*.34);

  gsap.to(dragMask,{
    x:magneticX,
    y:magneticY,
    scale:1.10+attract*.18,
    rotationZ:dx*.003,
    duration:.06,
    overwrite:"auto",
    ease:"none"
  });

  z.el.classList.toggle("active",attract>.18);
  gsap.to(z.el,{
    opacity:.05+attract*.30,
    scale:.92+attract*.12,
    duration:.06,
    overwrite:"auto"
  });

  EventBus.emit("mask:dragMove",{
    index:dragIndex,
    x:clientX,
    y:clientY,
    attraction:attract,
    distance:dist
  });
}

window.addEventListener("pointermove",(e)=>{
  cursorX=e.clientX;
  cursorY=e.clientY;

  if($("#ritual").classList.contains("active") && !dragMask) queueRitualParallax(e.clientX/innerWidth-.5,e.clientY/innerHeight-.5);

  if(dragMask){
    dragMaskToPointer(e.clientX,e.clientY);
  }
});

document.addEventListener("pointerover",(e)=>{
  if(!cursorRing) return;
  const hot=e.target.closest(".mask,.hold-btn,.choice,.inputrow button,.continue button");
  cursorRing.classList.toggle("hot",!!hot);
});
document.addEventListener("pointerout",(e)=>{
  if(!cursorRing) return;
  if(e.target.closest(".mask,.hold-btn,.choice,.inputrow button,.continue button")){
    cursorRing.classList.remove("hot");
  }
});

function enableMaskDrag(index){
  canDragSelected=true;
  const m=selectedSceneMask;
  if(!m) return;
  m.dataset.draggable="1";
  gsap.to("#faceZone",{opacity:.06,duration:.4});
  EventBus.emit("mask:dragReady",{index,name:MASKS[index].name});
}

function beginMaskDrag(e,m,i){
  if(!canDragSelected) return;
  if(m!==selectedSceneMask) return;
  if(!$("#ritual").classList.contains("active")) return;

  e.preventDefault();
  e.stopPropagation();

  dragMask=m;
  dragIndex=i;
  dragPointerId=e.pointerId;
  m.classList.add("dragging");

  try{ m.setPointerCapture(e.pointerId); }catch(_){}

  AudioEngine.playCue("wood");
  EventBus.emit("mask:dragStart",{index:i,name:MASKS[i].name});
  dragMaskToPointer(e.clientX,e.clientY);
}

function finishMaskDrag(e){
  if(!dragMask) return;

  const m=dragMask;
  const i=dragIndex;
  const z=faceZoneMetrics();

  let dist=Infinity;
  if(z && e){
    const dx=e.clientX-z.cx;
    const dy=e.clientY-z.cy;
    dist=Math.sqrt(dx*dx+dy*dy);
  }

  try{
    if(dragPointerId!==null) m.releasePointerCapture?.(dragPointerId);
  }catch(_){}

  m.classList.remove("dragging");
  dragMask=null;
  dragIndex=-1;
  dragPointerId=null;

  $("#faceZone")?.classList.remove("active");

  if(dist<150){
    snapMaskToFace(m,i);
  }else{
    gsap.to(m,{
      x:0,
      y:-20,
      scale:1.22,
      rotationZ:0,
      duration:.52,
      overwrite:"auto",
      ease:"back.out(1.35)"
    });
    gsap.to("#faceZone",{opacity:.06,scale:1,duration:.3});
    EventBus.emit("mask:dragCancel",{index:i});
  }
}

masks.forEach((m,i)=>{
  m.addEventListener("pointerenter",()=>{
    if(!$("#ritual").classList.contains("active") || dragMask) return;
    m.classList.add("is-near");
  });

  m.addEventListener("pointerleave",()=>{
    if(dragMask===m) return;
    m.classList.remove("is-near");
  });

  m.addEventListener("pointerdown",(e)=>beginMaskDrag(e,m,i));
});

window.addEventListener("pointerup",finishMaskDrag);
window.addEventListener("pointercancel",finishMaskDrag);

function snapMaskToFace(m,i){
  canDragSelected=false;
  $("#faceZone")?.classList.remove("active");

  AudioEngine.playCue("heavy");
  impact(1.3);
  crush(.9);

  EventBus.emit("mask:snapToFace",{index:i,name:MASKS[i].name});

  gsap.timeline()
    .to(masks.filter(mask=>mask!==m),{opacity:0,y:"+=20",scale:"-=.08",duration:.72,stagger:.05,ease:"power2.in"})
    .to([".altar-ambient",".ritual-fog-mid",".ritual-fog-far"],{opacity:0,duration:.58,ease:"power2.in"},"<")
    .to(m,{
      x:0,
      y:-45,
      scale:1.55,
      rotationZ:0,
      duration:.58,
      overwrite:"auto",
      ease:"power3.in"
    })
    .to(m,{
      scale:3.9,
      opacity:.10,
      duration:.44,
      ease:"power4.in"
    })
    .add(()=>{
      setCopy(
        "戴 · 面",
        "你已经入戏",
        `${state.name}，你戴上了「${MASKS[state.selected].name}面」。不是它告诉你答案，而是从这一刻开始，你要用它的眼睛进入故事。`
      );
      showContinue("进入第一幕");
    });
}

/*
  Selected mask reveal:
  all previous behavior is preserved, except auto-slam is intentionally replaced
  by the user's drag → magnetic center → snap-to-face interaction.
*/
function fastOrbitPose(slot, turn, phaseOffset=0){
  return altarOrbitPosition(slot,phaseOffset+turn*Math.PI*2);
}

function completeMaskSelection(){
  altarScenePhase="enterStory";
  canDragSelected=false;
  EventBus.emit("mask:snapToFace",{index:state.selected,name:MASKS[state.selected].name});
  gsap.set("#flash",{opacity:0});
  gsap.to("#ritual",{opacity:1,duration:.28});
  gsap.set(masks,{opacity:0});
  setCopy(
    "戴 · 面",
    "你已经入戏",
    `${state.name}，你戴上了「${MASKS[state.selected].name}面」。不是它告诉你答案，而是从这一刻开始，你要用它的眼睛进入故事。`
  );
  showContinue("进入第一幕");
}

/* The altar owns this directed sequence.  It deliberately does not expose the
   selected mask until the array has lost control, then ejects and turns it. */
function playMaskSelectionCinematic(){
  const chosen=selectedSceneMask;
  if(!chosen) return;
  altarOrbitTimeline?.kill();
  altarSelectionTimeline?.kill();
  altarScenePhase="selecting";
  setPhase("MASK ORACLE");
  gsap.to(["#ritualEyebrow","#ritualTitle","#ritualDesc"],{opacity:0,duration:.28,overwrite:"auto"});
  gsap.to("#inputWrap",{opacity:0,pointerEvents:"none",duration:.2});
  masks.forEach(mask=>{
    mask.classList.remove("is-chosen","is-revealed");
    gsap.set(mask.querySelector(".mask-card"),{rotationY:0,transformPerspective:1200});
  });

  const tl=altarSelectionTimeline=gsap.timeline({defaults:{overwrite:"auto"},onComplete:completeMaskSelection});
  // Slow → violent: five keyed positions create nearly three complete shared turns.
  tl.add(()=>{altarScenePhase="spinning"; AudioEngine.playCue("suck");})
    .to(".ritual-fog-mid",{x:-18,scale:1.05,opacity:.58,duration:.38,ease:"power2.in"},0);
  for(let turn=1;turn<=3;turn++){
    masks.forEach((mask,slot)=>{
      const pose=fastOrbitPose(slot,turn,.2);
      tl.to(mask,{...pose,duration:.57,ease:turn===1?"power4.in":"none"},(turn-1)*.57);
    });
  }
  tl.to(".ritual-fog-front",{x:22,scale:1.08,opacity:.78,duration:.34,ease:"power2.out"},1.35)
    .add(()=>{altarScenePhase="ejecting";},1.70);
  masks.filter(mask=>mask!==chosen).forEach((mask,slot)=>{
    tl.to(mask,{x:(slot%2?-1:1)*innerWidth*(.38+slot*.025),y:innerHeight*(slot%3-.8)*.28,scale:.2,opacity:0,duration:.46,ease:"power3.in"},1.70);
  });
  const chosenCard=chosen.querySelector(".mask-card");
  tl.set(chosen,{zIndex:80})
    .to(chosen,{x:innerWidth*.16,y:-innerHeight*.13,scale:.82,opacity:1,rotationZ:8,duration:.18,ease:"power4.in"},1.70)
    .to(chosen,{x:0,y:-innerHeight*.07,scale:1.08,rotationZ:0,duration:.28,ease:"expo.out"},">")
    .set(chosenCard,{rotationY:180,transformPerspective:1300})
    .add(()=>{altarScenePhase="revealing"; AudioEngine.playCue("heavy"); impact(.72);},">-.03")
    .to(chosenCard,{rotationY:360,duration:.62,ease:"power3.inOut"},">+.10")
    .to([".ritual-fog-mid",".ritual-fog-front"],{x:0,opacity:.28,duration:.42,ease:"power2.out"},"<+.14")
    .add(()=>{AudioEngine.playCue("gong"); impact(1.25);},">-.06")
    .add(()=>{altarScenePhase="impact";},">+.28")
    .to(chosen,{scale:4.8,y:-innerHeight*.06,opacity:1,filter:"blur(0px)",duration:.46,ease:"power4.in"})
    .to(chosen,{scale:7.2,opacity:.08,filter:"blur(5px)",duration:.18,ease:"power4.in"})
    .add(()=>{AudioEngine.playCue("heavy"); impact(1.45); crush(.58); gsap.fromTo("#flash",{opacity:.72},{opacity:0,duration:.18});},"<+.05")
    .add(()=>{altarScenePhase="blackout";},">")
    .to("#ritual",{opacity:0,duration:.10})
    .to({}, {duration:.42});
}


/* =========================================================
   START + SOUND
========================================================= */
const soundBtnEl=$("#soundBtn");
if(soundBtnEl){
  soundBtnEl.addEventListener("click",()=>{
    AudioEngine.init();
    AudioEngine.resume();
    AudioEngine.setMuted(!state.muted);
  });
}
if(location.protocol==="file:"){
  const box=$("#runtimeError");
  box.style.display="block";
  box.textContent="完整得面需要通过 start.bat、start.ps1 或本地 server.py 启动；离线页面不会伪造傩签。";
}
InputLayer.init();
requestAnimationFrame(()=>startExperience());
