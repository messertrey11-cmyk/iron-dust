import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import Peer from 'peerjs';
import {createHostCore} from './hostcore.js';
import {clamp,smooth,rng,LZ,trackX,trackDX,hgt,trackDist,TEX,M,B,C,G,mesh,signTex,makeLoco,makeTender,makeFlatcar,GEO,shrubMat,makeBuilding,makeWaterTower,makeWindmill,makeZombie,makeHuman} from './models.js';
const $=id=>document.getElementById(id);
const GOAL=80000,CH=250,V3=THREE.Vector3;
// ================= save / classes =================
const CLASSES={
 drifter:{n:'Drifter',d:'Steady all-rounder. +10 max HP.',gear:'Revolver, 24 ammo, 3 coal, 1 bandage',cost:0,hp:10},
 gunhand:{n:'Gunhand',d:'+25% gun damage, 30% faster reloads.',gear:'Revolver + Scattergun, 44 ammo',cost:400,gun:1.25,reload:.7,ammo:44},
 bruiser:{n:'Bruiser',d:'+40 max HP, shovel hits +80%, takes 15% less damage.',gear:'Shovel, 16 ammo, 2 bandages',cost:450,hp:40,melee:1.8,armor:.85,ammo:16,bandage:2},
 prospector:{n:'Prospector',d:'+2 Luck, crates pay +25% money.',gear:'9 coal, 20 ammo',cost:600,luck:2,cash:1.25,coal:9,ammo:20},
 sawbones:{n:'Sawbones',d:'Bandages heal double, slow health regen.',gear:'4 bandages, 24 ammo',cost:500,heal:2,regen:1.2,bandage:4},
 stoker:{n:'Stoker',d:'Train burns 25% less fuel, +10% top speed, coal worth 12 fuel.',gear:'6 coal, 20 ammo',cost:700,eff:.75,spd:1.1,coalv:12,coal:6,ammo:20},
};
const UPG={speed:{n:'Engine Speed',d:'+15% top speed',c:150},eff:{n:'Fuel Efficiency',d:'-12% fuel burn',c:120},hp:{n:'Max Health',d:'+20 max HP',c:100},luck:{n:'Luck',d:'+1 Luck (better loot rolls)',c:200},dmg:{n:'Weapon Damage',d:'+15% damage',c:150}};
let save={money:0,up:{speed:0,eff:0,hp:0,luck:0,dmg:0},best:0,cls:'drifter',owned:['drifter'],runs:0};
try{const s=JSON.parse(localStorage.getItem('ironDustSave'));if(s){Object.assign(save,s);save.up=Object.assign({speed:0,eff:0,hp:0,luck:0,dmg:0},s.up);if(!save.owned)save.owned=['drifter'];if(!CLASSES[save.cls])save.cls='drifter'}}catch(e){}
const persist=()=>{try{localStorage.setItem('ironDustSave',JSON.stringify(save))}catch(e){}};
const K=()=>CLASSES[save.cls];
const stat={maxSpeed:()=>25*(1+.15*save.up.speed)*(K().spd||1),eff:()=>Math.pow(.88,save.up.eff)*(K().eff||1),maxHp:()=>100+20*save.up.hp+(K().hp||0),luck:()=>save.up.luck+(K().luck||0),dmg:()=>1+.15*save.up.dmg};
const upCost=k=>Math.round(UPG[k].c*Math.pow(1.6,save.up[k]));
// ================= renderer =================
let quality=localStorage.getItem('ironDustQ')||'high';
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;document.body.prepend(renderer.domElement);
const scene=new THREE.Scene();scene.fog=new THREE.Fog(0xd9b98a,80,420);
const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.05,2500);scene.add(camera);
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.32,.5,.88);composer.addPass(bloom);composer.addPass(new OutputPass());
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight)});
const hemi=new THREE.HemisphereLight(0xbfd8ff,0x9a6a3a,.6);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff0d0,2.4);sun.castShadow=true;Object.assign(sun.shadow.camera,{left:-55,right:55,top:55,bottom:-55,near:1,far:320});sun.shadow.bias=-0.0004;sun.shadow.normalBias=.04;scene.add(sun,sun.target);
function applyQuality(){const q=quality;renderer.setPixelRatio(q==='low'?.7:q==='med'?1:Math.min(devicePixelRatio,1.6));
 renderer.shadowMap.enabled=q!=='low';sun.castShadow=q!=='low';const ms=q==='high'?2048:1024;if(sun.shadow.mapSize.x!==ms){sun.shadow.mapSize.set(ms,ms);sun.shadow.map&&sun.shadow.map.dispose();sun.shadow.map=null}
 scene.traverse(o=>{if(o.material){[].concat(o.material).forEach(m=>m.needsUpdate=true)}});
 for(const id of['qbtn','qbtn2'])$(id).textContent='Graphics: '+{low:'Low',med:'Medium',high:'High'}[q];localStorage.setItem('ironDustQ',q)}
const cycleQ=()=>{quality={low:'med',med:'high',high:'low'}[quality];applyQuality()};$('qbtn').onclick=cycleQ;$('qbtn2').onclick=cycleQ;
// ================= sky =================
const skyU={sunDir:{value:new V3(0,1,0)},day:{value:1},dusk:{value:0}};
const sky=new THREE.Mesh(new THREE.SphereGeometry(2000,32,16),new THREE.ShaderMaterial({uniforms:skyU,side:THREE.BackSide,depthWrite:false,fog:false,
 vertexShader:`varying vec3 vD;void main(){vD=position;vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}`,
 fragmentShader:`uniform vec3 sunDir;uniform float day,dusk;varying vec3 vD;
 float h(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,45.164)))*43758.5453);}
 void main(){vec3 d=normalize(vD);float y=max(d.y,0.);
  vec3 zen=mix(vec3(.01,.015,.05),vec3(.18,.4,.82),day),hor=mix(vec3(.04,.05,.11),vec3(.86,.78,.64),day);
  float sh=max(dot(normalize(vec3(d.x,0.,d.z)),normalize(vec3(sunDir.x,0.,sunDir.z))),0.);hor=mix(hor,vec3(1.,.42,.16),dusk*(.45+.55*sh));
  vec3 c=mix(hor,zen,pow(y,.42));if(d.y<0.)c=hor*.85;
  float sd=max(dot(d,sunDir),0.);c+=vec3(1.,.9,.7)*(smoothstep(.9992,.9996,sd)*25.+pow(sd,10.)*.4*(day+dusk));
  vec3 md=-sunDir;float mm=max(dot(d,md),0.);c+=vec3(.85,.9,1.)*(smoothstep(.99955,.9997,mm)*2.+pow(mm,60.)*.15)*(1.-day);
  float st=step(.9985,h(floor(d*400.)))*(1.-day)*smoothstep(0.,.25,y);c+=st*1.5;
  gl_FragColor=vec4(c,1.);}`}));
sky.renderOrder=-1;sky.frustumCulled=false;scene.add(sky);
// ================= terrain =================
const TS=900,TN=150;const tgeo=new THREE.PlaneGeometry(TS,TS,TN,TN);tgeo.rotateX(-Math.PI/2);
const tbase=tgeo.attributes.position.array.slice();tgeo.setAttribute('color',new THREE.BufferAttribute(new Float32Array(tbase.length),3));
const sandMap=TEX.sand;const terrain=new THREE.Mesh(tgeo,new THREE.MeshStandardMaterial({map:sandMap,vertexColors:true,roughness:1}));terrain.receiveShadow=true;scene.add(terrain);
let tcx=1e9,tcz=1e9;
function updateTerrain(force){const p=player.pos,cx=Math.round(p.x/45)*45,cz=Math.round(p.z/45)*45;if(!force&&cx===tcx&&cz===tcz)return;tcx=cx;tcz=cz;
 const pos=tgeo.attributes.position,col=tgeo.attributes.color;terrain.position.set(cx,0,cz);
 for(let i=0;i<pos.count;i++){const x=tbase[i*3]+cx,z=tbase[i*3+2]+cz,h=hgt(x,z);pos.array[i*3+1]=h;
  const d=trackDist(x,z),rk=smooth(5,16,h),gv=1-smooth(1.6,3.2,d),v=.92+((Math.sin(x*.07)*Math.cos(z*.05))*.06);
  let r=.86*v,g=.66*v,b=.44*v;r+=(.66-r)*rk;g+=(.36-g)*rk;b+=(.22-b)*rk;r+=(.45-r)*gv;g+=(.4-g)*gv;b+=(.36-b)*gv;
  if(z>1500){const ld=Math.hypot(x,z-LZ);const st=1-smooth(8,14,Math.abs(z-LZ))*1;if(ld<70&&Math.abs(z-LZ)<6){r*=.85;g*=.8;b*=.75}}
  col.array[i*3]=r;col.array[i*3+1]=g;col.array[i*3+2]=b}
 pos.needsUpdate=col.needsUpdate=true;tgeo.computeVertexNormals();tgeo.computeBoundingSphere();
 sandMap.offset.set((cx/TS*140)%1,(-cz/TS*140)%1)}
// ================= particles =================
const sprites=[];const spritePool=[];
function puff(pos,vel,color,size,life,grow=1.2,opacity=.55,additive=false){let s=spritePool.pop();
 if(!s){s=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.soft,transparent:true,depthWrite:false}));scene.add(s)}
 s.visible=true;s.material.color.set(color);s.material.blending=additive?THREE.AdditiveBlending:THREE.NormalBlending;s.position.copy(pos);s.scale.setScalar(size);
 sprites.push({s,v:vel.clone(),l:life,L:life,grow,op:opacity,size})}
