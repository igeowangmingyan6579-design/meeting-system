'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API = '/api';

export default function Dashboard() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [title, setTitle] = useState('');
  const [meetings, setMeetings] = useState<any>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showJoinPreview, setShowJoinPreview] = useState(false);
  const [ending, setEnding] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) { router.push('/login'); return; }
    setToken(t);
    fetchMeetings(t);
  }, []);

  const fetchMeetings = async (tok: string) => {
    try {
      const res = await fetch(`${API}/meetings/host/meetings`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (res.ok) { const data = await res.json(); setMeetings(data.meetings || []); }
    } catch (err: any) { console.error(err); }
    finally { setLoading(false); }
  };

  const createMeeting = async () => {
    setCreating(true);
    try {
      const res = await fetch(`${API}/meetings/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: title || '' }),
      });
      if (res.ok) {
        const data = await res.json();
        setMeetingLink(data.meeting.link);
        setShowJoinPreview(true);
        fetchMeetings(token);
        setTitle('');
      }
    } catch (err: any) { console.error(err); }
    finally { setCreating(false); }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(meetingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const logout = () => { localStorage.removeItem('token'); router.push('/login'); };

  const endMeeting = async (link: string) => {
    if (!confirm('确定结束这个会议?结束后链接将失效。')) return;
    setEnding(link);
    try {
      const res = await fetch(`${API}/meetings/${link}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        alert('会议已结束');
        fetchMeetings(token);
      } else {
        const data = await res.json();
        alert(data.error || '结束失败');
      }
    } catch { alert('网络错误'); }
    finally { setEnding(null); }
  };

  const deleteMeeting = async (id: string, link: string) => {
    if (!confirm('确定删除这个会议记录？此操作不可撤销。')) return;
    setDeleting(id);
    try {
      // 先结束会议（如果还没结束）
      if (!meetings.find((m: any) => m.id === id)?.isEnded) {
        await fetch(`${API}/meetings/${link}/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        });
      }
      // 调用后端 DELETE 接口物理删除
      const res = await fetch(`${API}/meetings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        alert('已删除');
        fetchMeetings(token);
      } else {
        const data = await res.json();
        alert(data.error || '删除失败');
      }
    } catch { alert('删除失败'); }
    finally { setDeleting(null); }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontFamily: 'system-ui' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <p>加载中...</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0e1a, #111827)', color: 'white', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎥</div>
          <span style={{ fontSize: 16, fontWeight: 700 }}>极简会议</span>
        </div>
        <button onClick={logout} style={{ padding: '8px 18px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>退出</button>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px' }}>
        {/* Welcome */}
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>创建新会议</h2>
          <p style={{ color: '#64748b', fontSize: 15 }}>点击下方按钮生成会议链接,发送给参会者即可</p>
        </div>

        {/* Create Card */}
        <div style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 28, marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="会议标题(可选)"
              style={{ flex: 1, padding: '13px 16px', background: 'rgba(15,23,42,0.6)', border: '1px solid #334155', borderRadius: 10, color: 'white', fontSize: 14, outline: 'none' }}
              onFocus={e => { e.target.style.borderColor = '#3b82f6'; }}
              onBlur={e => { e.target.style.borderColor = '#334155'; }} />
            <button onClick={createMeeting} disabled={creating} style={{
              padding: '13px 28px', background: creating ? '#475569' : 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', borderRadius: 10, cursor: creating ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', boxShadow: creating ? 'none' : '0 4px 16px rgba(59,130,246,0.3)'
            }}>{creating ? '创建中...' : '🚀 创建会议室'}</button>
          </div>

          {meetingLink && (
            <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>🔗 会议链接</span>
                <span style={{ fontSize: 11, color: '#22c55e', background: 'rgba(34,197,94,0.1)', padding: '2px 8px', borderRadius: 6 }}>已创建</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <code style={{ flex: 1, wordBreak: 'break-all', color: '#94a3b8', fontSize: 13, fontFamily: 'monospace', background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: 8 }}>{meetingLink}</code>
                <button onClick={copyLink} style={{
                  padding: '10px 18px', background: copied ? '#16a34a' : '#334155', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap'
                }}>{copied ? '✓ 已复制' : '复制'}</button>
              </div>
              <p style={{ color: '#475569', fontSize: 12, marginTop: 12, lineHeight: 1.6 }}>💡 将此链接通过任何方式发送给参会者,他们点开即可加入会议</p>
            </div>
          )}
        </div>

        {/* Preview: 模拟参会者入会 */}
        {meetingLink && (
          <div style={{ background: 'rgba(30,41,59,0.3)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8' }}>👁️ 参会者入会预览</h3>
              <a href={meetingLink} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 14px', background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 6, cursor: 'pointer', fontSize: 12, textDecoration: 'none' }}>在新窗口打开</a>
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ width: 320, background: '#0f172a', borderRadius: 12, padding: 24, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🎥</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'white' }}>加入会议</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>输入姓名即可加入</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" placeholder="您的姓名" readOnly style={{
                    flex: 1, padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, color: '#64748b', fontSize: 13
                  }} />
                  <button disabled style={{
                    padding: '10px 16px', background: '#334155', color: '#64748b', border: 'none', borderRadius: 8, cursor: 'not-allowed', fontSize: 13
                  }}>加入</button>
                </div>
                <p style={{ color: '#334155', fontSize: 11, textAlign: 'center', marginTop: 12 }}>↑ 这就是参会者看到的界面</p>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>参会者流程:</div>
                  <ol style={{ fontSize: 13, color: '#94a3b8', paddingLeft: 18, lineHeight: 2 }}>
                    <li>点开会议链接</li>
                    <li>输入姓名</li>
                    <li>点击"加入"</li>
                    <li>进入视频会议室</li>
                  </ol>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>主持人操作:</div>
                  <ol style={{ fontSize: 13, color: '#94a3b8', paddingLeft: 18, lineHeight: 2 }}>
                    <li>复制上面的链接</li>
                    <li>发送给参会者</li>
                    <li>等待他们加入</li>
                    <li>会议结束后点"结束"</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Info */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
          {[
            { icon: '🔒', title: '一次有效', desc: '会议结束链接永久销毁' },
            { icon: '🗑️', title: '3天清理', desc: '数据不留痕' },
            { icon: '🌍', title: '多语言', desc: '实时翻译' },
          ].map(f => (
            <div key={f.title} style={{ background: 'rgba(30,41,59,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 18, textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{f.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{f.title}</div>
              <div style={{ fontSize: 11, color: '#475569' }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* History */}
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📋</span> 最近会议
          </h3>
          {meetings.length === 0 ? (
            <div style={{ background: 'rgba(30,41,59,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
              <p style={{ color: '#475569', fontSize: 14 }}>暂无会议记录</p>
              <p style={{ color: '#334155', fontSize: 12, marginTop: 4 }}>点击上方"创建会议室"开始</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {meetings.map((m: any) => (
                <div key={m.id} style={{
                  background: 'rgba(30,41,59,0.3)', border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 10, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{m.title || '未命名会议'}</span>
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 10,
                        background: m.isEnded ? 'rgba(100,116,139,0.15)' : 'rgba(34,197,94,0.1)',
                        color: m.isEnded ? '#64748b' : '#22c55e', fontWeight: 500
                      }}>{m.isEnded ? '已结束' : '进行中'}</span>
                    </div>
                    <span style={{ color: '#475569', fontSize: 12 }}>{new Date(m.createdAt).toLocaleString('zh-CN')}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {m.isEnded ? (
                      <button
                        onClick={() => deleteMeeting(m.id, m.link)}
                        disabled={deleting === m.id}
                        style={{
                          padding: '6px 14px',
                          background: deleting === m.id ? '#475569' : 'rgba(239,68,68,0.1)',
                          color: deleting === m.id ? '#64748b' : '#fca5a5',
                          border: '1px solid rgba(239,68,68,0.2)',
                          borderRadius: 8,
                          cursor: deleting === m.id ? 'not-allowed' : 'pointer',
                          fontSize: 12,
                          fontWeight: 500
                        }}
                      >{deleting === m.id ? '删除中...' : '🗑️ 删除'}</button>
                    ) : (
                      <button
                        onClick={() => endMeeting(m.link)}
                        disabled={ending === m.link}
                        style={{
                          padding: '6px 14px',
                          background: ending === m.link ? '#475569' : 'rgba(239,68,68,0.15)',
                          color: ending === m.link ? '#64748b' : '#fca5a5',
                          border: '1px solid rgba(239,68,68,0.25)',
                          borderRadius: 8,
                          cursor: ending === m.link ? 'not-allowed' : 'pointer',
                          fontSize: 12,
                          fontWeight: 500
                        }}
                      >{ending === m.link ? '结束中...' : '⏹ 结束会议'}</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
