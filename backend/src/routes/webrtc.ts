import { Router, Request, Response } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt.js';

const router = Router();

// 获取 WebRTC 房间参数（主持人）
router.post('/room/host', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未登录' });
    }

    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: '令牌无效' });
    }

    const { meetingId } = req.body;
    if (!meetingId) {
      return res.status(400).json({ error: '缺少会议ID' });
    }

    // TODO: 集成 mediasoup
    // 这里返回 RTP/RTCP 参数供前端 WebRTC 连接
    res.json({
      meetingId,
      // 占位：实际由 mediasoup 生成
      rtpCapabilities: {},
      dtlsParameters: {},
      iceParameters: {},
      iceCandidates: [],
    });
  } catch (err: any) {
    console.error('获取房间参数错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取 WebRTC 房间参数（参会者）
router.post('/room/join', async (req: Request, res: Response) => {
  try {
    const { meetingId, participantId } = req.body;
    if (!meetingId || !participantId) {
      return res.status(400).json({ error: '缺少会议ID或参会者ID' });
    }

    // TODO: 集成 mediasoup
    res.json({
      meetingId,
      participantId,
      rtpCapabilities: {},
      dtlsParameters: {},
      iceParameters: {},
      iceCandidates: [],
    });
  } catch (err: any) {
    console.error('加入房间错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

export default router;