function updateSprites(dt){for(let i=sprites.length-1;i>=0;i--){const p=sprites[i];p.l-=dt;if(p.l<=0){p.s.visible=false;spritePool.push(p.s);sprites.splice(i,1);continue}
 p.s.position.addScaledVector(p.v,dt);p.v.multiplyScalar(1-dt*.6);p.size*=1+dt*p.grow;p.s.scale.setScalar(p.size);p.s.material.opacity=p.op*Math.min(1,p.l/p.L*1.5)}}
const bits=[];const bitGeo=B(.07,.07,.07);
function blood(p,n=10){const m=new THREE.MeshStandardMaterial({color:0x6a0808,roughness:.5});for(let i=0;i<n;i++){const o=new THREE.Mesh(bitGeo,m);o.position.copy(p);scene.add(o);bits.push({o,v:new V3((Math.random()-.5)*5,Math.random()*4,(Math.random()-.5)*5),l:.7})}
 puff(p,new V3(0,.3,0),0x700000,.5,.4,2,.7)}
function dust(p){for(let i=0;i<3;i++)puff(p,new V3((Math.random()-.5),Math.random(),(Math.random()-.5)),0xb09070,.25,.5,2,.6)}
function updateBits(dt){for(let i=bits.length-1;i>=0;i--){const b=bits[i];b.l-=dt;b.v.y-=12*dt;b.o.position.addScaledVector(b.v,dt);if(b.l<=0){scene.remove(b.o);bits.splice(i,1)}}}
// ================= train =================
const trainG=new THREE.Group();scene.add(trainG);
const loco=makeLoco();
const cars=[{g:loco.g,off:0,cols:[[-1.3,1.3,0,1.4,-7.4,5.9],[-1.1,1.1,1.4,3.6,-7.4,1.6],[-1.55,-1.35,1.4,2.45,1.6,5.7],[1.35,1.55,1.4,2.45,1.6,5.7]]},
 {g:makeTender(),off:9.9,cols:[[-1.4,1.4,0,1.4,-3.6,3.6],[-1.5,-1.3,1.4,2.35,-3.3,3.3],[1.3,1.5,1.4,2.35,-3.3,3.3]]},
 {g:makeFlatcar(0),off:20.4,cols:[[-1.6,1.6,0,1.4,-6.6,6.6],[-1.62,-1.42,1.4,2.35,-6,6],[1.42,1.62,1.4,2.35,-6,6]]},
 {g:makeFlatcar(1),off:33,cols:[[-1.6,1.6,0,1.4,-6.6,6.6],[-1.62,-1.42,1.4,2.35,-6,6],[1.42,1.62,1.4,2.35,-6,6]]}];
for(const c of cars){trainG.add(c.g);c.pos=new V3();c.yaw=0}
const train={dist:0,speed:0,throttle:0,fuel:60,wheelA:0};
function placeTrain(){for(const c of cars){const z=-train.dist+c.off,x=trackX(z);c.pos.set(x,0,z);c.yaw=Math.atan(trackDX(z));c.g.position.copy(c.pos);c.g.rotation.y=c.yaw}
 for(const w of loco.wheels)w.w.rotation.x=-train.wheelA*.82/w.r;for(let i=0;i<loco.rods.length;i++){const r=loco.rods[i],a=-train.wheelA+(i?Math.PI/2:0);r.position.y=.84+Math.sin(a)*.3;r.position.z=-1.4+Math.cos(a)*.3}
 loco.lever.rotation.x=-.7+train.throttle*1.4}
const toLocal=(c,p)=>{const dx=p.x-c.pos.x,dz=p.z-c.pos.z,co=Math.cos(c.yaw),si=Math.sin(c.yaw);return[dx*co-dz*si,p.y,dx*si+dz*co]};
const toWorld=(c,l,out)=>{const co=Math.cos(c.yaw),si=Math.sin(c.yaw);return out.set(c.pos.x+l[0]*co+l[2]*si,l[1],c.pos.z-l[0]*si+l[2]*co)};
// lobby train (static display)
const lobbyLoco=makeLoco(),lobbyCar=makeFlatcar(1);
// ================= world chunks =================
let seed=12345;const chunks=new Map();let staticCol=[];const crates=new Map();let opened=new Set();const animated=[];
const TOWNS=['Copper Hollow','Bitterwell','Saint Ash','Rattler\'s Rest','Dry Gulch','Hollowpine','Last Lantern','Redmesa','Grim Crossing','Widow Creek','Coyote Bend','Ironwood'];
function inst(geo,mat,list,shadow=true){const m=new THREE.InstancedMesh(geo,mat,list.length);const o=new THREE.Object3D();list.forEach((t,i)=>{o.position.set(t[0],t[1],t[2]);o.rotation.set(0,t[3]||0,0);const s=t[4]||1;o.scale.set(s,t[5]||s,s);o.updateMatrix();m.setMatrixAt(i,o.matrix)});m.castShadow=shadow;m.receiveShadow=true;m.computeBoundingSphere();return m}
function placeCols(local,th,tx,ty,tz,out){const c=Math.cos(th),s=Math.sin(th);for(const b of local){const xs=[],zs=[];for(const x of[b[0],b[1]])for(const z of[b[4],b[5]]){xs.push(x*c+z*s);zs.push(-x*s+z*c)}
 out.push({x0:tx+Math.min(...xs),x1:tx+Math.max(...xs),y0:ty+b[2],y1:ty+b[3],z0:tz+Math.min(...zs),z1:tz+Math.max(...zs)})}}
function localToWorld(lx,lz,th,tx,tz){const c=Math.cos(th),s=Math.sin(th);return[tx+lx*c+lz*s,tz-lx*s+lz*c]}
function makeChunk(c){const r=rng(seed^Math.imul(c+7,2654435761)),g=new THREE.Group(),col=[],z0=-c*CH,anim=[];
 const ties=[],rails=[],poles=[],sag=[],rocks=[[],[],[]],shr=[];
 for(let i=0;i<125;i++){const z=z0-i*2-1,x=trackX(z),y=Math.atan(trackDX(z));ties.push([x,.08,z,y]);for(const s of[-.72,.72])rails.push([x+s*Math.cos(y),0,z-s*Math.sin(y),y])}
 for(let i=0;i<5;i++){const z=z0-i*50-10;poles.push([trackX(z)+6,0,z,0])}
 for(let i=0;i<30;i++){const z=z0-r()*CH,s=r()<.5?-1:1,x=trackX(z)+s*(10+r()*140);if(trackDist(x,z)<9)continue;sag.push([x,hgt(x,z)-.2,z,r()*6,.7+r()*.6])}
 for(let i=0;i<40;i++){const z=z0-r()*CH,s=r()<.5?-1:1,x=trackX(z)+s*(6+r()*170);const sc=.5+r()*r()*5;rocks[i%3].push([x,hgt(x,z)-sc*.25,z,r()*6,sc])}
 for(let i=0;i<60;i++){const z=z0-r()*CH,s=r()<.5?-1:1,x=trackX(z)+s*(4+r()*60);shr.push([x,hgt(x,z),z,r()*6,.5+r()])}
 g.add(inst(GEO.tie,M.woodDark,ties,false),inst(GEO.rail,M.steel,rails,false),inst(GEO.pole,M.woodDark,poles),inst(GEO.saguaro,M.cactus,sag),inst(GEO.shrub,shrubMat,shr,false));
 rocks.forEach((l,k)=>l.length&&g.add(inst(GEO.rock[k],M.rock,l)));
 const town=c===0||(c>0&&r()<.55);const spawns=[];
 if(town){const zc=z0-CH/2,name=c===0?'Sweetwater Depot':TOWNS[Math.floor(r()*TOWNS.length)];g.userData.town=name;g.userData.townZ=zc;
  for(const s of[-1,1]){const n=2+Math.floor(r()*3);for(let i=0;i<n;i++){const z=zc+(i-(n-1)/2)*11+(r()-.5)*2,tx=trackX(z)+s*13.5,th=s<0?0:Math.PI;
   const b=makeBuilding(r);b.g.position.set(tx,0,z);b.g.rotation.y=th;g.add(b.g);placeCols(b.cols,th,tx,0,z,col);
   const nc=1+Math.floor(r()*2.5);const spots=b.lootSpots.slice().sort(()=>r()-.5);for(let k=0;k<nc;k++){const[wx,wz]=localToWorld(spots[k][0],spots[k][1],th,tx,z);addCrate(`${c}-${s}-${i}-${k}`,wx,.3,wz,g,col,b.strong&&k===0)}
   spawns.push(localToWorld(0,0,th,tx,z))}}
  const sx=trackX(zc+40)-4.5;const sp=new THREE.Group();sp.position.set(sx,0,zc+40);g.add(sp);mesh(C(.1,.1,3,8),M.woodDark,0,1.5,0,sp);
  const sn=new THREE.Mesh(B(.08,.8,3),[M.woodDark,M.woodDark,M.woodDark,M.woodDark,new THREE.MeshStandardMaterial({map:signTex(name.toUpperCase())}),new THREE.MeshStandardMaterial({map:signTex(name.toUpperCase())})]);
  sn.geometry=new THREE.BoxGeometry(3,.8,.08);sn.position.set(0,2.7,0);sp.add(sn);
  if(r()<.7){const w=makeWaterTower(),wz=zc-35,wx=trackX(wz)+6;w.g.position.set(wx,0,wz);g.add(w.g);placeCols(w.cols,0,wx,0,wz,col)}
  if(r()<.7){const w=makeWindmill(),wz=zc+20,wx=trackX(wz)-(26+r()*8);w.g.position.set(wx,hgt(wx,wz),wz);g.add(w.g);placeCols(w.cols,0,wx,0,wz,col);anim.push(w.rotor)}
  for(let k=0;k<3+Math.floor(c*.06);k++)spawns.push([trackX(zc)+(r()<.5?-1:1)*(8+r()*30),zc+(r()-.5)*CH*.8])}
 else if(r()<.6){const z=z0-r()*CH,x=trackX(z)+(r()<.5?-1:1)*(4+r()*6);addCrate(`${c}-x-0`,x,hgt(x,z),z,g,col,false)}
 scene.add(g);return{g,col,c,spawns,anim}}
