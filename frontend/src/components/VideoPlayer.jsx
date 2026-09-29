import React, { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';
import dashjs from 'dashjs';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, 
  Settings, Subtitles, SkipForward, SkipBack, PictureInPicture, Download 
} from 'lucide-react';

export default function VideoPlayer({ 
  streamUrl, 
  qualities = [], 
  selectedQuality, 
  onQualityChange,
  subtitles = [], 
  selectedSub, 
  onSubChange,
  onEnded,
  onNextEpisode,
  onPrevEpisode,
  hasPrev = false,
  hasNext = false,
  title = "",
  episodeTitle = "",
  totalDuration = 0
}) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const dashRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [seekOffset, setSeekOffset] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const controlsTimeoutRef = useRef(null);

  // Initialize HLS / DASH / Native Video Player
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    setIsLoading(true);
    setError(null);

    // Clean up previous player instances
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (dashRef.current) {
      dashRef.current.reset();
      dashRef.current = null;
    }

    const isHls = streamUrl.includes('.m3u8');
    const isDash = streamUrl.startsWith('/api/proxy') && streamUrl.includes('.mpd');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 30,
        enableWorker: true,
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        video.play().catch(() => setIsPlaying(false));
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setError("Re-connecting stream...");
          hls.startLoad();
        }
      });
      hlsRef.current = hls;
    } else if (isDash) {
      try {
        const player = dashjs.MediaPlayer().create();
        player.updateSettings({
          'streaming': {
            'buffer': {
              'fastSwitchEnabled': true,
              'bufferTimeAtTopQuality': 30
            }
          }
        });
        player.initialize(video, streamUrl, true);
        player.on(dashjs.MediaPlayer.events.CAN_PLAY, () => {
          setIsLoading(false);
          video.play().catch(() => setIsPlaying(false));
        });
        player.on(dashjs.MediaPlayer.events.ERROR, (e) => {
          console.error("DASH error:", e);
          setIsLoading(false);
        });
        dashRef.current = player;
      } catch (e) {
        console.error("DASH setup error:", e);
        setIsLoading(false);
      }
    } else {
      video.src = streamUrl;
      video.load();
      video.play().then(() => {
        setIsLoading(false);
        setIsPlaying(true);
      }).catch(() => {
        setIsLoading(false);
        setIsPlaying(false);
      });
    }

    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
      if (dashRef.current) dashRef.current.reset();
    };
  }, [streamUrl]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };
    const handlePlay = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };
    const handlePause = () => setIsPlaying(false);
    const handleEndedEvent = () => {
      setIsPlaying(false);
      if (onEnded) onEnded();
    };
    const handleError = () => {
      setIsLoading(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEndedEvent);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEndedEvent);
      video.removeEventListener('error', handleError);
    };
  }, [onEnded]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  };

  const displayCurrentTime = seekOffset + currentTime;

  const effectiveDuration = (totalDuration && totalDuration > 0)
    ? totalDuration
    : (duration && isFinite(duration) && duration > 10
      ? duration
      : Math.max(duration || 0, displayCurrentTime || 0));

  const handleSeek = (e) => {
    const video = videoRef.current;
    if (!video || !effectiveDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = Math.floor(pos * effectiveDuration);

    if (streamUrl && streamUrl.includes('/api/transcode-stream')) {
      const baseStreamUrl = streamUrl.split('&ss=')[0];
      const newStreamUrl = `${baseStreamUrl}&ss=${targetTime}`;
      setSeekOffset(targetTime);
      setCurrentTime(0);
      video.src = newStreamUrl;
      video.load();
      video.play().catch(() => {});
    } else {
      setSeekOffset(0);
      video.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    const video = videoRef.current;
    if (!video) return;
    video.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.volume = volume || 1;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const handleSpeedChange = (rate) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const toggleFullscreen = () => {
    const wrapper = videoRef.current?.parentElement;
    if (!wrapper) return;
    if (!document.fullscreenElement) {
      wrapper.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else if (document.pictureInPictureEnabled) {
      await video.requestPictureInPicture();
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs === null || secs === undefined) return "00:00";
    const totalSecs = Math.max(0, Math.floor(secs));
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = Math.floor(totalSecs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3500);
  };

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [videoFit, setVideoFit] = useState('contain'); // contain, cover, fill

  return (
    <div 
      className="player-wrapper"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (isPlaying) setShowControls(false);
        setIsSettingsOpen(false);
      }}
    >
      <video
        ref={videoRef}
        className="video-element"
        onClick={togglePlay}
        playsInline
        style={{ objectFit: videoFit, width: '100%', height: '100%' }}
      >
        {subtitles.map((sub, idx) => (
          <track
            key={idx}
            kind="subtitles"
            src={sub.url}
            srcLang={sub.name.toLowerCase().substring(0, 2)}
            label={sub.name}
            default={selectedSub === sub.name}
          />
        ))}
      </video>

      {/* Loading Overlay */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          zIndex: 20
        }}>
          <div className="skeleton" style={{ width: '48px', height: '48px', borderRadius: '50%' }}></div>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Connecting High Speed Stream...</span>
        </div>
      )}

      {/* Error Message Banner */}
      {error && (
        <div style={{
          position: 'absolute',
          top: '1.5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(240, 68, 56, 0.95)',
          color: '#fff',
          padding: '0.6rem 1.2rem',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.9rem',
          fontWeight: 600,
          zIndex: 30
        }}>
          {error}
        </div>
      )}

      {/* Interactive Settings Popover */}
      {isSettingsOpen && (
        <div 
          className="player-settings-popover"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: '4.5rem',
            right: '1.5rem',
            background: 'rgba(12, 16, 22, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            width: '290px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.85)',
            zIndex: 60,
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={18} style={{ color: 'var(--accent-red)' }} /> Player Settings
            </span>
            <button 
              onClick={() => setIsSettingsOpen(false)}
              style={{ color: 'var(--text-muted)', fontSize: '0.9rem', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          {/* Video Quality Option */}
          {qualities.length > 0 && (
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>
                Video Quality / Resolution
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {qualities.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => { onQualityChange(q); setIsSettingsOpen(false); }}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      background: selectedQuality === q ? 'var(--accent-red)' : 'var(--bg-elevated)',
                      border: `1px solid ${selectedQuality === q ? 'var(--accent-red)' : 'var(--border-color)'}`,
                      color: '#fff',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Playback Speed Option */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>
              Playback Speed
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => { handleSpeedChange(rate); setIsSettingsOpen(false); }}
                  style={{
                    padding: '0.35rem 0.6rem',
                    borderRadius: 'var(--radius-md)',
                    background: playbackRate === rate ? 'var(--accent-red)' : 'var(--bg-elevated)',
                    border: `1px solid ${playbackRate === rate ? 'var(--accent-red)' : 'var(--border-color)'}`,
                    color: '#fff',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {rate === 1 ? 'Normal' : `${rate}x`}
                </button>
              ))}
            </div>
          </div>

          {/* Subtitles Option */}
          {subtitles.length > 0 && (
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>
                Subtitles
              </label>
              <select
                className="select-dropdown"
                value={selectedSub || "off"}
                onChange={(e) => { onSubChange(e.target.value); setIsSettingsOpen(false); }}
                style={{ width: '100%', fontSize: '0.85rem' }}
              >
                <option value="off">Subtitles Off</option>
                {subtitles.map((sub, idx) => (
                  <option key={idx} value={sub.name}>{sub.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Aspect Ratio / Fit Option */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>
              Aspect Ratio / View Mode
            </label>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {[
                { label: 'Fit', value: 'contain' },
                { label: 'Zoom/Crop', value: 'cover' },
                { label: 'Stretch', value: 'fill' }
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setVideoFit(opt.value); setIsSettingsOpen(false); }}
                  style={{
                    flex: 1,
                    padding: '0.35rem 0.5rem',
                    borderRadius: 'var(--radius-md)',
                    background: videoFit === opt.value ? 'var(--accent-red)' : 'var(--bg-elevated)',
                    border: `1px solid ${videoFit === opt.value ? 'var(--accent-red)' : 'var(--border-color)'}`,
                    color: '#fff',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Custom Player Controls */}
      <div className={`player-controls-overlay ${showControls ? 'active' : ''}`}>
        {/* Title Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{title}</h3>
            {episodeTitle && <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{episodeTitle}</span>}
          </div>
        </div>

        {/* Progress / Seek Bar */}
        <div className="seek-bar-container" onClick={handleSeek}>
          <div 
            className="seek-bar-fill" 
            style={{ width: `${Math.min(100, Math.max(0, (displayCurrentTime / (effectiveDuration || 1)) * 100))}%` }} 
          />
        </div>

        {/* Bottom Control Bar */}
        <div className="player-controls-row">
          {/* Left Controls: Play/Pause, Skip, Time, Volume */}
          <div className="controls-group">
            {hasPrev && (
              <button className="control-btn" onClick={onPrevEpisode} title="Previous Episode">
                <SkipBack size={20} />
              </button>
            )}
            <button className="control-btn" onClick={togglePlay} title={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
            {hasNext && (
              <button className="control-btn" onClick={onNextEpisode} title="Next Episode">
                <SkipForward size={20} />
              </button>
            )}

            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
              {formatTime(displayCurrentTime)} / {formatTime(effectiveDuration)}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button className="control-btn" onClick={toggleMute}>
                {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                style={{ width: '70px', accentColor: 'var(--accent-red)' }}
              />
            </div>
          </div>

          {/* Right Controls: Quality, Subtitles, Speed, Settings, PiP, Fullscreen */}
          <div className="controls-group">
            {/* Quick Quality Dropdown */}
            {qualities.length > 0 && (
              <select 
                className="select-dropdown"
                value={selectedQuality}
                onChange={(e) => onQualityChange(e.target.value)}
              >
                {qualities.map((q, i) => (
                  <option key={i} value={q}>{q}</option>
                ))}
              </select>
            )}

            {/* Quick Subtitle Dropdown */}
            {subtitles.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Subtitles size={16} style={{ color: 'var(--text-secondary)' }} />
                <select
                  className="select-dropdown"
                  value={selectedSub || "off"}
                  onChange={(e) => onSubChange(e.target.value)}
                >
                  <option value="off">Subtitles Off</option>
                  {subtitles.map((sub, idx) => (
                    <option key={idx} value={sub.name}>{sub.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Quick Speed Dropdown */}
            <select
              className="select-dropdown"
              value={playbackRate}
              onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
            >
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1.0x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2.0x</option>
            </select>

            {/* Settings Gear Button (Click opens settings popover) */}
            <button 
              className={`control-btn ${isSettingsOpen ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setIsSettingsOpen(!isSettingsOpen);
              }}
              title="Player Settings"
              style={{ color: isSettingsOpen ? 'var(--accent-red)' : 'inherit' }}
            >
              <Settings size={20} />
            </button>

            {/* Direct File Download Button */}
            <button
              className="control-btn"
              onClick={() => {
                const downloadUrl = `/api/download-file?url=${encodeURIComponent(streamUrl)}&title=${encodeURIComponent(title || 'Video')}`;
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = `${title || 'video'}.mp4`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}
              title="Download Real MP4 Video File"
            >
              <Download size={20} />
            </button>

            <button className="control-btn" onClick={togglePiP} title="Picture in Picture">
              <PictureInPicture size={18} />
            </button>

            <button className="control-btn" onClick={toggleFullscreen} title="Fullscreen">
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
