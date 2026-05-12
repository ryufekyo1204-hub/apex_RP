'use strict';

// ─── Constants ────────────────────────────────────────────────────────────────

const EMOTION_TAGS = [
  { id: 'hot',        label: 'ノッてる' },
  { id: 'angry',      label: 'イライラ' },
  { id: 'calm',       label: '冷静' },
  { id: 'aggressive', label: 'ガンガン' },
  { id: 'careful',    label: '安全第一' },
  { id: 'tired',      label: '疲れてる' },
  { id: 'focused',    label: '集中' },
  { id: 'inertia',    label: '惰性' },
];

const ALLY_TAGS = [
  { id: 'synergy', label: '噛み合った' },
  { id: 'strong',  label: '強かった' },
  { id: 'normal',  label: '普通' },
  { id: 'weak',    label: '弱かった' },
  { id: 'toxic',   label: 'トキシック' },
  { id: 'carried', label: 'キャリー' },
  { id: 'vc_good', label: 'VC良かった' },
  { id: 'vc_none', label: '無言' },
];

const PLAY_TAGS = [
  { id: 'aggro',      label: '突っ込み' },
  { id: 'passive',    label: '慎重' },
  { id: 'third',      label: '漁夫狙い' },
  { id: 'good_judge', label: '判断良' },
  { id: 'gambling',   label: '運ゲー' },
  { id: 'unfocused',  label: '集中切れ' },
  { id: 'vc_active',  label: 'VC多め' },
  { id: 'rotate',     label: 'ローテ良' },
];

const CHARACTERS = [
  'Alter','Ash','Ballistic','Bangalore','Bloodhound','Catalyst','Caustic',
  'Conduit','Crypto','Fuse','Gibraltar','Horizon','Lifeline','Loba',
  'Mad Maggie','Mirage','Newcastle','Octane','Pathfinder','Rampart',
  'Revenant','Seer','Valkyrie','Vantage','Wattson','Wraith',
];

const RANKS = [
  { name: 'Rookie IV',   minLP: 0    },
  { name: 'Rookie III',  minLP: 250  },
  { name: 'Rookie II',   minLP: 500  },
  { name: 'Rookie I',    minLP: 750  },
  { name: 'Bronze IV',   minLP: 1000 },
  { name: 'Bronze III',  minLP: 1250 },
  { name: 'Bronze II',   minLP: 1500 },
  { name: 'Bronze I',    minLP: 1750 },
  { name: 'Silver IV',   minLP: 2000 },
  { name: 'Silver III',  minLP: 2375 },
  { name: 'Silver II',   minLP: 2750 },
  { name: 'Silver I',    minLP: 3125 },
  { name: 'Gold IV',     minLP: 3500 },
  { name: 'Gold III',    minLP: 3875 },
  { name: 'Gold II',     minLP: 4250 },
  { name: 'Gold I',      minLP: 4625 },
  { name: 'Platinum IV', minLP: 5000 },
  { name: 'Platinum III',minLP: 5500 },
  { name: 'Platinum II', minLP: 6000 },
  { name: 'Platinum I',  minLP: 6500 },
  { name: 'Diamond IV',  minLP: 7000 },
  { name: 'Diamond III', minLP: 7700 },
  { name: 'Diamond II',  minLP: 8400 },
  { name: 'Diamond I',   minLP: 9100 },
  { name: 'Master',      minLP: 9800 },
  { name: 'Predator',    minLP: 10000},
];

const RANK_ICONS = {
  'Rookie':   '○',
  'Bronze':   '◎',
  'Silver':   '◇',
  'Gold':     '◆',
  'Platinum': '◈',
  'Diamond':  '◉',
  'Master':   '★',
  'Predator': '◆◆',
};

const TIME_SLOTS_4 = [
  { label: '朝\n6-12',  min: 6,  max: 12 },
  { label: '昼\n12-18', min: 12, max: 18 },
  { label: '夜\n18-24', min: 18, max: 24 },
  { label: '深夜\n0-6', min: 0,  max: 6  },
];

const PIE_FILLS = ['#1a1714','#332e2a','#4d4844','#66615c','#807b76','#999490','#b3aeaa','#ccc9c5'];
const RP_MIN = -200, RP_MAX = 600;

// ─── State ────────────────────────────────────────────────────────────────────

const state = {
  logs: [],
  config: { startingLP: 1000, lastParty: null, lastCharacter: null },
  histFilter: 'today',
  rpSection: 'log',
  barPeriod: 'day',
  form: { rp: 0, kills: 0, party: null, character: null, emotions: [], ally: [], play: [], deathCause: null },
};

// ─── Storage ──────────────────────────────────────────────────────────────────

function loadLogs() {
  try { return JSON.parse(localStorage.getItem('apex_logs') || '[]'); }
  catch { return []; }
}
function saveLogs() { localStorage.setItem('apex_logs', JSON.stringify(state.logs)); }

function loadConfig() {
  try { return { ...state.config, ...JSON.parse(localStorage.getItem('apex_config') || '{}') }; }
  catch { return state.config; }
}
function saveConfig() { localStorage.setItem('apex_config', JSON.stringify(state.config)); }

// ─── Utilities ────────────────────────────────────────────────────────────────

function pad(n) { return String(n).padStart(2, '0'); }
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function nowTime() { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function fmtRP(n) { return n > 0 ? `+${n}` : String(n); }
function rpCls(n) { return n > 0 ? 'pos' : n < 0 ? 'neg' : ''; }
function clamp(v) { return Math.max(RP_MIN, Math.min(RP_MAX, v)); }
function daysAgoStr(n) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function dayLabel(dateStr) {
  const [, m, d] = dateStr.split('-');
  const dow = ['日','月','火','水','木','金','土'][new Date(dateStr).getDay()];
  return `${parseInt(m)}/${parseInt(d)}(${dow})`;
}

// ─── Rank helpers ─────────────────────────────────────────────────────────────

function getRankTier(name) {
  for (const tier of ['Predator','Master','Diamond','Platinum','Gold','Silver','Bronze','Rookie']) {
    if (name.startsWith(tier)) return tier;
  }
  return 'Rookie';
}

function getRankForLP(totalLP) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (totalLP >= RANKS[i].minLP) return RANKS[i];
  }
  return RANKS[0];
}

function getCurrentLP() {
  const gained = state.logs.reduce((s, l) => s + l.rp, 0);
  return Math.max(0, state.config.startingLP + gained);
}

