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
  { id: 'synergy', emoji: '🤝', label: '噛み合った' },
  { id: 'strong',  emoji: '💪', label: '強かった' },
  { id: 'normal',  emoji: '😐', label: '普通' },
  { id: 'weak',    emoji: '🫠', label: '弱かった' },
  { id: 'toxic',   emoji: '☠️', label: 'トキシック' },
  { id: 'carried', emoji: '🧳', label: 'キャリーされた' },
  { id: 'vc_good', emoji: '🎤', label: 'VC良かった' },
  { id: 'vc_none', emoji: '🔇', label: '無言地獄' },
];

const PLAY_TAGS = [
  { id: 'aggro',      emoji: '🚀', label: '突っ込み気味' },
  { id: 'passive',    emoji: '🛡',  label: '慎重' },
  { id: 'third',      emoji: '👀', label: '漁夫狙い' },
  { id: 'good_judge', emoji: '🧠', label: '判断良かった' },
  { id: 'gambling',   emoji: '🎰', label: '運ゲーしてた' },
  { id: 'unfocused',  emoji: '😴', label: '集中切れ' },
  { id: 'vc_active',  emoji: '📞', label: 'VC多め' },
];

const RP_MIN = -200;
const RP_MAX = 600;

// Grayscale fills for pie chart segments (8 shades, dark→light)
const PIE_FILLS = ['#1a1714', '#332e2a', '#4d4844', '#66615c', '#807b76', '#999490', '#b3aeaa', '#ccc9c5'];

// ─── State ────────────────────────────────────────────────────────────────────

const state = {
  logs: [],
  histFilter: 'today',
  barPeriod: 'day',
  form: { rp: 0, kills: 0, party: null, emotions: [], ally: [], play: [] },
};

// ─── Storage ──────────────────────────────────────────────────────────────────

function loadLogs() {
  try { return JSON.parse(localStorage.getItem('apex_logs') || '[]'); }
  catch { return []; }
}

