import cron from 'node-cron';
import config from '../config';
import { runScan } from './scan';
import { runAlertScan } from './alertScan';

export { runScan, runAlertScan };

export function initCron() {
  cron.schedule(config.cron.schedule, () => {
    runScan();
  });
  // Check alert tasks every 10 minutes
  cron.schedule('*/10 * * * *', () => {
    runAlertScan();
  });
}
