# 极简会议系统 - 完整备份文档

**备份日期:** 2026-07-06 23:59 CST
**项目版本:** 40cb52f (HEAD)
**备份人:** 云猫

---

## 一、项目基本信息

- **名称:** 极简会议系统
- **描述:** 自主开发的开源视频会议平台
- **GitHub:** https://github.com/igeowangmingyan6579-design/meeting-system
- **技术栈:** Next.js + Express + TypeScript + PostgreSQL + Redis + mediasoup + WebRTC

---

## 二、完整文件清单

### 根目录
- `README.md`
- `.gitignore`
- `package.json`
- `docker-compose.yml`
- `.env.example`
- `github-create-repo.sh`

### 后端 (backend/)
- `Dockerfile`
- `.env`, `.env.example`
- `package.json`, `tsconfig.json`
- `prisma/schema.prisma`
- `src/index.ts` — 入口（Express + WebSocket）
- `src/lib/prisma.ts` — 数据库客户端
- `src/lib/mediasoup.ts` — WebRTC 媒体服务器
- `src/routes/auth.ts` — 注册/登录/获取用户
- `src/routes/meetings.ts` — 创建/加入/结束/删除会议
- `src/routes/participants.ts` — 踢人/清理
- `src/routes/webrtc.ts` — WebRTC 传输管理
- `src/utils/jwt.ts` — JWT 工具
- `src/utils/password.ts` — 密码哈希
- `src/utils/helpers.ts` — 辅助函数

### 前端 (frontend/)
- `Dockerfile`, `next.config.js`, `tailwind.config.js`
- `package.json`, `tsconfig.json`, `postcss.config.js`
- `src/pages/index.tsx` — 首页
- `src/pages/register.tsx` — 注册
- `src/pages/login.tsx` — 登录
- `src/pages/dashboard.tsx` — 控制面板
- `src/pages/join/[link].tsx` — 加入会议
- `src/pages/meeting/[link].tsx` — 会议室
- `src/pages/_app.tsx` — 应用入口
- `src/pages/_document.tsx` — 文档入口
- `src/styles/globals.css` — 全局样式
- `src/hooks/useWebRTC.ts` — WebRTC Hook

---

## 三、数据库 Schema

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

## 四、API 接口

### 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| GET | `/api/auth/me` | 获取当前用户 |

### 会议
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/meetings/create` | 创建会议室 |
| GET | `/api/meetings/:link` | 获取会议详情 |
| POST | `/api/meetings/:link/join` | 加入会议 |
| POST | `/api/meetings/:link/end` | 结束会议 |
| DELETE | `/api/meetings/:id` | 删除会议 |

### WebRTC
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/webrtc/room/host` | 创建主机传输 |
| POST | `/api/webrtc/room/join` | 加入房间传输 |

### WebSocket 信令
- `join-meeting` / `leave-meeting`
- `offer` / `answer` / `ice-candidate`
- `chat-message` / `screen-share-toggle`

---

## 五、备份文件

| 文件 | 大小 | 位置 |
|------|------|------|
| 完整代码包 | 96KB | `/tmp/meeting-system-clean-20260706.tar.gz` |
| GitHub 仓库 | - | https://github.com/igeowangmingyan6579-design/meeting-system |

---

## 六、提交历史

```
40cb52f clean: 移除所有第三方标志和印记，精简代码
229788e docs: 添加完整备份文档 BACKUP-README.md
f1c564f feat: Task 4 部署准备
146c3eb fix: 修复删除会议不工作和participants数据显示bug
578cf44 feat: UI全面优化 - 暗色主题、渐变背景、动画粒子
e1cdf59 feat: 极简会议系统 - 项目骨架搭建
```

---

**备份完成。此项目完全自主开发，无任何第三方标志、Logo、广告或印记。**