function updateRankBanner() {
  const totalLP = getCurrentLP();
  const rank = getRankForLP(totalLP);
  const tier = getRankTier(rank.name);
  const idx = RANKS.indexOf(rank);
  const nextRank = RANKS[idx + 1];
  const tierLP = totalLP - rank.minLP;
  const tierRange = nextRank ? nextRank.minLP - rank.minLP : 200;
  const pct = nextRank ? Math.min(100, Math.round((tierLP / tierRange) * 100)) : 100;

  document.getElementById('rank-icon').textContent = RANK_ICONS[tier] || '◆';
  document.getElementById('rank-name').textContent = rank.name;
  document.getElementById('rank-lp').textContent = `${totalLP} LP`;
  document.getElementById('rank-next').textContent = nextRank
    ? `→次: ${nextRank.minLP - totalLP} LP`
    : '→MAX';
  document.getElementById('rank-progress-fill').style.width = `${pct}%`;
}

// ─── Rank modal ───────────────────────────────────────────────────────────────

function buildRankSelect() {
  const sel = document.getElementById('rank-select');
  sel.innerHTML = '';
  RANKS.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.minLP;
    opt.textContent = r.name;
    sel.appendChild(opt);
  });
  const cur = getRankForLP(state.config.startingLP);
  sel.value = cur.minLP;
  const tierLP = state.config.startingLP - cur.minLP;
  document.getElementById('rank-lp-input').value = Math.max(0, tierLP);
}

function showRankModal() {
  buildRankSelect();
  document.getElementById('rank-modal-overlay').classList.remove('hidden');
}

function hideRankModal() {
  document.getElementById('rank-modal-overlay').classList.add('hidden');
}

// ─── SVG helpers ──────────────────────────────────────────────────────────────

function svgEl(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (attrs) Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}
function svgText(content, attrs) {
  const el = svgEl('text', attrs);
  el.textContent = content;
  return el;
}
function arcPath(cx, cy, r, startDeg, endDeg) {
  const toRad = deg => (deg - 90) * Math.PI / 180;
  const x1 = cx + r * Math.cos(toRad(startDeg)), y1 = cy + r * Math.sin(toRad(startDeg));
  const x2 = cx + r * Math.cos(toRad(endDeg)),   y2 = cy + r * Math.sin(toRad(endDeg));
  return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${(endDeg-startDeg)>180?1:0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1400);
}

// ─── RP input ─────────────────────────────────────────────────────────────────

function setRP(v) {
  state.form.rp = clamp(v);
  const el = document.getElementById('rp-display');
  el.textContent = fmtRP(state.form.rp);
  el.className = `rp-num ${rpCls(state.form.rp)}`;
}

function initRPSwipe() {
  const el = document.getElementById('rp-display');
  let startY = null, startVal = 0;
  el.addEventListener('touchstart', e => {
    startY = e.touches[0].clientY; startVal = state.form.rp; e.preventDefault();
  }, { passive: false });
  el.addEventListener('touchmove', e => {
    if (startY === null) return;
    // DOWN = +RP
    setRP(startVal + Math.round((startY - e.touches[0].clientY) / 3) * -1);
    e.preventDefault();
  }, { passive: false });
  el.addEventListener('touchend', () => { startY = null; });
  let down = false;
  el.addEventListener('mousedown', e => { down = true; startY = e.clientY; startVal = state.form.rp; });
  window.addEventListener('mousemove', e => { if (down) setRP(startVal + Math.round((e.clientY - startY) / 3)); });
  window.addEventListener('mouseup', () => { down = false; });
}

function initAdjButtons() {
  document.querySelectorAll('.adj-btn').forEach(btn => {
    const delta = Number(btn.dataset.delta);
    let timer, interval;
    const start = () => {
      setRP(state.form.rp + delta);
      timer = setTimeout(() => { interval = setInterval(() => setRP(state.form.rp + delta), 80); }, 350);
    };
    const stop = () => { clearTimeout(timer); clearInterval(interval); };
    btn.addEventListener('mousedown', start);
    btn.addEventListener('touchstart', e => { e.preventDefault(); start(); }, { passive: false });
    btn.addEventListener('mouseup', stop);
    btn.addEventListener('touchend', stop);
    btn.addEventListener('mouseleave', stop);
  });
}

// ─── Kill grid ────────────────────────────────────────────────────────────────

function buildKillGrid() {
  const grid = document.getElementById('kill-grid');
  for (let k = 0; k <= 20; k++) {
    const btn = document.createElement('button');
    btn.className = 'kill-btn' + (k === 0 ? ' active' : '');
    btn.textContent = k;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.kill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.form.kills = k;
    });
    grid.appendChild(btn);
  }
}

// ─── Party ────────────────────────────────────────────────────────────────────

function initParty() {
  document.querySelectorAll('#party-row .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#party-row .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.form.party = btn.dataset.party;
    });
  });
}

// ─── Character select ─────────────────────────────────────────────────────────

function buildCharSelect() {
  const wrap = document.getElementById('char-select-wrap');
  const sel = document.createElement('select');
  sel.className = 'char-select';
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = '— 選択 —';
  sel.appendChild(blank);
  CHARACTERS.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    sel.appendChild(opt);
  });
  sel.value = state.config.lastCharacter || '';
  state.form.character = sel.value || null;
  sel.addEventListener('change', () => {
    state.form.character = sel.value || null;
  });
  wrap.appendChild(sel);
}

// ─── Tag grids (2-row, 4 cols) ────────────────────────────────────────────────

function buildTagGrid(containerId, tags, key) {
  const container = document.getElementById(containerId);
  const wrap = document.createElement('div');
  wrap.className = 'tag-grid-2row';
  tags.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'tag-btn';
    btn.textContent = tag.label;
    btn.dataset.id = tag.id;
    btn.addEventListener('click', () => {
      const arr = state.form[key];
      const i = arr.indexOf(tag.id);
      if (i >= 0) { arr.splice(i, 1); btn.classList.remove('active'); }
      else { arr.push(tag.id); btn.classList.add('active'); }
    });
    wrap.appendChild(btn);
  });
  container.appendChild(wrap);
}

// ─── Death cause ──────────────────────────────────────────────────────────────

function initDeathCause() {
  document.querySelectorAll('#death-cause-row .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const already = btn.classList.contains('active');
      document.querySelectorAll('#death-cause-row .seg-btn').forEach(b => b.classList.remove('active'));
      if (!already) {
        btn.classList.add('active');
        state.form.deathCause = btn.dataset.cause;
      } else {
        state.form.deathCause = null;
      }
    });
  });
}

