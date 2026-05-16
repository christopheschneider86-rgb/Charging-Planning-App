import React from 'react';
import { X, Shield, Database, AlertTriangle, ExternalLink, Heart, FileText } from 'lucide-react';

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
        className="glass-panel modal-scroll"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '480px',
          maxHeight: '100dvh',
          overflowY: 'auto', padding: 0,
          position: 'relative',
          borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
          backgroundColor: 'var(--bg-secondary)',
          display: 'flex', flexDirection: 'column'
        }}
      >
        <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', padding: '1rem 1.5rem', paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem' }}>
            <Shield size={22} color="var(--accent-primary)" /> Info & Datenschutz
          </h2>
          <button onClick={onClose} className="btn-icon" aria-label="Schließen" style={{ minWidth: 44, minHeight: 44 }}>
            <X size={22} />
          </button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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

          <Section icon={<AlertTriangle size={16} color="var(--accent-warning)" />} title="Haftungsausschluss">
            <p style={{ margin: 0 }}>
              ChargeFlow wird „wie besehen" bereitgestellt, ohne Gewährleistung
              jeglicher Art. Verfügbarkeit, Preise, Status und Lage der
              Ladesäulen sind nicht garantiert. OpenChargeMap-Daten werden von
              der Community gepflegt und können veraltet, unvollständig oder
              fehlerhaft sein.
            </p>
            <p style={{ margin: '0.5rem 0 0 0' }}>
              Die SoC- und Reichweitenberechnung ist eine Schätzung basierend
              auf den von dir hinterlegten Fahrzeugdaten. Wetter, Topografie,
              Geschwindigkeit, Fahrstil, Beladung und Akkualter werden nicht
              berücksichtigt. Plane immer mit Reserve und prüfe Ladesäulen vor
              Ort.
            </p>
            <p style={{ margin: '0.5rem 0 0 0' }}>
              Die Nutzung dieser App und das Befolgen ihrer Empfehlungen
              erfolgen auf eigene Verantwortung. Der Autor haftet nicht für
              Schäden, die durch unvollständige Daten, Fehlrouting, nicht
              erreichte Ladesäulen oder ausbleibende Ladeoptionen entstehen.
            </p>
          </Section>

          <Section icon={<FileText size={16} color="var(--accent-primary)" />} title="Impressum & Lizenz">
            <p style={{ margin: 0 }}>
              ChargeFlow ist ein nicht-kommerzielles Hobbyprojekt. Es gibt
              keinen kommerziellen Anbieter, keine Gewinnerzielungsabsicht und
              keinen Support-Anspruch.
            </p>
            <p style={{ margin: '0.5rem 0 0 0' }}>
              Markennamen (Tesla, IONITY, EnBW, Google Maps, Apple Maps, Waze
              usw.) sind Eigentum der jeweiligen Inhaber und werden nur
              referenziell genannt. ChargeFlow steht in keiner Verbindung zu
              diesen Unternehmen.
            </p>
            <p style={{ margin: '0.5rem 0 0 0' }}>
              Bei Fragen oder Datenkorrekturen wende dich bitte direkt an
              OpenChargeMap (für Ladesäulendaten) oder OpenStreetMap (für Karten
              und Adressdaten).
            </p>
          </Section>

          <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div>
              Code & Issues:{' '}
              <a href="https://github.com/christopheschneider86-rgb/Charging-Planning-App" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>GitHub <ExternalLink size={10} style={{ display: 'inline' }} /></a>
            </div>
            <div>Stand: {new Date().toLocaleDateString('de-DE')}</div>
          </div>
        </div>

        <div style={{ position: 'sticky', bottom: 0, background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', padding: '0.75rem 1.5rem', paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
          <button onClick={onClose} className="btn-primary" style={{ width: '100%' }}>
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;
