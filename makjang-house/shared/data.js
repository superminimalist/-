// 공용 데이터: 카드 / 캐릭터 / 멘트. 브라우저와 Node 양쪽에서 import.
export const COLORS = ['red', 'blue', 'green', 'yellow'];
export const COLOR_INFO = {
  red: { name: '하트', suit: '♥' },
  blue: { name: '스페이드', suit: '♠' },
  green: { name: '클로버', suit: '♣' },
  yellow: { name: '다이아', suit: '♦' },
};

// 일반 카드게임 특수카드 5종 대비 12종.
export const CARDS = {
  num: { name: '숫자', glyph: null, desc: '같은 색 또는 같은 숫자에 낸다.' },
  skip: { name: '패스', glyph: '⛔', points: 20, desc: '다음 놈 한 턴 쉼.' },
  reverse: { name: '역주행', glyph: '⇄', points: 20, desc: '진행 방향 반대로. 2인이면 패스.' },
  draw2: { name: '+2', glyph: '+2', points: 20, stack: true, desc: '다음 놈 2장. 쌓기 가능.' },
  reflect: { name: '반사', glyph: '🪞', points: 20, stack: true, desc: '쌓인 드로우를 방향 뒤집어 되돌린다. 색 상관없이 언제든 받아칠 때 사용.' },
  swap: { name: '바꿔치기', glyph: '🔀', points: 20, desc: '지목한 놈과 손패 통째로 교환.' },
  coin: { name: '동전', glyph: '🪙', points: 20, desc: '앞면: 내 패 2장 버림 / 뒷면: 내가 2장 먹음.' },
  tax: { name: '세무조사', glyph: '💸', points: 20, desc: '나 빼고 전원 1장씩.' },
  bomb: { name: '시한폭탄', glyph: '💣', points: 20, desc: '몇 턴 뒤 터지는 폭탄 설치(4장). 이미 있으면 위력 +2, 타이머 리셋.' },
  wild: { name: '와일드', glyph: '🌈', points: 50, desc: '색 지정.' },
  wild4: { name: '와일드 +4', glyph: '+4', points: 50, stack: true, desc: '색 지정 + 다음 놈 4장. 쌓기 가능.' },
  roulette: { name: '룰렛', glyph: '🎲', points: 50, desc: '색 지정 후 주사위: 1 자폭 3장 / 2-3 다음놈 2장 / 4-5 다음놈 4장 / 6 잭팟 전원 2장.' },
  rotate: { name: '판 엎기', glyph: '🌀', points: 50, desc: '색 지정 + 전원 손패를 진행 방향으로 한 칸씩 넘긴다.' },
};

export const CHARACTERS = {
  tazza: { name: '타짜', emoji: '🃏', skill: '밑장빼기', needs: ['card'], desc: '손패 1장을 덱 맨 밑으로 몰래 빼돌린다. (2장 이상일 때)' },
  loanshark: { name: '사채업자', emoji: '💰', skill: '빚 독촉', needs: ['target'], desc: '지목한 놈에게 카드 2장 강제 대출.' },
  psychic: { name: '점쟁이', emoji: '🔮', skill: '운명 조작', needs: ['color'], desc: '현재 색을 원하는 색으로 바꾼다.' },
  gangster: { name: '건달', emoji: '🕶️', skill: '떠넘기기', needs: ['card', 'target'], desc: '내 카드 1장을 지목한 놈에게 떠넘긴다. (2장 이상일 때)' },
  dealer: { name: '딜러', emoji: '🎩', skill: '판갈이', needs: [], desc: '모두의 손패를 걷어 섞은 뒤 장수 그대로 다시 나눈다.' },
  insurance: { name: '보험왕', emoji: '📋', skill: '보험 청구', needs: [], desc: '쌓인 드로우 벌칙을 전액 무효 처리. (벌칙 받을 때만)' },
  gambler: { name: '도박중독', emoji: '🎰', skill: '더블 오어 낫싱', needs: [], desc: '동전: 앞면이면 2장 버림, 뒷면이면 3장 먹음.' },
};

export const BOT_NAMES = ['허세 박씨', '한방 최사장', '올인 할매', '개털 민수', '외상 김부장', '눈치9단 이모', '빚쟁이 강', '뻥카 윤'];

export const TAUNTS = [
  'ㅋㅋㅋㅋㅋㅋ',
  '인생은 한 방!',
  '너 지금 떨고 있냐?',
  '돈 놓고 돈 먹기~',
  '제발 한 장만...',
  '아 망했다',
  '판 엎어버려?',
  '기도 메타 갑니다 🙏',
  '이건 사기야!!',
  '내 칩 돌려내',
];

export const QUIPS = {
  eat: ['{n}장 입금 완료 ㅋㅋ', '카드 뷔페 오픈! {n}장', '배부르겠다~ {n}장', '{n}장 대출 승인!'],
  explode: ['펑!!! {n}장 폭식', '폭탄 배달 완료 — {n}장', '손에서 터졌다 ㅋㅋ {n}장'],
  swap: ['패 통째로 바꿔치기!', '네 거 내 거, 내 거 네 거'],
  rotate: ['판 엎었다!! 패가 한 칸씩 돈다', '막장 회전초밥 🍣'],
  tax: ['세무조사 나왔습니다. 전원 1장', '탈세 적발! 전원 1장'],
  report: ['🚨 신고 접수! 벌금 2장 + 50칩', '딱 걸렸어 ㅋㅋ 2장 + 50칩'],
  falseReport: ['무고죄! 신고자가 1장', '헛다리 짚었네 — 1장'],
  declare: ['올인!!!', '마지막 한 장, 올인!'],
};
