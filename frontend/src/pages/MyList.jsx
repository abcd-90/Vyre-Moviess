import React from 'react';
import MovieCard from '../components/MovieCard';
import { Bookmark } from 'lucide-react';

export default function MyList({ bookmarks = [], onToggleBookmark }) {
  const bookmarkMap = bookmarks.reduce((acc, item) => {
    acc[item.id] = true;
    return acc;
  }, {});

  return (
    <div className="section-container" style={{ paddingTop: '2.5rem' }}>
      <div className="section-header">
        <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Bookmark size={24} style={{ color: 'var(--accent-red)' }} /> My Saved List ({bookmarks.length})
        </h2>
      </div>

      {bookmarks.length === 0 ? (
        <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>Your saved list is empty.</p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Click the "+ Add to List" button on any movie or TV show to save it here.
          </p>
        </div>
      ) : (
        <div className="poster-row">
          {bookmarks.map(item => (
            <MovieCard 
              key={item.id} 
              item={item} 
              onToggleBookmark={onToggleBookmark}
              isBookmarked={!!bookmarkMap[item.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
