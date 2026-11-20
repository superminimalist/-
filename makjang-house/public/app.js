// 막장하우스 클라이언트. 오프라인은 브라우저 안의 Table, 온라인은 서버 웹소켓 — 렌더는 동일한 view 로.
import * as E from '../shared/engine.js';
import { Table } from '../shared/table.js';
import { COLORS, COLOR_INFO, CARDS, CHARACTERS, BOT_NAMES, TAUNTS, QUIPS } from '../shared/data.js';

const $ = (q) => document.querySelector(q);
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);

const store = {
  get(k, d) { try { const v = localStorage.getItem('mj:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('mj:' + k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem('mj:' + k); } catch {} },
};

const me = {
  name: store.get('name', ''),
  char: store.get('char', 'tazza'),
  token: store.get('token', null) || (() => { const t = crypto.randomUUID?.() || String(Math.random()).slice(2) + Date.now(); store.set('token', t); return t; })(),
};

let mode = null; // 'offline' | 'online'
let table = null;
let ws = null;
let view = null;
let host = 0;
let roomCode = null;
let deadline = 0;
let lastTop = null;
let lastHandIds = new Set();
let modalLock = null; // 'result' | 'choice'
let muted = store.get('muted', false);
let busy = false;

// ---------------- 사운드 (WebAudio 합성, 에셋 없음) ----------------
let AC = null;
const ac = () => (AC ||= new (window.AudioContext || window.webkitAudioContext)());
function tone(f, d = 0.1, type = 'square', vol = 0.06, slide = 0, delay = 0) {
  if (muted) return;
  try {
    const c = ac(), t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.02);
  } catch {}
}
function noise(d = 0.2, vol = 0.2, freq = 1200) {
  if (muted) return;
  try {
    const c = ac(), n = c.sampleRate * d, b = c.createBuffer(1, n, c.sampleRate), ch = b.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = b; f.type = 'lowpass'; f.frequency.value = freq; g.gain.value = vol;
    s.connect(f).connect(g).connect(c.destination); s.start();
  } catch {}
}
const sfx = {
  card: () => { tone(520, 0.05, 'triangle', 0.08); noise(0.05, 0.08, 4000); },
  draw: () => noise(0.09, 0.12, 2500),
  stack: () => { tone(220, 0.25, 'sawtooth', 0.09, -120); tone(110, 0.3, 'square', 0.05, -50, 0.05); },
  boom: () => { noise(0.8, 0.5, 500); tone(70, 0.6, 'sine', 0.35, -50); },
  tick: () => tone(1400, 0.03, 'square', 0.04),
  fanfare: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'square', 0.06, 0, i * 0.09)),
  siren: () => { for (let i = 0; i < 4; i++) tone(i % 2 ? 700 : 950, 0.14, 'sawtooth', 0.05, 0, i * 0.14); },
  coin: () => { tone(1500, 0.07, 'square', 0.05); tone(2100, 0.15, 'square', 0.05, 0, 0.07); },
  chips: () => { for (let i = 0; i < 6; i++) tone(2400 + Math.random() * 800, 0.03, 'triangle', 0.05, 0, i * 0.04); },
  dice: () => { for (let i = 0; i < 8; i++) noise(0.03, 0.15, 3000 - i * 200); },
  win: () => [392, 523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.2, 'triangle', 0.08, 0, i * 0.08)),
  lose: () => [392, 349, 311, 262].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.05, 0, i * 0.2)),
  swoosh: () => { noise(0.35, 0.2, 1800); tone(300, 0.35, 'sine', 0.05, 600); },
  error: () => tone(140, 0.15, 'square', 0.05),
};

