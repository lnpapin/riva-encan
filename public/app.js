/* ════════════════════════════════════════════
   RIVA ENCAN — Logique principale (app.js)
   Connecté à l'API Vercel + Supabase
════════════════════════════════════════════ */

const API = '';  // Même domaine en production, vide = relatif

// ── État global ──
let lots        = [];
let closeDateTime = null;
let cdInterval  = null;
let cardCdInterval = null;
let mode        = 'public';
let adminLogged = false;
let lotFilter   = 'tous';
let lotSearch   = '';
let editingId   = null;
let pendingImg  = null;
let admTab      = 'lots';

/* ════════════════════════════════════════════
   CHARGEMENT INITIAL
════════════════════════════════════════════ */
async function init() {
  try {
    await Promise.all([loadLots(), loadSettings()]);
    renderPublic();
    startCountdown();
    // Rafraîchir les données toutes les 30 secondes
    setInterval(async () => {
      await loadLots();
      if (mode === 'public') renderGrid();
      else if (mode === 'admin') refreshAdminStats();
    }, 30000);
  } catch (err) {
    document.getElementById('main-view').innerHTML =
      `<div class="loading-wrap"><p style="color:#c45000">❌ Impossible de charger l'encan.<br>${err.message}</p></div>`;
  }
}

async function loadLots() {
  const res = await fetch(`${API}/api/lots`);
  if (!res.ok) throw new Error('Erreur chargement des lots');
  lots = await res.json();
}

async function loadSettings() {
  const res = await fetch(`${API}/api/settings`);
  if (!res.ok) return;
  const settings = await res.json();
  if (settings.close_datetime) {
    closeDateTime = new Date(settings.close_datetime);
  } else {
    closeDateTime = new Date(Date.now() + 2 * 3600000);
  }
}

/* ════════════════════════════════════════════
   COMPTE À REBOURS
════════════════════════════════════════════ */
function startCountdown() {
  if (cdInterval) clearInterval(cdInterval);
  updateCountdown();
  cdInterval = setInterval(updateCountdown, 1000);
}

function updateCountdown() {
  if (!closeDateTime) return;
  const diff = closeDateTime.getTime() - Date.now();
  const hdrWrap = document.getElementById('hdr-countdown-wrap');
  const pubBar  = document.getElementById('pub-countdown');

  if (diff <= 0) {
    if (hdrWrap) hdrWrap.innerHTML = `<span class="hdr-cd-closed">🔒 Encan fermé</span>`;
    if (pubBar)  pubBar.innerHTML  = `<div class="cd-closed-pub">🔒 L'encan est maintenant fermé</div>`;
    return;
  }

  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins  = Math.floor((diff % 3600000)  / 60000);
  const secs  = Math.floor((diff % 60000)    / 1000);
  const units = days > 0
    ? [{v:days,l:'jours'},{v:hours,l:'h'},{v:mins,l:'min'}]
    : [{v:hours,l:'h'},{v:mins,l:'min'},{v:secs,l:'sec'}];

  const hdrHTML = units.map((u,i) =>
    `<div class="hdr-cd-unit"><div class="hdr-cd-val">${pad(u.v)}</div><div class="hdr-cd-lbl">${u.l}</div></div>`+
    (i<units.length-1?'<span class="hdr-cd-sep">:</span>':'')
  ).join('');
  const pubHTML = units.map((u,i) =>
    `<div class="cd-unit"><div class="cd-val">${pad(u.v)}</div><div class="cd-lbl">${u.l}</div></div>`+
    (i<units.length-1?'<span class="cd-sep">:</span>':'')
  ).join('');

  if (hdrWrap && mode==='public') hdrWrap.innerHTML = `<div class="hdr-countdown">${hdrHTML}</div>`;
  if (pubBar) pubBar.innerHTML = pubHTML;

  // Mettre à jour les timers sur les cartes
  lots.forEach(l => {
    const el = document.getElementById('card-cd-' + l.id);
    if (!el) return;
    const h = Math.floor(diff/3600000);
    const m = Math.floor((diff%3600000)/60000);
    const s = Math.floor((diff%60000)/1000);
    el.textContent = h>0 ? `${h}h ${pad(m)}m` : `${pad(m)}m ${pad(s)}s`;
  });
}

function pad(n) { return String(n).padStart(2,'0'); }
function fmtDatetimeLocal(d) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ════════════════════════════════════════════
   LIGHTBOX
════════════════════════════════════════════ */
function openLightbox(src, isEmoji, caption) {
  const content = isEmoji
    ? `<div class="lightbox-emoji">${src}</div>`
    : `<img src="${src}" alt="${caption||''}" />`;
  document.getElementById('lightbox-container').innerHTML = `
    <div class="lightbox" onclick="if(event.target===this)closeLightbox()">
      <div class="lightbox-inner">
        ${content}
        <button class="lightbox-close" onclick="closeLightbox()" aria-label="Fermer">✕</button>
        ${caption?`<div class="lightbox-caption">${caption}</div>`:''}
      </div>
    </div>`;
}
function closeLightbox() { document.getElementById('lightbox-container').innerHTML=''; }

