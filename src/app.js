window.__NUO_BUILD__="20260828-file-textures-v6"; console.info("[NUO BUILD]", window.__NUO_BUILD__);
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
  holdValue:0,
  doorOpened:false,
  thresholdReady:false,
  gamepadHolding:false,
};

/* =========================================================
   DATA LAYER / INTERFACES
   可被后续接真实 API 替换
========================================================= */
const MASKS = [
  {name:"开山", duty:"破障", qian:"先破一道障，再求远处结果", key:/迷茫|前路|选择|未来|规划|上岸|卡住/, asset:"assets/masks/mask-01.png"},
  {name:"和合", duty:"调和", qian:"先安人心，再谈关系结果", key:/爱|感情|关系|分手|喜欢|相处|沟通/, asset:"assets/masks/mask-02.png"},
  {name:"将军", duty:"定断", qian:"先立边界，再谈事业进退", key:/工作|职业|事业|面试|创业|项目|钱/, asset:"assets/masks/mask-03.png"},
  {name:"判官", duty:"照见", qian:"先看清害怕什么，再谈输赢", key:/怕|恐惧|焦虑|压力|失败|不安/, asset:"assets/masks/mask-04.png"}
];

const STORY = [
  {eyebrow:"入 · 山门", title:"第一幕 · 山门问路", desc:"黑暗里，鼓声从远处一下一下逼近。你必须决定，是循声直入，还是先问清来路。", choices:["循鼓声直入","先停下问来路"]},
  {eyebrow:"照 · 心火", title:"第二幕 · 火堂试心", desc:"火光照出来的不是吉凶，而是你最不愿承认的那一部分。", choices:["直视那团火","先避开它"]},
  {eyebrow:"对 · 影", title:"第三幕 · 对影受面", desc:"影子从脚下站起来。它不追你，只问：你到底愿意舍掉什么，又要守住什么？", choices:["承认恐惧","守住所求"]}
];

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
    provider:null,
    setProvider(fn){ this.provider=typeof fn==="function"?fn:null; },
    async fetchMasks(){
      return this.provider ? await this.provider() : MASKS;
    },
    selectMaskByText(text){
      const direct = MASKS.findIndex(m=>m.key.test(text || ""));
      if(direct >= 0) return MASKS[direct];
      let h = 0; for(const c of (text||"")) h=(h*31+c.charCodeAt(0))>>>0;
      return MASKS[h % MASKS.length];
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
function showContinue(txt){
  $("#continueBtn").textContent = txt;
  gsap.to("#continueWrap",{opacity:1,pointerEvents:"auto",duration:.4});
}
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
  for(let i=0;i<42;i++){
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

function obscuredMaskSvg(i){
  const forms=[
    "M95 8L124 31L140 92L129 151L148 222L99 239L52 211L63 152L49 99L68 36Z",
    "M86 8L126 26L148 73L132 128L151 204L111 239L57 216L45 156L63 100L48 52Z",
    "M95 7L135 43L126 88L151 151L132 226L92 240L49 219L61 164L39 112L61 49Z",
    "M104 9L143 51L126 102L146 168L116 237L68 225L44 175L61 120L48 67Z"
  ];
  const threads=["M75 42L112 203 M101 27L82 214","M61 48L122 202 M116 40L91 219","M74 31L111 218 M117 63L70 190","M69 50L119 205 M122 83L79 225"];
  return `<svg viewBox="0 0 190 248" aria-hidden="true"><path class="veil-shape" d="${forms[i]}"/><path class="veil-thread" d="${threads[i]}"/><path class="veil-thread dim" d="M45 165Q95 186 148 151"/></svg>`;
}
function maskImage(i, className=""){
  const m=MASKS[i];
  return `<img class="mask-source ${className}" src="${m.asset}" alt="${m.name}面" draggable="false">`;
}
MASKS.forEach((m,i)=>{
  const el=document.createElement("div");
  el.className="mask";
  el.innerHTML=`<div class="mask-card mask-veil">${obscuredMaskSvg(i)}<i></i></div>`;
  $("#maskRing").appendChild(el);
});
const masks=[...document.querySelectorAll(".mask")];

function layoutRing(a=-Math.PI/2,d=.7){
  const rx=Math.min(innerWidth*.27,330), ry=Math.min(innerHeight*.13,108);
  masks.forEach((m,i)=>{
    const ang=a+i*Math.PI*2/masks.length;
    const dep=(Math.sin(ang)+1)/2;
    m.style.zIndex=Math.round(dep*20);
    gsap.to(m,{
      x:Math.cos(ang)*rx,y:Math.sin(ang)*ry,
      scale:.54+dep*.63,opacity:.26+dep*.74,
      filter:`blur(${(1-dep)*2.3}px) drop-shadow(0 18px 22px rgba(0,0,0,.75))`,
      duration:d,ease:"power3.out"
    });
  });
}
layoutRing();
masks.forEach((m,i)=> m._float = gsap.to(m,{y:"+=7",duration:2.4+(i%3)*.35,repeat:-1,yoyo:true,ease:"sine.inOut"}));

function startRitual(){
  switchScreen($("#ritual"),{immediate:true});
  setPhase("DRAGON ALTAR");
  AudioEngine.playCue("gong");

  gsap.timeline()
    .from(".dragon-svg",{opacity:0,scale:.94,duration:1.2,ease:"power2.out"})
    .from(".mask",{opacity:0,scale:.22,y:40,stagger:.08,duration:1.0,ease:"power3.out"},"-=.65")
    .to(["#ritualEyebrow","#ritualTitle","#ritualDesc"],{opacity:1,stagger:.07,duration:.45},"-=.5")
    .to("#inputWrap",{opacity:1,pointerEvents:"auto",duration:.38},"-=.28");
}

$("#inputBtn").onclick = submitRitual;
$("#textInput").addEventListener("keydown",(e)=>{ if(e.key==="Enter") submitRitual(); });

function submitRitual(){
  const v = $("#textInput").value.trim();
  if(!v) return;
  AudioEngine.playCue("wood");

  if(state.ritualStep===0){
    state.name=v; state.ritualStep=1;
    setCopy("问 · 愿", `${v}，你为何而来？`, "说出此刻最放不下的一件事。不必说得完整，傩引只需要知道，你真正被什么卡住。");
    showInput("例如：工作、感情、前路、家人、恐惧……");
    EventBus.emit("ritual:name",{name:v});
  }else{
    state.wish=v; state.ritualStep=2;
    EventBus.emit("ritual:wish",{wish:v});
    hideInput();
    chooseMask();
  }
}

function pickMask(text){
  const direct = MASKS.findIndex(m=>m.key.test(text||""));
  if(direct >= 0) return direct;
  let h=0; for(const c of (text||"")) h=(h*31+c.charCodeAt(0))>>>0;
  return h % MASKS.length;
}

function chooseMask(){
  state.selected = pickMask(state.wish);
  setPhase("MASK CHOSEN");
  AudioEngine.playCue("heavy");
  impact(.7);
  masks.forEach(m=>m._float && m._float.kill());

  const spin={a:-Math.PI/2};
  gsap.to(spin,{
    a:-Math.PI/2 - Math.PI*2*2.7 - (Math.PI*2/masks.length)*state.selected,
    duration:3.0,ease:"power4.inOut",
    onUpdate:()=>layoutRing(spin.a,.07),
    onComplete:focusMask
  });
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

function finishStory(){
  setPhase("REVELATION");
  AudioEngine.playCue("heavy");
  impact(1.25);
  crush(.9);
  gsap.to("#ritual",{opacity:0,duration:.6,onComplete:()=>{
    switchScreen($("#outro"));
    playEndingCinematic();
  }});
}

function playEndingCinematic(){
  const m=MASKS[state.selected];
  const end=$("#endingCinematic");
  const codex=$("#codexWorld");

  codex.style.display="none";
  end.style.display="block";
  end.style.opacity=1;
  end.style.pointerEvents="none";

  $("#endingMask").innerHTML=maskImage(state.selected,"ending-source");
  $("#endingName").textContent=`傩 · ${m.name}`;
  $("#endingDuty").textContent=`职司 · ${m.duty}`;
  $("#endingQianText").textContent=m.qian+"。";
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

function buildCodex(){
  const wall=$("#codexWall");
  const m=MASKS[state.selected];
  wall.innerHTML="";

  MASKS.forEach((item,i)=>{
    const person=document.createElement("div");
    person.className="codex-person "+(i===state.selected?"unlocked":"locked");
    person.innerHTML=`
      <div class="codex-person-mask">${maskImage(i)}</div>
      <div class="codex-person-lock">${i===state.selected?"":"未 · 见"}</div>
      <div class="codex-person-name">${i===state.selected?item.name:"？？"}</div>
    `;
    wall.appendChild(person);
  });

  $("#codexDetailMask").innerHTML=maskImage(state.selected);
  $("#codexDetailNum").textContent=`第${["壹","贰","叁","肆"][state.selected]}面 · 已解锁`;
  $("#codexDetailName").textContent=m.name;
  $("#codexDetailDuty").textContent=m.duty;
  $("#codexDetailText").textContent=`${state.name}，你在这一回故事中真正遇见了这张面。${m.qian}。`;
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
      gsap.fromTo(".codex-person",{opacity:0,y:18},{opacity:(i,el)=>el.classList.contains("unlocked")?1:.30,y:0,stagger:.055,duration:.48});
      gsap.fromTo("#codexDetail",{opacity:0,y:12},{opacity:1,y:0,duration:.48,delay:.22});
      gsap.fromTo("#codexRestart",{opacity:0},{opacity:1,duration:.4,delay:.35});
      AudioEngine.playCue("gong");
    });
}

$("#codexRestart").addEventListener("click",()=>location.reload());

/* =========================================================
   SUBTLE MOUSE PARALLAX / DEV INPUT
========================================================= */
EventBus.on("mouse:move", ({x,y})=>{
  if($("#ritual").classList.contains("active")){
    gsap.to(".dragon-svg",{x:x*14,y:y*10,duration:.8,ease:"power2.out"});
    gsap.to("#maskRing",{x:x*8,y:y*6,duration:.7,ease:"power2.out"});
  }
});

window.addEventListener("resize",()=>layoutRing(-Math.PI/2,.25));


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

  // Dragon altar parallax when not dragging.
  if($("#ritual").classList.contains("active") && !dragMask){
    const nx=e.clientX/innerWidth-.5;
    const ny=e.clientY/innerHeight-.5;
    gsap.to(".dragon-svg",{x:nx*6,y:ny*4,rotation:nx*.25,duration:.72,overwrite:"auto",ease:"power2.out"});
    gsap.to("#ritualOrb",{x:nx*-3,y:ny*-2,duration:.82,overwrite:"auto",ease:"power2.out"});
    gsap.to("#maskRing",{x:nx*3,y:ny*2,duration:.62,overwrite:"auto",ease:"power2.out"});
  }

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
  const m=masks[index];
  if(!m) return;
  m.dataset.draggable="1";
  gsap.to("#faceZone",{opacity:.06,duration:.4});
  EventBus.emit("mask:dragReady",{index,name:MASKS[index].name});
}

function beginMaskDrag(e,m,i){
  if(!canDragSelected) return;
  if(i!==state.selected) return;
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
    gsap.to(m,{
      rotationY:(i%2?1:-1)*2,
      rotationX:-1,
      duration:.25,
      overwrite:"auto",
      ease:"power2.out"
    });
  });

  m.addEventListener("pointerleave",()=>{
    if(dragMask===m) return;
    gsap.to(m,{
      rotationY:0,
      rotationX:0,
      duration:.25,
      overwrite:"auto",
      ease:"power2.out"
    });
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
    .to(m,{
      x:0,
      y:-45,
      scale:1.7,
      rotationZ:0,
      duration:.26,
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
function focusMask(){
  const chosen=masks[state.selected];
  if(!chosen) return;

  const others=masks.filter(m=>m!==chosen);

  others.forEach(m=>{
    gsap.to(m,{
      opacity:.04,
      scale:.4,
      filter:"blur(5px)",
      duration:.7,
      overwrite:"auto"
    });
  });

  gsap.to(chosen,{
    x:0,
    y:-20,
    scale:1.22,
    opacity:1,
    rotationX:0,
    rotationY:0,
    filter:"blur(0px) drop-shadow(0 25px 32px rgba(0,0,0,.82))",
    duration:.95,
    overwrite:"auto",
    ease:"power4.out"
  });

  gsap.to(chosen.querySelector(".mask-card"),{
    rotateY:180,
    duration:.65,
    ease:"power2.inOut",
    onComplete:()=>{
      gsap.to(chosen.querySelector(".mask-card"),{
        rotateY:360,
        duration:.9,
        ease:"power3.inOut"
      });
    }
  });

  setTimeout(()=>{
    AudioEngine.playCue("heavy");
    impact(1.05);
  },450);

  gsap.timeline({delay:1.10})
    .add(()=>{
      setCopy(
        "请 · 面",
        "把那道影子带到你面前",
        "握住它。它尚未显形。"
      );
    })
    .add(()=>enableMaskDrag(state.selected))
    .fromTo(chosen,{rotationZ:-1.2},{
      rotationZ:0,
      duration:.62,
      ease:"elastic.out(1,.5)"
    });
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
InputLayer.init();
requestAnimationFrame(()=>startExperience());
