import { Router } from 'express';
import prisma from '../../../db';

const router = Router();

router.get('/', async (req, res) => {
  const tasks = await prisma.alertTask.findMany({
    include: { _count: { select: { records: true } } }
  });
  res.json(tasks);
});

router.post('/', async (req, res) => {
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

router.delete('/:id', async (req, res) => {
  try {
    await prisma.alertTask.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    res.status(404).json({ error: "Task not found" });
  }
});

router.put('/:id/toggle', async (req, res) => {
  try {
    const task = await prisma.alertTask.findUnique({ where: { id: req.params.id } });
    const updated = await prisma.alertTask.update({
      where: { id: req.params.id },
      data: { isActive: !task?.isActive }
    });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: "Toggle failed" });
  }
});

router.put('/:id', async (req, res) => {
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