// ─── Reset form ───────────────────────────────────────────────────────────────

function resetForm() {
  state.form = {
    rp: 0, kills: 0,
    party: state.config.lastParty || null,
    character: state.config.lastCharacter || null,
    emotions: [], ally: [], play: [],
    deathCause: null,
  };
  setRP(0);
  document.querySelectorAll('.kill-btn').forEach((b, i) => b.classList.toggle('active', i === 0));

  document.querySelectorAll('#party-row .seg-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.party === state.form.party);
  });

  const sel = document.querySelector('.char-select');
  if (sel) sel.value = state.form.character || '';

  document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('#death-cause-row .seg-btn').forEach(b => b.classList.remove('active'));

  const scroll = document.querySelector('#view-rec .view-scroll');
  if (scroll) scroll.scrollTop = 0;
}

// ─── Save ─────────────────────────────────────────────────────────────────────

function saveEntry() {
  const entry = {
    id:         Date.now(),
    date:       todayStr(),
    time:       nowTime(),
    rp:         state.form.rp,
    kills:      state.form.kills,
    party:      state.form.party || 'solo',
    character:  state.form.character || null,
    emotions:   [...state.form.emotions],
    ally:       [...state.form.ally],
    play:       [...state.form.play],
    deathCause: state.form.deathCause || null,
  };
  state.logs.push(entry);
  if (entry.party)     state.config.lastParty     = entry.party;
  if (entry.character) state.config.lastCharacter = entry.character;
  saveLogs();
  saveConfig();
  toast('SAVED');
  setTimeout(resetForm, 500);
}

// ─── Delete entry ─────────────────────────────────────────────────────────────

function deleteEntry(id) {
  state.logs = state.logs.filter(l => l.id !== id);
  saveLogs();
  renderRPLog();
  updateRankBanner();
}

// ─── Header date ──────────────────────────────────────────────────────────────

function updateRecDate() {
  const d = new Date();
  const dow = ['SUN','MON','TUE','WED','THU','FRI','SAT'][d.getDay()];
  document.getElementById('rec-date').textContent =
    `${d.getMonth()+1}.${pad(d.getDate())} ${dow}`;
}

// ─── Analysis card ────────────────────────────────────────────────────────────

function renderAnalysisCard() {
  const card = document.getElementById('analysis-card');
  if (!card) return;
  const today = todayStr();
  const todayLogs = state.logs.filter(l => l.date === today);
  if (todayLogs.length === 0) { card.innerHTML = ''; return; }

  const totalRP = todayLogs.reduce((s, l) => s + l.rp, 0);
  const avgRP   = Math.round(totalRP / todayLogs.length);
  const wins    = todayLogs.filter(l => l.rp > 0).length;
  const winRate = Math.round((wins / todayLogs.length) * 100);

  const topEmotion = (() => {
    const counts = {};
    todayLogs.forEach(l => l.emotions.forEach(id => { counts[id] = (counts[id] || 0) + 1; }));
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? EMOTION_TAGS.find(t => t.id === top[0])?.label : null;
  })();

  let status = '普通';
  if (avgRP >= 30) status = '絶好調';
  else if (avgRP >= 10) status = '好調';
  else if (avgRP >= 0) status = '普通';
  else if (avgRP >= -20) status = '不調';
  else status = '絶不調';

  card.innerHTML = `
    <div class="analysis-row">
      <span class="analysis-status">・${status}</span>
      <span class="analysis-sub">${todayLogs.length}試合 | 勝率${winRate}% | 平均${fmtRP(avgRP)}RP</span>
    </div>
    ${topEmotion ? `<div class="analysis-emo">主な感情: ${topEmotion}</div>` : ''}
  `;
}

// ─── RP log list ──────────────────────────────────────────────────────────────

