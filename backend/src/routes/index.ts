import { Router } from 'express';

import keywordsRouter from './keywords/route';
import hotspotsRouter from './hotspots/route';
import alertsTasksRouter from './alerts/tasks/route';
import alertsRecordsRouter from './alerts/records/route';
import settingsRouter from './settings/route';
import triggerRouter from './trigger/route';
import pushRouter from './push/route';

const router = Router();

router.use('/keywords', keywordsRouter);
router.use('/hotspots', hotspotsRouter);
router.use('/alerts/tasks', alertsTasksRouter);
router.use('/alerts/records', alertsRecordsRouter);
router.use('/settings', settingsRouter);
router.use('/trigger', triggerRouter);
router.use('/push', pushRouter);

export default router;
