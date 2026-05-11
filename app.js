'use strict';

// ─── Tag definitions ──────────────────────────────────────────────────────────

const EMOTION_TAGS = [
  { id: 'hot',        emoji: '🙂', label: 'ノッてる' },
  { id: 'angry',      emoji: '😡', label: 'イライラ' },
  { id: 'calm',       emoji: '🧠', label: '冷静' },
  { id: 'aggressive', emoji: '🔥', label: 'ガンガン' },
  { id: 'careful',    emoji: '🐢', label: '安全第一' },
  { id: 'tired',      emoji: '😵', label: '疲れてる' },
  { id: 'focused',    emoji: '🎯', label: '集中してる' },
  { id: 'inertia',    emoji: '💀', label: '惰性' },
];

const ALLY_TAGS = [
  { id: 'synergy',  emoji: '🤝', label: '噛み合った' },
  { id: 'strong',   emoji: '💪', label: '強かった' },
  { id: 'normal',   emoji: '😐', label: '普通' },
  { id: 'weak',     emoji: '🫠', label: '弱かった' },
  { id: 'toxic',    emoji: '☠️', label: 'トキシック' },
  { id: 'carried',  emoji: '🧳', label: 'キャリーされた' },
  { id: 'vc_good',  emoji: '🎤', label: 'VC良かった' },
  { id: 'vc_none',  emoji: '🔇', label: '無言地獄' },
];

const PLAYSTYLE_TAGS = [
  { id: 'aggro',      emoji: '🚀', label: '突っ込み気味' },
  { id: 'passive',    emoji: '🛡',  label: '慎重' },
  { id: 'third',      emoji: '👀', label: '漁夫狙い' },
  { id: 'good_judge', emoji: '🧠', label: '判断良かった' },
  { id: 'gambling',   emoji: '🎰', label: '運ゲーしてた' },
  { id: 'unfocused',  emoji: '😴', label: '集中切れ' },
  { id: 'vc_active',  emoji: '📞', label: 'VC多め' },
];

const RP_PRESETS = [-48, -36, -24, -12, 0, 25, 50, 100, 150, 200, 250, 300];
const RP_MIN = -200;
const RP_MAX = 600;

// ─── State ────────────────────────────────────────────────────────────────────

const state = {
  logs: [],
  historyFilter: 'today',
  form: { rp: 0, kills: 0, party: null, emotions: [], ally: [], playstyle: [] },
};

// ─── Storage ──────────────────────────────────────────────────────────────────

function loadLogs() {
  try { return JSON.parse(localStorage.getItem('apex_logs') || '[]'); }
  catch { return []; }
}

function persistLogs() {
  localStorage.setItem('apex_logs', JSON.stringify(state.logs));
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nowTimeStr() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function pad(n) { return String(n).padStart(2, '0'); }

function fmtRP(n) { return n > 0 ? `+${n}` : String(n); }

function rpCls(n) { return n > 0 ? 'positive' : n < 0 ? 'negative' : 'zero'; }

function clampRP(v) { return Math.max(RP_MIN, Math.min(RP_MAX, v)); }

function weekAgoStr() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function avgOrNull(arr) {
  return arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : null;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1600);
}

// ─── RP display ───────────────────────────────────────────────────────────────

function setRP(value) {
  state.form.rp = clampRP(value);
  const el = document.getElementById('rp-display');
  el.textContent = fmtRP(state.form.rp);
  el.className = `rp-big ${rpCls(state.form.rp)}`;

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.value) === state.form.rp);
  });
}

// ─── Build RP presets ─────────────────────────────────────────────────────────

function buildRPPresets() {
  const container = document.getElementById('rp-presets');
  RP_PRESETS.forEach(v => {
    const btn = document.createElement('button');
    btn.className = 'preset-btn' + (v > 0 ? ' positive-val' : v < 0 ? ' negative-val' : '');
    btn.dataset.value = v;
    btn.textContent = fmtRP(v);
    btn.addEventListener('click', () => setRP(v));
    container.appendChild(btn);
  });
}

// ─── RP swipe gesture ─────────────────────────────────────────────────────────