function renderRPLogList() {
  const today = todayStr();
  const week  = daysAgoStr(6);
  let logs = [...state.logs].reverse();
  if (state.histFilter === 'today') logs = logs.filter(l => l.date === today);
  else if (state.histFilter === 'week') logs = logs.filter(l => l.date >= week);

  const list  = document.getElementById('rp-hist-list');
  const empty = document.getElementById('rp-hist-empty');
  list.innerHTML = '';

  if (logs.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  logs.forEach(log => {
    const item = document.createElement('div');
    item.className = 'hist-item';
    const partyLabel = { solo: 'SOLO', duo: 'DUO', full: 'FULL' }[log.party] || '';
    const charLabel  = log.character ? log.character : '';
    const emoLabels  = log.emotions.map(id => EMOTION_TAGS.find(t => t.id === id)?.label || '').filter(Boolean);
    const deathLabel = log.deathCause
      ? { isolated: '孤立', outgunned: '力負け', thirded: '漁夫', mistake: '戦略ミス' }[log.deathCause] || ''
      : '';
    const chips = [
      ...emoLabels.map(l => `<span class="mini-chip">${l}</span>`),
      charLabel ? `<span class="mini-chip">${charLabel}</span>` : '',
      deathLabel ? `<span class="mini-chip death">${deathLabel}</span>` : '',
    ].join('');

    item.innerHTML = `
      <div class="hist-rp ${rpCls(log.rp)}">${fmtRP(log.rp)}</div>
      <div class="hist-meta">
        <div class="hist-meta-top">${dayLabel(log.date)} ${log.time} · ${partyLabel} · ${log.kills}kill</div>
        <div class="hist-chips">${chips}</div>
      </div>
      <button class="entry-del-btn" data-id="${log.id}">×</button>`;
    item.querySelector('.entry-del-btn').addEventListener('click', () => deleteEntry(log.id));
    list.appendChild(item);
  });
}

// ─── Short log panels ─────────────────────────────────────────────────────────

function getSessionsInRange(hours) {
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  return state.logs.filter(l => l.id >= cutoff);
}

function renderShortPanel(panelId, hours, label) {
  const panel = document.getElementById(panelId);
  const logs  = getSessionsInRange(hours);
  if (logs.length === 0) {
    panel.innerHTML = `<div class="no-data">データがありません</div>`;
    return;
  }
  const totalRP = logs.reduce((s, l) => s + l.rp, 0);
  const avgRP   = Math.round(totalRP / logs.length);
  const wins    = logs.filter(l => l.rp > 0).length;
  panel.innerHTML = `
    <div class="short-log-card">
      <div class="short-log-label">${label}</div>
      <div class="short-stat-row">
        <div class="short-stat"><div class="short-stat-val ${rpCls(totalRP)}">${fmtRP(totalRP)}</div><div class="short-stat-lbl">合計RP</div></div>
        <div class="short-stat"><div class="short-stat-val ${rpCls(avgRP)}">${fmtRP(avgRP)}</div><div class="short-stat-lbl">平均RP</div></div>
        <div class="short-stat"><div class="short-stat-val">${logs.length}</div><div class="short-stat-lbl">試合数</div></div>
        <div class="short-stat"><div class="short-stat-val">${wins}</div><div class="short-stat-lbl">プラス</div></div>
      </div>
    </div>`;
}

// ─── Long log panels ──────────────────────────────────────────────────────────

function getMonthStr(offset) {
  const d = new Date();
  d.setMonth(d.getMonth() - offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function renderLongPanel(panelId, type) {
  const panel = document.getElementById(panelId);
  let logs, label;
  if (type === 'month') {
    const m = getMonthStr(0);
    logs  = state.logs.filter(l => l.date.startsWith(m));
    label = `${m.replace('-', '/')}`;
  } else if (type === 'prev') {
    const m = getMonthStr(1);
    logs  = state.logs.filter(l => l.date.startsWith(m));
    label = `${m.replace('-', '/')}`;
  } else {
    logs  = state.logs;
    label = '全期間';
  }

  if (logs.length === 0) {
    panel.innerHTML = `<div class="no-data">データがありません</div>`;
    return;
  }
  const totalRP = logs.reduce((s, l) => s + l.rp, 0);
  const avgRP   = Math.round(totalRP / logs.length);
  const wins    = logs.filter(l => l.rp > 0).length;
  const avgKill = (logs.reduce((s, l) => s + l.kills, 0) / logs.length).toFixed(1);
  panel.innerHTML = `
    <div class="short-log-card">
      <div class="short-log-label">${label}</div>
      <div class="short-stat-row">
        <div class="short-stat"><div class="short-stat-val ${rpCls(totalRP)}">${fmtRP(totalRP)}</div><div class="short-stat-lbl">合計RP</div></div>
        <div class="short-stat"><div class="short-stat-val ${rpCls(avgRP)}">${fmtRP(avgRP)}</div><div class="short-stat-lbl">平均RP</div></div>
        <div class="short-stat"><div class="short-stat-val">${logs.length}</div><div class="short-stat-lbl">試合数</div></div>
        <div class="short-stat"><div class="short-stat-val">${avgKill}</div><div class="short-stat-lbl">平均K</div></div>
      </div>
    </div>`;
}

// ─── Chara section ────────────────────────────────────────────────────────────

function renderCharaSection() {
  const list  = document.getElementById('chara-list');
  const empty = document.getElementById('chara-empty');
  list.innerHTML = '';

  const map = {};
  state.logs.forEach(l => {
    if (!l.character) return;
    if (!map[l.character]) map[l.character] = { rp: 0, kills: 0, count: 0, emotions: {} };
    map[l.character].rp    += l.rp;
    map[l.character].kills += l.kills;
    map[l.character].count += 1;
    l.emotions.forEach(id => {
      map[l.character].emotions[id] = (map[l.character].emotions[id] || 0) + 1;
    });
  });

  const chars = Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  if (chars.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  chars.forEach(([name, d]) => {
    const avgRP   = Math.round(d.rp / d.count);
    const avgKill = (d.kills / d.count).toFixed(1);
    const topEmo  = Object.entries(d.emotions).sort((a, b) => b[1] - a[1])[0];
    const topEmoLabel = topEmo ? EMOTION_TAGS.find(t => t.id === topEmo[0])?.label || '' : '—';
    const item = document.createElement('div');
    item.className = 'chara-item';
    item.innerHTML = `
      <div class="chara-name">${name}</div>
      <div class="chara-stats">
        <span class="chara-stat">${d.count}試合</span>
        <span class="chara-stat ${rpCls(avgRP)}">${fmtRP(avgRP)} avg RP</span>
        <span class="chara-stat">${avgKill} avg K</span>
        <span class="chara-stat">${topEmoLabel}</span>
      </div>`;
    list.appendChild(item);
  });
}

// ─── RP section tabs ──────────────────────────────────────────────────────────

function showRPSection(name) {
  state.rpSection = name;
  document.querySelectorAll('#rp-section-tabs .seg-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.rpsection === name);
  });
  document.getElementById('rp-log-section').classList.toggle('hidden', name !== 'log');
  document.getElementById('rp-analysis-section').classList.toggle('hidden', name !== 'analysis');
  document.getElementById('rp-chara-section').classList.toggle('hidden', name !== 'chara');

  if (name === 'analysis') renderAnalysisSection();
  if (name === 'chara')    renderCharaSection();
}

function renderPartyAnalysis() {
  const el = document.getElementById('party-analysis-section');
  if (!el) return;

  const parties = [
    { key: 'solo', label: 'SOLO' },
    { key: 'duo',  label: 'DUO'  },
    { key: 'full', label: 'FULL' },
  ];

  el.innerHTML = `<div class="graph-title" style="margin-bottom:10px">パーティ別</div>` +
    parties.map(({ key, label }) => {
      const logs = state.logs.filter(l => l.party === key);
      if (logs.length === 0) {
        return `<div class="party-row">
          <span class="party-label">${label}</span>
          <span class="party-stat">—</span>
        </div>`;
      }
      const avgRP   = Math.round(logs.reduce((s, l) => s + l.rp, 0) / logs.length);
      const winRate = Math.round((logs.filter(l => l.rp > 0).length / logs.length) * 100);
      const avgKill = (logs.reduce((s, l) => s + l.kills, 0) / logs.length).toFixed(1);
      return `<div class="party-row">
        <span class="party-label">${label}</span>
        <span class="party-stat">${logs.length}試合</span>
        <span class="party-stat ${rpCls(avgRP)}">${fmtRP(avgRP)} avg</span>
        <span class="party-stat">K ${avgKill}</span>
        <span class="party-stat">勝率 ${winRate}%</span>
      </div>`;
    }).join('');
}

function renderPersonalityTendency() {
  const el = document.getElementById('personality-section');
  if (!el) return;
  const today = todayStr();
  const logs  = state.logs.filter(l => l.date === today);

  if (logs.length === 0) {
    el.innerHTML = `<div class="graph-title" style="margin-bottom:6px">本日の人格</div>
      <div class="trait-row"><span class="trait-detail" style="color:var(--muted)">記録がありません</span></div>`;
    return;
  }

  const n = logs.length;
  const traits = [];

  const emoRate = id => logs.filter(l => l.emotions.includes(id)).length / n;
  const allyRate = id => logs.filter(l => l.ally.includes(id)).length / n;
  const playRate = id => logs.filter(l => l.play.includes(id)).length / n;

  // Emotion — lowest threshold so it always fires with 1 log
  const angry      = emoRate('angry');
  const calm       = emoRate('calm');
  const hot        = emoRate('hot');
  const tired      = emoRate('tired');
  const inertia    = emoRate('inertia');
  const aggressive = emoRate('aggressive');

  if (angry > 0)
    traits.push({ label: '焦燥感あり', detail: `イライラ入力: ${Math.round(angry*100)}%` });
  else if (calm >= 0.5)
    traits.push({ label: '冷静さ維持', detail: `冷静入力: ${Math.round(calm*100)}%` });

  if (hot > 0)
    traits.push({ label: 'ノリが良い', detail: `ノッてる入力: ${Math.round(hot*100)}%` });

  if (tired > 0)
    traits.push({ label: '疲労感あり', detail: `疲れてる入力: ${Math.round(tired*100)}%` });

  if (inertia > 0)
    traits.push({ label: '惰性プレイ傾向', detail: `惰性入力: ${Math.round(inertia*100)}%` });

  // Ally — user-friendly framing
  const weakAllyLogs   = logs.filter(l => l.ally.includes('weak') || l.ally.includes('toxic'));
  const strongAllyLogs = logs.filter(l => l.ally.includes('strong') || l.ally.includes('synergy'));
  if (weakAllyLogs.length > 0) {
    const avgRPWeak = Math.round(weakAllyLogs.reduce((s, l) => s + l.rp, 0) / weakAllyLogs.length);
    traits.push({ label: '味方弱い入力あり', detail: `その時の平均RP: ${fmtRP(avgRPWeak)}` });
  }
  if (strongAllyLogs.length > 0) {
    const avgRPStrong = Math.round(strongAllyLogs.reduce((s, l) => s + l.rp, 0) / strongAllyLogs.length);
    traits.push({ label: '味方強い入力あり', detail: `その時の平均RP: ${fmtRP(avgRPStrong)}` });
  }

  // Play style
  if (playRate('aggro') > 0)
    traits.push({ label: '単独行動傾向', detail: `突っ込み入力: ${Math.round(playRate('aggro')*100)}%` });
  if (playRate('passive') > 0)
    traits.push({ label: '慎重プレイ傾向', detail: `慎重入力: ${Math.round(playRate('passive')*100)}%` });

  // Session trend (need 2+ logs)
  if (n >= 2) {
    const half      = Math.ceil(n / 2);
    const avgFirst  = logs.slice(0, half).reduce((s, l) => s + l.rp, 0) / half;
    const avgSecond = logs.slice(half).reduce((s, l) => s + l.rp, 0) / (n - half);
    const diff = avgSecond - avgFirst;
    if (diff > 15)
      traits.push({ label: '後半に調子上がる', detail: `前半 ${fmtRP(Math.round(avgFirst))} → 後半 ${fmtRP(Math.round(avgSecond))}` });
    else if (diff < -15)
      traits.push({ label: '後半に失速', detail: `前半 ${fmtRP(Math.round(avgFirst))} → 後半 ${fmtRP(Math.round(avgSecond))}` });
  }

  const header = `<div class="graph-title" style="margin-bottom:10px">本日の人格 <span style="font-weight:400;letter-spacing:0">(${n}試合)</span></div>`;

  if (traits.length === 0) {
    el.innerHTML = header +
      `<div class="trait-row"><span class="trait-detail">タグを入力すると傾向が表示されます</span></div>`;
    return;
  }

  el.innerHTML = header +
    traits.map(t => `
      <div class="trait-row">
        <span class="trait-label">・${t.label}</span>
        <span class="trait-detail">${t.detail}</span>
      </div>`).join('');
}

// ─── Long-term correlation analysis ──────────────────────────────────────────

function renderLongTermAnalysis() {
  const el = document.getElementById('long-term-analysis-section');
  if (!el) return;

  const SECTIONS = [
    { title: '感情と成績',   tags: EMOTION_TAGS, field: 'emotions' },
    { title: '味方と成績',   tags: ALLY_TAGS,    field: 'ally'     },
    { title: '動きと成績',   tags: PLAY_TAGS,    field: 'play'     },
  ];

  el.innerHTML = `<div class="graph-title" style="margin-bottom:14px">長期分析</div>`;

  let anyData = false;

  SECTIONS.forEach(({ title, tags, field }) => {
    const rows = tags.map(tag => {
      const logs = state.logs.filter(l => Array.isArray(l[field]) && l[field].includes(tag.id));
      if (!logs.length) return null;
      const avgRP   = Math.round(logs.reduce((s, l) => s + l.rp, 0) / logs.length);
      const winRate = Math.round(logs.filter(l => l.rp > 0).length / logs.length * 100);
      return { label: tag.label, avgRP, winRate, count: logs.length };
    }).filter(Boolean).sort((a, b) => b.avgRP - a.avgRP);

    if (!rows.length) return;
    anyData = true;

    const maxAbs = Math.max(...rows.map(r => Math.abs(r.avgRP)), 1);

    el.innerHTML += `<div class="insight-block">
      <div class="insight-subtitle">${title}</div>
      ${rows.map(r => {
        const barW  = Math.round((Math.abs(r.avgRP) / maxAbs) * 64);
        const color = r.avgRP >= 0 ? 'var(--pos)' : 'var(--neg)';
        return `<div class="insight-row">
          <span class="insight-tag">${r.label}</span>
          <span class="insight-bar-wrap">
            <span class="insight-bar" style="width:${barW}px;background:${color}"></span>
          </span>
          <span class="insight-rp ${rpCls(r.avgRP)}">${fmtRP(r.avgRP)}</span>
          <span class="insight-win">${r.winRate}%</span>
          <span class="insight-n">${r.count}試合</span>
        </div>`;
      }).join('')}
    </div>`;
  });

  if (!anyData) {
    el.innerHTML += `<div class="insight-empty">タグを記録すると傾向が分析されます</div>`;
  }
}

function renderAnalysisSection() {
  renderShortPanel('short-p0', 1,  '過去1時間');
  renderShortPanel('short-p1', 3,  '過去3時間');
  renderShortPanel('short-p2', 6,  '過去6時間');
  renderLongPanel('long-p0', 'month');
  renderLongPanel('long-p1', 'prev');
  renderLongPanel('long-p2', 'all');
  renderPartyAnalysis();
  renderPersonalityTendency();
  renderLongTermAnalysis();
}

// ─── RP LOG render ────────────────────────────────────────────────────────────

function renderRPLog() {
  updateRankBanner();
  renderAnalysisCard();
  renderRPLogList();
}

// ─── BR LOG ───────────────────────────────────────────────────────────────────

function renderBRLog() {
  const logs = state.logs;
  const n = logs.length;

  document.getElementById('br-total').textContent = n;
  if (n === 0) {
    document.getElementById('br-avg-kill').textContent = '0.0';
    document.getElementById('br-max-kill').textContent = '0';
    ['br-kill-chart','br-death-chart','br-chara-kill-chart','br-chara-rp-chart']
      .forEach(id => { document.getElementById(id).innerHTML = '<div class="no-data">データがありません</div>'; });
    return;
  }

  const totalKills = logs.reduce((s, l) => s + l.kills, 0);
  const maxKills   = Math.max(...logs.map(l => l.kills));
  document.getElementById('br-avg-kill').textContent = (totalKills / n).toFixed(1);
  document.getElementById('br-max-kill').textContent = maxKills;

  // Kill distribution
  const killDist = {};
  logs.forEach(l => { killDist[l.kills] = (killDist[l.kills] || 0) + 1; });
  const killMax = Math.max(...Object.keys(killDist).map(Number));
  const killData = Array.from({ length: killMax + 1 }, (_, k) => ({
    label: String(k), value: killDist[k] || 0,
  }));
  const killEl = document.getElementById('br-kill-chart');
  killEl.innerHTML = '';
  killEl.appendChild(buildBarSVG(killData, { allPositive: true }));

  // Death cause distribution
  const deathMap = { isolated: '孤立', outgunned: '力負け', thirded: '漁夫', mistake: '戦略ミス' };
  const deathData = Object.entries(deathMap).map(([k, label]) => ({
    label, value: logs.filter(l => l.deathCause === k).length,
  })).filter(d => d.value > 0);
  const deathEl = document.getElementById('br-death-chart');
  deathEl.innerHTML = '';
  if (deathData.length > 0) {
    deathEl.appendChild(buildBarSVG(deathData, { allPositive: true }));
  } else {
    deathEl.innerHTML = '<div class="no-data">データがありません</div>';
  }

  // Char kill / RP
  const charMap = {};
  logs.forEach(l => {
    if (!l.character) return;
    if (!charMap[l.character]) charMap[l.character] = { kills: 0, rp: 0, count: 0 };
    charMap[l.character].kills += l.kills;
    charMap[l.character].rp    += l.rp;
    charMap[l.character].count += 1;
  });
  const charEntries = Object.entries(charMap).sort((a, b) => b[1].count - a[1].count).slice(0, 8);

  const charKillData = charEntries.map(([name, d]) => ({
    label: name.slice(0, 4), value: +(d.kills / d.count).toFixed(1),
  }));
  const charRPData = charEntries.map(([name, d]) => ({
    label: name.slice(0, 4), value: Math.round(d.rp / d.count),
  }));

  const ckEl = document.getElementById('br-chara-kill-chart');
  ckEl.innerHTML = '';
  const crEl = document.getElementById('br-chara-rp-chart');
  crEl.innerHTML = '';
  if (charKillData.length > 0) {
    ckEl.appendChild(buildBarSVG(charKillData, { allPositive: true }));
    crEl.appendChild(buildBarSVG(charRPData));
  } else {
    ckEl.innerHTML = '<div class="no-data">データがありません</div>';
    crEl.innerHTML = '<div class="no-data">データがありません</div>';
  }
}

// ─── Graph data helpers ───────────────────────────────────────────────────────

function getFilteredLogs(period) {
  const today = todayStr();
  if (period === 'day')   return state.logs.filter(l => l.date === today);
  if (period === 'week')  return state.logs.filter(l => l.date >= daysAgoStr(6));
  if (period === 'month') return state.logs.filter(l => l.date >= daysAgoStr(29));
  return state.logs;
}

function rpInHours(logs, minH, maxH) {
  return logs
    .filter(l => { const h = +l.time.split(':')[0]; return h >= minH && h < maxH; })
    .reduce((s, l) => s + l.rp, 0);
}

function countInHours(logs, minH, maxH) {
  return logs.filter(l => { const h = +l.time.split(':')[0]; return h >= minH && h < maxH; }).length;
}

function getAMPMData(period) {
  const logs = getFilteredLogs(period);
  return [
    { label: '午前\n0-12',  value: rpInHours(logs, 0,  12) },
    { label: '午後\n12-24', value: rpInHours(logs, 12, 24) },
  ];
}

function get4SlotData(period) {
  const logs = getFilteredLogs(period);
  return TIME_SLOTS_4.map(s => ({ label: s.label, value: rpInHours(logs, s.min, s.max) }));
}

function getHourlyData(period) {
  const logs = getFilteredLogs(period);
  return Array.from({ length: 24 }, (_, h) => ({
    label: String(h),
    value: rpInHours(logs, h, h + 1),
    count: countInHours(logs, h, h + 1),
  }));
}

function getPieData() {
  const counts = {};
  state.logs.forEach(l => l.emotions.forEach(id => { counts[id] = (counts[id] || 0) + 1; }));
  return EMOTION_TAGS.filter(t => counts[t.id])
    .map(t => ({ ...t, count: counts[t.id] }))
    .sort((a, b) => b.count - a.count);
}

function getEmotionCountData() {
  const counts = {};
  state.logs.forEach(l => l.emotions.forEach(id => { counts[id] = (counts[id] || 0) + 1; }));
  return EMOTION_TAGS.filter(t => counts[t.id])
    .map(t => ({ label: t.label, value: counts[t.id] }))
    .sort((a, b) => b.value - a.value);
}

function getEmotionRPData() {
  const rpMap = {};
  state.logs.forEach(l => l.emotions.forEach(id => {
    if (!rpMap[id]) rpMap[id] = [];
    rpMap[id].push(l.rp);
  }));
  return EMOTION_TAGS.filter(t => rpMap[t.id])
    .map(t => ({
      label: t.label,
      value: Math.round(rpMap[t.id].reduce((s, v) => s + v, 0) / rpMap[t.id].length),
    }))
    .sort((a, b) => b.value - a.value);
}

// ─── Bar popup ────────────────────────────────────────────────────────────────

function showBarPopup(text, x, y) {
  const popup = document.getElementById('chart-popup');
  popup.textContent = text;
  popup.classList.remove('hidden');
  const pw = popup.offsetWidth, ph = popup.offsetHeight;
  popup.style.left = `${Math.max(8, Math.min(window.innerWidth - pw - 8, x - pw / 2))}px`;
  popup.style.top  = `${Math.max(8, y - ph - 10)}px`;
  clearTimeout(popup._timer);
  popup._timer = setTimeout(() => popup.classList.add('hidden'), 2000);
}

// ─── Bar SVG builder ──────────────────────────────────────────────────────────

function buildBarSVG(data, { noYLabels = false, allPositive = false, onBarClick = null } = {}) {
  const W = 320, H = 150;
  const PL = noYLabels ? 6 : 38, PR = 8, PT = 14, PB = noYLabels ? 24 : 36;
  const CW = W - PL - PR, CH = H - PT - PB;
  const maxAbs = Math.max(...data.map(d => Math.abs(d.value)), 1);
  const zeroY  = allPositive ? H - PB : PT + CH / 2;
  const halfH  = allPositive ? CH : CH / 2;

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });

  if (!noYLabels) {
    svg.appendChild(svgEl('line', { x1: PL, y1: PT, x2: PL, y2: H-PB, stroke: '#1a1714', 'stroke-width': 1 }));
    svg.appendChild(svgText(allPositive ? String(maxAbs) : fmtRP(maxAbs), { x: PL-4, y: PT+4, 'text-anchor': 'end', 'font-size': 8, fill: '#8a8680' }));
    if (!allPositive) svg.appendChild(svgText(fmtRP(-maxAbs), { x: PL-4, y: H-PB-2, 'text-anchor': 'end', 'font-size': 8, fill: '#8a8680' }));
    svg.appendChild(svgText('0', { x: PL-4, y: zeroY+4, 'text-anchor': 'end', 'font-size': 8, fill: '#8a8680' }));
  }
  svg.appendChild(svgEl('line', { x1: PL, y1: zeroY, x2: W-PR, y2: zeroY, stroke: '#1a1714', 'stroke-width': 1 }));

  const slotW = CW / data.length;
  const barW  = Math.min(slotW * 0.65, 60);
  const isHourly     = data.length === 24;
  const labelFontSize = isHourly ? 7 : 8.5;
  const valueFontSize = isHourly ? 7 : 9;
  const showValues    = !isHourly;

  data.forEach((d, i) => {
    const cx   = PL + (i + 0.5) * slotW;
    const x    = cx - barW / 2;
    const bH   = Math.max((Math.abs(d.value) / maxAbs) * (halfH - 2), 0);
    const isPos = d.value >= 0;
    const barY = allPositive ? zeroY - bH : isPos ? zeroY - bH : zeroY;

    if (bH > 0) {
      const rect = svgEl('rect', {
        x: x.toFixed(1), y: barY.toFixed(1),
        width: barW.toFixed(1), height: bH.toFixed(1),
        fill: (allPositive || isPos) ? '#1a1714' : 'none',
        stroke: '#1a1714', 'stroke-width': 1,
      });
      if (onBarClick) {
        rect.style.cursor = 'pointer';
        rect.addEventListener('click', e => onBarClick(d, e));
        rect.addEventListener('touchend', e => { e.preventDefault(); onBarClick(d, e.changedTouches[0]); });
      }
      svg.appendChild(rect);
    }

    // Transparent hit area for hourly bars
    if (isHourly && onBarClick) {
      const hit = svgEl('rect', {
        x: x.toFixed(1), y: PT.toFixed(1),
        width: barW.toFixed(1), height: CH.toFixed(1),
        fill: 'transparent',
      });
      hit.style.cursor = 'pointer';
      hit.addEventListener('click', e => onBarClick(d, e));
      hit.addEventListener('touchend', e => { e.preventDefault(); onBarClick(d, e.changedTouches[0]); });
      svg.appendChild(hit);
    }

    if (showValues && d.value !== 0) {
      svg.appendChild(svgText(allPositive ? String(d.value) : fmtRP(d.value), {
        x: cx.toFixed(1),
        y: (allPositive || isPos ? barY - 3 : barY + bH + 10).toFixed(1),
        'text-anchor': 'middle', 'font-size': valueFontSize, fill: '#1a1714', 'font-weight': 700,
      }));
    }

    if (!isHourly || i % 3 === 0) {
      const lines = (d.label || '').split('\n');
      const textEl = svgEl('text', { x: cx.toFixed(1), y: H-PB+12, 'text-anchor': 'middle', 'font-size': labelFontSize, fill: '#8a8680' });
      lines.forEach((line, li) => {
        const tspan = svgEl('tspan', { x: cx.toFixed(1), dy: li === 0 ? 0 : 10 });
        tspan.textContent = line;
        textEl.appendChild(tspan);
      });
      svg.appendChild(textEl);
    }
  });

  return svg;
}

// ─── Pie SVG builder ──────────────────────────────────────────────────────────

function buildPieSVG(data) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const CX = 75, CY = 78, R = 62;
  const svg = svgEl('svg', { viewBox: '0 0 300 158' });

  if (data.length === 1) {
    svg.appendChild(svgEl('circle', { cx: CX, cy: CY, r: R, fill: PIE_FILLS[0], stroke: '#ece9e0', 'stroke-width': 1 }));
  } else {
    let angle = -90;
    data.forEach((d, i) => {
      const sweep = (d.count / total) * 360;
      svg.appendChild(svgEl('path', {
        d: arcPath(CX, CY, R, angle, angle + sweep - 0.4),
        fill: PIE_FILLS[i % PIE_FILLS.length],
        stroke: '#ece9e0', 'stroke-width': 1.5,
      }));
      angle += sweep;
    });
  }

  data.slice(0, 7).forEach((d, i) => {
    const y = 16 + i * 20;
    const pct = Math.round((d.count / total) * 100);
    svg.appendChild(svgEl('rect', { x: 162, y: y-8, width: 10, height: 10, fill: PIE_FILLS[i % PIE_FILLS.length], stroke: '#1a1714', 'stroke-width': 0.5 }));
    svg.appendChild(svgText(d.label, { x: 177, y, 'font-size': 9.5, fill: '#1a1714' }));
    svg.appendChild(svgText(`${pct}%`, { x: 296, y, 'text-anchor': 'end', 'font-size': 9, fill: '#8a8680' }));
  });

  return svg;
}

