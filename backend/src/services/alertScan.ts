import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import prisma from '../db';
import { analyzeAlertCredibility, generateRefinedWordCloud } from './ai';
import { duckSearch, bingSearch } from './search';
import { sendNotification } from './notify';

export async function runAlertScan(force: boolean = false) {
  console.log(`Running scheduled Alert Task scan... (force: ${force})`);
  
  try {
    const tasks = await prisma.alertTask.findMany();
    const now = Date.now();

    for (const task of tasks) {
      if (!task.isActive) continue;

      const lastRun = task.lastRunAt ? task.lastRunAt.getTime() : 0;
      if (!force && (now - lastRun < task.intervalHours * 3600000)) {
        continue;
      }

      console.log(`[AlertTask: ${task.keyword}] Executing cross-platform search...`);
      
      const platformsStr = task.platforms || "DuckDuckGo,Xiaohongshu,X";
      const platformsArr = platformsStr.split(',');
      
      const allResults = [];
      
      if (platformsArr.includes('DuckDuckGo')) {
        const generalResults = await duckSearch(task.keyword, 1);
        allResults.push(...generalResults.map((r: any) => ({ ...r, platform: 'Search Engine' })));
        await new Promise(res => setTimeout(res, 10000));
      }
      
      if (platformsArr.includes('Xiaohongshu')) {
        const xhbResults = await bingSearch(`${task.keyword} site:xiaohongshu.com`, 1);
        allResults.push(...xhbResults.map((r: any) => ({ ...r, platform: 'Xiaohongshu' })));
        await new Promise(res => setTimeout(res, 10000));
      }
      
      if (platformsArr.includes('X')) {
        const twitterResults = await duckSearch(`${task.keyword} site:twitter.com OR site:x.com`, 1);
        allResults.push(...twitterResults.map((r: any) => ({ ...r, platform: 'X/Twitter' })));
        await new Promise(res => setTimeout(res, 10000));
      }
      
      if (platformsArr.includes('Weibo')) {
        const weiboResults = await bingSearch(`${task.keyword} site:weibo.com`, 1);
        allResults.push(...weiboResults.map((r: any) => ({ ...r, platform: 'Weibo' })));
        await new Promise(res => setTimeout(res, 10000));
      }
      
      if (platformsArr.includes('Bilibili')) {
        const bilibiliResults = await bingSearch(`${task.keyword} site:bilibili.com`, 1);
        allResults.push(...bilibiliResults.map((r: any) => ({ ...r, platform: 'Bilibili' })));
        await new Promise(res => setTimeout(res, 10000));
      }
      
      if (platformsArr.includes('Tieba')) {
        const tiebaResults = await bingSearch(`${task.keyword} site:tieba.baidu.com`, 1);
        allResults.push(...tiebaResults.map((r: any) => ({ ...r, platform: 'Tieba' })));
        await new Promise(res => setTimeout(res, 10000));
      }
      
      if (platformsArr.includes('Zhihu')) {
        const zhihuResults = await bingSearch(`${task.keyword} site:zhihu.com`, 1);
        allResults.push(...zhihuResults.map((r: any) => ({ ...r, platform: 'Zhihu' })));
        await new Promise(res => setTimeout(res, 10000));
      }

      if (allResults.length === 0) {
        await prisma.alertTask.update({ where: { id: task.id }, data: { lastRunAt: new Date() } });
        continue;
      }

      allResults.sort(() => Math.random() - 0.5);

      const events = await analyzeAlertCredibility(task.keyword, allResults);
      const newEvents = [];
      
      for (const event of events) {
        if (!event.isReal) continue;

        const sourceHash = crypto.createHash('md5').update(event.url || event.summary).digest('hex');
        const exists = await prisma.alertRecord.findFirst({
          where: { taskId: task.id, sourceHash }
        });

        if (exists) continue;

        await prisma.alertRecord.create({
          data: {
            title: event.title,
            summary: event.summary,
            url: event.url,
            platform: event.platform || 'General',
            isReal: event.isReal,
            credibility: event.credibility || 50,
            analysis: event.analysis,
            sourceHash,
            taskId: task.id
          }
        });

        console.log(`[AlertTask: ${task.keyword}] Found Real Event: ${event.title} (Credibility: ${event.credibility})`);
        newEvents.push(event);
      }
      
      if (newEvents.length > 0) {
        let wordCloudImgUrl = null;
        try {
          const aiWordCloud = await generateRefinedWordCloud(task.keyword, newEvents);
          if (aiWordCloud && aiWordCloud.length > 0) {
            const top20 = aiWordCloud.sort((a: any, b: any) => b.value - a.value).slice(0, 20);
            let wordArr: string[] = [];
            top20.forEach((w: any) => {
              const count = Math.max(1, Math.floor((w.value || 10) / 10));
              for (let i = 0; i < count; i++) wordArr.push(w.name);
            });
            const textStr = wordArr.join(' ');
            wordCloudImgUrl = `https://quickchart.io/wordcloud?text=${encodeURIComponent(textStr)}&width=600&height=400&colors=red,blue,green,orange,purple,darkblue`;
          }
        } catch (err) {
          console.error("Failed to generate word cloud for alert", err);
        }

        await sendNotification(task, newEvents, wordCloudImgUrl);

        // Export to separate file folder
        try {
          const dateStr = new Date().toISOString().split('T')[0];
          const folderPath = path.resolve(__dirname, '../../../data/alerts');
          if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
          }
          const safeWord = task.keyword.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_');
          const timestamp = Date.now();
          const filename = `${dateStr}_${safeWord}_${timestamp}.json`;
          fs.writeFileSync(path.join(folderPath, filename), JSON.stringify({ keyword: task.keyword, events: newEvents }, null, 2), 'utf-8');
        } catch (err) {
          console.error(`[AlertTask: ${task.keyword}] Failed to export alert data:`, err);
        }
      }

      await prisma.alertTask.update({ where: { id: task.id }, data: { lastRunAt: new Date() } });
    }
  } catch (e) {
    console.error("Alert Cron job error:", e);
  }
}
