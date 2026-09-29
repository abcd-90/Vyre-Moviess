import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Search, Globe, Settings, Bookmark, History, Film } from 'lucide-react';

export default function Navbar({ onOpenSearch, onOpenLanguage, onOpenProfile, currentProfile, userLang = 'English' }) {
  return (
    <header className="header-navbar">
      <Link to="/" className="brand-logo">
        <div className="brand-badge">V</div>
        <span>VYRE</span>
      </Link>

      <ul className="nav-links">
        <li>
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            Home
          </NavLink>
        </li>
        <li>
          <NavLink to="/movies" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            Movies
          </NavLink>
        </li>
        <li>
          <NavLink to="/series" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            TV Shows
          </NavLink>
        </li>
        <li>
          <NavLink to="/anime" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            Anime
          </NavLink>
        </li>
        <li>
          <NavLink to="/my-list" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Bookmark size={16} />
            My List
          </NavLink>
        </li>
        <li>
          <NavLink to="/history" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <History size={16} />
            History
          </NavLink>
        </li>
      </ul>

      <div className="nav-actions">
        <button className="search-button-trigger" onClick={onOpenSearch}>
          <Search size={16} />
          <span>Search movies & series...</span>
        </button>

        <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={onOpenLanguage}>
          <Globe size={16} />
          <span>{userLang}</span>
        </button>

        <button
          className="btn-secondary"
          onClick={onOpenProfile}
          style={{ padding: '0.2rem 0.5rem', borderRadius: '20px', gap: '0.4rem', border: '1px solid #3f3f46' }}
          title="Switch Profile"
        >
          <img
            src={currentProfile?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
            alt="Profile"
            style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
          />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>{currentProfile?.name?.split(' ')[0] || 'Profile'}</span>
        </button>

        <Link to="/settings" className="btn-secondary" style={{ padding: '0.4rem 0.6rem' }} title="Settings">
          <Settings size={18} />
        </Link>
      </div>
    </header>
  );
}
