#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把 dist/index.html 改造成「自托管 PeerJS 信令 + coturn 穿透 + 雾蓝浅色主题」版本。
- PeerJS host: 0.peerjs.com  ->  window.location.hostname (同域自托管)
- 注入 STUN/TURN iceServers (指向同域 3478)
- 深色主题 -> 雾蓝浅色 (冷静、不沉重、全员可接受)
"""
import os

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE, "dist", "index.html")
SECRET = open(os.path.join(BASE, ".turn_secret"), encoding="utf-8").read().strip()

with open(SRC, encoding="utf-8") as f:
    html = f.read()

# ── 1. :root 主题变量：深色 -> 雾蓝浅色 ──────────────────────
OLD_ROOT = """:root{
  --bg:#0a0e1a;--bg2:#111827;--bg3:#1e293b;--bg4:#334155;
  --text:#fff;--text2:#94a3b8;--text3:#64748b;--text4:#475569;
  --blue:#3b82f6;--blue2:#2563eb;--purple:#8b5cf6;
  --green:#22c55e;--red:#ef4444;--yellow:#f59e0b;
  --radius:12px;--radius-sm:8px;
}"""
NEW_ROOT = """:root{
  --bg:#eef2f7;--bg2:#e2e8f0;--bg3:#ffffff;--bg4:#cbd5e1;
  --text:#1e293b;--text2:#475569;--text3:#64748b;--text4:#94a3b8;
  --blue:#378ADD;--blue2:#2563eb;--purple:#7F77DD;
  --green:#16a34a;--red:#dc2626;--yellow:#d97706;
  --radius:12px;--radius-sm:8px;
}"""
assert OLD_ROOT in html, "未找到 :root 块"
html = html.replace(OLD_ROOT, NEW_ROOT)

# ── 2. PeerJS 自托管 + TURN/STUN ────────────────────────────
OLD_PEER = """      host: '0.peerjs.com',
      port: 443,
      secure: true,
      debug: 0"""
NEW_PEER = """      host: window.location.hostname,
      port: 443,
      path: '/peerjs',
      secure: true,
      debug: 0,
      config: {
        iceServers: [
          { urls: 'stun:' + window.location.hostname + ':3478' },
          { urls: 'turn:' + window.location.hostname + ':3478', username: 'meeting', credential: '%s' }
        ]
      }""" % SECRET
assert OLD_PEER in html, "未找到 PeerJS host 配置"
html = html.replace(OLD_PEER, NEW_PEER)

# ── 3. 指定处文字颜色（在浅底上必须翻深色）─────────────────
html = html.replace(
    "var(--bg4);border-radius:var(--radius);color:#fff;font-size:14px;outline:none",
    "var(--bg4);border-radius:var(--radius);color:var(--text);font-size:14px;outline:none")
html = html.replace(
    ".btn-icon{width:48px;height:48px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:20px;transition:all .2s;color:#fff;background:rgba(255,255,255,.08)}",
    ".btn-icon{width:48px;height:48px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:20px;transition:all .2s;color:var(--text);background:rgba(15,23,42,.06)}")
html = html.replace(
    "background:linear-gradient(135deg,#fff,var(--text2))",
    "background:linear-gradient(135deg,var(--text),var(--text2))")
html = html.replace(
    ".error-box{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:var(--radius);padding:10px 14px;color:#fca5a5;font-size:13px;margin-bottom:20px}",
    ".error-box{background:rgba(220,38,38,.08);border:1px solid rgba(220,38,38,.25);border-radius:var(--radius);padding:10px 14px;color:var(--red);font-size:13px;margin-bottom:20px}")
html = html.replace(
    ".btn-danger{background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.25);color:#fca5a5}",
    ".btn-danger{background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.25);color:var(--red)}")
html = html.replace(
    "background: '#000', minHeight: '100vh'",
    "background: 'var(--bg2)', minHeight: '100vh'")

# ── 4. 全局深色半透明面 -> 浅色半透明面 ─────────────────────
REPS = [
    ("rgba(255,255,255,.06)", "rgba(15,23,42,.08)"),
    ("rgba(255,255,255,.08)", "rgba(15,23,42,.06)"),
    ("rgba(255,255,255,.1)",  "rgba(15,23,42,.08)"),
    ("rgba(255,255,255,.05)", "rgba(15,23,42,.06)"),
    ("rgba(255,255,255,.03)", "rgba(15,23,42,.04)"),
    ("rgba(255,255,255,.02)", "rgba(15,23,42,.03)"),
    ("rgba(15,23,42,.6)",  "rgba(255,255,255,.85)"),
    ("rgba(15,23,42,.95)", "rgba(255,255,255,.92)"),
    ("rgba(15,23,42,.98)", "rgba(255,255,255,.96)"),
    ("rgba(30,41,59,.5)",  "rgba(255,255,255,.7)"),
    ("rgba(30,41,59,.8)",  "rgba(255,255,255,.85)"),
    ("rgba(0,0,0,.4)",     "rgba(15,23,42,.08)"),
]
for a, b in REPS:
    html = html.replace(a, b)

with open(SRC, "w", encoding="utf-8") as f:
    f.write(html)

# 校验：旧深色值应全部消失，新主题/自托管应出现
checks = {
    "旧 host 0.peerjs.com": "0.peerjs.com" not in html,
    "新 path /peerjs": "/peerjs" in html,
    "TURN credential 注入": SECRET in html,
    "雾蓝 --bg:#eef2f7": "--bg:#eef2f7" in html,
    "旧深底 #0a0e1a 清除": "#0a0e1a" not in html,
}
print("patched:", len(html), "bytes")
for k, v in checks.items():
    print(("  OK  " if v else " FAIL ") + k)
