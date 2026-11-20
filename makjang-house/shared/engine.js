// 게임 규칙 엔진. 순수 상태 머신 — 서버(온라인)와 브라우저(오프라인)가 같은 코드를 쓴다.
// 모든 변경 함수는 s.events 에 이벤트를 쌓기만 하고, 비우는 건 Table.flush() 담당.
import { COLORS, CARDS, CHARACTERS } from './data.js';

export const MAX_PLAYERS = 6;
export const HAND_SIZE = 7;
export const REPORT_FINE = 50;

const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

export function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildDeck() {
  const d = [];
  let id = 0;
  for (const color of COLORS) {
    d.push({ id: id++, color, type: 'num', value: 0 });
    for (let v = 1; v <= 9; v++) for (let k = 0; k < 2; k++) d.push({ id: id++, color, type: 'num', value: v });
    for (const type of ['skip', 'reverse', 'draw2']) for (let k = 0; k < 2; k++) d.push({ id: id++, color, type });
    for (const type of ['reflect', 'swap', 'coin', 'tax', 'bomb']) d.push({ id: id++, color, type });
  }
  for (const [type, n] of [['wild', 4], ['wild4', 4], ['roulette', 2], ['rotate', 2]]) {
    for (let k = 0; k < n; k++) d.push({ id: id++, color: null, type });
  }
  return d; // 132장
}

export const cardPoints = (c) => (c.type === 'num' ? c.value : CARDS[c.type].points);
export const isWild = (c) => c.color === null;
export const topCard = (s) => s.discard[s.discard.length - 1];

export function bestColor(hand) {
  const cnt = { red: 0, blue: 0, green: 0, yellow: 0 };
  for (const c of hand) if (c.color) cnt[c.color]++;
  return COLORS.reduce((a, b) => (cnt[b] > cnt[a] ? b : a), COLORS[Math.floor(Math.random() * 4)]);
}

// s 는 전체 상태 또는 viewFor() 결과 둘 다 가능 (discard 꼬리, color, pending, drawn 만 사용)
export function canPlay(s, card) {
  if (s.drawn != null && card.id !== s.drawn) return false;
  if (s.pending > 0) return !!CARDS[card.type].stack;
  if (isWild(card)) return true;
  if (card.color === s.color) return true;
  const top = topCard(s);
  if (!top) return true;
  if (card.type === 'num') return top.type === 'num' && top.value === card.value;
  return card.type === top.type;
}

export function createGame({ maxRounds = 5, startChips = 1000, turnMs = 20000 } = {}) {
  return {
    phase: 'lobby',
    players: [],
    deck: [],
    discard: [],
    color: 'red',
    dir: 1,
    turn: 0,
    pending: 0,
    drawn: null,
    bomb: null,
    pot: 0,
    round: 0,
    ante: 0,
    maxRounds,
    startChips,
    turnMs,
    deadline: 0,
    nextRoundAt: 0,
    result: null,
    ranking: null,
    events: [],
    seq: 0,
  };
}

export function addPlayer(s, { name, char, isBot = false, token = null }) {
  if (s.phase !== 'lobby' || s.players.length >= MAX_PLAYERS) return -1;
  s.players.push({
    name: String(name || '무명').slice(0, 12),
    char: CHARACTERS[char] ? char : 'tazza',
    isBot,
    token,
    connected: true,
    chips: s.startChips,
    hand: [],
    declared: false,
    vulnerable: false,
    skillUsed: false,
    raised: false,
    out: false,
  });
  return s.players.length - 1;
}

function ev(s, e) {
  e.seq = ++s.seq;
  s.events.push(e);
}

export const activeIdx = (s) => s.players.map((_, i) => i).filter((i) => !s.players[i].out);

export function nextIdx(s, from, steps = 1) {
  const n = s.players.length;
  let i = from;
  for (let k = 0; k < steps; ) {
    i = (i + s.dir + n) % n;
    if (!s.players[i].out) k++;
  }
  return i;
}

