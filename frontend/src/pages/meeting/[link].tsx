'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function MeetingRoom() {
  const router = useRouter();
  const params = useParams();
  const link = params?.link;
  const [meeting, setMeeting] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);

  useEffect(() => {
    if (!link) return;
    fetch(`/api/meetings/${link}`)
      .then(r => r.json())
      .then(data => {
        if (data.meeting) {
          setMeeting(data.meeting);
          setParticipants(data.meeting.participants || []);
        } else {
          router.push('/');
        }
      })
      .catch(() => router.push('/'));
  }, [link, router]);

  if (!meeting) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0a0e1a, #111827)', color: 'white' }}>
      <div>加载中...</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0e1a, #111827)', color: 'white', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{meeting.title || '会议进行中'}</h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
            {meeting.isEnded ? '已结束' : '进行中'} · 链接: {meeting.link}
          </p>
        </div>
        <button onClick={() => router.push('/')} style={{ padding: '8px 20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#94a3b8', cursor: 'pointer' }}>
          返回首页
        </button>
      </div>
      <div style={{ padding: '32px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ background: 'rgba(15,23,42,0.8)', borderRadius: 16, padding: 48, textAlign: 'center', marginBottom: 24, border: '1px solid rgba(255,255,255,0.06)', minHeight: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎥</div>
          <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>视频会议室</h3>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>视频通话功能即将接入</p>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎤</div>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📹</div>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💬</div>
          </div>
        </div>
        <div style={{ background: 'rgba(15,23,42,0.6)', borderRadius: 12, padding: 24, border: '1px solid rgba(255,255,255,0.06)' }}>
          <h4 style={{ margin: '0 0 16px', fontSize: 14, color: '#94a3b8' }}>参会者 ({participants.length})</h4>
          {participants.length === 0 ? (
            <p style={{ color: '#475569', fontSize: 13 }}>暂无参会者</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {participants.map((p: any) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                    {p.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <span style={{ fontSize: 14 }}>{p.name}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#22c55e' }}>● 在线</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
