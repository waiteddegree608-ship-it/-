import { Router } from 'express';
import prisma from '../../../db';

const router = Router();

router.get('/', async (req, res) => {
  const records = await prisma.alertRecord.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
    include: { task: true }
  });
  res.json(records);
});

export default router;
