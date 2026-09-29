import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Star, Bookmark } from 'lucide-react';

export default function MovieCard({ item, onToggleBookmark, isBookmarked = false, progress = null }) {
  if (!item) return null;

  return (
    <Link to={`/title/${item.id}`} className="poster-card">
      <img 
        src={item.poster || 'https://via.placeholder.com/300x450/101318/F5F7FA?text=No+Poster'} 
        alt={item.title} 
        className="poster-img"
        loading="lazy"
      />

      {/* Progress Bar for Continue Watching */}
      {progress !== null && progress > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'rgba(255,255,255,0.2)',
          zIndex: 10
        }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, progress)}%`,
            background: 'var(--accent-red)'
          }} />
        </div>
      )}

      <div className="poster-overlay">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'auto' }}>
          <span style={{ 
            background: 'rgba(0,0,0,0.75)', 
            padding: '0.2rem 0.5rem', 
            borderRadius: '4px', 
            fontSize: '0.75rem', 
            fontWeight: 700,
            textTransform: 'uppercase'
          }}>
            {item.type === 'series' ? 'TV Series' : 'Movie'}
          </span>

          {onToggleBookmark && (
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleBookmark(item);
              }}
              style={{
                background: isBookmarked ? 'var(--accent-red)' : 'rgba(0,0,0,0.6)',
                color: '#fff',
                padding: '0.35rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Bookmark size={14} fill={isBookmarked ? '#fff' : 'none'} />
            </button>
          )}
        </div>

        <h4 className="poster-title">{item.title}</h4>
        <div className="poster-meta">
          {item.year && <span>{item.year}</span>}
          {item.rating && (
            <span className="rating-tag">
              <Star size={12} fill="currentColor" /> {item.rating}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
