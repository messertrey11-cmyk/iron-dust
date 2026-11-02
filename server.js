// Iron Dust co-op server: static files + WebSocket lobby/run rooms
const express=require('express'),http=require('http'),{WebSocketServer}=require('ws');
const app=express();app.use(express.static(__dirname,{index:'index.html'}));
const srv=http.createServer(app),wss=new WebSocketServer({server:srv});
const rooms=new Map();let nid=1;const PAD_TIME=15,PAD_MAX=8;
function room(code){let r=rooms.get(code);if(!r){r={code,lobby:code==='LOBBY',seed:(Math.random()*1e9)|0,players:new Map(),host:null,opened:new Set(),
 pad:new Set(),padT:PAD_TIME,train:{dist:0,speed:0,throttle:0,fuel:60,maxSpeed:25,eff:1}};rooms.set(code,r);}return r;}
const J=JSON.stringify;
function bc(r,m,ex){const s=J(m);for(const p of r.players.values())if(p.ws!==ex&&p.ws.readyState===1)p.ws.send(s);}
const plist=r=>[...r.players.values()].map(p=>({id:p.id,name:p.name,cls:p.cls}));
function leave(r,me){if(!r)return;r.players.delete(me.id);r.pad.delete(me.id);
 if(!r.players.size&&!r.lobby){rooms.delete(r.code);return;}
 if(r.host===me.id)r.host=r.players.size?r.players.keys().next().value:null;
 bc(r,{t:'players',players:plist(r),host:r.host});bc(r,{t:'chat',name:'*',msg:me.name+' left'});}
wss.on('connection',ws=>{const me={id:nid++,name:'Drifter',cls:'drifter',ws,s:null};let r=null;
 ws.on('message',d=>{let m;try{m=JSON.parse(d)}catch{return}
  if(m.t==='join'){if(r){leave(r,me);r=null}
   const code=String(m.room||'LOBBY').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8)||'LOBBY';
   const rr=room(code);if(!rr.lobby&&rr.players.size>=PAD_MAX){ws.send(J({t:'err',msg:'Room full'}));return;}
   r=rr;me.name=String(m.name||'Drifter').slice(0,16);me.cls=String(m.cls||'drifter').slice(0,12);me.s=null;r.players.set(me.id,me);if(!r.host)r.host=me.id;
   ws.send(J({t:'welcome',id:me.id,room:code,seed:r.seed,host:r.host,opened:[...r.opened],train:r.train,players:plist(r)}));
   bc(r,{t:'players',players:plist(r),host:r.host});bc(r,{t:'chat',name:'*',msg:me.name+' joined'});return;}
  if(!r)return;const T=r.train;
  switch(m.t){
   case 'leave':leave(r,me);r=null;break;
   case 'pos':me.s=m.s;break;
   case 'pad':if(r.lobby){if(m.on&&r.pad.size<PAD_MAX)r.pad.add(me.id);else if(!m.on)r.pad.delete(me.id)}break;
   case 'throttle':T.throttle=Math.max(0,Math.min(1,+m.v||0));break;
   case 'fuel':T.fuel=Math.min(100,T.fuel+Math.max(0,+m.n||0));break;
   case 'trainup':if(me.id===r.host){T.maxSpeed=+m.maxSpeed||25;T.eff=+m.eff||1;}break;
   case 'crate':if(!r.opened.has(m.id)){r.opened.add(m.id);ws.send(J({t:'crateok',id:m.id}));bc(r,{t:'crategone',id:m.id});}break;
   case 'zombies':if(me.id===r.host)bc(r,{t:'zombies',z:m.z},ws);break;
   case 'zhit':{const h=r.players.get(r.host);if(h&&h.ws.readyState===1)h.ws.send(J({t:'zhit',id:m.id,dmg:m.dmg}));break;}
   case 'shot':bc(r,{t:'shot',id:me.id},ws);break;
   case 'chat':bc(r,{t:'chat',name:me.name,msg:String(m.msg).slice(0,140)});break;
  }});
 ws.on('close',()=>{leave(r,me);r=null});
});
setInterval(()=>{const dt=0.05;for(const r of rooms.values()){const ps={};for(const p of r.players.values())if(p.s)ps[p.id]=p.s;
 if(r.lobby){for(const id of r.pad)if(!r.players.has(id))r.pad.delete(id);
  if(r.pad.size){r.padT-=dt;if(r.padT<=0||r.pad.size>=PAD_MAX&&r.padT>3)r.padT=Math.min(r.padT,3);
   if(r.padT<=0){const code='R'+Math.random().toString(36).slice(2,7).toUpperCase();
    for(const id of r.pad){const p=r.players.get(id);p&&p.ws.readyState===1&&p.ws.send(J({t:'startrun',room:code}))}r.pad.clear();r.padT=PAD_TIME}}
  else r.padT=PAD_TIME;
  bc(r,{t:'state',ps,pad:{n:r.pad.size,t:r.padT,ids:[...r.pad]}});continue}
 const T=r.train,tgt=T.fuel>0?T.throttle*T.maxSpeed:0;T.speed+=Math.sign(tgt-T.speed)*Math.min(Math.abs(tgt-T.speed),(tgt>T.speed?2:3)*dt);
 T.fuel=Math.max(0,T.fuel-(T.speed*0.004*T.eff+(T.throttle>0?0.01:0))*dt);T.dist+=T.speed*dt;
 bc(r,{t:'state',train:T,ps});}},50);
room('LOBBY');
const PORT=process.env.PORT||8080;srv.listen(PORT,()=>console.log('Iron Dust server on http://localhost:'+PORT));
