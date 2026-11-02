// Procedural stylized models + textures (all original, generated in code)
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
export function rng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hash(x,y){let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)|0;h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296}
function vnoise(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
 const a=hash(xi,yi),b=hash(xi+1,yi),c=hash(xi,yi+1),d=hash(xi+1,yi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
export function fbm(x,y,o=4){let s=0,a=1,f=1,n=0;for(let i=0;i<o;i++){s+=a*vnoise(x*f+i*17,y*f-i*31);n+=a;a*=.5;f*=2.03}return s/n}
// ---- track & terrain ----
export const LZ=3000;// lobby location
const X0=28*Math.sin(0)+10*Math.sin(1);
export const trackX=z=>z>0?0:28*Math.sin(z/520)+10*Math.sin(z/190+1)-X0;
export const trackDX=z=>z>0?0:28/520*Math.cos(z/520)+10/190*Math.cos(z/190+1);
export function hgt(x,z){
 if(z>1500){const d=Math.hypot(x,(z-LZ)*.85),f=smooth(85,230,d);return f*(fbm(x/110,z/110)*34+smooth(.55,.7,fbm(x/260,z/260))*30-6)}
 const d=Math.abs(x-trackX(z)),f=smooth(42,95,d);
 return f*(fbm(x/90+50,z/90)*14-4+smooth(.6,.68,fbm(x/320,z/320+9,3))*34)}
export const trackDist=(x,z)=>z>1500?999:Math.abs(x-trackX(z));
// ---- textures ----
function canvasTex(w,h,draw,rep=[1,1]){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep[0],rep[1]);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t}
const R=Math.random;
export const TEX={
 planks:canvasTex(256,256,(x,w,h)=>{for(let i=0;i<8;i++){const y=i*32,v=185+R()*70|0;x.fillStyle=`rgb(${v},${v},${v})`;x.fillRect(0,y,w,32);
  x.strokeStyle='rgba(0,0,0,.13)';for(let k=0;k<7;k++){x.beginPath();x.moveTo(0,y+R()*32);x.bezierCurveTo(w*.3,y+R()*32,w*.6,y+R()*32,w,y+R()*32);x.stroke()}
  x.fillStyle='rgba(0,0,0,.55)';x.fillRect(0,y+30,w,2);const cx=R()*w;x.fillRect(cx,y,2,32);x.fillStyle='rgba(30,20,10,.6)';x.fillRect(cx-6,y+6,2,2);x.fillRect(cx+5,y+22,2,2)}},[1,1]),
 sand:canvasTex(512,512,(x,w,h)=>{x.fillStyle='#ddd';x.fillRect(0,0,w,h);for(let i=0;i<26000;i++){const v=150+R()*105|0;x.fillStyle=`rgba(${v},${v*.95|0},${v*.88|0},${.25+R()*.4})`;x.fillRect(R()*w,R()*h,1+R()*2,1+R()*2)}
  for(let i=0;i<60;i++){x.fillStyle='rgba(90,70,50,.25)';x.beginPath();x.arc(R()*w,R()*h,1+R()*3,0,7);x.fill()}},[140,140]),
 metal:canvasTex(128,128,(x,w,h)=>{x.fillStyle='#bbb';x.fillRect(0,0,w,h);for(let i=0;i<3000;i++){const v=120+R()*120|0;x.fillStyle=`rgba(${v},${v},${v},.35)`;x.fillRect(R()*w,R()*h,2,1)}
  for(let i=0;i<14;i++){x.fillStyle='rgba(120,60,30,.25)';x.beginPath();x.arc(R()*w,R()*h,3+R()*10,0,7);x.fill()}}),
 rock:canvasTex(256,256,(x,w,h)=>{x.fillStyle='#ccc';x.fillRect(0,0,w,h);for(let i=0;i<40;i++){const v=170+R()*80|0;x.fillStyle=`rgba(${v},${v},${v},.6)`;x.fillRect(0,R()*h,w,2+R()*8)}
  for(let i=0;i<5000;i++){const v=100+R()*155|0;x.fillStyle=`rgba(${v},${v},${v},.3)`;x.fillRect(R()*w,R()*h,2,2)}}),
 soft:canvasTex(64,64,(x,w,h)=>{const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.5,'rgba(255,255,255,.45)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64)}),
 flash:canvasTex(128,128,(x,w,h)=>{x.translate(64,64);for(let i=0;i<9;i++){x.rotate(Math.PI*2/9);const g=x.createLinearGradient(0,0,0,60);g.addColorStop(0,'rgba(255,240,180,1)');g.addColorStop(1,'rgba(255,120,20,0)');x.fillStyle=g;x.beginPath();x.moveTo(-7,0);x.lineTo(0,40+R()*24);x.lineTo(7,0);x.fill()}
  const g=x.createRadialGradient(0,0,0,0,0,30);g.addColorStop(0,'#fff');g.addColorStop(1,'rgba(255,180,60,0)');x.fillStyle=g;x.fillRect(-64,-64,128,128)}),
};
export function signTex(text,bg='#3a2414',fg='#f0d8a0',w=512,h=128){return canvasTex(w,h,(x)=>{x.fillStyle=bg;x.fillRect(0,0,w,h);x.strokeStyle=fg;x.lineWidth=6;x.strokeRect(8,8,w-16,h-16);
 x.fillStyle=fg;let fs=h*.5;x.font=`bold ${fs}px Georgia`;while(x.measureText(text).width>w-40&&fs>10){fs-=2;x.font=`bold ${fs}px Georgia`}x.textAlign='center';x.textBaseline='middle';x.fillText(text,w/2,h/2+3)})}
// ---- materials ----
const std=(o)=>new THREE.MeshStandardMaterial(o);
const tex=(t,r)=>{const c=t.clone();c.repeat.set(r[0],r[1]);c.needsUpdate=true;return c};
export const M={
 wood:std({map:TEX.planks,color:0x8a5a34,roughness:.9}),woodDark:std({map:TEX.planks,color:0x5a3a22,roughness:.95}),
 siding:[0xb08058,0x9a7a5a,0x7f5a3c,0xa8906a,0x8c4a32,0x6a7a6a,0xb8a48a].map(c=>std({map:tex(TEX.planks,[2,2]),color:c,roughness:.9})),
 trim:std({color:0xe8dcc0,roughness:.8}),
 iron:std({map:TEX.metal,color:0x2a2a2e,metalness:.75,roughness:.45}),steel:std({map:TEX.metal,color:0x9a9aa2,metalness:.9,roughness:.3}),
 paint:std({map:TEX.metal,color:0x1f4a36,metalness:.4,roughness:.45}),red:std({map:TEX.metal,color:0x8e2418,metalness:.35,roughness:.5}),
 brass:std({color:0xd4a648,metalness:.95,roughness:.25}),
 glass:std({color:0x223040,metalness:.2,roughness:.1}),glow:new THREE.MeshStandardMaterial({color:0xffe0a0,emissive:0xffc070,emissiveIntensity:3}),
 fire:new THREE.MeshStandardMaterial({color:0xff6010,emissive:0xff5000,emissiveIntensity:4}),
 cactus:std({color:0x5b8a45,roughness:.75}),rock:std({map:TEX.rock,color:0xb06a42,roughness:.95,flatShading:true}),
 coal:std({color:0x1a1a1a,roughness:.6,metalness:.2,flatShading:true}),
 crate:std({map:TEX.planks,color:0xc08a48,roughness:.85}),crateOpen:std({map:TEX.planks,color:0x4a3828,roughness:.95}),strong:std({map:TEX.metal,color:0x40506a,metalness:.7,roughness:.4}),
 cloth:std({color:0xd8ccb0,roughness:1,side:THREE.DoubleSide}),
 zskin:std({color:0x7d9466,roughness:.85}),eye:new THREE.MeshStandardMaterial({color:0xff2000,emissive:0xff2000,emissiveIntensity:5}),
 skin:std({color:0xd9a77a,roughness:.8}),leather:std({color:0x5a3a20,roughness:.8}),
};
// ---- geometry cache ----
const GC=new Map();
export const G=(k,f)=>{let g=GC.get(k);if(!g){g=f();GC.set(k,g)}return g};
export const B=(w,h,d)=>G(`b${w},${h},${d}`,()=>new THREE.BoxGeometry(w,h,d));
export const C=(a,b,h,s=16)=>G(`c${a},${b},${h},${s}`,()=>new THREE.CylinderGeometry(a,b,h,s));
export function mesh(geo,mat,x=0,y=0,z=0,par,rx=0,ry=0,rz=0,shadow=true){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.castShadow=m.receiveShadow=shadow;if(par)par.add(m);return m}
// ---- locomotive ----
export function makeLoco(){const g=new THREE.Group(),wheels=[],rods=[];
 mesh(B(2.5,.45,13.2),M.iron,0,1.05,-.6,g);
 mesh(C(1.05,1.05,7.4,28),M.paint,0,2.45,-2.25,g,Math.PI/2);
 for(const z of[-5.2,-3.4,-1.6,.2])mesh(C(1.09,1.09,.14,28),M.brass,0,2.45,z,g,Math.PI/2);
 mesh(C(1.12,1.12,1.3,28),M.iron,0,2.45,-6.5,g,Math.PI/2);mesh(C(.85,.85,.1,24),M.iron,0,2.45,-7.17,g,Math.PI/2);
 mesh(C(.12,.12,.12,8),M.brass,0,2.45,-7.24,g,Math.PI/2);
 const stack=new THREE.LatheGeometry([new THREE.Vector2(.34,0),new THREE.Vector2(.3,.7),new THREE.Vector2(.42,1.15),new THREE.Vector2(.72,1.65),new THREE.Vector2(.74,1.85),new THREE.Vector2(.62,1.85),new THREE.Vector2(.5,1.7)],20);
 mesh(stack,M.iron,0,3.35,-6.4,g);
 const dome=G('dome',()=>new THREE.SphereGeometry(.5,20,10,0,Math.PI*2,0,Math.PI/2));mesh(dome,M.brass,0,3.4,-3.6,g);mesh(dome,M.brass,0,3.4,-1.2,g);
 mesh(C(.18,.18,.5,12),M.brass,0,3.65,-3.6,g);mesh(C(.12,.22,.3,12),M.brass,0,3.7,-2.4,g);
 const lamp=new THREE.Group();lamp.position.set(0,3.35,-7.05);g.add(lamp);mesh(B(.7,.6,.6),M.iron,0,0,0,lamp);mesh(C(.24,.24,.06,16),M.glow,0,0,-.31,lamp,Math.PI/2,0,0,false);
 // cylinders + pilot
 for(const s of[-1,1]){mesh(C(.42,.42,1.3,16),M.iron,s*1.2,1.15,-5.3,g,Math.PI/2);mesh(B(.1,.6,1.2),M.brass,s*1.2,1.15,-5.3,g)}
 for(let i=-3;i<=3;i++){mesh(B(.1,.1,1.4),M.iron,i*.36,.6,-7.6+Math.abs(i)*.12,g,.75,i*.12)}mesh(B(2.4,.15,.3),M.iron,0,.95,-7.15,g);
 // wheels
 const wheel=(r,x,z,big)=>{const w=new THREE.Group();w.position.set(x,r+.02,z);g.add(w);mesh(C(r,r,.16,28),big?M.red:M.iron,0,0,0,w,0,0,Math.PI/2);
  mesh(C(r*.98,r*.98,.2,28),M.steel,x>0?-.02:.02,0,0,w,0,0,Math.PI/2);mesh(C(r*.86,r*.86,.22,28),big?M.red:M.iron,0,0,0,w,0,0,Math.PI/2);
  if(big)for(let i=0;i<10;i++)mesh(B(.05,r*1.7,.07),M.iron,x>0?.12:-.12,0,0,w,i*Math.PI/10);mesh(C(.13,.13,.3,10),M.brass,0,0,0,w,0,0,Math.PI/2);wheels.push({w,r});return w};
 for(const s of[-1,1]){for(const z of[-3.3,-1.4,.5])wheel(.82,s*1.18,z,true);wheel(.42,s*1.1,-5.6,false);wheel(.42,s*1.1,3.9,false);
  const rod=mesh(B(.08,.16,3.9),M.steel,s*1.36,.84,-1.4,g);rods.push(rod)}
 // cab
 mesh(B(3,.12,4.4),M.wood,0,1.33,3.4,g);
 for(const s of[-1,1]){mesh(B(.12,1.05,4.1),M.paint,s*1.45,1.92,3.6,g);mesh(B(.12,1.2,.5),M.paint,s*1.45,3.05,1.75,g);mesh(B(.12,1.2,.4),M.paint,s*1.45,3.05,5.45,g);mesh(B(.14,.14,4.1),M.brass,s*1.46,2.48,3.6,g)}
 mesh(B(3,2.4,.15),M.paint,0,2.6,1.55,g);mesh(B(.9,.7,.05),M.glass,-.85,3.1,1.47,g);mesh(B(.9,.7,.05),M.glass,.85,3.1,1.47,g);
 mesh(B(3.6,.14,5),M.iron,0,4.02,3.55,g);mesh(B(3.3,.1,4.8),M.woodDark,0,3.92,3.55,g);
 mesh(B(1.4,1.3,1),M.iron,0,2,2.05,g);const fire=mesh(B(.7,.5,.05),M.fire,0,1.9,2.56,g,0,0,0,false);
 const fl=new THREE.PointLight(0xff7020,4,6,1.6);fl.position.set(0,2,3);g.add(fl);
 const lever=new THREE.Group();lever.position.set(.85,1.75,2.7);g.add(lever);mesh(C(.04,.04,.9,8),M.brass,0,.45,0,lever);mesh(G('knob',()=>new THREE.SphereGeometry(.08,10,8)),M.wood,0,.9,0,lever);
 for(const d of[[-.6,3.2],[.4,3.25]])mesh(C(.16,.16,.06,16),M.brass,d[0],d[1],1.45,g,Math.PI/2);
 const head=new THREE.SpotLight(0xffe2a8,0,180,.42,.55,1.2);head.position.set(0,3.35,-7.2);head.target.position.set(0,0,-60);g.add(head,head.target);
 return{g,wheels,rods,lever,head,fire,fl,stackTop:new THREE.Vector3(0,5.2,-6.4)}}
export function makeTender(){const g=new THREE.Group();mesh(B(2.8,.4,6.6),M.iron,0,1.15,0,g);
 for(const s of[-1,1]){mesh(B(.12,1,6.6),M.paint,s*1.4,1.85,0,g);mesh(B(.14,.12,6.6),M.brass,s*1.41,2.35,0,g)}mesh(B(2.8,1,.12),M.paint,0,1.85,-3.3,g);mesh(B(2.8,1,.12),M.paint,0,1.85,3.3,g);
 const coal=G('coalpile',()=>{const q=new THREE.IcosahedronGeometry(1,1);const p=q.attributes.position;for(let i=0;i<p.count;i++){p.setXYZ(i,p.getX(i)*(1+R()*.3),p.getY(i)*.45*(1+R()*.3),p.getZ(i)*(1+R()*.3))}q.computeVertexNormals();return q});
 for(const z of[-2,0,2])mesh(coal,M.coal,0,1.85,z,g).scale.set(1.25,1,1.2);
 bogies(g,6.6);return g}
function bogies(g,len){for(const z of[-len/2+1.4,len/2-1.4]){mesh(B(2.2,.3,2),M.iron,0,.75,z,g);for(const dz of[-.6,.6])for(const s of[-1,1])mesh(C(.4,.4,.14,18),M.iron,s*1.05,.42,z+dz,g,0,0,Math.PI/2)}}
export function makeFlatcar(variant){const g=new THREE.Group(),L=12;mesh(B(3.2,.35,L),M.wood,0,1.22,0,g);mesh(B(2.6,.3,L),M.iron,0,.95,0,g);
 for(const s of[-1,1]){for(let i=0;i<7;i++)mesh(B(.12,1,.12),M.woodDark,s*1.52,1.9,-L/2+.3+i*(L-.6)/6,g);mesh(B(.08,.14,L),M.woodDark,s*1.52,2.3,0,g);mesh(B(.08,.14,L),M.woodDark,s*1.52,1.8,0,g)}
 if(variant===1){for(const s of[-1,1])for(const z of[-5.3,5.3])mesh(C(.06,.06,2.6,6),M.woodDark,s*1.3,2.7,z,g);const tarp=mesh(B(3,.06,11),M.cloth,0,4,0,g);tarp.rotation.z=.04}
 bogies(g,L);return g}
// ---- nature ----
export const GEO={
 saguaro:G('sag',()=>{const parts=[];const t=new THREE.CapsuleGeometry(.36,4,6,12);t.translate(0,2.3,0);parts.push(t);
  const a1=new THREE.CapsuleGeometry(.24,.7,4,10);a1.rotateZ(Math.PI/2);a1.translate(.6,2,0);parts.push(a1);const a2=new THREE.CapsuleGeometry(.24,1.3,4,10);a2.translate(.95,2.7,0);parts.push(a2);
  const b1=new THREE.CapsuleGeometry(.22,.5,4,10);b1.rotateZ(Math.PI/2);b1.translate(-.55,2.9,0);parts.push(b1);const b2=new THREE.CapsuleGeometry(.22,1,4,10);b2.translate(-.8,3.4,0);parts.push(b2);
  return mergeGeometries(parts.map(p=>p.toNonIndexed()))}),
 rock:[0,1,2].map(k=>G('rock'+k,()=>{const q=new THREE.IcosahedronGeometry(1,1);const p=q.attributes.position;const r=rng(k*99+5);for(let i=0;i<p.count;i++){const s=.75+r()*.5;p.setXYZ(i,p.getX(i)*s,p.getY(i)*s*.7,p.getZ(i)*s)}q.computeVertexNormals();return q.toNonIndexed()})),
 pole:G('pole',()=>{const a=new THREE.CylinderGeometry(.11,.14,7.5,8);a.translate(0,3.75,0);const b=new THREE.BoxGeometry(1.8,.12,.12);b.translate(0,7,0);return mergeGeometries([a.toNonIndexed(),b.toNonIndexed()])}),
 tie:B(2.7,.16,.32),rail:G('rail',()=>{const a=new THREE.BoxGeometry(.08,.16,2.02);a.translate(0,.3,0);const b=new THREE.BoxGeometry(.2,.04,2.02);b.translate(0,.22,0);return mergeGeometries([a,b])}),
 shrub:G('shrub',()=>{const q=new THREE.IcosahedronGeometry(.6,0);q.scale(1,.6,1);q.translate(0,.25,0);return q}),
};
export const shrubMat=std({color:0x7a7a48,roughness:1,flatShading:true});
// ---- buildings (front faces +x local; returns local colliders [x0,x1,y0,y1,z0,z1]) ----
const NAMES=['DUSTY SPUR SALOON','GENERAL STORE','ASSAY OFFICE','GRAND HOTEL','SHERIFF','FRONTIER BANK','UNDERTAKER','FEED & SEED','BARBER','TELEGRAPH','GUNSMITH','BATHHOUSE'];
export function makeBuilding(r,kind){const g=new THREE.Group(),cols=[],W=8,D=9,H=3.8,mat=M.siding[Math.floor(r()*M.siding.length)];
 const solid=(w,h,d,m,x,y,z)=>{mesh(B(w,h,d),m,x,y,z,g);cols.push([x-w/2,x+w/2,y-h/2,y+h/2,z-d/2,z+d/2])};
 const name=kind||NAMES[Math.floor(r()*NAMES.length)];
 solid(D+2.2,.3,W+.4,M.wood,1.1,.15,0);
 solid(.2,H,W,mat,-D/2,.3+H/2,0);solid(D,H,.2,mat,0,.3+H/2,-W/2);solid(D,H,.2,mat,0,.3+H/2,W/2);
 solid(.2,H,3.2,mat,D/2,.3+H/2,-2.4);solid(.2,H,3.2,mat,D/2,.3+H/2,2.4);mesh(B(.2,1.2,1.6),mat,D/2,.3+H-.6,0,g);
 for(const z of[-2.4,2.4]){mesh(B(.1,1.2,1.4),M.glass,D/2+.08,2.1,z,g);mesh(B(.14,.12,1.6),M.trim,D/2+.1,2.75,z,g);mesh(B(.14,.12,1.6),M.trim,D/2+.1,1.45,z,g);mesh(B(.14,1.3,.1),M.trim,D/2+.1,2.1,z-.75,g);mesh(B(.14,1.3,.1),M.trim,D/2+.1,2.1,z+.75,g)}
 const fh=1.6+r()*1.4;mesh(B(.25,fh,W+.4),mat,D/2+.05,.3+H+fh/2,0,g);mesh(B(.4,.15,W+.7),M.trim,D/2+.05,.3+H+fh,0,g);
 const sign=new THREE.Mesh(B(.06,1,5.4),new THREE.MeshStandardMaterial({map:signTex(name),roughness:.8}));sign.position.set(D/2+.22,.3+H+fh*.45,0);sign.material.map.rotation=0;g.add(sign);
 sign.geometry=G('signbox',()=>{const q=new THREE.PlaneGeometry(5.4,1);q.rotateY(Math.PI/2);return q});
 mesh(B(D+.6,.22,W+.6),M.woodDark,0,.3+H+.1,0,g);
 const pr=mesh(B(2.4,.12,W+.4),M.woodDark,D/2+1.25,3.25,0,g,0,0,-.12);for(const z of[-3.9,-1.3,1.3,3.9]){mesh(B(.16,2.9,.16),M.wood,D/2+2.1,1.75,z,g);cols.push([D/2+2,D/2+2.2,0,3,z-.1,z+.1])}
 mesh(B(.6,.25,1.6),M.wood,D/2+1.6,.12,0,g);
 // interior
 if(/SALOON|HOTEL/.test(name)){solid(1,1.1,4.5,M.woodDark,-2.2,.85,0);mesh(B(1.2,.08,4.7),M.brass,-2.2,1.44,0,g);for(const z of[-3,3]){mesh(C(.7,.7,.08,16),M.wood,1.5,1.2,z,g);mesh(C(.08,.08,.9,8),M.woodDark,1.5,.75,z,g)}
  for(const s of[-1,1]){const d=mesh(B(.06,1,.75),M.wood,D/2,1.5,s*.4,g);}mesh(B(.1,.9,2.8),M.glass,-D/2+.15,2.6,0,g)}
 else if(/BANK|ASSAY/.test(name)){solid(.8,1.4,5,M.woodDark,-1,1,0);for(let i=0;i<4;i++)mesh(C(.05,.05,1,6),M.brass,-1,2.2,-2+i*1.3,g)}
 else{for(const z of[-3.2,3.2])solid(.6,2.2,1.4,M.woodDark,-D/2+.5,1.4,z);mesh(B(.62,.06,1.44),M.wood,-D/2+.5,1.4,-3.2,g);mesh(C(.5,.5,.9,12),M.wood,1,.75,-2.5,g)}
 const lant=mesh(B(.18,.28,.18),M.glow,D/2+1.9,2.7,-2.6,g,0,0,0,false);
 return{g,cols,name,lootSpots:[[-1.5,-2.6],[1.8,2.6],[0,-2.8],[-3,1.6]],strong:/BANK|ASSAY/.test(name)}}
export function makeWaterTower(){const g=new THREE.Group(),cols=[];for(const[x,z]of[[-1.4,-1.4],[1.4,-1.4],[-1.4,1.4],[1.4,1.4]]){mesh(C(.15,.2,6.2,8),M.woodDark,x,3.1,z,g);cols.push([x-.2,x+.2,0,6,z-.2,z+.2])}
 for(const y of[2,4.2]){mesh(B(3,.12,.12),M.woodDark,0,y,-1.4,g);mesh(B(3,.12,.12),M.woodDark,0,y,1.4,g);mesh(B(.12,.12,3),M.woodDark,-1.4,y,0,g);mesh(B(.12,.12,3),M.woodDark,1.4,y,0,g)}
 mesh(C(2.3,2.3,3.2,24),M.wood,0,7.8,0,g);for(const y of[6.6,7.8,9])mesh(C(2.33,2.33,.1,24),M.iron,0,y,0,g);mesh(C(.2,2.6,1.4,24),M.woodDark,0,10.1,0,g);
 const sp=mesh(C(.18,.18,2.4,8),M.iron,1.8,6.2,0,g,0,0,.9);return{g,cols}}
export function makeWindmill(){const g=new THREE.Group(),cols=[];const h=10;
 for(const[x,z]of[[-1.3,-1.3],[1.3,-1.3],[-1.3,1.3],[1.3,1.3]]){const l=mesh(C(.06,.08,h+.2,6),M.steel,x*.55,h/2,z*.55,g);l.rotation.set(z*-.065,0,x*.065);cols.push([x-.2,x+.2,0,3,z-.2,z+.2])}
 for(let y=1;y<h;y+=2.2){mesh(B(1.8*(1-y/h*.45)*1.6,.05,.05),M.steel,0,y,1.3*(1-y/h*.45),g);mesh(B(1.8*(1-y/h*.45)*1.6,.05,.05),M.steel,0,y,-1.3*(1-y/h*.45),g)}
 const head=new THREE.Group();head.position.set(0,h+.3,0);g.add(head);const rotor=new THREE.Group();rotor.position.z=-.5;head.add(rotor);
 mesh(C(.2,.2,.5,10),M.iron,0,0,0,rotor,Math.PI/2);for(let i=0;i<14;i++){const b=mesh(B(.32,1.7,.03),M.steel,0,0,0,rotor,0,.3,0);b.geometry=B(.32,1.7,.03);const a=i/14*Math.PI*2;b.position.set(Math.sin(a)*1.1,Math.cos(a)*1.1,0);b.rotation.set(0,.35,-a)}
 mesh(B(.08,.08,2.4),M.iron,0,0,1.2,head);mesh(B(.04,1.2,1.4),M.steel,0,.2,2.3,head);return{g,cols,rotor}}
// ---- characters ----
export function makeZombie(r){const g=new THREE.Group();const shirt=std({color:new THREE.Color().setHSL(r(),.25+r()*.2,.18+r()*.2),roughness:1}),pants=std({color:new THREE.Color().setHSL(.08+r()*.1,.3,.12+r()*.1),roughness:1});
 const skin=r()<.5?M.zskin:std({color:new THREE.Color().setHSL(.2+r()*.1,.2,.38+r()*.1),roughness:.85});
 const cap=(rad,len)=>G(`cap${rad},${len}`,()=>new THREE.CapsuleGeometry(rad,len,4,10));
 const torso=mesh(cap(.27,.5),shirt,0,1.3,0,g);torso.scale.set(1,1,.7);torso.rotation.x=.25;
 const head=new THREE.Group();head.position.set(0,1.85,-.12);g.add(head);const hm=mesh(G('zhead',()=>new THREE.SphereGeometry(.22,14,12)),skin,0,0,0,head);hm.scale.set(.9,1.1,1);hm.userData.head=true;
 mesh(B(.2,.08,.12),skin,0,-.17,-.1,head,.4);for(const s of[-1,1]){const e=mesh(G('zeye',()=>new THREE.SphereGeometry(.035,6,6)),M.eye,s*.08,.04,-.19,head,0,0,0,false);e.userData.head=true}
 if(r()<.4){mesh(C(.26,.3,.14,14),M.leather,0,.18,0,head);mesh(C(.42,.42,.03,18),M.leather,0,.12,0,head)}
 const limb=(x,y,rad,len,mat)=>{const p=new THREE.Group();p.position.set(x,y,0);g.add(p);mesh(cap(rad,len),mat,0,-len/2-rad,0,p);return p};
 const la=limb(-.36,1.6,.08,.55,shirt),ra=limb(.36,1.6,.08,.55,shirt);la.rotation.x=ra.rotation.x=-1.3;
 for(const a of[la,ra])mesh(G('zhand',()=>new THREE.SphereGeometry(.08,8,6)),skin,0,-.78,0,a);
 const ll=limb(-.15,.9,.11,.55,pants),rl=limb(.15,.9,.11,.55,pants);
 g.traverse(o=>{if(o.isMesh)o.castShadow=true});return{g,la,ra,ll,rl,head}}
export function makeHuman(color,name){const g=new THREE.Group();const shirt=std({color,roughness:.9});
 const cap=(rad,len)=>G(`cap${rad},${len}`,()=>new THREE.CapsuleGeometry(rad,len,4,10));
 const t=mesh(cap(.28,.5),shirt,0,1.3,0,g);t.scale.set(1,1,.7);mesh(B(.62,.1,.4),M.leather,0,1.0,0,g);
 mesh(G('hhead',()=>new THREE.SphereGeometry(.21,14,12)),M.skin,0,1.88,0,g);
 mesh(C(.2,.24,.24,16),M.leather,0,2.12,0,g);mesh(C(.42,.42,.04,20),M.leather,0,2.02,0,g);
 mesh(B(.3,.3,.02),std({color:0x8a2a1a}),0,1.62,-.2,g);
 const limb=(x,y,rad,len,mat)=>{const p=new THREE.Group();p.position.set(x,y,0);g.add(p);mesh(cap(rad,len),mat,0,-len/2-rad,0,p);return p};
 const la=limb(-.37,1.62,.08,.5,shirt),ra=limb(.37,1.62,.08,.5,shirt),ll=limb(-.15,.92,.11,.55,std({color:0x3a3040})),rl=limb(.15,.92,.11,.55,std({color:0x3a3040}));
 if(name){const c=document.createElement('canvas');c.width=256;c.height=64;const x=c.getContext('2d');x.fillStyle='#0009';x.beginPath();x.roundRect(4,8,248,48,10);x.fill();x.font='bold 30px Georgia';x.fillStyle='#ffd890';x.textAlign='center';x.fillText(name,128,43);
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:false,transparent:true}));s.scale.set(2,.5,1);s.position.y=2.7;s.renderOrder=9;g.add(s)}
 return{g,la,ra,ll,rl}}