// ─── Panel helpers ────────────────────────────────────────────────────────────

function setPanel(id, svgOrNull) {
  const el = document.getElementById(id);
  el.innerHTML = '';
  if (svgOrNull) {
    el.appendChild(svgOrNull);
  } else {
    const div = document.createElement('div');
    div.className = 'no-data';
    div.textContent = 'データがありません';
    el.appendChild(div);
  }
}

function hasData(data) { return data.some(d => d.value !== 0); }

// ─── Bar panels (order: hourly=p0 default=p1(4-slot)) ────────────────────────

function renderBarPanels() {
  const p = state.barPeriod;
  const hourly = getHourlyData(p);
  const slot4  = get4SlotData(p);

  const hourlyClick = (d, e) => {
    if (d.value === 0 && d.count === 0) return;
    const h = parseInt(d.label, 10);
    const text = `${pad(h)}:00-${pad(h+1)}:00 · RP: ${fmtRP(d.value)} (${d.count}試合)`;
    showBarPopup(text, e.clientX, e.clientY);
  };

  setPanel('bar-p0', hasData(hourly) ? buildBarSVG(hourly, { noYLabels: true, onBarClick: hourlyClick }) : null);
  setPanel('bar-p1', hasData(slot4)  ? buildBarSVG(slot4)                                               : null);
}

