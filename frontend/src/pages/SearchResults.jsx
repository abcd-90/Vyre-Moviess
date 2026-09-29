import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Loader2, Film, Tv, Sparkles } from 'lucide-react';
import MovieCard from '../components/MovieCard';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function SearchResults({ bookmarkMap, onToggleBookmark }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const queryParams = new URLSearchParams(location.search);
  const initialQuery = queryParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    const qParam = new URLSearchParams(location.search).get('q') || '';
    setQuery(qParam);
    setSearchTerm(qParam);
  }, [location.search]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`${API_BASE}/api/search?q=${encodeURIComponent(searchTerm)}`)
      .then(res => res.json())
      .then(data => {
        // Deduplicate results by ID
        const rawResults = data.results || [];
        const seen = new Set();
        const unique = [];
        for (const item of rawResults) {
          if (item && item.id && !seen.has(item.id)) {
            seen.add(item.id);
            unique.push(item);
          }
        }
        setResults(unique);
        setLoading(false);
      })
      .catch(err => {
        console.error("Search results error:", err);
        setLoading(false);
      });
  }, [searchTerm]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const filteredResults = results.filter(item => {
    if (filterType === 'movie') return item.type === 'movie';
    if (filterType === 'series') return item.type === 'series' || item.type === 'anime';
    if (filterType === 'anime') return item.type === 'anime';
    return true;
  });

  return (
    <div className="section-container" style={{ paddingTop: '2.5rem', minHeight: '80vh' }}>
      {/* Search Header Form */}
      <div style={{ maxWidth: '700px', margin: '0 auto 2.5rem auto' }}>
        <form onSubmit={handleSearchSubmit} style={{ position: 'relative' }}>
          <Search size={22} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search movies, TV shows, anime, dramas..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '1rem 3.5rem 1rem 3.5rem',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--text-primary)',
              fontSize: '1.15rem',
              outline: 'none',
              boxShadow: 'var(--shadow-elevated)'
            }}
          />
          <button
            type="submit"
            className="btn-primary"
            style={{
              position: 'absolute',
              right: '0.4rem',
              top: '50%',
              transform: 'translateY(-50%)',
              padding: '0.6rem 1.2rem',
              fontSize: '0.9rem',
              borderRadius: 'var(--radius-md)'
            }}
          >
            Search
          </button>
        </form>
      </div>

      {/* Results Header & Filter Bar */}
      {searchTerm && (
        <div style={{ marginBottom: '2rem' }}>
          <div className="section-header">
            <h2 className="section-title">
              Search Results for "{searchTerm}"
            </h2>

            {results.length > 0 && (
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setFilterType('all')}
                  style={{
                    padding: '0.4rem 1rem',
                    borderRadius: 'var(--radius-full)',
                    background: filterType === 'all' ? 'var(--accent-red)' : 'var(--bg-elevated)',
                    border: `1px solid ${filterType === 'all' ? 'var(--accent-red)' : 'var(--border-color)'}`,
                    color: '#fff',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}
                >
                  All ({results.length})
                </button>
                <button
                  onClick={() => setFilterType('movie')}
                  style={{
                    padding: '0.4rem 1rem',
                    borderRadius: 'var(--radius-full)',
                    background: filterType === 'movie' ? 'var(--accent-red)' : 'var(--bg-elevated)',
                    border: `1px solid ${filterType === 'movie' ? 'var(--accent-red)' : 'var(--border-color)'}`,
                    color: '#fff',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}
                >
                  Movies ({results.filter(r => r.type === 'movie').length})
                </button>
                <button
                  onClick={() => setFilterType('series')}
                  style={{
                    padding: '0.4rem 1rem',
                    borderRadius: 'var(--radius-full)',
                    background: filterType === 'series' ? 'var(--accent-red)' : 'var(--bg-elevated)',
                    border: `1px solid ${filterType === 'series' ? 'var(--accent-red)' : 'var(--border-color)'}`,
                    color: '#fff',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}
                >
                  TV Shows & Dramas ({results.filter(r => r.type === 'series' || r.type === 'anime').length})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results Grid / Loading / Empty State */}
      {loading ? (
        <div className="poster-row">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ aspectRatio: '2/3', borderRadius: 'var(--radius-md)' }} />
          ))}
        </div>
      ) : filteredResults.length > 0 ? (
        <div className="poster-row">
          {filteredResults.map(item => (
            <MovieCard
              key={item.id}
              item={item}
              onToggleBookmark={onToggleBookmark}
              isBookmarked={!!bookmarkMap?.[item.id]}
            />
          ))}
        </div>
      ) : searchTerm ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
          <p style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            No titles found matching "{searchTerm}"
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Try checking spelling or searching for alternative names (e.g., "All of Us Are Dead", "Reacher", "Squid Game").
          </p>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
          <Sparkles size={40} style={{ color: 'var(--accent-red)', marginBottom: '1rem' }} />
          <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>Type a movie, TV show, or anime name above to search.</p>
        </div>
      )}
    </div>
  );
}