function initRPSwipe() {
  const el = document.getElementById('rp-display');
  let startY = null;
  let startVal = 0;

  el.addEventListener('touchstart', e => {
    startY = e.touches[0].clientY;
    startVal = state.form.rp;
    e.preventDefault();
  }, { passive: false });

  el.addEventListener('touchmove', e => {
    if (startY === null) return;
    const dy = startY - e.touches[0].clientY;
    setRP(startVal + Math.round(dy / 4));
    e.preventDefault();
  }, { passive: false });

  el.addEventListener('touchend', () => { startY = null; });

  // Mouse fallback (desktop testing)
  let mouseDown = false;
  el.addEventListener('mousedown', e => {
    mouseDown = true;
    startY = e.clientY;
    startVal = state.form.rp;
  });
  window.addEventListener('mousemove', e => {
    if (!mouseDown) return;
    const dy = startY - e.clientY;
    setRP(startVal + Math.round(dy / 4));
  });
  window.addEventListener('mouseup', () => { mouseDown = false; });
}

// ─── Fine-tune buttons (hold to repeat) ──────────────────────────────────────

function initFineTune() {
  document.querySelectorAll('.fine-btn').forEach(btn => {
    const delta = Number(btn.dataset.delta);
    let timer = null;
    let interval = null;

    function start() {
      setRP(state.form.rp + delta);
      timer = setTimeout(() => {
        interval = setInterval(() => setRP(state.form.rp + delta), 80);
      }, 350);
    }

    function stop() {
      clearTimeout(timer);
      clearInterval(interval);
      timer = null;
      interval = null;
    }

    btn.addEventListener('mousedown', start);
    btn.addEventListener('touchstart', e => { e.preventDefault(); start(); }, { passive: false });
    btn.addEventListener('mouseup', stop);
    btn.addEventListener('touchend', stop);
    btn.addEventListener('mouseleave', stop);
  });
}

// ─── Kills grid ───────────────────────────────────────────────────────────────

function buildKillsGrid() {
  const grid = document.getElementById('kills-grid');
  for (let k = 0; k <= 20; k++) {
    const btn = document.createElement('button');
    btn.className = 'kill-btn' + (k === 0 ? ' active' : '');
    btn.textContent = k;
    btn.dataset.k = k;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.kill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.form.kills = k;
    });
    grid.appendChild(btn);
  }
}

// ─── Party buttons ────────────────────────────────────────────────────────────

function initPartyButtons() {
  document.querySelectorAll('.party-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.party-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.form.party = btn.dataset.party;
    });
  });
}

// ─── Tag grids ────────────────────────────────────────────────────────────────

function buildTagGrid(containerId, tags, key) {
  const container = document.getElementById(containerId);
  tags.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'tag-btn';
    btn.innerHTML = `${tag.emoji} ${tag.label}`;
    btn.dataset.id = tag.id;
    btn.addEventListener('click', () => {
      const arr = state.form[key];
      const i = arr.indexOf(tag.id);
      if (i >= 0) { arr.splice(i, 1); btn.classList.remove('active'); }
      else { arr.push(tag.id); btn.classList.add('active'); }
    });
    container.appendChild(btn);
  });
}

// ─── Reset form ───────────────────────────────────────────────────────────────

function resetForm() {
  state.form = { rp: 0, kills: 0, party: null, emotions: [], ally: [], playstyle: [] };

  setRP(0);

  document.querySelectorAll('.kill-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === 0);
  });
  document.querySelectorAll('.party-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));

  const content = document.getElementById('log-content');
  if (content) content.scrollTop = 0;
}

// ─── Save ─────────────────────────────────────────────────────────────────────

function saveLog() {
  const entry = {
    id:        Date.now(),
    date:      todayStr(),
    time:      nowTimeStr(),
    rp:        state.form.rp,
    kills:     state.form.kills,
    party:     state.form.party || 'solo',
    emotions:  [...state.form.emotions],
    ally:      [...state.form.ally],
    playstyle: [...state.form.playstyle],
  };

  state.logs.push(entry);
  persistLogs();
  showToast('✓ 保存しました');
  setTimeout(() => showView('home'), 600);
}

// ─── Render helpers ───────────────────────────────────────────────────────────

function renderEntryItem(log) {
  const div = document.createElement('div');
  div.className = 'entry-item';

  const emotionEmojis = log.emotions
    .map(id => EMOTION_TAGS.find(t => t.id === id)?.emoji || '')
    .join('');

  const partyLabel = { solo: '👤 ソロ', duo: '👥 デュオ', full: '🎮 フルパ' }[log.party] || '';

  const playchips = log.playstyle.slice(0, 2)
    .map(id => { const t = PLAYSTYLE_TAGS.find(t => t.id === id); return t ? `<span class="chip">${t.emoji} ${t.label}</span>` : ''; })
    .join('');

  div.innerHTML = `
    <div class="entry-rp ${rpCls(log.rp)}">${fmtRP(log.rp)}</div>
    <div class="entry-meta">
      <div class="entry-meta-top">${log.date} ${log.time} · ${partyLabel} · ${log.kills}kill</div>
      <div class="entry-chips">
        ${emotionEmojis ? `<span class="chip">${emotionEmojis}</span>` : ''}
        ${playchips}
      </div>
    </div>`;
  return div;
}

