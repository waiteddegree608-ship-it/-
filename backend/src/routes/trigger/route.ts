import { Router } from 'express';
import { runScan, runAlertScan } from '../../services/cron';

const router = Router();

router.post('/', async (req, res) => {
  runScan();
  runAlertScan(true);
  res.json({ success: true, message: "Scan started in background" });
});

export default router;