// ---------------- 공통 UI ----------------
function show(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === 'scr-' + id));
}
function toast(msg) {
  const d = document.createElement('div');
  d.className = 'toast'; d.textContent = msg;
  $('#toast').append(d); setTimeout(() => d.remove(), 3000);
  sfx.error();
}
function fx(html, cls = '', ms = 1600) {
  const d = document.createElement('div');
  d.className = 'fx ' + cls; d.innerHTML = html;
  d.style.animationDuration = ms + 'ms';
  $('#fx').append(d); setTimeout(() => d.remove(), ms);
}
function shake(big) {
  const g = $('#scr-game');
  g.classList.remove('shake', 'shake-big'); void g.offsetWidth;
  g.classList.add(big ? 'shake-big' : 'shake');
}
function feed(text) {
  const d = document.createElement('div');
  d.className = 'line'; d.innerHTML = text;
  const f = $('#feed'); f.append(d);
  while (f.children.length > 6) f.firstChild.remove();
  setTimeout(() => d.remove(), 7000);
}
function bubble(seat, text) {
  const el = seat === view?.me ? $('#my-bar') : document.querySelector(`.opp[data-seat="${seat}"]`);
  if (!el) return;
  const r = el.getBoundingClientRect();
  const b = document.createElement('div');
  b.className = 'bubble'; b.textContent = text;
  b.style.left = Math.min(window.innerWidth - 60, Math.max(60, r.left + r.width / 2)) + 'px';
  b.style.top = Math.max(30, r.top + (seat === view?.me ? 0 : 8)) + 'px';
  $('#bubbles').append(b); setTimeout(() => b.remove(), 2600);
}

function openModal(html) { $('#modal-box').innerHTML = html; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); modalLock = null; }

// ---------------- 카드 렌더 ----------------
function cardHTML(c, cls = '') {
  const color = c.color || 'wild';
  const info = CARDS[c.type];
  const glyph = c.type === 'num' ? c.value : info.glyph;
  const emoji = /\p{Extended_Pictographic}/u.test(String(glyph));
  const suit = c.color ? COLOR_INFO[c.color].suit : '★';
  const corner = c.type === 'num' ? c.value : suit;
  const label = c.type === 'num' ? COLOR_INFO[c.color].suit : info.name;
  return `<div class="card c-${color} ${cls}" data-id="${c.id}" title="${esc(info.name + ' — ' + info.desc)}">
    <span class="k tl">${corner}</span><span class="g ${emoji ? 'emoji' : ''}">${glyph}</span>
    <span class="lb">${esc(label)}</span><span class="k br">${corner}</span></div>`;
}
const cardName = (c, color) => (c.type === 'num' ? `${COLOR_INFO[c.color].suit}${c.value}` : (c.color ? COLOR_INFO[c.color].suit : '') + CARDS[c.type].name) + (c.color ? '' : ` → ${COLOR_INFO[color].suit}`);
const colorOrder = { red: 0, blue: 1, green: 2, yellow: 3 };
const sortHand = (h) => [...h].sort((a, b) => (a.color ? colorOrder[a.color] : 9) - (b.color ? colorOrder[b.color] : 9) || (a.type === 'num' ? a.value : 20) - (b.type === 'num' ? b.value : 20) || a.type.localeCompare(b.type));

// ---------------- 홈 ----------------
function renderHome() {
  $('#in-name').value = me.name;
  $('#char-grid').innerHTML = Object.entries(CHARACTERS).map(([k, c]) =>
    `<div class="char ${k === me.char ? 'sel' : ''}" data-char="${k}"><div class="em">${c.emoji}</div><div class="nm">${c.name}</div><div class="sk">${c.skill}</div><div class="ds">${c.desc}</div></div>`).join('');
  $('#rules-body').innerHTML = `
    <p>같은 색·같은 숫자·같은 기호면 낸다. 손패 먼저 털면 승리 — 판돈 전부 + 남은 놈들 카드 점수만큼 칩 강탈.
    매 라운드 앤티(판돈)가 50씩 오른다. 5라운드 끝나거나 다 파산하면 칩 많은 놈이 왕.</p>
    <p><b>올인!</b> — 2장 이하일 때 외쳐둘 것. 1장 남았는데 안 외쳤으면 누구든 <b>신고</b> 가능: 2장 벌금 + 50칩 상납. 외친 놈 신고하면 무고죄 1장.
    <b>레이즈</b> — 라운드당 1번, 전원이 앤티만큼 더 건다. 이길 자신 있을 때.
    <b>쌓기</b> — +2/+4/반사는 서로 위에 쌓을 수 있다. 못 받으면 전부 먹는다. 턴 20초, 시간 끝나면 자동 드로우.</p>
    <div class="rule-grid">${Object.entries(CARDS).filter(([k]) => k !== 'num').map(([k, c]) =>
      `<div class="rule">${cardHTML({ id: -1, type: k, color: ['wild', 'wild4', 'roulette', 'rotate'].includes(k) ? null : 'red' })}<div><b>${c.name}</b><br>${c.desc}</div></div>`).join('')}</div>`;
  const saved = store.get('room', null);
  $('#btn-rejoin').classList.toggle('hidden', !saved);
  if (saved) $('#btn-rejoin').textContent = `이전 방 재접속 (${saved})`;
  const q = new URLSearchParams(location.search).get('room');
  if (q) $('#in-code').value = q.toUpperCase();
}
function saveMe() {
  me.name = $('#in-name').value.trim() || '타짜 지망생';
  store.set('name', me.name); store.set('char', me.char);
}