function addCrate(id,x,y,z,g,col,strong){const m=mesh(B(.95,.75,.7),opened.has(id)?M.crateOpen:(strong?M.strong:M.crate),x,y+.38,z,g);m.rotation.y=Math.random()*.6;
 mesh(B(1,.08,.75),M.iron,0,.3,0,m);mesh(B(1,.08,.75),M.iron,0,-.3,0,m);m.userData.crate=id;m.userData.strong=strong;crates.set(id,m);col.push({x0:x-.48,x1:x+.48,y0:y,y1:y+.75,z0:z-.48,z1:z+.48})}
let lastTown='';
function updateChunks(){const cur=Math.floor(Math.max(-player.pos.z,0)/CH);let ch=false;
 for(let c=cur-1;c<=cur+3;c++)if(c>=0&&!chunks.has(c)){const k=makeChunk(c);chunks.set(c,k);ch=true;if(isAuth())for(const[x,z]of k.spawns)spawnZ(x,z)}
 for(const[c,k]of chunks)if(c<cur-1||c>cur+3){removeChunk(k);chunks.delete(c);ch=true}
 if(ch)staticCol=[...chunks.values()].flatMap(k=>k.col);
 const k=chunks.get(cur);if(k&&k.g.userData.town&&k.g.userData.town!==lastTown&&Math.abs(player.pos.z-k.g.userData.townZ)<140){lastTown=k.g.userData.town;banner(k.g.userData.town)}}
