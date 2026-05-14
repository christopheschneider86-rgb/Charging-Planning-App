import React, { useState, useMemo } from 'react';
import { Route, Battery, Compass, ArrowRight, Play, AlertCircle, Navigation, Map, List, SlidersHorizontal } from 'lucide-react';
import StationCard from './StationCard';
import StationDetail from './StationDetail';
import MapView from './MapView';
import { geocodeAddress, fetchStations } from '../services/api';

// Helper for Haversine distance
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1); 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; 
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

const RoutePlanner = ({ apiKey, favorites, toggleFavorite, onOpenSettings }) => {
  const [start, setStart] = useState('');
  const [destination, setDestination] = useState('');
  const [preference, setPreference] = useState('eco');
  const [range, setRange] = useState(250);
  const [deviation, setDeviation] = useState(5);
  
  const [isPlanning, setIsPlanning] = useState(false);
  const [routeStations, setRouteStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [error, setError] = useState(null);

  const [startLocationCoords, setStartLocationCoords] = useState(null);
  const [routeLine, setRouteLine] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'

  // Filter States
  const [sortBy, setSortBy] = useState('distance'); 
  const [filterProvider, setFilterProvider] = useState('All');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [filterAvailable, setFilterAvailable] = useState(false);
  const [minDistance, setMinDistance] = useState('');
  const [maxDistance, setMaxDistance] = useState('');

  const providers = useMemo(() => {
    const pSet = new Set(routeStations.map(s => s.provider));
    return Array.from(pSet).sort();
  }, [routeStations]);

  const processedStations = useMemo(() => {
    let result = routeStations.map(station => {
      // If we have a route line (start point), calculate distance from start
      let distFromStart = 0;
      if (routeLine && routeLine[0]) {
        distFromStart = getDistanceFromLatLonInKm(routeLine[0][0], routeLine[0][1], station.lat, station.lng);
      }
      return { ...station, distanceFromStart: distFromStart };
    });

    if (filterProvider !== 'All') result = result.filter(s => s.provider === filterProvider);
    if (filterFavorites) result = result.filter(s => favorites.stations.includes(s.id) || favorites.providers.includes(s.provider));
    if (filterAvailable) result = result.filter(s => s.availableSpots > 0);
    
    if (minDistance !== '') {
      const min = parseFloat(minDistance);
      if (!isNaN(min)) result = result.filter(s => s.distanceFromStart >= min);
    }
    if (maxDistance !== '') {
      const max = parseFloat(maxDistance);
      if (!isNaN(max)) result = result.filter(s => s.distanceFromStart <= max);
    }

    result.sort((a, b) => {
      const aFav = favorites.stations.includes(a.id) || favorites.providers.includes(a.provider) ? 1 : 0;
      const bFav = favorites.stations.includes(b.id) || favorites.providers.includes(b.provider) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      
      if (sortBy === 'distance') return a.distanceFromStart - b.distanceFromStart;
      if (sortBy === 'price') return a.price === 'k.A.' ? 1 : -1;
      if (sortBy === 'power') return parseInt(b.power || 0) - parseInt(a.power || 0);
      return 0;
    });

    return result;
  }, [routeStations, sortBy, filterProvider, filterFavorites, filterAvailable, minDistance, maxDistance, favorites, routeLine]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('GEO_NOT_SUPPORTED');
      return;
    }
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStartLocationCoords([position.coords.latitude, position.coords.longitude]);
        setStart("Mein Standort");
      },
      (err) => {
        setError('GEO_DENIED');
      }
    );
  };

  const handlePlanRoute = async (e) => {
    e.preventDefault();
    if (!start || !destination) return;
    if (!apiKey) {
      setError('NO_API_KEY');
      return;
    }
    
    setIsPlanning(true);
    setError(null);
    setRouteStations([]);
    setRouteLine(null);
    
    try {
      let startCoords = null;
      if (start === "Mein Standort" && startLocationCoords) {
        startCoords = { lat: startLocationCoords[0], lng: startLocationCoords[1] };
      } else {
        startCoords = await geocodeAddress(start);
      }
      
      const destCoords = await geocodeAddress(destination);

      if (!startCoords || !destCoords) {
        setError('GEO_FAILED');
        setIsPlanning(false);
        return;
      }

      setRouteLine([[startCoords.lat, startCoords.lng], [destCoords.lat, destCoords.lng]]);

      // Find midpoint and search stations there.
      const midLat = (startCoords.lat + destCoords.lat) / 2;
      const midLng = (startCoords.lng + destCoords.lng) / 2;

      // Fetch stations near the midpoint
      const stations = await fetchStations(midLat, midLng, apiKey, Math.max(15, deviation));
      
      if (stations.length === 0) {
        setError('NO_STATIONS');
      } else {
        setRouteStations(stations);
      }
      
    } catch (err) {
      if (err.message === 'INVALID_API_KEY' || err.message === 'NO_API_KEY') {
        setError('INVALID_API_KEY');
      } else {
        setError('FETCH_ERROR');
      }
    } finally {
      setIsPlanning(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      
      <form onSubmit={handlePlanRoute} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Route size={20} color="var(--accent-primary)" /> Strecke planen
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '11px', top: '24px', bottom: '24px', width: '2px', background: 'var(--border-color)', zIndex: 0 }}></div>
          
          <div className="input-group" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative', zIndex: 1 }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 0 4px var(--bg-secondary)' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }}></div>
            </div>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Startadresse (z.B. Berlin)" 
              value={start}
              onChange={(e) => {
                setStart(e.target.value);
                if (e.target.value !== "Mein Standort") setStartLocationCoords(null);
              }}
              required
            />
            <button type="button" className="btn-secondary" style={{ padding: '0.75rem' }} onClick={handleUseCurrentLocation} title="Meinen Standort verwenden">
              <Navigation size={18} />
            </button>
          </div>
          
          <div className="input-group" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative', zIndex: 1 }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 0 4px var(--bg-secondary)' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }}></div>
            </div>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Zieladresse (z.B. München)" 
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
            />
          </div>
        </div>

        <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem', width: '100%' }} disabled={isPlanning}>
          {isPlanning ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="spinner" style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
              Berechne Route...
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Route berechnen <ArrowRight size={18} />
            </span>
          )}
        </button>
      </form>

      {error && (
        <div className="glass-panel" style={{ padding: '1rem', border: '1px solid var(--accent-danger)', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-danger)', fontWeight: 600 }}>
            <AlertCircle size={18} />
            {error === 'GEO_FAILED' && "Start- oder Zieladresse nicht gefunden"}
            {error === 'NO_STATIONS' && "Keine Stationen auf dieser Route gefunden"}
            {error === 'NO_API_KEY' && "Kein API-Key hinterlegt"}
            {error === 'INVALID_API_KEY' && "API-Key ungültig"}
            {error === 'FETCH_ERROR' && "Fehler beim Laden"}
            {error === 'GEO_DENIED' && "Standortzugriff verweigert"}
            {error === 'GEO_NOT_SUPPORTED' && "Standort wird nicht unterstützt"}
          </div>
          {(error === 'NO_API_KEY' || error === 'INVALID_API_KEY') && (
            <button className="btn-primary" onClick={onOpenSettings} style={{ alignSelf: 'flex-start', padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
              Key eintragen
            </button>
          )}
        </div>
      )}

      {routeStations.length > 0 && !isPlanning && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem' }} className="animate-fade-in">
          
          {/* Filters */}
          <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <SlidersHorizontal size={18} color="var(--accent-primary)" />
                <span style={{ fontWeight: 600 }}>Filter & Ansicht</span>
              </div>
              
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '2px' }}>
                <button 
                  onClick={() => setViewMode('list')}
                  style={{ background: viewMode === 'list' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'list' ? 'white' : 'var(--text-secondary)', border: 'none', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <List size={16} />
                </button>
                <button 
                  onClick={() => setViewMode('map')}
                  style={{ background: viewMode === 'map' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'map' ? 'white' : 'var(--text-secondary)', border: 'none', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <Map size={16} />
                </button>
              </div>
            </div>

            {viewMode === 'list' && (
              <>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 auto', minWidth: '120px' }}>
                    <select className="input-field" value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                      <option value="distance">Entfernung vom Start</option>
                      <option value="price">Preis</option>
                      <option value="power">Leistung</option>
                    </select>
                  </div>
                  <div style={{ flex: '1 1 auto', minWidth: '120px' }}>
                    <select className="input-field" value={filterProvider} onChange={(e) => setFilterProvider(e.target.value)} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                      <option value="All">Alle Anbieter</option>
                      {providers.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Von km</span>
                    <input 
                      type="number" 
                      placeholder="0" 
                      value={minDistance} 
                      onChange={(e) => setMinDistance(e.target.value)} 
                      style={{ width: '100%', background: 'transparent', border: 'none', color: 'white', outline: 'none', fontSize: '0.875rem' }} 
                    />
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Bis km</span>
                    <input 
                      type="number" 
                      placeholder="∞" 
                      value={maxDistance} 
                      onChange={(e) => setMaxDistance(e.target.value)} 
                      style={{ width: '100%', background: 'transparent', border: 'none', color: 'white', outline: 'none', fontSize: '0.875rem' }} 
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={filterAvailable} onChange={(e) => setFilterAvailable(e.target.checked)} style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }} />
                    Nur Verfügbare
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={filterFavorites} onChange={(e) => setFilterFavorites(e.target.checked)} style={{ accentColor: 'var(--accent-danger)', width: '16px', height: '16px' }} />
                    Nur Favoriten
                  </label>
                </div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Play size={18} color="var(--accent-success)" /> Ladestopps ({processedStations.length})
            </h3>
          </div>
          
          {viewMode === 'list' ? (
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '0.5rem' }}>
              <div style={{ position: 'absolute', left: '20px', top: '30px', bottom: '30px', width: '2px', background: 'var(--border-color)', zIndex: 0, borderStyle: 'dashed' }}></div>
              
              {processedStations.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>Keine Ladesäulen für diese Filter gefunden.</div>
              ) : (
                processedStations.map((station, index) => (
                  <div key={station.id} style={{ display: 'flex', gap: '1rem', position: 'relative', zIndex: 1 }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-secondary)', border: '2px solid var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                      {index + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <StationCard 
                        station={station} 
                        isFavorite={favorites.stations.includes(station.id)}
                        isProviderFavorite={favorites.providers.includes(station.provider)}
                        toggleFavorite={() => toggleFavorite(station.id)}
                        onClick={() => setSelectedStation(station)}
                        index={index}
                        distanceLabel={`${station.distanceFromStart.toFixed(1)} km vom Start`}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <MapView 
              stations={processedStations} 
              favorites={favorites}
              center={routeLine ? [(routeLine[0][0] + routeLine[1][0])/2, (routeLine[0][1] + routeLine[1][1])/2] : null}
              routeLine={routeLine}
              userLocation={startLocationCoords}
              onStationSelect={(station) => setSelectedStation(station)}
            />
          )}

        </div>
      )}

      {selectedStation && (
        <StationDetail 
          station={selectedStation} 
          onClose={() => setSelectedStation(null)}
          isFavorite={favorites.stations.includes(selectedStation.id)}
          isProviderFavorite={favorites.providers.includes(selectedStation.provider)}
          toggleFavorite={() => toggleFavorite(selectedStation.id)}
          toggleProviderFavorite={() => toggleFavorite(selectedStation.provider)}
        />
      )}
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default RoutePlanner;
