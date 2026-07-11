# -*- coding: utf-8 -*-
"""极简会议系统 · v20 主持人转让修复版 · 一次性完整+Netlify 堆叠备份"""
import os, sys, zipfile, datetime, shutil

WS = r"C:\Users\igeowang\WorkBuddy\2026-06-17-14-06-08"
SRC = os.path.join(WS, "meeting-backup-staging")   # 实时源码（含 server.js + public）
OPS = os.path.join(WS, "meeting-ops")
PUB = os.path.join(SRC, "public")
BACKUPS = os.path.join(WS, "backups")
os.makedirs(BACKUPS, exist_ok=True)

TS = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")

EXCLUDE_DIRS = {"node_modules", ".next", "__pycache__", ".git", "dist", "coturn", "nginx", "patches"}
EXCLUDE_FILES = {".turn_secret", "users.json", "server.log", ".DS_Store", "Thumbs.db", "jitsi.html"}
EXCLUDE_EXT = {".log", ".pyc"}

def skip(p):
    b = os.path.basename(p)
    if b in EXCLUDE_FILES: return True
    _, e = os.path.splitext(b)
    if e.lower() in EXCLUDE_EXT: return True
    return False

def add_tree(z, root, prefix):
    n = 0
    for dp, dns, fns in os.walk(root):
        dns[:] = [d for d in dns if d not in EXCLUDE_DIRS]
        for fn in fns:
            fp = os.path.join(dp, fn)
            if skip(fp): continue
            rel = os.path.relpath(fp, root)
            try:
                z.write(fp, os.path.join(prefix, rel))
                n += 1
            except Exception as ex:
                print("  [skip] %s: %s" % (fp, ex))
    return n

# ---------- 1) 完整备份 ----------
full_name = "会议系统-完整备份-%s.zip" % TS
full_path = os.path.join(BACKUPS, full_name)
total = 0
with zipfile.ZipFile(full_path, "w", zipfile.ZIP_DEFLATED) as z:
    total += add_tree(z, SRC, "meeting-backup-staging")
    total += add_tree(z, OPS, "meeting-ops")
    for extra in ["selftest.js", "transferdiag.js", "diag.js", "check_syntax.js"]:
        fp = os.path.join(WS, extra)
        if os.path.isfile(fp) and not skip(fp):
            z.write(fp, extra); total += 1
print("[OK] 完整备份: %s  (%d files, %d KB)" % (full_name, total, os.path.getsize(full_path)//1024))

# ---------- 2) Netlify 交付包 ----------
nl_name = "meeting-netlify-%s.zip" % TS
nl_path = os.path.join(BACKUPS, nl_name)
tmp = os.path.join(WS, "tmp-netlify-pkg")
if os.path.isdir(tmp): shutil.rmtree(tmp)
os.makedirs(tmp)
for f in ["index.html", "peerjs.min.js"]:
    shutil.copy2(os.path.join(PUB, f), os.path.join(tmp, f))
shutil.copy2(os.path.join(WS, "meeting-netlify", "config.js"), os.path.join(tmp, "config.js"))   # 云信令：静态部署永久可用
shutil.copy2(os.path.join(WS, "meeting-netlify", "netlify.toml"), os.path.join(tmp, "netlify.toml"))
with zipfile.ZipFile(nl_path, "w", zipfile.ZIP_DEFLATED) as z:
    for fn in sorted(os.listdir(tmp)):
        z.write(os.path.join(tmp, fn), fn)
shutil.rmtree(tmp)
print("[OK] Netlify 交付包: %s  (%d KB)" % (nl_name, os.path.getsize(nl_path)//1024))
print("DONE")
