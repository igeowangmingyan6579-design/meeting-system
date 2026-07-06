import { Router, Consumer, Producer, Transport } from 'mediasoup';
import { Worker, RtpCapabilities } from 'mediasoup';

interface Room {
  router: Router;
  transports: Map<string, Transport>;
  producers: Map<string, Map<string, Producer>>; // userId -> kind -> producer
  consumers: Map<string, Map<string, Producer>>; // userId -> producerId -> consumer
}

export class MediaSoupManager {
  private worker: Worker | null = null;
  private rooms: Map<string, Room> = new Map();

  async createWorker(): Promise<Worker> {
    if (this.worker) return this.worker;

    const { fork } = await import('mediasoup');
    const mediaCodecs = [
      {
        kind: 'audio' as const,
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: 'video' as const,
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: { 'x-google-start-bitrate': 1000 },
      },
      {
        kind: 'video' as const,
        mimeType: 'video/H264',
        clockRate: 90000,
        parameters: {
          'packetization-mode': 1,
          'level-asymmetry-allowed': 1,
          'x-google-start-bitrate': 1000,
        },
      },
      {
        kind: 'video' as const,
        mimeType: 'video/AV1',
        clockRate: 90000,
      },
    ];

    this.worker = await fork({
      rtcMinPort: Number(process.env.MEDIASOUP_MIN_PORT) || 40000,
      rtcMaxPort: Number(process.env.MEDIASOUP_MAX_PORT) || 40100,
      logLevel: (process.env.MEDIASOUP_LOG_LEVEL || 'warn') as any,
      logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'] as any,
      mediaCodecs,
    });

    this.worker.on('died', () => {
      console.error('mediasoup worker died! Restarting...');
      this.worker = null;
      // 清理所有房间
      this.rooms.clear();
      throw new Error('mediasoup worker died');
    });

    console.log('mediasoup worker started');
    return this.worker;
  }

  async getOrCreateRoom(meetingId: string): Promise<Room> {
    if (this.rooms.has(meetingId)) {
      return this.rooms.get(meetingId)!;
    }

    const worker = await this.createWorker();
    const router = await worker.createRouter({ mediaRtpLimits: { maxBitrate: 3e6 } });

    const room: Room = {
      router,
      transports: new Map(),
      producers: new Map(),
      consumers: new Map(),
    };

    this.rooms.set(meetingId, room);
    console.log(`mediasoup room created: ${meetingId}`);
    return room;
  }

  async getRouterCapabilities(meetingId: string) {
    const room = await this.getOrCreateRoom(meetingId);
    return room.router.rtpCapabilities;
  }

  // 创建传输（生产者或消费者用）
  async createTransport(meetingId: string, userId: string, isProducer: boolean): Promise<{
    transportId: string;
    url: string;
    iceParameters: { password: string; ufrag: string };
    iceCandidates: Array<{ candidate: string; foundation: string; priority: number; protocol: string; type: string; tcpType?: string; port: number; ip?: string; relatedAddress?: string; relatedPort?: number }>;
    dtlsParameters: { fingerprints: Array<{ algorithm: string; value: string }>; direction?: string };
  }> {
    const room = await this.getOrCreateRoom(meetingId);

    // 如果已有transport，直接返回
    if (room.transports.has(userId)) {
      const transport = room.transports.get(userId)!;
      const iceCandidates = transport.iceCandidates;
      const dtlsParameters = transport.dtlsParameters;
      return {
        transportId: userId,
        url: process.env.APP_URL || 'http://localhost:3001',
        iceParameters: transport._iceParameters || { password: '', ufrag: '' },
        iceCandidates: iceCandidates || [],
        dtlsParameters,
      };
    }

    const transport = await room.router.createWebRtcTransport({
      listenIps: process.env.MEDIASOUP_LISTEN_IPS ? JSON.parse(process.env.MEDIASOUP_LISTEN_IPS) : [{ ip: '0.0.0.0', announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP }],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    });

    if (isProducer) {
      transport.on('dtlsstatechange', (dtlsState) => {
        if (dtlsState === 'closed') {
          transport.close();
          room.transports.delete(userId);
        }
      });
    }

    room.transports.set(userId, transport);

    // 获取 ICE 参数
    const iceParams = transport.iceParameters;
    const iceCandidates = transport.iceCandidates || [];
    const dtlsParams = transport.dtlsParameters;

    return {
      transportId: userId,
      url: process.env.APP_URL || 'http://localhost:3001',
      iceParameters: iceParams || { password: '', ufrag: '' },
      iceCandidates,
      dtlsParameters: dtlsParams,
    };
  }

  // 创建生产者
  async produce(
    meetingId: string,
    userId: string,
    transport: Transport,
    kind: 'audio' | 'video',
    rtpParameters: any,
    appData?: Record<string, any>
  ): Promise<Producer> {
    const room = await this.getOrCreateRoom(meetingId);

    const producer = await transport.produce({
      kind,
      rtpParameters,
      appData: { ...appData, userId },
    });

    if (!room.producers.has(userId)) {
      room.producers.set(userId, new Map());
    }
    room.producers.get(userId)!.set(kind, producer);

    producer.on('transportclose', () => {
      room.producers.get(userId)?.delete(kind);
    });

    // 通知其他用户有新生产者
    this.notifyNewProducer(meetingId, userId, producer);

    return producer;
  }

