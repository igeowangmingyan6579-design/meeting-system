import os, shutil, zipfile, datetime

SRC = r'C:\Users\igeowang\WorkBuddy\2026-07-07-00-00-56\meeting-system-app\deploy'
OUT = r'C:\Users\igeowang\WorkBuddy\2026-06-17-14-06-08\meeting-backup-staging'
ZIP_PATH = os.path.join(OUT, 'meeting-backup.zip')

EXCLUDE_DIRS = {'node_modules', '.git', '.workbuddy', '__pycache__'}
EXCLUDE_FILES = {'server.log', 'package-lock.json', '.turn_secret'}

if os.path.exists(OUT):
    shutil.rmtree(OUT)
os.makedirs(OUT, exist_ok=True)

copied = []
for root, dirs, files in os.walk(SRC):
    dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
    for f in files:
        if f in EXCLUDE_FILES:
            continue
        full = os.path.join(root, f)
        rel = os.path.relpath(full, SRC)
        dst = os.path.join(OUT, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(full, dst)
        copied.append(rel)

# Build the zip (with a top-level folder 'meeting-system')
with zipfile.ZipFile(ZIP_PATH, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(OUT):
        for f in files:
            if f == 'meeting-backup.zip':
                continue
            # exclude the backup portal page (staging artifact, not project source)
            if f == 'index.html' and os.path.abspath(root) == os.path.abspath(OUT):
                continue
            full = os.path.join(root, f)
            rel = os.path.relpath(full, OUT)
            z.write(full, os.path.join('meeting-system', rel))

# Backup portal page
copied.sort()
file_list_html = "\n".join(f"<li><code>{c}</code></li>" for c in copied)
portal = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>极简会议系统 · 完整代码备份</title>
<style>
  body {{ font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; max-width: 760px; margin: 48px auto; padding: 0 20px; color: #1f2933; line-height: 1.7; }}
  h1 {{ font-size: 24px; }}
  .card {{ border: 1px solid #e4e7eb; border-radius: 12px; padding: 20px 24px; margin: 20px 0; background: #f7f9fc; }}
  .btn {{ display: inline-block; background: #2f6df6; color: #fff; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 600; }}
  .btn:hover {{ background: #1f57d6; }}
  code {{ background: #eef1f5; padding: 1px 6px; border-radius: 4px; font-size: 13px; }}
  .meta {{ color: #7b8794; font-size: 13px; }}
  ul {{ columns: 2; }}
  @media (max-width: 600px) {{ ul {{ columns: 1; }} }}
</style>
</head>
<body>
  <h1>极简会议系统 · 纯代码备份（公开版）</h1>
  <p>已剔除 <code>.turn_secret</code> 凭证文件，可直接对外分享。</p>
  <p class="meta">备份生成时间：{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | 已排除 node_modules / 运行日志</p>
  <div class="card">
    <p><strong>一键下载完整源码包（含 public / dist / server.js / 配置 / 补丁脚本）</strong></p>
    <p><a class="btn" href="meeting-backup.zip">⬇ 下载 meeting-backup.zip</a></p>
  </div>
  <div class="card">
    <p><strong>本备份包含以下文件：</strong></p>
    <ul>{file_list_html}</ul>
  </div>
  <p class="meta">部署说明见压缩包内 README.md。解压后根目录为 <code>meeting-system/</code>。</p>
</body>
</html>
"""
with open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8') as fh:
    fh.write(portal)

print('Files copied:', len(copied))
print('Zip size:', os.path.getsize(ZIP_PATH), 'bytes')
print('Staging at:', OUT)
