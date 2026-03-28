// ================================================================
//  BuddyLocation — app.js   (ES Module)
//  Demo Mode : BroadcastChannel (same browser, multiple tabs)
//  Live Mode : Firebase Realtime Database (cross-device)
// ================================================================
'use strict';

// ── Constants ────────────────────────────────────────────────────
const AVATARS = ['🦊','🐼','🦁','🐸','🐧','🦄','🐙','🦋','🐯','🦅','🐺','🦈'];
const COLORS  = [
  '#FF6B6B','#4ECDC4','#FFE66D','#A8FF78','#7FDBDA','#c9b1ff',
  '#FF9A9E','#56CCF2','#F7971E','#43B89C','#6C63FF','#00D2FF'
];
const MAP_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const CHANNEL  = 'buddylocation-v1';

// ── State ────────────────────────────────────────────────────────
const S = {
  user:         null,   // { id, name, avatar, color, lat, lng, ts }
  friends:      {},     // { [id]: UserObj }
  selectedId:   null,
  markers:      {},     // { [id]: L.Marker }
  myMarker:     null,
  distLine:     null,
  map:          null,
  bc:           null,   // BroadcastChannel
  watchId:      null,
  sidebarOpen:  true,
  fbDb:         null,
  fbRef:        null,
  mode:         'demo',
};

// ── Utils ────────────────────────────────────────────────────────
const uid  = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const $ = id => document.getElementById(id);

function haversineKm(la1, lo1, la2, lo2) {
  const R = 6371, dLa = (la2-la1)*Math.PI/180, dLo = (lo2-lo1)*Math.PI/180;
  const a = Math.sin(dLa/2)**2 + Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLo/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function fmtDist(km) {
  if (km < 1) return { main: `${Math.round(km*1000)} m`,   sub: `${(km*0.621371*1000).toFixed(0)} ft away` };
  return        { main: `${km.toFixed(1)} km`,             sub: `${(km*0.621371).toFixed(1)} mi away` };
}

function relTime(ts) {
  const s = (Date.now()-ts)/1000;
  if (s < 10)   return 'just now';
  if (s < 60)   return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  return `${Math.floor(s/3600)}h ago`;
}

function toast(msg, type='info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  $('toast-container').appendChild(el);
  requestAnimationFrame(() => { requestAnimationFrame(() => el.classList.add('show')); });
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 3800);
}

// ── Particles ────────────────────────────────────────────────────
class Particles {
  constructor(canvas) {
    this.cv = canvas;
    this.cx = canvas.getContext('2d');
    this.ps = [];
    this.mx = -999; this.my = -999;
    this._active = false;
    this.resize(); this.spawn(); this.bind();
  }
  resize() {
    this.cv.width  = window.innerWidth;
    this.cv.height = window.innerHeight;
  }
  spawn() {
    const clrs = ['#6c63ff','#00d2ff','#ff6b6b','#c9b1ff','#56ccf2'];
    const n    = Math.min(90, Math.floor(window.innerWidth / 13));
    for (let i = 0; i < n; i++) {
      this.ps.push({
        x:   Math.random() * this.cv.width,
        y:   Math.random() * this.cv.height,
        r:   Math.random() * 2.2 + 0.4,
        c:   clrs[Math.floor(Math.random()*clrs.length)],
        a:   Math.random() * 0.55 + 0.05,
        vx:  (Math.random()-0.5) * 0.38,
        vy:  -(Math.random() * 0.45 + 0.18),
        l:   0,
        ml:  Math.random() * 220 + 80,
      });
    }
  }
  make() {
    const clrs = ['#6c63ff','#00d2ff','#ff6b6b','#c9b1ff','#56ccf2'];
    return { x:Math.random()*this.cv.width, y:this.cv.height+5,
      r:Math.random()*2.2+0.4, c:clrs[Math.floor(Math.random()*clrs.length)],
      a:0, vx:(Math.random()-0.5)*0.38, vy:-(Math.random()*0.45+0.18),
      l:0, ml:Math.random()*220+80 };
  }
  bind() {
    window.addEventListener('resize', () => { this.resize(); });
    document.addEventListener('mousemove', e => { this.mx=e.clientX; this.my=e.clientY; });
  }
  tick() {
    if (!this._active) return;
    this.cx.clearRect(0,0,this.cv.width,this.cv.height);
    this.ps.forEach((p,i) => {
      p.l++; p.x+=p.vx; p.y+=p.vy;
      // mouse repulsion
      const dx=p.x-this.mx, dy=p.y-this.my, d=Math.sqrt(dx*dx+dy*dy);
      if (d<90) { p.x+=(dx/d)*0.9; p.y+=(dy/d)*0.9; }
      // fade
      if      (p.l<25)          p.a=Math.min((p.l/25)*0.6, 0.6);
      else if (p.l>p.ml-25)     p.a=Math.max(((p.ml-p.l)/25)*0.4, 0);
      if (p.l>=p.ml || p.y<-8)  this.ps[i]=this.make();
      // draw
      const hex = Math.floor(p.a*255).toString(16).padStart(2,'0');
      this.cx.beginPath();
      this.cx.arc(p.x,p.y,p.r,0,Math.PI*2);
      this.cx.fillStyle=p.c+hex;
      this.cx.fill();
    });
    requestAnimationFrame(()=>this.tick());
  }
  start() { this._active=true; this.tick(); }
  stop()  { this._active=false; }
}

