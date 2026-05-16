import React, { useState } from 'react';
import { Heart, Zap, MapPin, Euro, X, Copy, Check, Info, ExternalLink, RefreshCw, Plug, Activity, CalendarClock, Navigation } from 'lucide-react';
import { fetchStationById } from '../services/api';
import { buildNavUrl, NAV_APPS, navAppLabel } from '../services/nav';

const StationDetail = ({ station, onClose, isFavorite, isProviderFavorite, toggleFavorite, toggleProviderFavorite, apiKey, onRefreshed, navApp = 'google' }) => {
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(null);
  const [navMenuOpen, setNavMenuOpen] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(station.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = async () => {
    if (!apiKey || !station.id) return;
    setRefreshing(true);
    setRefreshError(null);
    try {
      const fresh = await fetchStationById(station.id, apiKey);
      if (fresh && onRefreshed) onRefreshed(fresh);
      else if (!fresh) setRefreshError('Station nicht mehr bei OCM gefunden.');
    } catch (e) {
      setRefreshError(e.message === 'INVALID_API_KEY' ? 'API-Key ungültig.' : 'Abgleich fehlgeschlagen.');
    } finally {
      setRefreshing(false);
    }
  };

  const navUrl = station.lat && station.lng ? buildNavUrl(navApp, station.lat, station.lng) : null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', zIndex: 10000 }} onClick={onClose}>
      <div className="glass-panel animate-fade-in" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'var(--bg-secondary)', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: 0, paddingBottom: 'env(safe-area-inset-bottom, 0px)', maxHeight: 'calc(100vh - env(safe-area-inset-top, 0px))', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} className="btn-icon" style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'var(--bg-tertiary)' }}>
          <X size={20} />
        </button>

        <div style={{ padding: '1.5rem', paddingTop: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ margin: '0 0 0.5rem 0' }}>{station.name}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Anbieter:{' '}
                  {station.providerUrl ? (
                    <a href={station.providerUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      {station.provider} <ExternalLink size={12} />
                    </a>
                  ) : station.provider}
                </span>
                <button onClick={toggleProviderFavorite} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <Heart size={14} fill={isProviderFavorite ? 'var(--accent-danger)' : 'transparent'} color={isProviderFavorite ? 'var(--accent-danger)' : 'var(--text-secondary)'} />
                </button>
              </div>
              {station.statusTitle && (
                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Activity size={12} color={station.isOperational ? 'var(--accent-success)' : 'var(--accent-warning)'} />
                  <span style={{ fontSize: '0.75rem', color: station.isOperational ? 'var(--accent-success)' : 'var(--accent-warning)' }}>{station.statusTitle}</span>
                </div>
              )}
            </div>
            <button onClick={toggleFavorite} className="btn-icon" style={{ border: '1px solid var(--border-color)' }}>
              <Heart size={20} fill={isFavorite ? 'var(--accent-danger)' : 'transparent'} color={isFavorite ? 'var(--accent-danger)' : 'var(--text-secondary)'} />
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
                {station.availableSpots}/{station.totalSpots} Spots
              </span>
            </div>
            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Entfernung</span>
              <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={18} color="var(--accent-primary)" /> {station.distance} {station.distanceUnit}
              </span>
            </div>
          </div>

          {station.connectors && station.connectors.length > 0 && (
            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plug size={18} color="var(--accent-primary)" /> Anschlüsse ({station.connectors.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {station.connectors.map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'var(--bg-primary)', borderRadius: 8, fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600 }}>{c.type}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                        {[c.current, c.amps ? `${c.amps}A` : null, c.voltage ? `${c.voltage}V` : null].filter(Boolean).join(' · ') || '—'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="badge badge-power">{c.powerKW || 'k.A.'}{c.powerKW ? ' kW' : ''}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>×{c.quantity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={18} color="var(--accent-primary)" /> Bedingungen
            </h3>
            {station.usageType && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Nutzung: {station.usageType}</p>}
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>{station.conditions}</p>
            {station.accessComments && (
              <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{station.accessComments}</p>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            <label className="input-label">Adresse</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div className="input-field" style={{ flex: 1, color: 'var(--text-secondary)' }}>{station.address}</div>
              <button className="btn-secondary" onClick={handleCopy} style={{ padding: '0.75rem' }} title="Adresse kopieren">
                {copied ? <Check size={20} /> : <Copy size={20} />}
              </button>
              {navUrl && (
                <div style={{ position: 'relative' }}>
                  <a
                    className="btn-primary"
                    href={navUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ padding: '0.75rem 1rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    title={`Navigation mit ${navAppLabel(navApp)}`}
                  >
                    <Navigation size={18} />
                    <span style={{ fontSize: '0.8rem' }}>{navAppLabel(navApp).split(' ')[0]}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setNavMenuOpen(o => !o)}
                    className="btn-secondary"
                    style={{ marginTop: '0.4rem', width: '100%', padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                    title="Andere Navi-App nutzen"
                  >
                    Andere…
                  </button>
                  {navMenuOpen && (
                    <div className="glass-panel" style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 30, padding: '0.25rem', minWidth: 130, display: 'flex', flexDirection: 'column', gap: '0.15rem', backgroundColor: 'var(--bg-tertiary)' }}>
                      {NAV_APPS.filter(a => a.id !== navApp).map(a => (
                        <a
                          key={a.id}
                          href={buildNavUrl(a.id, station.lat, station.lng)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setNavMenuOpen(false)}
                          style={{ padding: '0.4rem 0.6rem', borderRadius: 6, fontSize: '0.8rem', color: 'var(--text-primary)', textDecoration: 'none' }}
                        >
                          {a.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {station.dataProvider && <span>Quelle: {station.dataProvider}</span>}
              {station.dateLastVerified && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CalendarClock size={10} /> Verifiziert: {new Date(station.dateLastVerified).toLocaleDateString('de-DE')}
                </span>
              )}
              {station.ocmUrl && <a href={station.ocmUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>Auf OpenChargeMap öffnen</a>}
            </div>
            <button className="btn-secondary" onClick={handleRefresh} disabled={refreshing || !apiKey} style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <RefreshCw size={14} className={refreshing ? 'spin' : ''} /> {refreshing ? 'Lädt…' : 'Mit OCM abgleichen'}
            </button>
          </div>
          {refreshError && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--accent-danger)' }}>{refreshError}</p>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>
    </div>
  );
};

export default StationDetail;
