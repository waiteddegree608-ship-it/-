import React from 'react';

const TIME_OPTIONS = [
  { label: '15分钟', value: 0.25, cron: '*/15 * * * *' },
  { label: '1小时', value: 1, cron: '0 * * * *' },
  { label: '3小时', value: 3, cron: '0 */3 * * *' },
  { label: '6小时', value: 6, cron: '0 */6 * * *' },
  { label: '12小时', value: 12, cron: '0 */12 * * *' },
  { label: '1天', value: 24, cron: '0 0 * * *' },
  { label: '3天', value: 72, cron: '0 0 */3 * *' },
  { label: '1周', value: 168, cron: '0 0 * * 0' },
];

export { TIME_OPTIONS };

export default function TimeSlider({ value, onChange }: { value: number, onChange: (val: number) => void }) {
  let index = TIME_OPTIONS.findIndex(o => o.value === value);
  if (index === -1) index = 1;
  return (
    <div style={{ padding: '10px 0', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        {TIME_OPTIONS.map((opt, i) => (
          <span key={i} style={{ fontSize: '10px', color: i === index ? 'var(--danger)' : 'var(--text-muted)', fontWeight: i === index ? 'bold' : 'normal', cursor: 'pointer' }} onClick={() => onChange(opt.value)}>
            {opt.label}
          </span>
        ))}
      </div>
      <input 
        type="range" 
        min={0} max={TIME_OPTIONS.length - 1} 
        step={1} 
        value={index} 
        onChange={(e) => onChange(TIME_OPTIONS[parseInt(e.target.value)].value)} 
        style={{ width: '100%', accentColor: 'var(--danger)', cursor: 'pointer' }} 
      />
    </div>
  );
}
