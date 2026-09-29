import React, { useState, useEffect } from 'react';
import { Users, Copy, Check, Send, Sparkles, X, MessageSquare, Play, Pause } from 'lucide-react';

export default function WatchPartyModal({ isOpen, onClose, mediaId, mediaTitle, poster, season, episode, currentTime, onSeek, onTogglePlay }) {
  const [room, setRoom] = useState(null);
  const [copied, setCopied] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [userName, setUserName] = useState(localStorage.getItem('vyre_user_name') || 'Cinephile');

  useEffect(() => {
    if (!isOpen) return;
    if (!room && mediaId) {
      // Create party room
      fetch('/api/party/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId, mediaTitle, poster, season, episode, hostName: userName })
      })
        .then(r => r.json())
        .then(data => setRoom(data))
        .catch(e => console.error("Party create error:", e));
    }
  }, [isOpen, mediaId, mediaTitle, poster, season, episode]);

  // Poll room updates every 2s
  useEffect(() => {
    if (!isOpen || !room?.roomId) return;
    const interval = setInterval(() => {
      fetch(`/api/party/${room.roomId}`)
        .then(r => r.json())
        .then(data => {
          if (data && data.roomId) {
            setRoom(data);
          }
        })
        .catch(() => {});
    }, 2000);
    return () => clearInterval(interval);
  }, [isOpen, room?.roomId]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim() || !room?.roomId) return;
    const txt = messageText;
    setMessageText('');

    fetch(`/api/party/${room.roomId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'chat', text: txt, sender: userName })
    })
      .then(r => r.json())
      .then(data => setRoom(data));
  };

  const copyRoomLink = () => {
    if (!room?.roomId) return;
    navigator.clipboard.writeText(room.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="search-modal-backdrop" onClick={onClose}>
      <div
        className="search-modal-container"
        style={{ maxWidth: '600px', width: '92%', padding: '1.8rem', background: '#121217', borderRadius: '18px', border: '1px solid #27272a' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Users size={22} style={{ color: '#e50914' }} />
            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#fff' }}>Watch Party Room</h3>
          </div>
          <button className="btn-secondary" style={{ padding: '0.4rem', borderRadius: '50%' }} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Room Code Banner */}
        <div style={{ background: '#1c1c24', padding: '1rem', borderRadius: '12px', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #27272a' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Party Room Code</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#e50914', letterSpacing: '1px' }}>{room?.roomId || 'Creating...'}</div>
          </div>
          <button className="btn-secondary" style={{ gap: '0.4rem', fontSize: '0.85rem' }} onClick={copyRoomLink}>
            {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>
        </div>

        {/* Active Members */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#a1a1aa', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Users size={14} /> Active Viewers ({room?.members?.length || 1}):
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {room?.members?.map((m, i) => (
              <span key={i} style={{ background: 'rgba(229, 9, 20, 0.15)', color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', border: '1px solid rgba(229, 9, 20, 0.4)' }}>
                👤 {m.name} {m.isHost && '(Host)'}
              </span>
            ))}
          </div>
        </div>

        {/* Live Chat Box */}
        <div style={{ background: '#09090b', borderRadius: '12px', height: '220px', display: 'flex', flexDirection: 'column', padding: '0.8rem', marginBottom: '1rem', border: '1px solid #27272a' }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {room?.messages?.map((msg) => (
              <div key={msg.id} style={{ fontSize: '0.85rem', color: msg.isSystem ? '#e50914' : '#e4e4e7', fontStyle: msg.isSystem ? 'italic' : 'normal' }}>
                {!msg.isSystem && <strong style={{ color: '#a1a1aa' }}>{msg.sender}: </strong>}
                {msg.text}
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input
              type="text"
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              placeholder="Type chat message or reaction..."
              style={{ flex: 1, background: '#18181c', border: '1px solid #27272a', borderRadius: '8px', padding: '0.5rem 0.8rem', color: '#fff', fontSize: '0.85rem' }}
            />
            <button type="submit" className="btn-primary" style={{ padding: '0.5rem 0.8rem' }}>
              <Send size={16} />
            </button>
          </form>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#71717a' }}>✨ Syncs video play & seek automatically across viewers.</span>
          <button className="btn-secondary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
