# 极简会议系统 · 备份清单

生成时间：2026-07-25

## 正式运行链接（给用户访问，非 github）
- Netlify：https://jm-meet.netlify.app/

## 代码备份位置（仅找回源码用，不是会议入口）
- 本机固定目录：C:\Users\igeowang\meeting-system-backup\
- 本机压缩包：C:\Users\igeowang\meeting-system-backup.zip
- GitHub 仓库（永久代码备份）：https://github.com/igeowangmingyan6579-design/meeting-system

## 文件清单
- meeting-system-source.html ：原创极简页源文件（含全部修复：TURN/垫片/内联PeerJS/favicon/挂断清场/等待提示）
- meeting-system-build.html ：构建产物（单文件自包含，已部署到 Netlify）
- build_meeting.py ：从源构建内联版
- deploy_netlify.py ：部署到 Netlify（需 NETLIFY_TOKEN 环境变量）
- deploy_ghpages.py ：部署到 GitHub Pages（备用）
- worklog-2026-07-25.md ：当天工作日志

## 重新部署命令
1) 构建：python build_meeting.py
2) 部署：NETLIFY_TOKEN=<token> python deploy_netlify.py