// ── Join Screen ──────────────────────────────────────────────────
function initJoin() {
  const grid     = $('avatar-grid');
  const nameInp  = $('name-input');
  const joinBtn  = $('join-btn');
  let selIdx     = -1;

  // Build avatar buttons
  AVATARS.forEach((emoji, i) => {
    const btn = document.createElement('button');
    btn.className      = 'avatar-btn';
    btn.dataset.index  = i;
    btn.title          = emoji;
    btn.setAttribute('role','option');
    btn.setAttribute('aria-selected','false');
    btn.setAttribute('aria-label', `Avatar ${emoji}`);
    btn.style.setProperty('--color', COLORS[i]);
    btn.style.animationDelay = `${i*0.06}s`;
    btn.innerHTML = emoji;
    btn.addEventListener('click', () => {
      grid.querySelectorAll('.avatar-btn').forEach(b => {
        b.classList.remove('selected');
        b.setAttribute('aria-selected','false');
      });
      btn.classList.add('selected');
      btn.setAttribute('aria-selected','true');
      selIdx = i;
      validate();
    });
    grid.appendChild(btn);
  });

  function validate() {
    const ok = nameInp.value.trim().length >= 2 && selIdx >= 0;
    joinBtn.disabled = !ok;
  }
  nameInp.addEventListener('input', validate);

  joinBtn.addEventListener('click', async () => {
    if (joinBtn.disabled) return;
    joinBtn.disabled = true;
    joinBtn.classList.add('loading');
    try {
      const pos = await getPos();
      await doJoin({
        id:     uid(),
        name:   nameInp.value.trim(),
        avatar: AVATARS[selIdx],
        color:  COLORS[selIdx],
        lat:    pos.coords.latitude,
        lng:    pos.coords.longitude,
        ts:     Date.now(),
      });
    } catch (e) {
      joinBtn.disabled = false;
      joinBtn.classList.remove('loading');
      toast('📍 Please allow location access and try again.', 'error');
    }
  });
}

function getPos() {
  return new Promise((res,rej) => {
    if (!navigator.geolocation) { rej(new Error('No geolocation')); return; }
    navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy:true, timeout:15000 });
  });
}

// ── Map ──────────────────────────────────────────────────────────
function buildMap(lat, lng) {
  const map = L.map('map', { center:[lat,lng], zoom:15, zoomControl:false, attributionControl:false });
  L.tileLayer(MAP_TILES, { subdomains:'abcd', maxZoom:20,
    attribution:'&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://osm.org/copyright">OSM</a>'
  }).addTo(map);
  L.control.zoom({ position:'bottomright' }).addTo(map);
  L.control.attribution({ position:'bottomright', prefix:false }).addTo(map);
  S.map = map;
}

