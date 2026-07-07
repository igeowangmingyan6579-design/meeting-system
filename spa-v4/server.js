/**
 * 极简会议 — WebSocket 信令服务器
 * 同时提供静态文件服务 + WebRTC 信令中继
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, 'dist');

// MIME types
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webm': 'video/webm',
};

// ─── Room manager ─────────────────────────────────────────
const rooms = new Map(); // link -> Map<peerId, { ws, name }>

function getRoom(link) {
  if (!rooms.has(link)) rooms.set(link, new Map());
  return rooms.get(link);
}

function broadcast(link, senderId, data) {
  const room = getRoom(link);
  for (const [peerId, peer] of room) {
    if (peerId !== senderId && peer.ws.readyState === 1) {
      peer.ws.send(JSON.stringify(data));
    }
  }
}

// ─── HTTP server ──────────────────────────────────────────
const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(DIST, urlPath);

  // Security: prevent directory traversal
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback: serve index.html for unknown routes
      fs.readFile(path.join(DIST, 'index.html'), (err2, data2) => {
        if (err2) {
          res.writeHead(404);
          res.end('Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(data2);
        }
      });
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
});

// ─── WebSocket signaling ──────────────────────────────────
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  let myLink = null;
  let myPeerId = null;
  let myName = '';

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    switch (msg.type) {
      case 'join': {
        myLink = msg.link;
        myPeerId = msg.peerId;
        myName = msg.name || 'anonymous';
        const room = getRoom(myLink);

        // Tell the new peer about existing peers (so it can create offers)
        const existingPeers = [];
        for (const [id, peer] of room) {
          existingPeers.push({ peerId: id, name: peer.name });
        }

        // Register this peer
        room.set(myPeerId, { ws, name: myName });

        // Notify others about the new peer
        broadcast(myLink, myPeerId, {
          type: 'peer-joined',
          peerId: myPeerId,
          name: myName,
        });

        // Tell new peer about everyone else
        if (existingPeers.length > 0) {
          ws.send(JSON.stringify({
            type: 'peers-list',
            peers: existingPeers,
          }));
        }

        console.log(`[+] ${myName} joined room ${myLink} (${room.size} peers)`);
        break;
      }

      case 'offer':
      case 'answer':
      case 'ice-candidate':
      case 'chat':
      case 'leave':
        if (myLink) {
          // Forward to all peers in the room except sender
          broadcast(myLink, myPeerId, {
            ...msg,
            peerId: myPeerId,
          });
        }
        break;

      default:
        // Unknown message type, ignore
        break;
    }
  });

  ws.on('close', () => {
    if (myLink && myPeerId) {
      const room = getRoom(myLink);
      room.delete(myPeerId);
      console.log(`[-] ${myName} left room ${myLink} (${room.size} peers)`);

      broadcast(myLink, myPeerId, {
        type: 'peer-left',
        peerId: myPeerId,
        name: myName,
      });

      // Clean up empty rooms
      if (room.size === 0) rooms.delete(myLink);
    }
  });

  ws.on('error', (err) => {
    console.error(`[!] WebSocket error for ${myName}:`, err.message);
  });
});

// ─── Health check ─────────────────────────────────────────
server.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      rooms: rooms.size,
      totalPeers: Array.from(rooms.values()).reduce((sum, r) => sum + r.size, 0),
    }));
  }
});

server.listen(PORT, () => {
  console.log(`\n  🎥 极简会议 信令服务器已启动`);
  console.log(`  📡 HTTP:  http://localhost:${PORT}`);
  console.log(`  🔌 WS:    ws://localhost:${PORT}/ws`);
  console.log(`  📁 Static: ${DIST}\n`);
});