// ---------------- 오프라인 ----------------
function startOffline() {
  saveMe(); cleanup();
  mode = 'offline';
  table = new Table({ onUpdate: (evs) => onState(E.viewFor(table.s, 0), evs) });
  table.addPlayer({ name: me.name, char: me.char });
  const n = +$('#in-bots').value;
  const names = [...BOT_NAMES].sort(() => Math.random() - 0.5);
  const chars = Object.keys(CHARACTERS);
  for (let i = 0; i < n; i++) table.addPlayer({ name: names[i], char: pick(chars), isBot: true });
  host = 0;
  table.start();
  show('game');
}

// ---------------- 온라인 ----------------
function wsURL() { return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws'; }
function connect() {
  return new Promise((res, rej) => {
    if (ws && ws.readyState === 1) return res();
    if (!/^https?:/.test(location.protocol)) return rej(new Error('file'));
    const s = new WebSocket(wsURL());
    const to = setTimeout(() => { s.close(); rej(new Error('timeout')); }, 5000);
    s.onopen = () => { clearTimeout(to); ws = s; res(); };
    s.onerror = () => { clearTimeout(to); rej(new Error('ws')); };
    s.onmessage = (e) => onServer(JSON.parse(e.data));
    s.onclose = () => {
      if (ws === s) ws = null;
      if (mode === 'online' && roomCode) { feed('📡 연결 끊김 — 재접속 중...'); setTimeout(rejoin, 1500); }
    };
  });
}
async function online(msg) {
  saveMe();
  try { await connect(); } catch { $('#online-note').textContent = '서버 연결 실패 — 오프라인으로 하거나 node server.js 로 띄운 주소로 접속하세요.'; return; }
  if (mode === 'offline') cleanup();
  mode = 'online';
  ws.send(JSON.stringify({ ...msg, token: me.token, name: me.name, char: me.char }));
}
async function rejoin() {
  const code = roomCode || store.get('room', null);
  if (!code || mode !== 'online') return;
  try { await connect(); ws.send(JSON.stringify({ t: 'join', code, token: me.token, name: me.name, char: me.char })); }
  catch { setTimeout(rejoin, 3000); }
}
function onServer(m) {
  if (m.t === 'state') {
    roomCode = m.code; host = m.host;
    store.set('room', m.code);
    onState(m.view, m.events);
  } else if (m.t === 'error') {
    if (m.msg === '없는 방 코드') { store.del('room'); roomCode = null; }
    toast(m.msg); busy = false;
  } else if (m.t === 'left') {
    roomCode = null; store.del('room'); mode = null; show('home'); renderHome();
  }
}
function wsSend(o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); else toast('서버 연결 안 됨'); }

function cleanup() {
  if (table) { table.destroy(); table = null; }
  if (mode === 'online' && ws) { ws.send(JSON.stringify({ t: 'leave' })); }
  mode = null; view = null; lastTop = null; lastHandIds = new Set();
  closeModal();
}

// ---------------- 액션 ----------------
function send(action) {
  if (mode === 'offline') {
    const err = table.act(0, action);
    if (err) toast(err);
  } else wsSend({ t: 'act', action });
}

function renderLobby(v) {
  show('room');
  $('#room-code').textContent = roomCode;
  const isHost = v.me === host;
  $('#room-players').innerHTML = v.players.map((p, i) => {
    const c = CHARACTERS[p.char];
    return `<div class="rp"><span class="em">${c.emoji}</span><span class="nm">${esc(p.name)} ${i === v.me ? '(나)' : ''}</span>
      <span class="tag">${c.name}·${c.skill}</span>${i === host ? '<span class="tag host">방장</span>' : ''}${p.isBot ? '<span class="tag">봇</span>' : ''}
      ${isHost && p.isBot ? `<button class="btn sm ghost" data-kick="${i}">✕</button>` : ''}</div>`;
  }).join('');
  $('#btn-addbot').disabled = !isHost || v.players.length >= E.MAX_PLAYERS;
  $('#btn-start').disabled = !isHost || v.players.length < 2;
  $('#room-note').textContent = isHost ? (v.players.length < 2 ? '2명 이상이어야 시작. 친구 없으면 봇이라도.' : '준비되면 시작.') : '방장이 시작하길 기다리는 중...';
}

