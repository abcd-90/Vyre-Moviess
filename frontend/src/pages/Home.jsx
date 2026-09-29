import React, { useEffect, useState } from 'react';
import Hero from '../components/Hero';
import MovieCard from '../components/MovieCard';
import { Play, TrendingUp, Sparkles, Tv, Film } from 'lucide-react';
import { FALLBACK_HOMEPAGE_DATA } from '../data/fallbackData';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function Home({ bookmarkMap, onToggleBookmark, continueWatching = [] }) {
  const [data, setData] = useState(FALLBACK_HOMEPAGE_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/homepage`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load homepage stream");
        return res.json();
      })
      .then(d => {
        if (d && ( (d.trending && d.trending.length > 0) || (d.catalog && d.catalog.length > 0) )) {
          setData(d);
        } else {
          setData(FALLBACK_HOMEPAGE_DATA);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Homepage API error, using client fallback:", err);
        setData(FALLBACK_HOMEPAGE_DATA);
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
