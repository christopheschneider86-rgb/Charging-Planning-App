import React from 'react';
import { Heart, Zap, MapPin, Euro } from 'lucide-react';

const StationCard = ({ station, isFavorite, isProviderFavorite, toggleFavorite, onClick, index, distanceLabel }) => {
  return (
    <div 
      className="glass-panel animate-fade-in" 
      style={{ 
        padding: '1rem', 
        cursor: 'pointer', 
        animationDelay: `${index * 50}ms`,
        transition: 'transform 0.2s',
        border: (isFavorite || isProviderFavorite) ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--glass-border)'
      }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div>
          <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {station.name}
            {(isFavorite || isProviderFavorite) && <Heart size={14} fill="var(--accent-danger)" color="var(--accent-danger)" />}
          </h3>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{station.provider}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
          <span className="badge badge-power" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Zap size={12} /> {station.power}
          </span>
          <span className={station.availableSpots > 0 ? "badge badge-available" : "badge badge-busy"}>
            {station.availableSpots}/{station.totalSpots} frei
          </span>
        </div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <MapPin size={14} /> {distanceLabel ? distanceLabel : `${station.distance} ${station.distanceUnit || 'km'}`}
          </span>
          {station.price !== 'k.A.' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Euro size={14} /> {station.price}
            </span>
          )}
        </div>
        <button 
          className="btn-icon" 
          style={{ width: '32px', height: '32px' }}
          onClick={(e) => { e.stopPropagation(); toggleFavorite(); }}
        >
          <Heart size={18} fill={isFavorite ? "var(--accent-danger)" : "transparent"} color={isFavorite ? "var(--accent-danger)" : "var(--text-secondary)"} />
        </button>
      </div>
    </div>
  );
};

export default StationCard;
