const WebSocket = require('ws');
const paths = ['/peerjs/peerjs', '/peerjs', '/peerjs/peerjs/peerjs'];
function tryPath(p) {
  return new Promise((resolve) => {
    let done = false;
    const ws = new WebSocket('ws://localhost:8080' + p);
    const finish = (msg) => { if (!done) { done = true; console.log('PATH', p, '->', msg); try { ws.close(); } catch (e) {} resolve(); } };
    ws.on('open', () => {
      try { ws.send(JSON.stringify({ type: 'OPEN', payload: { browser: 'node', id: 't' + Date.now(), token: 'x' } })); }
      catch (e) { finish('SEND_ERR ' + e.message); }
    });
    ws.on('message', (d) => finish('OK msg=' + d.toString().slice(0, 90)));
    ws.on('error', (e) => finish('ERR ' + e.message));
    setTimeout(() => finish('TIMEOUT'), 2500);
  });
}
(async () => { for (const p of paths) { await tryPath(p); } process.exit(0); })();