function handChanged(p) {
  if (p.hand.length > 2) p.declared = false;
  p.vulnerable = p.hand.length === 1 && !p.declared;
}

function drawOne(s) {
  if (!s.deck.length) {
    const top = s.discard.pop();
    s.deck = shuffle(s.discard);
    s.discard = top ? [top] : [];
    if (s.deck.length) ev(s, { type: 'reshuffle' });
  }
  return s.deck.pop() || null;
}

function giveCards(s, i, n) {
  const p = s.players[i];
  let got = 0;
  for (; got < n; got++) {
    const c = drawOne(s);
    if (!c) break;
    p.hand.push(c);
  }
  handChanged(p);
  return got;
}

// 손패에서 무작위 k장을 덱 맨 밑으로
function dumpRandom(s, p, k) {
  for (let n = 0; n < k && p.hand.length; n++) {
    const [c] = p.hand.splice(Math.floor(Math.random() * p.hand.length), 1);
    s.deck.unshift(c);
  }
  handChanged(p);
}

function pay(s, from, to, amt) {
  const p = s.players[from];
  const x = Math.max(0, Math.min(amt, p.chips));
  p.chips -= x;
  if (to === 'pot') s.pot += x;
  else s.players[to].chips += x;
  return x;
}

function validTarget(s, i, t) {
  if (Number.isInteger(t) && t !== i && s.players[t] && !s.players[t].out) return t;
  return nextIdx(s, i);
}

export function startGame(s) {
  if (s.players.length < 2) return '최소 2명';
  for (const p of s.players) {
    p.chips = s.startChips;
    p.out = false;
  }
  s.round = 0;
  s.ranking = null;
  startRound(s);
  return null;
}

export function startRound(s) {
  s.round++;
  s.ante = 50 * s.round;
  const act = activeIdx(s);
  s.deck = shuffle(buildDeck());
  s.discard = [];
  s.dir = 1;
  s.pending = 0;
  s.drawn = null;
  s.bomb = null;
  s.pot = 0;
  s.result = null;
  for (const p of s.players) p.hand = [];
  for (const i of act) {
    const p = s.players[i];
    p.declared = p.vulnerable = p.skillUsed = p.raised = false;
    pay(s, i, 'pot', s.ante);
  }
  for (let k = 0; k < HAND_SIZE; k++) for (const i of act) s.players[i].hand.push(s.deck.pop());
  let c = null;
  while (!c) {
    c = s.deck.pop();
    if (c.type !== 'num') {
      s.deck.unshift(c);
      c = null;
    }
  }
  s.discard = [c];
  s.color = c.color;
  s.turn = act[(s.round - 1) % act.length];
  s.phase = 'playing';
  ev(s, { type: 'roundStart', round: s.round, ante: s.ante, pot: s.pot });
  beginTurn(s);
}

function beginTurn(s) {
  s.drawn = null;
  s.deadline = Date.now() + s.turnMs;
  if (!s.bomb) return;
  s.bomb.fuse--;
  if (s.bomb.fuse <= 0) {
    const power = s.bomb.power;
    s.bomb = null;
    const n = giveCards(s, s.turn, power);
    ev(s, { type: 'explode', who: s.turn, n });
  } else {
    ev(s, { type: 'tick', who: s.turn, danger: s.bomb.fuse <= 1 });
  }
}

function endTurn(s, skip = 0) {
  s.turn = nextIdx(s, s.turn, 1 + skip);
  beginTurn(s);
}

