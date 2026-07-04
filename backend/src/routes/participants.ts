import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { verifyToken, JwtPayload } from '../utils/jwt.js';
import nodeCron from 'node-cron';

const router = Router();

// 定时清理任务：每天凌晨3点执行
nodeCron.schedule('0 3 * * *', async () => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 3);

    // 清理已结束的会议数据
    const deletedMeetings = await prisma.meeting.deleteMany({
      where: {
        isEnded: true,
        endedAt: { lt: cutoffDate },
      },
    });

    // 清理过期的参与者
    await prisma.participant.deleteMany({
      where: {
        meeting: {
          isEnded: true,
          endedAt: { lt: cutoffDate },
        },
      },
    });

    console.log(`[Cleanup] Deleted ${deletedMeetings.count} expired meetings`);
  } catch (err) {
    console.error('[Cleanup] Error:', err);
  }
});

// 主持人踢人
router.post('/:link/kick/:participantId', async (req: Request, res: Response) => {
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

    const { link, participantId } = req.params;

    const meeting = await prisma.meeting.findUnique({
      where: { link },
    });

    if (!meeting || meeting.hostId !== payload.userId) {
      return res.status(403).json({ error: '无权操作' });
    }

    await prisma.participant.deleteMany({
      where: {
        id: participantId,
        meetingId: meeting.id,
      },
    });

    res.json({ message: '已移除参会者' });
  } catch (err: any) {
    console.error('踢人错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 清理接口：删除录制文件
router.post('/:link/cleanup', async (req: Request, res: Response) => {
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

    const { link } = req.params;

    const meeting = await prisma.meeting.findUnique({
      where: { link },
    });

    if (!meeting || meeting.hostId !== payload.userId) {
      return res.status(403).json({ error: '无权操作' });
    }

    // 标记清理（实际文件删除由定时任务处理）
    await prisma.meeting.update({
      where: { id: meeting.id },
      data: { recordingUrl: null },
    });

    res.json({ message: '清理请求已提交' });
  } catch (err: any) {
    console.error('清理错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

export default router;
