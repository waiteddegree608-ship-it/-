import { useState, useEffect } from 'react';
import { LayoutDashboard, Settings } from 'lucide-react';
import { io } from 'socket.io-client';
import Dashboard from './Dashboard';
import { api } from './api';
import SettingsTab from './components/SettingsTab';
import KeywordsTab from './components/KeywordsTab';
import HotspotsTab from './components/HotspotsTab';
import AlertsTab from './components/AlertsTab';
const socket = io('http://localhost:3000');

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
            {activeTab === 'settings' && <SettingsTab settings={settings} setSettings={setSettings} fetchData={fetchData} />}
            {activeTab === 'keywords' && <KeywordsTab keywords={keywords} settings={settings} setSettings={setSettings} fetchData={fetchData} />}
            {activeTab === 'hotspots' && <HotspotsTab hotspots={hotspots} />}
            {activeTab === 'alerts' && <AlertsTab alertTasks={alertTasks} settings={settings} editTask={editTask} setEditTask={setEditTask} taskInterval={taskInterval} setTaskInterval={setTaskInterval} notifyMethod={notifyMethod} setNotifyMethod={setNotifyMethod} fetchData={fetchData} />}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