// ── Markers ──────────────────────────────────────────────────────
function markerIcon(u, isMe=false) {
  const pulse = isMe ? '<div class="marker-pulse"></div>' : '';
  return L.divIcon({
    className:'custom-marker-wrapper',
    html:`<div class="custom-marker ${isMe?'my-marker':''}" style="--color:${u.color}">
            ${pulse}
            <div class="marker-bubble">${u.avatar}</div>
            <div class="marker-name">${u.name}</div>
          </div>`,
    iconSize:[80,74], iconAnchor:[40,60],
  });
}

function putMarker(u, isMe=false) {
  if (isMe) {
    if (S.myMarker) { S.myMarker.setLatLng([u.lat,u.lng]); S.myMarker.setIcon(markerIcon(u,true)); }
    else { S.myMarker = L.marker([u.lat,u.lng],{icon:markerIcon(u,true),zIndexOffset:1000}).addTo(S.map); }
  } else {
    if (S.markers[u.id]) {
      S.markers[u.id].setLatLng([u.lat,u.lng]);
      S.markers[u.id].setIcon(markerIcon(u));
    } else {
      const m = L.marker([u.lat,u.lng],{icon:markerIcon(u)}).addTo(S.map);
      m.on('click', ()=>pickFriend(u.id));
      S.markers[u.id] = m;
    }
  }
}

function dropMarker(id) {
  if (S.markers[id]) { S.map.removeLayer(S.markers[id]); delete S.markers[id]; }
}