function removeChunk(k){scene.remove(k.g);k.g.traverse(o=>{if(o.userData.crate)crates.delete(o.userData.crate);if(o.isInstancedMesh)o.dispose();if(o.material&&o.material.map&&o.material.map.image&&o.geometry&&o.geometry.type==='BoxGeometry'&&o.material!==M.wood){}})}
function clearWorld(){for(const k of chunks.values())removeChunk(k);chunks.clear();crates.clear();staticCol=[]}
// ================= lobby =================
const lobby={g:new THREE.Group(),col:[],npcs:[],pad:new V3(40,0,LZ),padR:3.4,anim:[]};
{const L=lobby.g,col=lobby.col,r=rng(777);scene.add(L);
 const names=['DUSTY SPUR SALOON','FRONTIER BANK','GRAND HOTEL','GUNSMITH','SHERIFF','TELEGRAPH'];
 names.forEach((n,i)=>{const side=i%2?1:-1,x=-28+Math.floor(i/2)*16,z=LZ+side*15,th=side>0?Math.PI/2:-Math.PI/2;const b=makeBuilding(r,n);b.g.position.set(x,0,z);b.g.rotation.y=th;L.add(b.g);placeCols(b.cols,th,x,0,z,col)});
 // boardwalk street
 const street=mesh(B(90,.04,9),new THREE.MeshStandardMaterial({map:TEX.sand,color:0xa88a66,roughness:1}),0,.02,LZ,L);street.receiveShadow=true;
 // stands
 const stand=(x,z,title,color)=>{const g=new THREE.Group();g.position.set(x,0,z);L.add(g);mesh(B(3.4,1.1,1.2),M.wood,0,.55,0,g);mesh(B(3.6,.1,1.4),M.woodDark,0,1.12,0,g);
  for(const s of[-1,1])mesh(C(.07,.07,2.6,6),M.woodDark,s*1.6,1.3,-.5,g);const aw=mesh(B(3.8,.08,1.8),new THREE.MeshStandardMaterial({color,roughness:.9}),0,2.65,0,g,-.25);
  const sg=new THREE.Mesh(new THREE.PlaneGeometry(3.4,.85),new THREE.MeshStandardMaterial({map:signTex(title)}));sg.position.set(0,3.1,.55);g.add(sg);
  col.push({x0:x-1.7,x1:x+1.7,y0:0,y1:1.1,z0:z-.6,z1:z+.6});return g};
 const s1=stand(-6,LZ-5.5,'OUTFITTER — CHOOSE TRADE',0x8a2a1a),s2=stand(8,LZ-5.5,'TRADING POST',0x2a4a7a);s1.rotation.y=0;s2.rotation.y=0;
 const n1=makeHuman(0x5a6a3a,'Quartermaster Wren'),n2=makeHuman(0x6a3a5a,'Old Silas, Trader');n1.g.position.set(-6,0,LZ-7);n2.g.position.set(8,0,LZ-7);n1.g.rotation.y=Math.PI;n2.g.rotation.y=Math.PI;L.add(n1.g,n2.g);
 lobby.npcs=[{h:n1,pos:new V3(-6,0,LZ-5.5),kind:'classes'},{h:n2,pos:new V3(8,0,LZ-5.5),kind:'shop'}];
 // station platform & pad
 mesh(B(12,.6,30),M.wood,40,.3,LZ,L);col.push({x0:34,x1:46,y0:0,y1:.6,z0:LZ-15,z1:LZ+15});
 for(const z of[-12,-4,4,12]){mesh(C(.12,.12,3.6,8),M.woodDark,35,2.4,LZ+z,L);mesh(C(.12,.12,3.6,8),M.woodDark,45,2.4,LZ+z,L)}mesh(B(12.6,.14,28),M.woodDark,40,4.25,LZ,L,0,0,0);
 const ring=new THREE.Mesh(new THREE.RingGeometry(lobby.padR-.35,lobby.padR,48),new THREE.MeshStandardMaterial({color:0xffc060,emissive:0xffa030,emissiveIntensity:2.5,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(40,.62,LZ);L.add(ring);lobby.ring=ring;
 const padDisc=mesh(new THREE.CircleGeometry(lobby.padR-.35,40),new THREE.MeshStandardMaterial({color:0x6a3a1a,roughness:.7}),40,.615,LZ,L,-Math.PI/2);
 lobby.signC=document.createElement('canvas');lobby.signC.width=512;lobby.signC.height=192;lobby.signT=new THREE.CanvasTexture(lobby.signC);lobby.signT.colorSpace=THREE.SRGBColorSpace;
 const board=new THREE.Mesh(new THREE.PlaneGeometry(5,1.9),new THREE.MeshStandardMaterial({map:lobby.signT,emissive:0xffffff,emissiveMap:lobby.signT,emissiveIntensity:.35}));board.position.set(40,3.2,LZ-4.2);L.add(board);mesh(B(5.2,2.1,.1),M.woodDark,40,3.2,LZ-4.27,L);
 // rails + lobby train
 for(let z=-60;z<60;z+=2){mesh(GEO.tie,M.woodDark,50,.08,LZ+z,L,0,0,0,false);mesh(GEO.rail,M.steel,49.28,0,LZ+z,L,0,0,0,false);mesh(GEO.rail,M.steel,50.72,0,LZ+z,L,0,0,0,false)}
 lobbyLoco.g.position.set(50,0,LZ-8);lobbyCar.position.set(50,0,LZ+12.5);L.add(lobbyLoco.g,lobbyCar);placeCols([[-1.3,1.3,0,3.6,-7.4,5.9]],0,50,0,LZ-8,col);placeCols([[-1.6,1.6,0,2.3,-6.6,6.6]],0,50,0,LZ+12.5,col);
 const wt=makeWaterTower();wt.g.position.set(30,0,LZ-22);L.add(wt.g);placeCols(wt.cols,0,30,0,LZ-22,col);
 const wm=makeWindmill();wm.g.position.set(-46,0,LZ+4);L.add(wm.g);lobby.anim.push(wm.rotor);
 for(let i=0;i<10;i++){const x=-38+i*8,z=LZ+(i%2?5:-5);const p=new THREE.Group();p.position.set(x,0,z);L.add(p);mesh(C(.08,.1,3.2,8),M.iron,0,1.6,0,p);mesh(B(.3,.4,.3),M.glow,0,3.3,0,p,0,0,0,false)}
 for(let i=0;i<14;i++){const x=-40+r()*80,z=LZ+(r()<.5?-1:1)*(7+r()*1.5);mesh(C(.4,.4,1,12),M.wood,x,.5,z,L);col.push({x0:x-.4,x1:x+.4,y0:0,y1:1,z0:z-.4,z1:z+.4})}
 const sg=new THREE.Mesh(new THREE.PlaneGeometry(10,1.6),new THREE.MeshStandardMaterial({map:signTex('SWEETWATER JUNCTION')}));sg.position.set(40,5.2,LZ+0);sg.rotation.y=-Math.PI/2;L.add(sg);
 const fence=[];for(let x=-60;x<=60;x+=3)for(const s of[-1,1])fence.push([x,0,LZ+s*24,0]);L.add(inst(G('fpost',()=>{const q=new THREE.BoxGeometry(.15,1.3,.15);q.translate(0,.65,0);return q}),M.woodDark,fence))}
function drawPadSign(n,t,queued){const x=lobby.signC.getContext('2d');x.fillStyle='#2a1608';x.fillRect(0,0,512,192);x.strokeStyle='#e9b04f';x.lineWidth=8;x.strokeRect(6,6,500,180);x.fillStyle='#ffd890';x.textAlign='center';
 x.font='bold 40px Georgia';x.fillText('THE IRON DUST EXPRESS',256,58);x.font='bold 54px Georgia';x.fillText(n?`DEPARTS IN ${Math.ceil(t)}s`:'STEP ON THE PAD',256,125);x.font='28px Georgia';x.fillText(`${n}/8 aboard${queued?' — you\'re in!':''}`,256,170);lobby.signT.needsUpdate=true}
// ================= player & input =================
const player={pos:new V3(-10,0,LZ),vy:0,yaw:-Math.PI/2,pitch:0,hp:100,coal:3,bandage:1,ammo:24,onCar:-1,ground:false,driving:false,dead:false,bob:0,moving:false,kills:0,regenT:0};
const keys={};let locked=false,mode='menu',uiOpen=false,chatOpen=false,mouseDown=false;
addEventListener('keydown',e=>{if(chatOpen)return;keys[e.code]=true;if(mode==='menu'||uiOpen)return;
 if(e.code==='KeyE')useKey();if(e.code==='KeyQ')feedCoal();if(e.code==='KeyH')heal();if(e.code==='KeyR')reload();
 if(e.code.startsWith('Digit')){const n=+e.code[5]-1;if(n>=0&&n<3)setWeapon(n)}
 if(e.code==='KeyB'&&mode==='run')tryShop();if(e.code==='KeyT'&&net){e.preventDefault();openChat()}if(e.code==='Escape'&&!locked)show('pause')});
addEventListener('keyup',e=>keys[e.code]=false);
addEventListener('mousemove',e=>{if(!locked&&!(mode!=='menu'&&!uiOpen&&e.buttons&2))return;player.yaw-=e.movementX*.0022;player.pitch=clamp(player.pitch-e.movementY*.0022,-1.5,1.5)});
renderer.domElement.addEventListener('mousedown',e=>{if(mode!=='menu'&&!uiOpen&&!locked&&e.button===0){lockPointer();return}if(locked&&e.button===0)mouseDown=true});addEventListener('mouseup',()=>mouseDown=false);
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
function lockPointer(){try{const p=renderer.domElement.requestPointerLock&&renderer.domElement.requestPointerLock();p&&p.catch&&p.catch(()=>lockHint())}catch(e){lockHint()}}
function lockHint(){if(mode!=='menu'&&!locked)msg('Click the game to capture the mouse (or hold right-click and drag to look)','#fd6')}
document.addEventListener('pointerlockerror',lockHint);
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===renderer.domElement;if(!locked&&mode!=='menu'&&!uiOpen&&!chatOpen)show('pause')});
function show(id){for(const s of['menu','pause','shop','classes','results'])$(s).style.display=s===id?'flex':'none';uiOpen=!!id;if(id&&locked)document.exitPointerLock();
 const inGame=mode!=='menu';$('hud').style.display=$('top').style.display=$('xh').style.display=inGame?'block':'none';$('fuelwrap').style.display=mode==='run'?'block':'none'}
const tmpCol=[];
function physics(dt){const p=player.pos,Rr=.35,Hh=1.7;
 const sp=keys.ShiftLeft||keys.ShiftRight?8.5:5;const f=new V3(-Math.sin(player.yaw),0,-Math.cos(player.yaw)),rt=new V3(-f.z,0,f.x);
 const mv=new V3();if(!player.driving&&!uiOpen&&!chatOpen&&!player.dead){if(keys.KeyW)mv.add(f);if(keys.KeyS)mv.sub(f);if(keys.KeyD)mv.add(rt);if(keys.KeyA)mv.sub(rt)}
 player.moving=mv.lengthSq()>0;if(player.moving)mv.normalize().multiplyScalar(sp*dt);p.add(mv);
 if(keys.Space&&player.ground&&!player.driving&&!chatOpen){player.vy=6.4;player.ground=false}
 const prevY=p.y;player.vy-=18*dt;p.y+=player.vy*dt;player.ground=false;player.onCar=-1;
 const gh=hgt(p.x,p.z);if(p.y<=gh){if(prevY>gh+.6&&player.vy<-12)hurt((-player.vy-12)*4);p.y=gh;player.vy=0;player.ground=true}
 const test=(c,lx,ly,lz,prevLy)=>{if(lx+Rr<c.x0||lx-Rr>c.x1||lz+Rr<c.z0||lz-Rr>c.z1||ly>=c.y1||ly+Hh<=c.y0)return null;
  if(prevLy>=c.y1-.45&&player.vy<=0)return{y:c.y1};const dx1=c.x1-(lx-Rr),dx0=(lx+Rr)-c.x0,dz1=c.z1-(lz-Rr),dz0=(lz+Rr)-c.z0,m=Math.min(dx1,dx0,dz1,dz0);
  return m===dx1?{dx:dx1}:m===dx0?{dx:-dx0}:m===dz1?{dz:dz1}:{dz:-dz0}};
 const list=mode==='lobby'?lobby.col:staticCol;
 for(const c of list){if(c.x1<p.x-3||c.x0>p.x+3||c.z1<p.z-3||c.z0>p.z+3)continue;const r=test(c,p.x,p.y,p.z,prevY);if(!r)continue;if(r.y!==undefined){p.y=r.y;player.vy=0;player.ground=true}else{p.x+=r.dx||0;p.z+=r.dz||0}}
 if(mode==='run')cars.forEach((car,ci)=>{if(Math.abs(car.pos.z-p.z)>12)return;let l=toLocal(car,p);for(const b of car.cols){const c={x0:b[0],x1:b[1],y0:b[2],y1:b[3],z0:b[4],z1:b[5]};const r=test(c,l[0],l[1],l[2],prevY);if(!r)continue;
  if(r.y!==undefined){l[1]=r.y;player.vy=0;player.ground=true;player.onCar=ci}else{l[0]+=r.dx||0;l[2]+=r.dz||0}toWorld(car,l,p)}});
 if(player.driving){toWorld(cars[0],[.25,1.4,3.8],p);player.onCar=0;player.ground=true}
 if(p.y<-20)p.set(0,5,-train.dist+20);
 if(player.ground&&player.moving)player.bob+=dt*(sp>6?13:8.5);
 camera.position.set(p.x,p.y+1.62+Math.sin(player.bob)*.045,p.z);camera.rotation.set(player.pitch,player.yaw,0,'YXZ')}
function inCab(){if(mode!=='run'||player.onCar!==0)return false;const l=toLocal(cars[0],player.pos);return l[2]>1.7&&l[2]<5.8&&Math.abs(l[0])<1.4}
// ================= weapons =================
const W=[{n:'Shovel',dmg:38,rate:.6,range:2.9,melee:true},{n:'Revolver',dmg:30,rate:.3,range:150,clip:6,mag:6,cost:1},{n:'Scattergun',dmg:13,rate:.9,range:45,clip:2,mag:2,pellets:9,spread:.075,cost:2}];
let wi=1,cool=0,reloadT=0,reloadDur=1,swing=0,kick=0;const vm=new THREE.Group();vm.scale.setScalar(.62);camera.add(vm);const vms=[];
{const arm=(g)=>{mesh(G('varm',()=>new THREE.CapsuleGeometry(.05,.35,4,8)),M.skin,.04,-.1,.15,g,1.3,0,0,false);mesh(B(.11,.11,.14),M.leather,.04,-.06,.03,g,0,0,0,false)};
 let g=new THREE.Group();mesh(C(.022,.022,.9,8),M.wood,0,0,-.25,g,Math.PI/2,0,0,false);mesh(B(.22,.03,.28),M.steel,0,0,-.75,g,0,0,0,false);mesh(B(.12,.04,.04),M.woodDark,0,0,.2,g,0,0,0,false);arm(g);vms.push(g);
 g=new THREE.Group();mesh(C(.022,.022,.34,10),M.steel,0,.03,-.3,g,Math.PI/2,0,0,false);const drum=mesh(C(.05,.05,.1,6),M.steel,0,.02,-.12,g,Math.PI/2,0,0,false);g.userData.drum=drum;
 mesh(B(.05,.09,.18),M.iron,0,.02,-.06,g,0,0,0,false);mesh(B(.045,.17,.08),M.wood,0,-.08,.02,g,-.35,0,0,false);mesh(B(.01,.03,.02),M.iron,0,.07,-.45,g,0,0,0,false);mesh(B(.012,.05,.05),M.brass,0,-.03,-.08,g,0,0,0,false);arm(g);vms.push(g);
 g=new THREE.Group();for(const s of[-1,1])mesh(C(.024,.024,.75,10),M.iron,s*.026,.02,-.42,g,Math.PI/2,0,0,false);mesh(B(.08,.05,.4),M.wood,0,-.03,-.25,g,0,0,0,false);mesh(B(.07,.1,.32),M.wood,0,-.06,.08,g,-.2,0,0,false);mesh(B(.09,.07,.12),M.iron,0,.0,-.02,g,0,0,0,false);arm(g);vms.push(g);
 for(const g of vms){g.position.set(.24,-.24,-.32);g.visible=false;vm.add(g)}}
const flashS=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.flash,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,depthTest:false}));flashS.scale.setScalar(.35);flashS.visible=false;flashS.renderOrder=10;camera.add(flashS);
const flashL=new THREE.PointLight(0xffb050,0,10,1.5);camera.add(flashL);flashL.position.set(.25,-.2,-.9);
function setWeapon(n){wi=n;vms.forEach((g,i)=>g.visible=i===n);reloadT=0;swing=.3}
function reload(){const w=W[wi];if(!w.clip||w.mag===w.clip||player.ammo<=0||reloadT>0)return;reloadDur=(wi===2?1.3:1.1)*(K().reload||1);reloadT=reloadDur;sfx(900,.06,.1,false)}
let actx;function sfx(f=200,d=.15,v=.3,noise=true){try{actx=actx||new AudioContext();if(actx.state==='suspended')actx.resume();const t=actx.currentTime,g=actx.createGain();g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);g.connect(actx.destination);
 if(noise){const b=actx.createBuffer(1,Math.max(1,actx.sampleRate*d|0),actx.sampleRate),a=b.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/a.length,2);const s=actx.createBufferSource();s.buffer=b;const fl=actx.createBiquadFilter();fl.frequency.value=f*8;s.connect(fl).connect(g);s.start()}
 else{const o=actx.createOscillator();o.frequency.value=f;o.connect(g);o.start();o.stop(t+d)}}catch(e){}}
