'use client';
import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

const API = '/api';

export default function Join() {
  const router = useRouter();
  const params = useParams();
  const link = params?.link;
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setJoining(true);
    try {
      const res = await fetch(`${API}/meetings/${link}/join`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        router.push(`/meeting/${link}`);
      } else {
        const data = await res.json();
        setError(data.error || '加入失败');
      }
    } catch { setError('网络错误'); }
    finally { setJoining(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0a0e1a, #111827)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ width: 420, background: 'rgba(30,41,59,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 48, boxShadow: '0 25px 60px rgba(0,0,0,0.4)', textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>🎥</div>
        <h1 style={{ color: 'white', fontSize: 26, fontWeight: 700, marginBottom: 8 }}>加入会议</h1>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 36, lineHeight: 1.6 }}>输入您的姓名即可加入<br />无需注册 · 无需密码</p>
        <form onSubmit={handleJoin}>
          <div style={{ marginBottom: 24 }}>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="请输入您的姓名"
              style={{ width: '100%', padding: '16px', fontSize: 16, background: 'rgba(15,23,42,0.6)', border: '2px solid #334155', borderRadius: 12, color: 'white', boxSizing: 'border-box', textAlign: 'center', outline: 'none', fontWeight: 500 }}
              onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 4px rgba(59,130,246,0.15)'; }}
              onBlur={e => { e.target.style.borderColor = '#334155'; e.target.style.boxShadow = 'none'; }} />
          </div>
          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, color: '#fca5a5', fontSize: 13 }}>{error}</div>}
          <button type="submit" disabled={joining || !name.trim()} style={{
            width: '100%', padding: 16, fontSize: 18, background: joining || !name.trim() ? '#475569' : 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', borderRadius: 12, cursor: joining || !name.trim() ? 'not-allowed' : 'pointer', fontWeight: 700, boxShadow: joining || !name.trim() ? 'none' : '0 6px 24px rgba(59,130,246,0.3)', transition: 'all 0.2s'
          }}>{joining ? '加入中...' : '加入会议'}</button>
        </form>
        <p style={{ marginTop: 16 }}>
          <a href="/" style={{ color: '#475569', textDecoration: 'none', fontSize: 13 }}>← 返回首页</a>
        </p>
      </div>
    </div>
  );
}