// ─── Emotion panels ───────────────────────────────────────────────────────────

function renderEmoPanels() {
  const pieData   = getPieData();
  const countData = getEmotionCountData();
  const rpData    = getEmotionRPData();
  // order: 感情分布(pie) → 回数 → 平均RP
  setPanel('emo-p0', pieData.length   ? buildPieSVG(pieData)                          : null);
  setPanel('emo-p1', rpData.length    ? buildBarSVG(rpData)                           : null);
  setPanel('emo-p2', countData.length ? buildBarSVG(countData, { allPositive: true }) : null);
}

// ─── H-scroll setup ───────────────────────────────────────────────────────────

function setupHScroll({ trackId, leftId, rightId, labelId, labels, initPanel = 0 }) {
  const track = document.getElementById(trackId);
  const left  = document.getElementById(leftId);
  const right = document.getElementById(rightId);
  const label = document.getElementById(labelId);
  const n = labels.length;

  function update() {
    const w = track.offsetWidth;
    if (!w) return;
    const idx = Math.max(0, Math.min(n - 1, Math.round(track.scrollLeft / w)));
    label.textContent = labels[idx];
    left.classList.toggle('dim', idx === 0);
    right.classList.toggle('dim', idx === n - 1);
  }

  track.addEventListener('scroll', update, { passive: true });
  left.addEventListener('click',  () => track.scrollBy({ left: -track.offsetWidth, behavior: 'smooth' }));
  right.addEventListener('click', () => track.scrollBy({ left:  track.offsetWidth, behavior: 'smooth' }));

  requestAnimationFrame(() => requestAnimationFrame(() => {
    track.scrollLeft = initPanel * track.offsetWidth;
    update();
  }));
}

