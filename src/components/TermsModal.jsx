import React from 'react';
import { X, Shield, Database, AlertTriangle, ExternalLink, Heart } from 'lucide-react';

const Section = ({ icon, title, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
    <h3 style={{ fontSize: '0.95rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      {icon} {title}
    </h3>
    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
      {children}
    </div>
  </div>
);

const TermsModal = ({ onClose }) => {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)',
        zIndex: 10001, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 0
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '480px',
          maxHeight: 'calc(100vh - env(safe-area-inset-top, 0px))',
          overflowY: 'auto', padding: '1.5rem',
          paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
          position: 'relative',
          borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
          backgroundColor: 'var(--bg-secondary)'
        }}
      >
        <button onClick={onClose} className="btn-icon" style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
          <X size={20} />
        </button>

        <h2 style={{ margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={22} color="var(--accent-primary)" /> Info & Datenschutz
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Section icon={<Heart size={16} color="var(--accent-danger)" />} title="Über ChargeFlow">
            ChargeFlow ist eine Open-Source-Planungs-App für E-Auto-Fahrer:innen.
            Lokale Ladesäulensuche, Routenplanung mit echten Straßenwegen,
            Verbrauchsberechnung pro Stopp. Läuft komplett im Browser — kein
            Account nötig.
          </Section>

          <Section icon={<Database size={16} color="var(--accent-primary)" />} title="Datenquellen">
            <ul style={{ marginLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <li>
                Ladesäulen: <a href="https://openchargemap.org" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>OpenChargeMap <ExternalLink size={10} style={{ display: 'inline' }} /></a>
                — Community-Datenbank (CC-BY-SA-4.0). API-Key erforderlich.
              </li>
              <li>
                Adressen & Geocoding: <a href="https://nominatim.org" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>Nominatim/OpenStreetMap <ExternalLink size={10} style={{ display: 'inline' }} /></a> (ODbL).
              </li>
              <li>
                Routing: <a href="https://project-osrm.org" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>OSRM <ExternalLink size={10} style={{ display: 'inline' }} /></a> (öffentlicher Demo-Server, BSD-2).
              </li>
              <li>
                Karten: OpenStreetMap, CARTO, Esri, OpenTopoMap.
              </li>
            </ul>
          </Section>

          <Section icon={<Shield size={16} color="var(--accent-success)" />} title="Datenschutz">
            <p style={{ margin: 0 }}>
              Alle deine Daten (Favoriten, gespeicherte Orte, Fahrzeuge, Routen,
              API-Key) liegen ausschließlich in deinem Browser (localStorage).
              Es gibt keinen ChargeFlow-Server, keine Accounts, kein Tracking,
              keine Cookies.
            </p>
            <p style={{ margin: '0.5rem 0 0 0' }}>
              Bei der Nutzung werden Anfragen direkt von deinem Browser an die
              oben genannten APIs gesendet (Adresse, Koordinaten, ggf. dein
              OpenChargeMap-API-Key) — ChargeFlow steht dazwischen nicht.
            </p>
          </Section>

          <Section icon={<AlertTriangle size={16} color="var(--accent-warning)" />} title="Hinweise & Haftung">
            <p style={{ margin: 0 }}>
              Verfügbarkeit, Preise und Status der Ladesäulen sind nicht
              garantiert. OpenChargeMap-Daten werden von der Community gepflegt
              und können veraltet sein. SoC-Berechnung ist eine Schätzung
              basierend auf deinen Fahrzeugdaten — Wetter, Topografie, Fahrstil
              werden nicht berücksichtigt.
            </p>
            <p style={{ margin: '0.5rem 0 0 0' }}>
              Plane immer mit Reserve und prüfe vor Ort.
            </p>
          </Section>

          <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            ChargeFlow · keine kommerzielle App · Code & Issues auf{' '}
            <a href="https://github.com/christopheschneider86-rgb/Charging-Planning-App" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>GitHub</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;
