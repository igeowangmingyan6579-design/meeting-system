#!/bin/bash
# 创建 GitHub 仓库
# 使用方法: bash github-create-repo.sh

REPO_NAME="meeting-system"
ORG="igeowangmingyan6579-design"

echo "正在创建仓库: ${ORG}/${REPO_NAME}"

# 使用 gh CLI 创建仓库
gh repo create "${ORG}/${REPO_NAME}" \
  --description "极简会议系统 - 快速召集·零门槛入会·一键开会" \
  --public \
  --source=. \
  --remote=origin \
  --push 2>&1

if [ $? -eq 0 ]; then
  echo "✅ 仓库创建成功!"
  echo "🔗 https://github.com/${ORG}/${REPO_NAME}"
else
  echo "⚠️ 仓库可能已存在，尝试直接推送..."
  git remote add origin "https://${GITHUB_TOKEN}@github.com/${ORG}/${REPO_NAME}.git" 2>/dev/null || true
  git push -u origin main 2>&1
fi
