# 极简会议系统

极简网页端即时视频会议平台。核心：快速召集、零门槛入会、一键开会。

## 特性

- 零注册入会，参会者点开链接输入姓名即可加入
- 每次会议链接一次有效，结束后永久销毁
- 全平台多语言+实时翻译
- 主持人独有录屏权限
- 界面极简，老少皆宜
- 数据最小化留存，3天自动清理
- 联系人本地存储，隐私保护
- 完全开源，自主可控

## 技术栈

- 前端：Next.js + React + TypeScript + TailwindCSS
- 后端：Node.js + TypeScript + Express
- 视频：WebRTC + mediasoup (SFU)
- 翻译：faster-whisper + LibreTranslate (自托管)
- 数据库：PostgreSQL + Redis
- 部署：Docker Compose

## 快速开始

```bash
# 1. 克隆代码
git clone https://github.com/igeowangmingyan6579-design/meeting-system.git
cd meeting-system

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 填入配置

# 4. 启动开发服务器
npm run dev

# 5. 生产部署
docker-compose up -d
```

## 项目结构

```
meeting-system/
├── frontend/           # Next.js 前端
│   ├── src/
│   │   ├── app/        # 路由页面
│   │   ├── components/ # UI组件
│   │   ├── hooks/      # 自定义hooks
│   │   ├── lib/        # 工具函数
│   │   └── styles/     # 样式
│   └── public/         # 静态资源
├── backend/            # Node.js 后端
│   ├── src/
│   │   ├── routes/     # API路由
│   │   ├── middleware/ # 中间件
│   │   ├── utils/      # 工具
│   │   └── models/     # 数据模型
│   └── prisma/         # 数据库schema
├── media/              # 录制文件存储
│   ├── recordings/     # 录制文件
│   └── temp/           # 临时文件
├── deploy/             # 部署配置
├── docker/             # Docker配置
└── docs/               # 文档
```

## 开发阶段

### 第一阶段：核心可用
- [x] 项目骨架搭建
- [ ] 用户注册/登录（仅邮箱）
- [ ] 创建会议室+生成链接
- [ ] 入会+音视频通话
- [ ] 主持人控制（静音/踢人/录制）
- [ ] 链接一次失效

### 第二阶段：体验完善
- [ ] 邮件邀请（可选）
- [ ] 屏幕共享
- [ ] 文字聊天
- [ ] 多语言界面（6种基础）
- [ ] 本地联系人存储

### 第三阶段：翻译+录制+清理
- [ ] 实时字幕翻译
- [ ] 云端录制
- [ ] 3天自动清理机制
- [ ] 安全加固

## 环境变量

详见 `.env.example`

## 许可证

MIT

## 联系方式

- GitHub: https://github.com/igeowangmingyan6579-design/meeting-system
