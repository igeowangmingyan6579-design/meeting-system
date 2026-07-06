# 极简会议系统 - 完整备份文档

**备份日期:** 2026-07-07 00:46 CST
**项目版本:** eb6780c (HEAD)
**备份人:** 云猫

---

## 一、项目基本信息

- **名称:** 极简会议系统
- **描述:** 自主开发的开源视频会议平台
- **GitHub:** https://github.com/igeowangmingyan6579-design/meeting-system
- **技术栈:** Next.js + Express + TypeScript + PostgreSQL + Redis + mediasoup + WebRTC

---

## 二、当前可用链接

### Cloudflare Tunnel
**https://strategic-mathematics-biotechnology-etc.trycloudflare.com**

- 首页: https://strategic-mathematics-biotechnology-etc.trycloudflare.com/
- 注册: https://strategic-mathematics-biotechnology-etc.trycloudflare.com/register
- 登录: https://strategic-mathematics-biotechnology-etc.trycloudflare.com/login
- 控制面板: https://strategic-mathematics-biotechnology-etc.trycloudflare.com/dashboard
- 加入会议: https://strategic-mathematics-biotechnology-etc.trycloudflare.com/join/{link}
- 会议室: https://strategic-mathematics-biotechnology-etc.trycloudflare.com/meeting/{link}

### API 端点
- 注册: POST /api/auth/register
- 登录: POST /api/auth/login
- 获取用户: GET /api/auth/me
- 创建会议: POST /api/meetings/create
- 获取会议: GET /api/meetings/{link}
- 加入会议: POST /api/meetings/{link}/join
- 结束会议: POST /api/meetings/{link}/end
- 删除会议: DELETE /api/meetings/{id}
- 主持人会议列表: GET /api/meetings/host/meetings
- 踢人: POST /api/participants/{link}/kick/{participantId}
- WebRTC 传输: POST /api/webrtc/room/host, POST /api/webrtc/room/join

### WebSocket 信令
- ws://localhost:3001/ws
- 事件: join-meeting, leave-meeting, offer, answer, ice-candidate, chat-message, screen-share-toggle

---

## 三、完整文件清单

### 根目录
- `README.md` - 项目说明
- `.gitignore` - Git 忽略规则
- `package.json` - 根目录包管理
- `docker-compose.yml` - Docker 编排
- `.env.example` - 环境变量示例
- `github-create-repo.sh` - GitHub 仓库创建脚本

### 后端 (backend/)
- `Dockerfile` - 后端镜像
- `.env` - 环境变量
- `.env.example` - 环境变量示例
- `package.json` - 后端包管理
- `tsconfig.json` - TypeScript 配置
- `prisma/schema.prisma` - 数据库 Schema
- `src/index.ts` - 后端入口（Express + WebSocket）
- `src/lib/prisma.ts` - Prisma 客户端
- `src/lib/mediasoup.ts` - mediasoup 管理器
- `src/routes/auth.ts` - 认证路由
- `src/routes/meetings.ts` - 会议路由
- `src/routes/participants.ts` - 参会者路由
- `src/routes/webrtc.ts` - WebRTC 路由
- `src/utils/jwt.ts` - JWT 工具
- `src/utils/password.ts` - 密码哈希工具
- `src/utils/helpers.ts` - 辅助函数

### 前端 (frontend/)
- `Dockerfile` - 前端镜像
- `next.config.js` - Next.js 配置
- `next-env.d.ts` - Next.js 类型声明
- `package.json` - 前端包管理
- `tsconfig.json` - TypeScript 配置
- `postcss.config.js` - PostCSS 配置
- `tailwind.config.js` - TailwindCSS 配置
- `src/pages/index.tsx` - 首页
- `src/pages/register.tsx` - 注册页
- `src/pages/login.tsx` - 登录页
- `src/pages/dashboard.tsx` - 控制面板
- `src/pages/join/[link].tsx` - 加入会议页
- `src/pages/meeting/[link].tsx` - 会议室页面
- `src/pages/_app.tsx` - 应用入口
- `src/pages/_document.tsx` - 文档入口
- `src/styles/globals.css` - 全局样式
- `src/hooks/useWebRTC.ts` - WebRTC Hook

---

## 四、数据库 Schema

```prisma
model User {
  id       String   @id @default(uuid())
  email    String   @unique
  password String
  createdAt DateTime @default(now())
  meetings Meeting[]
}

model Meeting {
  id          String   @id @default(uuid())
  hostId      String
  host        User     @relation(fields: [hostId], references: [id])
  link        String   @unique
  title       String?
  createdAt   DateTime @default(now())
  startedAt   DateTime?
  endedAt     DateTime?
  isEnded     Boolean  @default(false)
  recordingUrl String?
  participants Participant[]
}

model Participant {
  id        String   @id @default(uuid())
  meetingId String
  meeting   Meeting  @relation(fields: [meetingId], references: [id])
  name      String
  joinedAt  DateTime @default(now())
}
```

---

## 五、提交历史

```
eb6780c fix: 修复后端启动问题，清理代码，确保可运行
857f72a docs: 更新备份文档
40cb52f clean: 移除所有第三方标志和印记，精简代码
229788e docs: 添加完整备份文档 BACKUP-README.md
f1c564f feat: Task 4 部署准备
146c3eb fix: 修复删除会议不工作和participants数据显示bug
578cf44 feat: UI全面优化 - 暗色主题、渐变背景、动画粒子
e1cdf59 feat: 极简会议系统 - 项目骨架搭建
```

---

## 六、部署说明

### 本地开发
```bash
# 后端
cd backend
npx tsx run-backend.mjs

# 前端
cd frontend
npx next start -p 3000
```

### Docker 部署
```bash
docker-compose up -d
```

### Cloudflare Tunnel
```bash
cloudflared tunnel --url http://localhost:3000
```

---

## 七、备份文件

| 文件 | 大小 | 位置 |
|------|------|------|
| 完整代码包 | 96KB | `/tmp/meeting-system-clean-20260706.tar.gz` |
| GitHub 仓库 | - | https://github.com/igeowangmingyan6579-design/meeting-system |

---

**备份完成。此项目完全自主开发，无任何第三方标志、Logo、广告或印记。**
