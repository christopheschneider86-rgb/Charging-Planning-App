import React, { useState, useEffect } from 'react';
import { MapPin, Route, Settings, Key, X } from 'lucide-react';
import StationsList from './components/StationsList';
import RoutePlanner from './components/RoutePlanner';
import { MOCK_STATIONS, PROVIDERS } from './data/mockData';

function App() {
  const [activeTab, setActiveTab] = useState('nearMe');
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  
  const [ocmApiKey, setOcmApiKey] = useState(() => {
    return localStorage.getItem('ocm-api-key') || '';
  });

  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('ev-favorites');
    return saved ? JSON.parse(saved) : { stations: [], providers: [] };
  });

  useEffect(() => {
    localStorage.setItem('ev-favorites', JSON.stringify(favorites));
  }, [favorites]);

  const saveApiKey = () => {
    setOcmApiKey(apiKeyInput);
    localStorage.setItem('ocm-api-key', apiKeyInput);
    setShowSettings(false);
  };

  const toggleStationFavorite = (stationId) => {
    setFavorites(prev => {
      const isFav = prev.stations.includes(stationId);
      return {
        ...prev,
        stations: isFav 
          ? prev.stations.filter(id => id !== stationId)
          : [...prev.stations, stationId]
      };
    });
  };

  const toggleProviderFavorite = (provider) => {
    setFavorites(prev => {
      const isFav = prev.providers.includes(provider);
      return {
        ...prev,
        providers: isFav 
          ? prev.providers.filter(p => p !== provider)
          : [...prev.providers, provider]
      };
    });
  };

  const renderContent = () => {
    if (activeTab === 'nearMe') {
      return (
        <StationsList 
          apiKey={ocmApiKey}
          favorites={favorites} 
          toggleFavorite={toggleStationFavorite}
          toggleProviderFavorite={toggleProviderFavorite}
          onOpenSettings={() => { setApiKeyInput(ocmApiKey); setShowSettings(true); }}
        />
      );
    }
    if (activeTab === 'route') {
      return (
        <RoutePlanner 
          stations={MOCK_STATIONS} 
          favorites={favorites} 
          toggleFavorite={toggleStationFavorite} 
        />
      );
    }
    return <div>Work in progress...</div>;
  };

  return (
    <div className="app-container">
      <header className="glass-nav">
        <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', borderRadius: '12px', padding: '8px', display: 'flex', boxShadow: '0 4px 12px rgba(0, 210, 255, 0.3)' }}>
              <MapPin color="white" size={24} />
            </div>
            <h1 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700, background: 'linear-gradient(to right, #fff, #a0a5b1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ChargeFlow
            </h1>
          </div>
          <button className="btn-icon" onClick={() => { setApiKeyInput(ocmApiKey); setShowSettings(true); }}>
            <Settings size={22} />
          </button>
        </div>
        
        <div style={{ display: 'flex', padding: '0 1rem', gap: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <button 
            onClick={() => setActiveTab('nearMe')}
            style={{ 
              background: 'none', border: 'none', 
              color: activeTab === 'nearMe' ? 'var(--text-primary)' : 'var(--text-secondary)',
              padding: '1rem 0.5rem', fontWeight: activeTab === 'nearMe' ? 600 : 500,
              fontFamily: 'var(--font-main)', cursor: 'pointer',
              borderBottom: activeTab === 'nearMe' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}
          >
            <MapPin size={18} color={activeTab === 'nearMe' ? 'var(--accent-primary)' : 'currentColor'} /> Meine Nähe
          </button>
          <button 
            onClick={() => setActiveTab('route')}
            style={{ 
              background: 'none', border: 'none', 
              color: activeTab === 'route' ? 'var(--text-primary)' : 'var(--text-secondary)',
              padding: '1rem 0.5rem', fontWeight: activeTab === 'route' ? 600 : 500,
              fontFamily: 'var(--font-main)', cursor: 'pointer',
              borderBottom: activeTab === 'route' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}
          >
            <Route size={18} color={activeTab === 'route' ? 'var(--accent-primary)' : 'currentColor'} /> Routenplaner
          </button>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {renderContent()}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', position: 'relative' }}>
            <button onClick={() => setShowSettings(false)} className="btn-icon" style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
              <X size={20} />
            </button>
            
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={20} color="var(--accent-primary)" /> Einstellungen
            </h2>

            <div className="input-group">
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={16} /> OpenChargeMap API Key
              </label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Dein API-Key..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Ein kostenloser Key wird benötigt, um echte Ladesäulen abzurufen. Registrierung unter openchargemap.org.
              </p>
            </div>

            <button className="btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={saveApiKey}>
              Speichern & Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
