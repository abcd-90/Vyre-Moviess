import React from 'react';
import MovieCard from '../components/MovieCard';
import { History as HistoryIcon, Trash2 } from 'lucide-react';

export default function History({ history = [], onClearHistory, onToggleBookmark, bookmarkMap = {} }) {
  return (
    <div className="section-container" style={{ paddingTop: '2.5rem' }}>
      <div className="section-header">
        <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <HistoryIcon size={24} style={{ color: 'var(--accent-red)' }} /> Watch History ({history.length})
        </h2>

        {history.length > 0 && (
          <button className="btn-secondary" onClick={onClearHistory} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            <Trash2 size={16} /> Clear History
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>No watch history found.</p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Titles you watch will automatically be logged here so you can resume anytime.
          </p>
        </div>
      ) : (
        <div className="poster-row">
          {history.map(item => (
            <MovieCard 
              key={item.id} 
              item={item} 
              progress={item.progress}
              onToggleBookmark={onToggleBookmark}
              isBookmarked={!!bookmarkMap[item.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
