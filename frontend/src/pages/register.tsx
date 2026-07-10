'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API = '/api';

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const onTermsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) { setTermsChecked(true); setShowTerms(true); }
    else { setTermsChecked(false); setAgreed(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('两次密码不一致'); return; }
    if (password.length < 6) { setError('密码至少6位'); return; }
    if (!agreed) { setError('请先阅读并同意《信息安全与免责声明》'); return; }
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #eef2f7, #e2e8f0)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ width: 420, background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px)', border: '1px solid rgba(148,163,184,0.25)', borderRadius: 20, padding: 40, boxShadow: '0 25px 60px rgba(15,23,42,0.12)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div onClick={() => router.push('/')} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎥</div>
          </div>
          <h1 style={{ color: '#1e293b', fontSize: 24, fontWeight: 700, marginBottom: 6 }}>创建账户</h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>成为主持人，创建您的第一个会议</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: '#475569', display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 500 }}>邮箱地址</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.com"
              style={{ width: '100%', padding: '13px 16px', background: 'rgba(255,255,255,0.8)', border: '1px solid #cbd5e1', borderRadius: 10, color: '#1e293b', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)'; }}
              onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: '#475569', display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 500 }}>密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="至少6位"
              style={{ width: '100%', padding: '13px 16px', background: 'rgba(255,255,255,0.8)', border: '1px solid #cbd5e1', borderRadius: 10, color: '#1e293b', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)'; }}
              onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ color: '#475569', display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 500 }}>确认密码</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="再次输入密码"
              style={{ width: '100%', padding: '13px 16px', background: 'rgba(255,255,255,0.8)', border: '1px solid #cbd5e1', borderRadius: 10, color: '#1e293b', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)'; }}
              onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }} />
          </div>
          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, color: '#dc2626', fontSize: 13 }}>{error}</div>}

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20, fontSize: 13, color: '#475569', cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={termsChecked} onChange={onTermsChange} style={{ marginTop: 2, width: 16, height: 16, flex: '0 0 auto', accentColor: '#3b82f6', cursor: 'pointer' }} />
            <span>我已阅读并同意 <a onClick={() => setShowTerms(true)} style={{ color: '#3b82f6', cursor: 'pointer', textDecoration: 'none', fontWeight: 500 }}>《信息安全与免责声明》</a></span>
          </label>

          <button type="submit" disabled={loading || !agreed} style={{
            width: '100%', padding: 14, background: (loading || !agreed) ? '#94a3b8' : 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: (loading || !agreed) ? 'not-allowed' : 'pointer', boxShadow: (loading || !agreed) ? 'none' : '0 4px 16px rgba(59,130,246,0.3)', transition: 'all 0.2s'
          }}>{loading ? '注册中...' : '注册'}</button>
        </form>

        {showTerms && (
          <div onClick={() => { setShowTerms(false); if (!agreed) setTermsChecked(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 1000 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, maxWidth: 560, width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 80px rgba(15,23,42,0.25)', overflow: 'hidden' }}>
              <div style={{ padding: '20px 28px', borderBottom: '1px solid #e2e8f0', fontSize: 17, fontWeight: 700, color: '#1e293b' }}>信息安全与免责声明</div>
              <div style={{ padding: 24, overflowY: 'auto', fontSize: 13, lineHeight: 1.85, color: '#475569' }}>
                <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>一、服务说明</p>
                <p style={{ marginBottom: 16 }}>本服务为提供音视频会议连接的工具平台（P2P 点对点加密传输）。默认设置下，会议内容不经过平台服务器存储；如主持人开启本地录制，录制文件仅保存在主持人本人设备，平台不自动上传或留存。</p>
                <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>二、信息安全提示</p>
                <p style={{ marginBottom: 16 }}>1. 请勿在会议中传输国家秘密、商业秘密或个人敏感信息（如身份证号、银行卡密码、医疗记录等）。<br />2. 会议链接等同于入场凭证，请仅分享给受信任的参会者；任何拿到链接并输入昵称者均可加入。<br />3. 您应对本人设备安全负责，包括摄像头、麦克风权限及网络环境。<br />4. 平台采用传输层加密，但无法保证公共网络或第三方设备上的端到端安全。</p>
                <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>三、用户义务</p>
                <p style={{ marginBottom: 16 }}>1. 您承诺使用本服务已获得合法授权，所上传、分享的内容不侵犯任何第三方的知识产权、隐私权或其他合法权益。<br />2. 您应对通过本服务发布、传播的内容独立承担全部法律责任。</p>
                <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>四、免责声明</p>
                <p style={{ marginBottom: 16 }}>1. 本服务按"现状"提供，平台尽合理努力保障服务可用，但不对服务的连续性、适用性作出明示或默示担保。<br />2. 因网络状况、设备兼容、第三方服务或不可抗力导致的会议中断、画面/声音异常，平台不承担赔偿责任。<br />3. 平台不对用户之间的交流内容、第三方链接或由此产生的任何纠纷负责。<br />4. 在法律允许的最大范围内，平台对因使用本服务所产生的间接、附带或后果性损失不承担责任。</p>
                <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>五、授权与合规</p>
                <p style={{ marginBottom: 4 }}>本服务已取得合法运营授权，并遵循所在地区适用的法律法规及数据保护相关要求。如您不同意上述条款，请勿使用本服务。</p>
              </div>
              <div style={{ padding: '16px 28px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button onClick={() => { setShowTerms(false); setTermsChecked(false); }} style={{ padding: '10px 20px', background: 'rgba(15,23,42,0.06)', border: '1px solid rgba(15,23,42,0.12)', borderRadius: 10, color: '#475569', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>暂不同意</button>
                <button onClick={() => { setAgreed(true); setTermsChecked(true); setShowTerms(false); }} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>我已阅读并同意</button>
              </div>
            </div>
          </div>
        )}
        <p style={{ color: '#475569', textAlign: 'center', marginTop: 24, fontSize: 14 }}>
          已有账号？<a href="/login" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>去登录</a>
        </p>
      </div>
    </div>
  );
}