// ---------------- 상태 수신 ----------------
function onState(v, events = []) {
  view = v;
  deadline = performance.now() + v.remainMs;
  if (v.phase === 'lobby') { renderLobby(v); return; }
  if (!$('#scr-game').classList.contains('active')) show('game');
  render(v);
  for (const e of events) handleEvent(e, v);
  busy = false;
}

const nm = (i) => (view && i === view.me ? '나' : esc(view?.players[i]?.name ?? '?'));

function handleEvent(e, v) {
  const C = (k) => fmt(pick(QUIPS[k]), { n: e.n });
  switch (e.type) {
    case 'roundStart':
      closeModal();
      fx(`ROUND ${e.round}<small>앤티 ${e.ante}칩 · 판돈 ${e.pot}칩</small>`, 'gold', 2000);
      sfx.swoosh(); break;
    case 'play':
      sfx.card();
      feed(`<b>${nm(e.who)}</b> → ${cardName(e.card, e.color)}`);
      break;
    case 'skipped': fx(`⛔ ${nm(e.who)} 쉼`, '', 1100); break;
    case 'stack':
      fx(`+${e.total}<small>${e.total >= 8 ? '이거 실화냐...' : '받을 수 있으면 받아봐'}</small>`, 'red', 1300);
      sfx.stack(); shake(e.total >= 8); break;
    case 'reflect': fx(`🪞 반사!!<small>+${e.total} → ${nm(e.back)}</small>`, 'gold', 1400); sfx.stack(); break;
    case 'swap': fx(`🔀 ${C('swap')}<small>${nm(e.who)} ⇄ ${nm(e.target)}</small>`, '', 1600); sfx.swoosh(); break;
    case 'rotate': fx(`🌀 ${C('rotate')}`, 'gold', 1800); sfx.swoosh(); shake(); break;
    case 'coin':
      sfx.coin();
      fx(e.heads ? `🪙 앞면!<small>${nm(e.who)} ${e.n}장 버림</small>` : `🪙 뒷면...<small>${nm(e.who)} ${e.n}장 먹음 ㅋㅋ</small>`, e.heads ? 'gold' : 'red', 1500);
      break;
    case 'tax': fx(`💸 ${C('tax')}`, '', 1500); sfx.chips(); break;
    case 'bomb': fx(`💣 시한폭탄!<small>위력 ${e.power}장 · 언제 터질지 모름</small>`, 'red', 1600); sfx.tick(); break;
    case 'tick':
      sfx.tick();
      if (e.danger) { fx(`💣 째깍...<small>${nm(e.who)} 다음은 진짜 터진다</small>`, 'red', 1200); }
      break;
    case 'explode': fx(`💥 펑!!!<small>${nm(e.who)} ${C('explode')}</small>`, 'red', 2000); sfx.boom(); shake(true); break;
    case 'roulette': {
      sfx.dice();
      const face = '⚀⚁⚂⚃⚄⚅'[e.roll - 1];
      const txt = e.roll === 1 ? `자폭! ${nm(e.who)} 3장` : e.roll === 6 ? '잭팟!! 전원 2장' : `${nm(e.victims[0]?.[0])} ${e.victims[0]?.[1]}장`;
      fx(`<span class="dice">${face}</span><small>${e.roll} — ${txt}</small>`, e.roll === 1 ? 'red' : 'gold', 2200);
      break;
    }
    case 'eat':
      sfx.draw();
      if (e.n >= 4) { fx(`${nm(e.who)}<small>${C('eat')}</small>`, 'red', 1600); shake(); }
      feed(`<b>${nm(e.who)}</b> ${e.n}장 먹음`);
      break;
    case 'draw': sfx.draw(); feed(`<b>${nm(e.who)}</b> 1장 드로우`); break;
    case 'pass': feed(`<b>${nm(e.who)}</b> 패스`); break;
    case 'declare': fx(`${C('declare')}<small>${nm(e.who)}</small>`, 'gold', 1500); sfx.fanfare(); bubble(e.who, '올인!!'); break;
    case 'report': fx(`🚨 신고!<small>${nm(e.who)} → ${nm(e.target)} · ${C('report')}</small>`, 'red', 1800); sfx.siren(); break;
    case 'falseReport': fx(`⚖️ 무고죄<small>${nm(e.who)} ${C('falseReport')}</small>`, '', 1500); break;
    case 'raise': fx(`💰 레이즈!<small>${nm(e.who)} · 전원 +${e.amt} · 판돈 ${e.pot}</small>`, 'gold', 1600); sfx.chips(); break;
    case 'skill': {
      const c = CHARACTERS[e.char];
      let d = '';
      if (e.char === 'loanshark') d = `${nm(e.target)} ${e.n}장 대출`;
      else if (e.char === 'psychic') d = `색 → ${COLOR_INFO[e.color].suit} ${COLOR_INFO[e.color].name}`;
      else if (e.char === 'gangster') d = `${nm(e.target)}에게 1장 떠넘김`;
      else if (e.char === 'dealer') d = '전원 손패 재분배';
      else if (e.char === 'insurance') d = `+${e.n} 벌칙 무효`;
      else if (e.char === 'gambler') d = e.heads ? `앞면! ${e.n}장 버림` : `뒷면! ${e.n}장 먹음`;
      else if (e.char === 'tazza') d = '1장 슬쩍...';
      fx(`${c.emoji} ${c.skill}!<small>${nm(e.who)} · ${d}</small>`, 'gold', 1600);
      sfx.coin(); break;
    }
    case 'timeout': feed(`⏰ <b>${nm(e.who)}</b> 시간 초과`); break;
    case 'reshuffle': feed('🔄 덱 다시 섞음'); break;
    case 'taunt': bubble(e.who, TAUNTS[e.id % TAUNTS.length]); break;
    case 'roundEnd': setTimeout(() => showResult(e), 900); (e.winner === v.me ? sfx.win : sfx.lose)(); break;
    case 'gameOver': setTimeout(() => showGameOver(), 2600); break;
  }
}

