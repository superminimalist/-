// 봇끼리 수백 판 돌려서 규칙 엔진 무결성 검사 (카드 보존, 무한루프, 예외)
import * as E from '../shared/engine.js';
import { botDecide } from '../shared/bot.js';
import { CHARACTERS } from '../shared/data.js';

const chars = Object.keys(CHARACTERS);
const GAMES = +process.argv[2] || 300;
let rounds = 0, actions = 0, maxPending = 0;
const seen = new Set();

function check(s) {
  if (s.phase !== 'playing') return;
  const total = s.deck.length + s.discard.length + s.players.reduce((a, p) => a + p.hand.length, 0);
  if (total !== 132) throw new Error('card count ' + total);
  const ids = new Set();
  for (const c of [...s.deck, ...s.discard, ...s.players.flatMap((p) => p.hand)]) {
    if (ids.has(c.id)) throw new Error('dup card ' + c.id);
    ids.add(c.id);
  }
}

for (let g = 0; g < GAMES; g++) {
  const s = E.createGame({ maxRounds: 5 });
  const n = 2 + (g % 5);
  for (let i = 0; i < n; i++) E.addPlayer(s, { name: 'b' + i, char: chars[(g + i) % chars.length], isBot: true });
  E.startGame(s);
  let guard = 0;
  while (s.phase !== 'gameOver') {
    if (++guard > 200000) throw new Error('stuck');
    if (s.phase === 'roundEnd') { E.startRound(s); rounds++; continue; }
    // 가끔 타임아웃 / 신고 / 외치기 섞기
    const r = Math.random();
    if (r < 0.02) E.timeout(s);
    else if (r < 0.05) { for (let i = 0; i < n; i++) if (s.players[i].vulnerable) E.applyAction(s, i, { type: 'declare' }); }
    else if (r < 0.07) { const t = s.players.findIndex((p) => p.vulnerable); if (t >= 0) E.applyAction(s, (t + 1) % n, { type: 'report', target: t }); }
    else {
      const a = botDecide(s, s.turn);
      const err = E.applyAction(s, s.turn, a);
      if (err) throw new Error(`bot err "${err}" ${JSON.stringify(a)}`);
    }
    for (const e of s.events) seen.add(e.type === 'skill' ? 'skill:' + e.char : e.type);
    s.events = [];
    maxPending = Math.max(maxPending, s.pending);
    actions++;
    check(s);
  }
  rounds++;
}
console.log({ GAMES, rounds, actions, maxPending, events: [...seen].sort() });
console.log('OK');
