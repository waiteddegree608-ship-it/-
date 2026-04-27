import { PrismaClient } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${path.resolve(__dirname, '../../data/dev.db')}`,
    },
  },
});

export default prisma;
