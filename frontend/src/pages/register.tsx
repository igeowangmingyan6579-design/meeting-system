'use client';
import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '注册失败');
        return;
      }

      setSuccess('注册成功！正在跳转...');
      localStorage.setItem('token', data.token);
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (err: any) {
      setError('网络错误，请重试');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 20 }}>
      <h1 style={{ textAlign: 'center', marginBottom: 30 }}>注册主持人</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>邮箱</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 4 }}
            placeholder="your@email.com"
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>密码（至少6位）</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 4 }}
          />
        </div>
        {error && <p style={{ color: 'red', marginBottom: 12 }}>{error}</p>}
        {success && <p style={{ color: 'green', marginBottom: 12 }}>{success}</p>}
        <button
          type="submit"
          style={{
            width: '100%', padding: 12, background: '#2563eb', color: 'white',
            border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 16
          }}
        >
          注册
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: 16 }}>
        已有账号？<a href="/login">去登录</a>
      </p>
    </div>
  );
}