  // 创建消费者
  async consume(
    meetingId: string,
    userId: string,
    transport: Transport,
    producerId: string,
    rtpCapabilities: RtpCapabilities
  ): Promise<Consumer | null> {
    const room = await this.getOrCreateRoom(meetingId);

    // 检查路由器是否能解码
    if (!room.router.canConsume({ producerId, rtpCapabilities })) {
      return null;
    }

    // 找到生产者
    let producer: Producer | undefined;
    for (const [_uid, kinds] of room.producers) {
      for (const [_kind, p] of kinds) {
        if (p.id === producerId) {
          producer = p;
          break;
        }
      }
      if (producer) break;
    }

    if (!producer) return null;

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities,
      paused: false,
    });

    if (!room.consumers.has(userId)) {
      room.consumers.set(userId, new Map());
    }
    room.consumers.get(userId)!.set(producerId, consumer);

    consumer.on('transportclose', () => {
      room.consumers.get(userId)?.delete(producerId);
    });

    return consumer;
  }

  // 用户离开：清理所有资源
  async userLeave(meetingId: string, userId: string) {
    const room = await this.getOrCreateRoom(meetingId).catch(() => null);
    if (!room) return;

    // 关闭传输
    const transport = room.transports.get(userId);
    if (transport && !transport.closed) {
      transport.close();
    }
    room.transports.delete(userId);

    // 移除生产者
    room.producers.delete(userId);

    // 移除该用户的消费
    room.consumers.delete(userId);

    // 通知其他人
    this.notifyUserLeft(meetingId, userId);

    console.log(`user left room: ${meetingId} user: ${userId}`);
  }

  // 关闭整个房间
  async closeRoom(meetingId: string) {
    const room = this.rooms.get(meetingId);
    if (!room) return;

    // 关闭所有传输
    for (const [_userId, transport] of room.transports) {
      if (!transport.closed) transport.close();
    }
    room.transports.clear();

    // 关闭所有生产者
    for (const [_userId, kinds] of room.producers) {
      for (const [_kind, producer] of kinds) {
        if (!producer.closed) producer.close();
      }
    }
    room.producers.clear();

    // 关闭所有消费者
    for (const [_userId, prods] of room.consumers) {
      for (const [_pid, consumer] of prods) {
        if (!consumer.closed) consumer.close();
      }
    }
    room.consumers.clear();

    this.rooms.delete(meetingId);
    console.log(`room closed: ${meetingId}`);
  }

  // 获取房间内所有生产者信息（给新加入的用户）
  async getExistingProducers(meetingId: string) {
    const room = await this.getOrCreateRoom(meetingId);
    const result: Array<{ userId: string; kind: string; producerId: string }> = [];

    for (const [userId, kinds] of room.producers) {
      for (const [kind, producer] of kinds) {
        result.push({
          userId,
          kind,
          producerId: producer.id,
        });
      }
    }

    return result;
  }

  // 通知房间内其他用户有新生产者
  private async notifyNewProducer(meetingId: string, userId: string, producer: Producer) {
    // 通过 WebSocket 或 HTTP 长连接通知
    // 这里先存到 Redis，由 WebSocket handler 推送
    try {
      const { default: Redis } = await import('ioredis');
      const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      await redis.publish(`meeting:${meetingId}:events`, JSON.stringify({
        type: 'new-producer',
        userId,
        producerId: producer.id,
        kind: producer.kind,
      }));
      redis.quit();
    } catch (e) {
      console.warn('Failed to publish new-producer event:', e);
    }
  }

  // 通知用户离开
  private async notifyUserLeft(meetingId: string, userId: string) {
    try {
      const { default: Redis } = await import('ioredis');
      const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      await redis.publish(`meeting:${meetingId}:events`, JSON.stringify({
        type: 'user-left',
        userId,
      }));
      redis.quit();
    } catch (e) {
      console.warn('Failed to publish user-left event:', e);
    }
  }

  // 获取房间状态
  getRoomInfo(meetingId: string) {
    const room = this.rooms.get(meetingId);
    if (!room) return { producerCount: 0, consumerCount: 0 };

    let producerCount = 0;
    for (const [_uid, kinds] of room.producers) {
      producerCount += kinds.size;
    }

    let consumerCount = 0;
    for (const [_uid, prods] of room.consumers) {
      consumerCount += prods.size;
    }

    return { producerCount, consumerCount };
  }

  // 清理空闲房间（超过5分钟无人使用）
  cleanupIdleRooms() {
    const now = Date.now();
    for (const [meetingId, room] of this.rooms) {
      if (room.producers.size === 0 && room.transports.size === 0) {
        // 简单判断：如果没有活跃用户，标记可清理
        // 实际应该有时间戳，这里简化处理
      }
    }
  }
}

// 单例
export const mediaSoupManager = new MediaSoupManager();
