import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SlidersHorizontal, Navigation, Search, AlertCircle, List, Map, Route, RefreshCw, ExternalLink, BatteryCharging, Home, Briefcase, MapPin } from 'lucide-react';
import StationCard from './StationCard';
import StationDetail from './StationDetail';
import MapView from './MapView';
import AddressAutocomplete from './AddressAutocomplete';
import ProviderExclude from './ProviderExclude';
import { fetchStations, geocodeAddress } from '../services/api';

const StationsList = ({
  apiKey, favorites, toggleFavorite, toggleProviderFavorite, onOpenSettings,
  mapStyle, prefs, state, setState, stations, setStations,
  userLocation, setUserLocation, autoLocate, sendToRoute
}) => {
  const [selectedStation, setSelectedStation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const autoTriggered = useRef(false);

  const update = (patch) => setState(prev => ({ ...prev, ...patch }));

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (state.filterProvider !== 'All') n++;
    if (state.filterFavorites) n++;
    if (state.filterAvailable) n++;
    if (state.filterInRange) n++;
    if (state.minDistance) n++;
    if (state.maxDistance) n++;
    if (state.minPowerKW > 0) n++;
    if (state.excludedProviders && state.excludedProviders.length) n++;
    return n;
  }, [state]);

  const clearFilters = () => update({
    filterProvider: 'All', filterFavorites: false, filterAvailable: false,
    filterInRange: false, minDistance: '', maxDistance: '',
    minPowerKW: 0, excludedProviders: []
  });

  const handleRefresh = () => {
    if (state.mapCenter) loadStationsForLocation(state.mapCenter[0], state.mapCenter[1], state.searchedLocationName);
  };

  const providers = useMemo(() => {
    const pSet = new Set(stations.map(s => s.provider));
    return Array.from(pSet).sort();
  }, [stations]);

  const loadStationsForLocation = async (lat, lng, locationName) => {
    if (!apiKey) { setError('NO_API_KEY'); return; }
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchStations(lat, lng, apiKey, prefs.defaultRadius || 15);
      setStations(data);
      update({
        searchedLocationName: locationName || `${lat.toFixed(3)}, ${lng.toFixed(3)}`,
        mapCenter: [lat, lng]
      });
    } catch (err) {
      setError(err.message === 'NO_API_KEY' || err.message === 'INVALID_API_KEY' ? 'INVALID_API_KEY' : 'FETCH_ERROR');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchAddress = async () => {
    if (!state.locationInput?.trim()) return;
    // Try suggestions first via fallback geocode (autocomplete already sets coords if user selected).
    setIsLoading(true);
    setError(null);
    setUserLocation(null);
    const coords = await geocodeAddress(state.locationInput);
    if (coords) {
      await loadStationsForLocation(coords.lat, coords.lng, coords.name);
    } else {
      setError('NOT_FOUND');
      setIsLoading(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) { setError('GEO_NOT_SUPPORTED'); return; }
    setIsLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserLocation([lat, lng]);
        loadStationsForLocation(lat, lng, "Mein Standort");
      },
      () => {
        setError('GEO_DENIED');
        setIsLoading(false);
      }
    );
  };

  // Auto-locate on first mount if user enabled it
  useEffect(() => {
    if (autoLocate && !autoTriggered.current && !state.searchedLocationName) {
      autoTriggered.current = true;
      handleUseCurrentLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLocate]);

  const processedStations = useMemo(() => {
    let result = [...stations];

    if (state.filterProvider !== 'All') result = result.filter(s => s.provider === state.filterProvider);
    if (state.filterFavorites) result = result.filter(s => favorites.stations.some(f => (typeof f === 'string' ? f === s.id : f.id === s.id)) || favorites.providers.includes(s.provider));
    if (state.filterAvailable) result = result.filter(s => s.availableSpots > 0);
    if (state.filterInRange && prefs.currentRangeKm > 0) {
      const reachable = prefs.currentRangeKm / 1.3;
      result = result.filter(s => parseFloat(s.distance) <= reachable);
    }

    const effectiveMinPower = Math.max(prefs.minPowerKW || 0, state.minPowerKW || 0);
    if (effectiveMinPower > 0) result = result.filter(s => (s.powerKW || 0) >= effectiveMinPower);
    if (prefs.onlyOperational) result = result.filter(s => s.isOperational !== false);
    if (prefs.preferredConnectors && prefs.preferredConnectors.length > 0) {
      result = result.filter(s => s.connectorTypes && s.connectorTypes.some(t => prefs.preferredConnectors.some(pc => t.toLowerCase().includes(pc.toLowerCase().split(' ')[0]))));
    }
    if (state.excludedProviders && state.excludedProviders.length > 0) {
      result = result.filter(s => !state.excludedProviders.includes(s.provider));
    }

    if (state.minDistance !== '' && !isNaN(parseFloat(state.minDistance))) {
      const m = parseFloat(state.minDistance);
      result = result.filter(s => parseFloat(s.distance) >= m);
    }
    if (state.maxDistance !== '' && !isNaN(parseFloat(state.maxDistance))) {
      const m = parseFloat(state.maxDistance);
      result = result.filter(s => parseFloat(s.distance) <= m);
    }

    result.sort((a, b) => {
      const aFav = favorites.stations.some(f => (typeof f === 'string' ? f === a.id : f.id === a.id)) || favorites.providers.includes(a.provider) ? 1 : 0;
      const bFav = favorites.stations.some(f => (typeof f === 'string' ? f === b.id : f.id === b.id)) || favorites.providers.includes(b.provider) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      if (state.sortBy === 'distance') return parseFloat(a.distance) - parseFloat(b.distance);
      if (state.sortBy === 'price') return a.price === 'k.A.' ? 1 : -1;
      if (state.sortBy === 'power') return (b.powerKW || 0) - (a.powerKW || 0);
      return 0;
    });

    return result;
  }, [stations, state.sortBy, state.filterProvider, state.filterFavorites, state.filterAvailable, state.minDistance, state.maxDistance, favorites, prefs]);

  return (
    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>

      <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
            <Search size={18} color="var(--accent-primary)" />
            <span style={{ fontWeight: 600 }}>Standort oder Adresse</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <AddressAutocomplete
              value={state.locationInput}
              onChange={(v) => update({ locationInput: v })}
              onSelect={(s) => loadStationsForLocation(s.lat, s.lng, s.label)}
              onEnter={handleSearchAddress}
              placeholder="Z.B. 'München' oder Postleitzahl"
            />
            <button className="btn-secondary" style={{ padding: '0.75rem' }} onClick={handleSearchAddress} disabled={isLoading} title="Suchen">
              <Search size={18} />
            </button>
            {state.mapCenter && (
              <button className="btn-secondary" style={{ padding: '0.75rem' }} onClick={handleRefresh} disabled={isLoading} title="Erneut laden">
                <RefreshCw size={18} className={isLoading ? 'spin' : ''} />
              </button>
            )}
            <button className="btn-primary" style={{ padding: '0.75rem' }} onClick={handleUseCurrentLocation} disabled={isLoading} title="Mein Standort">
              <Navigation size={18} />
            </button>
          </div>

          {prefs.savedPlaces && prefs.savedPlaces.length > 0 && (
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              {prefs.savedPlaces.map(p => {
                const Icon = p.id === 'home' ? Home : p.id === 'work' ? Briefcase : MapPin;
                return (
                  <button
                    key={p.id}
                    onClick={() => { update({ locationInput: p.label }); loadStationsForLocation(p.lat, p.lng, p.label); }}
                    className="btn-secondary"
                    style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    title={p.label}
                  >
                    <Icon size={12} /> {p.name}
                  </button>
                );
              })}
            </div>
          )}

          {state.searchedLocationName && (
            <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Aktuell: {state.searchedLocationName.split(',')[0]}</span>
              <button
                onClick={() => sendToRoute && sendToRoute(state.searchedLocationName, null)}
                className="btn-secondary"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                title="Als Start im Routenplaner übernehmen"
              >
                <Route size={12} /> Als Start verwenden
              </button>
            </div>
          )}
        </div>

        <div style={{ height: '1px', background: 'var(--border-color)' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <SlidersHorizontal size={18} color="var(--accent-primary)" />
            <span style={{ fontWeight: 600 }}>Filter & Ansicht</span>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="badge badge-power" style={{ border: 'none', cursor: 'pointer' }} title="Filter zurücksetzen">
                {activeFilterCount} aktiv ✕
              </button>
            )}
          </div>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '2px' }}>
            <button onClick={() => update({ viewMode: 'list' })} style={{ background: state.viewMode === 'list' ? 'var(--accent-primary)' : 'transparent', color: state.viewMode === 'list' ? 'white' : 'var(--text-secondary)', border: 'none', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer' }}>
              <List size={16} />
            </button>
            <button onClick={() => update({ viewMode: 'map' })} style={{ background: state.viewMode === 'map' ? 'var(--accent-primary)' : 'transparent', color: state.viewMode === 'map' ? 'white' : 'var(--text-secondary)', border: 'none', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer' }}>
              <Map size={16} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select className="input-field" value={state.sortBy} onChange={(e) => update({ sortBy: e.target.value })} style={{ flex: '1 1 120px', padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
            <option value="distance">Entfernung</option>
            <option value="price">Preis</option>
            <option value="power">Leistung</option>
          </select>
          <select className="input-field" value={state.filterProvider} onChange={(e) => update({ filterProvider: e.target.value })} style={{ flex: '1 1 120px', padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
            <option value="All">Alle Anbieter</option>
            {providers.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Von km</span>
            <input type="number" min={0} placeholder="0" value={state.minDistance} onChange={(e) => update({ minDistance: e.target.value })} style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '0.875rem' }} />
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Bis km</span>
            <input type="number" min={0} placeholder="∞" value={state.maxDistance} onChange={(e) => update({ maxDistance: e.target.value })} style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '0.875rem' }} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Min. Leistung</span>
          <input type="range" min={0} max={350} step={11} value={state.minPowerKW || 0} onChange={(e) => update({ minPowerKW: parseInt(e.target.value) })} style={{ flex: 1, accentColor: 'var(--accent-primary)' }} />
          <strong style={{ color: 'var(--accent-primary)', minWidth: 56, textAlign: 'right' }}>{state.minPowerKW > 0 ? `${state.minPowerKW} kW` : 'beliebig'}</strong>
        </div>

        <ProviderExclude
          allProviders={providers}
          excluded={state.excludedProviders || []}
          onChange={(arr) => update({ excludedProviders: arr })}
        />

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={state.filterAvailable} onChange={(e) => update({ filterAvailable: e.target.checked })} style={{ accentColor: 'var(--accent-primary)', width: 16, height: 16 }} />
            Nur Verfügbare
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={state.filterFavorites} onChange={(e) => update({ filterFavorites: e.target.checked })} style={{ accentColor: 'var(--accent-danger)', width: 16, height: 16 }} />
            Nur Favoriten
          </label>
          {prefs.currentRangeKm > 0 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', color: 'var(--accent-success)' }} title={`Filtert auf ~${Math.round(prefs.currentRangeKm/1.3)} km Luftlinie`}>
              <input type="checkbox" checked={!!state.filterInRange} onChange={(e) => update({ filterInRange: e.target.checked })} style={{ accentColor: 'var(--accent-success)', width: 16, height: 16 }} />
              <BatteryCharging size={14} /> In Reichweite ({prefs.currentRangeKm} km)
            </label>
          )}
        </div>
      </div>

      {error && (
        <div className="glass-panel" style={{ padding: '1rem', border: '1px solid var(--accent-danger)', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-danger)', fontWeight: 600 }}>
            <AlertCircle size={18} />
            {error === 'NOT_FOUND' && "Adresse nicht gefunden — versuch einen Vorschlag aus der Liste"}
            {error === 'GEO_DENIED' && "Standortzugriff verweigert"}
            {error === 'NO_API_KEY' && "Kein API-Key hinterlegt"}
            {error === 'INVALID_API_KEY' && "API-Key ungültig"}
            {error === 'FETCH_ERROR' && "Fehler beim Laden"}
            {error === 'GEO_NOT_SUPPORTED' && "Standort wird nicht unterstützt"}
          </div>
          {(error === 'NO_API_KEY' || error === 'INVALID_API_KEY') && (
            <button className="btn-primary" onClick={onOpenSettings} style={{ alignSelf: 'flex-start', padding: '0.5rem 1rem', fontSize: '0.875rem' }}>Key eintragen</button>
          )}
        </div>
      )}

      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
          <div style={{ width: 40, height: 40, border: '3px solid rgba(0, 210, 255, 0.2)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      )}

      {!isLoading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem' }}>
          {state.searchedLocationName ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {processedStations.length} Stationen nahe <strong style={{ color: 'var(--text-primary)' }}>{state.searchedLocationName.split(',')[0]}</strong>
              </span>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <Navigation size={48} style={{ opacity: 0.2 }} />
              <p>Suche nach einer Adresse oder nutze deinen Standort.</p>
              {!apiKey && (
                <div style={{ fontSize: '0.8rem', maxWidth: 360 }}>
                  Du brauchst einen kostenlosen OpenChargeMap-Key.
                  <br />
                  <a href="https://openchargemap.org/site/profile/applications" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
                    Hier kostenlos erstellen <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>
          )}

          {state.searchedLocationName && state.viewMode === 'list' && processedStations.map((station, index) => (
            <StationCard
              key={station.id}
              station={station}
              isFavorite={favorites.stations.some(f => (typeof f === 'string' ? f === station.id : f.id === station.id))}
              isProviderFavorite={favorites.providers.includes(station.provider)}
              toggleFavorite={() => toggleFavorite(station)}
              onClick={() => setSelectedStation(station)}
              index={index}
            />
          ))}

          {state.searchedLocationName && state.viewMode === 'map' && (
            <MapView
              stations={processedStations}
              favorites={favorites}
              center={state.mapCenter}
              userLocation={userLocation}
              onStationSelect={(station) => setSelectedStation(station)}
              mapStyle={mapStyle}
            />
          )}
        </div>
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
          onRefreshed={(fresh) => {
            setStations(prev => prev.map(s => s.id === fresh.id ? { ...s, ...fresh } : s));
            setSelectedStation(prev => prev ? { ...prev, ...fresh } : prev);
          }}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>
    </div>
  );
};

export default StationsList;