// 액션 진입점. 성공 시 null, 실패 시 에러 문자열.
export function applyAction(s, i, a) {
  const p = s.players[i];
  if (!p || !a || typeof a.type !== 'string') return '잘못된 요청';
  if (a.type === 'taunt') {
    ev(s, { type: 'taunt', who: i, id: Math.abs(a.id | 0) });
    return null;
  }
  if (s.phase !== 'playing') return '게임 중이 아님';
  if (p.out) return '파산자는 구경만 하세요';

  if (a.type === 'declare') {
    if (p.hand.length > 2) return '아직 올인할 때가 아님';
    if (p.declared) return '이미 외쳤음';
    p.declared = true;
    p.vulnerable = false;
    ev(s, { type: 'declare', who: i });
    return null;
  }
  if (a.type === 'report') {
    const t = a.target;
    const tp = s.players[t];
    if (!tp || t === i || tp.out) return '신고 대상 없음';
    if (tp.vulnerable) {
      const n = giveCards(s, t, 2);
      const paid = pay(s, t, i, REPORT_FINE);
      ev(s, { type: 'report', who: i, target: t, n, paid });
      return null;
    }
    if (tp.hand.length === 1 && tp.declared) {
      giveCards(s, i, 1);
      ev(s, { type: 'falseReport', who: i, target: t });
      return null;
    }
    return '신고할 거리가 없음';
  }

  if (s.turn !== i) return '네 차례 아님';
  switch (a.type) {
    case 'play':
      return play(s, i, a);
    case 'draw':
      return drawAct(s, i);
    case 'pass':
      if (s.drawn == null) return '먼저 뽑아야 패스 가능';
      ev(s, { type: 'pass', who: i });
      endTurn(s);
      return null;
    case 'skill':
      return skill(s, i, a);
    case 'raise':
      return raise(s, i);
  }
  return '알 수 없는 행동';
}

function play(s, i, a) {
  const p = s.players[i];
  const idx = p.hand.findIndex((c) => c.id === a.cardId);
  if (idx < 0) return '없는 카드';
  const card = p.hand[idx];
  if (!canPlay(s, card)) return '지금 낼 수 없는 카드';

  let color = card.color;
  if (!color) color = COLORS.includes(a.color) ? a.color : bestColor(p.hand.filter((c) => c !== card));
  const target = card.type === 'swap' ? validTarget(s, i, a.target) : null;

  p.hand.splice(idx, 1);
  s.discard.push(card);
  if (s.discard.length > 40) s.deck.unshift(...s.discard.splice(0, 20));
  s.color = color;
  s.drawn = null;
  handChanged(p);
  ev(s, { type: 'play', who: i, card, color, target, pending: s.pending });
  if (!p.hand.length) return endRound(s, i);

  const nActive = activeIdx(s).length;
  let skip = 0;
  switch (card.type) {
    case 'skip':
      skip = 1;
      ev(s, { type: 'skipped', who: nextIdx(s, i) });
      break;
    case 'reverse':
      if (nActive === 2) {
        skip = 1;
        ev(s, { type: 'skipped', who: nextIdx(s, i) });
      } else s.dir *= -1;
      break;
    case 'draw2':
      s.pending += 2;
      ev(s, { type: 'stack', who: i, total: s.pending });
      break;
    case 'wild4':
      s.pending += 4;
      ev(s, { type: 'stack', who: i, total: s.pending });
      break;
    case 'reflect':
      if (nActive > 2) s.dir *= -1;
      if (s.pending) ev(s, { type: 'reflect', who: i, back: nextIdx(s, i), total: s.pending });
      break;
    case 'swap': {
      const t = s.players[target];
      [p.hand, t.hand] = [t.hand, p.hand];
      handChanged(p);
      handChanged(t);
      ev(s, { type: 'swap', who: i, target });
      break;
    }
    case 'coin':
      if (Math.random() < 0.5) {
        const k = Math.min(2, p.hand.length);
        dumpRandom(s, p, k);
        ev(s, { type: 'coin', who: i, heads: true, n: k });
        if (!p.hand.length) return endRound(s, i);
      } else {
        const n = giveCards(s, i, 2);
        ev(s, { type: 'coin', who: i, heads: false, n });
      }
      break;
    case 'tax':
      for (const j of activeIdx(s)) if (j !== i) giveCards(s, j, 1);
      ev(s, { type: 'tax', who: i });
      break;
    case 'bomb':
      if (s.bomb) {
        s.bomb.power += 2;
        s.bomb.fuse = rnd(2, 5);
      } else s.bomb = { fuse: rnd(3, 7), power: 4 };
      ev(s, { type: 'bomb', who: i, power: s.bomb.power });
      break;
    case 'roulette': {
      const roll = rnd(1, 6);
      const nx = nextIdx(s, i);
      const victims = [];
      if (roll === 1) victims.push([i, giveCards(s, i, 3)]);
      else if (roll <= 3) victims.push([nx, giveCards(s, nx, 2)]);
      else if (roll <= 5) victims.push([nx, giveCards(s, nx, 4)]);
      else for (const j of activeIdx(s)) if (j !== i) victims.push([j, giveCards(s, j, 2)]);
      ev(s, { type: 'roulette', who: i, roll, victims });
      break;
    }
    case 'rotate': {
      const ids = activeIdx(s);
      const moved = new Map(ids.map((j) => [nextIdx(s, j), s.players[j].hand]));
      for (const j of ids) {
        s.players[j].hand = moved.get(j);
        handChanged(s.players[j]);
      }
      ev(s, { type: 'rotate', who: i, dir: s.dir });
      break;
    }
  }
  endTurn(s, skip);
  return null;
}

