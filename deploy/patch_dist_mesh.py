#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
在「雾蓝公共云版」基础上做连接修复（不破坏主题）：
1) 本地化 PeerJS（不再依赖 unpkg CDN）
2) 信令改为同源 /peerjs（配合本机 server.js，单实例稳定，不再用公共云）
3) 修复全连接 mesh：host 维护参会者名册并广播，所有人据此互连 -> 多人可互见
输出覆盖 deploy/public/index.html
"""
import os, io

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE, "public", "index.html")
OUT = SRC

html = io.open(SRC, encoding="utf-8").read()
n_changes = 0
def rep(old, new, must=True):
    global html, n_changes
    if old not in html:
        if must:
            raise SystemExit("PATCH FAIL: 未找到:\n" + old[:120])
        return
    html = html.replace(old, new, 1)
    n_changes += 1

# --- 1) 本地化 PeerJS 脚本 ---
rep(
    '<script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"></script>',
    '<script src="peerjs.min.js"></script>'
)

# --- 2) 信令改为同源 /peerjs（本机 server.js 提供）---
rep(
"""    const myPeerId = peerId(link, myRole);
    peer = new Peer(myPeerId, {
      host: '0.peerjs.com',
      port: 443,
      secure: true,
      debug: 0
    });""",
"""    const myPeerId = peerId(link, myRole);
    peer = new Peer(myPeerId, {
      path: '/peerjs',
      secure: location.protocol === 'https:',
      debug: 0
    });"""
)

# --- 3) 顶部声明 roster ---
rep(
    "  let connections = {};",
    "  let connections = {};\n  let roster = {};"
)

# --- 4) 收到来电：host 收集名册并广播 ---
rep(
"""    peer.on('call', (call) => {
      console.log('[PeerJS] Incoming call from:', call.peer);
      call.answer(localStream);

      const callerName = call.metadata ? call.metadata.name : '参会者';
      const callerRole = call.metadata ? call.metadata.role : 'participant';""",
"""    peer.on('call', (call) => {
      console.log('[PeerJS] Incoming call from:', call.peer);
      call.answer(localStream);

      const callerName = call.metadata ? call.metadata.name : '参会者';
      const callerRole = call.metadata ? call.metadata.role : 'participant';
      if (isHost) { roster[call.peer] = callerName; broadcastRoster(); }"""
)

# --- 5) 来电关闭：host 移除名册 ---
rep(
"""      call.on('close', () => {
        console.log('[PeerJS] Call closed:', call.peer);
        removeRemoteVideo(call.peer);
        delete calls[call.peer];
        delete connections[call.peer];
        renderParticipants();
      });""",
"""      call.on('close', () => {
        console.log('[PeerJS] Call closed:', call.peer);
        removeRemoteVideo(call.peer);
        delete calls[call.peer];
        delete connections[call.peer];
        if (isHost) { delete roster[call.peer]; broadcastRoster(); }
        renderParticipants();
      });"""
)

# --- 6) DataChannel 消息处理：加 roster + 收集 dc 名册 ---
rep(
"""      conn.on('data', (data) => {
        if (data.type === 'chat') { chatMessages.push({ sender: data.sender, text: data.text, time: Date.now() }); renderChat(); }
        else if (data.type === 'participant-info') {
          connections[conn.peer] = { name: data.name, connected: true, role: data.role };
          renderParticipants();
        }
      });""",
"""      conn.on('data', (data) => {
        if (data.type === 'chat') { chatMessages.push({ sender: data.sender, text: data.text, time: Date.now() }); renderChat(); }
        else if (data.type === 'participant-info') {
          connections[conn.peer] = { name: data.name, connected: true, role: data.role };
          if (isHost) { roster[conn.peer] = data.name; broadcastRoster(); }
          renderParticipants();
        }
        else if (data.type === 'roster') { handleRoster(data.ids); }
      });"""
)

# --- 7) broadcastRoster / handleRoster 函数定义 ---
rep(
"""  function sendChat(text) { chatMessages.push({ sender: myName, text, time: Date.now() }); renderChat(); broadcastChat(text); }""",
"""  function broadcastRoster() {
    if (!isHost) return;
    const ids = Array.from(new Set([myPeerId, ...Object.keys(roster)]));
    for (const [pid, dc] of Object.entries(dcMap)) { try { dc.send({ type: 'roster', ids }); } catch (e) {} }
  }
  function handleRoster(ids) {
    ids.forEach(i => { if (i !== myPeerId) callPeer(i, 'participant', i); });
    renderParticipants();
  }
  function sendChat(text) { chatMessages.push({ sender: myName, text, time: Date.now() }); renderChat(); broadcastChat(text); }"""
)

# --- 8) renderParticipants 改用 roster（多人互见）---
rep(
"""  function renderParticipants() {
    pList.innerHTML = '';
    const items = [{ name: myName + (isHost ? ' (主持人)' : ''), isMe: true }];
    for (const [pid, info] of Object.entries(connections)) { items.push({ name: info.name, isMe: false }); }
    items.forEach(p => {
      const row = el('div', { style: { display:'flex',alignItems:'center',gap:'12px',padding:'10px 12px',borderRadius:'8px',background:'rgba(255,255,255,0.02)',marginBottom:'6px' } });
      row.innerHTML = '<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--blue),var(--purple));display:flex;align-items:center;justify-content:center;font-size:14px">' + p.name.charAt(0).toUpperCase() + '</div><span style="font-size:14px;flex:1">' + p.name + '</span><span style="color:var(--green);font-size:11px">在线</span>';
      pList.appendChild(row);
    });
    peerCount.textContent = '参会人: ' + (1 + Object.keys(connections).length);
  }""",
"""  function renderParticipants() {
    pList.innerHTML = '';
    const allIds = Array.from(new Set([myPeerId, ...Object.keys(roster)]));
    allIds.forEach(id => {
      const isMe = (id === myPeerId);
      const name = isMe ? (myName + (isHost ? ' (主持人)' : '')) : (connections[id] ? connections[id].name : (roster[id] || '参会者'));
      const online = isMe || !!connections[id];
      const row = el('div', { style: { display:'flex',alignItems:'center',gap:'12px',padding:'10px 12px',borderRadius:'8px',background:'rgba(255,255,255,0.02)',marginBottom:'6px' } });
      row.innerHTML = '<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--blue),var(--purple));display:flex;align-items:center;justify-content:center;font-size:14px">' + name.charAt(0).toUpperCase() + '</div><span style="font-size:14px;flex:1">' + name + '</span><span style="color:var(--green);font-size:11px">' + (online ? '在线' : '连接中') + '</span>';
      pList.appendChild(row);
    });
    peerCount.textContent = '参会人: ' + allIds.length;
  }"""
)

io.open(OUT, "w", encoding="utf-8").write(html)

checks = {
    "本地化 peerjs 脚本": 'src="peerjs.min.js"' in html,
    "同源信令 /peerjs": "path: '/peerjs'" in html,
    "旧公共云 host 清除": "0.peerjs.com" not in html,
    "broadcastRoster 定义": "function broadcastRoster" in html,
    "handleRoster 定义": "function handleRoster" in html,
    "roster 类型处理": "data.type === 'roster'" in html,
    "renderParticipants 用 roster": "allIds" in html,
    "雾蓝主题保持 --bg:#eef2f7": "--bg:#eef2f7" in html,
}
print("patch ok, replacements:", n_changes)
for k, v in checks.items():
    print(("  OK  " if v else " FAIL ") + k)
