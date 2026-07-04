import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { verifyToken, JwtPayload } from '../utils/jwt.js';
import { generateShortLink, generateMeetingId } from '../utils/helpers.js';

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

// 创建会议室
router.post('/create', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as JwtPayload;
    const { title } = req.body;

    // 生成唯一短链
    let link = generateShortLink();
    let exists = await prisma.meeting.findUnique({ where: { link } });
    while (exists) {
      link = generateShortLink();
      exists = await prisma.meeting.findUnique({ where: { link } });
    }

    const meeting = await prisma.meeting.create({
      data: {
        hostId: user.userId,
        link,
        title: title || '',
        startedAt: new Date(),
      },
    });

    res.status(201).json({
      message: '会议室创建成功',
      meeting: {
        id: meeting.id,
        link: `${process.env.APP_URL || 'http://localhost:3000'}/join/${meeting.link}`,
        shortLink: meeting.link,
        title: meeting.title,
        createdAt: meeting.createdAt,
      },
    });
  } catch (err: any) {
    console.error('创建会议室错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取会议详情
router.get('/:link', async (req: Request, res: Response) => {
  try {
    const { link } = req.params;

    const meeting = await prisma.meeting.findUnique({
      where: { link },
      include: {
        host: { select: { id: true, email: true } },
        participants: { select: { id: true, name: true, joinedAt: true } },
      },
    });

    if (!meeting) {
      return res.status(404).json({ error: '会议不存在' });
    }

    if (meeting.isEnded) {
      return res.status(410).json({ error: '该会议已结束，链接已失效' });
    }

    res.json({ meeting });
  } catch (err: any) {
    console.error('获取会议详情错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 加入会议（参会者，无需登录）
router.post('/:link/join', async (req: Request, res: Response) => {
  try {
    const { link } = req.params;
    const { name } = req.body;

    if (!name || name.trim().length < 1) {
      return res.status(400).json({ error: '请输入姓名' });
    }

    const meeting = await prisma.meeting.findUnique({
      where: { link },
    });

    if (!meeting) {
      return res.status(404).json({ error: '会议不存在' });
    }

    if (meeting.isEnded) {
      return res.status(410).json({ error: '该会议已结束，链接已失效' });
    }

    // 检查是否已在会
    const existing = await prisma.participant.findFirst({
      where: {
        meetingId: meeting.id,
        name: name.trim(),
      },
    });

    if (existing) {
      return res.status(409).json({ error: '该姓名已在此会议中' });
    }

    const participant = await prisma.participant.create({
      data: {
        meetingId: meeting.id,
        name: name.trim(),
      },
    });

    // 如果还没开始，标记开始
    if (!meeting.startedAt) {
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: { startedAt: new Date() },
      });
    }

    res.json({
      message: '加入成功',
      participant: {
        id: participant.id,
        name: participant.name,
        joinedAt: participant.joinedAt,
      },
      meeting: {
        id: meeting.id,
        link: meeting.link,
        title: meeting.title,
        startedAt: meeting.startedAt,
      },
    });
  } catch (err: any) {
    console.error('加入会议错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 结束会议（仅主持人）
router.post('/:link/end', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as JwtPayload;
    const { link } = req.params;

    const meeting = await prisma.meeting.findUnique({
      where: { link },
    });

    if (!meeting) {
      return res.status(404).json({ error: '会议不存在' });
    }

    if (meeting.hostId !== user.userId) {
      return res.status(403).json({ error: '只有主持人可以结束会议' });
    }

    if (meeting.isEnded) {
      return res.status(409).json({ error: '会议已结束' });
    }

    const endedMeeting = await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        isEnded: true,
        endedAt: new Date(),
      },
    });

    res.json({
      message: '会议已结束，链接已失效',
      meeting: {
        id: endedMeeting.id,
        endedAt: endedMeeting.endedAt,
      },
    });
  } catch (err: any) {
    console.error('结束会议错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取主持人会议列表
router.get('/host/meetings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as JwtPayload;

    const meetings = await prisma.meeting.findMany({
      where: { hostId: user.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        link: true,
        title: true,
        createdAt: true,
        startedAt: true,
        endedAt: true,
        isEnded: true,
        participants: { select: { id: true, name: true } },
      },
    });

    res.json({ meetings });
  } catch (err: any) {
    console.error('获取会议列表错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

export default router;