/* ════════════════════════════════════════════
   SWITCH MODE PUBLIC / ADMIN
════════════════════════════════════════════ */
function switchMode() {
  if (mode==='public') { adminLogged ? enterAdmin() : showAdminLogin(); }
  else { exitAdmin(); }
}

function showAdminLogin() {
  mode = 'login';
  updateHeader();
  document.getElementById('main-view').innerHTML=`
    <div class="login-wrap"><div class="login-box">
      <div class="login-icon"><i class="ti ti-lock"></i></div>
      <div class="login-title">Accès administrateur</div>
      <div class="login-sub">Entrez le mot de passe pour gérer l'encan.</div>
      <label class="login-lbl">Mot de passe</label>
      <input class="login-input" type="password" id="pwd" placeholder="••••••••••••" onkeydown="if(event.key==='Enter')tryAdminLogin()" />
      <div class="login-err" id="login-err"></div>
      <button class="login-btn" onclick="tryAdminLogin()">
        <i class="ti ti-lock-open" style="font-size:14px;vertical-align:-2px;margin-right:6px"></i>Accéder au panneau
      </button>
      <button class="login-back" onclick="renderPublic()">← Retour à l'encan</button>
    </div></div>`;
}

function tryAdminLogin() {
  // En production : valider avec une API sécurisée
  if (document.getElementById('pwd').value === 'LabRiva1234') {
    adminLogged = true; enterAdmin();
  } else {
    const e = document.getElementById('login-err');
    e.textContent = 'Mot de passe incorrect.'; e.style.display='block';
  }
}

function enterAdmin() { mode='admin'; updateHeader(); renderAdmin(); }
function exitAdmin()  { mode='public'; updateHeader(); renderPublic(); }

function updateHeader() {
  const badge = document.getElementById('hdr-mode-badge');
  const btn   = document.getElementById('hdr-switch-btn');
  const cdw   = document.getElementById('hdr-countdown-wrap');
  if (mode==='admin') {
    badge.textContent='ADMIN'; badge.className='hdr-admin-badge';
    btn.textContent='← Retour à l\'encan';
    if (cdw) cdw.style.display='none';
  } else {
    badge.textContent='EN DIRECT'; badge.className='hdr-live';
    btn.textContent='⚙️ Admin';
    if (cdw) cdw.style.display='flex';
  }
}

