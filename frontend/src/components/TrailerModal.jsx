import React, { useEffect, useState } from 'react';
import { X, Play, Loader, Film } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TrailerModal({ isOpen, onClose, title, mediaId }) {
  const [videoKey, setVideoKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen || !title) return;
    setLoading(true);
    setVideoKey(null);

    fetch(`/api/trailer?q=${encodeURIComponent(title)}`)
      .then(res => res.json())
      .then(data => {
        if (data.videoKey) {
          setVideoKey(data.videoKey);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, title]);

  if (!isOpen) return null;

  return (
    <div className="search-modal-backdrop" onClick={onClose}>
      <div
        className="search-modal-container"
        style={{ maxWidth: '850px', width: '92%', padding: '1.5rem', background: '#0f0f13', borderRadius: '16px', border: '1px solid #27272a' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Film size={22} style={{ color: '#e50914' }} />
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>Official Trailer — {title}</h3>
          </div>
          <button className="btn-secondary" style={{ padding: '0.4rem', borderRadius: '50%' }} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#000', borderRadius: '12px', overflow: 'hidden', marginBottom: '1rem' }}>
          {loading ? (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#a1a1aa' }}>
              <Loader size={36} className="animate-spin" style={{ marginBottom: '0.8rem', color: '#e50914' }} />
              <span>Fetching Official HD Trailer...</span>
            </div>
          ) : videoKey ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoKey}?autoplay=1&modestbranding=1&rel=0`}
              title={`${title} Trailer`}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#a1a1aa' }}>
              <p>No official trailer video found for this title.</p>
              {mediaId && (
                <button className="btn-primary" onClick={() => { onClose(); navigate(`/watch/${mediaId}`); }}>
                  <Play size={18} /> Watch Full Video
                </button>
              )}
            </div>
          )}
        </div>

        {mediaId && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem' }}>
            <button className="btn-secondary" onClick={onClose}>
              Close Preview
            </button>
            <button className="btn-primary" onClick={() => { onClose(); navigate(`/watch/${mediaId}`); }}>
              <Play size={18} fill="currentColor" /> Watch Full Title
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
