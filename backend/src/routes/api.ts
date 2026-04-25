import { Router } from 'express';
import prisma from '../db';

const router = Router();

router.get('/keywords', async (req, res) => {
  const keywords = await prisma.keyword.findMany();
  res.json(keywords);
});

import { runScan, runAlertScan } from '../services/cron';
router.post('/trigger', async (req, res) => {
  // trigger scanning in the background
  runScan();
  runAlertScan(true);
  res.json({ success: true, message: "Scan started in background" });
});

router.post('/keywords', async (req, res) => {
  const { word, scope } = req.body;
  try {
    const keyword = await prisma.keyword.create({ data: { word, scope } });
    res.json(keyword);
  } catch (e: any) {
    console.error("Error creating keyword:", e.message);
    res.status(400).json({ error: "Keyword may already exist or database error: " + e.message });
  }
});

router.delete('/keywords/:id', async (req, res) => {
  try {
    // Delete associated hotspots first to prevent orphan data
    await prisma.hotspot.deleteMany({ where: { keywordId: req.params.id } });
    await prisma.keyword.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    res.status(404).json({ error: "Not found" });
  }
});

router.get('/hotspots', async (req, res) => {
  const hotspots = await prisma.hotspot.findMany({
    orderBy: { createdAt: 'desc' },
    include: { keyword: true }
  });
  res.json(hotspots);
});

router.post('/push', async (req, res) => {
  // Push API for WeChat bot
  const alerts = await prisma.hotspot.findMany({
    where: { isReal: true, notified: false }
  });
  
  for (const alert of alerts) {
    await prisma.hotspot.update({
      where: { id: alert.id },
      data: { notified: true }
    });
  }
  
  res.json({ alerts });
});

// --- Alert Notification Endpoints ---

router.get('/alerts/tasks', async (req, res) => {
  const tasks = await prisma.alertTask.findMany({
    include: { _count: { select: { records: true } } }
  });
  res.json(tasks);
});

router.post('/alerts/tasks', async (req, res) => {
  const { keyword, intervalHours, platforms, notifyMethod, webhookUrl, email } = req.body;
  try {
    const task = await prisma.alertTask.create({
      data: {
        keyword,
        intervalHours: intervalHours ? parseInt(intervalHours, 10) : 1,
        platforms: platforms ? platforms.join(',') : "DuckDuckGo,Xiaohongshu,X",
        notifyMethod: notifyMethod || 'webhook',
        webhookUrl,
        email
      }
    });
    res.json(task);
  } catch (e: any) {
    res.status(400).json({ error: "Failed to create alert task: " + e.message });
  }
});

router.delete('/alerts/tasks/:id', async (req, res) => {
  try {
    await prisma.alertTask.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    res.status(404).json({ error: "Task not found" });
  }
});

router.get('/alerts/records', async (req, res) => {
  const records = await prisma.alertRecord.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
    include: { task: true }
  });
  res.json(records);
});

import fs from 'fs';
import path from 'path';

router.get('/settings', (req, res) => {
  const configPath = path.resolve(__dirname, '../../config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  res.json(config);
});

router.post('/settings', (req, res) => {
  const configPath = path.resolve(__dirname, '../../config.json');
  const newConfig = req.body;
  fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf8');
  res.json({ success: true });
});

router.put('/alerts/tasks/:id', async (req, res) => {
  const { intervalHours, platforms, notifyMethod, webhookUrl, email } = req.body;
  try {
    const task = await prisma.alertTask.update({
      where: { id: req.params.id },
      data: {
        intervalHours: intervalHours ? parseFloat(intervalHours) : 1,
        platforms: platforms ? platforms.join(',') : "DuckDuckGo,Xiaohongshu,X",
        notifyMethod: notifyMethod || 'webhook',
        webhookUrl,
        email
      }
    });
    res.json(task);
  } catch (e: any) {
    res.status(400).json({ error: "Failed to update alert task: " + e.message });
  }
});

export default router;
