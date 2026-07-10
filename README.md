# 极简会议系统 — VPS 部署手册

给你一个**长久稳定、网页+手机都能用、会议链接不会说打不开就打不开**的公网链接。

## 一、这套部署解决了什么

原版 `dist/index.html` 用的是免费的 **PeerJS 公共云信令 `0.peerjs.com`**——偶发宕机、限流，不符合"长久稳定"。
本部署包把它换成 **你自己的 VPS 上自托管的信令 + TURN 穿透**：

```
浏览器(网页/手机) ──HTTPS──> nginx ──静态前端 + 反代 /peerjs──> peerjs-server(自托管信令)
浏览器(手机)      ──TURN───> coturn:3478 (NAT 穿透，移动端连得上)
```

- ✅ 信令在你自己服务器上，稳定可控，不依赖第三方
- ✅ HTTPS + TURN，手机（iOS/Android）在 4G/5G 下也能连
- ✅ 会议链接是 `https://你的域名/#/join/xxxx`，可分享、长期不变
- ✅ 纯 P2P WebRTC，零月度费用（只付 VPS）。内部成员可注册登录（轻量本地账号），外部访客凭链接输名字即进，无需注册

## 二、准备清单

| 项目 | 说明 |
|---|---|
| VPS | 任意 Linux（Ubuntu 22.04 推荐），有公网 IP。轻量应用服务器 ¥60–100/年即可 |
| 域名 | 一个域名，A 记录指向 VPS IP（没有域名也能先用 IP 测试，但 WebRTC 在手机上强制要求 HTTPS，自签证书手机会报警） |
| 开放端口 | `22`(SSH) `80` `443` `3478/udp` `3478/tcp` `5349/tcp` `49000-49500/udp` |
| 软件 | VPS 上装好 Docker + Docker Compose |

## 二·五、TURN 凭证（部署前必读，千万别用示例值）

TURN 是移动端 / 严格 NAT 穿透的关键，靠 **账号 + 密码（secret）** 做鉴权。本仓库的 `coturn/turnserver.conf`、`.env.example`、前端 `dist/index.html` / `public/index.html` 里都自带了一串**示例 secret**（`c16c5270…`），**仅用于本地测试**。一旦部署到公网，必须换成**你自己生成的 secret**——否则等于把你的 TURN 中继敞开给他人白嫖，还可能被用来中转恶意流量。

### 1）生成你自己的 secret
```bash
# 任选其一，生成 48 位十六进制随机串
openssl rand -hex 24
# 或
head -c 32 /dev/urandom | xxd -p -c 32
```

### 2）同步改这 4 个地方（必须完全一致）
| 文件 | 改什么 |
|---|---|
| `.turn_secret` | 整文件替换为你的新 secret（此文件**不要提交公开仓库、不要随公开备份分享**） |
| `coturn/turnserver.conf` | 把 `user=meeting:示例值` 里的示例值换成你的新 secret |
| `.env.example` | 把 `TURN_SECRET=示例值` 换成你的新 secret（实际部署用 `.env`） |
| 前端 `dist/index.html` / `public/index.html` | 不用手改——运行 `python patch_dist.py`（或 `patch_dist_mesh.py`）会**自动读取 `.turn_secret` 重新注入** iceServers |

> 改完 `.turn_secret` 后重跑 patch 脚本，前端即带上正确凭证；再 `docker compose restart nginx`（VPS 版）或重启本地服务即可生效。

### 3）公开分享时
本仓库的「公开版备份」已**剔除 `.turn_secret`**。若你自己另出一份并对外分享，记得先删掉 `.turn_secret`，且 `coturn/turnserver.conf` 与 `.env.example` 里的 secret 也应先清成占位（如 `TURN_SECRET_HERE`）再打包，避免凭据泄露。

## 三、部署步骤

### 1. 把部署目录弄到 VPS 上
```bash
# 方式A：直接 scp 本机 deploy 目录
scp -r deploy/ root@你的VPS_IP:/opt/meeting/

# 方式B：git（如果你把项目推到了 GitHub）
git clone <你的仓库> && cd <仓库>/deploy
```

### 2. 填公网 IP（唯一一处必改）
编辑 `coturn/turnserver.conf`，把两处 `EXTERNAL_IP_HERE` 改成你的 VPS 公网 IP：
```bash
sed -i 's/EXTERNAL_IP_HERE/你的公网IP/g' coturn/turnserver.conf
```

### 3. 启动服务
```bash
cd /opt/meeting
docker compose up -d
```
此时 `http://你的IP` 应能打开首页（证书还没申请，先走 HTTP 验证前端）。

