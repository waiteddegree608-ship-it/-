import { Router } from 'express';
import prisma from '../../db';

const router = Router();

router.get('/', async (req, res) => {
  const keywords = await prisma.keyword.findMany();
  res.json(keywords);
});

router.post('/', async (req, res) => {
  const { word, scope } = req.body;
  try {
    const keyword = await prisma.keyword.create({ data: { word, scope } });
    res.json(keyword);
  } catch (e: any) {
    console.error("Error creating keyword:", e.message);
    res.status(400).json({ error: "Keyword may already exist or database error: " + e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.hotspot.deleteMany({ where: { keywordId: req.params.id } });
    await prisma.keyword.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    res.status(404).json({ error: "Not found" });
  }
});

router.put('/:id/toggle', async (req, res) => {
  try {
    const kw = await prisma.keyword.findUnique({ where: { id: req.params.id } });
    const updated = await prisma.keyword.update({
      where: { id: req.params.id },
      data: { isActive: !kw?.isActive }
    });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: "Toggle failed" });
  }
});

export default router;
