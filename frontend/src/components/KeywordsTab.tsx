import React from 'react';
import TimeSlider, { TIME_OPTIONS } from './TimeSlider';
import { api } from '../api';

export default function KeywordsTab({ keywords, settings, setSettings, fetchData }: { keywords: any[], settings: any, setSettings: any, fetchData: () => void }) {
  const currentCloudInterval = TIME_OPTIONS.find(o => o.cron === settings?.cron?.schedule)?.value || 1;

  const handleWordCloudIntervalChange = async (val: number) => {
    const cronStr = TIME_OPTIONS.find(o => o.value === val)?.cron || '0 * * * *';
    const newSettings = { ...settings, cron: { ...settings.cron, schedule: cronStr } };
    await api.post('/settings', newSettings);
    setSettings(newSettings);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h3 style={{ margin: '0 0 1rem 0' }}>词云全局刷新频率</h3>
        <TimeSlider value={currentCloudInterval} onChange={handleWordCloudIntervalChange} />
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>* 自动实时生效，影响所有词云的后台抓取速度。</p>
      </div>
      <div>
        <h3 style={{ margin: '0 0 1rem 0' }}>添加新词云关键词</h3>
        <form onSubmit={async (e) => {
          e.preventDefault();
          try {
            const target = e.target as any;
            if (!target.word.value.trim()) return;
            await api.post('/keywords', { word: target.word.value });
            target.word.value = '';
            await fetchData();
          } catch (err: any) {
            alert("添加失败: " + (err.response?.data?.error || err.message));
          }
        }} style={{ display: 'flex', gap: '1rem' }}>
          <input name="word" className="input" placeholder="Enter keyword..." style={{ flex: 1 }} required />
          <button type="submit" className="btn">添加</button>
        </form>
      </div>
      <div>
        <h3 style={{ margin: '0 0 1rem 0' }}>已监听词云</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {keywords.map(kw => (
            <div key={kw.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', opacity: kw.isActive ? 1 : 0.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <input type="checkbox" checked={kw.isActive !== false} onChange={async () => {
                  await api.put(`/keywords/${kw.id}/toggle`);
                  fetchData();
                }} style={{ width: '18px', height: '18px', cursor: 'pointer' }} title="Toggle Active" />
                <span style={{ textDecoration: kw.isActive === false ? 'line-through' : 'none' }}>{kw.word}</span>
              </div>
              <button className="btn btn-danger" onClick={async () => {
                await api.delete(`/keywords/${kw.id}`);
                fetchData();
              }}>删除</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
