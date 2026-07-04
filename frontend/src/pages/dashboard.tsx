'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Dashboard() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [title, setTitle] = useState('');
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) {
      router.push('/login');
      return;
    }
    setToken(t);
    fetchMeetings(t);
  }, []);

  const fetchMeetings = async (tok: string) => {
    try {
      const res = await fetch(`${API}/api/meetings/host/meetings`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMeetings(data.meetings || []);
      }
    } catch (err) {
      console.error('获取会议列表失败', err);
    } finally {
      setLoading(false);
    }
  };

  const createMeeting = async () => {
    setCreating(true);
    try {
      const res = await fetch(`${API}/api/meetings/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: title || '' }),
      });

      if (res.ok) {
        const data = await res.json();
        setMeetingLink(data.meeting.link);
        fetchMeetings(token);
        setTitle('');
      }
    } catch (err) {
      console.error('创建会议失败', err);
    } finally {
      setCreating(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(meetingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const logout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>加载中...</div>;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <h1>极简会议</h1>
        <button onClick={logout} style={{ padding: '8px 16px', background: '#666', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          退出登录
        </button>
      </div>

      {/* Create Meeting */}
      <div style={{ background: '#f8f9fa', padding: 20, borderRadius: 8, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>创建会议室</h2>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="会议标题（可选）"
            style={{ flex: 1, padding: 10, border: '1px solid #ddd', borderRadius: 4 }}
          />
          <button
            onClick={createMeeting}
            disabled={creating}
            style={{
              padding: '10px 24px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: creating ? 'not-allowed' : 'pointer',
              fontSize: 16
            }}
          >
            {creating ? '创建中...' : '创建'}
          </button>
        </div>

        {meetingLink && (
          <div style={{ background: 'white', padding: 12, borderRadius: 4, display: 'flex', gap: 10, alignItems: 'center' }}>
            <code style={{ flex: 1, wordBreak: 'break-all' }}>{meetingLink}</code>
            <button
              onClick={copyLink}
              style={{
                padding: '6px 12px',
                background: copied ? '#16a34a' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {copied ? '已复制!' : '复制'}
            </button>
          </div>
        )}
        <p style={{ color: '#666', fontSize: 13, marginTop: 8 }}>
          将链接发送给参会者，他们点开即可加入。会议结束后链接自动失效。
        </p>
      </div>

      {/* Meeting History */}
      <div>
        <h2>我的会议</h2>
        {meetings.length === 0 ? (
          <p style={{ color: '#999' }}>暂无会议记录</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {meetings.map((m: any) => (
              <div key={m.id} style={{
                background: m.isEnded ? '#f0f0f0' : '#e8f5e9',
                padding: 12,
                borderRadius: 6,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <strong>{m.title || '未命名会议'}</strong>
                  <span style={{ marginLeft: 12, color: '#666', fontSize: 13 }}>
                    {new Date(m.createdAt).toLocaleString('zh-CN')}
                  </span>
                  <span style={{ marginLeft: 8, fontSize: 12, color: m.isEnded ? '#999' : '#16a34a' }}>
                    {m.isEnded ? '已结束' : '进行中'}
                  </span>
                </div>
                <span style={{ fontSize: 13, color: '#666' }}>
                  {m.participants?.length || 0} 人
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
