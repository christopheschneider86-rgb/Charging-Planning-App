import React, { useState } from 'react';
import { Route, Battery, Compass, ArrowRight, Play } from 'lucide-react';
import StationCard from './StationCard';
import StationDetail from './StationDetail';

const RoutePlanner = ({ stations, favorites, toggleFavorite }) => {
  const [start, setStart] = useState('');
  const [destination, setDestination] = useState('');
  const [preference, setPreference] = useState('eco');
  const [range, setRange] = useState(250);
  const [deviation, setDeviation] = useState(5);
  
  const [isPlanning, setIsPlanning] = useState(false);
  const [routeStations, setRouteStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);

  const handlePlanRoute = (e) => {
    e.preventDefault();
    if (!start || !destination) return;
    
    setIsPlanning(true);
    
    // Mock simulation of route planning
    setTimeout(() => {
      // Pick some random stations to simulate a route
      const shuffled = [...stations].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 3);
      setRouteStations(selected);
      setIsPlanning(false);
    }, 1500);
  };

  return (
    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      
      {/* Route Form */}
      <form onSubmit={handlePlanRoute} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Route size={20} color="var(--accent-primary)" /> Strecke planen
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '11px', top: '24px', bottom: '24px', width: '2px', background: 'var(--border-color)', zIndex: 0 }}></div>
          
          <div className="input-group" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative', zIndex: 1 }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 0 4px var(--bg-secondary)' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }}></div>
            </div>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Startadresse" 
              value={start}
              onChange={(e) => setStart(e.target.value)}
              required
            />
          </div>
          
          <div className="input-group" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative', zIndex: 1 }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 0 4px var(--bg-secondary)' }}>
              <MapPin size={14} color="white" />
            </div>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Zieladresse" 
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Battery size={16} /> Restreichweite
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input 
                type="number" 
                className="input-field" 
                value={range}
                onChange={(e) => setRange(e.target.value)}
                min="10"
                max="1000"
              />
              <span style={{ color: 'var(--text-secondary)' }}>km</span>
            </div>
          </div>
          
          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Compass size={16} /> Max. Abweichung
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input 
                type="number" 
                className="input-field" 
                value={deviation}
                onChange={(e) => setDeviation(e.target.value)}
                min="1"
                max="50"
              />
              <span style={{ color: 'var(--text-secondary)' }}>km</span>
            </div>
          </div>
        </div>

        <div className="input-group" style={{ margin: 0 }}>
          <label className="input-label">Streckenpräferenz</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              type="button"
              className={preference === 'eco' ? 'btn-primary' : 'btn-secondary'} 
              style={{ flex: 1, padding: '0.5rem' }}
              onClick={() => setPreference('eco')}
            >
              Eco
            </button>
            <button 
              type="button"
              className={preference === 'fast' ? 'btn-primary' : 'btn-secondary'} 
              style={{ flex: 1, padding: '0.5rem' }}
              onClick={() => setPreference('fast')}
            >
              Schnell
            </button>
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

      {/* Results */}
      {routeStations.length > 0 && !isPlanning && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem' }} className="animate-fade-in">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Play size={18} color="var(--accent-success)" /> Empfohlene Ladestopps
          </h3>
          
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ position: 'absolute', left: '20px', top: '30px', bottom: '30px', width: '2px', background: 'var(--border-color)', zIndex: 0, borderStyle: 'dashed' }}></div>
            
            {routeStations.map((station, index) => (
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
                  />
                </div>
              </div>
            ))}
          </div>
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
