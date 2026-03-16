import { useState, useEffect } from 'react';
import { getConversations, getConversation } from '../api';

export default function Conversations() {
  const [conversations, setConversations] = useState([]);
  const [selectedJid, setSelectedJid] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await getConversations(100);
        setConversations(res.data || []);
      } catch {
        // Mock data for demo
        setConversations([
          { jid: '6281234567890@s.whatsapp.net', last_message: '2026-03-16 06:45:00', message_count: 24 },
          { jid: '6289876543210@s.whatsapp.net', last_message: '2026-03-16 05:30:00', message_count: 18 },
          { jid: '6281112223334@s.whatsapp.net', last_message: '2026-03-15 22:10:00', message_count: 45 },
        ]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function selectConversation(jid) {
    setSelectedJid(jid);
    setChatLoading(true);
    try {
      const res = await getConversation(jid);
      setMessages(res.data || []);
    } catch {
      // Mock messages for demo
      setMessages([
        { direction: 'incoming', text: 'Hey, are we still meeting tomorrow?', tone: 'casual', confidence: 0.85, created_at: '2026-03-16 06:40:00' },
        { direction: 'outgoing', text: "Yes, see you at 15:00 at the cafe! ☕", tone: 'casual', confidence: 0.9, created_at: '2026-03-16 06:41:00' },
        { direction: 'incoming', text: 'Actually can we move to 4pm?', tone: 'casual', confidence: 0.82, created_at: '2026-03-16 06:42:00' },
        { direction: 'outgoing', text: 'Of course! 4pm works perfectly. See you then 😊', tone: 'casual', confidence: 0.88, created_at: '2026-03-16 06:43:00' },
        { direction: 'incoming', text: 'You always make my day better ;)', tone: 'flirt', confidence: 0.78, created_at: '2026-03-16 06:44:00' },
        { direction: 'outgoing', text: 'Careful — keep that up and I might get jealous 😉', tone: 'flirt', confidence: 0.85, created_at: '2026-03-16 06:45:00' },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  if (loading) {
    return <div className="loading-spinner"><div className="spinner"></div></div>;
  }

  return (
    <div style={{ animation: 'fadeInUp 0.4s ease' }}>
      <div className="page-header">
        <h1 className="page-title">Conversations</h1>
        <p className="page-subtitle">View and browse all WhatsApp conversations</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
        {/* Contact List */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 className="section-title" style={{ margin: 0, fontSize: '15px' }}>📱 Contacts</h3>
          </div>
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {conversations.map((conv, i) => (
              <div
                key={i}
                onClick={() => selectConversation(conv.jid)}
                style={{
                  padding: '14px 20px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border-subtle)',
                  background: selectedJid === conv.jid ? 'rgba(108, 99, 255, 0.1)' : 'transparent',
                  borderLeft: selectedJid === conv.jid ? '3px solid var(--accent-primary)' : '3px solid transparent',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (selectedJid !== conv.jid) e.currentTarget.style.background = 'var(--bg-card-hover)';
                }}
                onMouseLeave={(e) => {
                  if (selectedJid !== conv.jid) e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                  {formatJid(conv.jid)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {formatTime(conv.last_message)}
                  </span>
                  <span className="badge badge-casual" style={{ fontSize: '11px' }}>
                    {conv.message_count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat View */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {!selectedJid ? (
            <div className="empty-state">
              <div className="empty-state-icon">💬</div>
              <div className="empty-state-title">Select a conversation</div>
              <p>Click on a contact to view the message history.</p>
            </div>
          ) : chatLoading ? (
            <div className="loading-spinner"><div className="spinner"></div></div>
          ) : (
            <>
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'var(--bg-secondary)',
              }}>
                <div style={{ fontWeight: 600, fontSize: '15px' }}>
                  {formatJid(selectedJid)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {messages.length} messages
                </div>
              </div>

              <div className="chat-container" style={{ flex: 1 }}>
                {messages.map((msg, i) => (
                  <div key={i} className={`chat-message ${msg.direction}`}>
                    <div className="chat-bubble">
                      <div>{msg.text}</div>
                      <div className="chat-meta">
                        {msg.tone && (
                          <span className={`badge badge-${msg.tone}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                            {msg.tone} {msg.confidence ? `(${Math.round(msg.confidence * 100)}%)` : ''}
                          </span>
                        )}
                        <span>{formatTime(msg.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatJid(jid) {
  if (!jid) return 'Unknown';
  return '+' + jid.replace('@s.whatsapp.net', '');
}

function formatTime(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return ts;
  }
}