/* ════════════════════════════════════════════
   VUE PUBLIQUE
════════════════════════════════════════════ */
function renderPublic() {
  mode='public'; updateHeader();
  const total  = lots.reduce((s,l)=>s+l.current,0);
  const retail = lots.reduce((s,l)=>s+l.retail,0);
  const parts  = new Set(lots.flatMap(l=>(l.history||[]).map(h=>h.name))).size;
  const opts   = {weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'};
  const dateStr = closeDateTime ? closeDateTime.toLocaleDateString('fr-CA',opts) : '—';

  document.getElementById('main-view').innerHTML=`
    <div class="subnav">
      <span class="subnav-label">Catégorie :</span>
      <button class="sf ${lotFilter==='tous'?'on':''}" onclick="setFilter('tous',this)">Tous</button>
      <button class="sf ${lotFilter==='sport'?'on':''}" onclick="setFilter('sport',this)">Sport</button>
      <button class="sf ${lotFilter==='experience'?'on':''}" onclick="setFilter('experience',this)">Expériences</button>
      <button class="sf ${lotFilter==='cadeau'?'on':''}" onclick="setFilter('cadeau',this)">Paniers-cadeaux</button>
      <button class="sf ${lotFilter==='autre'?'on':''}" onclick="setFilter('autre',this)">Autres</button>
      <input class="search-box" type="text" placeholder="🔍  Rechercher…" value="${lotSearch}" oninput="setSearch(this.value)" />
    </div>
    <div class="hero">
      <h1>Levée de fonds — Laboratoire Riva 2026</h1>
      <p>Participez aux enchères et soutenez nos projets de recherche</p>
      <div class="countdown-bar">
        <div>
          <div class="cd-label"><i class="ti ti-clock" style="font-size:14px;vertical-align:-2px;margin-right:4px"></i> Temps restant pour enchérir</div>
          <div class="cd-date" id="pub-countdown-date">Fermeture : ${dateStr}</div>
        </div>
        <div class="cd-units" id="pub-countdown"></div>
      </div>
      <div class="stats-row">
        <div class="stat-card"><div class="stat-lbl">Lots disponibles</div><div class="stat-val">${lots.filter(l=>l.status!=='closed').length}</div></div>
        <div class="stat-card"><div class="stat-lbl">Total des enchères</div><div class="stat-val c">${total.toLocaleString('fr-CA')} $</div></div>
        <div class="stat-card"><div class="stat-lbl">Participants actifs</div><div class="stat-val">${parts}</div></div>
        <div class="stat-card"><div class="stat-lbl">Valeur totale des lots</div><div class="stat-val g">${retail.toLocaleString('fr-CA')} $</div></div>
      </div>
    </div>
    <div class="lots-grid" id="lots-grid"></div>`;

  updateCountdown();
  renderGrid();
}

function setFilter(cat,btn) { lotFilter=cat; document.querySelectorAll('.sf').forEach(b=>b.classList.remove('on')); btn.classList.add('on'); renderGrid(); }
function setSearch(v) { lotSearch=v.toLowerCase(); renderGrid(); }

function imgContent(l, size) {
  if (l.image_url) return `<img src="${l.image_url}" alt="${l.name}" style="width:100%;height:100%;object-fit:cover" />`;
  return `<span style="font-size:${size||40}px">${l.emoji||'🎁'}</span>`;
}
function badgeHTML(l) {
  if (l.status==='closed') return '<span class="lot-badge b-closed">🔒 Fermé</span>';
  if (l.status==='hot')    return '<span class="lot-badge b-hot">🔥 Populaire</span>';
  if (l.status==='new')    return '<span class="lot-badge b-new">✨ Nouveau</span>';
  return '<span class="lot-badge b-active">En cours</span>';
}
function zoomCall(l, cap) {
  if (l.image_url) return `openLightbox('${l.image_url}',false,'${cap}')`;
  return `openLightbox('${l.emoji||'🎁'}',true,'${cap}')`;
}

function renderGrid() {
  const g = document.getElementById('lots-grid'); if(!g) return;
  const list = lots.filter(l =>
    (lotFilter==='tous'||l.category===lotFilter) &&
    (l.name.toLowerCase().includes(lotSearch)||l.description.toLowerCase().includes(lotSearch))
  );
  if(!list.length) { g.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:40px;color:#2a5a7a">Aucun lot trouvé</div>'; return; }
  g.innerHTML = list.map(l => {
    const sav = Math.round(((l.retail-l.current)/l.retail)*100);
    const nb  = (l.history||[]).length;
    const closed = l.status==='closed';
    const cap = `${l.num} — ${l.name}`;
    return `<div class="lot-card${closed?' closed-card':''}" ${!closed?`onclick="openLotModal(${l.id})"`:''}>
      <div class="lot-img-box" onclick="event.stopPropagation();${zoomCall(l,cap)}" title="Agrandir">
        ${imgContent(l,40)}
        <span class="lot-num-tag">${l.num}</span>
        ${badgeHTML(l)}
        <span class="zoom-hint">🔍 Agrandir</span>
      </div>
      <div class="lot-body">
        <div class="lot-name">${l.name}</div>
        <div class="lot-desc">${l.description}</div>
        <div class="lot-prices">
          <div class="lp retail"><div class="lp-lbl">Valeur détail</div><div class="lp-val">${l.retail} $</div></div>
          <div class="lp current"><div class="lp-lbl">Enchère actuelle</div><div class="lp-val">${l.current} $</div></div>
        </div>
        <div class="lot-footer-row">
          <div class="lot-timer-sm"><i class="ti ti-clock" style="font-size:12px"></i>&nbsp;<span class="hot" id="card-cd-${l.id}">—</span></div>
          <div class="lot-bids-sm">${nb} offre${nb!==1?'s':''} · ${sav}% éco.</div>
        </div>
        <button class="btn-bid${closed?' closed':''}" ${!closed?`onclick="event.stopPropagation();openLotModal(${l.id})"`:''}>
          ${closed?'🔒 Enchères fermées':'Faire une offre'}
        </button>
      </div>
    </div>`;
  }).join('');
}

/* Modal participants */
function buildHistHTML(l) {
  const hist = l.history||[];
  if(!hist.length) return '<div style="text-align:center;padding:30px;color:#5a8aaa;font-size:13px">Aucune offre encore — soyez le premier !</div>';
  return `<div style="display:flex;justify-content:space-between;margin-bottom:12px"><span style="font-size:13px;font-weight:bold;color:#00559f">Toutes les offres</span><span style="font-size:12px;color:#5a8aaa">${hist.length} offre${hist.length>1?'s':''}</span></div>`+
    hist.map((h,i)=>{
      const rc=i===0?'r1':i===1?'r2':i===2?'r3':'rn';
      const rl=i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`;
      return `<div class="hist-entry"><div class="hist-rank ${rc}">${rl}</div><div class="hist-info"><div class="hist-name">${h.name}</div><div class="hist-time">${h.time}</div></div><div class="hist-amount${i===0?' top':''}">${h.amount} $</div></div>`;
    }).join('');
}

function openLotModal(id, tab) {
  const l = lots.find(x=>x.id===id); if(!l||l.status==='closed') return;
  const min = l.current+5; const t = tab||'offre';
  const cap = `${l.num} — ${l.name}`;
  const imgInModal = l.image_url
    ? `<img src="${l.image_url}" alt="${l.name}" style="width:100%;height:100%;object-fit:cover" />`
    : `<span style="font-size:38px">${l.emoji||'🎁'}</span>`;
  document.getElementById('modal-container').innerHTML=`
    <div class="modal-bg" onclick="if(event.target===this)closeModal()">
      <div class="modal-box">
        <div class="modal-head">
          <span>${l.num} — ${l.name}</span>
          <button class="modal-close-btn" onclick="closeModal()">✕</button>
        </div>
        <div class="rv-tabs">
          <button class="rv-tab${t==='offre'?' on':''}" id="rtab-offre" onclick="switchRTab('offre')">✏️ Faire une offre</button>
          <button class="rv-tab${t==='hist'?' on':''}"  id="rtab-hist"  onclick="switchRTab('hist')">📋 Historique (${(l.history||[]).length})</button>
        </div>
        <div id="rtab-content-offre" class="rv-tab-content${t==='offre'?' on':''}">
          <div id="bid-flash"></div>
          <div class="modal-img-wrap" onclick="${zoomCall(l,cap)}" title="Cliquer pour agrandir">
            ${imgInModal}
            <span class="modal-zoom-hint">🔍 Agrandir</span>
          </div>
          <div class="modal-lot-name">${l.name}</div>
          <div class="modal-lot-desc">${l.description}</div>
          <div class="modal-prices">
            <div class="mp retail"><div class="mp-lbl">Valeur détail</div><div class="mp-val">${l.retail} $</div></div>
            <div class="mp start"><div class="mp-lbl">Mise départ</div><div class="mp-val">${l.mise} $</div></div>
            <div class="mp current" id="mp-current"><div class="mp-lbl">Actuelle</div><div class="mp-val">${l.current} $</div></div>
          </div>
          <label class="f-lbl">Votre nom complet</label>
          <input class="f-input" type="text" id="bid-name" placeholder="ex : Marie Tremblay" />
          <label class="f-lbl" id="bid-amt-lbl">Votre offre <span style="color:#5a8aaa;font-size:11px;font-weight:normal">(minimum ${min} $)</span></label>
          <input class="f-input" type="number" id="bid-amount" min="${min}" value="${min}" />
          <div class="email-box">
            <div class="email-title"><i class="ti ti-bell" style="font-size:13px"></i> Notification par courriel <span style="font-size:10px;font-weight:normal;color:#5a8aaa">(optionnel)</span></div>
            <div class="email-sub">Recevez un avis si quelqu'un surenchérit sur ce lot.</div>
            <input class="f-email" type="email" id="bid-email" placeholder="votre@courriel.com" />
          </div>
          <div class="f-note"><i class="ti ti-eye" style="font-size:15px;flex-shrink:0;margin-top:1px"></i>Les offres sont publiques. Votre nom et montant seront visibles dans l'historique.</div>
          <button class="btn-submit" id="submit-btn" onclick="submitBid(${id})">✓ Confirmer mon enchère</button>
        </div>
        <div id="rtab-content-hist" class="rv-tab-content${t==='hist'?' on':''}">
          ${buildHistHTML(l)}
        </div>
      </div>
    </div>`;
}

function switchRTab(tab) {
  ['offre','hist'].forEach(t=>{
    document.getElementById('rtab-'+t).classList.toggle('on',t===tab);
    document.getElementById('rtab-content-'+t).classList.toggle('on',t===tab);
  });
}
function closeModal() { document.getElementById('modal-container').innerHTML=''; }

async function submitBid(id) {
  const name   = document.getElementById('bid-name').value.trim();
  const amount = parseInt(document.getElementById('bid-amount').value);
  const email  = document.getElementById('bid-email').value.trim();
  const l = lots.find(x=>x.id===id);
  const min = l.current+5;
  if(!name) { alert('Veuillez entrer votre nom complet.'); return; }
  if(isNaN(amount)||amount<min) { alert(`Votre offre doit être d'au moins ${min} $.`); return; }
  if(email&&!email.includes('@')) { alert('Courriel invalide ou laissez vide.'); return; }

  const btn = document.getElementById('submit-btn');
  btn.disabled=true; btn.textContent='Envoi en cours…';

  try {
    const res = await fetch(`${API}/api/bids`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lot_id: id, name, amount, email: email||null })
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error||'Erreur lors de l\'envoi.'); btn.disabled=false; btn.textContent='✓ Confirmer mon enchère'; return; }

    // Mise à jour locale
    l.current = amount;
    if (!l.history) l.history=[];
    l.history.unshift({ name, amount, email:email||null, time: new Date().toLocaleTimeString('fr-CA',{hour:'2-digit',minute:'2-digit'}) });
    if (l.history.length>=3) l.status='hot';

    const flash=document.getElementById('bid-flash');
    if(flash) flash.innerHTML=`<div class="flash-ok"><span style="font-size:22px">✅</span><div><div class="flash-ok-text">Offre de ${amount} $ enregistrée !</div><div class="flash-ok-sub">${name}${email?' · Notification activée':''}</div></div></div>`;
    const newMin=l.current+5;
    const inp=document.getElementById('bid-amount'); if(inp){inp.min=newMin;inp.value=newMin;}
    const lbl=document.getElementById('bid-amt-lbl'); if(lbl) lbl.innerHTML=`Votre offre <span style="color:#5a8aaa;font-size:11px;font-weight:normal">(minimum ${newMin} $)</span>`;
    const cur=document.getElementById('mp-current'); if(cur) cur.innerHTML=`<div class="mp-lbl">Actuelle</div><div class="mp-val">${amount} $</div>`;
    const histEl=document.getElementById('rtab-content-hist'); if(histEl) histEl.innerHTML=buildHistHTML(l);
    const histBtn=document.getElementById('rtab-hist'); if(histBtn) histBtn.textContent=`📋 Historique (${l.history.length})`;
    btn.disabled=false; btn.textContent='✓ Confirmer mon enchère';
    renderGrid();
  } catch(err) {
    alert('Erreur réseau. Vérifiez votre connexion.'); btn.disabled=false; btn.textContent='✓ Confirmer mon enchère';
  }
}

/* ════════════════════════════════════════════
   VUE ADMIN
════════════════════════════════════════════ */
function renderAdmin() {
  const total  = lots.reduce((s,l)=>s+l.current,0);
  const retail = lots.reduce((s,l)=>s+l.retail,0);
  const offres = lots.reduce((s,l)=>s+(l.history||[]).length,0);
  const parts  = new Set(lots.flatMap(l=>(l.history||[]).map(h=>h.name))).size;
  document.getElementById('main-view').innerHTML=`
    <div class="adm-body">
      <div class="adm-stats" id="adm-stats-row">
        <div class="adm-stat"><div class="adm-stat-lbl">Total amassé</div><div class="adm-stat-val green">${total.toLocaleString('fr-CA')} $</div></div>
        <div class="adm-stat"><div class="adm-stat-lbl">Valeur des lots</div><div class="adm-stat-val gold">${retail.toLocaleString('fr-CA')} $</div></div>
        <div class="adm-stat"><div class="adm-stat-lbl">Participants</div><div class="adm-stat-val">${parts}</div></div>
        <div class="adm-stat"><div class="adm-stat-lbl">Total des offres</div><div class="adm-stat-val orange">${offres}</div></div>
      </div>
      <div class="close-panel">
        <div class="close-panel-title"><i class="ti ti-clock" style="font-size:16px;color:#2cace3"></i> Date et heure de fermeture de l'encan</div>
        <div class="cp-grid">
          <div>
            <label class="cp-lbl">Date et heure de fermeture</label>
            <input class="cp-input" type="datetime-local" id="cp-datetime" value="${closeDateTime?fmtDatetimeLocal(closeDateTime):''}" />
          </div>
          <div style="display:flex;flex-direction:column;justify-content:flex-end">
            <button class="cp-save-btn" onclick="saveCloseDateTime()">
              <i class="ti ti-check" style="font-size:14px;vertical-align:-2px;margin-right:4px"></i>Enregistrer
            </button>
          </div>
          <div class="cp-preview" id="cp-preview" style="display:none"></div>
        </div>
      </div>
      <div class="adm-tabs">
        <button class="adm-tab${admTab==='lots'?' on':''}"     id="atab-lots"     onclick="switchAdmTab('lots')">📋 Gestion des lots</button>
        <button class="adm-tab${admTab==='ajouter'?' on':''}"  id="atab-ajouter"  onclick="switchAdmTab('ajouter')">➕ Ajouter un lot</button>
        <button class="adm-tab${admTab==='gagnants'?' on':''}" id="atab-gagnants" onclick="switchAdmTab('gagnants')">🏆 Gagnants</button>
      </div>
      <div class="adm-tab-panel${admTab==='lots'?' on':''}"     id="apanel-lots">${buildLotsTable()}</div>
      <div class="adm-tab-panel${admTab==='ajouter'?' on':''}"  id="apanel-ajouter">${buildLotForm(editingId?lots.find(l=>l.id===editingId):null)}</div>
      <div class="adm-tab-panel${admTab==='gagnants'?' on':''}" id="apanel-gagnants">${buildGagnants()}</div>
    </div>`;
  showCpPreview();
}

function refreshAdminStats() {
  const total  = lots.reduce((s,l)=>s+l.current,0);
  const retail = lots.reduce((s,l)=>s+l.retail,0);
  const offres = lots.reduce((s,l)=>s+(l.history||[]).length,0);
  const parts  = new Set(lots.flatMap(l=>(l.history||[]).map(h=>h.name))).size;
  const row = document.getElementById('adm-stats-row');
  if(row) row.querySelectorAll('.adm-stat-val').forEach((el,i)=>{
    if(i===0) el.textContent=total.toLocaleString('fr-CA')+' $';
    if(i===1) el.textContent=retail.toLocaleString('fr-CA')+' $';
    if(i===2) el.textContent=parts;
    if(i===3) el.textContent=offres;
  });
}

async function saveCloseDateTime() {
  const val = document.getElementById('cp-datetime').value;
  if(!val){alert('Veuillez choisir une date et heure.');return;}
  closeDateTime = new Date(val);
  try {
    await fetch(`${API}/api/settings`, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ key:'close_datetime', value: closeDateTime.toISOString() })
    });
    showToast('✅ Date de fermeture enregistrée !');
    showCpPreview();
    startCountdown();
  } catch(err) { alert('Erreur lors de la sauvegarde.'); }
}