// ─── Router ───────────────────────────────────────────────────────────────────

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById(`view-${name}`).classList.remove('hidden');
  document.querySelectorAll('#nav .nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === name);
  });

  if (name === 'rec')   updateRecDate();
  if (name === 'rp')    renderRPLog();
  if (name === 'br')    renderBRLog();
  if (name === 'graph') { renderBarPanels(); renderEmoPanels(); }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  state.logs   = loadLogs();
  state.config = loadConfig();

  initRPSwipe();
  initAdjButtons();
  buildKillGrid();
  initParty();
  buildCharSelect();
  buildTagGrid('emotion-tags', EMOTION_TAGS, 'emotions');
  buildTagGrid('ally-tags',    ALLY_TAGS,    'ally');
  buildTagGrid('play-tags',    PLAY_TAGS,    'play');
  initDeathCause();

  // Apply remembered defaults
  if (state.config.lastParty) {
    document.querySelectorAll('#party-row .seg-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.party === state.config.lastParty);
    });
    state.form.party = state.config.lastParty;
  }

  // Nav
  document.querySelectorAll('#nav .nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });

  // Save
  document.getElementById('btn-save').addEventListener('click', saveEntry);

  // RP filter
  document.querySelectorAll('#rp-filter-row .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#rp-filter-row .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.histFilter = btn.dataset.filter;
      renderRPLogList();
    });
  });

  // RP section tabs
  document.querySelectorAll('#rp-section-tabs .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => showRPSection(btn.dataset.rpsection));
  });

  // Bar period
  document.querySelectorAll('.period-row .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-row .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.barPeriod = btn.dataset.period;
      renderBarPanels();
    });
  });

  // Rank modal
  document.getElementById('rank-edit-btn').addEventListener('click', showRankModal);
  document.getElementById('rank-modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) hideRankModal();
  });
  document.getElementById('rank-save-btn').addEventListener('click', () => {
    const rankLP = parseInt(document.getElementById('rank-select').value, 10);
    const tierLP = parseInt(document.getElementById('rank-lp-input').value, 10) || 0;
    state.config.startingLP = rankLP + tierLP;
    saveConfig();
    hideRankModal();
    updateRankBanner();
  });

  // Chart popup dismiss
  document.addEventListener('click', e => {
    const popup = document.getElementById('chart-popup');
    if (!popup.classList.contains('hidden') && !popup.contains(e.target)) {
      popup.classList.add('hidden');
    }
  });

  // H-scroll setups
  // bar: hourly=p0, 4-slot=p1(default)
  setupHScroll({
    trackId: 'bar-track', leftId: 'bar-left', rightId: 'bar-right', labelId: 'bar-label',
    labels: ['1時間ごと', '朝昼夜深夜'],
    initPanel: 1,
  });
  // emo: 感情分布 → 平均RP → 回数
  setupHScroll({
    trackId: 'emo-track', leftId: 'emo-left', rightId: 'emo-right', labelId: 'emo-label',
    labels: ['感情分布', '平均RP', '回数'],
    initPanel: 0,
  });
  setupHScroll({
    trackId: 'short-track', leftId: 'short-left', rightId: 'short-right', labelId: 'short-label',
    labels: ['過去1h', '過去3h', '過去6h'],
    initPanel: 0,
  });
  setupHScroll({
    trackId: 'long-track', leftId: 'long-left', rightId: 'long-right', labelId: 'long-label',
    labels: ['今月', '先月', '全期間'],
    initPanel: 0,
  });

  showView('rec');
}

document.addEventListener('DOMContentLoaded', init);
