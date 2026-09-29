import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Star, Plus, Check, Globe, Calendar, Clock, Film, Tv, ChevronRight } from 'lucide-react';

export default function MovieDetails({ bookmarkMap, onToggleBookmark }) {
  const { id } = useParams();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedDub, setSelectedDub] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/details/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("Title details unavailable");
        return res.json();
      })
      .then(d => {
        setDetails(d);
        if (d.dubs && d.dubs.length > 0) {
          setSelectedDub(d.dubs[0]);
        }
        if (d.seasons && d.seasons.length > 0) {
          setSelectedSeason(d.seasons[0].number);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Details error:", err);
        setError("Unable to load details for this title.");
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="section-container" style={{ paddingTop: '3rem' }}>
        <div className="skeleton" style={{ height: '400px', width: '100%', borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="section-container" style={{ textAlign: 'center', paddingTop: '5rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--status-error)' }}>{error || "Title Not Found"}</h2>
        <Link to="/" className="btn-secondary">Return to Home</Link>
      </div>
    );
  }

  const isBookmarked = !!bookmarkMap[details.id];
  const activeSeasonData = details.seasons?.find(s => s.number === selectedSeason) || details.seasons?.[0];

  return (
    <div>
      {/* Editorial Header Banner */}
      <div style={{
        position: 'relative',
        minHeight: '480px',
        background: 'var(--bg-surface)',
        display: 'flex',
        alignItems: 'center',
        padding: '3rem 4rem',
        overflow: 'hidden'
      }}>
        {details.backdrop && (
          <img 
            src={details.backdrop} 
            alt={details.title}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.35,
              filter: 'brightness(0.7)'
            }}
          />
        )}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, var(--bg-main) 0%, rgba(8,10,13,0.85) 60%, transparent 100%)'
        }} />

        <div style={{
          position: 'relative',
          zIndex: 10,
          display: 'grid',
          gridTemplateColumns: '280px 1fr',
          gap: '3rem',
          alignItems: 'center',
          maxWidth: '1280px',
          width: '100%'
        }}>
          {/* Poster Image */}
          <div style={{
            aspectRatio: '2/3',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-elevated)',
            border: '1px solid var(--border-color)'
          }}>
            <img src={details.poster} alt={details.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          {/* Details Content */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.8rem' }}>
              <span style={{
                background: 'var(--accent-red)',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                textTransform: 'uppercase'
              }}>
                {details.type === 'series' ? 'TV Series' : 'Movie'}
              </span>

              {details.rating && (
                <span className="rating-tag" style={{ fontSize: '0.9rem' }}>
                  <Star size={14} fill="currentColor" /> {details.rating}
                </span>
              )}

              {details.year && (
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Calendar size={14} /> {details.year}
                </span>
              )}

              {details.duration && (
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Clock size={14} /> {details.duration}
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '2.8rem', fontWeight: 800, marginBottom: '0.5rem', lineHeight: 1.1 }}>{details.title}</h1>
            {details.tagline && <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '1rem', fontSize: '1rem' }}>"{details.tagline}"</p>}

            {/* Genres */}
            {details.genres.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {details.genres.map((g, idx) => (
                  <span key={idx} style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-color)',
                    padding: '0.25rem 0.75rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)'
                  }}>
                    {g}
                  </span>
                ))}
              </div>
            )}

            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '2rem', maxWidth: '750px' }}>
              {details.description}
            </p>

            {/* Audio Language Dub Selector */}
            {details.dubs && details.dubs.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                  <Globe size={16} /> Audio Languages
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {details.dubs.map((dub, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedDub(dub)}
                      style={{
                        padding: '0.4rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        background: selectedDub?.language === dub.language ? 'var(--accent-red-subtle)' : 'var(--bg-elevated)',
                        border: `1px solid ${selectedDub?.language === dub.language ? 'var(--accent-red)' : 'var(--border-color)'}`,
                        color: selectedDub?.language === dub.language ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontSize: '0.85rem',
                        fontWeight: 600
                      }}
                    >
                      {dub.language} ({dub.label})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link 
                to={`/watch/${selectedDub?.subjectId || details.id}${details.type === 'series' ? '?se=1&ep=1' : ''}`} 
                className="btn-primary"
              >
                <Play size={20} fill="currentColor" />
                <span>{details.type === 'series' ? 'Start Episode 1' : 'Watch Movie'}</span>
              </Link>

              <button className="btn-secondary" onClick={() => onToggleBookmark(details)}>
                {isBookmarked ? <Check size={18} style={{ color: 'var(--status-success)' }} /> : <Plus size={18} />}
                <span>{isBookmarked ? 'In My List' : 'Add to List'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TV Series Season & Episode Section */}
      {details.type === 'series' && details.seasons && details.seasons.length > 0 && (
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">Seasons & Episodes</h2>

            {/* Season Dropdown Selector */}
            <select
              className="select-dropdown"
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(parseInt(e.target.value, 10))}
              style={{ fontSize: '1rem', padding: '0.6rem 1.2rem' }}
            >
              {details.seasons.map(s => (
                <option key={s.number} value={s.number}>Season {s.number}</option>
              ))}
            </select>
          </div>

          {/* Episode Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {activeSeasonData?.episodes.map(ep => (
              <Link
                key={ep.number}
                to={`/watch/${selectedDub?.subjectId || details.id}?se=${ep.season}&ep=${ep.number}`}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                  transition: 'all 150ms'
                }}
                className="poster-card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent-red)' }}>EPISODE {ep.number}</span>
                  <Play size={16} style={{ color: 'var(--text-secondary)' }} />
                </div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{ep.title}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{ep.overview}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
