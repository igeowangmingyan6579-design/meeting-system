const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const { ExpressPeerServer } = require('peer');

const PORT = process.env.PORT || 8080;
const app = express();
const server = require('http').createServer(app);

// ── CORS：允许前端部署到 Netlify 等跨域域名调用 API / 信令 ──
const CORS_ORIGINS = (process.env.CORS_ORIGIN || '*').split(',').map(s => s.trim()).filter(Boolean);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (CORS_ORIGINS.includes('*') || (origin && CORS_ORIGINS.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', CORS_ORIGINS.includes('*') ? '*' : origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());

// ── 简单用户存储（内部小团队成员：注册 + 密码登录）──
// 密码用 Node 内置 scrypt 哈希 + 随机 salt，token 持久化到 users.json（重启仍有效）
// 数据目录：可用环境变量 MEETING_DATA_DIR 覆盖（本地沙箱环境下指向可写工作区）；
// 默认 deploy/data（docker 容器内可写）。deploy 根目录运行时被沙箱禁止写入。
const DATA_DIR = process.env.MEETING_DATA_DIR ? path.resolve(process.env.MEETING_DATA_DIR) : path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'users.json');
try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
let db = { users: [] };
try {
  db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  if (!db.users) db.users = [];
} catch (e) { /* 首次运行无文件 */ }
function saveDb() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
  } catch (e) { console.error('save users failed', e); }
}

function makeSalt() { return crypto.randomBytes(16).toString('hex'); }
function hashPw(pw, salt) { return crypto.scryptSync(pw, salt, 64).toString('hex'); }
function verifyPw(pw, salt, hash) {
  try { return crypto.timingSafeEqual(Buffer.from(hashPw(pw, salt), 'hex'), Buffer.from(hash, 'hex')); }
  catch (e) { return false; }
}
function newToken() { return crypto.randomBytes(24).toString('hex'); }

app.post('/api/register', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ ok: false, msg: '用户名和密码必填' });
  if (username.length < 2 || username.length > 20) return res.status(400).json({ ok: false, msg: '用户名长度 2-20 位' });
  if (password.length < 4) return res.status(400).json({ ok: false, msg: '密码至少 4 位' });
  if (db.users.some(u => u.username === username)) return res.status(409).json({ ok: false, msg: '用户名已存在' });
  const user = { username, salt: makeSalt(), hash: '', token: null };
  user.hash = hashPw(password, user.salt);
  db.users.push(user); saveDb();
  user.token = newToken(); saveDb();
  res.json({ ok: true, token: user.token, username });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = db.users.find(u => u.username === username);
  if (!user || !verifyPw(password, user.salt, user.hash)) return res.status(401).json({ ok: false, msg: '用户名或密码错误' });
  user.token = newToken(); saveDb();
  res.json({ ok: true, token: user.token, username });
});

app.get('/api/me', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const user = db.users.find(u => u.token === token);
  if (!user) return res.status(401).json({ ok: false, msg: '未登录' });
  res.json({ ok: true, username: user.username });
});

app.post('/api/logout', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const user = db.users.find(u => u.token === token);
  if (user) { user.token = null; saveDb(); }
  res.json({ ok: true });
});

// 静态前端（强制 no-store，避免浏览器/移动端缓存旧 index.html 导致“修了没生效”）
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: 0,
  setHeaders: (res, filePath) => {
    if (/\.html?$/.test(filePath)) res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  }
}));

// 同源 WebRTC 信令（PeerJS 1.x 服务端），路径 /peerjs
// proxied:true 适配 Cloudflare 等反向代理；path 与前端 client 保持一致
const peerServer = ExpressPeerServer(server, {
  path: '/peerjs',
  proxied: true,
  debug: false,
  allow_discovery: false
});
app.use('/', peerServer);

server.listen(PORT, () => {
  console.log(`Meeting server running: http://localhost:${PORT}  (signaling at /peerjs)`);
});
