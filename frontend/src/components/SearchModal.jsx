import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Film, Tv, History, Loader2 } from 'lucide-react';
import MovieCard from './MovieCard';

export default function SearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [results, setResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState('all'); // all, movie, series

  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('vyre_recent_searches');
    if (saved) {
      try { setRecentSearches(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    }
  }, [isOpen]);

  // Debounced search logic
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const [resFetch, sugFetch] = await Promise.all([
          fetch(`/api/search?q=${encodeURIComponent(query)}`),
          fetch(`/api/suggest?q=${encodeURIComponent(query)}`)
        ]);

        const resData = await resFetch.json();
        const sugData = await sugFetch.json();

        const rawResults = resData.results || [];
        const seen = new Set();
        const unique = [];
        for (const item of rawResults) {
          if (item && item.id && !seen.has(item.id)) {
            seen.add(item.id);
            unique.push(item);
          }
        }
        setResults(unique);
        setSuggestions(sugData.suggestions || []);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectQuery = (q) => {
    setQuery(q);
    saveRecentSearch(q);
  };

  const saveRecentSearch = (q) => {
    if (!q.trim()) return;
    const updated = [q, ...recentSearches.filter(s => s.toLowerCase() !== q.toLowerCase())].slice(0, 6);
    setRecentSearches(updated);
    localStorage.setItem('vyre_recent_searches', JSON.stringify(updated));
  };

  const filteredResults = results.filter(item => {
    if (filterType === 'movie') return item.type === 'movie';
    if (filterType === 'series') return item.type === 'series' || item.type === 'anime';
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ alignItems: 'flex-start', paddingTop: '4rem' }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '900px', width: '92%', maxHeight: '85vh', overflowY: 'auto' }}
      >
        {/* Search Header Input Form */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) {
              saveRecentSearch(query.trim());
              navigate(`/search?q=${encodeURIComponent(query.trim())}`);
              onClose();
            }
          }}
          style={{ position: 'relative', marginBottom: '1.5rem' }}
        >
          <Search size={22} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search movies, TV shows, anime, dramas..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '1rem 3rem 1rem 3.2rem',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '1.1rem',
              outline: 'none'
            }}
          />
          {isLoading ? (
            <Loader2 size={20} className="spin" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-red)' }} />
          ) : query ? (
            <button type="button" onClick={() => setQuery('')} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
              <X size={20} />
            </button>
          ) : null}
        </form>

        {/* Filter Pills */}
        {results.length > 0 && (
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <button 
              onClick={() => setFilterType('all')}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: 'var(--radius-full)',
                background: filterType === 'all' ? 'var(--accent-red)' : 'var(--bg-elevated)',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 600
              }}
            >
              All Results ({results.length})
            </button>
            <button 
              onClick={() => setFilterType('movie')}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: 'var(--radius-full)',
                background: filterType === 'movie' ? 'var(--accent-red)' : 'var(--bg-elevated)',
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
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 600
              }}
            >
              TV Shows ({results.filter(r => r.type === 'series').length})
            </button>
          </div>
        )}

        {/* Recent Searches */}
        {!query && recentSearches.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              <History size={16} /> Recent Searches
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {recentSearches.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectQuery(s)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)'
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results Grid */}
        {filteredResults.length > 0 ? (
          <div className="poster-row">
            {filteredResults.map(item => (
              <div key={item.id} onClick={onClose}>
                <MovieCard item={item} />
              </div>
            ))}
          </div>
        ) : query && !isLoading ? (
          <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>No titles found for "{query}"</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              Try searching for alternative keywords or check spelling.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
