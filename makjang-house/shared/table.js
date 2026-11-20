// 테이블 = 엔진 상태 + 타이머 + 봇 구동. 서버 방 하나 / 오프라인 한 판에 하나씩.
import * as E from './engine.js';
import { botDecide } from './bot.js';
import { TAUNTS } from './data.js';

const jitter = (a, b) => a + Math.random() * (b - a);

export class Table {
  constructor({ onUpdate, maxRounds = 5, turnMs = 20000 } = {}) {
    this.s = E.createGame({ maxRounds, turnMs });
    this.onUpdate = onUpdate;
    this.botTimer = null;
    this.decl = new Map(); // 봇 올인 외치기 예약
    this.rep = new Map(); // 봇 신고 예약 "bot>target"
    this.iv = setInterval(() => this.loop(), 200);
  }

  destroy() {
    clearInterval(this.iv);
    clearTimeout(this.botTimer);
  }

  flush() {
    const evs = this.s.events;
    this.s.events = [];
    this.onUpdate?.(evs);
    this.chatter(evs);
  }

  addPlayer(info) {
    const i = E.addPlayer(this.s, info);
    if (i >= 0) this.flush();
    return i;
  }

  removePlayer(i) {
    if (this.s.phase !== 'lobby') return false;
    this.s.players.splice(i, 1);
    this.flush();
    return true;
  }

  start() {
    const err = E.startGame(this.s);
    this.decl.clear();
    this.rep.clear();
    this.flush();
    return err;
  }

  act(i, a) {
    const err = E.applyAction(this.s, i, a);
    if (!err) this.flush();
    return err;
  }

  autopilot(i) {
    const p = this.s.players[i];
    return p && (p.isBot || !p.connected);
  }

  loop() {
    const s = this.s;
    const now = Date.now();
    if (s.phase === 'roundEnd' && now >= s.nextRoundAt) {
      E.startRound(s);
      this.flush();
      return;
    }
    if (s.phase !== 'playing') return;
    if (now > s.deadline) {
      E.timeout(s);
      this.flush();
      return;
    }
    if (this.autopilot(s.turn) && !this.botTimer) {
      const who = s.turn;
      const delay = s.players[who].isBot ? jitter(700, 1600) : 1500;
      this.botTimer = setTimeout(() => {
        this.botTimer = null;
        if (s.phase !== 'playing' || s.turn !== who) return;
        const a = botDecide(s, who) || { type: 'draw' };
        if (this.act(who, a)) {
          // 판단이 틀렸으면 안전하게 드로우 → 패스
          if (this.act(who, { type: 'draw' })) this.act(who, { type: 'pass' });
        }
      }, delay);
    }
    this.reactions(now);
  }

  // 올인 외치기 / 신고 — 턴과 무관하게 실시간 경쟁
  reactions(now) {
    const s = this.s;
    s.players.forEach((t, ti) => {
      if (!t.vulnerable) {
        this.decl.delete(ti);
        for (const k of [...this.rep.keys()]) if (k.endsWith('>' + ti)) this.rep.delete(k);
        return;
      }
      if (t.isBot) {
        let d = this.decl.get(ti);
        if (!d) this.decl.set(ti, (d = { at: now + jitter(300, 1500), will: Math.random() < 0.82 }));
        if (d.will && now >= d.at) this.act(ti, { type: 'declare' });
      }
      s.players.forEach((b, bi) => {
        if (bi === ti || !b.isBot || b.out || !t.vulnerable) return;
        const k = bi + '>' + ti;
        let r = this.rep.get(k);
        if (!r) this.rep.set(k, (r = { at: now + jitter(1300, 3800), will: Math.random() < 0.45 }));
        if (r.will && now >= r.at) this.act(bi, { type: 'report', target: ti });
      });
    });
  }

  // 봇 잡담: 큰 사건 때 가끔 도발
  chatter(evs) {
    const s = this.s;
    for (const e of evs) {
      let who = null;
      if ((e.type === 'eat' && e.n >= 4) || e.type === 'explode') who = e.who;
      else if (['swap', 'rotate', 'roulette', 'report', 'raise'].includes(e.type)) who = e.who;
      if (who == null || Math.random() > 0.3) continue;
      const bots = s.players.map((p, i) => i).filter((i) => s.players[i].isBot && !s.players[i].out);
      if (!bots.length) return;
      const b = bots.includes(who) && Math.random() < 0.6 ? who : bots[Math.floor(Math.random() * bots.length)];
      setTimeout(() => this.act(b, { type: 'taunt', id: Math.floor(Math.random() * TAUNTS.length) }), jitter(500, 1400));
      return;
    }
  }
}
