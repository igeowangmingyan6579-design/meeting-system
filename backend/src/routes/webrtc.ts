import { Router, Request, Response } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt.js';
import { mediaSoupManager } from '../lib/mediasoup.js';

const router = Router();

// 获取认证用户中间件
function authMiddleware(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: '令牌无效或已过期' });
  }
  (req as any).user = payload;
  next();
}

// 创建/获取房间传输（主持人）
router.post('/room/host', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as JwtPayload;
    const { meetingId } = req.body;

    if (!meetingId) {
      return res.status(400).json({ error: '缺少会议ID' });
    }

    // 获取 router 能力
    const routerCapabilities = await mediaSoupManager.getRouterCapabilities(meetingId);

    // 创建生产者传输
    const transportInfo = await mediaSoupManager.createTransport(meetingId, `host-${user.userId}`, true);

    res.json({
      meetingId,
      userId: user.userId,
      routerCapabilities,
      transport: transportInfo,
    });
  } catch (err: any) {
    console.error('创建主机传输错误:', err);
    res.status(500).json({ error: '服务器错误', detail: err.message });
  }
});

// 加入房间传输（参会者）
router.post('/room/join', async (req: Request, res: Response) => {
  try {
    const { meetingId, participantId, userId } = req.body;

    if (!meetingId || !participantId) {
      return res.status(400).json({ error: '缺少会议ID或参会者ID' });
    }

    // 获取 router 能力
    const routerCapabilities = await mediaSoupManager.getRouterCapabilities(meetingId);

    // 创建消费者传输
    const transportId = userId || `participant-${participantId}`;
    const transportInfo = await mediaSoupManager.createTransport(meetingId, transportId, false);

    // 获取现有生产者列表
    const existingProducers = await mediaSoupManager.getExistingProducers(meetingId);

    res.json({
      meetingId,
      participantId,
      userId: transportId,
      routerCapabilities,
      transport: transportInfo,
      existingProducers,
    });
  } catch (err: any) {
    console.error('加入房间错误:', err);
    res.status(500).json({ error: '服务器错误', detail: err.message });
  }
});

// 创建新的传输（用于 renegotiation 或多路复用）
router.post('/transport/create', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as JwtPayload;
    const { meetingId, kind } = req.body;

    if (!meetingId) {
      return res.status(400).json({ error: '缺少会议ID' });
    }

    const isProducer = kind === 'send' || !kind;
    const transportInfo = await mediaSoupManager.createTransport(
      meetingId,
      `${kind || 'send'}-${user.userId}`,
      isProducer
    );

    res.json({ transport: transportInfo });
  } catch (err: any) {
    console.error('创建传输错误:', err);
    res.status(500).json({ error: '服务器错误', detail: err.message });
  }
});

// 获取房间状态
router.get('/room/status/:meetingId', async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;
    const info = mediaSoupManager.getRoomInfo(meetingId);
    res.json({ meetingId, ...info });
  } catch (err: any) {
    console.error('获取房间状态错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 用户离开（清理资源）
router.post('/room/leave', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as JwtPayload;
    const { meetingId } = req.body;

    if (!meetingId) {
      return res.status(400).json({ error: '缺少会议ID' });
    }

    await mediaSoupManager.userLeave(meetingId, user.userId);
    res.json({ message: '已离开房间' });
  } catch (err: any) {
    console.error('离开房间错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

export default router;
