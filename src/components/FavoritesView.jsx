import React, { useState, useMemo } from 'react';
import { Heart, List, Map, RefreshCw, Trash2, AlertCircle, Search } from 'lucide-react';
import StationCard from './StationCard';
import StationDetail from './StationDetail';
import MapView from './MapView';
import { fetchStationById } from '../services/api';

const FavoritesView = ({ apiKey, favorites, toggleFavorite, toggleProviderFavorite, mapStyle, navApp }) => {
  const [viewMode, setViewMode] = useState('list');
  const [selectedStation, setSelectedStation] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [syncedStations, setSyncedStations] = useState({});
  const [search, setSearch] = useState('');

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
    if (favoriteStations.length === 0) return null;
    const lat = favoriteStations.reduce((s, x) => s + (x.lat || 0), 0) / favoriteStations.length;
    const lng = favoriteStations.reduce((s, x) => s + (x.lng || 0), 0) / favoriteStations.length;
    return [lat, lng];
  }, [favoriteStations]);

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

  return (
    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>

      <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Heart size={18} color="var(--accent-danger)" fill="var(--accent-danger)" />
            <span style={{ fontWeight: 600 }}>Favoriten ({favoriteStations.length})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button className="btn-secondary" onClick={handleSyncOCM} disabled={isSyncing || favoriteStations.length === 0} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <RefreshCw size={14} className={isSyncing ? 'spin' : ''} /> {isSyncing ? 'Syncing…' : 'Mit OCM abgleichen'}
            </button>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 2 }}>
              <button onClick={() => setViewMode('list')} style={{ background: viewMode === 'list' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'list' ? 'white' : 'var(--text-secondary)', border: 'none', padding: '0.5rem', borderRadius: 6, cursor: 'pointer' }}><List size={16} /></button>
              <button onClick={() => setViewMode('map')} style={{ background: viewMode === 'map' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'map' ? 'white' : 'var(--text-secondary)', border: 'none', padding: '0.5rem', borderRadius: 6, cursor: 'pointer' }}><Map size={16} /></button>
            </div>
          </div>
        </div>

        {favoriteStations.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.25rem 0.5rem', borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <Search size={14} color="var(--text-muted)" />
            <input type="text" placeholder="Favorit durchsuchen…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '0.875rem', padding: '0.5rem 0' }} />
          </div>
        )}

        {favorites.providers.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>Lieblings-Anbieter</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {favorites.providers.map(p => (
                <span key={p} className="badge" style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--accent-danger)', textTransform: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {p}
                  <button onClick={() => toggleProviderFavorite(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--accent-danger)' }}>
                    <Trash2 size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {syncError && (
        <div className="glass-panel" style={{ padding: '0.75rem 1rem', border: '1px solid var(--accent-danger)', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-danger)' }}>
          <AlertCircle size={16} />
          {syncError === 'NO_API_KEY' ? 'Kein API-Key — Abgleich nicht möglich.' : 'API-Key ungültig.'}
        </div>
      )}

      {favoriteStations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <Heart size={48} style={{ opacity: 0.2 }} />
          <p>Noch keine Favoriten. Tippe in einer Suche auf das Herz, um Stationen hier zu sammeln.</p>
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
      )}

      {selectedStation && (
        <StationDetail
          station={selectedStation}
          onClose={() => setSelectedStation(null)}
          isFavorite={true}
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
