# -*- coding: utf-8 -*-
"""
极简会议系统 · 一键版本化完整备份
=====================================
每次运行都会生成一个【带时间戳、永不覆盖】的完整备份 zip，
放进 backups/ 目录堆叠保存，并把这次备份追加写进 BACKUP-LOG.md。

用途：王爷每做完一个部分就跑一次，历史版本全部保留，随时可回溯/交回公司。

用法：
    python backup_all.py            # 生成一个新版本备份
    python backup_all.py --note "加了英文对照"   # 备注这次改了啥
"""
import os, sys, zipfile, datetime, hashlib, subprocess

# ---- 路径配置 ----
WS       = r"C:\Users\igeowang\WorkBuddy\2026-06-17-14-06-08"
SRC      = r"C:\Users\igeowang\WorkBuddy\2026-07-07-00-00-56\meeting-system-app"
DEPLOY   = os.path.join(SRC, "deploy")
OPS      = os.path.join(WS, "meeting-ops")
NETLIFY  = os.path.join(WS, "meeting-netlify")
BACKUPS  = os.path.join(WS, "backups")

# 排除规则：依赖、日志、密钥、运行时用户数据不进备份
EXCLUDE_DIRS  = {"node_modules", ".next", "__pycache__", ".git"}
EXCLUDE_FILES = {".turn_secret", "users.json", "server.log", ".DS_Store", "Thumbs.db"}
EXCLUDE_EXT   = {".log", ".pyc"}

def should_skip(path):
    base = os.path.basename(path)
    if base in EXCLUDE_FILES:
        return True
    _, ext = os.path.splitext(base)
    if ext.lower() in EXCLUDE_EXT:
        return True
    return False

def add_tree(z, root, arc_prefix):
    """把 root 目录整个塞进 zip，arc_prefix 为在zip内的顶层目录名"""
    count = 0
    if not os.path.isdir(root):
        return 0
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for fn in filenames:
            fp = os.path.join(dirpath, fn)
            if should_skip(fp):
                continue
            rel = os.path.relpath(fp, root)
            arc = os.path.join(arc_prefix, rel)
            try:
                z.write(fp, arc)
                count += 1
            except Exception as e:
                print(f"  [skip] {fp}: {e}")
    return count

def add_file(z, fp, arc):
    if os.path.isfile(fp) and not should_skip(fp):
        z.write(fp, arc)
        return 1
    return 0

def git_hash():
    try:
        out = subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=SRC, stderr=subprocess.DEVNULL
        ).decode().strip()
        return out
    except Exception:
        return "n/a"

def main():
    note = ""
    if "--note" in sys.argv:
        i = sys.argv.index("--note")
        if i + 1 < len(sys.argv):
            note = sys.argv[i + 1]

    os.makedirs(BACKUPS, exist_ok=True)
    ts = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    zip_name = f"会议系统-完整备份-{ts}.zip"
    zip_path = os.path.join(BACKUPS, zip_name)

    total = 0
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        # 1) 后端 + 前端源码（排除 node_modules / 密钥 / 日志）
        total += add_tree(z, DEPLOY, "source/deploy")
        # 2) 运维脚本 + 手册
        total += add_tree(z, OPS, "ops")
        # 3) Netlify 静态部署包
        total += add_tree(z, NETLIFY, "netlify")
        # 4) 顶层说明（如有）
        for f in ["README.md"]:
            add_file(z, os.path.join(DEPLOY, f), f)

    size = os.path.getsize(zip_path)
    gh = git_hash()

    # 写/追加 BACKUP-LOG.md
    log_path = os.path.join(BACKUPS, "BACKUP-LOG.md")
    if not os.path.exists(log_path):
        with open(log_path, "w", encoding="utf-8") as f:
            f.write("# 会议系统 · 备份历史记录\n\n")
            f.write("每行一个版本，最新在最上。永不删除旧记录。\n\n")
            f.write("| 时间 | 文件 | 大小 | 文件数 | git提交 | 备注 |\n")
            f.write("|------|------|------|--------|---------|------|\n")
    # 读旧内容，把新行插到表头下方
    with open(log_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    new_row = f"| {ts} | {zip_name} | {size//1024} KB | {total} | {gh} | {note or '-'} |\n"
    # 找到表头分隔行的位置插入
    insert_at = len(lines)
    for idx, ln in enumerate(lines):
        if ln.startswith("|------"):
            insert_at = idx + 1
            break
    lines.insert(insert_at, new_row)
    with open(log_path, "w", encoding="utf-8") as f:
        f.writelines(lines)

    print("=" * 50)
    print(f"[OK] 备份完成：{zip_name}")
    print(f"     路径：{zip_path}")
    print(f"     大小：{size//1024} KB   文件数：{total}   git：{gh}")
    if note:
        print(f"     备注：{note}")
    # 列出目前保留的所有历史版本
    all_zips = sorted([f for f in os.listdir(BACKUPS) if f.endswith(".zip")])
    print(f"     历史版本共 {len(all_zips)} 个（全部保留）：")
    for zf in all_zips:
        print(f"       - {zf}")
    print("=" * 50)

if __name__ == "__main__":
    main()
