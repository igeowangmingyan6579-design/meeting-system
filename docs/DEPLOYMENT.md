# 极简会议系统 - 部署指南

## 部署架构

```
用户 → Nginx (反代 /api → 后端:3001, 其余 → 前端:3000) → 后端 + 前端
                                              ↓
                                         PostgreSQL:5432
                                              ↓
                                         Redis:6379
```

## 前置条件

- Docker + Docker Compose
- 火山引擎 CVM (cn-beijing)
- 域名（可选，开发阶段可用 IP）

## 快速部署

### 1. 克隆代码

```bash
git clone https://github.com/igeowangmingyan6579-design/meeting-system.git
cd meeting-system
```

### 2. 配置环境变量

```bash
# 后端
cp .env.example backend/.env
# 编辑 backend/.env，设置 DATABASE_URL、JWT_SECRET 等

# 前端
cp .env.example frontend/.env.local
# 编辑 frontend/.env.local
```

### 3. 初始化数据库

```bash
docker compose run --rm backend npx prisma migrate deploy
docker compose run --rm backend npx prisma db seed  # 如有种子数据
```

### 4. 启动服务

```bash
docker compose up -d
```

### 5. 配置 Nginx（可选，推荐）

创建 `/etc/nginx/sites-available/meeting-system`：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 或 IP

    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_read_timeout 3600s;
    }

    location /ws {
        proxy_pass http://127.0.0.1:3001/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

启用：
```bash
ln -s /etc/nginx/sites-available/meeting-system /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 6. 验证部署

```bash
curl http://localhost:3000       # 前端首页
curl http://localhost:3001/api/health  # 后端健康检查
```

## 防火墙配置（火山引擎安全组）

开放端口：
- 80 (HTTP)
- 443 (HTTPS，如配置 SSL)
- 22 (SSH)

## 生产环境注意事项

1. **JWT_SECRET** 必须使用强随机字符串
2. **DATABASE_URL** 建议使用火山引擎 RDS PostgreSQL
3. 配置 HTTPS（Let's Encrypt / 阿里云证书）
4. 定期备份数据库
5. 监控磁盘空间（会议媒体文件可能增长）

## 回滚

```bash
docker compose down
git checkout <previous-commit>
docker compose up -d
```
