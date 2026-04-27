import nodemailer from 'nodemailer';
import axios from 'axios';
import config from '../config';

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

export async function sendNotification(task: any, events: any[], wordCloudImgUrl?: string | null) {
  if (!events || events.length === 0) return;

  const eventsHtml = events.map(event => `
    <div style="margin-bottom: 20px; padding: 15px; border-left: 4px solid #d9534f; background: #f9f9f9;">
      <h3 style="margin-top: 0; color: #d9534f;">${event.title}</h3>
      <p><strong>可信度:</strong> ${event.credibility}/100 | <strong>发现平台:</strong> ${event.platform}</p>
      <p><strong>摘要:</strong> ${event.summary}</p>
      <p><strong>AI分析判断:</strong> ${event.analysis}</p>
      ${event.url ? `<a href="${event.url}" style="color: #0275d8;">点击查看原文</a>` : ''}
    </div>
  `).join('');

  let wordCloudHtml = '';
  let mailAttachments: any[] = [];

  if (task.notifyMethod === 'email' && task.email) {
    if (wordCloudImgUrl) {
      try {
        const response = await axios.get(wordCloudImgUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');
        mailAttachments.push({
          filename: 'wordcloud.png',
          content: buffer,
          cid: 'wordcloud_img'
        });
        wordCloudHtml = `<div><h3 style="color: #333;">本次扫描热词聚合:</h3><img src="cid:wordcloud_img" alt="Word Cloud" style="max-width: 100%; border-radius: 8px; border: 1px solid #ddd;" /></div><br/>`;
      } catch (err) {
        console.error("Failed to download word cloud image for email", err);
      }
    }

    try {
      await transporter.sendMail({
        from: `"Hotspot Alert" <${config.smtp.user}>`,
        to: task.email,
        subject: `[热点通知] 关键词 "${task.keyword}" 发现 ${events.length} 条最新动态`,
        html: `
          <h2>针对您监控的关键词 "${task.keyword}"，发现了以下最新热点：</h2>
          ${wordCloudHtml}
          ${eventsHtml}
        `,
        attachments: mailAttachments
      });
      console.log(`[Notification] Aggregated email sent to ${task.email}`);
    } catch (e: any) {
      console.error(`[Notification] Failed to send email: ${e.message}`);
    }
  } else if (task.notifyMethod === 'webhook' && task.webhookUrl) {
    try {
      const eventsText = events.map(event => 
        `🔸 ${event.title}\n可信度: ${event.credibility}/100 | 平台: ${event.platform}\n摘要: ${event.summary}\n链接: ${event.url || '暂无'}\n`
      ).join('\n');

      await axios.post(task.webhookUrl, {
        msgtype: "text",
        text: {
          content: `📢【热点通知】监控词: ${task.keyword}\n共发现 ${events.length} 条最新动态：\n\n${eventsText}`
        }
      });
      console.log(`[Notification] Aggregated webhook pushed to ${task.webhookUrl}`);
    } catch (e: any) {
      console.error(`[Notification] Failed to push webhook: ${e.message}`);
    }
  }
}
