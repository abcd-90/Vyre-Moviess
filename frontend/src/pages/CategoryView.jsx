import React, { useEffect, useState } from 'react';
import MovieCard from '../components/MovieCard';
import { Film, Tv, Filter, Calendar, Sparkles, X, Star } from 'lucide-react';

const GENRES = [
  'All Genres',
  'Action',
  'Comedy',
  'Drama',
  'Horror',
  'Sci-Fi',
  'Romance',
  'Thriller',
  'Animation',
  'Crime',
  'Adventure',
  'Fantasy',
  'Mystery'
];

const YEARS = [
  'All Years',
  '2026',
  '2025',
  '2024',
  '2023',
  '2022',
  '2021',
  '2020',
  '2019',
  '2018'
];

export default function CategoryView({ categoryKey, title, bookmarkMap, onToggleBookmark }) {
  const [baseItems, setBaseItems] = useState([]);
  const [displayItems, setDisplayItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedGenre, setSelectedGenre] = useState('All Genres');
  const [selectedYear, setSelectedYear] = useState('All Years');
  const [sortBy, setSortBy] = useState('popular');

  // Fetch catalog data for category
  useEffect(() => {
    setLoading(true);
    setSelectedGenre('All Genres');
    setSelectedYear('All Years');

    fetch(`/api/homepage?tab=${categoryKey}`)
      .then(res => res.json())
      .then(data => {
        const catalog = data.catalog || [];
        setBaseItems(catalog);
        setDisplayItems(catalog);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [categoryKey]);

  // Handle filter changes (Genre, Year, Search Query)
  useEffect(() => {
    let result = [...baseItems];

    // Filter by Genre
    if (selectedGenre !== 'All Genres') {
      result = result.filter(item => {
        if (!item) return false;
        const genres = item.genres || [];
        const titleText = (item.title || '').toLowerCase();
        const descText = (item.description || '').toLowerCase();
        const targetGenre = selectedGenre.toLowerCase();

        return genres.some(g => String(g).toLowerCase().includes(targetGenre)) ||
               titleText.includes(targetGenre) ||
               descText.includes(targetGenre);
      });
    }

    // Filter by Year
    if (selectedYear !== 'All Years') {
      result = result.filter(item => item && String(item.year) === String(selectedYear));
    }

    // Sort items
    if (sortBy === 'rating') {
      result.sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0));
    } else if (sortBy === 'year') {
      result.sort((a, b) => parseInt(b.year || 0, 10) - parseInt(a.year || 0, 10));
    }

    // If active filter yields few items, fetch matching search items from backend
    if ((selectedGenre !== 'All Genres' || selectedYear !== 'All Years') && result.length < 8) {
      const queryParts = [];
      if (selectedGenre !== 'All Genres') queryParts.push(selectedGenre);
      if (selectedYear !== 'All Years') queryParts.push(selectedYear);
      const searchKeyword = queryParts.join(' ');

      fetch(`/api/search?q=${encodeURIComponent(searchKeyword)}`)
        .then(r => r.json())
        .then(data => {
          const searchResults = data.results || [];
          const seen = new Set(result.map(i => i.id));
          const merged = [...result];

          for (const item of searchResults) {
            if (item && item.id && !seen.has(item.id)) {
              seen.add(item.id);
              merged.push(item);
            }
          }
          setDisplayItems(merged);
        })
        .catch(() => setDisplayItems(result));
    } else {
      setDisplayItems(result);
    }
  }, [selectedGenre, selectedYear, sortBy, baseItems]);

  const hasActiveFilters = selectedGenre !== 'All Genres' || selectedYear !== 'All Years';

  const resetFilters = () => {
    setSelectedGenre('All Genres');
    setSelectedYear('All Years');
    setSortBy('popular');
  };

  return (
    <div className="section-container" style={{ paddingTop: '2.5rem', minHeight: '85vh' }}>
      {/* Page Title & Filter Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div className="section-header" style={{ marginBottom: '1.25rem' }}>
          <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {categoryKey === 'series' ? <Tv size={24} style={{ color: 'var(--accent-red)' }} /> : <Film size={24} style={{ color: 'var(--accent-red)' }} />}
            {title} ({displayItems.length})
          </h2>

          {/* Quick Active Filter Badges */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.8rem',
                background: 'var(--accent-red-subtle)',
                border: '1px solid var(--accent-red)',
                borderRadius: 'var(--radius-full)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <X size={14} /> Clear Filters
            </button>
          )}
        </div>

        {/* Filter Controls Bar (Genre, Year, Sort) */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          background: 'var(--bg-surface)',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          {/* Genre Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} style={{ color: 'var(--accent-red)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Genre:</span>
            <select
              className="select-dropdown"
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              style={{ fontSize: '0.9rem', padding: '0.45rem 1rem' }}
            >
              {GENRES.map((g, i) => (
                <option key={i} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Release Year Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={16} style={{ color: 'var(--accent-red)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Year:</span>
            <select
              className="select-dropdown"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{ fontSize: '0.9rem', padding: '0.45rem 1rem' }}
            >
              {YEARS.map((y, i) => (
                <option key={i} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Sort By Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
            <Sparkles size={16} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Sort By:</span>
            <select
              className="select-dropdown"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ fontSize: '0.9rem', padding: '0.45rem 1rem' }}
            >
              <option value="popular">Popularity</option>
              <option value="rating">Highest Rating</option>
              <option value="year">Newest Release</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid Display */}
      {loading ? (
        <div className="poster-row">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ aspectRatio: '2/3', borderRadius: 'var(--radius-md)' }} />
          ))}
        </div>
      ) : displayItems.length > 0 ? (
        <div className="poster-row">
          {displayItems.map(item => (
            <MovieCard 
              key={item.id} 
              item={item} 
              onToggleBookmark={onToggleBookmark}
              isBookmarked={!!bookmarkMap[item.id]}
            />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
          <p style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            No titles match {selectedGenre !== 'All Genres' ? selectedGenre : ''} {selectedYear !== 'All Years' ? selectedYear : ''}
          </p>
          <button onClick={resetFilters} className="btn-secondary" style={{ marginTop: '1rem' }}>
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
