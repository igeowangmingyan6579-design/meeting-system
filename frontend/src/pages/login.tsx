'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API = 'http://localhost:3001';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }
      localStorage.setItem('token', data.token);
      router.push('/dashboard');
    } catch { setError('网络错误'); setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0a0e1a, #111827)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ width: 420, background: 'rgba(30,41,59,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 40, boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div onClick={() => router.push('/')} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎥</div>
          </div>
          <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 6 }}>欢迎回来</h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>登录进入会议控制台</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: '#94a3b8', display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 500 }}>邮箱地址</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.com"
              style={{ width: '100%', padding: '13px 16px', background: 'rgba(15,23,42,0.6)', border: '1px solid #334155', borderRadius: 10, color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)'; }}
              onBlur={e => { e.target.style.borderColor = '#334155'; e.target.style.boxShadow = 'none'; }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ color: '#94a3b8', display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 500 }}>密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="输入密码"
              style={{ width: '100%', padding: '13px 16px', background: 'rgba(15,23,42,0.6)', border: '1px solid #334155', borderRadius: 10, color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)'; }}
              onBlur={e => { e.target.style.borderColor = '#334155'; e.target.style.boxShadow = 'none'; }} />
          </div>
          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, color: '#fca5a5', fontSize: 13 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: 14, background: loading ? '#475569' : 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 16px rgba(59,130,246,0.3)'
          }}>{loading ? '登录中...' : '登录'}</button>
        </form>
        <p style={{ color: '#475569', textAlign: 'center', marginTop: 24, fontSize: 14 }}>
          没有账号？<a href="/register" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>免费注册</a>
        </p>
      </div>
    </div>
  );
}