function drawAct(s, i) {
  const p = s.players[i];
  if (s.drawn != null) return '이미 뽑았음 — 내거나 패스';
  if (s.pending > 0) {
    const want = s.pending;
    s.pending = 0;
    const n = giveCards(s, i, want);
    ev(s, { type: 'eat', who: i, n });
    endTurn(s);
    return null;
  }
  const n = giveCards(s, i, 1);
  ev(s, { type: 'draw', who: i, n });
  const c = n ? p.hand[p.hand.length - 1] : null;
  if (c && canPlay(s, c)) {
    s.drawn = c.id;
    s.deadline = Date.now() + Math.min(s.turnMs, 10000);
  } else endTurn(s);
  return null;
}

function skill(s, i, a) {
  const p = s.players[i];
  if (p.skillUsed) return '스킬은 라운드당 1번';
  if (s.drawn != null) return '뽑은 뒤엔 스킬 못 씀';
  const info = { type: 'skill', who: i, char: p.char };
  switch (p.char) {
    case 'tazza': {
      if (p.hand.length < 2) return '2장 이상일 때만';
      const k = p.hand.findIndex((c) => c.id === a.cardId);
      if (k < 0) return '빼돌릴 카드를 고르세요';
      s.deck.unshift(p.hand.splice(k, 1)[0]);
      handChanged(p);
      break;
    }
    case 'loanshark': {
      const t = validTarget(s, i, a.target);
      info.target = t;
      info.n = giveCards(s, t, 2);
      break;
    }
    case 'psychic':
      if (!COLORS.includes(a.color)) return '색을 고르세요';
      if (a.color === s.color) return '이미 그 색임';
      s.color = a.color;
      info.color = a.color;
      break;
    case 'gangster': {
      if (p.hand.length < 2) return '2장 이상일 때만';
      const k = p.hand.findIndex((c) => c.id === a.cardId);
      if (k < 0) return '떠넘길 카드를 고르세요';
      const t = validTarget(s, i, a.target);
      s.players[t].hand.push(p.hand.splice(k, 1)[0]);
      handChanged(p);
      handChanged(s.players[t]);
      info.target = t;
      break;
    }
    case 'dealer': {
      const ids = activeIdx(s);
      const counts = ids.map((j) => s.players[j].hand.length);
      const pool = shuffle(ids.flatMap((j) => s.players[j].hand));
      ids.forEach((j, n) => {
        s.players[j].hand = pool.splice(0, counts[n]);
        handChanged(s.players[j]);
      });
      break;
    }
    case 'insurance':
      if (!s.pending) return '청구할 벌칙이 없음';
      info.n = s.pending;
      s.pending = 0;
      break;
    case 'gambler':
      if (Math.random() < 0.5) {
        const k = Math.min(2, p.hand.length - 1);
        dumpRandom(s, p, k);
        info.heads = true;
        info.n = k;
      } else {
        info.heads = false;
        info.n = giveCards(s, i, 3);
      }
      break;
    default:
      return '스킬 없음';
  }
  p.skillUsed = true;
  ev(s, info);
  return null;
}