const ray=new THREE.Raycaster();
function attack(){const w=W[wi];if(cool>0||reloadT>0||player.driving||player.dead)return;
 if(w.clip&&w.mag<=0){reload();return}cool=w.rate;
 if(w.clip){w.mag--;kick=1;flashS.visible=true;flashS.material.rotation=Math.random()*6;flashS.position.set(.21,-.17,wi===2?-1.05:-.72);flashL.intensity=40;sfx(wi===2?110:240,wi===2?.35:.25,.45);net&&send({t:'shot'})}else{swing=1;sfx(90,.12,.2)}
 const meshes=[];for(const z of allZ())if(z.g.visible&&!z.dying)meshes.push(z.g);const statics=[];
 const mult=stat.dmg()*(w.melee?(K().melee||1):(K().gun||1));
 for(let i=0;i<(w.pellets||1);i++){const d=new V3(0,0,-1);if(w.spread)d.add(new V3((Math.random()-.5)*w.spread*2,(Math.random()-.5)*w.spread*2,0)).normalize();
  d.applyQuaternion(camera.quaternion);ray.set(camera.getWorldPosition(new V3()),d);ray.far=w.range;
  const h=ray.intersectObjects(meshes,true)[0];if(h){let o=h.object;while(o&&!o.userData.z)o=o.parent;if(o){const head=h.object.userData.head;hitZombie(o.userData.z,w.dmg*mult*(head?2:1),d);blood(h.point,head?14:8);if(head&&i===0)msg('Headshot!','#f96')}}
  else if(!w.melee){const t=ray.ray.origin.y>0?-ray.ray.origin.y/d.y:0;if(d.y<0&&t>0&&t<w.range)dust(ray.ray.origin.clone().addScaledVector(d,t))}}}
// ================= zombies =================
const zombies=new Map();let zid=1;const remoteZ=new Map();
function spawnZ(x,z,hp){if(zombies.size>=42||mode!=='run')return;const id=zid++;const m=makeZombie(Math.random);m.g.position.set(x,hgt(x,z),z);scene.add(m.g);
 const o={id,g:m.g,m,hp:hp||55+train.dist/1000*1.6,spd:2.4+Math.random()*1.6,ph:Math.random()*6,stun:0};m.g.userData.z=o;zombies.set(id,o);return o}
const isAuth=()=>!net||net.host===net.id;
function allZ(){return isAuth()?zombies.values():remoteZ.values()}
function hitZombie(z,dmg,dir){if(isAuth()){z.hp-=dmg;z.stun=.22;if(dir)z.g.position.addScaledVector(new V3(dir.x,0,dir.z).normalize(),.25);if(z.hp<=0)killZ(z,true)}
 else{send({t:'zhit',id:z.id,dmg});z.hp-=dmg;if(z.hp<=0){reward(15,'Zombie down +$15');player.kills++;z.dying=1}}}
function killZ(z,mine){z.dying=1;if(mine){reward(15,'Zombie down +$15');player.kills++}}
function targets(){const t=[];if(!player.dead)t.push(player.pos.clone());if(net)for(const[id,s]of Object.entries(lastPs))if(+id!==net.id&&!s[5])t.push(new V3(s[0],s[1],s[2]));return t}
function deckAt(x,z){for(const c of cars){if(Math.abs(c.pos.z-z)>8)continue;const l=toLocal(c,{x,y:0,z});if(Math.abs(l[0])<1.5&&l[2]>c.cols[0][4]&&l[2]<c.cols[0][5])return 1.4}return null}
let spawnT=0;
function updateZombies(dt,night){const T=targets();
 spawnT-=dt;if(spawnT<=0){spawnT=night?2.5:7;const n=Math.min(1+Math.floor(train.dist/15000),4);
  if(train.speed<7||night)for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,r=40+Math.random()*30;spawnZ(player.pos.x+Math.cos(a)*r,player.pos.z+Math.sin(a)*r)}}
 for(const z of zombies.values()){const p=z.g.position;
  if(z.dying){z.dying+=dt;z.g.rotation.x=Math.max(-Math.PI/2,-z.dying*4);if(z.dying>2.5){scene.remove(z.g);zombies.delete(z.id)}continue}
  let best=null,bd=1e9;for(const t of T){const d=t.distanceToSquared(p);if(d<bd){bd=d;best=t}}
  if(bd>380*380){scene.remove(z.g);zombies.delete(z.id);continue}
  z.stun=Math.max(0,z.stun-dt);
  if(best&&z.stun<=0){const dx=best.x-p.x,dz=best.z-p.z,d=Math.hypot(dx,dz);z.g.rotation.y=Math.atan2(-dx,-dz);
   if(d>1.05){const s=z.spd*(night?1.35:1)*dt;p.x+=dx/d*s;p.z+=dz/d*s}}
  for(const c of staticCol){if(c.y1<1||p.x<c.x0-.3||p.x>c.x1+.3||p.z<c.z0-.3||p.z>c.z1+.3)continue;const a=[c.x1+.3-p.x,p.x-c.x0+.3,c.z1+.3-p.z,p.z-c.z0+.3],m=Math.min(...a);if(m===a[0])p.x=c.x1+.3;else if(m===a[1])p.x=c.x0-.3;else if(m===a[2])p.z=c.z1+.3;else p.z=c.z0-.3}
  const dk=best&&best.y>1?deckAt(p.x,p.z):null;p.y=dk!==null?dk:hgt(p.x,p.z);animZ(z,dt)}}
function animZ(z,dt){z.ph+=dt*6.5;const m=z.m,s=Math.sin(z.ph);m.ll.rotation.x=s*.65;m.rl.rotation.x=-s*.65;m.la.rotation.x=-1.35+Math.sin(z.ph*.5)*.15;m.ra.rotation.x=-1.35-Math.sin(z.ph*.5+1)*.15;m.head.rotation.z=Math.sin(z.ph*.3)*.25;m.g.children[0].position.y=1.3+Math.abs(s)*.04}
const zcd=new Map();
function zombieDamage(dt){if(player.dead)return;for(const z of allZ()){if(!z.g.visible||z.dying)continue;const p=z.g.position;const d=Math.hypot(p.x-player.pos.x,p.z-player.pos.z);
 if(d<1.5&&Math.abs(p.y-player.pos.y)<1.6){const c=(zcd.get(z.id)||0)-dt;if(c<=0){hurt((10+train.dist/8000)*(K().armor||1));zcd.set(z.id,1.1);z.m.la.rotation.x=-2}else zcd.set(z.id,c)}}}
// ================= loot =================
const TIERS=[['Common','#d8d8d8',60,1],['Uncommon','#5fd35f',25,1.6],['Rare','#4fa0ff',10,2.5],['Epic','#b65cff',4,4],['Legendary','#ffb020',.9,7],['Mythic','#ff3070',.1,15]];
function rollTier(bonus=0){const L=stat.luck()+bonus,w=TIERS.map((t,i)=>t[2]*Math.pow(1+L*.3,i)),s=w.reduce((a,b)=>a+b);let r=Math.random()*s;for(let i=0;i<w.length;i++){if((r-=w[i])<0)return i}return 0}
function rollLoot(strong,pos){const ti=Math.min(5,rollTier(strong?3:0)+(strong?1:0)),[name,col,,mul]=TIERS[ti],out=[];const rolls=1+(ti>=3?1:0)+(ti>=5?1:0);
 for(let i=0;i<rolls;i++){const k=Math.random();
  if(k<.38){const n=Math.round((1+Math.random()*2)*mul);player.coal+=n;out.push(`${n} coal`)}
  else if(k<.63){const n=Math.round((10+Math.random()*25)*mul*(K().cash||1));reward(n);out.push(`$${n}`)}
  else if(k<.83){const n=Math.round((4+Math.random()*6)*Math.sqrt(mul));player.ammo+=n;out.push(`${n} ammo`)}
  else{const n=Math.max(1,Math.round(mul/2));player.bandage+=n;out.push(`${n} bandage${n>1?'s':''}`)}}
 msg(`<b style="color:${col}">${name.toUpperCase()}</b> ${strong?'strongbox':'crate'}: ${out.join(', ')}`,col);sfx(ti>=4?880:520,.3,.2,false);
 if(pos)for(let i=0;i<10+ti*6;i++)puff(pos.clone().add(new V3(0,.6,0)),new V3((Math.random()-.5)*3,1+Math.random()*3,(Math.random()-.5)*3),col,.18,.9,.2,.9,true)}
