import React, { useEffect, useState } from 'react';
import Hero from '../components/Hero';
import MovieCard from '../components/MovieCard';
import { Play, TrendingUp, Sparkles, Tv, Film } from 'lucide-react';

export default function Home({ bookmarkMap, onToggleBookmark, continueWatching = [] }) {
  const [data, setData] = useState({
    featured: [],
    trending: [],
    popular: [],
    recentlyAdded: [],
    catalog: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/homepage')
      .then(res => {
        if (!res.ok) throw new Error("Failed to load homepage stream");
        return res.json();
      })
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error("Homepage error:", err);
        setError("Unable to connect to streaming provider. Retrying...");
        setLoading(false);
      });
  }, []);

  const featuredItem = data.featured && data.featured.length > 0 ? data.featured[0] : null;

  return (
    <div>
      {/* Featured Hero Banner */}
      {loading ? (
        <div className="skeleton" style={{ height: '65vh', width: '100%' }} />
      ) : featuredItem ? (
        <Hero 
          item={featuredItem} 
          onToggleBookmark={onToggleBookmark}
          isBookmarked={!!bookmarkMap[featuredItem.id]}
        />
      ) : null}

      {/* Continue Watching Row */}
      {continueWatching.length > 0 && (
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Play size={20} style={{ color: 'var(--accent-red)' }} /> Continue Watching
            </h2>
          </div>
          <div className="poster-row">
            {continueWatching.map(item => (
              <MovieCard 
                key={item.id} 
                item={item} 
                progress={item.progress}
                onToggleBookmark={onToggleBookmark}
                isBookmarked={!!bookmarkMap[item.id]}
              />
            ))}
          </div>
        </div>
      )}

      {/* Trending Now */}
      <div className="section-container">
        <div className="section-header">
          <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <TrendingUp size={20} style={{ color: 'var(--accent-red)' }} /> Trending Now
          </h2>
        </div>
        {loading ? (
          <div className="poster-row">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ aspectRatio: '2/3', borderRadius: 'var(--radius-md)' }} />
            ))}
          </div>
        ) : (
          <div className="poster-row">
            {data.trending.map(item => (
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

      {/* Popular Movies */}
      <div className="section-container">
        <div className="section-header">
          <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Film size={20} style={{ color: 'var(--accent-red)' }} /> Popular Movies
          </h2>
        </div>
        {!loading && (
          <div className="poster-row">
            {data.popular.map(item => (
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

      {/* Recently Added & Curated Collection */}
      <div className="section-container">
        <div className="section-header">
          <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sparkles size={20} style={{ color: 'var(--accent-red)' }} /> Recently Added
          </h2>
        </div>
        {!loading && (
          <div className="poster-row">
            {data.recentlyAdded.map(item => (
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
    </div>
  );
}
