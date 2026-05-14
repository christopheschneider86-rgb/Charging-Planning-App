import React, { useState, useMemo } from 'react';
import { SlidersHorizontal, Navigation, Search, MapPin, AlertCircle, List, Map } from 'lucide-react';
import StationCard from './StationCard';
import StationDetail from './StationDetail';
import MapView from './MapView';
import { geocodeAddress, fetchStations } from '../services/api';

const StationsList = ({ apiKey, favorites, toggleFavorite, toggleProviderFavorite, onOpenSettings }) => {
  const [sortBy, setSortBy] = useState('distance'); 
  const [filterProvider, setFilterProvider] = useState('All');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [filterAvailable, setFilterAvailable] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  
  const [selectedStation, setSelectedStation] = useState(null);
  
  // Live API States
  const [locationInput, setLocationInput] = useState('');
  const [liveStations, setLiveStations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchedLocationName, setSearchedLocationName] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  const providers = useMemo(() => {
    const pSet = new Set(liveStations.map(s => s.provider));
    return Array.from(pSet).sort();
  }, [liveStations]);

  const loadStationsForLocation = async (lat, lng, locationName) => {
    if (!apiKey) {
      setError('NO_API_KEY');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchStations(lat, lng, apiKey, 15);
      setLiveStations(data);
      setSearchedLocationName(locationName || `${lat.toFixed(3)}, ${lng.toFixed(3)}`);
      setMapCenter([lat, lng]);
    } catch (err) {
      if (err.message === 'NO_API_KEY' || err.message === 'INVALID_API_KEY') {
        setError('INVALID_API_KEY');
      } else {
        setError('FETCH_ERROR');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchAddress = async () => {
    if (!locationInput.trim()) return;
    setIsLoading(true);
    setError(null);
    setUserLocation(null); // Clear user location when searching a manual address
    const coords = await geocodeAddress(locationInput);
    if (coords) {
      await loadStationsForLocation(coords.lat, coords.lng, coords.name);
    } else {
      setError('NOT_FOUND');
      setIsLoading(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('GEO_NOT_SUPPORTED');
      return;
    }
    setIsLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserLocation([lat, lng]);
        loadStationsForLocation(lat, lng, "Mein Standort");
      },
      (err) => {
        setError('GEO_DENIED');
        setIsLoading(false);
      }
    );
  };

  const processedStations = useMemo(() => {
    let result = [...liveStations];

    if (filterProvider !== 'All') result = result.filter(s => s.provider === filterProvider);
    if (filterFavorites) result = result.filter(s => favorites.stations.includes(s.id) || favorites.providers.includes(s.provider));
    if (filterAvailable) result = result.filter(s => s.availableSpots > 0);

    result.sort((a, b) => {
      const aFav = favorites.stations.includes(a.id) || favorites.providers.includes(a.provider) ? 1 : 0;
      const bFav = favorites.stations.includes(b.id) || favorites.providers.includes(b.provider) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      if (sortBy === 'distance') return parseFloat(a.distance) - parseFloat(b.distance);
      if (sortBy === 'price') return a.price === 'k.A.' ? 1 : -1;
      if (sortBy === 'power') return parseInt(b.power) - parseInt(a.power);
      return 0;
    });

    return result;
  }, [liveStations, sortBy, filterProvider, filterFavorites, filterAvailable, favorites]);

  return (
    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      
      <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
            <Search size={18} color="var(--accent-primary)" />
            <span style={{ fontWeight: 600 }}>Standort oder Adresse</span>
          </div>
          <div className="input-group" style={{ margin: 0 }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Z.B. 'München'" 
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchAddress()}
              />
              <button className="btn-secondary" style={{ padding: '0.75rem' }} onClick={handleSearchAddress} disabled={isLoading}>
                <Search size={18} />
              </button>
              <button className="btn-primary" style={{ padding: '0.75rem' }} onClick={handleUseCurrentLocation} disabled={isLoading}>
                <Navigation size={18} />
              </button>
            </div>
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.25rem 0' }}></div>

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
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 auto', minWidth: '120px' }}>
              <select className="input-field" value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                <option value="distance">Entfernung</option>
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
        )}

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
      </div>

      {error && (
        <div className="glass-panel" style={{ padding: '1rem', border: '1px solid var(--accent-danger)', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-danger)', fontWeight: 600 }}>
            <AlertCircle size={18} />
            {error === 'NOT_FOUND' && "Adresse nicht gefunden"}
            {error === 'GEO_DENIED' && "Standortzugriff verweigert"}
            {error === 'NO_API_KEY' && "Kein API-Key hinterlegt"}
            {error === 'INVALID_API_KEY' && "API-Key ungültig"}
            {error === 'FETCH_ERROR' && "Fehler beim Laden"}
          </div>
          {(error === 'NO_API_KEY' || error === 'INVALID_API_KEY') && (
            <button className="btn-primary" onClick={onOpenSettings} style={{ alignSelf: 'flex-start', padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
              Key eintragen
            </button>
          )}
        </div>
      )}

      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(0, 210, 255, 0.2)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        </div>
      )}

      {!isLoading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem' }}>
          
          {searchedLocationName ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {processedStations.length} Stationen nahe <strong style={{ color: 'var(--text-primary)' }}>{searchedLocationName.split(',')[0]}</strong>
              </span>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <Navigation size={48} style={{ opacity: 0.2 }} />
              <p>Suche nach einer Adresse, um Ladesäulen zu finden.</p>
            </div>
          )}
          
          {searchedLocationName && viewMode === 'list' && processedStations.map((station, index) => (
            <StationCard 
              key={station.id} 
              station={station} 
              isFavorite={favorites.stations.includes(station.id)}
              isProviderFavorite={favorites.providers.includes(station.provider)}
              toggleFavorite={() => toggleFavorite(station.id)}
              onClick={() => setSelectedStation(station)}
              index={index}
            />
          ))}

          {searchedLocationName && viewMode === 'map' && (
            <MapView 
              stations={processedStations} 
              favorites={favorites}
              center={mapCenter}
              userLocation={userLocation}
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
          toggleProviderFavorite={() => toggleProviderFavorite(selectedStation.provider)}
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

export default StationsList;