function openCrate(id){const m=crates.get(id);if(!m||opened.has(id))return;if(net){send({t:'crate',id});return}opened.add(id);crateOpened(m,true)}
function crateOpened(m,mine){m.material=M.crateOpen;m.scale.y=.75;if(mine)rollLoot(m.userData.strong,m.getWorldPosition(new V3()))}
// ================= actions =================
function nearestCrate(){let b=null,bd=2.4;const wp=new V3();for(const[id,m]of crates){if(opened.has(id))continue;m.getWorldPosition(wp);const d=Math.hypot(wp.x-player.pos.x,wp.z-player.pos.z)+Math.abs(wp.y-player.pos.y-.5)*.5;if(d<bd){bd=d;b=id}}return b}
function nearNpc(){if(mode!=='lobby')return null;for(const n of lobby.npcs)if(n.pos.distanceTo(new V3(player.pos.x,0,player.pos.z))<3.2)return n;return null}
function useKey(){if(mode==='lobby'){const n=nearNpc();if(n){n.kind==='classes'?openClasses():openShop()}return}
 if(player.driving){player.driving=false;return}if(inCab()){player.driving=true;return}const c=nearestCrate();if(c)openCrate(c)}
function feedCoal(){if(mode!=='run')return;if(!inCab()&&!player.driving)return msg('Get into the engine cab to feed the furnace');if(player.coal<=0)return msg('No coal! Loot crates in towns.');
 const per=K().coalv||10,need=Math.ceil((100-train.fuel)/per),n=Math.min(need,player.coal);if(n<=0)return msg('Furnace is full');player.coal-=n;if(net)send({t:'fuel',n:n*per});else train.fuel=Math.min(100,train.fuel+n*per);msg(`Shoveled ${n} coal`);sfx(70,.4,.3);
 for(let i=0;i<12;i++)puff(toWorld(cars[0],[0,2,2.3],new V3()),new V3((Math.random()-.5)*2,Math.random()*2,(Math.random()-.5)*2),0xff8020,.12,.6,.2,1,true)}
function heal(){if(player.bandage<=0||player.hp>=stat.maxHp()||player.dead)return;player.bandage--;player.hp=Math.min(stat.maxHp(),player.hp+35*(K().heal||1));msg('Patched up','#8f8')}
function hurt(d){if(player.dead||mode!=='run')return;player.hp-=d;sfx(60,.2,.3);$('hurt').style.opacity=.85;setTimeout(()=>$('hurt').style.opacity=0,180);if(player.hp<=0)die()}
function reward(n,t){save.money+=Math.round(n);persist();if(t)msg(t,'#fd6')}
function die(){player.dead=true;player.driving=false;player.hp=0;
 if(net&&net.players.length>1){msg('You are down! Respawning on the train in 6s... (Esc → Return to Lobby to leave)','#f66');setTimeout(()=>{if(mode!=='run')return;player.dead=false;player.hp=stat.maxHp()*.6;toWorld(cars[2],[0,1.5,0],player.pos);player.coal=Math.floor(player.coal/2)},6000);return}
 setTimeout(()=>endRun(false),1200)}
function endRun(won){if(mode!=='run')return;const km=train.dist/1000,base=Math.round(km*25),bonus=won?750:0;save.money+=base+bonus;save.best=Math.max(save.best,won?GOAL:train.dist);save.runs++;persist();
 $('restitle').textContent=won?'YOU MADE IT!':'YOU DIED';$('restitle').style.color=won?'#e9b04f':'#d33';
 $('resinfo').innerHTML=`${won?'The Iron Dust Express rolls into Fort Haven.<br>':''}Distance: <b>${km.toFixed(2)} km</b> · Zombies put down: <b>${player.kills}</b><br>Distance reward: <b>$${base}</b>${won?` · Victory bonus: <b>$${bonus}</b>`:''}<br>Bank: <b>$${save.money}</b> · Best: ${(save.best/1000).toFixed(2)} km`;
 mode='results';show('results')}
$('resback').onclick=()=>toLobby();
function tryShop(){if(train.speed>1&&!player.dead)return msg('Stop the train to trade (B)');openShop()}
function openShop(){show('shop');renderShop()}
function renderShop(){$('shopmoney').innerHTML=`Bank: $${save.money} · Luck ${stat.luck()} · Trade: ${K().n}`;$('shoprows').innerHTML='';
 for(const k in UPG){const d=document.createElement('div');d.className='row';const c=upCost(k),mx=save.up[k]>=10;
  d.innerHTML=`<div style="text-align:left"><b>${UPG[k].n}</b> Lv ${save.up[k]}<br><small>${UPG[k].d}</small></div>`;const b=document.createElement('button');b.textContent=mx?'MAX':`$${c}`;b.disabled=mx||save.money<c;
  b.onclick=()=>{if(save.money<c)return;save.money-=c;save.up[k]++;persist();if(k==='hp')player.hp+=20;if(net&&net.host===net.id)send({t:'trainup',maxSpeed:stat.maxSpeed(),eff:stat.eff()});renderShop()};d.appendChild(b);$('shoprows').appendChild(d)}}
function openClasses(){show('classes');renderClasses()}
function renderClasses(){$('clsmoney').innerHTML=`Bank: $${save.money}`;const box=$('clscards');box.innerHTML='';
 for(const k in CLASSES){const c=CLASSES[k],own=save.owned.includes(k),d=document.createElement('div');d.className='card'+(save.cls===k?' sel':'');
  d.innerHTML=`<b>${c.n}</b><br>${c.d}<br><small>Starts with: ${c.gear}</small><br>`;const b=document.createElement('button');
  if(save.cls===k){b.textContent='Equipped';b.disabled=true}else if(own){b.textContent='Equip';b.onclick=()=>{save.cls=k;persist();renderClasses();msg(`You are now a ${c.n}`,'#fd6')}}
  else{b.textContent=`Unlock $${c.cost}`;b.disabled=save.money<c.cost;b.onclick=()=>{if(save.money<c.cost)return;save.money-=c.cost;save.owned.push(k);save.cls=k;persist();renderClasses()}}
  d.appendChild(b);box.appendChild(d)}}
$('shopclose').onclick=$('clsclose').onclick=()=>{show(null);lockPointer()};
let banT=0;function banner(t){const d=document.createElement('div');d.innerHTML=`<span style="font-size:30px;color:#e9b04f;letter-spacing:3px">${t.toUpperCase()}</span>`;$('msgs').appendChild(d);setTimeout(()=>d.remove(),4000)}
function msg(t,c='#fff'){const d=document.createElement('div');d.innerHTML=t;d.style.color=c;$('msgs').appendChild(d);setTimeout(()=>d.remove(),3800);while($('msgs').children.length>7)$('msgs').firstChild.remove()}
// ================= networking =================
let net=null,lastPs={},trainSrv=null,padSrv={n:0,t:15,ids:[]};const remotes=new Map();
function send(m){if(net&&net.ws.readyState===1)net.ws.send(JSON.stringify(m))}
const online=()=>true;
// ---- P2P transport (PeerJS public broker). Host browser runs hostcore (authoritative); clients connect by room code.
const PFX='irondust-v1-';let peer=null,core=null;
function mkCode(){return Math.random().toString(36).slice(2,7).toUpperCase().replace(/[^A-Z0-9]/g,'X')}
function shim(sendFn){const w={readyState:1,send:sendFn,close(){}};return w}
function connect(asHost,code){return new Promise((res,rej)=>{
 const to=setTimeout(()=>{rej(asHost?'Could not reach the matchmaking service (check your internet)':'Could not find party '+code+' — check the code and that the host is still in game');try{peer&&peer.destroy()}catch(e){}},15000);
 try{peer=new Peer(asHost?PFX+code:undefined,{debug:0})}catch(e){clearTimeout(to);return rej('Multiplayer not supported in this browser')}
 peer.on('error',e=>{if(e.type==='unavailable-id'){clearTimeout(to);rej('That party code is taken, try again');return}if(e.type==='peer-unavailable'){clearTimeout(to);rej('Party '+code+' not found — is the host online?');return}if(!net){clearTimeout(to);rej('Network error: '+e.type)}});
 peer.on('disconnected',()=>{try{peer.reconnect()}catch(e){}});
 if(asHost){peer.on('open',()=>{clearTimeout(to);core=createHostCore();let local;
   const ws=shim(m=>local.recv(m));net={ws,id:0,host:0,room:'',players:[],code,isHost:true};
   local=core.addClient({open:true,send:m=>onNet(JSON.parse(m))});
   peer.on('connection',conn=>{let cl=null;conn.on('open',()=>{cl=core.addClient({get open(){return conn.open},send:m=>conn.send(m)})});conn.on('data',d=>cl&&cl.recv(d));conn.on('close',()=>{cl&&cl.close();cl=null});conn.on('error',()=>{cl&&cl.close();cl=null})});
   res()})}
 else peer.on('open',()=>{const conn=peer.connect(PFX+code,{reliable:true});
   conn.on('open',()=>{clearTimeout(to);const ws=shim(m=>conn.send(m));net={ws,id:0,host:0,room:'',players:[],code,isHost:false};res()});
   conn.on('data',d=>onNet(typeof d==='string'?JSON.parse(d):d));
   conn.on('close',()=>{if(net&&net.ws){net=null;clearRemotes();if(mode!=='menu'){msg('Lost connection to the host — back to offline lobby','#f66');enterLobby()}}})});
})}
function disconnect(){try{peer&&peer.destroy()}catch(e){}peer=null;if(core){core.stop();core=null}net=null}
function joinRoom(room){clearRemotes();send({t:'join',room,name:pname(),cls:save.cls})}
const pname=()=>($('nm').value.trim()||'Drifter').slice(0,16);
function clearRemotes(){for(const r of remotes.values())scene.remove(r.g);remotes.clear();for(const z of remoteZ.values())scene.remove(z.g);remoteZ.clear();lastPs={}}
function onNet(m){switch(m.t){
 case 'welcome':Object.assign(net,{id:m.id,host:m.host,room:m.room,players:m.players});if(m.room==='LOBBY')enterLobby();else{seed=m.seed;opened=new Set(m.opened);Object.assign(train,m.train);startRun()}break;
 case 'err':msg(m.msg,'#f66');joinRoom('LOBBY');break;
 case 'state':lastPs=m.ps;if(m.train)trainSrv=m.train;if(m.pad)padSrv=m.pad;break;
 case 'startrun':msg('All aboard! Departing...','#fd6');joinRoom(m.room);break;
 case 'players':{const was=net.host===net.id;net.players=m.players;net.host=m.host;if(mode==='run'&&!was&&net.host===net.id){msg('You are now the host','#fd6');for(const z of remoteZ.values())scene.remove(z.g);remoteZ.clear();send({t:'trainup',maxSpeed:stat.maxSpeed(),eff:stat.eff()})}
  for(const[id,r]of remotes)if(!m.players.find(p=>p.id===id)){scene.remove(r.g);remotes.delete(id)}break}
 case 'crateok':opened.add(m.id);crates.get(m.id)&&crateOpened(crates.get(m.id),true);break;
 case 'crategone':if(!opened.has(m.id)){opened.add(m.id);crates.get(m.id)&&crateOpened(crates.get(m.id),false)}break;
 case 'zombies':{if(isAuth()||mode!=='run')break;const seen=new Set();for(const[id,x,y,z,ry,hp,dy]of m.z){seen.add(id);let o=remoteZ.get(id);if(!o){const mm=makeZombie(rng(id));mm.g.position.set(x,y,z);scene.add(mm.g);o={id,g:mm.g,m:mm,ph:0,hp};mm.g.userData.z=o;remoteZ.set(id,o)}o.tp=[x,y,z];o.g.rotation.y=ry;o.hp=hp;o.dying=dy;if(dy)o.g.rotation.x=Math.max(-Math.PI/2,-dy*4)}
  for(const[id,o]of remoteZ)if(!seen.has(id)){scene.remove(o.g);remoteZ.delete(id)}break}
 case 'zhit':{const z=zombies.get(m.id);if(z&&!z.dying){z.hp-=m.dmg;z.stun=.22;if(z.hp<=0)killZ(z,false)}break}
 case 'chat':{const d=document.createElement('div');d.textContent=`${m.name==='*'?'':m.name+': '}${m.msg}`;if(m.name==='*')d.style.color='#fd6';$('chatlog').appendChild(d);setTimeout(()=>d.remove(),20000);while($('chatlog').children.length>8)$('chatlog').firstChild.remove();break}
 case 'shot':sfx(200,.2,.12);break}}
