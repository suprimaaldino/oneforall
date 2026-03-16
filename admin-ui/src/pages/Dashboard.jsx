import { useState, useEffect } from 'react';
import { getStats, getConversations } from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, convRes] = await Promise.all([getStats(), getConversations(10)]);
        setStats(statsRes.data);
        setConversations(convRes.data || []);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
        // Use mock data for demo
        setStats({
          totalContacts: 12,
          totalMessages: 347,
          autoReplyEnabled: true,
          botName: 'DinoBot',
          defaultTone: 'auto-detect',
        });
        setConversations([
          { jid: '6281234567890@s.whatsapp.net', last_message: '2026-03-16 06:45:00', message_count: 24 },
          { jid: '6289876543210@s.whatsapp.net', last_message: '2026-03-16 05:30:00', message_count: 18 },
          { jid: '6281112223334@s.whatsapp.net', last_message: '2026-03-15 22:10:00', message_count: 45 },
          { jid: '6285556667778@s.whatsapp.net', last_message: '2026-03-15 20:05:00', message_count: 9 },
        ]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeInUp 0.4s ease' }}>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of your DinoBot WhatsApp assistant</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="card stat-card">
          <span className="stat-icon">💬</span>
          <div className="stat-value">{stats?.totalMessages || 0}</div>
          <div className="stat-label">Total Messages</div>
        </div>

        <div className="card stat-card">
          <span className="stat-icon">👥</span>
          <div className="stat-value">{stats?.totalContacts || 0}</div>
          <div className="stat-label">Contacts</div>
        </div>

        <div className="card stat-card">
          <span className="stat-icon">🤖</span>
          <div className="stat-value" style={{ fontSize: '24px' }}>
            {stats?.autoReplyEnabled ? '✅ Active' : '⏸ Paused'}
          </div>
          <div className="stat-label">Auto-Reply</div>
        </div>

        <div className="card stat-card">
          <span className="stat-icon">🎭</span>
          <div className="stat-value" style={{ fontSize: '22px', textTransform: 'capitalize' }}>
            {stats?.defaultTone || 'auto'}
          </div>
          <div className="stat-label">Default Tone</div>
        </div>
      </div>

      {/* Recent Conversations */}
      <div className="card">
        <h2 className="section-title">📋 Recent Conversations</h2>
        {conversations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💬</div>
            <div className="empty-state-title">No conversations yet</div>
            <p>Messages will appear here once the bot starts receiving chats.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Last Message</th>
                  <th>Messages</th>
                </tr>
              </thead>
              <tbody>
                {conversations.map((conv, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {formatJid(conv.jid)}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {formatTime(conv.last_message)}
                    </td>
                    <td>
                      <span className="badge badge-casual">{conv.message_count} msgs</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function formatJid(jid) {
  if (!jid) return 'Unknown';
  return '+' + jid.replace('@s.whatsapp.net', '');
}

function formatTime(ts) {
  if (!ts) return '-';
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}
