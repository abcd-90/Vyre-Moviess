import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import LanguageModal from './components/LanguageModal';
import SearchModal from './components/SearchModal';
import ProfileModal, { getActiveProfile } from './components/ProfileModal';
import TrailerModal from './components/TrailerModal';

import Home from './pages/Home';
import MovieDetails from './pages/MovieDetails';
import Watch from './pages/Watch';
import CategoryView from './pages/CategoryView';
import SearchResults from './pages/SearchResults';
import MyList from './pages/MyList';
import History from './pages/History';
import Settings from './pages/Settings';

export default function App() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentProfile, setCurrentProfile] = useState(getActiveProfile());
  const [trailerItem, setTrailerItem] = useState(null);

  const [userLang, setUserLang] = useState('English');
  const [bookmarks, setBookmarks] = useState([]);
  const [history, setHistory] = useState([]);

  // Load local state
  useEffect(() => {
    const savedLang = localStorage.getItem('vyre_user_lang');
    if (savedLang) {
      setUserLang(savedLang);
    } else {
      // First visit onboarding language popup
      setIsLangOpen(true);
    }

    const savedBM = localStorage.getItem('vyre_bookmarks');
    if (savedBM) {
      try { setBookmarks(JSON.parse(savedBM)); } catch (e) {}
    }

    const savedHist = localStorage.getItem('vyre_history');
    if (savedHist) {
      try { setHistory(JSON.parse(savedHist)); } catch (e) {}
    }
  }, []);

  const handleSelectLang = (lang) => {
    setUserLang(lang);
    localStorage.setItem('vyre_user_lang', lang);
  };

  const handleToggleBookmark = (item) => {
    if (!item || !item.id) return;
    const exists = bookmarks.some(b => b.id === item.id);
    let updated;
    if (exists) {
      updated = bookmarks.filter(b => b.id !== item.id);
    } else {
      updated = [item, ...bookmarks];
    }
    setBookmarks(updated);
    localStorage.setItem('vyre_bookmarks', JSON.stringify(updated));
  };

  const handleUpdateHistory = (item) => {
    if (!item || !item.id) return;
    const filtered = history.filter(h => h.id !== item.id);
    const updated = [item, ...filtered].slice(0, 30);
    setHistory(updated);
    localStorage.setItem('vyre_history', JSON.stringify(updated));
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('vyre_history');
  };

  const handleClearAllData = () => {
    setBookmarks([]);
    setHistory([]);
    localStorage.clear();
    alert("All local data has been reset.");
  };

  const bookmarkMap = bookmarks.reduce((acc, item) => {
    acc[item.id] = true;
    return acc;
  }, {});

  return (
    <div className="app-container">
      <Navbar 
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenLanguage={() => setIsLangOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        currentProfile={currentProfile}
        userLang={userLang}
      />

      <main className="main-content">
        <Routes>
          <Route 
            path="/" 
            element={
              <Home 
                bookmarkMap={bookmarkMap} 
                onToggleBookmark={handleToggleBookmark}
                continueWatching={history.slice(0, 6)}
                onOpenTrailer={(item) => setTrailerItem(item)}
              />
            } 
          />
          <Route 
            path="/movies" 
            element={
              <CategoryView 
                categoryKey="movies" 
                title="Browse Movies" 
                bookmarkMap={bookmarkMap} 
                onToggleBookmark={handleToggleBookmark} 
              />
            } 
          />
          <Route 
            path="/series" 
            element={
              <CategoryView 
                categoryKey="series" 
                title="Browse TV Series" 
                bookmarkMap={bookmarkMap} 
                onToggleBookmark={handleToggleBookmark} 
              />
            } 
          />
          <Route 
            path="/anime" 
            element={
              <CategoryView 
                categoryKey="anime" 
                title="Browse Anime" 
                bookmarkMap={bookmarkMap} 
                onToggleBookmark={handleToggleBookmark} 
              />
            } 
          />
          <Route 
            path="/drama" 
            element={
              <CategoryView 
                categoryKey="drama" 
                title="Browse K-Dramas & Asian Shows" 
                bookmarkMap={bookmarkMap} 
                onToggleBookmark={handleToggleBookmark} 
              />
            } 
          />
          <Route 
            path="/search" 
            element={
              <SearchResults 
                bookmarkMap={bookmarkMap} 
                onToggleBookmark={handleToggleBookmark} 
              />
            } 
          />
          <Route 
            path="/title/:id" 
            element={
              <MovieDetails 
                bookmarkMap={bookmarkMap} 
                onToggleBookmark={handleToggleBookmark} 
              />
            } 
          />
          <Route 
            path="/watch/:id" 
            element={
              <Watch 
                onUpdateHistory={handleUpdateHistory} 
              />
            } 
          />
          <Route 
            path="/my-list" 
            element={
              <MyList 
                bookmarks={bookmarks} 
                onToggleBookmark={handleToggleBookmark} 
              />
            } 
          />
          <Route 
            path="/history" 
            element={
              <History 
                history={history} 
                onClearHistory={handleClearHistory}
                onToggleBookmark={handleToggleBookmark}
                bookmarkMap={bookmarkMap}
              />
            } 
          />
          <Route 
            path="/settings" 
            element={
              <Settings 
                userLang={userLang} 
                onSelectLang={handleSelectLang}
                onClearAllData={handleClearAllData}
              />
            } 
          />
        </Routes>
      </main>

      <LanguageModal 
        isOpen={isLangOpen}
        onClose={() => setIsLangOpen(false)}
        currentLang={userLang}
        onSelectLang={handleSelectLang}
      />

      <SearchModal 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentProfile={currentProfile}
        onSelectProfile={(p) => setCurrentProfile(p)}
      />

      <TrailerModal
        isOpen={!!trailerItem}
        onClose={() => setTrailerItem(null)}
        title={trailerItem?.title}
        mediaId={trailerItem?.id}
      />
    </div>
  );
}
