import React, { useState } from 'react';
import { Settings as SettingsIcon, Globe, Shield, Monitor, Trash2, Check } from 'lucide-react';

export default function Settings({ userLang, onSelectLang, onClearAllData }) {
  const [prefQuality, setPrefQuality] = useState('1080p');
  const [subLanguage, setSubLanguage] = useState('English');
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    localStorage.setItem('vyre_pref_quality', prefQuality);
    localStorage.setItem('vyre_sub_lang', subLanguage);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="section-container" style={{ paddingTop: '2.5rem', maxWidth: '800px' }}>
      <div className="section-header">
        <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <SettingsIcon size={24} style={{ color: 'var(--accent-red)' }} /> Platform Settings
        </h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Language Preference */}
        <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem' }}>
            <Globe size={20} style={{ color: 'var(--accent-red)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Default Language</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Select preferred interface and audio language.
          </p>
          <select 
            className="select-dropdown" 
            value={userLang} 
            onChange={(e) => onSelectLang(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 1rem' }}
          >
            <option value="English">English</option>
            <option value="Urdu">Urdu (اردو)</option>
            <option value="Hindi">Hindi (हिन्दी)</option>
            <option value="Bengali">Bengali (বাংলা)</option>
            <option value="Spanish">Spanish (Español)</option>
            <option value="Arabic">Arabic (العربية)</option>
            <option value="Japanese">Japanese (日本語)</option>
            <option value="Korean">Korean (한국어)</option>
          </select>
        </div>

        {/* Video & Subtitle Playback Settings */}
        <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem' }}>
            <Monitor size={20} style={{ color: 'var(--accent-red)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Playback & Stream Resolution</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>Default Stream Quality</label>
              <select 
                className="select-dropdown"
                value={prefQuality}
                onChange={(e) => setPrefQuality(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 1rem' }}
              >
                <option value="2160p">4K / UHD (2160p)</option>
                <option value="1080p">Full HD (1080p) - Recommended</option>
                <option value="720p">HD (720p)</option>
                <option value="480p">SD (480p) - Data Saver</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Auto-play Next Episode</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Automatically start next episode when current episode ends.</div>
              </div>
              <input 
                type="checkbox" 
                checked={autoPlayNext} 
                onChange={(e) => setAutoPlayNext(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-red)' }}
              />
            </div>
          </div>
        </div>

        {/* Data & Privacy */}
        <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem' }}>
            <Shield size={20} style={{ color: 'var(--accent-red)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Data & Local Cache</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Clear locally saved watch history, saved lists, and offline preferences.
          </p>
          <button className="btn-secondary" onClick={onClearAllData} style={{ color: 'var(--status-error)' }}>
            <Trash2 size={16} /> Reset Local Storage Data
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn-primary" onClick={handleSave}>
            Save Preferences
          </button>
          {savedSuccess && (
            <span style={{ color: 'var(--status-success)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
              <Check size={16} /> Settings Saved!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
