import React, { useState, useEffect } from 'react';
import { Compass, Settings, Check, X, MapPin, Heart, Plug, RotateCcw } from 'lucide-react';
import StationsList from './components/StationsList';
import RoutePlanner from './components/RoutePlanner';
import FavoritesView from './components/FavoritesView';

const CONNECTOR_TYPES = ['CCS (Type 2)', 'Type 2', 'CHAdeMO', 'Tesla (Type 2)', 'Tesla Supercharger', 'Type 1', 'Schuko'];

const usePersisted = (key, initial, transform) => {
  const [v, setV] = useState(() => {
    const raw = localStorage.getItem(key);
    if (raw === null) return initial;
    try {
      const parsed = JSON.parse(raw);
      return transform ? transform(parsed) : parsed;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(v));
  }, [key, v]);
  return [v, setV];
};

function App() {
  const [activeTab, setActiveTab] = usePersisted('chargeflow_tab', 'nearMe');

  // Theme & map
  const [theme, setTheme] = usePersisted('chargeflow_theme', 'dark');
  const [mapStyle, setMapStyle] = usePersisted('chargeflow_mapstyle', 'standard');

  useEffect(() => {
    if (theme === 'light') document.body.classList.add('light-theme');
    else document.body.classList.remove('light-theme');
  }, [theme]);

  // Settings modal
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [ocmApiKey, setOcmApiKey] = useState(() => localStorage.getItem('ocm_api_key') || '');

  // Extra preferences
  const [defaultRadius, setDefaultRadius] = usePersisted('chargeflow_radius', 15);
  const [minPowerKW, setMinPowerKW] = usePersisted('chargeflow_minpower', 0);
  const [preferredConnectors, setPreferredConnectors] = usePersisted('chargeflow_connectors', []);
  const [onlyOperational, setOnlyOperational] = usePersisted('chargeflow_only_operational', true);
  const [autoLocate, setAutoLocate] = usePersisted('chargeflow_auto_locate', false);
  const [currentRangeKm, setCurrentRangeKm] = usePersisted('chargeflow_range', 0); // 0 = aus

  // Favorites
  const [favorites, setFavorites] = usePersisted('chargeflow_favorites', { stations: [], providers: [] });

  // ---- Lifted state for tabs (so switching keeps the form filled) ----
  // StationsList ("Meine Nähe")
  const [nearMe, setNearMe] = usePersisted('chargeflow_nearme', {
    locationInput: '',
    searchedLocationName: null,
    mapCenter: null,
    sortBy: 'distance',
    filterProvider: 'All',
    filterFavorites: false,
    filterAvailable: false,
    minDistance: '',
    maxDistance: '',
    viewMode: 'list'
  });
  // Stations themselves are not persisted (they're fetched data). But keep last list in-memory so tab switch preserves it.
  const [nearMeStations, setNearMeStations] = useState([]);
  const [nearMeUserLocation, setNearMeUserLocation] = useState(null);

  // RoutePlanner
  const [routeState, setRouteState] = usePersisted('chargeflow_route', {
    start: '',
    destination: '',
    sortBy: 'distance',
    filterProvider: 'All',
    filterFavorites: false,
    filterAvailable: false,
    minDistance: '',
    maxDistance: '',
    viewMode: 'list',
    corridorKm: 5
  });
  const [routeData, setRouteData] = useState({ stations: [], polyline: null, startCoords: null, destCoords: null, distanceKm: 0, durationMin: 0 });

  useEffect(() => {
    localStorage.setItem('chargeflow_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleStationFavorite = (station) => {
    const isObject = typeof station === 'object' && station !== null;
    const id = isObject ? station.id : station;
    setFavorites(prev => {
      const exists = prev.stations.some(s => (typeof s === 'string' ? s === id : s.id === id));
      if (exists) {
        return { ...prev, stations: prev.stations.filter(s => (typeof s === 'string' ? s !== id : s.id !== id)) };
      }
      return { ...prev, stations: [...prev.stations, isObject ? station : id] };
    });
  };

  const toggleProviderFavorite = (provider) => {
    setFavorites(prev => prev.providers.includes(provider)
      ? { ...prev, providers: prev.providers.filter(p => p !== provider) }
      : { ...prev, providers: [...prev.providers, provider] }
    );
  };

  const toggleConnector = (type) => {
    setPreferredConnectors(prev => prev.includes(type) ? prev.filter(c => c !== type) : [...prev, type]);
  };

  const handleSaveSettings = () => {
    setOcmApiKey(apiKeyInput);
    localStorage.setItem('ocm_api_key', apiKeyInput);
    setShowSettings(false);
  };

  const handleResetData = () => {
    if (!window.confirm('Alle Suchen, Favoriten und Einstellungen zurücksetzen?')) return;
    [
      'chargeflow_favorites', 'chargeflow_nearme', 'chargeflow_route',
      'chargeflow_radius', 'chargeflow_minpower', 'chargeflow_connectors',
      'chargeflow_only_operational', 'chargeflow_auto_locate', 'chargeflow_tab'
    ].forEach(k => localStorage.removeItem(k));
    window.location.reload();
  };

  const prefs = {
    minPowerKW,
    preferredConnectors,
    onlyOperational,
    defaultRadius,
    currentRangeKm
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>

      {/* Settings Modal */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', position: 'relative' }}>
            <button className="btn-icon" onClick={() => setShowSettings(false)} style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
              <X size={20} />
            </button>
            <h2 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={24} color="var(--accent-primary)" /> Einstellungen
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label className="input-label">OpenChargeMap API-Key</label>
                <input type="text" className="input-field" value={apiKeyInput} onChange={(e) => setApiKeyInput(e.target.value)} placeholder="Dein API-Key…" />
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Kostenlos erhältlich auf{' '}
                  <a href="https://openchargemap.org/site/profile/applications" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>openchargemap.org</a>
                  {' '}— Konto erstellen → „My Profile" → „My Apps" → neue App anlegen → API-Key kopieren.
                </p>
              </div>

              <div>
                <label className="input-label">Erscheinungsbild</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className={theme === 'dark' ? 'btn-primary' : 'btn-secondary'} style={{ flex: 1, padding: '0.5rem' }} onClick={() => setTheme('dark')}>Dunkel</button>
                  <button className={theme === 'light' ? 'btn-primary' : 'btn-secondary'} style={{ flex: 1, padding: '0.5rem' }} onClick={() => setTheme('light')}>Hell</button>
                </div>
              </div>

              <div>
                <label className="input-label">Karten-Design</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {[
                    { v: 'standard', l: '🌍 Standard' },
                    { v: 'dark', l: '🌙 Dunkel' },
                    { v: 'satellite', l: '🛰️ Satellit' },
                    { v: 'topo', l: '🏔️ Topo' }
                  ].map(opt => (
                    <button key={opt.v} className={mapStyle === opt.v ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.5rem', textAlign: 'left' }} onClick={() => setMapStyle(opt.v)}>{opt.l}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="input-label">Standard-Suchradius: <strong>{defaultRadius} km</strong></label>
                <input type="range" min={3} max={50} step={1} value={defaultRadius} onChange={(e) => setDefaultRadius(parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent-primary)' }} />
              </div>

              <div>
                <label className="input-label">Mindestleistung: <strong>{minPowerKW === 0 ? 'beliebig' : `${minPowerKW} kW`}</strong></label>
                <input type="range" min={0} max={350} step={11} value={minPowerKW} onChange={(e) => setMinPowerKW(parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent-primary)' }} />
              </div>

              <div>
                <label className="input-label">Aktuelle Reichweite: <strong>{currentRangeKm === 0 ? 'aus' : `${currentRangeKm} km`}</strong></label>
                <input type="range" min={0} max={600} step={10} value={currentRangeKm} onChange={(e) => setCurrentRangeKm(parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent-primary)' }} />
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Aktiviert den Filter „Nur in Reichweite". Berechnung: Luftlinie × 1.3 als Fahrt-Reserve.
                </p>
              </div>

              <div>
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Plug size={14} /> Bevorzugte Steckertypen
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {CONNECTOR_TYPES.map(t => {
                    const active = preferredConnectors.includes(t);
                    return (
                      <button key={t} onClick={() => toggleConnector(t)} className={active ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>{t}</button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={onlyOperational} onChange={(e) => setOnlyOperational(e.target.checked)} style={{ accentColor: 'var(--accent-primary)', width: 16, height: 16 }} />
                  Nur betriebsbereite Stationen
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={autoLocate} onChange={(e) => setAutoLocate(e.target.checked)} style={{ accentColor: 'var(--accent-primary)', width: 16, height: 16 }} />
                  Beim Start automatisch meinen Standort verwenden
                </label>
              </div>

              <button className="btn-primary" onClick={handleSaveSettings} style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                <Check size={18} /> Speichern
              </button>

              <button className="btn-secondary" onClick={handleResetData} style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', color: 'var(--accent-danger)' }}>
                <RotateCcw size={16} /> Alle Daten zurücksetzen
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
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, background: 'linear-gradient(to right, var(--text-primary), var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
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

      {/* Top Navigation */}
      <nav className="glass-panel" style={{ borderRadius: 0, padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-around', zIndex: 10 }}>
        <button onClick={() => setActiveTab('nearMe')} style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem', color: activeTab === 'nearMe' ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem 0.5rem' }}>
          <MapPin size={22} strokeWidth={activeTab === 'nearMe' ? 2.5 : 2} />
          <span style={{ fontSize: '0.7rem', fontWeight: activeTab === 'nearMe' ? 600 : 400 }}>Meine Nähe</span>
        </button>
        <button onClick={() => setActiveTab('route')} style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem', color: activeTab === 'route' ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem 0.5rem' }}>
          <Compass size={22} strokeWidth={activeTab === 'route' ? 2.5 : 2} />
          <span style={{ fontSize: '0.7rem', fontWeight: activeTab === 'route' ? 600 : 400 }}>Routenplaner</span>
        </button>
        <button onClick={() => setActiveTab('favorites')} style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem', color: activeTab === 'favorites' ? 'var(--accent-danger)' : 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem 0.5rem' }}>
          <Heart size={22} strokeWidth={activeTab === 'favorites' ? 2.5 : 2} fill={activeTab === 'favorites' ? 'var(--accent-danger)' : 'transparent'} />
          <span style={{ fontSize: '0.7rem', fontWeight: activeTab === 'favorites' ? 600 : 400 }}>Favoriten</span>
        </button>
      </nav>

      {/* Main Content Area */}
      <main style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        <div style={{ display: activeTab === 'nearMe' ? 'block' : 'none', height: '100%' }}>
          <StationsList
            apiKey={ocmApiKey}
            favorites={favorites}
            toggleFavorite={toggleStationFavorite}
            toggleProviderFavorite={toggleProviderFavorite}
            onOpenSettings={() => { setApiKeyInput(ocmApiKey); setShowSettings(true); }}
            mapStyle={mapStyle}
            prefs={prefs}
            state={nearMe}
            setState={setNearMe}
            stations={nearMeStations}
            setStations={setNearMeStations}
            userLocation={nearMeUserLocation}
            setUserLocation={setNearMeUserLocation}
            autoLocate={autoLocate}
            sendToRoute={(start, dest) => {
              setRouteState(prev => ({ ...prev, start: start ?? prev.start, destination: dest ?? prev.destination }));
              setActiveTab('route');
            }}
          />
        </div>
        <div style={{ display: activeTab === 'route' ? 'block' : 'none', height: '100%' }}>
          <RoutePlanner
            apiKey={ocmApiKey}
            favorites={favorites}
            toggleFavorite={toggleStationFavorite}
            toggleProviderFavorite={toggleProviderFavorite}
            onOpenSettings={() => { setApiKeyInput(ocmApiKey); setShowSettings(true); }}
            mapStyle={mapStyle}
            prefs={prefs}
            state={routeState}
            setState={setRouteState}
            data={routeData}
            setData={setRouteData}
            lastNearMeQuery={nearMe.locationInput}
          />
        </div>
        <div style={{ display: activeTab === 'favorites' ? 'block' : 'none', height: '100%' }}>
          <FavoritesView
            apiKey={ocmApiKey}
            favorites={favorites}
            toggleFavorite={toggleStationFavorite}
            toggleProviderFavorite={toggleProviderFavorite}
            mapStyle={mapStyle}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
