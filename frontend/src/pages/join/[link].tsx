'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Join() {
  const router = useRouter();
  const params = useParams();
  const link = params?.link as string;

  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [meetingInfo, setMeetingInfo] = useState<any>(null);

  useEffect(() => {
    if (!link) {
      setError('无效的会议链接');
      return;
    }

    // 先检查会议是否存在
    fetchMeetingInfo();
  }, [link]);

  const fetchMeetingInfo = async () => {
    try {
      const res = await fetch(`${API}/api/meetings/${link}`);
      if (res.ok) {
        const data = await res.json();
        setMeetingInfo(data.meeting);
      } else {
        const data = await res.json();
        setError(data.error || '会议不存在或已结束');
      }
    } catch (err: any) {
      setError('网络错误，请重试');
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setJoining(true);

    try {
      const res = await fetch(`${API}/api/meetings/${link}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        const data = await res.json();
        // 加入成功，跳转到会议室页面
        // TODO: 实际项目中这里会跳转到视频会议室
        alert(`欢迎 ${name}！\n会议ID: ${data.meeting.id}\n\n（实际项目中此处会进入视频会议室）`);
      } else {
        const data = await res.json();
        setError(data.error || '加入失败');
      }
    } catch (err: any) {
      setError('网络错误，请重试');
    } finally {
      setJoining(false);
    }
  };

  if (error) {
    return (
      <div style={{ maxWidth: 400, margin: '100px auto', padding: 20, textAlign: 'center' }}>
        <h1 style={{ color: 'red' }}>⚠️ {error}</h1>
        <p style={{ color: '#666' }}>该会议链接已失效或不存在</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 20, textAlign: 'center' }}>
      <h1>加入会议</h1>
      {meetingInfo && (
        <p style={{ color: '#666', marginBottom: 20 }}>
          {meetingInfo.title || '未命名会议'}
        </p>
      )}
      <form onSubmit={handleJoin}>
        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="请输入您的姓名"
            style={{
              width: '100%',
              padding: 14,
              fontSize: 16,
              border: '1px solid #ddd',
              borderRadius: 4,
              boxSizing: 'border-box'
            }}
          />
        </div>
        {error && <p style={{ color: 'red', marginBottom: 12 }}>{error}</p>}
        <button
          type="submit"
          disabled={joining || !name.trim()}
          style={{
            width: '100%',
            padding: 14,
            fontSize: 18,
            background: joining ? '#999' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: joining || !name.trim() ? 'not-allowed' : 'pointer'
          }}
        >
          {joining ? '加入中...' : '加入会议'}
        </button>
      </form>
      <p style={{ color: '#999', fontSize: 13, marginTop: 20 }}>
        无需注册，输入姓名即可加入
      </p>
    </div>
  );
}