// ─── Home view ────────────────────────────────────────────────────────────────

function renderHome() {
  const today = todayStr();
  const d = new Date();
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  document.getElementById('home-date').textContent =
    `${d.getMonth() + 1}月${d.getDate()}日 (${days[d.getDay()]})`;

  const todayLogs = state.logs.filter(l => l.date === today);
  const hasToday = todayLogs.length > 0;

  document.getElementById('home-today-card').classList.toggle('hidden', !hasToday);
  document.getElementById('home-empty').classList.toggle('hidden', hasToday);
  document.getElementById('recent-section').classList.toggle('hidden', !hasToday);

  if (!hasToday) return;

  const totalRP = todayLogs.reduce((s, l) => s + l.rp, 0);
  const rpEl = document.getElementById('today-rp');
  rpEl.textContent = fmtRP(totalRP);
  rpEl.className = `stat-value ${rpCls(totalRP)}`;
  document.getElementById('today-sessions').textContent = todayLogs.length;

  const emotionCounts = {};
  todayLogs.forEach(l => l.emotions.forEach(e => { emotionCounts[e] = (emotionCounts[e] || 0) + 1; }));
  const top = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0];
  document.getElementById('today-mood').textContent =
    top ? (EMOTION_TAGS.find(t => t.id === top[0])?.emoji || '—') : '—';

  const list = document.getElementById('recent-list');
  list.innerHTML = '';
  [...state.logs].reverse().slice(0, 3).forEach(log => list.appendChild(renderEntryItem(log)));
}

// ─── History view ─────────────────────────────────────────────────────────────

function renderHistory() {
  const today = todayStr();
  const week = weekAgoStr();

  let logs = [...state.logs].reverse();
  if (state.historyFilter === 'today') logs = logs.filter(l => l.date === today);
  else if (state.historyFilter === 'week') logs = logs.filter(l => l.date >= week);

  const list = document.getElementById('history-list');
  const empty = document.getElementById('history-empty');
  list.innerHTML = '';

  if (logs.length === 0) {
    empty.classList.remove('hidden');
  } else {
    empty.classList.add('hidden');
    logs.forEach(log => list.appendChild(renderEntryItem(log)));
  }
}

// ─── Stats / personality ──────────────────────────────────────────────────────

function renderStats() {
  renderPersonality();
  renderBarChart('chart-emotion', buildEmotionData());
  renderBarChart('chart-party',   buildPartyData());
  renderBarChart('chart-time',    buildTimeData());
}

function renderPersonality() {
  const today = todayStr();
  const logs = state.logs.filter(l => l.date === today);
  const textEl = document.getElementById('personality-text');
  const tagsEl = document.getElementById('personality-tags');
  tagsEl.innerHTML = '';

  if (logs.length === 0) {
    textEl.textContent = 'データを記録すると分析が表示されます';
    return;
  }

  const totalRP = logs.reduce((s, l) => s + l.rp, 0);
  const avgRP = Math.round(totalRP / logs.length);

  const emotionCounts = {};
  logs.forEach(l => l.emotions.forEach(e => { emotionCounts[e] = (emotionCounts[e] || 0) + 1; }));
  const allyCounts = {};
  logs.forEach(l => l.ally.forEach(e => { allyCounts[e] = (allyCounts[e] || 0) + 1; }));

  const lines = [];

  if      (avgRP >= 100) lines.push('・絶好調。完全に盛れてる');
  else if (avgRP >= 50)  lines.push('・調子いい。安定して盛れてる');
  else if (avgRP >= 1)   lines.push('・プラス収支で安定');
  else if (avgRP === 0)  lines.push('・プラマイゼロ。ギリギリの攻防');
  else if (avgRP >= -30) lines.push('・やや苦戦中');
  else                   lines.push('・厳しい状況が続いてる');

  if (emotionCounts['angry'])    lines.push('・イライラが出てきてる');
  if (emotionCounts['tired'])    lines.push('・疲れが見える');
  if (emotionCounts['focused'])  lines.push('・集中モード継続中');
  if (emotionCounts['inertia'])  lines.push('・惰性気味、目的を見失いがち');
  if (emotionCounts['hot'])      lines.push('・ノリがいい状態');
  if (allyCounts['toxic'])       lines.push('・今日は味方運がよくない');
  if (allyCounts['synergy'])     lines.push('・味方との連携がいい');
  if (logs.length >= 5)          lines.push(`・本日 ${logs.length} 試合目`);

  textEl.textContent = lines.join('\n');

  const topEmotions = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([id]) => EMOTION_TAGS.find(t => t.id === id)).filter(Boolean);

  topEmotions.forEach(t => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = `${t.emoji} ${t.label}`;
    tagsEl.appendChild(chip);
  });
}