function saveLogs() {
  localStorage.setItem('apex_logs', JSON.stringify(state.logs));
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function pad(n) { return String(n).padStart(2, '0'); }

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nowTime() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtRP(n) { return n > 0 ? `+${n}` : String(n); }

function rpCls(n) { return n > 0 ? 'pos' : n < 0 ? 'neg' : ''; }

function clamp(v) { return Math.max(RP_MIN, Math.min(RP_MAX, v)); }

function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dayLabel(dateStr) {
  const [, m, d] = dateStr.split('-');
  const dow = ['日', '月', '火', '水', '木', '金', '土'][new Date(dateStr).getDay()];
  return `${parseInt(m)}/${parseInt(d)}(${dow})`;
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
  const x1 = cx + r * Math.cos(toRad(startDeg));
  const y1 = cy + r * Math.sin(toRad(startDeg));
  const x2 = cx + r * Math.cos(toRad(endDeg));
  const y2 = cy + r * Math.sin(toRad(endDeg));
  const large = (endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
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
    startY = e.touches[0].clientY;
    startVal = state.form.rp;
    e.preventDefault();
  }, { passive: false });

  el.addEventListener('touchmove', e => {
    if (startY === null) return;
    setRP(startVal + Math.round((startY - e.touches[0].clientY) / 3));
    e.preventDefault();
  }, { passive: false });

  el.addEventListener('touchend', () => { startY = null; });

  // Mouse fallback
  let down = false;
  el.addEventListener('mousedown', e => { down = true; startY = e.clientY; startVal = state.form.rp; });
  window.addEventListener('mousemove', e => { if (down) setRP(startVal + Math.round((startY - e.clientY) / 3)); });
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
  state.form = { rp: 0, kills: 0, party: null, emotions: [], ally: [], play: [] };
  setRP(0);
  document.querySelectorAll('.kill-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
  document.querySelectorAll('#party-row .seg-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
  const scroll = document.getElementById('view-rec').querySelector('.view-scroll');
  if (scroll) scroll.scrollTop = 0;
}

// ─── Save ─────────────────────────────────────────────────────────────────────

function saveEntry() {
  const entry = {
    id:       Date.now(),
    date:     todayStr(),
    time:     nowTime(),
    rp:       state.form.rp,
    kills:    state.form.kills,
    party:    state.form.party || 'solo',
    emotions: [...state.form.emotions],
    ally:     [...state.form.ally],
    play:     [...state.form.play],
  };
  state.logs.push(entry);
  saveLogs();
  toast('SAVED');
  setTimeout(resetForm, 500);
}

// ─── Header date ──────────────────────────────────────────────────────────────

function updateRecDate() {
  const d = new Date();
  const dow = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()];
  document.getElementById('rec-date').textContent =
    `${d.getMonth() + 1}.${pad(d.getDate())} ${dow}`;
}

// ─── History view ─────────────────────────────────────────────────────────────

function renderHist() {
  const today = todayStr();
  const week  = daysAgoStr(6);
  let logs = [...state.logs].reverse();
  if (state.histFilter === 'today') logs = logs.filter(l => l.date === today);
  else if (state.histFilter === 'week') logs = logs.filter(l => l.date >= week);

  const list  = document.getElementById('hist-list');
  const empty = document.getElementById('hist-empty');
  list.innerHTML = '';

  if (logs.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  logs.forEach(log => {
    const item = document.createElement('div');
    item.className = 'hist-item';

    const emotionEmoji = log.emotions
      .map(id => EMOTION_TAGS.find(t => t.id === id)?.emoji || '')
      .join('');

    const partyLabel = { solo: 'SOLO', duo: 'DUO', full: 'FULL' }[log.party] || '';

    const playChips = log.play.slice(0, 2)
      .map(id => { const t = PLAY_TAGS.find(t => t.id === id); return t ? `<span class="mini-chip">${t.emoji} ${t.label}</span>` : ''; })
      .join('');

    item.innerHTML = `
      <div class="hist-rp ${rpCls(log.rp)}">${fmtRP(log.rp)}</div>
      <div class="hist-meta">
        <div class="hist-meta-top">${dayLabel(log.date)} ${log.time} · ${partyLabel} · ${log.kills}kill</div>
        <div class="hist-chips">
          ${emotionEmoji ? `<span class="mini-chip">${emotionEmoji}</span>` : ''}
          ${playChips}
        </div>
      </div>`;
    list.appendChild(item);
  });
}

// ─── Bar chart ────────────────────────────────────────────────────────────────

const TIME_SLOTS = [
  { label: '朝\n6-12', min: 6,  max: 12 },
  { label: '昼\n12-18', min: 12, max: 18 },
  { label: '夜\n18-24', min: 18, max: 24 },
  { label: '深夜\n0-6', min: 0,  max: 6  },
];

function getBarData(period) {
  const today = todayStr();
  const cutoff = period === 'day' ? today : period === 'week' ? daysAgoStr(6) : daysAgoStr(29);

  const filtered = state.logs.filter(l =>
    period === 'day' ? l.date === today : l.date >= cutoff
  );

  return TIME_SLOTS.map(slot => {
    const total = filtered
      .filter(l => { const h = Number(l.time.split(':')[0]); return h >= slot.min && h < slot.max; })
      .reduce((s, l) => s + l.rp, 0);
    return { label: slot.label, value: total };
  });
}

function renderBarChart() {
  const container = document.getElementById('bar-chart');
  const data = getBarData(state.barPeriod);

  if (data.every(d => d.value === 0)) {
    container.innerHTML = '<div class="no-data">データがありません</div>';
    return;
  }

  const W = 320, H = 160;
  const PL = 44, PR = 12, PT = 16, PB = 36;
  const CW = W - PL - PR;
  const CH = H - PT - PB;
  const maxAbs = Math.max(...data.map(d => Math.abs(d.value)), 1);
  const zeroY = PT + CH / 2;

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });

  // Axis
  svg.appendChild(svgEl('line', { x1: PL, y1: PT, x2: PL, y2: H - PB, stroke: '#1a1714', 'stroke-width': 1 }));
  svg.appendChild(svgEl('line', { x1: PL, y1: zeroY, x2: W - PR, y2: zeroY, stroke: '#1a1714', 'stroke-width': 1 }));

  // Y labels
  const maxLabel = fmtRP(maxAbs);
  svg.appendChild(svgText(maxLabel, { x: PL - 4, y: PT + 4, 'text-anchor': 'end', 'font-size': 8, fill: '#8a8680' }));
  svg.appendChild(svgText(fmtRP(-maxAbs), { x: PL - 4, y: H - PB - 2, 'text-anchor': 'end', 'font-size': 8, fill: '#8a8680' }));
  svg.appendChild(svgText('0', { x: PL - 4, y: zeroY + 4, 'text-anchor': 'end', 'font-size': 8, fill: '#8a8680' }));

  const barW = (CW / data.length) * 0.55;
  const gap = CW / data.length;

  data.forEach((d, i) => {
    const x = PL + i * gap + (gap - barW) / 2;
    const bH = Math.max((Math.abs(d.value) / maxAbs) * (CH / 2 - 4), 0);
    const isPos = d.value >= 0;
    const barY = isPos ? zeroY - bH : zeroY;

    if (bH > 0) {
      svg.appendChild(svgEl('rect', {
        x, y: barY, width: barW, height: bH,
        fill: isPos ? '#1a1714' : 'none',
        stroke: '#1a1714', 'stroke-width': 1,
      }));
    }

    // Value label
    if (d.value !== 0) {
      svg.appendChild(svgText(fmtRP(d.value), {
        x: x + barW / 2,
        y: isPos ? barY - 4 : barY + bH + 10,
        'text-anchor': 'middle', 'font-size': 9, fill: '#1a1714', 'font-weight': 700,
      }));
    }

    // X labels (multiline via tspan)
    const lines = d.label.split('\n');
    const textEl = svgEl('text', {
      x: x + barW / 2, y: H - PB + 12,
      'text-anchor': 'middle', 'font-size': 8, fill: '#8a8680',
    });
    lines.forEach((line, li) => {
      const tspan = svgEl('tspan', { x: x + barW / 2, dy: li === 0 ? 0 : 10 });
      tspan.textContent = line;
      textEl.appendChild(tspan);
    });
    svg.appendChild(textEl);
  });

  container.innerHTML = '';
  container.appendChild(svg);
}