function showResult(e) {
  if (!view || view.phase === 'playing') return;
  modalLock = 'result';
  const won = e.winner === view.me;
  const rows = e.pays.map((p) => `<tr><td>${nm(p.who)}</td><td>${p.cards}장 · ${p.pts}점</td><td class="minus">-${p.paid}</td></tr>`).join('');
  openModal(`<h2>${won ? '🏆 싹쓸이!' : `💸 ${nm(e.winner)} 승`}</h2>
    <table class="res-table"><tr><td>🏆 ${nm(e.winner)}</td><td>판돈</td><td class="plus">+${e.pot + e.pays.reduce((a, p) => a + p.paid, 0)}</td></tr>${rows}</table>
    ${e.busted.length ? `<p>☠️ 파산: ${e.busted.map(nm).join(', ')}</p>` : ''}
    <p class="note" id="next-note">${view.phase === 'roundEnd' ? '다음 라운드 곧 시작...' : ''}</p>`);
}

function showGameOver() {
  if (!view || view.phase !== 'gameOver') return;
  modalLock = 'result';
  const r = view.ranking || [];
  const medal = ['🥇', '🥈', '🥉'];
  const canRestart = mode === 'offline' || view.me === host;
  openModal(`<h2>${r[0] === view.me ? '👑 막장하우스의 왕' : '🎰 게임 끝'}</h2>
    <table class="res-table">${r.map((i, k) => `<tr><td>${medal[k] || k + 1 + '등'}</td><td>${nm(i)}</td><td class="${view.players[i].chips > 0 ? 'plus' : 'minus'}">${view.players[i].chips}칩</td></tr>`).join('')}</table>
    <div class="row">${canRestart ? '<button class="btn gold" id="btn-again">한 판 더</button>' : '<span class="note">방장이 한 판 더 누르길 기다리는 중</span>'}
    <button class="btn ghost" id="btn-home">홈으로</button></div>`);
  $('#btn-again')?.addEventListener('click', () => { closeModal(); if (mode === 'offline') table.start(); else wsSend({ t: 'restart' }); });
  $('#btn-home').addEventListener('click', goHome);
}

function goHome() { cleanup(); roomCode = null; store.del('room'); show('home'); renderHome(); }