// ── Sidebar ──────────────────────────────────────────────────────
function refreshSidebar() {
  const list = $('friends-list');
  const ids  = Object.keys(S.friends);
  $('friend-count').textContent = ids.length;

  if (ids.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div>
      <p class="empty-title">No friends online</p>
      <p class="empty-hint">Open this app in another tab!</p></div>`;
    return;
  }

  // Collect existing card IDs
  const existing = new Set([...list.querySelectorAll('.friend-card')].map(c=>c.dataset.id));

  ids.forEach(id => {
    const f  = S.friends[id];
    const el = list.querySelector(`.friend-card[data-id="${id}"]`);
    const km = S.user ? haversineKm(S.user.lat,S.user.lng,f.lat,f.lng) : null;
    const dist = km != null ? fmtDist(km) : null;

    if (el) {
      // update time + dist
      const t = el.querySelector('.friend-time');
      if (t) t.textContent = relTime(f.ts);
      const d = el.querySelector('.friend-dist-badge');
      if (d && dist) d.textContent = dist.main;
      existing.delete(id);
    } else {
      const card = makeFriendCard(f, dist);
      list.appendChild(card);
      requestAnimationFrame(()=>{ requestAnimationFrame(()=>card.classList.add('card-visible')); });
    }
  });

  // Remove stale
  existing.forEach(id => {
    const card = list.querySelector(`.friend-card[data-id="${id}"]`);
    if (card) { card.classList.add('leaving'); setTimeout(()=>card.remove(),360); }
  });
}

function makeFriendCard(f, dist) {
  const card = document.createElement('div');
  card.className    = `friend-card${S.selectedId===f.id?' selected':''}`;
  card.dataset.id   = f.id;
  card.setAttribute('role','listitem');
  card.innerHTML = `
    <div class="friend-avatar-wrap" style="--color:${f.color}">
      <span>${f.avatar}</span>
      <span class="friend-online-dot" aria-hidden="true"></span>
    </div>
    <div class="friend-info">
      <span class="friend-name">${f.name}</span>
      <span class="friend-time">${relTime(f.ts)}</span>
    </div>
    <div class="friend-meta">
      ${dist ? `<span class="friend-dist-badge">${dist.main}</span>` : ''}
      <span class="friend-arrow" aria-hidden="true">›</span>
    </div>`;
  card.addEventListener('click', ()=>pickFriend(f.id));
  return card;
}

// ── Distance ─────────────────────────────────────────────────────
function pickFriend(id) {
  S.selectedId = id;
  document.querySelectorAll('.friend-card').forEach(c=>c.classList.toggle('selected', c.dataset.id===id));

  const f = S.friends[id];
  if (!f) return;
  S.map.flyTo([f.lat,f.lng], 14, { duration:1.5, easeLinearity:0.25 });
  if (S.user) showDist(S.user, f);
}

function showDist(me, f) {
  const km   = haversineKm(me.lat,me.lng,f.lat,f.lng);
  const dist = fmtDist(km);

  // Line on map
  if (S.distLine) S.map.removeLayer(S.distLine);
  S.distLine = L.polyline([[me.lat,me.lng],[f.lat,f.lng]], {
    color:'#6c63ff', weight:2.5, opacity:0.9, dashArray:'10 14', className:'distance-line'
  }).addTo(S.map);

  // Panel
  $('dist-avatars').innerHTML = `
    <span class="dist-avatar">${me.avatar}</span>
    <div class="dist-connector"></div>
    <span class="dist-avatar">${f.avatar}</span>`;

  const valEl = $('dist-value');
  valEl.textContent = dist.main;
  valEl.classList.remove('pop');
  void valEl.offsetWidth; // reflow
  valEl.classList.add('pop');
  setTimeout(()=>valEl.classList.remove('pop'), 400);

  $('dist-sub').innerHTML = `<span>${dist.sub}</span><span class="dist-names">${me.name} → ${f.name}</span>`;
  const panel = $('distance-panel');
  panel.classList.add('visible');
  panel.setAttribute('aria-hidden','false');
}

function hideDist() {
  S.selectedId = null;
  document.querySelectorAll('.friend-card').forEach(c=>c.classList.remove('selected'));
  const panel = $('distance-panel');
  panel.classList.remove('visible');
  panel.setAttribute('aria-hidden','true');
  if (S.distLine) { S.map.removeLayer(S.distLine); S.distLine = null; }
}

// ── BroadcastChannel Sync ────────────────────────────────────────
function initSync() {
  const bc = new BroadcastChannel(CHANNEL);
  S.bc = bc;

  bc.addEventListener('message', ({data:msg}) => {
    switch (msg.type) {
      case 'USER_INFO':
      case 'UPDATE':    onFriendIn(msg.user);           break;
      case 'LEAVE':     onFriendOut(msg.userId);         break;
      case 'REQUEST':   bc.postMessage({type:'USER_INFO',user:S.user}); break;
    }
  });

  // Announce + request peers
  bc.postMessage({type:'REQUEST'});
  bc.postMessage({type:'USER_INFO', user:S.user});

  window.addEventListener('beforeunload', ()=>{
    bc.postMessage({type:'LEAVE', userId:S.user.id});
    bc.close();
  });
}

function broadcast() {
  if (S.bc)    S.bc.postMessage({type:'UPDATE', user:S.user});
  if (S.fbRef) fbPush();
}

function onFriendIn(u) {
  if (!S.user || u.id===S.user.id) return;
  const isNew = !S.friends[u.id];
  S.friends[u.id] = u;
  putMarker(u, false);
  refreshSidebar();
  if (S.selectedId===u.id && S.user) showDist(S.user, u);
  if (isNew) toast(`${u.avatar} ${u.name} joined!`, 'info');
}

function onFriendOut(id) {
  const f = S.friends[id];
  if (f) toast(`${f.avatar} ${f.name} left 👋`, 'info');
  delete S.friends[id];
  dropMarker(id);
  if (S.selectedId===id) hideDist();
  refreshSidebar();
}

// ── Firebase (optional) ──────────────────────────────────────────
async function initFirebase(cfg) {
  try {
    const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const { getDatabase, ref, set, onValue, onDisconnect } =
      await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js');

    // Prevent duplicate apps
    const app = getApps().find(a=>a.name==='buddy') || initializeApp(cfg,'buddy');
    const db  = getDatabase(app);
    const uRef = ref(db, `users/${S.user.id}`);

    await set(uRef, S.user);
    onDisconnect(uRef).remove();
    S.fbRef = uRef;
    S.fbDb  = db;

    onValue(ref(db,'users'), snap => {
      const data = snap.val() || {};
      // Remove users who left
      Object.keys(S.friends).forEach(id=>{ if (!data[id]) onFriendOut(id); });
      // Add/update
      Object.entries(data).forEach(([id,u])=>{ if (id!==S.user.id) onFriendIn(u); });
    });

    S.mode = 'firebase';
    setModeUI();
    toast('🔥 Firebase connected — cross-device mode on!', 'success');
  } catch (e) {
    toast('Firebase error: ' + e.message, 'error');
  }
}

async function fbPush() {
  if (!S.fbDb || !S.user) return;
  const { ref, set } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js');
  set(ref(S.fbDb, `users/${S.user.id}`), S.user).catch(()=>{});
}

function setModeUI() {
  const dot  = document.querySelector('.mode-dot');
  const text = $('mode-text');
  if (!dot || !text) return;
  dot.className  = `mode-dot ${S.mode}`;
  text.textContent = S.mode==='firebase' ? 'Live Mode (cross-device 🔥)' : 'Demo Mode (same browser)';
}

// ── Controls ─────────────────────────────────────────────────────
function setupControls() {
  // Center button
  $('center-btn').addEventListener('click', ()=>{
    if (S.user && S.map) S.map.flyTo([S.user.lat,S.user.lng], 15, {duration:1.2});
  });

  // Sidebar toggle
  $('sidebar-toggle-btn').addEventListener('click', ()=>{
    S.sidebarOpen = !S.sidebarOpen;
    $('sidebar').classList.toggle('collapsed', !S.sidebarOpen);
  });

  // Close distance
  $('close-dist-btn').addEventListener('click', hideDist);

  // Settings open/close
  $('settings-btn').addEventListener('click', ()=>{
    $('settings-overlay').classList.add('open');
    $('settings-overlay').setAttribute('aria-hidden','false');
    setModeUI();
  });
  $('close-settings-btn').addEventListener('click', closeSettings);
  $('settings-overlay').addEventListener('click', e=>{ if(e.target.id==='settings-overlay') closeSettings(); });
  function closeSettings() {
    $('settings-overlay').classList.remove('open');
    $('settings-overlay').setAttribute('aria-hidden','true');
  }

  // Firebase apply
  $('apply-firebase-btn').addEventListener('click', async ()=>{
    const raw = $('firebase-config-input').value.trim();
    try {
      const cfg = JSON.parse(raw);
      if (!cfg.databaseURL) throw new Error('Missing databaseURL field');
      await initFirebase(cfg);
      closeSettings();
    } catch(e) { toast('Invalid config: ' + e.message, 'error'); }
  });
}

// ── Join flow ────────────────────────────────────────────────────
async function doJoin(user) {
  S.user = user;

  // Transition screens
  const joinScr = $('join-screen');
  const mapScr  = $('map-screen');
  joinScr.classList.add('exit');

  await new Promise(r=>setTimeout(r,480));
  joinScr.classList.remove('active','exit');
  joinScr.style.display='none';

  // Fade canvas out
  $('particles-canvas').style.opacity='0';
  setTimeout(()=>{ $('particles-canvas').style.display='none'; },900);

  // Activate map screen
  mapScr.style.display='block';
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>mapScr.classList.add('active'));
  });

  // User chip
  $('user-chip').innerHTML = `<span class="chip-avatar">${user.avatar}</span><span class="chip-name">${user.name}</span>`;

  // Init map + markers
  buildMap(user.lat, user.lng);
  putMarker(user, true);

  // Controls
  setupControls();

  // Sync
  initSync();
  refreshSidebar();

  // Watch position
  if (navigator.geolocation) {
    S.watchId = navigator.geolocation.watchPosition(pos=>{
      const wasLat = S.user.lat, wasLng = S.user.lng;
      S.user.lat = pos.coords.latitude;
      S.user.lng = pos.coords.longitude;
      S.user.ts  = Date.now();
      putMarker(S.user, true);
      if (Math.abs(wasLat-S.user.lat)>0.00001 || Math.abs(wasLng-S.user.lng)>0.00001) {
        broadcast();
      }
      if (S.selectedId && S.friends[S.selectedId]) showDist(S.user, S.friends[S.selectedId]);
    }, null, { enableHighAccuracy:true, timeout:15000, maximumAge:5000 });
  }

  // Heartbeat — keep timestamp fresh + re-announce
  setInterval(()=>{
    if (!S.user) return;
    S.user.ts = Date.now();
    broadcast();
    refreshSidebar(); // refresh relative times
  }, 12000);
}

// ── Boot ─────────────────────────────────────────────────────────
(function init() {
  // Particles on join screen
  const cv = $('particles-canvas');
  const pt = new Particles(cv);
  pt.start(); // sets _active = true then fires tick()

  // Init join UI
  initJoin();
})();