const pCols=[0x2f5d8c,0x8c2f5d,0x5d8c2f,0x8c6a2f,0x6a2f8c,0x2f8c86];
function updateRemotes(dt){if(!net)return;for(const[id,s]of Object.entries(lastPs)){const i=+id;if(i===net.id)continue;let r=remotes.get(i);
  if(!r){const pl=net.players.find(p=>p.id===i)||{};r=makeHuman(pCols[i%pCols.length],`${pl.name||'?'}${pl.cls&&CLASSES[pl.cls]?' · '+CLASSES[pl.cls].n:''}`);r.ph=0;scene.add(r.g);remotes.set(i,r)}
  const tp=new V3(s[0],s[1],s[2]);if(r.g.position.distanceTo(tp)>6)r.g.position.copy(tp);else r.g.position.lerp(tp,Math.min(1,dt*14));r.g.rotation.y=s[3];
  if(s[4])r.ph+=dt*9;else r.ph*=.85;r.ll.rotation.x=Math.sin(r.ph)*.6;r.rl.rotation.x=-Math.sin(r.ph)*.6;r.la.rotation.x=-Math.sin(r.ph)*.4;r.ra.rotation.x=-1.2;r.g.visible=!s[5]}
 for(const z of remoteZ.values()){if(z.tp)z.g.position.lerp(new V3(...z.tp),Math.min(1,dt*10));if(!z.dying)animZ(z,dt)}}
function openChat(){chatOpen=true;const i=$('chatin');i.style.display='block';i.value='';setTimeout(()=>i.focus(),0);if(locked)document.exitPointerLock()}
$('chatin').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){const v=$('chatin').value.trim();if(v)send({t:'chat',msg:v});closeChat()}if(e.key==='Escape')closeChat()});
function closeChat(){chatOpen=false;$('chatin').style.display='none';$('chatin').blur();for(const k in keys)keys[k]=false;lockPointer()}
// ================= modes =================
let padLocal={on:false,t:15};
function enterLobby(){mode='lobby';clearWorld();for(const z of zombies.values())scene.remove(z.g);zombies.clear();for(const z of remoteZ.values())scene.remove(z.g);remoteZ.clear();
 lobby.g.visible=true;trainG.visible=false;Object.assign(player,{hp:stat.maxHp(),dead:false,driving:false,vy:0,yaw:-Math.PI/2,pitch:0});player.pos.set(-12+Math.random()*2,0,LZ+(Math.random()-.5)*3);
 padLocal={on:false,t:15};setWeapon(1);show(null);updateTerrain(true);lockPointer();
 msg('Welcome to Sweetwater Junction. Pick a trade at the Outfitter, spend your bank at the Trading Post, then step on the glowing pad by the train.','#fd6');
 if(!net)msg('Offline lobby (solo). For co-op: main menu → Host Co-op Party.','#aaa')}
function startRun(){mode='run';clearWorld();for(const z of zombies.values())scene.remove(z.g);zombies.clear();lobby.g.visible=false;trainG.visible=true;
 if(!net){seed=(Math.random()*1e9)|0;opened=new Set();Object.assign(train,{dist:0,speed:0,throttle:0,fuel:60})}trainSrv=null;lastTown='';
 const k=K();Object.assign(player,{hp:stat.maxHp(),coal:k.coal||3,bandage:k.bandage||1,ammo:k.ammo||24,dead:false,driving:false,vy:0,yaw:0,pitch:0,kills:0});
 placeTrain();toWorld(cars[2],[(Math.random()-.5)*1.5,1.5,(Math.random()-.5)*4],player.pos);
 W[1].mag=6;W[2].mag=2;setWeapon(save.cls==='bruiser'?0:1);show(null);lockPointer();updateChunks();updateTerrain(true);
 if(net&&net.host===net.id)send({t:'trainup',maxSpeed:stat.maxSpeed(),eff:stat.eff()});
 msg('Walk forward to the engine cab and press E to drive. W/S = throttle, Q = shovel coal.','#fd6');banner('Sweetwater Depot')}
function toLobby(){if(net){joinRoom('LOBBY')}else enterLobby()}
async function goOnline(asHost){localStorage.setItem('ironDustName',$('nm').value);const code=asHost?mkCode():$('rc').value.trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
 if(!asHost&&!code){$('mperr').textContent='Enter the party code your friend gave you';return}
 disconnect();$('mperr').textContent=asHost?'Opening party...':'Joining party '+code+'...';
 try{await connect(asHost,code);$('mperr').textContent='';joinRoom('LOBBY');if(asHost)setTimeout(()=>msg(`Party code <b>${code}</b> — friends join with it, or share: ${inviteLink()}`,'#fd6'),800)}catch(e){disconnect();$('mperr').textContent=String(e)}}
