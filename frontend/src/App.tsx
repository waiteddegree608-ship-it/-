import { useState, useEffect } from 'react';
import { LayoutDashboard, Settings } from 'lucide-react';
import { io } from 'socket.io-client';
import axios from 'axios';
import Dashboard from './Dashboard';

const socket = io('http://localhost:3000');
const api = axios.create({ baseURL: 'http://localhost:3000/api' });

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

function TimeSlider({ value, onChange }: { value: number, onChange: (val: number) => void }) {
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

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [alertTasks, setAlertTasks] = useState<any[]>([]);
  const [alertRecords, setAlertRecords] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  
  const [editTask, setEditTask] = useState<any>(null);
  const [taskInterval, setTaskInterval] = useState(1);
  const [notifyMethod, setNotifyMethod] = useState('webhook');

  useEffect(() => {
    fetchData();

    const handleNewHotspot = (data: any) => {
      setHotspots(prev => [data, ...prev]);
    };

    const handleCloudUpdate = (data: any) => {
      setKeywords(prev => prev.map(k => k.id === data.keywordId ? { ...k, cloudData: data.cloudData } : k));
    };

    socket.on('new_hotspot', handleNewHotspot);
    socket.on('keyword_cloud_updated', handleCloudUpdate);

    return () => {
      socket.off('new_hotspot');
      socket.off('keyword_cloud_updated');
    };
  }, []);

  const fetchData = async () => {
    try {
      const [hsRes, kwRes, taskRes, recordRes, setRes] = await Promise.all([
        api.get('/hotspots'),
        api.get('/keywords'),
        api.get('/alerts/tasks'),
        api.get('/alerts/records'),
        api.get('/settings')
      ]);
      setHotspots(hsRes.data);
      setKeywords(kwRes.data);
      setAlertTasks(taskRes.data);
      setAlertRecords(recordRes.data);
      setSettings(setRes.data);
      
      if (!editTask) {
        setTaskInterval(setRes.data?.defaults?.alertInterval || 1);
        if (setRes.data?.defaults?.notifyMethod) setNotifyMethod(setRes.data.defaults.notifyMethod);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
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
        notifyMethod: target.defaultNotifyMethod.value
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

  const handleWordCloudIntervalChange = async (val: number) => {
    const cronStr = TIME_OPTIONS.find(o => o.value === val)?.cron || '0 * * * *';
    const newSettings = { ...settings, cron: { ...settings.cron, schedule: cronStr } };
    await api.post('/settings', newSettings);
    setSettings(newSettings);
  };

  const currentCloudInterval = TIME_OPTIONS.find(o => o.cron === settings?.cron?.schedule)?.value || 1;

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      
      <Dashboard keywords={keywords} hotspots={hotspots} />
      
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 100, display: 'flex', gap: '1rem' }}>
        <button className="btn" style={{ background: 'rgba(88, 166, 255, 0.2)', backdropFilter: 'blur(10px)', border: '1px solid rgba(88, 166, 255, 0.5)' }} onClick={async () => {
          try {
            await api.post('/trigger');
            alert("后台已触发强制全网扫描！请稍候查收通知。");
          } catch(e) {
            alert("触发失败！");
          }
        }}>
          立即执行全网扫描
        </button>
        <button className="btn" style={{ background: 'var(--surface)', backdropFilter: 'blur(10px)', border: '1px solid var(--surface-border)' }} onClick={() => setActiveTab(activeTab === 'dashboard' ? 'keywords' : 'dashboard')}>
          <LayoutDashboard size={20} style={{ verticalAlign: 'middle', marginRight: 5 }} /> 
          管理面板
        </button>
      </div>

      {activeTab !== 'dashboard' && (
        <div className="glass-panel animate-fade-in" style={{
          position: 'absolute', top: 70, right: 20, width: 450, maxHeight: '80vh',
          display: 'flex', flexDirection: 'column', zIndex: 100, padding: 0,
          overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
        }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.2)' }}>
            <button style={{ flex: 1, padding: '15px', background: activeTab === 'keywords' ? 'rgba(255,255,255,0.1)' : 'transparent', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setActiveTab('keywords')}>词云</button>
            <button style={{ flex: 1, padding: '15px', background: activeTab === 'hotspots' ? 'rgba(255,255,255,0.1)' : 'transparent', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setActiveTab('hotspots')}>新闻池</button>
            <button style={{ flex: 1, padding: '15px', background: activeTab === 'alerts' ? 'rgba(255,255,255,0.1)' : 'transparent', color: 'var(--danger)', border: 'none', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => { setActiveTab('alerts'); setEditTask(null); }}>通知</button>
            <button style={{ flex: 1, padding: '15px', background: activeTab === 'settings' ? 'rgba(255,255,255,0.1)' : 'transparent', color: 'var(--primary)', border: 'none', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setActiveTab('settings')}>设置</button>
          </div>

          <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
            
            {activeTab === 'settings' && (
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
            )}

            {activeTab === 'keywords' && (
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
                      <div key={kw.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                        <span>{kw.word}</span>
                        <button className="btn btn-danger" onClick={async () => {
                          await api.delete(`/keywords/${kw.id}`);
                          fetchData();
                        }}>删除</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'hotspots' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {hotspots.filter(hs => hs.isReal).map(hs => (
                  <div key={hs.id} style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', borderLeft: '4px solid var(--success)' }}>
                    <h4 style={{ margin: 0, color: 'var(--primary)' }}>{hs.title}</h4>
                    <p style={{ margin: '0.5rem 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{hs.summary}</p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>{hs.keyword?.word} | {hs.platform}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'alerts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div>
                  <h3 style={{ margin: '0 0 1rem 0', color: 'var(--danger)' }}>{editTask ? '编辑通知任务' : '添加通知任务'}</h3>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      const target = e.target as any;
                      const keyword = editTask ? editTask.keyword : target.keyword.value;
                      const platforms = [];
                      if (target.p_duck.checked) platforms.push('DuckDuckGo');
                      if (target.p_xhs.checked) platforms.push('Xiaohongshu');
                      if (target.p_x.checked) platforms.push('X');
                      if (target.p_weibo.checked) platforms.push('Weibo');
                      
                      const payload = { 
                        keyword, 
                        intervalHours: taskInterval, 
                        platforms, 
                        notifyMethod, 
                        webhookUrl: target.webhookUrl ? target.webhookUrl.value : '', 
                        email: target.email ? target.email.value : '' 
                      };

                      if (editTask) {
                        await api.put(`/alerts/tasks/${editTask.id}`, payload);
                        setEditTask(null);
                      } else {
                        await api.post('/alerts/tasks', payload);
                        target.reset();
                      }
                      await fetchData();
                    } catch (err: any) {
                      alert("操作失败: " + err.message);
                    }
                  }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                    
                    {!editTask ? (
                      <input name="keyword" className="input" placeholder="输入监控关键词..." required />
                    ) : (
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--danger)' }}>{editTask.keyword}</div>
                    )}
                    
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>通知间隔 (有新动态时):</span>
                      <TimeSlider value={taskInterval} onChange={setTaskInterval} />
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>抓取平台:</span>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem' }}>
                        <label><input type="checkbox" name="p_duck" defaultChecked={editTask ? editTask.platforms.includes('DuckDuckGo') : true} /> DuckDuckGo</label>
                        <label><input type="checkbox" name="p_xhs" defaultChecked={editTask ? editTask.platforms.includes('Xiaohongshu') : true} /> 小红书</label>
                        <label><input type="checkbox" name="p_x" defaultChecked={editTask ? editTask.platforms.includes('X') : true} /> X(Twitter)</label>
                        <label><input type="checkbox" name="p_weibo" defaultChecked={editTask ? editTask.platforms.includes('Weibo') : false} /> Weibo</label>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>通知方式:</span>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem' }}>
                        <label><input type="radio" name="notifyMethod" value="webhook" checked={notifyMethod === 'webhook'} onChange={() => setNotifyMethod('webhook')} /> Webhook</label>
                        <label><input type="radio" name="notifyMethod" value="email" checked={notifyMethod === 'email'} onChange={() => setNotifyMethod('email')} /> Email</label>
                      </div>
                      {notifyMethod === 'webhook' && (
                        <input name="webhookUrl" className="input" placeholder="Webhook URL" defaultValue={editTask?.webhookUrl || settings?.defaults?.webhookUrl || ''} style={{ width: '100%' }} />
                      )}
                      {notifyMethod === 'email' && (
                        <input name="email" type="email" className="input" placeholder="receiver@example.com" defaultValue={editTask?.email || settings?.defaults?.email || ''} style={{ width: '100%' }} />
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button type="submit" className="btn btn-danger" style={{ flex: 1 }}>{editTask ? '保存修改' : '创建任务'}</button>
                      {editTask && <button type="button" className="btn" onClick={() => { setEditTask(null); setTaskInterval(settings?.defaults?.alertInterval || 1); }} style={{ background: 'var(--surface)' }}>取消</button>}
                    </div>
                  </form>
                </div>
                
                <div>
                  <h3 style={{ margin: '0 0 1rem 0' }}>运行中的任务</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {alertTasks.map(task => (
                      <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', borderLeft: '4px solid var(--danger)' }}>
                        <div>
                          <strong style={{ color: 'var(--danger)' }}>{task.keyword}</strong>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>每 {task.intervalHours} 小时扫描 • 共产生 {task._count?.records || 0} 条通知</div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn" style={{ background: 'var(--primary)', color: 'white' }} onClick={() => {
                            setEditTask(task);
                            setTaskInterval(task.intervalHours);
                            setNotifyMethod(task.notifyMethod);
                            document.querySelector('.glass-panel')?.scrollTo(0, 0);
                          }}>编辑</button>
                          <button className="btn btn-danger" onClick={async () => {
                            await api.delete(`/alerts/tasks/${task.id}`);
                            fetchData();
                          }}>删除</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