function showCpPreview() {
  const p=document.getElementById('cp-preview'); if(!p||!closeDateTime) return;
  const opts={weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'};
  p.textContent='📅 Fermeture prévue : '+closeDateTime.toLocaleDateString('fr-CA',opts);
  p.style.display='block';
}

function switchAdmTab(tab) {
  if(tab==='ajouter'&&admTab!=='ajouter'){editingId=null;pendingImg=null;}
  admTab=tab;
  ['lots','ajouter','gagnants'].forEach(t=>{
    document.getElementById('atab-'+t).classList.toggle('on',t===tab);
    document.getElementById('apanel-'+t).classList.toggle('on',t===tab);
  });
  if(tab==='ajouter') document.getElementById('apanel-ajouter').innerHTML=buildLotForm(editingId?lots.find(l=>l.id===editingId):null);
}

function statusPill(s){
  if(s==='hot')    return '<span class="pill pill-hot">🔥 Populaire</span>';
  if(s==='new')    return '<span class="pill pill-new">✨ Nouveau</span>';
  if(s==='closed') return '<span class="pill pill-closed">🔒 Fermé</span>';
  return '<span class="pill pill-active">En cours</span>';
}

function buildLotsTable(){
  const rows=lots.map(l=>{
    const winner=(l.history||[]).length>0?l.history[0].name:'—';
    const closed=l.status==='closed';
    const toggleBtn=closed
      ?`<button class="ab ab-open" onclick="toggleClose(${l.id})">▶ Rouvrir</button>`
      :`<button class="ab ab-close" onclick="toggleClose(${l.id})">🔒 Fermer</button>`;
    const cap=`${l.num} — ${l.name}`;
    return `<tr>
      <td><b style="color:#003d75">${l.num}</b></td>
      <td><div style="display:flex;align-items:center;gap:8px">
        <div class="lot-thumb" onclick="${zoomCall(l,cap)}">${l.image_url?`<img src="${l.image_url}" alt="" />`:(l.emoji||'🎁')}</div>
        <span>${l.name}</span>
      </div></td>
      <td style="text-align:center">${(l.history||[]).length}</td>
      <td><b style="color:#1a7a40">${l.current} $</b></td>
      <td>${winner}</td>
      <td>${statusPill(l.status)}</td>
      <td><div class="action-btns">
        <button class="ab ab-mod" onclick="ouvrirModification(${l.id})">✏️ Modifier</button>
        ${toggleBtn}
        <button class="ab ab-del" onclick="confirmSupprimer(${l.id})">🗑 Supprimer</button>
      </div></td>
    </tr>`;
  }).join('');
  return `<div style="overflow-x:auto"><table class="adm-table">
    <thead><tr><th style="width:70px">#</th><th>Lot</th><th style="width:60px;text-align:center">Offres</th><th style="width:110px">Meilleure offre</th><th style="width:130px">Meneur</th><th style="width:110px">Statut</th><th style="width:230px">Actions</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

function buildLotForm(lot){
  const isEdit=!!lot;
  if(isEdit&&lot.image_url&&!pendingImg) pendingImg=lot.image_url;
  const v=lot||{num:'',name:'',description:'',mise:'',retail:'',category:'sport',emoji:'🎁'};
  const previewContent=pendingImg
    ?`<img src="${pendingImg}" alt="aperçu" />`
    :`<span style="font-size:32px">${v.emoji||'🎁'}</span>`;
  return `
    <div style="margin-bottom:14px;padding:10px 14px;background:#ddeef9;border-radius:8px;font-size:14px;font-weight:bold;color:#003d75;border-left:4px solid #00559f">
      ${isEdit?'✏️ Modification de '+v.num+' — '+v.name:'➕ Nouveau lot'}
    </div>
    <div class="adm-form-grid">
      <div><label class="adm-flbl">Numéro de lot</label><input class="adm-finput" type="text" id="f-num" value="${v.num}" placeholder="ex : LOT 09" /></div>
      <div><label class="adm-flbl">Catégorie</label>
        <select class="adm-fselect" id="f-cat">
          <option value="sport"      ${v.category==='sport'?'selected':''}>Sport</option>
          <option value="experience" ${v.category==='experience'?'selected':''}>Expérience</option>
          <option value="cadeau"     ${v.category==='cadeau'?'selected':''}>Panier-cadeau</option>
          <option value="autre"      ${v.category==='autre'?'selected':''}>Autre</option>
        </select>
      </div>
      <div class="adm-form-full"><label class="adm-flbl">Nom du lot</label><input class="adm-finput" type="text" id="f-name" value="${v.name}" placeholder="ex : Forfait ski Mont-Tremblant" /></div>
      <div class="adm-form-full"><label class="adm-flbl">Description</label><input class="adm-finput" type="text" id="f-desc" value="${v.description}" placeholder="ex : 2 passes + location équipement" /></div>
      <div><label class="adm-flbl">Mise de départ ($)</label><input class="adm-finput" type="number" id="f-mise" value="${v.mise}" placeholder="50" min="1" /></div>
      <div><label class="adm-flbl">Valeur au détail ($)</label><input class="adm-finput" type="number" id="f-retail" value="${v.retail}" placeholder="200" min="1" /></div>
      <div class="img-picker-zone" onclick="document.getElementById('f-img').click()">
        <div class="img-preview" id="img-prev">${previewContent}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:bold;color:#00559f;margin-bottom:3px">Photo du lot</div>
          <div style="font-size:12px;color:#5a8aaa;margin-bottom:8px">JPG, PNG ou WebP</div>
          <button class="img-picker-btn" type="button" onclick="event.stopPropagation();document.getElementById('f-img').click()">
            <i class="ti ti-upload" style="font-size:13px;vertical-align:-1px;margin-right:4px"></i>Parcourir…
          </button>
          <div style="font-size:11px;color:#1a7a40;margin-top:6px;font-weight:bold" id="img-name">${isEdit&&v.image_url?'📷 Image actuelle conservée':''}</div>
        </div>
        <input class="img-hidden" type="file" id="f-img" accept="image/*" onchange="handleImg(this)" />
      </div>
    </div>
    <div class="adm-form-actions">
      <button class="adm-save-btn" onclick="sauvegarderLot()">
        <i class="ti ti-check" style="font-size:14px;vertical-align:-2px;margin-right:5px"></i>
        ${isEdit?'Enregistrer les modifications':'Ajouter ce lot'}
      </button>
      ${isEdit?`<button class="adm-back-btn" onclick="annulerModif()">← Retour sans modifier</button>`:''}
    </div>
    <div class="adm-flash" id="form-flash"></div>`;
}

function handleImg(input){
  const file=input.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=async e=>{
    pendingImg=e.target.result;
    const p=document.getElementById('img-prev'); if(p) p.innerHTML=`<img src="${pendingImg}" alt="" />`;
    const n=document.getElementById('img-name'); if(n) n.textContent='✅ '+file.name;
  };
  reader.readAsDataURL(file);
}

function ouvrirModification(id){
  editingId=id; pendingImg=null; admTab='ajouter';
  ['lots','ajouter','gagnants'].forEach(t=>{ document.getElementById('atab-'+t).classList.toggle('on',t==='ajouter'); document.getElementById('apanel-'+t).classList.toggle('on',t==='ajouter'); });
  document.getElementById('apanel-ajouter').innerHTML=buildLotForm(lots.find(l=>l.id===id));
}
function annulerModif(){
  editingId=null; pendingImg=null; admTab='lots';
  ['lots','ajouter','gagnants'].forEach(t=>{ document.getElementById('atab-'+t).classList.toggle('on',t==='lots'); document.getElementById('apanel-'+t).classList.toggle('on',t==='lots'); });
}

async function sauvegarderLot(){
  const num    = document.getElementById('f-num').value.trim();
  const name   = document.getElementById('f-name').value.trim();
  const description = document.getElementById('f-desc').value.trim();
  const mise   = parseInt(document.getElementById('f-mise').value);
  const retail = parseInt(document.getElementById('f-retail').value);
  const category = document.getElementById('f-cat').value;
  if(!num||!name||!description||isNaN(mise)||isNaN(retail)){alert('Veuillez remplir tous les champs obligatoires.');return;}

  let image_url = editingId ? (lots.find(l=>l.id===editingId)||{}).image_url : null;

  // Upload de l'image si une nouvelle a été sélectionnée
  if(pendingImg && pendingImg.startsWith('data:')) {
    try {
      const upRes = await fetch(`${API}/api/upload`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ base64: pendingImg, filename: 'lot-image.jpg', mimetype:'image/jpeg' })
      });
      if(upRes.ok){ const d=await upRes.json(); image_url=d.url; }
    } catch(e){ console.warn('Upload image échoué, on continue sans image.'); }
  }

  const flash=document.getElementById('form-flash');
  try {
    if(editingId!==null){
      const res=await fetch(`${API}/api/lots`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:editingId,num,name,description,mise,retail,category,image_url})});
      if(!res.ok) throw new Error();
      const idx=lots.findIndex(l=>l.id===editingId);
      Object.assign(lots[idx],{num,name,description,mise,retail,category,image_url});
      flash.textContent='✅ Lot "'+name+'" modifié avec succès !'; flash.style.display='block';
      setTimeout(()=>{editingId=null;pendingImg=null;annulerModif();document.getElementById('apanel-lots').innerHTML=buildLotsTable();},1500);
    } else {
      const res=await fetch(`${API}/api/lots`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({num,name,description,mise,retail,category,image_url,emoji:'🎁',status:'new'})});
      if(!res.ok) throw new Error();
      const newLot=await res.json();
      newLot.history=[];
      lots.push(newLot);
      flash.textContent='✅ Lot "'+name+'" ajouté avec succès !'; flash.style.display='block';
      setTimeout(()=>{pendingImg=null;document.getElementById('apanel-ajouter').innerHTML=buildLotForm(null);document.getElementById('apanel-lots').innerHTML=buildLotsTable();},1500);
    }
  } catch(e){ alert('Erreur lors de la sauvegarde. Vérifiez votre connexion.'); }
}

async function toggleClose(id){
  const l=lots.find(x=>x.id===id);
  const newStatus=l.status==='closed'?'active':'closed';
  try {
    await fetch(`${API}/api/lots`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,status:newStatus})});
    l.status=newStatus;
    document.getElementById('apanel-lots').innerHTML=buildLotsTable();
    document.getElementById('apanel-gagnants').innerHTML=buildGagnants();
  } catch(e){ alert('Erreur lors de la mise à jour.'); }
}

function confirmSupprimer(id){
  const l=lots.find(x=>x.id===id);
  document.getElementById('confirm-container').innerHTML=`
    <div class="confirm-overlay">
      <div class="confirm-box">
        <div class="confirm-icon">🗑️</div>
        <div class="confirm-title">Suppression définitive</div>
        <div class="confirm-lotname">${l.num} — ${l.name}</div>
        <div class="confirm-warn">⚠️ <b>Cette action est irréversible.</b><br><br>
          Le lot sera <b>définitivement supprimé</b> ainsi que l'historique des offres (${(l.history||[]).length} offre${(l.history||[]).length!==1?'s':''}), les informations des participants et tous les montants associés.<br><br>
          <b>Il sera impossible de récupérer ces données.</b>
        </div>
        <div class="confirm-btns">
          <button class="confirm-no" onclick="closeConfirm()">Annuler</button>
          <button class="confirm-yes" onclick="doSupprimer(${id})">🗑 Supprimer définitivement</button>
        </div>
      </div>
    </div>`;
}

async function doSupprimer(id){
  try {
    await fetch(`${API}/api/lots?id=${id}`,{method:'DELETE'});
    lots.splice(lots.findIndex(x=>x.id===id),1);
    closeConfirm();
    document.getElementById('apanel-lots').innerHTML=buildLotsTable();
    document.getElementById('apanel-gagnants').innerHTML=buildGagnants();
    refreshAdminStats();
  } catch(e){ alert('Erreur lors de la suppression.'); }
}
function closeConfirm(){ document.getElementById('confirm-container').innerHTML=''; }

function buildGagnants(){
  const actifs=lots.filter(l=>(l.history||[]).length>0);
  const sans=lots.filter(l=>!(l.history||[]).length);
  const total=actifs.reduce((s,l)=>s+l.current,0);
  const cards=actifs.map(l=>{
    const w=l.history[0];
    const imgEl=l.image_url?`<img src="${l.image_url}" alt="" />`:`<span style="font-size:24px">${l.emoji||'🎁'}</span>`;
    return `<div class="winner-card">
      <div class="winner-img">${imgEl}</div>
      <div class="winner-info"><div class="winner-lot">${l.num} — ${l.name}</div><div class="winner-name">🏆 ${w.name}</div><div class="winner-email">${w.email?'📧 '+w.email:'Pas de courriel fourni'}</div></div>
      <div style="text-align:right;flex-shrink:0"><div style="font-size:18px;font-weight:bold;color:#1a7a40">${w.amount} $</div><div style="font-size:11px;color:#5a8aaa">détail : ${l.retail} $</div></div>
    </div>`;
  }).join('');
  const noW=sans.length>0?`<div style="margin-top:12px;font-size:13px;color:#5a8aaa;font-style:italic">Lots sans offre (${sans.length}) : ${sans.map(l=>l.name).join(', ')}</div>`:'';
  return `<button class="export-btn" onclick="exportCSV()"><i class="ti ti-download" style="font-size:15px"></i> Exporter en CSV</button>${cards}${noW}
  <div class="total-bar"><div><div style="font-size:13px;color:#a0c8e8">Total amassé pour la levée de fonds</div><div style="font-size:12px;color:#7aafd4">${actifs.length} lots avec offres · ${sans.length} sans offre</div></div><div style="font-size:22px;font-weight:bold;color:#fff">${total.toLocaleString('fr-CA')} $</div></div>`;
}

function exportCSV(){
  const actifs=lots.filter(l=>(l.history||[]).length>0);
  let csv='Lot,Nom du lot,Gagnant,Courriel,Montant,Valeur détail\n';
  actifs.forEach(l=>{const w=l.history[0];csv+=`"${l.num}","${l.name}","${w.name}","${w.email||''}","${w.amount} $","${l.retail} $"\n`;});
  const blob=new Blob([csv],{type:'text/csv'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='riva-encan-gagnants.csv';a.click();URL.revokeObjectURL(url);
}

function showToast(msg){
  const c=document.getElementById('toast-container');
  c.innerHTML=`<div class="toast">${msg}</div>`;
  setTimeout(()=>{c.innerHTML='';},3500);
}

// ── Démarrage ──
init();
