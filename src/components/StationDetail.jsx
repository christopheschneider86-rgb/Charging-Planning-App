import React, { useState } from 'react';
import { Heart, Zap, MapPin, Euro, X, Copy, Check, Info, ExternalLink } from 'lucide-react';

const StationDetail = ({ station, onClose, isFavorite, isProviderFavorite, toggleFavorite, toggleProviderFavorite }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(station.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      zIndex: 1000
    }}>
      <div className="glass-panel animate-fade-in" style={{
        backgroundColor: 'var(--bg-secondary)',
        borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
        padding: '0', maxHeight: '90vh', overflowY: 'auto',
        position: 'relative'
      }}>
        <button 
          onClick={onClose}
          className="btn-icon"
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'var(--bg-tertiary)' }}
        >
          <X size={20} />
        </button>

        <div style={{ padding: '1.5rem', paddingTop: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ margin: '0 0 0.5rem 0' }}>{station.name}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Anbieter: {station.providerUrl ? (
                    <a href={station.providerUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      {station.provider} <ExternalLink size={12} />
                    </a>
                  ) : (
                    station.provider
                  )}</span>
                <button 
                  onClick={toggleProviderFavorite}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <Heart size={14} fill={isProviderFavorite ? "var(--accent-danger)" : "transparent"} color={isProviderFavorite ? "var(--accent-danger)" : "var(--text-secondary)"} />
                </button>
              </div>
            </div>
            <button 
              onClick={toggleFavorite}
              className="btn-icon"
              style={{ border: '1px solid var(--border-color)' }}
            >
              <Heart size={20} fill={isFavorite ? "var(--accent-danger)" : "transparent"} color={isFavorite ? "var(--accent-danger)" : "var(--text-secondary)"} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Leistung</span>
              <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap size={18} color="var(--accent-primary)" /> {station.power}
              </span>
            </div>
            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Preis</span>
              <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Euro size={18} color="var(--accent-success)" /> {station.price}
              </span>
            </div>
            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Verfügbarkeit</span>
              <span style={{ fontWeight: 600, color: station.availableSpots > 0 ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                {station.availableSpots}/{station.totalSpots} Spots frei
              </span>
            </div>
            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Entfernung</span>
              <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={18} color="var(--accent-primary)" /> {station.distance} {station.distanceUnit}
              </span>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={18} color="var(--accent-primary)" /> Bedingungen
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.6' }}>
              {station.conditions}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="input-label">Adresse</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div className="input-field" style={{ flex: 1, color: 'var(--text-secondary)' }}>
                {station.address}
              </div>
              <button className="btn-primary" onClick={handleCopy} style={{ padding: '0.75rem' }}>
                {copied ? <Check size={20} /> : <Copy size={20} />}
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default StationDetail;
