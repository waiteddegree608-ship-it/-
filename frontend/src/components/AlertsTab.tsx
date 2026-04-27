import React from 'react';
import TimeSlider from './TimeSlider';
import { api } from '../api';

export default function AlertsTab({ alertTasks, settings, editTask, setEditTask, taskInterval, setTaskInterval, notifyMethod, setNotifyMethod, fetchData }: any) {
  return (
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
            if (target.p_bilibili.checked) platforms.push('Bilibili');
            if (target.p_tieba.checked) platforms.push('Tieba');
            if (target.p_zhihu.checked) platforms.push('Zhihu');
            
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
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', flexWrap: 'wrap' }}>
              <label><input type="checkbox" name="p_duck" defaultChecked={editTask ? editTask.platforms.includes('DuckDuckGo') : (settings?.defaults?.platforms?.includes('DuckDuckGo') ?? true)} /> DuckDuckGo</label>
              <label><input type="checkbox" name="p_xhs" defaultChecked={editTask ? editTask.platforms.includes('Xiaohongshu') : (settings?.defaults?.platforms?.includes('Xiaohongshu') ?? true)} /> 小红书</label>
              <label><input type="checkbox" name="p_x" defaultChecked={editTask ? editTask.platforms.includes('X') : (settings?.defaults?.platforms?.includes('X') ?? true)} /> X(Twitter)</label>
              <label><input type="checkbox" name="p_weibo" defaultChecked={editTask ? editTask.platforms.includes('Weibo') : (settings?.defaults?.platforms?.includes('Weibo') ?? false)} /> Weibo</label>
              <label><input type="checkbox" name="p_bilibili" defaultChecked={editTask ? editTask.platforms.includes('Bilibili') : (settings?.defaults?.platforms?.includes('Bilibili') ?? false)} /> 哔哩哔哩</label>
              <label><input type="checkbox" name="p_tieba" defaultChecked={editTask ? editTask.platforms.includes('Tieba') : (settings?.defaults?.platforms?.includes('Tieba') ?? false)} /> 贴吧</label>
              <label><input type="checkbox" name="p_zhihu" defaultChecked={editTask ? editTask.platforms.includes('Zhihu') : (settings?.defaults?.platforms?.includes('Zhihu') ?? false)} /> 知乎</label>
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
          {alertTasks.map((task: any) => (
            <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', borderLeft: `4px solid ${task.isActive !== false ? 'var(--danger)' : 'var(--text-muted)'}`, opacity: task.isActive !== false ? 1 : 0.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input type="checkbox" checked={task.isActive !== false} onChange={async () => {
                  await api.put(`/alerts/tasks/${task.id}/toggle`);
                  fetchData();
                }} style={{ width: '20px', height: '20px', cursor: 'pointer' }} title="Toggle Active" />
                <div>
                  <strong style={{ color: task.isActive !== false ? 'var(--danger)' : 'inherit', textDecoration: task.isActive === false ? 'line-through' : 'none' }}>{task.keyword}</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>每 {task.intervalHours} 小时扫描 • 共产生 {task._count?.records || 0} 条通知</div>
                </div>
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
  );
}