function raise(s, i) {
  const p = s.players[i];
  if (p.raised) return '레이즈는 라운드당 1번';
  p.raised = true;
  let total = 0;
  for (const j of activeIdx(s)) total += pay(s, j, 'pot', s.ante);
  ev(s, { type: 'raise', who: i, amt: s.ante, total, pot: s.pot });
  return null;
}

function endRound(s, w) {
  const pays = [];
  for (const j of activeIdx(s)) {
    if (j === w) continue;
    const pts = s.players[j].hand.reduce((a, c) => a + cardPoints(c), 0);
    pays.push({ who: j, cards: s.players[j].hand.length, pts, paid: pay(s, j, w, pts) });
  }
  const pot = s.pot;
  s.players[w].chips += pot;
  s.pot = 0;
  s.pending = 0;
  s.bomb = null;
  s.drawn = null;
  const busted = [];
  for (const j of activeIdx(s)) {
    if (s.players[j].chips <= 0) {
      s.players[j].out = true;
      busted.push(j);
    }
  }
  s.result = { winner: w, pot, pays, busted };
  ev(s, { type: 'roundEnd', ...s.result });
  if (activeIdx(s).length <= 1 || s.round >= s.maxRounds) {
    s.phase = 'gameOver';
    s.ranking = s.players.map((_, i) => i).sort((a, b) => s.players[b].chips - s.players[a].chips);
    ev(s, { type: 'gameOver', ranking: s.ranking });
  } else {
    s.phase = 'roundEnd';
    s.nextRoundAt = Date.now() + 9000;
  }
  return null;
}

// 시간 초과: 뽑았으면 패스, 아니면 드로우(쌓인 벌칙 수령) 후 패스
export function timeout(s) {
  const i = s.turn;
  ev(s, { type: 'timeout', who: i });
  if (s.drawn != null) {
    endTurn(s);
    return;
  }
  drawAct(s, i);
  if (s.phase === 'playing' && s.turn === i && s.drawn != null) endTurn(s);
}

// 플레이어 시점 뷰: 남의 패와 덱 내용 숨김
export function viewFor(s, me) {
  const now = Date.now();
  return {
    phase: s.phase,
    me,
    round: s.round,
    maxRounds: s.maxRounds,
    ante: s.ante,
    pot: s.pot,
    color: s.color,
    dir: s.dir,
    turn: s.turn,
    pending: s.pending,
    drawn: s.turn === me ? s.drawn : null,
    bomb: s.bomb ? { power: s.bomb.power, danger: s.bomb.fuse <= 1 } : null,
    deckCount: s.deck.length,
    discard: s.discard.slice(-5),
    remainMs: s.phase === 'playing' ? Math.max(0, s.deadline - now) : 0,
    nextRoundMs: s.phase === 'roundEnd' ? Math.max(0, s.nextRoundAt - now) : 0,
    turnMs: s.turnMs,
    result: s.result,
    ranking: s.ranking,
    players: s.players.map((p, i) => ({
      name: p.name,
      char: p.char,
      isBot: p.isBot,
      connected: p.connected,
      chips: p.chips,
      count: p.hand.length,
      declared: p.declared,
      vulnerable: p.vulnerable,
      skillUsed: p.skillUsed,
      raised: p.raised,
      out: p.out,
      hand: i === me ? p.hand : null,
    })),
  };
}
