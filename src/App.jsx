import React, { useState, useEffect } from 'react';
import { Compass, Settings, Check, X, MapPin, Heart, Plug, RotateCcw, Home, Briefcase, Trash2, Plus, Car, Battery, Navigation as NavIcon, Shield, Mail, Coffee } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { NAV_APPS } from './services/nav';
import StationsList from './components/StationsList';
import RoutePlanner from './components/RoutePlanner';
import FavoritesView from './components/FavoritesView';
import AddressAutocomplete from './components/AddressAutocomplete';
import TermsModal from './components/TermsModal';
import { useBodyScrollLock } from './hooks/useBodyScrollLock';

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
  const [showTerms, setShowTerms] = useState(false);
  useBodyScrollLock(showSettings || showTerms);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [ocmApiKey, setOcmApiKey] = useState(() => localStorage.getItem('ocm_api_key') || '');

  // Extra preferences
  const [defaultRadius, setDefaultRadius] = usePersisted('chargeflow_radius', 15);
  const [minPowerKW, setMinPowerKW] = usePersisted('chargeflow_minpower', 0);
  const [preferredConnectors, setPreferredConnectors] = usePersisted('chargeflow_connectors', []);
  const [onlyOperational, setOnlyOperational] = usePersisted('chargeflow_only_operational', true);
  const [autoLocate, setAutoLocate] = usePersisted('chargeflow_auto_locate', false);
  const [navApp, setNavApp] = usePersisted('chargeflow_nav_app', 'google');

  // Saved places (Home, Work, custom)
  const [savedPlaces, setSavedPlaces] = usePersisted('chargeflow_places', []);

  const upsertPlace = (place) => {
    setSavedPlaces(prev => {
      const others = prev.filter(p => p.id !== place.id);
      return [...others, place];
    });
  };
  const removePlace = (id) => setSavedPlaces(prev => prev.filter(p => p.id !== id));

  // Vehicles
  const [vehicles, setVehicles] = usePersisted('chargeflow_vehicles', []);
  const [activeVehicleId, setActiveVehicleId] = usePersisted('chargeflow_active_vehicle', null);
  const [safetyKm, setSafetyKm] = usePersisted('chargeflow_safety_km', 20);

  // Auto-pick first vehicle as active if none selected yet
  useEffect(() => {
    if (vehicles.length > 0 && !activeVehicleId) {
      setActiveVehicleId(vehicles[0].id);
    }
    // Clear active id if it points to a vehicle that no longer exists
    if (activeVehicleId && !vehicles.find(v => v.id === activeVehicleId)) {
      setActiveVehicleId(vehicles.length > 0 ? vehicles[0].id : null);
    }
  }, [vehicles, activeVehicleId]);

  // Saved routes
  const [savedRoutes, setSavedRoutes] = usePersisted('chargeflow_routes', []);
  const addSavedRoute = (route) => setSavedRoutes(prev => [...prev, { id: `route-${Date.now()}`, ...route }]);
  const removeSavedRoute = (id) => setSavedRoutes(prev => prev.filter(r => r.id !== id));

  const addVehicle = (v) => {
    const vehicle = { id: `veh-${Date.now()}`, ...v };
    setVehicles(prev => [...prev, vehicle]);
    if (!activeVehicleId) setActiveVehicleId(vehicle.id);
  };
  const updateVehicle = (id, patch) => setVehicles(prev => prev.map(v => v.id === id ? { ...v, ...patch } : v));
  const removeVehicle = (id) => {
    setVehicles(prev => prev.filter(v => v.id !== id));
    if (activeVehicleId === id) setActiveVehicleId(null);
  };

  // Favorites
  const [favorites, setFavorites] = usePersisted('chargeflow_favorites', { stations: [], providers: [], hiddenProviders: [] });

  // Migration: ensure hiddenProviders field exists
  useEffect(() => {
    if (favorites && !Array.isArray(favorites.hiddenProviders)) {
      setFavorites(prev => ({ ...prev, hiddenProviders: [] }));
    }
  }, [favorites]);

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
    viewMode: 'list',
    minPowerKW: 0,
    excludedProviders: []
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
    corridorKm: 5,
    startSoC: 80,
    minPowerKW: 0,
    excludedProviders: []
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

  const toggleProviderVisibility = (provider) => {
    setFavorites(prev => {
      const hidden = prev.hiddenProviders || [];
      const isHidden = hidden.includes(provider);
      return { ...prev, hiddenProviders: isHidden ? hidden.filter(p => p !== provider) : [...hidden, provider] };
    });
  };

  const toggleConnector = (type) => {
    setPreferredConnectors(prev => prev.includes(type) ? prev.filter(c => c !== type) : [...prev, type]);
  };

  const handleSaveSettings = () => {
    setOcmApiKey(apiKeyInput);
    localStorage.setItem('ocm_api_key', apiKeyInput);
    setShowSettings(false);
  };

  // New-place draft fields (used inside settings)
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceAddr, setNewPlaceAddr] = useState('');
  const [homeDraft, setHomeDraft] = useState('');
  const [workDraft, setWorkDraft] = useState('');

  const saveHomeOrWork = (kind, picked) => {
    upsertPlace({
      id: kind,
      type: kind,
      name: kind === 'home' ? 'Zuhause' : 'Arbeit',
      label: picked.label,
      lat: picked.lat,
      lng: picked.lng
    });
  };

  const addCustomPlace = (picked) => {
    if (!newPlaceName.trim()) return;
    upsertPlace({
      id: `place-${Date.now()}`,
      type: 'custom',
      name: newPlaceName.trim(),
      label: picked.label,
      lat: picked.lat,
      lng: picked.lng
    });
    setNewPlaceName('');
    setNewPlaceAddr('');
  };

  const home = savedPlaces.find(p => p.id === 'home');
  const work = savedPlaces.find(p => p.id === 'work');
  const customPlaces = savedPlaces.filter(p => p.type === 'custom');

  // Vehicle draft
  const [vehDraft, setVehDraft] = useState({ name: '', batteryKWh: '', consumptionKWh100: '', dcMaxKW: '' });
  const handleAddVehicle = () => {
    const battery = parseFloat(vehDraft.batteryKWh);
    const consumption = parseFloat(vehDraft.consumptionKWh100);
    if (!vehDraft.name.trim() || !battery || !consumption) return;
    addVehicle({
      name: vehDraft.name.trim(),
      batteryKWh: battery,
      consumptionKWh100: consumption,
      dcMaxKW: vehDraft.dcMaxKW ? parseFloat(vehDraft.dcMaxKW) : null
    });
    setVehDraft({ name: '', batteryKWh: '', consumptionKWh100: '', dcMaxKW: '' });
  };

  const handleResetData = () => {
    if (!window.confirm('Alle Suchen, Favoriten und Einstellungen zurücksetzen?')) return;
    [
      'chargeflow_favorites', 'chargeflow_nearme', 'chargeflow_route',
      'chargeflow_radius', 'chargeflow_minpower', 'chargeflow_connectors',
      'chargeflow_only_operational', 'chargeflow_auto_locate', 'chargeflow_tab',
      'chargeflow_places', 'chargeflow_vehicles',
      'chargeflow_active_vehicle', 'chargeflow_safety_km', 'chargeflow_routes',
      'chargeflow_nav_app'
    ].forEach(k => localStorage.removeItem(k));
    window.location.reload();
  };

  const prefs = {
    minPowerKW,
    preferredConnectors,
    onlyOperational,
    defaultRadius,
    navApp,
    savedPlaces,
    vehicles,
    activeVehicleId,
    safetyKm,
    savedRoutes
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>

      {/* Settings Modal */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 0 }} onClick={() => setShowSettings(false)}>
          <div
            className="glass-panel modal-scroll"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '480px',
              maxHeight: '100dvh',
              overflowY: 'auto',
              padding: 0, position: 'relative',
              borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
              backgroundColor: 'var(--bg-secondary)',
              display: 'flex', flexDirection: 'column'
            }}
          >
            <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', padding: '1rem 1.5rem', paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem' }}>
                <Settings size={22} color="var(--accent-primary)" /> Einstellungen
              </h2>
              <button className="btn-icon" onClick={() => setShowSettings(false)} aria-label="Schließen" style={{ minWidth: 44, minHeight: 44 }}>
                <X size={22} />
              </button>
            </div>
            <div style={{ padding: '1.25rem 1.5rem' }}>

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
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <NavIcon size={14} /> Bevorzugte Navi-App
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {NAV_APPS.map(opt => (
                    <button key={opt.id} className={navApp === opt.id ? 'btn-primary' : 'btn-secondary'} style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }} onClick={() => setNavApp(opt.id)}>{opt.label}</button>
                  ))}
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <Car size={14} /> Fahrzeuge
                </label>

                {vehicles.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {vehicles.map(v => {
                      const active = v.id === activeVehicleId;
                      return (
                        <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-primary)', borderRadius: 8, padding: '0.5rem 0.75rem', border: active ? '1px solid var(--accent-primary)' : '1px solid transparent' }}>
                          <button
                            onClick={() => setActiveVehicleId(active ? null : v.id)}
                            title={active ? 'Deaktivieren' : 'Als aktives Fahrzeug wählen'}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
                          >
                            <Car size={16} color={active ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                          </button>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{v.name} {active && <span style={{ fontSize: '0.65rem', color: 'var(--accent-primary)' }}>· aktiv</span>}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {v.batteryKWh} kWh · {v.consumptionKWh100} kWh/100km{v.dcMaxKW ? ` · max ${v.dcMaxKW} kW DC` : ''}
                            </div>
                          </div>
                          <button onClick={() => removeVehicle(v.id)} className="btn-icon" style={{ width: 28, height: 28 }} title="Entfernen"><Trash2 size={14} /></button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Noch kein Fahrzeug angelegt. Mit Fahrzeug kann der Routenplaner den Ladezustand pro Stopp berechnen.</p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'rgba(0,210,255,0.04)', padding: '0.6rem', borderRadius: 10, border: '1px dashed var(--border-color)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Plus size={12} /> Fahrzeug hinzufügen
                  </div>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Name (z.B. 'Ioniq 5')"
                    value={vehDraft.name}
                    onChange={(e) => setVehDraft(d => ({ ...d, name: e.target.value }))}
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                  />
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <input
                      type="number" min={5} max={200} step="0.1"
                      className="input-field"
                      placeholder="Akku kWh"
                      value={vehDraft.batteryKWh}
                      onChange={(e) => setVehDraft(d => ({ ...d, batteryKWh: e.target.value }))}
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', flex: 1 }}
                    />
                    <input
                      type="number" min={5} max={50} step="0.1"
                      className="input-field"
                      placeholder="kWh/100km"
                      value={vehDraft.consumptionKWh100}
                      onChange={(e) => setVehDraft(d => ({ ...d, consumptionKWh100: e.target.value }))}
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', flex: 1 }}
                    />
                  </div>
                  <input
                    type="number" min={10} max={400} step="1"
                    className="input-field"
                    placeholder="max DC kW (optional)"
                    value={vehDraft.dcMaxKW}
                    onChange={(e) => setVehDraft(d => ({ ...d, dcMaxKW: e.target.value }))}
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                  />
                  <button
                    onClick={handleAddVehicle}
                    className="btn-primary"
                    disabled={!vehDraft.name.trim() || !vehDraft.batteryKWh || !vehDraft.consumptionKWh100}
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                  >
                    <Plus size={14} /> Hinzufügen
                  </button>
                </div>

                <div>
                  <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Battery size={14} /> Sicherheitsreserve: <strong>{safetyKm} km</strong>
                  </label>
                  <input type="range" min={0} max={80} step={5} value={safetyKm} onChange={(e) => setSafetyKm(parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent-primary)' }} />
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Kilometer-Puffer, der bei der Routenberechnung nicht eingerechnet wird.
                  </p>
                </div>
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <Home size={14} /> Meine Orte
                </label>

                {/* Home slot */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Home size={12} /> Zuhause
                  </div>
                  {home ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-primary)', borderRadius: 8, padding: '0.5rem 0.75rem' }}>
                      <span style={{ flex: 1, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{home.label}</span>
                      <button onClick={() => removePlace('home')} className="btn-icon" style={{ width: 28, height: 28 }} title="Entfernen"><Trash2 size={14} /></button>
                    </div>
                  ) : (
                    <AddressAutocomplete
                      value={homeDraft}
                      onChange={setHomeDraft}
                      onSelect={(p) => { saveHomeOrWork('home', p); setHomeDraft(''); }}
                      placeholder="Adresse für Zuhause…"
                    />
                  )}
                </div>

                {/* Work slot */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Briefcase size={12} /> Arbeit
                  </div>
                  {work ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-primary)', borderRadius: 8, padding: '0.5rem 0.75rem' }}>
                      <span style={{ flex: 1, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{work.label}</span>
                      <button onClick={() => removePlace('work')} className="btn-icon" style={{ width: 28, height: 28 }} title="Entfernen"><Trash2 size={14} /></button>
                    </div>
                  ) : (
                    <AddressAutocomplete
                      value={workDraft}
                      onChange={setWorkDraft}
                      onSelect={(p) => { saveHomeOrWork('work', p); setWorkDraft(''); }}
                      placeholder="Adresse für Arbeit…"
                    />
                  )}
                </div>

                {/* Custom places */}
                {customPlaces.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Weitere Orte</div>
                    {customPlaces.map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-primary)', borderRadius: 8, padding: '0.5rem 0.75rem' }}>
                        <MapPin size={14} color="var(--accent-primary)" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{p.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.label}</div>
                        </div>
                        <button onClick={() => removePlace(p.id)} className="btn-icon" style={{ width: 28, height: 28 }} title="Entfernen"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add custom */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'rgba(0,210,255,0.04)', padding: '0.6rem', borderRadius: 10, border: '1px dashed var(--border-color)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Plus size={12} /> Eigenen Ort hinzufügen
                  </div>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Name (z.B. 'Schwiegereltern')"
                    value={newPlaceName}
                    onChange={(e) => setNewPlaceName(e.target.value)}
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                  />
                  <AddressAutocomplete
                    value={newPlaceAddr}
                    onChange={setNewPlaceAddr}
                    onSelect={(p) => { addCustomPlace(p); }}
                    placeholder="Adresse suchen…"
                    disabled={!newPlaceName.trim()}
                  />
                  {!newPlaceName.trim() && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Erst Name eingeben, dann Adresse suchen.</span>}
                </div>
              </div>

              <button className="btn-primary" onClick={handleSaveSettings} style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                <Check size={18} /> Speichern
              </button>

              <a
                href="mailto:christophe.schneider86@googlemail.com?subject=ChargeFlow%20Support%20%2F%20Feedback"
                className="btn-secondary"
                style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none' }}
              >
                <Mail size={16} /> Support / Feedback senden
              </a>

              <button className="btn-secondary" onClick={handleResetData} style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', color: 'var(--accent-danger)' }}>
                <RotateCcw size={16} /> Alle Daten zurücksetzen
              </button>

              <button
                onClick={() => setShowTerms(true)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', padding: '0.25rem', textAlign: 'center' }}
              >
                Info, Datenquellen & Datenschutz
              </button>
            </div>
            </div>
            <div style={{ position: 'sticky', bottom: 0, background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', padding: '0.75rem 1.5rem', paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
              <button onClick={() => setShowSettings(false)} className="btn-primary" style={{ width: '100%' }}>
                Fertig
              </button>
            </div>
          </div>
        </div>
      )}

      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <button className="btn-icon" onClick={() => setShowTerms(true)} title="Info & Datenschutz" aria-label="Info & Datenschutz">
            <Shield size={20} />
          </button>
          <button className="btn-icon" onClick={() => { setApiKeyInput(ocmApiKey); setShowSettings(true); }} title="Einstellungen" aria-label="Einstellungen">
            <Settings size={20} />
          </button>

          {/* Konto area — placeholder for future Login. For now: Ko-Fi support button. */}
          <div style={{ width: 1, height: 24, background: 'var(--border-color)', margin: '0 0.4rem' }} />
          <a
            href="https://ko-fi.com/christopheschneider"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-icon"
            title="ChargeFlow unterstützen (Ko-Fi)"
            aria-label="Support via Ko-Fi"
            style={{ background: '#d9534f', color: 'white' }}
          >
            <Coffee size={18} />
          </a>
        </div>
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
            navApp={navApp}
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
            navApp={navApp}
            prefs={prefs}
            state={routeState}
            setState={setRouteState}
            data={routeData}
            setData={setRouteData}
            lastNearMeQuery={nearMe.locationInput}
            setActiveVehicleId={setActiveVehicleId}
            addSavedRoute={addSavedRoute}
            removeSavedRoute={removeSavedRoute}
          />
        </div>
        <div style={{ display: activeTab === 'favorites' ? 'block' : 'none', height: '100%' }}>
          <FavoritesView
            apiKey={ocmApiKey}
            favorites={favorites}
            toggleFavorite={toggleStationFavorite}
            toggleProviderFavorite={toggleProviderFavorite}
            toggleProviderVisibility={toggleProviderVisibility}
            mapStyle={mapStyle}
            navApp={navApp}
          />
        </div>
      </main>
      <Analytics />
    </div>
  );
}

export default App;
