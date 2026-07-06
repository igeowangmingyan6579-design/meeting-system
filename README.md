# 极简会议系统

自主开发的开源视频会议平台。

## 功能

- 一键创建会议室
- 零注册入会
- 链接一次有效
- 3天自动清理

## 技术栈

- 前端：Next.js
- 后端：Express + TypeScript
- 数据库：PostgreSQL
- 实时通信：WebRTC + mediasoup
- 部署：Docker

## 快速开始

```bash
# 后端
cd backend
npm install
npm run dev

# 前端
cd frontend
npm install
npm run dev
```

## 部署

```bash
docker compose up -d
```
