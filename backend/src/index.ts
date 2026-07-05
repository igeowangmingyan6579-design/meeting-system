#!/usr/bin/env node
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'ws';
import authRoutes from './routes/auth.js';
import meetingRoutes from './routes/meetings.js';
import participantRoutes from './routes/participants.js';
import webrtcRoutes from './routes/webrtc.js';
import { mediaSoupManager } from './lib/mediasoup.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// WebSocket server for real-time signaling
const wss = new Server({ server: httpServer, path: '/ws' });

// Store connected clients: meetingId -> Set<WebSocket>
const meetingClients = new Map<string, Set<WebSocket>>();

wss.on('connection', (ws, req) => {
  let meetingId: string | null = null;
  let userId: string | null = null;

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      switch (msg.type) {
        case 'join-meeting':
          meetingId = msg.meetingId;
          userId = msg.userId;
          if (!meetingClients.has(meetingId)) {
            meetingClients.set(meetingId, new Set());
          }
          meetingClients.get(meetingId)!.add(ws);

          // 发送当前房间状态
          const existing = await mediaSoupManager.getExistingProducers(meetingId);
          ws.send(JSON.stringify({
            type: 'room-state',
            producers: existing,
            routerCapabilities: await mediaSoupManager.getRouterCapabilities(meetingId),
          }));
          break;

        case 'leave-meeting':
          meetingId = msg.meetingId;
          userId = msg.userId;
          if (meetingId) {
            await mediaSoupManager.userLeave(meetingId, userId!);
            const clients = meetingClients.get(meetingId);
            if (clients) {
              clients.delete(ws);
              if (clients.size === 0) {
                meetingClients.delete(meetingId);
                // 延迟清理房间
                setTimeout(() => mediaSoupManager.closeRoom(meetingId!), 300000);
              } else {
                // 通知其他人
                broadcastToMeeting(meetingId, {
                  type: 'user-left',
                  userId,
                }, ws);
              }
            }
          }
          break;

        case 'offer':
        case 'answer':
        case 'ice-candidate':
          // 转发信令消息给房间内其他人
          if (meetingId) {
            broadcastToMeeting(meetingId, msg, ws);
          }
          break;

        case 'chat-message':
          if (meetingId) {
            broadcastToMeeting(meetingId, {
              type: 'chat-message',
              userId,
              userName: msg.userName,
              text: msg.text,
              timestamp: Date.now(),
            }, ws);
          }
          break;

        case 'screen-share-toggle':
          if (meetingId) {
            broadcastToMeeting(meetingId, {
              type: 'screen-share',
              userId,
              active: msg.active,
            }, ws);
          }
          break;
      }
    } catch (e) {
      console.error('WS message error:', e);
    }
  });

  ws.on('close', () => {
    if (meetingId && userId) {
      mediaSoupManager.userLeave(meetingId, userId).catch(() => {});
      const clients = meetingClients.get(meetingId);
      if (clients) {
        clients.delete(ws);
        if (clients.size === 0) {
          meetingClients.delete(meetingId);
          setTimeout(() => mediaSoupManager.closeRoom(meetingId), 300000);
        } else {
          broadcastToMeeting(meetingId, {
            type: 'user-left',
            userId,
          });
        }
      }
    }
  });

  ws.on('error', (err) => {
    console.error('WS error:', err.message);
  });
});

function broadcastToMeeting(meetingId: string, message: any, exclude?: WebSocket) {
  const clients = meetingClients.get(meetingId);
  if (!clients) return;

  const data = JSON.stringify(message);
  for (const client of clients) {
    if (client !== exclude && client.readyState === 1) {
      client.send(data);
    }
  }
}

// Redis subscriber for cross-process signaling
async function startRedisSubscriber() {
  try {
    const { default: Redis } = await import('ioredis');
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

    redis.subscribe('meeting:*:events', (err, count) => {
      if (err) {
        console.error('Redis subscribe error:', err);
      } else {
        console.log(`Redis subscribed. Total subscriptions: ${count}`);
      }
    });

    redis.on('message', (channel, message) => {
      try {
        const [, meetingId, _] = channel.split(':');
        const event = JSON.parse(message);

        // Forward to WebSocket clients
        const clients = meetingClients.get(meetingId);
        if (clients) {
          for (const client of clients) {
            if (client.readyState === 1) {
              client.send(JSON.stringify(event));
            }
          }
        }
      } catch (e) {
        console.error('Redis message error:', e);
      }
    });
  } catch (e) {
    console.warn('Redis subscriber not available:', e);
  }
}

// App middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',').filter(Boolean) || ['http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());

// API 限流保护
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 默认1分钟
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'), // 默认100次/分钟
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求过于频繁，请稍后再试' },
});
app.use('/api/', apiLimiter);

// 认证端点更严格的限流
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 20, // 20次/15分钟
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '登录尝试次数过多，请稍后再试' },
});
app.use('/api/auth/', authLimiter);

// Health check
app.get('/health', (_req: any, res: any) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), ws: 'connected' });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/webrtc', webrtcRoutes);

// 404
app.use((req: any, res: any) => {
  res.status(404).json({ error: '接口不存在' });
});

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

httpServer.listen(PORT, '0.0.0.0', async () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`WebSocket signaling on ws://localhost:${PORT}/ws`);
  console.log(`Health: http://localhost:${PORT}/health`);

  // Start Redis subscriber for cross-process signaling
  startRedisSubscriber();
});

export { wss, meetingClients };
