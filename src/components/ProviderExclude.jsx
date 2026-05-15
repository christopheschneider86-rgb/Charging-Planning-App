import React from 'react';
import { Ban, X } from 'lucide-react';

const ProviderExclude = ({ allProviders, excluded, onChange }) => {
  const available = allProviders.filter(p => !excluded.includes(p));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Ban size={14} color="var(--accent-danger)" />
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Anbieter ausschließen</span>
        <select
          className="input-field"
          value=""
          onChange={(e) => {
            if (!e.target.value) return;
            onChange([...excluded, e.target.value]);
          }}
          style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', flex: 1, minWidth: 120 }}
          disabled={available.length === 0}
        >
          <option value="">{available.length === 0 ? 'keine Anbieter' : '+ hinzufügen…'}</option>
          {available.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      {excluded.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
          {excluded.map(p => (
            <span
              key={p}
              className="badge"
              style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--accent-danger)', textTransform: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}
              onClick={() => onChange(excluded.filter(x => x !== p))}
              title="Wieder zulassen"
            >
              <Ban size={10} /> {p} <X size={10} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProviderExclude;
