import React, { useState, useMemo, useEffect } from 'react';
import { Heart, List, Map, RefreshCw, Trash2, AlertCircle, Search, MapPin, Building2, Eye, EyeOff } from 'lucide-react';
import StationCard from './StationCard';
import StationDetail from './StationDetail';
import MapView from './MapView';
import { fetchStationById, fetchStations } from '../services/api';

const FavoritesView = ({ apiKey, favorites, toggleFavorite, toggleProviderFavorite, toggleProviderVisibility, mapStyle, navApp }) => {
  const hiddenProviders = favorites.hiddenProviders || [];
  const visibleProviderNames = (favorites.providers || []).filter(p => !hiddenProviders.includes(p));
  const [subTab, setSubTab] = useState('stations'); // 'stations' | 'providers'
  const [viewMode, setViewMode] = useState('list');
  const [selectedStation, setSelectedStation] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [syncedStations, setSyncedStations] = useState({});
  const [search, setSearch] = useState('');

  // Provider sub-tab state
  const [providerStations, setProviderStations] = useState([]);
  const [isLoadingArea, setIsLoadingArea] = useState(false);
  const [areaError, setAreaError] = useState(null);
  const [areaCenter, setAreaCenter] = useState(null);

  // Normalize: keep only object-favorites (we store station objects when toggled from a fetched list)
  const favoriteStations = useMemo(() => {
    const out = [];
    for (const s of favorites.stations) {
      if (typeof s === 'object' && s !== null && s.id) {
        out.push({ ...s, ...(syncedStations[s.id] || {}) });
      }
    }
    return out;
  }, [favorites.stations, syncedStations]);

  const filteredFavorites = useMemo(() => {
    if (!search.trim()) return favoriteStations;
    const q = search.toLowerCase();
    return favoriteStations.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.provider || '').toLowerCase().includes(q) ||
      (s.address || '').toLowerCase().includes(q)
    );
  }, [favoriteStations, search]);

  const center = useMemo(() => {
    if (areaCenter) return areaCenter;
    if (favoriteStations.length === 0) return null;
    const lat = favoriteStations.reduce((s, x) => s + (x.lat || 0), 0) / favoriteStations.length;
    const lng = favoriteStations.reduce((s, x) => s + (x.lng || 0), 0) / favoriteStations.length;
    return [lat, lng];
  }, [favoriteStations, areaCenter]);

  const handleSyncOCM = async () => {
    if (!apiKey) { setSyncError('NO_API_KEY'); return; }
    if (favoriteStations.length === 0) return;
    setIsSyncing(true);
    setSyncError(null);
    const map = { ...syncedStations };
    const stale = [];
    for (const fav of favoriteStations) {
      try {
        const fresh = await fetchStationById(fav.id, apiKey);
        if (fresh) map[fav.id] = fresh;
        else stale.push(fav);
      } catch (e) {
        if (e.message === 'INVALID_API_KEY') { setSyncError('INVALID_API_KEY'); break; }
      }
    }
    setSyncedStations(map);
    setIsSyncing(false);
    if (stale.length > 0) {
      const remove = window.confirm(`${stale.length} Favoriten existieren bei OpenChargeMap nicht mehr. Entfernen?`);
      if (remove) stale.forEach(s => toggleFavorite(s));
    }
  };

  // Bbox search filtered to *visible* favored providers — used in providers sub-tab
  const loadProviderArea = async (lat, lng, radiusKm) => {
    if (!apiKey) { setAreaError('NO_API_KEY'); return; }
    if (visibleProviderNames.length === 0) {
      setAreaError(favorites.providers.length === 0 ? 'NO_PROVIDERS' : 'ALL_HIDDEN');
      return;
    }
    setIsLoadingArea(true);
    setAreaError(null);
    try {
      const data = await fetchStations(lat, lng, apiKey, radiusKm);
      const lowered = visibleProviderNames.map(p => p.toLowerCase());
      const filtered = data.filter(s => lowered.includes((s.provider || '').toLowerCase()));
      setProviderStations(filtered);
      setAreaCenter([lat, lng]);
    } catch (e) {
      setAreaError(e.message === 'INVALID_API_KEY' ? 'INVALID_API_KEY' : 'FETCH_ERROR');
    } finally {
      setIsLoadingArea(false);
    }
  };

  // For the list display of map results, filter again so an existing fetch
  // updates instantly when the user toggles visibility (no re-fetch needed).
  const visibleProviderStations = useMemo(() => {
    const lowered = visibleProviderNames.map(p => p.toLowerCase());
    return providerStations.filter(s => lowered.includes((s.provider || '').toLowerCase()));
  }, [providerStations, visibleProviderNames]);

  // ----- RENDER -----

  return (
    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>

      <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Heart size={18} color="var(--accent-danger)" fill="var(--accent-danger)" />
            <span style={{ fontWeight: 600 }}>Favoriten</span>
          </div>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 2 }}>
            <button onClick={() => setViewMode('list')} style={{ background: viewMode === 'list' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'list' ? 'white' : 'var(--text-secondary)', border: 'none', padding: '0.5rem', borderRadius: 6, cursor: 'pointer' }}><List size={16} /></button>
            <button onClick={() => setViewMode('map')} style={{ background: viewMode === 'map' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'map' ? 'white' : 'var(--text-secondary)', border: 'none', padding: '0.5rem', borderRadius: 6, cursor: 'pointer' }}><Map size={16} /></button>
          </div>
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 3 }}>
          <button
            onClick={() => setSubTab('stations')}
            style={{ flex: 1, background: subTab === 'stations' ? 'var(--accent-primary)' : 'transparent', color: subTab === 'stations' ? 'white' : 'var(--text-secondary)', border: 'none', padding: '0.55rem', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontFamily: 'var(--font-main)' }}
          >
            <MapPin size={14} /> Säulen ({favoriteStations.length})
          </button>
          <button
            onClick={() => setSubTab('providers')}
            style={{ flex: 1, background: subTab === 'providers' ? 'var(--accent-primary)' : 'transparent', color: subTab === 'providers' ? 'white' : 'var(--text-secondary)', border: 'none', padding: '0.55rem', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontFamily: 'var(--font-main)' }}
          >
            <Building2 size={14} /> Anbieter ({favorites.providers.length})
          </button>
        </div>

        {/* Stations toolbar */}
        {subTab === 'stations' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button className="btn-secondary" onClick={handleSyncOCM} disabled={isSyncing || favoriteStations.length === 0} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <RefreshCw size={14} className={isSyncing ? 'spin' : ''} /> {isSyncing ? 'Syncing…' : 'Mit OCM abgleichen'}
              </button>
            </div>
            {favoriteStations.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.25rem 0.5rem', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                <Search size={14} color="var(--text-muted)" />
                <input type="text" placeholder="Favorit durchsuchen…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '0.875rem', padding: '0.5rem 0' }} />
              </div>
            )}
          </>
        )}

        {/* Providers toolbar */}
        {subTab === 'providers' && favorites.providers.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>
              Lieblings-Anbieter ({visibleProviderNames.length}/{favorites.providers.length} sichtbar)
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {favorites.providers.map(p => {
                const hidden = hiddenProviders.includes(p);
                return (
                  <span
                    key={p}
                    className="badge"
                    style={{
                      background: hidden ? 'rgba(160,165,177,0.12)' : 'rgba(239,68,68,0.12)',
                      color: hidden ? 'var(--text-muted)' : 'var(--accent-danger)',
                      textTransform: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      textDecoration: hidden ? 'line-through' : 'none'
                    }}
                  >
                    <button
                      onClick={() => toggleProviderVisibility && toggleProviderVisibility(p)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', display: 'flex' }}
                      title={hidden ? 'Wieder anzeigen' : 'Ausblenden'}
                    >
                      {hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                    {p}
                    <button
                      onClick={() => toggleProviderFavorite(p)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit' }}
                      title="Anbieter entfernen"
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Auf der Karte den Knopf <strong>„Diesen Ausschnitt laden"</strong> nutzen. Ausgeblendete Anbieter werden gefiltert.
            </p>
          </div>
        )}
      </div>

      {syncError && (
        <div className="glass-panel" style={{ padding: '0.75rem 1rem', border: '1px solid var(--accent-danger)', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-danger)' }}>
          <AlertCircle size={16} />
          {syncError === 'NO_API_KEY' ? 'Kein API-Key — Abgleich nicht möglich.' : 'API-Key ungültig.'}
        </div>
      )}

      {areaError && (
        <div className="glass-panel" style={{ padding: '0.75rem 1rem', border: '1px solid var(--accent-danger)', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-danger)' }}>
          <AlertCircle size={16} />
          {areaError === 'NO_API_KEY' ? 'Kein API-Key.' : areaError === 'NO_PROVIDERS' ? 'Keine Lieblings-Anbieter gespeichert.' : areaError === 'ALL_HIDDEN' ? 'Alle Anbieter sind ausgeblendet.' : areaError === 'INVALID_API_KEY' ? 'API-Key ungültig.' : 'Fehler beim Laden.'}
        </div>
      )}

      {/* SECTION: Stations */}
      {subTab === 'stations' && (
        favoriteStations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Heart size={48} style={{ opacity: 0.2 }} />
            <p>Noch keine Säulen als Favorit. Tippe in einer Suche auf das Herz.</p>
          </div>
        ) : viewMode === 'list' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem' }}>
            {filteredFavorites.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>Keine Treffer.</div>
            ) : (
              filteredFavorites.map((station, i) => (
                <StationCard
                  key={station.id}
                  station={station}
                  isFavorite={true}
                  isProviderFavorite={favorites.providers.includes(station.provider)}
                  toggleFavorite={() => toggleFavorite(station)}
                  onClick={() => setSelectedStation(station)}
                  index={i}
                />
              ))
            )}
          </div>
        ) : (
          <MapView
            stations={filteredFavorites}
            favorites={favorites}
            center={center}
            onStationSelect={(s) => setSelectedStation(s)}
            mapStyle={mapStyle}
            navApp={navApp}
          />
        )
      )}

      {/* SECTION: Providers */}
      {subTab === 'providers' && (
        favorites.providers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Building2 size={48} style={{ opacity: 0.2 }} />
            <p>Noch keine Lieblings-Anbieter. In der Detail-Ansicht einer Säule kannst du den Anbieter mit dem Herz markieren.</p>
          </div>
        ) : viewMode === 'list' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingBottom: '2rem' }}>
            {favorites.providers.map(p => {
              const hidden = hiddenProviders.includes(p);
              return (
                <div key={p} className="glass-panel" style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: hidden ? 0.55 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Building2 size={16} color={hidden ? 'var(--text-muted)' : 'var(--accent-danger)'} />
                    <span style={{ fontWeight: 600, textDecoration: hidden ? 'line-through' : 'none' }}>{p}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button
                      onClick={() => toggleProviderVisibility && toggleProviderVisibility(p)}
                      className="btn-icon"
                      title={hidden ? 'Wieder anzeigen' : 'Auf der Karte ausblenden'}
                    >
                      {hidden ? <EyeOff size={16} color="var(--text-muted)" /> : <Eye size={16} color="var(--text-primary)" />}
                    </button>
                    <button onClick={() => toggleProviderFavorite(p)} className="btn-icon" title="Anbieter entfernen">
                      <Trash2 size={16} color="var(--accent-danger)" />
                    </button>
                  </div>
                </div>
              );
            })}
            <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Wechsle auf die Kartenansicht, um Säulen deiner Anbieter im aktuellen Ausschnitt zu sehen. Ausgeblendete Anbieter werden gefiltert.
            </p>
          </div>
        ) : (
          <MapView
            stations={visibleProviderStations}
            favorites={favorites}
            center={center}
            onStationSelect={(s) => setSelectedStation(s)}
            mapStyle={mapStyle}
            navApp={navApp}
            isLoading={isLoadingArea}
            onSearchArea={loadProviderArea}
            onLocate={loadProviderArea}
          />
        )
      )}

      {selectedStation && (
        <StationDetail
          station={selectedStation}
          onClose={() => setSelectedStation(null)}
          isFavorite={favorites.stations.some(f => (typeof f === 'string' ? f === selectedStation.id : f.id === selectedStation.id))}
          isProviderFavorite={favorites.providers.includes(selectedStation.provider)}
          toggleFavorite={() => toggleFavorite(selectedStation)}
          toggleProviderFavorite={() => toggleProviderFavorite(selectedStation.provider)}
          apiKey={apiKey}
          navApp={navApp}
          onRefreshed={(fresh) => {
            setSyncedStations(prev => ({ ...prev, [fresh.id]: fresh }));
            setSelectedStation(prev => prev ? { ...prev, ...fresh } : prev);
          }}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

export default FavoritesView;