const inviteLink=()=>location.protocol.startsWith('http')?location.origin+location.pathname+'?room='+(net?net.code:''):'(code only)';
$('play').onclick=()=>{localStorage.setItem('ironDustName',$('nm').value);disconnect();enterLobby()};
$('host').onclick=()=>goOnline(true);$('join').onclick=()=>goOnline(false);
$('resume').onclick=()=>{show(null);lockPointer()};$('openshop').onclick=()=>{if(mode==='run'&&train.speed>1)return msg('Stop the train first');openShop()};
$('tolobby').onclick=()=>{if(mode==='run'){if(net&&net.players.length>1){toLobby();return}endRun(false);return}show(null)};
$('quit').onclick=()=>{disconnect();clearRemotes();clearWorld();mode='menu';show('menu');saveInfo()};
function saveInfo(){$('saveinfo').innerHTML=`<br>Bank $${save.money} · Best ${(save.best/1000).toFixed(2)} km · Trade: ${K().n}`}saveInfo();
$('nm').value=localStorage.getItem('ironDustName')||'';{const q=new URLSearchParams(location.search).get('room');if(q)$('rc').value=q.toUpperCase()}
// ================= main loop =================
let last=performance.now(),dayT=.3,netT=0,thrT=0,smokeT=0,fps=60,frames=0,fpsT=0;
const cDay=new THREE.Color(0xd8c4a0),cNight=new THREE.Color(0x0a0f22),cDusk=new THREE.Color(0xd07a48),fogC=new THREE.Color();
function frame(now){requestAnimationFrame(frame);const rdt=Math.min(1,(now-last)/1000),dt=Math.min(.05,rdt);last=now;frames++;fpsT+=dt;if(fpsT>1){fps=frames/fpsT;frames=0;fpsT=0}
 dayT=(dayT+dt/(mode==='lobby'?1200:420))%1;const ang=dayT*Math.PI*2-Math.PI/2,sy=Math.sin(ang),sdir=new V3(Math.cos(ang),sy,.35).normalize();
 const day=clamp(sy*2.5+.25,0,1),dusk=clamp(1-Math.abs(sy)*3.5,0,1);skyU.sunDir.value.copy(sdir);skyU.day.value=day;skyU.dusk.value=dusk;
 fogC.copy(cNight).lerp(cDay,day).lerp(cDusk,dusk*.45);scene.fog.color.copy(fogC);scene.fog.far=170+day*300;scene.fog.near=20+day*60;
 sun.intensity=2.8*day;sun.color.setHSL(.09,.7,.55+.35*(1-dusk));hemi.intensity=.2+.6*day;hemi.color.setHSL(.6,.45,.45+.35*day);hemi.groundColor.setHSL(.07,.4,.15+.2*day);renderer.toneMappingExposure=.9+.4*(1-day);
 const night=day<.25;const pp=player.pos;
 if(mode==='run'){const carry=player.onCar>=0&&!player.dead?{c:cars[player.onCar],l:toLocal(cars[player.onCar],pp),y:cars[player.onCar].yaw}:null;
  if(player.driving&&!uiOpen&&!chatOpen){const d=(keys.KeyW?1:0)-(keys.KeyS?1:0);if(d){train.throttle=clamp(train.throttle+d*dt*.5,0,1);thrT-=dt;if(net&&thrT<=0){send({t:'throttle',v:train.throttle});thrT=.1}}}
  if(net&&trainSrv){train.speed=trainSrv.speed;train.fuel=trainSrv.fuel;if(!player.driving)train.throttle=trainSrv.throttle;train.dist+=train.speed*dt;train.dist+=(trainSrv.dist-train.dist)*Math.min(1,dt*3)}
  else if(!net){const tgt=train.fuel>0?train.throttle*stat.maxSpeed():0;train.speed+=Math.sign(tgt-train.speed)*Math.min(Math.abs(tgt-train.speed),(tgt>train.speed?2:3)*dt);
   train.fuel=Math.max(0,train.fuel-(train.speed*.004*stat.eff()+(train.throttle>0?.01:0))*dt);train.dist+=train.speed*dt}
  train.wheelA+=train.speed*dt;placeTrain();
  if(carry){toWorld(carry.c,carry.l,pp);player.yaw+=carry.c.yaw-carry.y}
  loco.head.intensity=night?80:0;loco.fl.intensity=3+Math.random()*2;
  smokeT-=dt;if(smokeT<=0){smokeT=train.throttle>0?.05:.25;const st=toWorld(cars[0],[0,5.3,-6.4],new V3());puff(st,new V3((Math.random()-.5)*.6,3+train.throttle*3,train.speed*.55),train.throttle>0?0x3a3a3a:0x9a9a9a,.9,3.5,.9,.55)}
  if(!player.dead)physics(dt);
  if(K().regen&&!player.dead)player.hp=Math.min(stat.maxHp(),player.hp+K().regen*dt);
  updateChunks();for(const k of chunks.values())for(const r of k.anim)r.rotation.z+=dt*2;
  if(isAuth())updateZombies(dt,night);zombieDamage(dt);
  if(train.dist>=GOAL)endRun(true)}
 else if(mode==='lobby'){physics(dt);for(const r of lobby.anim)r.rotation.z+=dt*1.5;lobby.ring.material.emissiveIntensity=2+Math.sin(now/300)*.8;
  smokeT-=dt;if(smokeT<=0){smokeT=.2;puff(new V3(50,5.3,LZ-14.4),new V3((Math.random()-.5)*.4,2.2,(Math.random()-.5)*.4),0x8a8a8a,.8,4,.9,.45)}
  for(const n of lobby.npcs){const dx=pp.x-n.h.g.position.x,dz=pp.z-n.h.g.position.z;if(Math.hypot(dx,dz)<12)n.h.g.rotation.y=Math.atan2(-dx,-dz)+Math.PI;n.h.la.rotation.x=Math.sin(now/600)*.1}
  const onPad=Math.hypot(pp.x-lobby.pad.x,pp.z-lobby.pad.z)<lobby.padR&&pp.y<1.5;
  if(net){if(onPad!==padLocal.on){padLocal.on=onPad;send({t:'pad',on:onPad})}drawPadSign(padSrv.n,padSrv.t,padSrv.ids&&padSrv.ids.includes(net.id))}
  else{if(onPad){if(!padLocal.on){padLocal.on=true;padLocal.t=window.__padTime||15}padLocal.t-=rdt;if(padLocal.t<=0){padLocal.on=false;msg('All aboard!','#fd6');startRun()}}else{padLocal.on=false;padLocal.t=15}drawPadSign(padLocal.on?1:0,padLocal.t,padLocal.on)}}
 if(mode==='run'||mode==='lobby'){updateRemotes(dt);
  cool-=dt;if(mouseDown&&!uiOpen)attack();kick*=Math.pow(.0005,dt);swing=Math.max(0,swing-dt*3);flashL.intensity*=Math.pow(.0001,dt);if(flashL.intensity<1)flashS.visible=false;
  if(reloadT>0){reloadT-=dt;if(reloadT<=0){const w=W[wi],n=Math.min(w.clip-w.mag,player.ammo);w.mag+=n;player.ammo-=n;sfx(1200,.05,.1,false)}}
  const g=vms[wi],sw=player.moving?Math.sin(player.bob)*.012:0,rl=reloadT>0?Math.sin(Math.PI*(1-reloadT/reloadDur)):0;
  g.position.set(.34+sw,-.3-Math.abs(sw)-rl*.15,-.45+kick*.08);g.rotation.set(kick*.25-rl*.6+(wi===0?swing*-1.4+Math.sin(swing*Math.PI)*.4:0),wi===0?swing*.6:0,wi===1&&rl?rl*.8:0);
  if(g.userData.drum&&rl)g.userData.drum.rotation.y+=dt*12;
  if(net){netT-=dt;if(netT<=0){netT=.05;send({t:'pos',s:[+pp.x.toFixed(2),+pp.y.toFixed(2),+pp.z.toFixed(2),+player.yaw.toFixed(2),player.moving?1:0,player.dead?1:0]});
   if(mode==='run'&&isAuth()&&(frames%2===0))send({t:'zombies',z:[...zombies.values()].map(z=>[z.id,+z.g.position.x.toFixed(2),+z.g.position.y.toFixed(2),+z.g.position.z.toFixed(2),+z.g.rotation.y.toFixed(2),Math.round(z.hp),z.dying?+z.dying.toFixed(2):0])})}}
  hud(night)}
 updateSprites(dt);updateBits(dt);
 if(mode==='menu'||mode==='results'){const t=now/1000*.05;camera.position.set(50+Math.cos(t)*22,6,LZ-8+Math.sin(t)*22);camera.lookAt(48,2.5,LZ-8);if(mode==='menu'){lobby.g.visible=true;trainG.visible=false;player.pos.set(50,0,LZ)}}
 updateTerrain(false);
 sun.position.copy(camera.position).addScaledVector(sdir,150);sun.target.position.copy(camera.position);sky.position.copy(camera.position);
 if(quality==='low')renderer.render(scene,camera);else composer.render()}
function hud(night){const w=W[wi],mh=stat.maxHp();$('hpt').textContent=`${Math.max(0,Math.ceil(player.hp))}/${mh}`;$('hpb').style.width=clamp(player.hp/mh*100,0,100)+'%';
 $('fut').textContent=`${train.fuel.toFixed(0)}%`;$('fub').style.width=train.fuel+'%';
 $('weap').innerHTML=`<b style="font-size:19px">${w.n}</b> ${w.clip?`${w.mag}/${w.clip} · reserve ${player.ammo}`:''}${reloadT>0?' (reloading)':''}`;
 $('inv').innerHTML=`Coal ${player.coal} · Bandages ${player.bandage} · Luck ${stat.luck()} · ${K().n}`;const hr=Math.floor((dayT*24+6)%24);
 const room=net?`<br><small>Party ${net.code}${net.isHost?' (you host)':''} · ${net.room==='LOBBY'?'lobby':'co-op run'} · ${net.players.length} player(s)${mode==='run'&&net.host===net.id?' · host':''}</small>`:'';
 if(mode==='run')$('top').innerHTML=`<b>${(train.dist/1000).toFixed(2)}</b> / 80 km · ${(train.speed*3.6).toFixed(0)} km/h · throttle ${(train.throttle*100|0)}% · $${save.money} · ${String(hr).padStart(2,'0')}:00 ${night?'☾':'☀'}${room}`;
 else $('top').innerHTML=`<b>SWEETWATER JUNCTION</b> · Bank $${save.money} · Trade: ${K().n}${room}`;
 let pr='';if(mode==='lobby'){const n=nearNpc();if(n)pr=n.kind==='classes'?'E: choose your trade':'E: trade (permanent upgrades)';
  const t=net?padSrv:{n:padLocal.on?1:0,t:padLocal.t};if(padLocal.on)pr+=`<br><b style="color:#fd6">Boarding — departing in ${Math.ceil(t.t)}s (${t.n}/8)</b><br><small>Step off to cancel</small>`}
 else{if(player.driving)pr='DRIVING — W/S throttle · Q feed coal · E leave controls';else if(inCab())pr='E: take the controls · Q: feed coal';else if(nearestCrate())pr='E: open';
  if(train.fuel<=0)pr+='<br><span style="color:#f88">Boiler cold! Find coal.</span>';if(train.speed<1&&!player.driving&&!player.dead)pr+='<br><small>Train stopped — B: trader</small>';if(player.dead)pr='<b style="color:#f66">YOU ARE DOWN</b>'}
 $('prompt').innerHTML=pr}
applyQuality();requestAnimationFrame(frame);
window.__game={player,train,save,get mode(){return mode},startRun,enterLobby,zombies,get net(){return net},get fps(){return fps},rollLoot,cars,toWorld,lobby,set padTime(v){window.__padTime=v}};
