# 极简会议系统 - 完整备份文档

**备份日期:** 2026-07-06 21:55 CST
**项目版本:** f1c564f (HEAD)
**备份人:** 云猫

---

## 一、项目基本信息

- **名称:** 极简会议系统 (Minimalist Meeting System)
- **描述:** 极简网页端即时视频会议平台，快速召集、零门槛入会、一键开会
- **GitHub:** https://github.com/igeowangmingyan6579-design/meeting-system
- **Cloudflare Tunnel:** https://jackie-assumptions-designs-him.trycloudflare.com
- **技术栈:** Next.js + Express + TypeScript + PostgreSQL + Redis + mediasoup + WebRTC

---

## 二、完整文件清单

### 根目录文件

| 文件 | 说明 |
|------|------|
| `README.md` | 项目说明文档 |
| `.gitignore` | Git忽略规则 |
| `package.json` | 根目录包管理 |
| `docker-compose.yml` | Docker编排配置 |
| `.env.example` | 环境变量示例 |
| `github-create-repo.sh` | GitHub仓库创建脚本 |

### 后端 (backend/)

| 文件 | 说明 |
|------|------|
| `Dockerfile` | 后端Docker镜像 |
| `.env` | 后端环境变量 |
| `.env.example` | 环境变量示例 |
| `package.json` | 后端包管理 |
| `tsconfig.json` | TypeScript配置 |
| `prisma/schema.prisma` | 数据库Schema |
| `src/index.ts` | 后端入口（含WebSocket信令） |
| `src/lib/prisma.ts` | Prisma客户端 |
| `src/lib/mediasoup.ts` | mediasoup管理器 |
| `src/routes/auth.ts` | 认证路由（注册/登录/获取用户） |
| `src/routes/meetings.ts` | 会议路由（创建/加入/结束/删除） |
| `src/routes/participants.ts` | 参会者路由（踢人/清理） |
| `src/routes/webrtc.ts` | WebRTC路由（传输/房间） |
| `src/utils/jwt.ts` | JWT工具 |
| `src/utils/password.ts` | 密码哈希工具 |
| `src/utils/helpers.ts` | 辅助函数（短链/会议ID生成） |

### 前端 (frontend/)

| 文件 | 说明 |
|------|------|
| `Dockerfile` | 前端Docker镜像 |
| `next.config.js` | Next.js配置 |
| `next-env.d.ts` | Next.js类型声明 |
| `package.json` | 前端包管理 |
| `tsconfig.json` | TypeScript配置 |
| `postcss.config.js` | PostCSS配置 |
| `tailwind.config.js` | TailwindCSS配置 |
| `src/pages/index.tsx` | 首页（着陆页） |
| `src/pages/register.tsx` | 注册页 |
| `src/pages/login.tsx` | 登录页 |
| `src/pages/dashboard.tsx` | 控制面板（创建/管理会议） |
| `src/pages/join/[link].tsx` | 加入会议页 |
| `src/pages/meeting/[link].tsx` | 会议室页面 |
| `src/pages/_app.tsx` | Next.js应用入口 |
| `src/pages/_document.tsx` | Next.js文档入口 |
| `src/styles/globals.css` | 全局样式 |
| `src/hooks/useWebRTC.ts` | WebRTC自定义Hook |

### 其他目录

| 路径 | 说明 |
|------|------|
| `docs/DEPLOYMENT.md` | 部署指南 |
| `tests/e2e-test.sh` | 端到端自动化测试脚本 |
| `deploy/` | 部署配置目录 |
| `docker/` | Docker配置目录 |
| `media/` | 媒体文件存储 |

---

## 三、数据库 Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  meetings  Meeting[]
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
  
  @@index([link])
  @@index([endedAt])
}

model Participant {
  id         String   @id @default(uuid())
  meetingId  String
  meeting    Meeting  @relation(fields: [meetingId], references: [id])
  name       String
  joinedAt   DateTime @default(now())
  
  @@index([meetingId])
}
```

---

## 四、API 接口清单

### 认证 (Auth)
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/register` | 用户注册 | 否 |
| POST | `/api/auth/login` | 用户登录 | 否 |
| GET | `/api/auth/me` | 获取当前用户 | 是 |