function buildEmotionData() {
  const map = {};
  state.logs.forEach(log => {
    log.emotions.forEach(id => {
      if (!map[id]) map[id] = [];
      map[id].push(log.rp);
    });
  });
  return Object.entries(map).map(([id, rps]) => {
    const tag = EMOTION_TAGS.find(t => t.id === id);
    return { label: tag ? `${tag.emoji} ${tag.label}` : id, avg: avgOrNull(rps) };
  }).sort((a, b) => b.avg - a.avg);
}

function buildPartyData() {
  const map = { solo: [], duo: [], full: [] };
  state.logs.forEach(l => { if (map[l.party]) map[l.party].push(l.rp); });
  const labels = { solo: '👤 ソロ', duo: '👥 デュオ', full: '🎮 フルパ' };
  return Object.entries(map)
    .map(([k, rps]) => ({ label: labels[k], avg: avgOrNull(rps) }))
    .filter(e => e.avg !== null)
    .sort((a, b) => b.avg - a.avg);
}

function buildTimeData() {
  const slots = [
    { label: '🌅 朝 (6-12時)',   min: 6,  max: 12, rps: [] },
    { label: '☀️ 昼 (12-18時)', min: 12, max: 18, rps: [] },
    { label: '🌙 夜 (18-24時)', min: 18, max: 24, rps: [] },
    { label: '🌃 深夜 (0-6時)', min: 0,  max: 6,  rps: [] },
  ];
  state.logs.forEach(l => {
    const h = Number(l.time.split(':')[0]);
    const slot = slots.find(s => h >= s.min && h < s.max);
    if (slot) slot.rps.push(l.rp);
  });
  return slots
    .filter(s => s.rps.length > 0)
    .map(s => ({ label: `${s.label} (${s.rps.length})`, avg: avgOrNull(s.rps) }))
    .sort((a, b) => b.avg - a.avg);
}

function renderBarChart(containerId, data) {
  const el = document.getElementById(containerId);
  el.innerHTML = '';

  if (data.length === 0) {
    el.innerHTML = '<div class="no-data">データ不足</div>';
    return;
  }

  const maxAbs = Math.max(...data.map(d => Math.abs(d.avg)), 1);

  data.forEach(d => {
    const pct = (Math.abs(d.avg) / maxAbs) * 100;
    const cls = d.avg >= 0 ? 'pos' : 'neg';
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `
      <div class="bar-label">${d.label}</div>
      <div class="bar-track"><div class="bar-fill ${cls}" style="width:0%"></div></div>
      <div class="bar-value ${cls}">${fmtRP(d.avg)}</div>`;
    el.appendChild(row);
    // Animate in
    requestAnimationFrame(() => {
      row.querySelector('.bar-fill').style.width = `${pct}%`;
    });
  });
}

// ─── Router ───────────────────────────────────────────────────────────────────

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById(`view-${name}`).classList.remove('hidden');
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === name);
  });

  if (name === 'home')    renderHome();
  if (name === 'log')     resetForm();
  if (name === 'history') renderHistory();
  if (name === 'stats')   renderStats();
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  state.logs = loadLogs();

  buildRPPresets();
  initRPSwipe();
  initFineTune();
  buildKillsGrid();
  initPartyButtons();
  buildTagGrid('emotion-tags',   EMOTION_TAGS,    'emotions');
  buildTagGrid('ally-tags',      ALLY_TAGS,       'ally');
  buildTagGrid('playstyle-tags', PLAYSTYLE_TAGS,  'playstyle');

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });

  document.getElementById('btn-go-log').addEventListener('click', () => showView('log'));
  document.getElementById('log-back').addEventListener('click', () => showView('home'));
  document.getElementById('btn-save').addEventListener('click', saveLog);

  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.historyFilter = tab.dataset.filter;
      renderHistory();
    });
  });

  document.getElementById('clear-all-btn').addEventListener('click', () => {
    if (!confirm('全ての記録を削除しますか？')) return;
    state.logs = [];
    persistLogs();
    renderHistory();
    showToast('削除しました');
  });

  showView('home');
}

document.addEventListener('DOMContentLoaded', init);
