import { Router } from 'express';
import prisma from '../../db';

const router = Router();

router.get('/', async (req, res) => {
  const hotspots = await prisma.hotspot.findMany({
    orderBy: { createdAt: 'desc' },
    include: { keyword: true }
  });
  res.json(hotspots);
});

export default router;
