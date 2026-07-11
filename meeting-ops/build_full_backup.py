# -*- coding: utf-8 -*-
"""
极简会议系统 · 完整备份打包
把「源码 + 运维脚本 + 运维手册 + 账号数据快照」打成一个总包，用于长久保存。
"""
import os, shutil, zipfile, datetime, subprocess, sys

WS       = r'C:\Users\igeowang\WorkBuddy\2026-06-17-14-06-08'
SRC_ZIP  = os.path.join(WS, 'meeting-backup-staging', 'meeting-backup.zip')  # 源码包（build_backup.py 产物）
OPS_DIR  = os.path.join(WS, 'meeting-ops')
DATA     = os.path.join(WS, 'meeting-data', 'users.json')
OUT_DIR  = os.path.join(WS, 'meeting-full-backup')
STAMP    = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
FULL_ZIP = os.path.join(OUT_DIR, f'会议系统-完整备份-{STAMP}.zip')

if os.path.exists(OUT_DIR):
    # 只清理旧的 zip 和门户，保留目录
    for f in os.listdir(OUT_DIR):
        try: os.remove(os.path.join(OUT_DIR, f))
        except: pass
else:
    os.makedirs(OUT_DIR, exist_ok=True)

added = []
with zipfile.ZipFile(FULL_ZIP, 'w', zipfile.ZIP_DEFLATED) as z:
    # 1) 源码包（原样嵌入）
    if os.path.exists(SRC_ZIP):
        z.write(SRC_ZIP, os.path.join('01-源码', 'meeting-backup.zip'))
        added.append('01-源码/meeting-backup.zip')
    # 2) 运维脚本 + 手册
    for f in os.listdir(OPS_DIR):
        full = os.path.join(OPS_DIR, f)
        if os.path.isfile(full):
            z.write(full, os.path.join('02-运维', f))
            added.append(f'02-运维/{f}')
    # 3) 账号数据快照（含 scrypt 哈希，无明文密码）
    if os.path.exists(DATA):
        z.write(DATA, os.path.join('03-数据快照', 'users.json'))
        added.append('03-数据快照/users.json')

# 备份门户页
files_html = "\n".join(f"<li><code>{a}</code></li>" for a in added)
zip_name = os.path.basename(FULL_ZIP)
portal = f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>极简会议系统 · 完整备份</title>
<style>
 body{{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;max-width:760px;margin:48px auto;padding:0 20px;color:#1f2933;line-height:1.7}}
 h1{{font-size:24px}} .card{{border:1px solid #e4e7eb;border-radius:12px;padding:20px 24px;margin:20px 0;background:#f7f9fc}}
 .btn{{display:inline-block;background:#2f6df6;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600}}
 .btn:hover{{background:#1f57d6}} code{{background:#eef1f5;padding:1px 6px;border-radius:4px;font-size:13px}}
 .meta{{color:#7b8794;font-size:13px}} ul{{columns:2}} @media(max-width:600px){{ul{{columns:1}}}}
 .tag{{display:inline-block;background:#e8f0fe;color:#2f6df6;padding:2px 10px;border-radius:20px;font-size:12px;margin-right:6px}}
</style></head><body>
 <h1>极简会议系统 · 完整备份</h1>
 <p><span class="tag">源码</span><span class="tag">运维脚本</span><span class="tag">运维手册</span><span class="tag">账号快照</span></p>
 <p class="meta">备份时间：{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
 <div class="card">
   <p><strong>一键下载完整备份（含全部内容）</strong></p>
   <p><a class="btn" href="{zip_name}">⬇ 下载 {zip_name}</a></p>
 </div>
 <div class="card">
   <p><strong>包内结构：</strong></p>
   <ul>{files_html}</ul>
   <p class="meta">01-源码：完整前后端代码（含 README 部署手册）｜02-运维：一键启动脚本 + 运维手册（长久稳定方案）｜03-数据快照：注册账号（scrypt 哈希，无明文密码）</p>
 </div>
 <p class="meta">恢复方法见包内「02-运维/运维手册.md」。</p>
</body></html>"""
with open(os.path.join(OUT_DIR, 'index.html'), 'w', encoding='utf-8') as fh:
    fh.write(portal)

print('Full backup:', FULL_ZIP)
print('Size:', os.path.getsize(FULL_ZIP), 'bytes')
print('Entries:', len(added))
for a in added: print('  -', a)