// ---------------- 게임 렌더 ----------------
function render(v) {
  const mi = v.me;
  const mp = v.players[mi];
  const myTurn = v.phase === 'playing' && v.turn === mi && !mp.out;
  const dirIcon = `<span class="dir ${v.dir > 0 ? 'cw' : 'ccw'}">${v.dir > 0 ? '↻' : '↺'}</span>`;

  $('#hud').innerHTML = `<span class="chip-pill">R ${v.round}/${v.maxRounds}</span>
    <span class="chip-pill pot">💰 판돈 ${v.pot}</span><span class="chip-pill">앤티 ${v.ante}</span>
    ${mode === 'online' ? `<span class="chip-pill">방 ${esc(roomCode)}</span>` : '<span class="chip-pill">오프라인</span>'}
    <span class="spacer"></span>
    <button class="btn sm ghost" id="btn-taunt">💬</button>
    <button class="btn sm ghost" id="btn-mute">${muted ? '🔇' : '🔊'}</button>
    <button class="btn sm ghost" id="btn-quit">나가기</button>`;

  // 상대: 내 다음 자리부터 순서대로
  const n = v.players.length;
  const order = Array.from({ length: n - 1 }, (_, k) => (mi + 1 + k) % n);
  $('#opps').innerHTML = order.map((i) => {
    const p = v.players[i];
    const c = CHARACTERS[p.char];
    const turn = v.phase === 'playing' && v.turn === i;
    return `<div class="opp ${turn ? 'turn' : ''} ${p.out ? 'out' : ''}" data-seat="${i}">
      <div class="top"><span class="em">${c.emoji}</span><span class="nm">${esc(p.name)}</span></div>
      <div class="cnt ${p.count === 1 ? 'danger' : ''}">${p.count}</div>
      <div class="meta"><span>🪙${p.chips}</span><span>${c.skill}${p.skillUsed ? ' ✓' : ''}</span>${p.isBot ? '<span>🤖</span>' : ''}${!p.connected ? '<span>📡끊김</span>' : ''}${p.out ? '<span>☠️파산</span>' : ''}</div>
      <div class="backs">${'<div class="back"></div>'.repeat(Math.min(p.count, 12))}</div>
      <div class="meta">${p.declared && p.count <= 2 ? '<span class="badge allin">올인!</span>' : ''}${turn && v.bomb ? '<span class="badge bomb">💣</span>' : ''}</div>
      ${p.vulnerable && !mp.out ? `<button class="btn sm red pulse report" data-report="${i}">🚨 신고!</button>` : ''}
    </div>`;
  }).join('');

  // 중앙
  const top = v.discard[v.discard.length - 1];
  const fresh = top && top.id !== lastTop;
  lastTop = top?.id;
  const canDraw = myTurn && v.drawn == null;
  $('#center').innerHTML = `
    <div class="pile"><div class="deck ${canDraw ? 'can' : ''}" id="deck">${v.pending ? '+' + v.pending : v.deckCount}</div></div>
    <div class="pile"><div class="halo" style="background:var(--${v.color})"></div>${top ? cardHTML(top, 'big ' + (fresh ? 'pop' : '')) : ''}</div>
    <div class="pile-info">${dirIcon}
      <span class="color-name" style="color:var(--${v.color})">${COLOR_INFO[v.color].suit} ${COLOR_INFO[v.color].name}</span>
      ${v.pending ? `<span class="stack-badge">+${v.pending}</span>` : ''}
      ${v.bomb ? `<span class="bomb-badge">💣 폭탄 활성 · ${v.bomb.power}장${v.bomb.danger ? ' · 곧 터짐!' : ''}</span>` : ''}
    </div>`;

  // 내 바
  const c = CHARACTERS[mp.char];
  $('#mine').classList.toggle('turn', myTurn);
  $('#my-bar').innerHTML = `<span class="em">${c.emoji}</span><span class="nm">${esc(mp.name)}</span>
    <span class="chip-pill">🪙 ${mp.chips}</span><span class="chip-pill">${mp.count}장</span>
    ${mp.declared && mp.count <= 2 ? '<span class="badge allin">올인!</span>' : ''}${mp.out ? '<span class="badge bomb">☠️ 파산 — 관전 중</span>' : ''}
    <span class="spacer"></span><span class="note">${myTurn ? '🔥 내 차례' : v.phase === 'playing' ? `${nm(v.turn)} 차례...` : ''}</span>`;

  // 버튼
  const acts = [];
  if (myTurn) {
    if (v.drawn != null) acts.push('<button class="btn" data-act="pass">패스</button>');
    else acts.push(`<button class="btn ${v.pending ? 'red' : ''}" data-act="draw">${v.pending ? `+${v.pending} 먹기` : '1장 뽑기'}</button>`);
  }
  const canSkill = myTurn && !mp.skillUsed && v.drawn == null && !(mp.char === 'insurance' && !v.pending);
  acts.push(`<button class="btn pink" data-act="skill" ${canSkill ? '' : 'disabled'} title="${esc(c.desc)}">${c.emoji} ${c.skill}${mp.skillUsed ? ' ✓' : ''}</button>`);
  acts.push(`<button class="btn gold" data-act="raise" ${myTurn && !mp.raised ? '' : 'disabled'}>💰 레이즈 +${v.ante}</button>`);
  const canDeclare = !mp.out && v.phase === 'playing' && mp.count <= 2 && !mp.declared;
  acts.push(`<button class="btn ${mp.vulnerable ? 'red pulse' : 'gold'}" data-act="declare" ${canDeclare ? '' : 'disabled'}>${mp.vulnerable ? '지금 외쳐!! 올인!' : '올인!'}</button>`);
  $('#actions').innerHTML = acts.join('');

  // 손패
  const hand = sortHand(mp.hand || []);
  const ids = new Set(hand.map((x) => x.id));
  $('#hand').innerHTML = hand.map((x) => {
    const ok = myTurn && E.canPlay(v, x);
    return cardHTML(x, (myTurn ? (ok ? 'ok' : 'no') : '') + (lastHandIds.size && !lastHandIds.has(x.id) ? ' fresh' : ''));
  }).join('');
  lastHandIds = ids;

  if (modalLock === 'result' && v.phase === 'playing') closeModal();
}

