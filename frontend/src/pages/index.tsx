'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API = 'http://localhost:3001';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) router.push('/dashboard');
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e1a 0%, #111827 50%, #0f172a 100%)',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Animated background particles */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)', top: '-10%', right: '-10%' }} />
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)', bottom: '10%', left: '-5%' }} />
        <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)', top: '50%', right: '20%' }} />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Nav */}
        <div style={{ padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎥</div>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>极简会议</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => router.push('/login')} style={{
              padding: '8px 20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#cbd5e1', fontSize: 13, cursor: 'pointer', transition: 'all 0.2s'
            }}>登录</button>
            <button onClick={() => router.push('/register')} style={{
              padding: '8px 20px', background: '#3b82f6', border: 'none', borderRadius: 8, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer'
            }}>注册</button>
          </div>
        </div>

        {/* Hero */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
          <div style={{ textAlign: 'center', maxWidth: 640 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 20, padding: '6px 16px', marginBottom: 32, fontSize: 13, color: '#93c5fd'
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
              已就绪 · 免费使用
            </div>
            <h1 style={{
              fontSize: 56, fontWeight: 800, lineHeight: 1.1, marginBottom: 20,
              background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>
              一键召集<br />即刻开会
            </h1>
            <p style={{ fontSize: 18, color: '#64748b', lineHeight: 1.7, marginBottom: 48, maxWidth: 480, margin: '0 auto 48px' }}>
              零注册门槛 · 链接一次有效 · 3天自动清理<br />
              男女老少都能用，紧急时刻快人一步
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => router.push('/register')} style={{
                padding: '16px 40px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 24px rgba(59,130,246,0.3)', transition: 'all 0.2s'
              }}>创建会议室</button>
              <button onClick={() => router.push('/login')} style={{
                padding: '16px 40px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, fontSize: 16, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s'
              }}>已有账号</button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div style={{ padding: '40px 20px 60px', maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { icon: '🔗', title: '链接入会', desc: '点开链接输入姓名即可加入' },
              { icon: '🔒', title: '一次有效', desc: '会议结束链接永久销毁' },
              { icon: '🗑️', title: '3天清理', desc: '数据不留痕，隐私有保障' },
            ].map(f => (
              <div key={f.title} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12, padding: 20, textAlign: 'center'
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{f.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
