import React, { useState, useMemo } from 'react';
import { Route, ArrowRight, Play, AlertCircle, Navigation, Map, List, SlidersHorizontal, Clock, Zap as ZapIcon, BatteryCharging, Home, Briefcase, MapPin, Car, Battery, BatteryWarning, Save, Bookmark, Trash2 } from 'lucide-react';
import StationCard from './StationCard';
import StationDetail from './StationDetail';
import MapView from './MapView';
import AddressAutocomplete from './AddressAutocomplete';
import ProviderExclude from './ProviderExclude';
import { geocodeAddress, fetchRoute, fetchStationsAlongRoute } from '../services/api';

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// SoC remaining at distance D from start, given vehicle and safety reserve.
// Returns null if no vehicle. Result is a percentage 0..100 (can be negative).
const computeSoCAt = (distKm, startSoC, vehicle, safetyKm) => {
  if (!vehicle || !vehicle.batteryKWh || !vehicle.consumptionKWh100) return null;
  const usableDistance = Math.max(0, distKm - 0); // safety applied in display later
  const kwhUsed = (usableDistance * vehicle.consumptionKWh100) / 100;
  const socUsed = (kwhUsed / vehicle.batteryKWh) * 100;
  return startSoC - socUsed;
};

const socColor = (soc, safetySoc) => {
  if (soc == null) return 'var(--text-muted)';
  if (soc < safetySoc) return 'var(--accent-danger)';
  if (soc < safetySoc + 15) return 'var(--accent-warning)';
  return 'var(--accent-success)';
};