// ---------------- 선택 모달 (Promise) ----------------
function choose(html, bind) {
  return new Promise((res) => {
    modalLock = 'choice';
    openModal(html + '<div class="row"><button class="btn ghost" id="m-cancel">취소</button></div>');
    const done = (val) => { closeModal(); res(val); };
    $('#m-cancel').onclick = () => done(null);
    bind(done);
  });
}
const pickColor = (title, exclude) => choose(
  `<h2>${title}</h2><div class="pick-grid">${COLORS.filter((c) => c !== exclude).map((c) =>
    `<button class="color-btn" style="background:var(--${c})" data-c="${c}">${COLOR_INFO[c].suit}</button>`).join('')}</div>`,
  (done) => document.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => done(b.dataset.c))));
const pickTarget = (title) => {
  const opts = view.players.map((p, i) => i).filter((i) => i !== view.me && !view.players[i].out);
  if (opts.length === 1) return Promise.resolve(opts[0]);
  return choose(`<h2>${title}</h2>${opts.map((i) => {
    const p = view.players[i];
    return `<button class="btn target-btn" data-t="${i}">${CHARACTERS[p.char].emoji} ${esc(p.name)} <span class="spacer"></span> ${p.count}장 · 🪙${p.chips}</button>`;
  }).join('')}`, (done) => document.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => done(+b.dataset.t))));
};
const pickCard = (title) => choose(`<h2>${title}</h2><div class="pick-grid">${sortHand(view.players[view.me].hand).map((c) => cardHTML(c)).join('')}</div>`,
  (done) => document.querySelectorAll('#modal-box .card').forEach((b) => (b.onclick = () => done(+b.dataset.id))));

async function onCardClick(id) {
  const v = view, mp = v.players[v.me];
  if (v.turn !== v.me || busy) return;
  const card = mp.hand.find((c) => c.id === id);
  if (!card) return;
  if (!E.canPlay(v, card)) return toast('그건 지금 못 냄');
  const a = { type: 'play', cardId: id };
  if (!card.color) { a.color = await pickColor(`${CARDS[card.type].name} — 색 지정`); if (!a.color) return; }
  if (card.type === 'swap') { a.target = await pickTarget('🔀 누구랑 패 바꿀래?'); if (a.target == null) return; }
  busy = mode === 'online';
  send(a);
}

