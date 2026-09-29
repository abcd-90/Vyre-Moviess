import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';
import MovieCard from '../components/MovieCard';
import WatchPartyModal from '../components/WatchPartyModal';
import TrailerModal from '../components/TrailerModal';
import { ChevronLeft, ListVideo, Info, AlertTriangle, Users, Sparkles, Star, Calendar, Clock, Globe, Download, Film } from 'lucide-react';

export default function Watch({ onUpdateHistory }) {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const season = searchParams.get('se') || '0';
  const episode = searchParams.get('ep') || '0';

  const [details, setDetails] = useState(null);
  const [streams, setStreams] = useState([]);
  const [subtitles, setSubtitles] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState('1080p');
  const [selectedSub, setSelectedSub] = useState('off');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPartyOpen, setIsPartyOpen] = useState(false);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [downloadMsg, setDownloadMsg] = useState(null);

  // Fetch title details and stream links
  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/details/${id}`).then(r => r.json()),
      fetch(`/api/streams?id=${id}&season=${season}&episode=${episode}`).then(r => r.json()),
      fetch(`/api/subtitles?id=${id}`).then(r => r.json())
    ])
    .then(([det, stData, subData]) => {
      setDetails(det);
      setStreams(stData.streams || []);
      setSubtitles(subData.subtitles || []);

      if (stData.streams && stData.streams.length > 0) {
        const availableQualities = stData.streams[0].qualities || [];
        if (availableQualities.length > 0) {
          setSelectedQuality(availableQualities[0]);
        }
      }

      // Record in watch history
      if (det && onUpdateHistory) {
        onUpdateHistory({
          id: det.id,
          title: det.title,
          poster: det.poster,
          type: det.type,
          season: parseInt(season, 10),
          episode: parseInt(episode, 10),
          progress: 5
        });
      }

      setLoading(false);
    })
    .catch(err => {
      console.error("Watch fetch error:", err);
      setError("Unable to resolve playback source for this stream.");
      setLoading(false);
    });
  }, [id, season, episode]);

  const activeStream = streams.find(s => s.qualities.includes(selectedQuality)) || streams[0];
  const streamUrl = activeStream ? activeStream.url : null;
  const qualities = activeStream ? activeStream.qualities : ['1080p', '720p', '480p'];

  const handleNextEpisode = () => {
    const nextEp = parseInt(episode, 10) + 1;
    setSearchParams({ se: season, ep: String(nextEp) });
  };

  const handlePrevEpisode = () => {
    const prevEp = Math.max(1, parseInt(episode, 10) - 1);
    setSearchParams({ se: season, ep: String(prevEp) });
  };

  const handleDownload = () => {
    if (!streamUrl) return;
    setDownloadMsg("Downloading video file to your Downloads folder...");
    const downloadUrl = `/api/download-file?url=${encodeURIComponent(streamUrl)}&title=${encodeURIComponent(details?.title || 'Video')}&season=${season}&episode=${episode}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${details?.title || 'video'}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setDownloadMsg(null), 4000);
  };

  if (loading) {
    return (
      <div className="section-container" style={{ paddingTop: '2rem' }}>
        <div className="skeleton" style={{ aspectRatio: '16/9', width: '100%', borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem 2rem' }}>
      {/* Top Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to={`/title/${id}`} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
            <ChevronLeft size={18} /> Back to Details
          </Link>
          <span style={{ color: 'var(--text-muted)' }}>|</span>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {details?.title} {season !== '0' && episode !== '0' ? `(S${season} E${episode})` : ''}
          </h2>
        </div>

        {/* Heavy Action Bar Buttons: Watch Party, Trailer, Download */}
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <button className="btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', gap: '0.4rem' }} onClick={() => setIsPartyOpen(true)}>
            <Users size={16} style={{ color: '#e50914' }} />
            <span>Watch Party</span>
          </button>

          <button className="btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', gap: '0.4rem' }} onClick={() => setIsTrailerOpen(true)}>
            <Film size={16} style={{ color: '#e50914' }} />
            <span>Trailer</span>
          </button>

          <button className="btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', gap: '0.4rem' }} onClick={handleDownload}>
            <Download size={16} />
            <span>Offline</span>
          </button>
        </div>
      </div>

      {downloadMsg && (
        <div style={{ background: '#10b981', color: '#fff', padding: '0.6rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
          {downloadMsg}
        </div>
      )}

      {/* Main Watch Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: details?.type === 'series' ? '1fr 340px' : '1fr', gap: '2rem', marginBottom: '3rem' }}>
        {/* Video Player Column */}
        <div>
          {streamUrl ? (
            <VideoPlayer
              streamUrl={streamUrl}
              qualities={qualities}
              selectedQuality={selectedQuality}
              onQualityChange={setSelectedQuality}
              subtitles={subtitles}
              selectedSub={selectedSub}
              onSubChange={setSelectedSub}
              onNextEpisode={handleNextEpisode}
              onPrevEpisode={handlePrevEpisode}
              hasNext={parseInt(episode, 10) > 0}
              hasPrev={parseInt(episode, 10) > 1}
              title={details?.title}
              episodeTitle={season !== '0' ? `Season ${season} Episode ${episode}` : ''}
              totalDuration={activeStream?.durationSeconds || details?.durationSeconds}
            />
          ) : (
            <div style={{
              aspectRatio: '16/9',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem',
              textAlign: 'center',
              border: '1px solid var(--border-color)'
            }}>
              <AlertTriangle size={48} style={{ color: 'var(--status-warning)', marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Playback Source Unavailable</h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', fontSize: '0.95rem' }}>
                The provider is currently resolving new stream mirrors for this title. Please try another quality or check back shortly.
              </p>
            </div>
          )}

          {/* Detailed Movie/Series Overview Section */}
          <div style={{ marginTop: '1.5rem', background: 'var(--bg-surface)', padding: '1.75rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
              <span style={{
                background: 'var(--accent-red)',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                textTransform: 'uppercase'
              }}>
                {details?.type === 'series' ? 'TV Series' : 'Movie'}
              </span>

              {details?.rating && (
                <span className="rating-tag" style={{ fontSize: '0.85rem' }}>
                  <Star size={14} fill="currentColor" /> {details.rating}
                </span>
              )}

              {details?.year && (
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Calendar size={14} /> {details.year}
                </span>
              )}

              {details?.duration && (
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Clock size={14} /> {details.duration}
                </span>
              )}
            </div>

            <h3 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.6rem' }}>{details?.title}</h3>
            {details?.tagline && <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '0.8rem', fontSize: '0.95rem' }}>"{details.tagline}"</p>}

            {/* Genres Pills */}
            {details?.genres && details.genres.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                {details.genres.map((g, idx) => (
                  <span key={idx} style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-color)',
                    padding: '0.2rem 0.65rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)'
                  }}>
                    {g}
                  </span>
                ))}
              </div>
            )}

            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              {details?.description}
            </p>

            {/* Audio Languages Dub Badges */}
            {details?.dubs && details.dubs.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <Globe size={16} style={{ color: 'var(--accent-red)' }} />
                <span>Available Audio Languages:</span>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {details.dubs.map((d, i) => (
                    <span key={i} style={{ background: 'var(--bg-elevated)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                      {d.language}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Top Cast & Stars Section (Actor Avatars with Real Names) */}
          {details?.cast && details.cast.length > 0 && (
            <div style={{ marginTop: '2rem', background: 'var(--bg-surface)', padding: '1.75rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                <Users size={20} style={{ color: 'var(--accent-red)' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Top Cast & Actors</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1.25rem' }}>
                {details.cast.map((actor, idx) => (
                  <div key={idx} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      marginBottom: '0.6rem',
                      border: '2px solid var(--border-color)',
                      boxShadow: 'var(--shadow-sm)'
                    }}>
                      <img 
                        src={actor.avatar} 
                        alt={actor.name} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    </div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, display: 'block' }}>
                      {actor.name}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                      {actor.character}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* TV Series Season & Episode Sidebar */}
        {details?.type === 'series' && details?.seasons && details.seasons.length > 0 && (
          <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <ListVideo size={20} style={{ color: 'var(--accent-red)' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Episodes</h3>
              </div>

              {/* Season Selector Dropdown */}
              <select
                className="select-dropdown"
                value={season}
                onChange={(e) => setSearchParams({ se: e.target.value, ep: '1' })}
                style={{ width: '100%', fontSize: '0.95rem', padding: '0.5rem 0.8rem' }}
              >
                {details.seasons.map(s => (
                  <option key={s.number} value={String(s.number)}>Season {s.number}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '550px', overflowY: 'auto' }}>
              {(details.seasons.find(s => String(s.number) === season) || details.seasons[0])?.episodes.map(ep => {
                const isActive = String(ep.number) === episode;
                return (
                  <button
                    key={ep.number}
                    onClick={() => setSearchParams({ se: season === '0' ? String(details.seasons[0].number) : season, ep: String(ep.number) })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      background: isActive ? 'var(--accent-red-subtle)' : 'var(--bg-elevated)',
                      border: `1px solid ${isActive ? 'var(--accent-red)' : 'var(--border-color)'}`,
                      borderRadius: 'var(--radius-md)',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: isActive ? 700 : 500,
                      textAlign: 'left'
                    }}
                  >
                    <span>Episode {ep.number}</span>
                    {isActive && <span style={{ fontSize: '0.75rem', background: 'var(--accent-red)', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>PLAYING</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Recommended Titles Section ("More Like This") */}
      {details?.related && details.related.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <div className="section-header" style={{ marginBottom: '1.25rem' }}>
            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Sparkles size={22} style={{ color: 'var(--accent-red)' }} /> More Like This
            </h2>
          </div>
          <div className="poster-row">
            {details.related.map(relItem => (
              <MovieCard
                key={relItem.id}
                item={relItem}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modals for Watch Party & Trailer */}
      <WatchPartyModal
        isOpen={isPartyOpen}
        onClose={() => setIsPartyOpen(false)}
        mediaId={id}
        mediaTitle={details?.title}
        poster={details?.poster}
        season={season}
        episode={episode}
      />

      <TrailerModal
        isOpen={isTrailerOpen}
        onClose={() => setIsTrailerOpen(false)}
        title={details?.title}
        mediaId={id}
      />
    </div>
  );
}