### 会议 (Meetings)
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/meetings/create` | 创建会议室 | 是 |
| GET | `/api/meetings/:link` | 获取会议详情 | 否 |
| POST | `/api/meetings/:link/join` | 加入会议 | 否 |
| POST | `/api/meetings/:link/end` | 结束会议 | 是 |
| DELETE | `/api/meetings/:id` | 删除会议 | 是 |
| DELETE | `/api/meetings/host/bulk-delete` | 批量删除 | 是 |
| GET | `/api/meetings/host/meetings` | 主持人会议列表 | 是 |

### 参会者 (Participants)
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/participants/:link/kick/:participantId` | 踢出参会者 | 是 |
| POST | `/api/participants/:link/cleanup` | 清理录制文件 | 是 |

### WebRTC
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/webrtc/room/host` | 创建主机传输 | 是 |
| POST | `/api/webrtc/room/join` | 加入房间传输 | 否 |
| POST | `/api/webrtc/transport/create` | 创建新传输 | 是 |
| GET | `/api/webrtc/room/status/:meetingId` | 获取房间状态 | 否 |
| POST | `/api/webrtc/room/leave` | 用户离开 | 是 |

### WebSocket 信令
| 事件 | 说明 |
|------|------|
| `join-meeting` | 加入房间，接收房间状态 |
| `leave-meeting` | 离开房间，清理资源 |
| `offer` | SDP offer 转发 |
| `answer` | SDP answer 转发 |
| `ice-candidate` | ICE候选转发 |
| `chat-message` | 聊天消息广播 |
| `screen-share-toggle` | 屏幕共享切换 |

---

## 五、环境变量配置

### 后端 (.env)
```
NODE_ENV=development
PORT=3001
HOST=0.0.0.0
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/meeting_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=<your-secret>
MEDIASOUP_LISTEN_ADDRS=127.0.0.1
MEDIASOUP_ANNOUNCED_ADDRS=127.0.0.1
MEDIASOUP_MIN_PORT=10000
MEDIASOUP_MAX_PORT=20000
RECORDINGS_DIR=./media/recordings
TEMP_DIR=./media/temp
CLEANUP_DAYS=3
WHISPER_MODEL=turbo
LIBRETRANSLATE_URL=http://localhost:5000
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
ALLOWED_ORIGINS=*
APP_URL=https://jackie-assumptions-designs-him.trycloudflare.com
```

### 前端 (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_APP_NAME=极简会议
```

---

## 六、Docker 部署

### docker-compose.yml 服务
| 服务 | 端口 | 说明 |
|------|------|------|
| backend | 3001 | Express API + WebSocket |
| frontend | 3000 | Next.js 应用 |
| db | 5432 | PostgreSQL 16 |
| redis | 6379 | Redis 7 |

### 启动命令
```bash
docker compose up -d
```

---

## 七、Git 提交历史

```
f1c564f feat: Task 4 部署准备 - Docker优化、限流、健康检查、部署文档
146c3eb fix: 修复删除会议不工作和participants数据显示bug
578cf44 feat: UI全面优化 - 暗色主题、渐变背景、动画粒子
e1cdf59 feat: 极简会议系统 - 项目骨架搭建
```

---

## 八、当前已知问题

1. **前端注册/登录表单无法提交** — Next.js 客户端 hydration 未正确触发，`__NEXT_P` 为空，React 事件监听器未绑定到 DOM
2. **mediasoup worker 单例模式** — 当前实现只有一个 worker 实例，多进程部署时需改造
3. **Redis 订阅器非关键路径** — 如果 Redis 不可用，会议功能降级但不崩溃

---

## 九、备份验证

- [x] 所有源代码文件已读取并记录
- [x] 配置文件已备份
- [x] 环境变量示例已备份
- [x] 数据库 Schema 已备份
- [x] API 接口清单已整理
- [x] Git 历史记录已导出
- [x] 部署文档已备份

---

**备份完成。此文档可作为项目恢复的完整参考。**
