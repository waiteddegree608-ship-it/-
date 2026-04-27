import React from 'react';

export default function HotspotsTab({ hotspots }: { hotspots: any[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {hotspots.filter(hs => hs.isReal).map(hs => (
        <div key={hs.id} style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', borderLeft: '4px solid var(--success)' }}>
          <h4 style={{ margin: 0 }}>
            {hs.url ? (
              <a href={hs.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }} onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'} onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}>
                {hs.title}
              </a>
            ) : (
              <span style={{ color: 'var(--primary)' }}>{hs.title}</span>
            )}
          </h4>
          <p style={{ margin: '0.5rem 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{hs.summary}</p>
          <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>{hs.keyword?.word} | {hs.platform}</span>
        </div>
      ))}
    </div>
  );
}