### 4. 申请 HTTPS 证书（Let's Encrypt，免费）
```bash
# 临时停掉 nginx 容器，用 certbot standalone 占用 80 端口
docker compose stop nginx
docker run --rm -p 80:80 -v $PWD/certs:/etc/letsencrypt \
  certbot/certbot certonly --standalone \
  -d 你的域名 --email 你的邮箱 --agree-tos --non-interactive

# 把证书软链成 nginx 要的文件名
mkdir -p certs
ln -sf /etc/letsencrypt/live/你的域名/fullchain.pem certs/fullchain.pem
ln -sf /etc/letsencrypt/live/你的域名/privkey.pem   certs/privkey.pem

# 重启 nginx
docker compose start nginx
```
> 证书 90 天有效，到期用 `certbot renew` 续期后 `docker compose restart nginx`。

### 5. 验证
```bash
# 信令健康检查
curl -k https://你的域名/peerjs/health
# 应返回 ok / 200

# TURN 自检（可选，需本机装 coturn 的 turnutils_uclient 或用在线 TURN 检测）
```
浏览器打开 `https://你的域名` → 输入名字 → 创建会议 → 复制链接 → **用手机浏览器打开同一链接** → 两边应互相看到画面。

## 四、日常维护

- **改前端（比如重新生成 dist）**：把新 `dist/index.html` 覆盖到 `deploy/dist/`，然后
  ```bash
  docker compose restart nginx
  ```
- **改主题/信令**：运行 `python patch_dist.py` 重新生成（会自动读取 `.turn_secret`）。
- **备份**：`deploy/` 整个目录 + 证书目录 `/etc/letsencrypt` 定期备份即可。
- **看日志**：`docker compose logs -f peerjs` / `docker compose logs -f coturn`。

## 五、常见问题

| 现象 | 原因 / 解决 |
|---|---|
| 手机打不开或连不上 | 没开 `3478/udp` 等 TURN 端口；或 `turnserver.conf` 的 `external-ip` 没填对 |
| 电脑能连、手机不行 | TURN 没通（严格 NAT 必须 TURN 中继），检查 coturn 日志 |
| 提示"连接信令中"一直转 | PeerJS 服务挂了，看 `docker compose logs peerjs` |
| 证书过期手机报警 | `certbot renew` 后 `docker compose restart nginx` |
| 想换域名 | 重新申请证书 + 改 nginx `server_name`（当前用 `_` 通配，其实不用改） |
| 想彻底去掉外部依赖 | 前端 `dist/index.html` 第 105 行从 `unpkg.com/peerjs...` 加载 PeerJS 库（CDN）。要完全自托管：把 `peerjs.min.js` 下载到 `dist/` 并把该行改成 `<script src="/peerjs.min.js"></script>` 即可 |

## 六、文件结构

```
deploy/
├── docker-compose.yml      # 三个服务：nginx / peerjs / coturn
├── nginx/meeting.conf      # HTTPS + 静态 + /peerjs 反代
├── coturn/turnserver.conf  # TURN 中继（改 EXTERNAL_IP 即可）
├── dist/index.html         # 已改造：雾蓝主题 + 自托管 PeerJS + TURN 凭证
├── patch_dist.py           # 重新生成 dist 的脚本
├── .turn_secret            # TURN 凭证（与 coturn 配置一致）
├── .env.example            # 环境变量示例
└── README.md               # 本文件

## 七、成员登录系统（内部可控 + 外部开放）

场景：内部成员（团队）注册账号、登录后创建会议、复制链接；外部人员点链接只输名字即可进会，**无需注册**。

### 1）接口
```
POST /api/register   {username, password}  → {ok, token, username}   用户名2-20位，密码≥4位（可纯数字）
POST /api/login      {username, password}  → {ok, token, username}
GET  /api/me         Authorization: Bearer <token> → {ok, username}   （无/错 token 返回 401）
POST /api/logout     Authorization: Bearer <token> → {ok}
```
前端把 token 存浏览器 localStorage（key `auth_token`），未登录访问「创建会议」会跳转到登录页。

### 2）容量
单场会议上限 **100 人**（`public/index.html` 中 `MAX_PEERS = 100`）。满员后新加入者收到「会议人数已满」提示并自动退出，不挤爆。

### 3）用户数据存储
- 文件：`users.json`，每条记录含 `username`、scrypt 随机 salt、密码哈希、登录 token（**绝不存明文密码**）。
- 路径：默认 `deploy/data/users.json`（docker 容器内可写）；可通过环境变量覆盖：
  ```bash
  MEETING_DATA_DIR=/path/to/writable/dir node server.js
  ```
  > 本地 Windows 沙箱环境下 `deploy/` 目录运行时被禁止写入，需把 `MEETING_DATA_DIR` 指到一个可写目录（如工作区目录）再启动，否则注册会报 `EPERM`。
- 重启服务后用户数据仍在（持久化）。

### 4）安全说明
- 密码用 Node 内置 `crypto.scrypt` 加盐哈希，登录校验用 `timingSafeEqual` 防时序攻击。
- token 为 24 字节随机串，登录/登出会刷新/作废，无第三方依赖、零额外费用。
- 这是轻量方案，**无密码找回、无邮箱验证**；若需更强账号体系（找回密码、角色权限），再按需扩展后端。
```
