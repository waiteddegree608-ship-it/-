import { Router } from 'express';
import config from '../../config';
import fs from 'fs';
import path from 'path';

const router = Router();

router.get('/', (req, res) => {
  res.json(config);
});

router.post('/', (req, res) => {
  const newConfig = req.body;
  
  const envPath = path.resolve(process.cwd(), '.env');
  let envContent = '';
  if (fs.existsSync(envPath)) {
     envContent = fs.readFileSync(envPath, 'utf8');
  }

  const updateEnv = (key: string, value: string) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}="${value}"`);
    } else {
      envContent += `\n${key}="${value}"`;
    }
  };

  if (newConfig.smtp) {
    if (newConfig.smtp.host !== undefined) updateEnv('SMTP_HOST', newConfig.smtp.host);
    if (newConfig.smtp.port !== undefined) updateEnv('SMTP_PORT', newConfig.smtp.port.toString());
    if (newConfig.smtp.secure !== undefined) updateEnv('SMTP_SECURE', newConfig.smtp.secure.toString());
    if (newConfig.smtp.user !== undefined) updateEnv('SMTP_USER', newConfig.smtp.user);
    if (newConfig.smtp.pass !== undefined) updateEnv('SMTP_PASS', newConfig.smtp.pass);
  }

  if (newConfig.defaults) {
    if (newConfig.defaults.webhookUrl !== undefined) updateEnv('DEFAULT_WEBHOOK_URL', newConfig.defaults.webhookUrl);
    if (newConfig.defaults.email !== undefined) updateEnv('DEFAULT_EMAIL', newConfig.defaults.email);
    if (newConfig.defaults.alertInterval !== undefined) updateEnv('DEFAULT_ALERT_INTERVAL', newConfig.defaults.alertInterval.toString());
    if (newConfig.defaults.notifyMethod !== undefined) updateEnv('DEFAULT_NOTIFY_METHOD', newConfig.defaults.notifyMethod);
    if (newConfig.defaults.platforms !== undefined) updateEnv('DEFAULT_PLATFORMS', newConfig.defaults.platforms.join(','));
  }

  if (newConfig.cron && newConfig.cron.schedule) {
    updateEnv('CRON_SCHEDULE', newConfig.cron.schedule);
  }

  fs.writeFileSync(envPath, envContent, 'utf8');
  res.json({ success: true, message: "Settings saved to .env. Restart required for changes to take effect." });
});

export default router;
