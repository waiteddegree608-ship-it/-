import dotenv from 'dotenv';
dotenv.config();

const config = {
  siliconflow: {
    apiUrl: process.env.SILICONFLOW_API_URL || "https://api.siliconflow.cn/v1",
    apiKey: process.env.SILICONFLOW_API_KEY || "",
    model: process.env.SILICONFLOW_MODEL || "deepseek-ai/DeepSeek-V3.2"
  },
  cron: {
    schedule: process.env.CRON_SCHEDULE || "0 */3 * * *"
  },
  rsshub: {
    url: process.env.RSSHUB_URL || "https://rsshub.rssforever.com"
  },
  server: {
    port: parseInt(process.env.SERVER_PORT || "3000", 10)
  },
  smtp: {
    host: process.env.SMTP_HOST || "smtp.qq.com",
    port: parseInt(process.env.SMTP_PORT || "465", 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || ""
  },
  defaults: {
    webhookUrl: process.env.DEFAULT_WEBHOOK_URL || "",
    email: process.env.DEFAULT_EMAIL || "",
    alertInterval: parseInt(process.env.DEFAULT_ALERT_INTERVAL || "24", 10),
    notifyMethod: process.env.DEFAULT_NOTIFY_METHOD || "email",
    platforms: (process.env.DEFAULT_PLATFORMS || "DuckDuckGo,X,Bilibili,Tieba,Zhihu").split(',')
  }
};

export default config;
