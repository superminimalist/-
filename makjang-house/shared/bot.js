// 봇 AI. 전체 상태(s)를 보고 액션 하나를 돌려준다.
import { canPlay, bestColor, nextIdx, activeIdx, cardPoints, isWild } from './engine.js';

const chance = (p) => Math.random() < p;

function fewestOpp(s, i) {
  let best = -1;
  for (const j of activeIdx(s)) {
    if (j === i) continue;
    if (best < 0 || s.players[j].hand.length < s.players[best].hand.length) best = j;
  }
  return best;
}

function prevIdx(s, i) {
  s.dir *= -1;
  const r = nextIdx(s, i);
  s.dir *= -1;
  return r;
}

function playAction(s, i, card) {
  const p = s.players[i];
  const a = { type: 'play', cardId: card.id };
  if (isWild(card)) a.color = bestColor(p.hand.filter((c) => c !== card));
  if (card.type === 'swap') a.target = fewestOpp(s, i);
  return a;
}

function scoreCard(s, i, c) {
  const p = s.players[i];
  const me = p.hand.length;
  const nx = s.players[nextIdx(s, i)].hand.length;
  const minOpp = s.players[fewestOpp(s, i)].hand.length;
  const threat = nx <= 2;
  let sc = Math.random() * 3;

  if (s.pending > 0) return sc + { reflect: 30, draw2: 20, wild4: 15 }[c.type];

  switch (c.type) {
    case 'num': sc += 10 + c.value * 0.5; break;
    case 'skip': sc += 12 + (threat ? 18 : 0); break;
    case 'reverse': sc += 11 + (threat ? 8 : 0); break;
    case 'draw2': sc += 12 + (threat ? 20 : 0); break;
    case 'reflect': sc += 9; break;
    case 'swap': sc += minOpp < me - 1 ? 25 + (me - minOpp) : -20; break;
    case 'coin': sc += 8 + (me >= 4 ? 5 : 0); break;
    case 'tax': sc += 11 + (threat ? 8 : 0); break;
    case 'bomb': sc += 9; break;
    case 'wild': sc += 2; break;
    case 'wild4': sc += 3 + (threat ? 25 : 0); break;
    case 'roulette': sc += 4 + (threat ? 10 : 0); break;
    case 'rotate': sc += s.players[prevIdx(s, i)].hand.length < me - 1 ? 30 : -10; break;
  }
  if (c.color && c.color === bestColor(p.hand.filter((x) => x !== c))) sc += 3;
  return sc;
}

function skillChoice(s, i) {
  const p = s.players[i];
  const me = p.hand.length;
  const t = fewestOpp(s, i);
  const tCount = s.players[t].hand.length;
  const playable = p.hand.filter((c) => canPlay(s, c));
  const heaviest = () => p.hand.reduce((a, c) => (cardPoints(c) > cardPoints(a) ? c : a));

  switch (p.char) {
    case 'insurance':
      if (s.pending >= 4 || (s.pending && !playable.length)) return { type: 'skill' };
      break;
    case 'loanshark':
      if (tCount <= 3 || chance(0.08)) return { type: 'skill', target: t };
      break;
    case 'psychic':
      if (!s.pending && !playable.length) {
        const color = bestColor(p.hand);
        if (color !== s.color) return { type: 'skill', color };
      }
      break;
    case 'tazza':
      if (me >= 2 && (me <= 4 || chance(0.12))) return { type: 'skill', cardId: heaviest().id };
      break;
    case 'gangster':
      if (me >= 2 && (me <= 4 || tCount <= 2 || chance(0.12))) return { type: 'skill', cardId: heaviest().id, target: t };
      break;
    case 'dealer':
      if (me >= tCount + 4 && chance(0.5)) return { type: 'skill' };
      break;
    case 'gambler':
      if (me >= 8 || (me >= 5 && chance(0.25))) return { type: 'skill' };
      break;
  }
  return null;
}

export function botDecide(s, i) {
  const p = s.players[i];
  if (s.phase !== 'playing' || s.turn !== i || p.out) return null;

  if (s.drawn != null) {
    const c = p.hand.find((x) => x.id === s.drawn);
    return c && canPlay(s, c) ? playAction(s, i, c) : { type: 'pass' };
  }
  if (!p.skillUsed) {
    const sk = skillChoice(s, i);
    if (sk) return sk;
  }
  if (!p.raised && p.hand.length <= 2 && p.chips > s.ante && chance(0.5)) return { type: 'raise' };

  const playable = p.hand.filter((c) => canPlay(s, c));
  if (!playable.length) return { type: 'draw' };
  let best = playable[0];
  let bestSc = -Infinity;
  for (const c of playable) {
    const sc = scoreCard(s, i, c);
    if (sc > bestSc) [best, bestSc] = [c, sc];
  }
  return playAction(s, i, best);
}

