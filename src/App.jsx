import React, { useState, useEffect } from 'react';
import { Compass, Settings, Check, HelpCircle, X, MapPin, Heart } from 'lucide-react';
import StationsList from './components/StationsList';
import RoutePlanner from './components/RoutePlanner';
import FavoritesView from './components/FavoritesView';

function App() {
  const [activeTab, setActiveTab] = useState('nearMe'); // 'nearMe', 'route', 'favorites'
  
  // Theme and Map Style State
  const [theme, setTheme] = useState(() => localStorage.getItem('chargeflow_theme') || 'dark');
  const [mapStyle, setMapStyle] = useState(() => localStorage.getItem('chargeflow_mapstyle') || 'standard');

  useEffect(() => {
    localStorage.setItem('chargeflow_theme', theme);
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('chargeflow_mapstyle', mapStyle);
  }, [mapStyle]);

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [ocmApiKey, setOcmApiKey] = useState(() => {
    return localStorage.getItem('ocm_api_key') || '';
  });

  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('chargeflow_favorites');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migration: if stations is an array of strings, clear it or ignore strings later.
      return parsed;
    }
    return { stations: [], providers: [] };
  });

  useEffect(() => {
    localStorage.setItem('chargeflow_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleStationFavorite = (station) => {
    // station can be string ID (legacy) or an object
    const isObject = typeof station === 'object';
    const id = isObject ? station.id : station;

    setFavorites(prev => {
      const isFav = prev.stations.some(s => {
        if (typeof s === 'string') return s === id;
        return s.id === id;
      });

      if (isFav) {
        return {
          ...prev,
          stations: prev.stations.filter(s => {
            if (typeof s === 'string') return s !== id;
            return s.id !== id;
          })
        };
      } else {
        // Save the full object if possible, otherwise save id
        return {
          ...prev,
          stations: [...prev.stations, isObject ? station : id]
        };
      }
    });
  };

  const toggleProviderFavorite = (provider) => {
    setFavorites(prev => {
      if (prev.providers.includes(provider)) {
        return { ...prev, providers: prev.providers.filter(p => p !== provider) };
      }
      return { ...prev, providers: [...prev.providers, provider] };
    });
  };

  const handleSaveSettings = () => {
    setOcmApiKey(apiKeyInput);
    localStorage.setItem('ocm_api_key', apiKeyInput);
    setShowSettings(false);
  };

  const renderContent = () => {
    return (
      <>
        <div style={{ display: activeTab === 'nearMe' ? 'block' : 'none', height: '100%' }}>
          <StationsList 
            apiKey={ocmApiKey}
            favorites={favorites} 
            toggleFavorite={toggleStationFavorite}
            toggleProviderFavorite={toggleProviderFavorite}
            onOpenSettings={() => { setApiKeyInput(ocmApiKey); setShowSettings(true); }}
            mapStyle={mapStyle}
          />
        </div>
        <div style={{ display: activeTab === 'route' ? 'block' : 'none', height: '100%' }}>
          <RoutePlanner 
            apiKey={ocmApiKey}
            favorites={favorites} 
            toggleFavorite={toggleStationFavorite} 
            onOpenSettings={() => { setApiKeyInput(ocmApiKey); setShowSettings(true); }}
            mapStyle={mapStyle}
          />
        </div>
        <div style={{ display: activeTab === 'favorites' ? 'block' : 'none', height: '100%' }}>
          <FavoritesView 
            favorites={favorites}
            toggleFavorite={toggleStationFavorite}
            toggleProviderFavorite={toggleProviderFavorite}
            mapStyle={mapStyle}
          />
        </div>
      </>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      
      {/* Settings Modal */}
      {showSettings && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', position: 'relative' }}>
            <button className="btn-icon" onClick={() => setShowSettings(false)} style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
              <X size={20} />
            </button>
            <h2 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={24} color="var(--accent-primary)" /> Einstellungen
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  OpenChargeMap API-Key
                </label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Dein API-Key..."
                />
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Kostenlos erhältlich auf openchargemap.org
                </p>
              </div>

              <div>
                <label className="input-label">Erscheinungsbild (Theme)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className={theme === 'dark' ? 'btn-primary' : 'btn-secondary'} style={{ flex: 1, padding: '0.5rem' }} onClick={() => setTheme('dark')}>Dunkel</button>
                  <button className={theme === 'light' ? 'btn-primary' : 'btn-secondary'} style={{ flex: 1, padding: '0.5rem' }} onClick={() => setTheme('light')}>Hell</button>
                </div>
              </div>

              <div>
                <label className="input-label">Karten-Design</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button className={mapStyle === 'standard' ? 'btn-primary' : 'btn-secondary'} style={{ width: '100%', padding: '0.5rem', textAlign: 'left' }} onClick={() => setMapStyle('standard')}>🌍 Standard (OSM)</button>
                  <button className={mapStyle === 'dark' ? 'btn-primary' : 'btn-secondary'} style={{ width: '100%', padding: '0.5rem', textAlign: 'left' }} onClick={() => setMapStyle('dark')}>🌙 Dunkelmodus</button>
                  <button className={mapStyle === 'satellite' ? 'btn-primary' : 'btn-secondary'} style={{ width: '100%', padding: '0.5rem', textAlign: 'left' }} onClick={() => setMapStyle('satellite')}>🛰️ Satellit</button>
                </div>
              </div>

              <button className="btn-primary" onClick={handleSaveSettings} style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <Check size={18} /> Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="glass-panel" style={{ borderRadius: 0, padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', padding: '0.5rem', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0, 210, 255, 0.3)' }}>
            <Compass size={24} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, background: 'linear-gradient(to right, #fff, #a0a5b1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ChargeFlow
            </h1>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' }}>
              EV Planner
            </div>
          </div>
        </div>
        <button className="btn-icon" onClick={() => { setApiKeyInput(ocmApiKey); setShowSettings(true); }}>
          <Settings size={20} />
        </button>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <nav className="glass-panel" style={{ borderRadius: 0, padding: '0.75rem 1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-around', zIndex: 10, paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
        <button 
          onClick={() => setActiveTab('nearMe')}
          style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', color: activeTab === 'nearMe' ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', transition: 'color 0.2s' }}
        >
          <MapPin size={24} strokeWidth={activeTab === 'nearMe' ? 2.5 : 2} />
          <span style={{ fontSize: '0.75rem', fontWeight: activeTab === 'nearMe' ? 600 : 400 }}>Meine Nähe</span>
        </button>
        <button 
          onClick={() => setActiveTab('route')}
          style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', color: activeTab === 'route' ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', transition: 'color 0.2s' }}
        >
          <Compass size={24} strokeWidth={activeTab === 'route' ? 2.5 : 2} />
          <span style={{ fontSize: '0.75rem', fontWeight: activeTab === 'route' ? 600 : 400 }}>Routenplaner</span>
        </button>
        <button 
          onClick={() => setActiveTab('favorites')}
          style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', color: activeTab === 'favorites' ? 'var(--accent-danger)' : 'var(--text-secondary)', cursor: 'pointer', transition: 'color 0.2s' }}
        >
          <Heart size={24} strokeWidth={activeTab === 'favorites' ? 2.5 : 2} />
          <span style={{ fontSize: '0.75rem', fontWeight: activeTab === 'favorites' ? 600 : 400 }}>Favoriten</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
