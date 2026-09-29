import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Plus, Star, Info, Film } from 'lucide-react';

export default function Hero({ item, onToggleBookmark, isBookmarked = false, onOpenTrailer }) {
  if (!item) return null;

  return (
    <div className="hero-banner">
      <img 
        src={item.backdrop || item.poster} 
        alt={item.title} 
        className="hero-backdrop-img"
      />
      <div className="hero-gradient-overlay" />

      <div className="hero-content">
        <div className="hero-meta-badge">
          <span>FEATURED</span>
          <span>•</span>
          <span>{item.type === 'series' ? 'TV Series' : 'Movie'}</span>
          {item.year && <><span>•</span><span>{item.year}</span></>}
          {item.rating && (
            <>
              <span>•</span>
              <span className="rating-tag"><Star size={13} fill="currentColor" /> {item.rating}</span>
            </>
          )}
        </div>

        <h1 className="hero-title">{item.title}</h1>
        {item.description && <p className="hero-description">{item.description}</p>}

        <div className="hero-actions">
          <Link to={`/watch/${item.id}`} className="btn-primary">
            <Play size={20} fill="currentColor" />
            <span>Watch Now</span>
          </Link>

          {onOpenTrailer && (
            <button className="btn-secondary" onClick={() => onOpenTrailer(item)}>
              <Film size={18} />
              <span>Trailer</span>
            </button>
          )}

          <Link to={`/title/${item.id}`} className="btn-secondary">
            <Info size={18} />
            <span>Details</span>
          </Link>

          {onToggleBookmark && (
            <button 
              className="btn-secondary" 
              onClick={() => onToggleBookmark(item)}
              style={{ padding: '0.85rem' }}
              title={isBookmarked ? "Remove from List" : "Add to List"}
            >
              <Plus size={20} style={{ transform: isBookmarked ? 'rotate(45deg)' : 'none', transition: 'transform 200ms' }} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
