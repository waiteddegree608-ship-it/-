import { Router } from 'express';
import prisma from '../../db';

const router = Router();

router.post('/', async (req, res) => {
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

export default router;
