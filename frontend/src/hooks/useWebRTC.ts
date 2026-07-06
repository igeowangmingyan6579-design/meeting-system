import { useRef, useEffect, useState, useCallback } from 'react';

interface ProducerInfo {
  userId: string;
  kind: string;
  producerId: string;
}

interface RoomState {
  routerCapabilities: any;
  transport: any;
  existingProducers: ProducerInfo[];
}

export function useWebRTC(meetingId: string, userId: string, userName?: string) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, Map<string, MediaStream>>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const transportRef = useRef<any>(null);
  const producerRef = useRef<any>(null);
  const consumerMapRef = useRef<Map<string, any>>(new Map());
  const deviceRef = useRef<any>(null);

  // 获取本地媒体
  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      return stream;
    } catch (e: any) {
      setError(`无法获取摄像头/麦克风: ${e.message}`);
      return null;
    }
  }, []);

  // 连接 WebSocket 信令服务器
  const connectSignaling = useCallback(async (roomState: RoomState) => {
    const wsUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace('http', 'ws');
    const ws = new WebSocket(`${wsUrl}/ws`);
    wsRef.current = ws;

    return new Promise<void>((resolve, reject) => {
      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'join-meeting',
          meetingId,
          userId,
        }));
        resolve();
      };
      ws.onerror = (e) => reject(e);
      ws.onclose = () => {
        console.warn('WebSocket disconnected');
        setIsConnected(false);
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          await handleSignalingMessage(msg, roomState);
        } catch (e) {
          console.error('WS message parse error:', e);
        }
      };
    });
  }, [meetingId, userId]);

  // 处理信令消息
  const handleSignalingMessage = async (msg: any, roomState: RoomState) => {
    switch (msg.type) {
      case 'room-state': {
        // 收到房间状态，初始化 mediasoup Device 和传输
        const { producers, routerCapabilities: routerRtpCapabilities } = msg;

        // 初始化 Device
        const { Device } = await import('mediasoup-client');
        const device = new Device();
        await device.load({ routerRtpCapabilities });
        deviceRef.current = device;

        transportRef.current = roomState.transport;

        // 创建生产者传输
        const sendTransport = device.createSendTransport(roomState.transport);
        
        sendTransport.on('connect', async ({ dtlsParameters }, callback) => {
          try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/webrtc/transport/connect`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                transportId: roomState.transport.transportId,
                dtlsParameters,
              }),
            });
            callback();
          } catch (e: any) {
            sendTransport.close();
            setError(`连接传输失败: ${e.message}`);
          }
        });

        sendTransport.on('produce', async ({ kind, rtpParameters }, callback) => {
          try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/webrtc/produce`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                meetingId,
                userId,
                transportId: roomState.transport.transportId,
                kind,
                rtpParameters,
              }),
            });
            const data = await response.json();
            callback({ id: data.producerId });
          } catch (e: any) {
            setError(`创建生产者失败: ${e.message}`);
          }
        });

        sendTransport.on('producedata', async () => {
          // 数据通道生产
        });

        // 如果有本地流，创建生产者
        if (localStream) {
          for (const track of localStream.getTracks()) {
            try {
              const producer = await sendTransport.produce({ track });
              producerRef.current = producer;

              producer.on('transportclose', () => producerRef.current = null);
              producer.on('@pause', () => {});
              producer.on('@resume', () => {});
            } catch (e: any) {
              console.error('Producer error:', e);
            }
          }
        }

        // 消费已有的生产者
        for (const producer of producers || []) {
          await createConsumer(device, producer);
        }

        setIsConnected(true);
        break;
      }

      case 'new-producer': {
        // 新用户加入，创建消费
        if (deviceRef.current && transportRef.current) {
          const sendTransport = deviceRef.current.createSendTransport(transportRef.current);
          const consumer = await deviceRef.current.createConsumer({
            producerId: msg.producerId,
            rtpCapabilities: deviceRef.current.rtpCapabilities,
            kind: msg.kind as any,
          });
          
          if (consumer) {
            consumer.on('stream', (stream: MediaStream) => {
              addRemoteStream(msg.userId, msg.kind, stream);
            });
            consumerMapRef.current.set(msg.producerId, consumer);
          }
        }
        break;
      }

      case 'user-left': {
        // 用户离开，移除流
        removeRemoteStreams(msg.userId);
        break;
      }
    }
  };

  // 创建消费者
  const createConsumer = async (device: any, producer: ProducerInfo) => {
    try {
      const consumer = await device.createConsumer({
        producerId: producer.producerId,
        rtpCapabilities: device.rtpCapabilities,
        kind: producer.kind as any,
      });

      if (consumer) {
        consumer.on('stream', (stream: MediaStream) => {
          addRemoteStream(producer.userId, producer.kind, stream);
        });
        consumerMapRef.current.set(producer.producerId, consumer);
      }
    } catch (e: any) {
      console.error('Consumer error:', e);
    }
  };

  // 添加远端流
  const addRemoteStream = (userId: string, kind: string, stream: MediaStream) => {
    setRemoteStreams(prev => {
      const next = new Map(prev);
      if (!next.has(userId)) {
        next.set(userId, new Map());
      }
      const userStreams = next.get(userId)!;
      userStreams.set(kind, stream);
      return next;
    });
  };

  // 移除远端流
  const removeRemoteStreams = (userId: string) => {
    setRemoteStreams(prev => {
      const next = new Map(prev);
      next.delete(userId);
      return next;
    });
  };

  // 切换麦克风
  const toggleMic = useCallback(() => {
    if (!localStream) return;
    const newState = !isMicOn;
    localStream.getAudioTracks().forEach(t => t.enabled = newState);
    setIsMicOn(newState);
    
    // 通知生产者暂停/恢复
    if (producerRef.current) {
      newState ? producerRef.current.resume() : producerRef.current.pause();
    }
  }, [localStream, isMicOn]);

  // 切换摄像头
  const toggleCamera = useCallback(() => {
    if (!localStream) return;
    const newState = !isCameraOn;
    localStream.getVideoTracks().forEach(t => t.enabled = newState);
    setIsCameraOn(newState);
    
    if (producerRef.current) {
      newState ? producerRef.current.resume() : producerRef.current.pause();
    }
  }, [localStream, isCameraOn]);

  // 断开连接
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'leave-meeting', meetingId, userId }));
      wsRef.current.close();
      wsRef.current = null;
    }
    if (transportRef.current) {
      transportRef.current.close();
      transportRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
    }
    setIsConnected(false);
    setLocalStream(null);
    setRemoteStreams(new Map());
    consumerMapRef.current.clear();
    producerRef.current = null;
  }, [meetingId, userId, localStream]);

  // 初始化
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const stream = await getLocalStream();
      if (cancelled || !stream) return;

      // 获取房间配置
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const isHost = userId.startsWith('host-');
      
      let response;
      if (isHost) {
        response = await fetch(`${apiUrl}/api/webrtc/room/host`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
          body: JSON.stringify({ meetingId }),
        });
      } else {
        response = await fetch(`${apiUrl}/api/webrtc/room/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meetingId, participantId: userId }),
        });
      }

      if (response.ok) {
        const data = await response.json();
        await connectSignaling(data);
      } else {
        setError('获取房间配置失败');
      }
    };

    init();

    return () => {
      cancelled = true;
      disconnect();
    };
  }, []);

  return {
    localStream,
    remoteStreams,
    isConnected,
    isMicOn,
    isCameraOn,
    toggleMic,
    toggleCamera,
    error,
    disconnect,
  };
}