async function onSkill() {
  const mp = view.players[view.me];
  const c = CHARACTERS[mp.char];
  const a = { type: 'skill' };
  if (c.needs.includes('card')) { a.cardId = await pickCard(`${c.emoji} ${c.skill} — 카드 선택`); if (a.cardId == null) return; }
  if (c.needs.includes('target')) { a.target = await pickTarget(`${c.emoji} ${c.skill} — 대상 선택`); if (a.target == null) return; }
  if (c.needs.includes('color')) { a.color = await pickColor(`${c.emoji} ${c.skill} — 바꿀 색`, view.color); if (!a.color) return; }
  send(a);
}

function onTaunt() {
  choose(`<h2>💬 도발</h2>${TAUNTS.map((t, i) => `<button class="btn target-btn" data-tt="${i}">${esc(t)}</button>`).join('')}`,
    (done) => document.querySelectorAll('[data-tt]').forEach((b) => (b.onclick = () => done(+b.dataset.tt))))
    .then((id) => id != null && send({ type: 'taunt', id }));
}

// ---------------- 타이머 루프 ----------------
let lastSec = -1;
function frame() {
  requestAnimationFrame(frame);
  if (!view || view.phase !== 'playing') { $('#timer-fill').style.width = '0'; return; }
  const left = Math.max(0, deadline - performance.now());
  const pct = Math.min(100, (left / view.turnMs) * 100);
  const f = $('#timer-fill');
  f.style.width = pct + '%';
  f.classList.toggle('hurry', left < 5000);
  const sec = Math.ceil(left / 1000);
  if (view.turn === view.me && sec !== lastSec && sec <= 5 && sec > 0) sfx.tick();
  lastSec = sec;
}

// ---------------- 이벤트 바인딩 ----------------
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-char],[data-act],[data-report],[data-kick],#deck,#hand .card,#btn-mute,#btn-quit,#btn-taunt');
  if (!t) return;
  ac(); // 첫 제스처에 오디오 깨우기
  if (t.dataset.char) { me.char = t.dataset.char; store.set('char', me.char); renderHome(); return; }
  if (t.dataset.kick) { wsSend({ t: 'kick', seat: +t.dataset.kick }); return; }
  if (t.dataset.report) { send({ type: 'report', target: +t.dataset.report }); return; }
  if (t.id === 'deck') { if (view?.turn === view?.me && view.drawn == null) send({ type: 'draw' }); return; }
  if (t.id === 'btn-mute') { muted = !muted; store.set('muted', muted); render(view); return; }
  if (t.id === 'btn-quit') { if (confirm('진짜 판 접고 나감?')) goHome(); return; }
  if (t.id === 'btn-taunt') { onTaunt(); return; }
  if (t.classList.contains('card')) { onCardClick(+t.dataset.id); return; }
  const act = t.dataset.act;
  if (act === 'skill') onSkill();
  else if (act) send({ type: act });
});
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal' && modalLock === 'choice') $('#m-cancel')?.click(); });
$('#btn-offline').onclick = startOffline;
$('#btn-create').onclick = () => online({ t: 'create' });
$('#btn-join').onclick = () => { const code = $('#in-code').value.trim().toUpperCase(); if (code.length !== 4) return toast('방 코드 4자리'); online({ t: 'join', code }); };
$('#btn-rejoin').onclick = () => online({ t: 'join', code: store.get('room', '') });
$('#btn-addbot').onclick = () => wsSend({ t: 'addBot' });
$('#btn-start').onclick = () => wsSend({ t: 'start' });
$('#btn-room-leave').onclick = goHome;
$('#btn-copy').onclick = () => {
  const url = `${location.origin}${location.pathname}?room=${roomCode}`;
  navigator.clipboard?.writeText(url).then(() => feed('링크 복사됨'), () => {});
  toast('초대 링크: ' + url);
};
document.addEventListener('keydown', (e) => {
  if (!view || view.phase !== 'playing' || e.target.tagName === 'INPUT') return;
  if (e.key === ' ' ) { e.preventDefault(); if (view.turn === view.me) send({ type: view.drawn != null ? 'pass' : 'draw' }); }
  if (e.key === 'u' || e.key === 'U') send({ type: 'declare' });
});

if (!/^https?:/.test(location.protocol)) $('#online-note').textContent = '파일로 열었음 — 온라인은 서버 주소로 접속해야 됨.';
else if (!navigator.onLine) $('#online-note').textContent = '지금 오프라인 — 봇이랑 하세요.';
if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
renderHome();
requestAnimationFrame(frame);