const RoutePlanner = ({
  apiKey, favorites, toggleFavorite, toggleProviderFavorite, onOpenSettings,
  mapStyle, prefs, state, setState, data, setData, setActiveVehicleId,
  addSavedRoute, removeSavedRoute
}) => {
  const [isPlanning, setIsPlanning] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [error, setError] = useState(null);
  const [startCoordsCached, setStartCoordsCached] = useState(null);
  const [destCoordsCached, setDestCoordsCached] = useState(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [routeNameDraft, setRouteNameDraft] = useState('');

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

  const providers = useMemo(() => {
    const pSet = new Set((data.stations || []).map(s => s.provider));
    return Array.from(pSet).sort();
  }, [data.stations]);

  const processedStations = useMemo(() => {
    let result = (data.stations || []).map(station => {
      let distFromStart = 0;
      if (data.startCoords) {
        distFromStart = getDistanceFromLatLonInKm(data.startCoords.lat, data.startCoords.lng, station.lat, station.lng);
      }
      return { ...station, distanceFromStart: distFromStart };
    });

    if (state.filterProvider !== 'All') result = result.filter(s => s.provider === state.filterProvider);
    if (state.filterFavorites) result = result.filter(s => favorites.stations.some(f => (typeof f === 'string' ? f === s.id : f.id === s.id)) || favorites.providers.includes(s.provider));
    if (state.filterAvailable) result = result.filter(s => s.availableSpots > 0);
    if (state.filterInRange && prefs.currentRangeKm > 0) {
      const reachable = prefs.currentRangeKm / 1.3;
      result = result.filter(s => s.distanceFromStart <= reachable);
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
      result = result.filter(s => s.distanceFromStart >= m);
    }
    if (state.maxDistance !== '' && !isNaN(parseFloat(state.maxDistance))) {
      const m = parseFloat(state.maxDistance);
      result = result.filter(s => s.distanceFromStart <= m);
    }

    result.sort((a, b) => {
      const aFav = favorites.stations.some(f => (typeof f === 'string' ? f === a.id : f.id === a.id)) || favorites.providers.includes(a.provider) ? 1 : 0;
      const bFav = favorites.stations.some(f => (typeof f === 'string' ? f === b.id : f.id === b.id)) || favorites.providers.includes(b.provider) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      if (state.sortBy === 'distance') return a.distanceFromStart - b.distanceFromStart;
      if (state.sortBy === 'price') return a.price === 'k.A.' ? 1 : -1;
      if (state.sortBy === 'power') return (b.powerKW || 0) - (a.powerKW || 0);
      return 0;
    });

    return result;
  }, [data.stations, data.startCoords, state.sortBy, state.filterProvider, state.filterFavorites, state.filterAvailable, state.minDistance, state.maxDistance, favorites, prefs]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) { setError('GEO_NOT_SUPPORTED'); return; }
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStartCoordsCached({ lat: position.coords.latitude, lng: position.coords.longitude });
        update({ start: 'Mein Standort' });
      },
      () => setError('GEO_DENIED')
    );
  };

  const resolveCoords = async (text, cached) => {
    if (text === 'Mein Standort' && cached) return cached;
    if (cached && cached.label === text) return cached;
    return await geocodeAddress(text);
  };

  const handlePlanRoute = async (e) => {
    e.preventDefault();
    if (!state.start || !state.destination) return;
    if (!apiKey) { setError('NO_API_KEY'); return; }

    setIsPlanning(true);
    setError(null);
    setData({ stations: [], polyline: null, startCoords: null, destCoords: null, distanceKm: 0, durationMin: 0 });

    try {
      const startCoords = await resolveCoords(state.start, startCoordsCached);
      const destCoords = await resolveCoords(state.destination, destCoordsCached);

      if (!startCoords) { setError('START_NOT_FOUND'); setIsPlanning(false); return; }
      if (!destCoords) { setError('DEST_NOT_FOUND'); setIsPlanning(false); return; }

      const route = await fetchRoute(startCoords, destCoords);
      const polyline = route ? route.coords : [[startCoords.lat, startCoords.lng], [destCoords.lat, destCoords.lng]];

      const stations = await fetchStationsAlongRoute(polyline, apiKey, state.corridorKm || 5);

      setData({
        stations,
        polyline,
        startCoords,
        destCoords,
        distanceKm: route ? route.distanceKm : getDistanceFromLatLonInKm(startCoords.lat, startCoords.lng, destCoords.lat, destCoords.lng),
        durationMin: route ? route.durationMin : 0
      });

      if (stations.length === 0) setError('NO_STATIONS');
    } catch (err) {
      setError(err.message === 'INVALID_API_KEY' || err.message === 'NO_API_KEY' ? 'INVALID_API_KEY' : 'FETCH_ERROR');
    } finally {
      setIsPlanning(false);
    }
  };

  const dotStart = <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 0 4px var(--bg-secondary)' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} /></div>;
  const dotDest = <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 0 4px var(--bg-secondary)' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} /></div>;

  return (
    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>

      <form onSubmit={handlePlanRoute} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Route size={20} color="var(--accent-primary)" /> Strecke planen
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 11, top: 24, bottom: 24, width: 2, background: 'var(--border-color)', zIndex: 0 }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <AddressAutocomplete
              value={state.start}
              onChange={(v) => { update({ start: v }); if (v !== 'Mein Standort') setStartCoordsCached(null); }}
              onSelect={(s) => { setStartCoordsCached({ lat: s.lat, lng: s.lng, label: s.label }); update({ start: s.label }); }}
              placeholder="Startadresse"
              required
              leftIcon={dotStart}
              rightSlot={(
                <button type="button" className="btn-secondary" style={{ padding: '0.75rem' }} onClick={handleUseCurrentLocation} title="Mein Standort">
                  <Navigation size={18} />
                </button>
              )}
            />
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <AddressAutocomplete
              value={state.destination}
              onChange={(v) => { update({ destination: v }); setDestCoordsCached(null); }}
              onSelect={(s) => { setDestCoordsCached({ lat: s.lat, lng: s.lng, label: s.label }); update({ destination: s.label }); }}
              placeholder="Zieladresse"
              required
              leftIcon={dotDest}
            />
          </div>
        </div>

        {prefs.savedPlaces && prefs.savedPlaces.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Schnellauswahl</span>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {prefs.savedPlaces.map(p => {
                const Icon = p.id === 'home' ? Home : p.id === 'work' ? Briefcase : MapPin;
                return (
                  <div key={p.id} style={{ display: 'flex', gap: 0, alignItems: 'stretch', borderRadius: 999, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                      <Icon size={12} /> {p.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setStartCoordsCached({ lat: p.lat, lng: p.lng, label: p.label }); update({ start: p.label }); }}
                      style={{ fontSize: '0.7rem', padding: '0.3rem 0.55rem', background: 'rgba(58,123,213,0.15)', color: 'var(--accent-secondary)', border: 'none', borderLeft: '1px solid var(--border-color)', cursor: 'pointer' }}
                      title="Als Start setzen"
                    >Start</button>
                    <button
                      type="button"
                      onClick={() => { setDestCoordsCached({ lat: p.lat, lng: p.lng, label: p.label }); update({ destination: p.label }); }}
                      style={{ fontSize: '0.7rem', padding: '0.3rem 0.55rem', background: 'rgba(0,210,255,0.15)', color: 'var(--accent-primary)', border: 'none', borderLeft: '1px solid var(--border-color)', cursor: 'pointer' }}
                      title="Als Ziel setzen"
                    >Ziel</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Korridor entlang der Route:</span>
          <input type="range" min={2} max={25} step={1} value={state.corridorKm || 5} onChange={(e) => update({ corridorKm: parseInt(e.target.value) })} style={{ flex: 1, accentColor: 'var(--accent-primary)' }} />
          <strong style={{ fontSize: '0.75rem', color: 'var(--accent-primary)' }}>±{state.corridorKm || 5} km</strong>
        </div>

        {prefs.vehicles && prefs.vehicles.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,210,255,0.04)', padding: '0.6rem 0.75rem', borderRadius: 10, border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Car size={14} color="var(--accent-primary)" />
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Fahrzeug</span>
              </div>
              <select
                className="input-field"
                value={prefs.activeVehicleId || ''}
                onChange={(e) => setActiveVehicleId(e.target.value || null)}
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', flex: 1, minWidth: 140 }}
              >
                <option value="">— kein Fahrzeug —</option>
                {prefs.vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            {prefs.activeVehicleId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Battery size={14} color="var(--accent-primary)" />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Start-Ladung:</span>
                <input type="range" min={5} max={100} step={5} value={state.startSoC ?? 80} onChange={(e) => update({ startSoC: parseInt(e.target.value) })} style={{ flex: 1, accentColor: 'var(--accent-primary)' }} />
                <strong style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', minWidth: 36, textAlign: 'right' }}>{state.startSoC ?? 80}%</strong>
              </div>
            )}
          </div>
        ) : (
          <button type="button" onClick={onOpenSettings} className="btn-secondary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', alignSelf: 'flex-start' }}>
            <Car size={14} /> Fahrzeug anlegen für SoC-Berechnung
          </button>
        )}

        {/* Saved routes */}
        {((prefs.savedRoutes && prefs.savedRoutes.length > 0) || (state.start && state.destination)) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Bookmark size={12} /> Gespeicherte Routen
              </span>
              {state.start && state.destination && !saveDialogOpen && (
                <button
                  type="button"
                  onClick={() => { setRouteNameDraft(''); setSaveDialogOpen(true); }}
                  className="btn-secondary"
                  style={{ padding: '0.25rem 0.55rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  title="Aktuelle Route speichern"
                >
                  <Save size={12} /> Speichern
                </button>
              )}
            </div>

            {saveDialogOpen && (
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', background: 'rgba(0,210,255,0.06)', padding: '0.4rem', borderRadius: 8, border: '1px dashed var(--border-color)' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Routenname (z.B. 'Berlin → München')"
                  value={routeNameDraft}
                  onChange={(e) => setRouteNameDraft(e.target.value)}
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', flex: 1 }}
                  autoFocus
                />
                <button
                  type="button"
                  className="btn-primary"
                  style={{ padding: '0.4rem 0.7rem', fontSize: '0.75rem' }}
                  disabled={!routeNameDraft.trim()}
                  onClick={() => {
                    if (!routeNameDraft.trim() || !addSavedRoute) return;
                    addSavedRoute({
                      name: routeNameDraft.trim(),
                      start: state.start,
                      destination: state.destination,
                      startCoords: startCoordsCached,
                      destCoords: destCoordsCached,
                      corridorKm: state.corridorKm || 5,
                      vehicleId: prefs.activeVehicleId || null,
                      startSoC: state.startSoC ?? 80
                    });
                    setSaveDialogOpen(false);
                    setRouteNameDraft('');
                  }}
                >Speichern</button>
                <button type="button" onClick={() => setSaveDialogOpen(false)} className="btn-icon" style={{ width: 28, height: 28 }}><Trash2 size={12} /></button>
              </div>
            )}

            {prefs.savedRoutes && prefs.savedRoutes.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                {prefs.savedRoutes.map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'stretch', borderRadius: 999, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (r.startCoords) setStartCoordsCached(r.startCoords);
                        if (r.destCoords) setDestCoordsCached(r.destCoords);
                        update({
                          start: r.start,
                          destination: r.destination,
                          corridorKm: r.corridorKm || 5,
                          startSoC: r.startSoC ?? 80
                        });
                        if (r.vehicleId && setActiveVehicleId) setActiveVehicleId(r.vehicleId);
                      }}
                      title={`${r.start} → ${r.destination}`}
                      style={{ background: 'transparent', color: 'var(--accent-primary)', border: 'none', padding: '0.3rem 0.65rem', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Bookmark size={12} /> {r.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSavedRoute && removeSavedRoute(r.id)}
                      title="Route löschen"
                      style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', borderLeft: '1px solid var(--border-color)', padding: '0.3rem 0.5rem', cursor: 'pointer' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={isPlanning}>
          {isPlanning ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              Berechne Route…
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Route berechnen <ArrowRight size={18} /></span>
          )}
        </button>
      </form>

      {error && (
        <div className="glass-panel" style={{ padding: '1rem', border: '1px solid var(--accent-danger)', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-danger)', fontWeight: 600 }}>
            <AlertCircle size={18} />
            {error === 'START_NOT_FOUND' && "Startadresse nicht gefunden — bitte Vorschlag aus der Liste wählen"}
            {error === 'DEST_NOT_FOUND' && "Zieladresse nicht gefunden — bitte Vorschlag aus der Liste wählen"}
            {error === 'NO_STATIONS' && "Keine Stationen auf dieser Route gefunden — Korridor erhöhen?"}
            {error === 'NO_API_KEY' && "Kein API-Key hinterlegt"}
            {error === 'INVALID_API_KEY' && "API-Key ungültig"}
            {error === 'FETCH_ERROR' && "Fehler beim Laden"}
            {error === 'GEO_DENIED' && "Standortzugriff verweigert"}
            {error === 'GEO_NOT_SUPPORTED' && "Standort wird nicht unterstützt"}
          </div>
          {(error === 'NO_API_KEY' || error === 'INVALID_API_KEY') && (
            <button className="btn-primary" onClick={onOpenSettings} style={{ alignSelf: 'flex-start', padding: '0.5rem 1rem', fontSize: '0.875rem' }}>Key eintragen</button>
          )}
        </div>
      )}

      {data.polyline && data.distanceKm > 0 && !isPlanning && (() => {
        const vehicle = prefs.vehicles?.find(v => v.id === prefs.activeVehicleId) || null;
        const safetyKm = prefs.safetyKm || 0;
        const safetySoc = vehicle ? (safetyKm * vehicle.consumptionKWh100 / 100 / vehicle.batteryKWh) * 100 : 0;
        const arrivalSoc = vehicle ? computeSoCAt(data.distanceKm, state.startSoC ?? 80, vehicle, safetyKm) : null;
        const needsCharge = vehicle && arrivalSoc != null && arrivalSoc < safetySoc;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="glass-panel" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-around', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Route size={16} color="var(--accent-primary)" />
                <span style={{ fontSize: '0.875rem' }}><strong>{data.distanceKm.toFixed(0)}</strong> km</span>
              </div>
              {data.durationMin > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={16} color="var(--accent-primary)" />
                  <span style={{ fontSize: '0.875rem' }}><strong>{Math.floor(data.durationMin/60)}h {Math.round(data.durationMin%60)}m</strong></span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ZapIcon size={16} color="var(--accent-primary)" />
                <span style={{ fontSize: '0.875rem' }}><strong>{data.stations.length}</strong> Stops</span>
              </div>
              {vehicle && arrivalSoc != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} title={`Berechnet mit ${vehicle.name}: ${vehicle.consumptionKWh100} kWh/100km`}>
                  <Battery size={16} color={socColor(arrivalSoc, safetySoc)} />
                  <span style={{ fontSize: '0.875rem' }}>
                    Ankunft <strong style={{ color: socColor(arrivalSoc, safetySoc) }}>{arrivalSoc.toFixed(0)}%</strong>
                  </span>
                </div>
              )}
            </div>
            {needsCharge && (
              <div className="glass-panel" style={{ padding: '0.6rem 0.85rem', border: '1px solid var(--accent-warning)', backgroundColor: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--accent-warning)' }}>
                <BatteryWarning size={16} />
                Reicht nicht bis ans Ziel — mindestens einmal unterwegs laden.
              </div>
            )}
          </div>
        );
      })()}

      {data.stations.length > 0 && !isPlanning && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem' }} className="animate-fade-in">

          <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 2 }}>
                <button onClick={() => update({ viewMode: 'list' })} style={{ background: state.viewMode === 'list' ? 'var(--accent-primary)' : 'transparent', color: state.viewMode === 'list' ? 'white' : 'var(--text-secondary)', border: 'none', padding: '0.5rem', borderRadius: 6, cursor: 'pointer' }}><List size={16} /></button>
                <button onClick={() => update({ viewMode: 'map' })} style={{ background: state.viewMode === 'map' ? 'var(--accent-primary)' : 'transparent', color: state.viewMode === 'map' ? 'white' : 'var(--text-secondary)', border: 'none', padding: '0.5rem', borderRadius: 6, cursor: 'pointer' }}><Map size={16} /></button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <select className="input-field" value={state.sortBy} onChange={(e) => update({ sortBy: e.target.value })} style={{ flex: '1 1 120px', padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                <option value="distance">Entfernung vom Start</option>
                <option value="price">Preis</option>
                <option value="power">Leistung</option>
              </select>
              <select className="input-field" value={state.filterProvider} onChange={(e) => update({ filterProvider: e.target.value })} style={{ flex: '1 1 120px', padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                <option value="All">Alle Anbieter</option>
                {providers.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.25rem 0.5rem', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Ab km</span>
                <input type="number" min={0} placeholder="0" value={state.minDistance} onChange={(e) => update({ minDistance: e.target.value })} style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '0.875rem' }} />
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.25rem 0.5rem', borderRadius: 8, border: '1px solid var(--border-color)' }}>
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
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', color: 'var(--accent-success)' }} title={`Filtert auf ~${Math.round(prefs.currentRangeKm/1.3)} km Luftlinie ab Start`}>
                  <input type="checkbox" checked={!!state.filterInRange} onChange={(e) => update({ filterInRange: e.target.checked })} style={{ accentColor: 'var(--accent-success)', width: 16, height: 16 }} />
                  <BatteryCharging size={14} /> In Reichweite ({prefs.currentRangeKm} km)
                </label>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Play size={18} color="var(--accent-success)" /> Ladestopps ({processedStations.length})
            </h3>
          </div>

          {state.viewMode === 'list' ? (
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ position: 'absolute', left: 20, top: 30, bottom: 30, width: 2, background: 'var(--border-color)', borderStyle: 'dashed' }} />
              {processedStations.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>Keine Ladesäulen für diese Filter.</div>
              ) : (() => {
                const vehicle = prefs.vehicles?.find(v => v.id === prefs.activeVehicleId) || null;
                const safetyKm = prefs.safetyKm || 0;
                const safetySoc = vehicle ? (safetyKm * vehicle.consumptionKWh100 / 100 / vehicle.batteryKWh) * 100 : 0;
                return processedStations.map((station, index) => {
                  const soc = vehicle ? computeSoCAt(station.distanceFromStart, state.startSoC ?? 80, vehicle, safetyKm) : null;
                  const color = socColor(soc, safetySoc);
                  const distLabel = `${station.distanceFromStart.toFixed(1)} km vom Start` + (soc != null ? ` · ~${soc.toFixed(0)}% Restladung` : '');
                  return (
                    <div key={station.id} style={{ display: 'flex', gap: '1rem', position: 'relative', zIndex: 1 }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-secondary)', border: `2px solid ${vehicle ? color : 'var(--accent-primary)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold', color: vehicle ? color : 'var(--accent-primary)' }}>
                        {index + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <StationCard
                          station={station}
                          isFavorite={favorites.stations.some(f => (typeof f === 'string' ? f === station.id : f.id === station.id))}
                          isProviderFavorite={favorites.providers.includes(station.provider)}
                          toggleFavorite={() => toggleFavorite(station)}
                          onClick={() => setSelectedStation(station)}
                          index={index}
                          distanceLabel={distLabel}
                        />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <MapView
              stations={processedStations}
              favorites={favorites}
              center={data.polyline && data.polyline.length > 0 ? data.polyline[Math.floor(data.polyline.length/2)] : null}
              routeLine={data.polyline}
              userLocation={null}
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
            setData(prev => ({ ...prev, stations: prev.stations.map(s => s.id === fresh.id ? { ...s, ...fresh } : s) }));
            setSelectedStation(prev => prev ? { ...prev, ...fresh } : prev);
          }}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default RoutePlanner;
