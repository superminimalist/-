// 막장하우스 서버: 정적 파일 + 웹소켓(직접 구현, 의존성 0) + 방 관리.
// node server.js  → http://localhost:8080
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import { fileURLToPath } from 'node:url';
import { Table } from './shared/table.js';
import { viewFor, MAX_PLAYERS } from './shared/engine.js';
import { BOT_NAMES, CHARACTERS } from './shared/data.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = +process.env.PORT || 8080;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

// ---------- static ----------
function serveStatic(req, res) {
  let url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (url === '/') url = '/index.html';
  const shared = url.startsWith('/shared/');
  const base = shared ? ROOT : path.join(ROOT, 'public');
  const file = path.normalize(path.join(base, url));
  if (!file.startsWith(shared ? path.join(ROOT, 'shared') + path.sep : base + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (err, data) => {
    if (err) return res.writeHead(404).end('not found');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

// ---------- minimal websocket (RFC 6455, text frames) ----------
class WS extends EventEmitter {
  constructor(sock) {
    super();
    this.sock = sock;
    this.buf = Buffer.alloc(0);
    this.frags = [];
    this.alive = true;
    this.open = true;
    sock.setNoDelay(true);
    sock.on('data', (d) => this.onData(d));
    sock.on('close', () => this.closed());
    sock.on('error', () => this.closed());
  }
  onData(d) {
    this.buf = Buffer.concat([this.buf, d]);
    for (;;) {
      const b = this.buf;
      if (b.length < 2) return;
      const fin = b[0] & 0x80, op = b[0] & 0x0f, masked = b[1] & 0x80;
      let len = b[1] & 0x7f, off = 2;
      if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (b.length < 10) return; len = Number(b.readBigUInt64BE(2)); off = 10; }
      if (len > 1 << 20) return this.close();
      let mask = null;
      if (masked) { if (b.length < off + 4) return; mask = b.subarray(off, off + 4); off += 4; }
      if (b.length < off + len) return;
      const payload = Buffer.from(b.subarray(off, off + len));
      if (mask) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
      this.buf = b.subarray(off + len);
      if (op === 0x8) return this.close();
      if (op === 0x9) { this.frame(0xa, payload); continue; }
      if (op === 0xa) { this.alive = true; continue; }
      if (op === 0x1 || op === 0x2 || op === 0x0) {
        this.frags.push(payload);
        if (fin) {
          const msg = Buffer.concat(this.frags).toString('utf8');
          this.frags = [];
          this.emit('message', msg);
        }
      }
    }
  }
  frame(op, payload) {
    if (!this.open) return;
    const n = payload.length;
    let head;
    if (n < 126) head = Buffer.from([0x80 | op, n]);
    else if (n < 65536) { head = Buffer.alloc(4); head[0] = 0x80 | op; head[1] = 126; head.writeUInt16BE(n, 2); }
    else { head = Buffer.alloc(10); head[0] = 0x80 | op; head[1] = 127; head.writeBigUInt64BE(BigInt(n), 2); }
    this.sock.write(Buffer.concat([head, payload]));
  }
  send(obj) { this.frame(0x1, Buffer.from(JSON.stringify(obj))); }
  ping() { this.frame(0x9, Buffer.alloc(0)); }
  close() { if (this.open) { this.frame(0x8, Buffer.alloc(0)); this.sock.end(); } this.closed(); }
  closed() { if (!this.open) return; this.open = false; this.sock.destroy(); this.emit('close'); }
}

// ---------- rooms ----------
const rooms = new Map(); // code -> Room
const clients = new Set();

function newCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c;
  do c = Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join('');
  while (rooms.has(c));
  return c;
}

class Room {
  constructor(code) {
    this.code = code;
    this.members = []; // {ws, token}
    this.hostToken = null;
    this.empty = 0;
    this.table = new Table({ onUpdate: (evs) => this.broadcast(evs) });
  }
  get s() { return this.table.s; }
  seatOf(token) { return this.s.players.findIndex((p) => p.token === token); }
  broadcast(evs = []) {
    for (const m of this.members) {
      const seat = this.seatOf(m.token);
      if (seat < 0) continue;
      m.ws.send({ t: 'state', code: this.code, host: this.seatOf(this.hostToken), view: viewFor(this.s, seat), events: evs });
    }
  }
  join(ws, token, name, char) {
    let seat = this.seatOf(token);
    if (seat < 0) {
      if (this.s.phase !== 'lobby') return '이미 게임 중인 방';
      if (this.s.players.length >= MAX_PLAYERS) return '방 꽉 참';
      seat = this.table.addPlayer({ name, char, token });
    }
    this.members = this.members.filter((m) => m.token !== token);
    this.members.push({ ws, token });
    this.s.players[seat].connected = true;
    if (!this.hostToken || this.seatOf(this.hostToken) < 0) this.hostToken = token;
    ws.room = this;
    ws.token = token;
    this.broadcast([]);
    return null;
  }
  leave(ws) {
    this.members = this.members.filter((m) => m.ws !== ws);
    const seat = this.seatOf(ws.token);
    if (seat >= 0) {
      if (this.s.phase === 'lobby') this.table.removePlayer(seat);
      else this.s.players[seat].connected = false;
    }
    if (this.hostToken === ws.token) {
      const next = this.members.find((m) => this.seatOf(m.token) >= 0);
      this.hostToken = next ? next.token : null;
    }
    this.broadcast([]);
  }
  isHost(ws) { return ws.token === this.hostToken; }
}

function handle(ws, raw) {
  let m;
  try { m = JSON.parse(raw); } catch { return; }
  const err = (msg) => ws.send({ t: 'error', msg });
  const room = ws.room;
  const token = typeof m.token === 'string' ? m.token.slice(0, 64) : null;

  switch (m.t) {
    case 'create': {
      if (!token) return err('토큰 없음');
      if (room) room.leave(ws);
      const r = new Room(newCode());
      rooms.set(r.code, r);
      return void (r.join(ws, token, m.name, m.char) && err('입장 실패'));
    }
    case 'join': {
      if (!token) return err('토큰 없음');
      const r = rooms.get(String(m.code || '').toUpperCase());
      if (!r) return err('없는 방 코드');
      if (room && room !== r) room.leave(ws);
      const e = r.join(ws, token, m.name, m.char);
      return void (e && err(e));
    }
    case 'leave':
      if (room) room.leave(ws);
      ws.room = null;
      return ws.send({ t: 'left' });
  }
  if (!room) return err('방에 없음');
  const seat = room.seatOf(ws.token);
  switch (m.t) {
    case 'addBot': {
      if (!room.isHost(ws)) return err('방장만 가능');
      const used = new Set(room.s.players.map((p) => p.name));
      const name = BOT_NAMES.find((n) => !used.has(n)) || '봇' + room.s.players.length;
      const chars = Object.keys(CHARACTERS);
      if (room.table.addPlayer({ name, char: chars[Math.floor(Math.random() * chars.length)], isBot: true }) < 0) err('자리 없음');
      return;
    }
    case 'kick': {
      if (!room.isHost(ws) || room.s.phase !== 'lobby') return err('방장만, 대기실에서만');
      const p = room.s.players[m.seat];
      if (!p || !p.isBot) return err('봇만 내보낼 수 있음');
      room.table.removePlayer(m.seat);
      return;
    }
    case 'start':
    case 'restart': {
      if (!room.isHost(ws)) return err('방장만 가능');
      if (m.t === 'start' && room.s.phase !== 'lobby') return err('이미 시작됨');
      if (m.t === 'restart' && room.s.phase !== 'gameOver') return err('게임이 안 끝났음');
      const e = room.table.start();
      return void (e && err(e));
    }
    case 'act': {
      if (seat < 0) return;
      const e = room.table.act(seat, m.action || {});
      return void (e && err(e));
    }
  }
}

// ---------- boot ----------
const server = http.createServer(serveStatic);
server.on('upgrade', (req, sock) => {
  const key = req.headers['sec-websocket-key'];
  if (!key || !req.url.startsWith('/ws')) return sock.destroy();
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  sock.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
  const ws = new WS(sock);
  clients.add(ws);
  ws.on('message', (msg) => { try { handle(ws, msg); } catch (e) { console.error(e); } });
  ws.on('close', () => { clients.delete(ws); if (ws.room) ws.room.leave(ws); });
});

setInterval(() => {
  for (const ws of clients) { if (!ws.alive) { ws.close(); continue; } ws.alive = false; ws.ping(); }
  for (const [code, r] of rooms) {
    r.empty = r.members.length ? 0 : r.empty + 1;
    if (r.empty >= 12) { r.table.destroy(); rooms.delete(code); } // 빈 방 ~5분 후 삭제
  }
}, 25000);

server.listen(PORT, () => console.log(`막장하우스 열림 → http://localhost:${PORT}`));
