import React from 'react';
import TimeSlider, { TIME_OPTIONS } from './TimeSlider';
import { api } from '../api';

export default function SettingsTab({ settings, setSettings, fetchData }: { settings: any, setSettings: any, fetchData: () => void }) {
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    const platforms = [];
    if (target.dp_duck.checked) platforms.push('DuckDuckGo');
    if (target.dp_xhs.checked) platforms.push('Xiaohongshu');
    if (target.dp_x.checked) platforms.push('X');
    if (target.dp_weibo.checked) platforms.push('Weibo');
    if (target.dp_bilibili.checked) platforms.push('Bilibili');
    if (target.dp_tieba.checked) platforms.push('Tieba');
    if (target.dp_zhihu.checked) platforms.push('Zhihu');

    const newSettings = {
      ...settings,
      smtp: {
        host: target.smtpHost.value,
        port: parseInt(target.smtpPort.value),
        secure: target.smtpSecure.checked,
        user: target.smtpUser.value,
        pass: target.smtpPass.value,
      },
      defaults: {
        webhookUrl: target.defaultWebhook.value,
        email: target.defaultEmail.value,
        alertInterval: parseFloat(target.defaultInterval.value),
        notifyMethod: target.defaultNotifyMethod.value,
        platforms: platforms
      }
    };
    try {
      await api.post('/settings', newSettings);
      alert("设置已保存");
      fetchData();
    } catch (err) {
      alert("保存失败");
    }
  };

  return (
    <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h3 style={{ margin: '0 0 1rem 0', color: 'var(--primary)' }}>默认配置</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>默认热点通知间隔</label>
          <TimeSlider value={settings?.defaults?.alertInterval || 1} onChange={(val) => setSettings({...settings, defaults: {...settings.defaults, alertInterval: val}})} />
          <input type="hidden" name="defaultInterval" value={settings?.defaults?.alertInterval || 1} />
          
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>默认通知方式</label>
          <select name="defaultNotifyMethod" className="input" defaultValue={settings?.defaults?.notifyMethod || 'webhook'}>
            <option value="webhook">Webhook</option>
            <option value="email">Email</option>
          </select>
          
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>默认 Webhook 地址</label>
          <input name="defaultWebhook" className="input" defaultValue={settings?.defaults?.webhookUrl || ''} />
          
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>默认接收 Email 地址</label>
          <input name="defaultEmail" className="input" defaultValue={settings?.defaults?.email || ''} />

          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>默认抓取平台</label>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', flexWrap: 'wrap' }}>
            <label><input type="checkbox" name="dp_duck" defaultChecked={settings?.defaults?.platforms?.includes('DuckDuckGo') ?? true} /> DuckDuckGo</label>
            <label><input type="checkbox" name="dp_xhs" defaultChecked={settings?.defaults?.platforms?.includes('Xiaohongshu') ?? true} /> 小红书</label>
            <label><input type="checkbox" name="dp_x" defaultChecked={settings?.defaults?.platforms?.includes('X') ?? true} /> X(Twitter)</label>
            <label><input type="checkbox" name="dp_weibo" defaultChecked={settings?.defaults?.platforms?.includes('Weibo') ?? false} /> Weibo</label>
            <label><input type="checkbox" name="dp_bilibili" defaultChecked={settings?.defaults?.platforms?.includes('Bilibili') ?? false} /> 哔哩哔哩</label>
            <label><input type="checkbox" name="dp_tieba" defaultChecked={settings?.defaults?.platforms?.includes('Tieba') ?? false} /> 贴吧</label>
            <label><input type="checkbox" name="dp_zhihu" defaultChecked={settings?.defaults?.platforms?.includes('Zhihu') ?? false} /> 知乎</label>
          </div>
        </div>
      </div>
      <div>
        <h3 style={{ margin: '0 0 1rem 0', color: 'var(--primary)' }}>SMTP 发件服务器配置</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <input name="smtpHost" className="input" placeholder="SMTP Host (e.g. smtp.qq.com)" defaultValue={settings?.smtp?.host || ''} />
          <input name="smtpPort" type="number" className="input" placeholder="Port" defaultValue={settings?.smtp?.port || 465} />
          <label style={{ fontSize: '0.8rem' }}><input name="smtpSecure" type="checkbox" defaultChecked={settings?.smtp?.secure !== false} /> 启用 SSL/TLS</label>
          <input name="smtpUser" className="input" placeholder="发件账号" defaultValue={settings?.smtp?.user || ''} />
          <input name="smtpPass" type="password" className="input" placeholder="授权码" defaultValue={settings?.smtp?.pass || ''} />
        </div>
      </div>
      <button type="submit" className="btn" style={{ background: 'var(--primary)', color: 'white' }}>保存所有设置</button>
    </form>
  );
}
