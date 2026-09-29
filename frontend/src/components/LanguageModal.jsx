import React from 'react';
import { Globe, X, Check } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'ur', name: 'Urdu', native: 'اردو' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'ar', name: 'Arabic', native: 'العربية' },
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'ko', name: 'Korean', native: '한국어' }
];

export default function LanguageModal({ isOpen, onClose, currentLang, onSelectLang }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Globe size={22} style={{ color: 'var(--accent-red)' }} />
            <h2 className="modal-title" style={{ margin: 0 }}>Choose Your Language</h2>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
          Select your preferred audio and interface language. This preference is saved locally for future visits.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
          {LANGUAGES.map((lang) => {
            const isSelected = currentLang === lang.name;
            return (
              <button
                key={lang.code}
                onClick={() => {
                  onSelectLang(lang.name);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1.2rem',
                  background: isSelected ? 'var(--accent-red-subtle)' : 'var(--bg-elevated)',
                  border: `1px solid ${isSelected ? 'var(--accent-red)' : 'var(--border-color)'}`,
                  borderRadius: 'var(--radius-md)',
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: isSelected ? 700 : 500,
                  transition: 'all 150ms'
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{lang.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{lang.native}</div>
                </div>
                {isSelected && <Check size={18} style={{ color: 'var(--accent-red)' }} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
