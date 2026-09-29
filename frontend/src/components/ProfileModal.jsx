import React from 'react';
import { X, UserCheck, Shield, Sparkles, Smile } from 'lucide-react';

export const PROFILES = [
  { id: 'p1', name: 'Master Profile', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', badge: 'Adult VIP', color: '#e50914' },
  { id: 'p2', name: 'Kids World', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', badge: 'Kids Protected', color: '#3b82f6' },
  { id: 'p3', name: 'Anime Fan', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', badge: 'Otaku Mode', color: '#8b5cf6' },
  { id: 'p4', name: 'Cinephile', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80', badge: 'Ultra 4K', color: '#10b981' }
];

export function getActiveProfile() {
  try {
    const stored = localStorage.getItem('vyre_active_profile');
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return PROFILES[0];
}

export function setActiveProfile(profile) {
  try {
    localStorage.setItem('vyre_active_profile', JSON.stringify(profile));
  } catch (e) {}
}

export default function ProfileModal({ isOpen, onClose, currentProfile, onSelectProfile }) {
  if (!isOpen) return null;

  return (
    <div className="search-modal-backdrop" onClick={onClose}>
      <div className="search-modal-container" style={{ maxWidth: '550px', padding: '2rem' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>Who's Watching?</h2>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#a1a1aa' }}>Select your profile to customize watch history and preferences</p>
          </div>
          <button className="btn-secondary" style={{ padding: '0.4rem', borderRadius: '50%' }} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {PROFILES.map((p) => {
            const isSelected = currentProfile?.id === p.id;
            return (
              <div
                key={p.id}
                onClick={() => {
                  setActiveProfile(p);
                  onSelectProfile(p);
                  onClose();
                }}
                style={{
                  background: isSelected ? 'rgba(229, 9, 20, 0.15)' : '#18181c',
                  border: isSelected ? '2px solid #e50914' : '1px solid #27272a',
                  borderRadius: '16px',
                  padding: '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <img
                  src={p.avatar}
                  alt={p.name}
                  style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${p.color}` }}
                />
                <div>
                  <div style={{ fontWeight: 600, color: '#fff', fontSize: '1rem' }}>{p.name}</div>
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', color: p.color, marginTop: '4px', display: 'inline-block' }}>
                    {p.badge}
                  </span>
                </div>
                {isSelected && <UserCheck size={20} style={{ marginLeft: 'auto', color: '#e50914' }} />}
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: 'center' }}>
          <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
