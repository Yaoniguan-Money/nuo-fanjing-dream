(() => {
const THREE = window.THREE;
if (!THREE) throw new Error("离线启动失败：Three.js 未加载。请确认 vendor/three.min.js 与 index.html 位于同一项目文件夹。");

const ASSETS = {
  mountain: "assets/fanjing-backdrop-v2.png",
  village: "assets/village-facade-door.png",
  hall: "assets/ritual-threshold-hall.png"
};

function softTexture(){
  const canvas=document.createElement("canvas");
  canvas.width=256; canvas.height=256;
  const ctx=canvas.getContext("2d");
  const g=ctx.createRadialGradient(128,128,4,128,128,128);
  g.addColorStop(0,"rgba(236,242,239,.52)");
  g.addColorStop(.45,"rgba(225,234,230,.18)");
  g.addColorStop(1,"rgba(225,234,230,0)");
  ctx.fillStyle=g; ctx.fillRect(0,0,256,256);
  return new THREE.CanvasTexture(canvas);
}

function woodTexture(){
  const canvas=document.createElement("canvas");
  canvas.width=256; canvas.height=512;
  const ctx=canvas.getContext("2d");
  const g=ctx.createLinearGradient(0,0,256,0);
  g.addColorStop(0,"#130e09"); g.addColorStop(.42,"#4b301c");
  g.addColorStop(.56,"#21150d"); g.addColorStop(1,"#100b07");
  ctx.fillStyle=g; ctx.fillRect(0,0,256,512);
  for(let y=0;y<512;y+=8){
    ctx.strokeStyle=`rgba(209,157,92,${.025+Math.random()*.055})`;
    ctx.lineWidth=.8+Math.random()*1.4;
    ctx.beginPath(); ctx.moveTo(0,y+Math.random()*5);
    ctx.bezierCurveTo(64,y-7,188,y+10,256,y+Math.random()*5); ctx.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  return texture;
}

function loadTexture(loader,url){
  return new Promise((resolve,reject)=>loader.load(url,resolve,undefined,reject));
}

function createThresholdScene({canvas,onReady,onComplete,onDoorOpened}){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"high-performance"});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene();
  scene.background=new THREE.Color("#d6dcdb");
  const camera=new THREE.PerspectiveCamera(42,1,.1,100);
  const lookAt=new THREE.Vector3(0,-.25,-13);
  const motion={z:18};
  camera.position.set(0,.1,motion.z);
  camera.lookAt(lookAt);

  const ambient=new THREE.HemisphereLight(0xe4eced,0x14100b,1.9);
  scene.add(ambient);
  const warm=new THREE.PointLight(0xe5a34e,10,18,2);
  warm.position.set(0,-.15,-10); scene.add(warm);

  const loader=new THREE.TextureLoader();
  const root=new THREE.Group(); scene.add(root);
  const doorRoot=new THREE.Group();
  let leftDoor,rightDoor,hallMat,opening=false,disposed=false;
  const fogs=[];

  const resize=()=>{
    const rect=canvas.getBoundingClientRect();
    renderer.setSize(rect.width,rect.height,false);
    camera.aspect=rect.width/rect.height; camera.updateProjectionMatrix();
  };
  const updateCamera=()=>{
    camera.position.z=motion.z;
    lookAt.set(0,-.25,Math.min(-9,motion.z-22));
    camera.lookAt(lookAt);
  };
  const tick=(time)=>{
    if(disposed) return;
    fogs.forEach((fog,i)=>{
      fog.position.x=Math.sin(time*.00013+i*1.7)*4.5;
      fog.material.opacity=.08+Math.sin(time*.0002+i)*.025;
    });
    renderer.render(scene,camera);
    requestAnimationFrame(tick);
  };

  const ready=Promise.all(Object.values(ASSETS).map(url=>loadTexture(loader,url))).then(([mountain,village,hall])=>{
    [mountain,village,hall].forEach(t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();});
    const mountainPlane=new THREE.Mesh(new THREE.PlaneGeometry(96,54),new THREE.MeshBasicMaterial({map:mountain}));
    mountainPlane.position.set(0,0,-34); root.add(mountainPlane);

    hallMat=new THREE.MeshBasicMaterial({map:hall,side:THREE.DoubleSide,transparent:true,opacity:0});
    const hallPlane=new THREE.Mesh(new THREE.PlaneGeometry(18,10.15),hallMat);
    hallPlane.position.set(0,-.25,-11.2); root.add(hallPlane);

    const villagePlane=new THREE.Mesh(new THREE.PlaneGeometry(17,9.12),new THREE.MeshBasicMaterial({map:village,transparent:true,alphaTest:.04,side:THREE.DoubleSide}));
    villagePlane.position.set(0,-.55,-4.9); root.add(villagePlane);

    const wood=woodTexture(); wood.colorSpace=THREE.SRGBColorSpace;
    const doorMat=new THREE.MeshBasicMaterial({map:wood});
    const trimMat=new THREE.MeshStandardMaterial({color:0x22150c,roughness:.74,metalness:.05});
    const leafGeo=new THREE.BoxGeometry(1.47,4.5,.18);
    const trimGeo=new THREE.BoxGeometry(.14,4.9,.32);
    doorRoot.position.set(0,-1.05,-4.62);
    leftDoor=new THREE.Group(); rightDoor=new THREE.Group();
    const leftLeaf=new THREE.Mesh(leafGeo,doorMat); leftLeaf.position.x=.735;
    const rightLeaf=new THREE.Mesh(leafGeo,doorMat); rightLeaf.position.x=-.735;
    leftDoor.add(leftLeaf); rightDoor.add(rightLeaf);
    const ringMat=new THREE.MeshBasicMaterial({color:0x80592d});
    const leftRing=new THREE.Mesh(new THREE.TorusGeometry(.16,.028,8,22),ringMat);
    const rightRing=leftRing.clone();
    leftRing.position.set(.92,0,.12); rightRing.position.set(-.92,0,.12);
    leftDoor.add(leftRing); rightDoor.add(rightRing);
    leftDoor.position.x=-1.47; rightDoor.position.x=1.47;
    doorRoot.add(leftDoor,rightDoor);
    const topTrim=new THREE.Mesh(new THREE.BoxGeometry(3.3,.22,.34),trimMat); topTrim.position.set(0,2.38,0);
    const leftTrim=new THREE.Mesh(trimGeo,trimMat); leftTrim.position.set(-1.6,0,0);
    const rightTrim=new THREE.Mesh(trimGeo,trimMat); rightTrim.position.set(1.6,0,0);
    doorRoot.add(topTrim,leftTrim,rightTrim);
    root.add(doorRoot);

    const fogMap=softTexture();
    for(let i=0;i<5;i++){
      const fog=new THREE.Sprite(new THREE.SpriteMaterial({map:fogMap,transparent:true,opacity:.1,depthWrite:false,color:0xe5ece8}));
      fog.position.set((i-2)*3,-1.3-i%2*.5,-7-i*.7); fog.scale.set(8,2.3,1);
      fogs.push(fog); root.add(fog);
    }
    resize(); updateCamera(); requestAnimationFrame(tick); onReady?.();
  });

  return {
    ready,
    intro(){
      return gsap.to(motion,{z:3.25,duration:1.35,ease:"power3.inOut",overwrite:"auto",onUpdate:updateCamera,onComplete:()=>onComplete?.()});
    },
    openDoor(){
      if(opening) return;
      opening=true;
      const tl=gsap.timeline({defaults:{ease:"power3.inOut"}});
      tl.to(leftDoor.rotation,{y:-1.38,duration:1.08},0)
        .to(rightDoor.rotation,{y:1.38,duration:1.08},0)
        .to(hallMat,{opacity:1,duration:.42,ease:"power2.out"},.50)
        .to(motion,{z:-7.15,duration:1.32,ease:"power4.inOut",onUpdate:updateCamera},.14)
        .add(()=>onDoorOpened?.(),.94);
      return tl;
    },
    resize,
    dispose(){disposed=true;renderer.dispose();}
  };
}

window.createThresholdScene = createThresholdScene;
})();