// ─── Pie chart ────────────────────────────────────────────────────────────────

function getPieData() {
  const counts = {};
  state.logs.forEach(l => l.emotions.forEach(id => { counts[id] = (counts[id] || 0) + 1; }));
  return EMOTION_TAGS
    .filter(t => counts[t.id])
    .map(t => ({ ...t, count: counts[t.id] }))
    .sort((a, b) => b.count - a.count);
}

function renderPieChart() {
  const container = document.getElementById('pie-chart');
  const data = getPieData();

  if (data.length === 0) {
    container.innerHTML = '<div class="no-data">データがありません</div>';
    return;
  }

  const total = data.reduce((s, d) => s + d.count, 0);
  const CX = 75, CY = 75, R = 62;
  const W = 300, H = 155;

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });

  // Handle single segment (full circle)
  if (data.length === 1) {
    svg.appendChild(svgEl('circle', {
      cx: CX, cy: CY, r: R,
      fill: PIE_FILLS[0], stroke: '#ece9e0', 'stroke-width': 1,
    }));
  } else {
    let angle = -90;
    data.forEach((d, i) => {
      const sweep = (d.count / total) * 360;
      const endAngle = angle + sweep;
      const path = svgEl('path', {
        d: arcPath(CX, CY, R, angle, endAngle - 0.3),
        fill: PIE_FILLS[i % PIE_FILLS.length],
        stroke: '#ece9e0', 'stroke-width': 1.5,
      });
      svg.appendChild(path);
      angle = endAngle;
    });
  }

  // Legend
  const maxLegend = Math.min(data.length, 7);
  data.slice(0, maxLegend).forEach((d, i) => {
    const y = 14 + i * 20;
    const pct = Math.round((d.count / total) * 100);

    svg.appendChild(svgEl('rect', {
      x: 160, y: y - 8, width: 10, height: 10,
      fill: PIE_FILLS[i % PIE_FILLS.length], stroke: '#1a1714', 'stroke-width': 0.5,
    }));
    svg.appendChild(svgText(`${d.emoji} ${d.label}`, {
      x: 175, y: y, 'font-size': 9.5, fill: '#1a1714',
    }));
    svg.appendChild(svgText(`${pct}%`, {
      x: W - 4, y: y, 'text-anchor': 'end', 'font-size': 9, fill: '#8a8680',
    }));
  });

  container.innerHTML = '';
  container.appendChild(svg);
}

// ─── Router ───────────────────────────────────────────────────────────────────

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById(`view-${name}`).classList.remove('hidden');
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === name);
  });

  if (name === 'rec')   updateRecDate();
  if (name === 'hist')  renderHist();
  if (name === 'graph') { renderBarChart(); renderPieChart(); }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  state.logs = loadLogs();

  initRPSwipe();
  initAdjButtons();
  buildKillGrid();
  initParty();
  buildTagGrid('emotion-tags', EMOTION_TAGS, 'emotions');
  buildTagGrid('ally-tags',    ALLY_TAGS,    'ally');
  buildTagGrid('play-tags',    PLAY_TAGS,    'play');

  document.querySelectorAll('#nav .nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });

  document.getElementById('btn-save').addEventListener('click', saveEntry);

  // History filter
  document.querySelectorAll('.filter-row .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-row .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.histFilter = btn.dataset.filter;
      renderHist();
    });
  });

  // Bar chart period
  document.querySelectorAll('.period-row .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-row .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.barPeriod = btn.dataset.period;
      renderBarChart();
    });
  });

  // Clear all
  document.getElementById('clear-btn').addEventListener('click', () => {
    if (!confirm('全ての記録を削除しますか？')) return;
    state.logs = [];
    saveLogs();
    renderHist();
    toast('DELETED');
  });

  showView('rec');
}

document.addEventListener('DOMContentLoaded', init);
