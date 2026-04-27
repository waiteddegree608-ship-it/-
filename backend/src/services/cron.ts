import cron from 'node-cron';
import crypto from 'crypto';
import prisma from '../db';
import config from '../config';
import { fetchAllHotspots } from './rss';
import { analyzeHotspots, deepAnalyzeEvent, generateRefinedWordCloud, analyzeAlertCredibility } from './ai';
import { duckSearch, bingSearch } from './search';
import { getIO } from '../socket';
import { sendNotification } from './notify';

export async function runScan() {
  console.log("Running scheduled hotspot scan...");
  const io = getIO();
  
  try {
    // 1. Fetch current keywords, newest first
    const keywords = await prisma.keyword.findMany({
      orderBy: { createdAt: 'desc' }
    });
    const keywordStrings = keywords.map(k => k.word);
    
    // 2. Fetch hotspots from RSS
    const hotspots = await fetchAllHotspots();
    
    // 3. Broad analysis using AI (Filter out Mock Data from RSS failure if any)
    const validHotspots = hotspots.filter(h => !h.title.includes("Mock Hotspot"));
    const aiResults = await analyzeHotspots(validHotspots, keywordStrings);
    
    for (const res of aiResults) {
      let keywordId = null;
      if (res.matchedKeyword) {
        const matched = keywords.find(k => k.word === res.matchedKeyword);
        if (matched) keywordId = matched.id;
      }

      // Save to DB
      const savedHotspot = await prisma.hotspot.create({
        data: {
          title: res.title,
          summary: res.analysis || '',
          platform: 'RSSHub', 
          isReal: res.isReal === true,
          keywordId
        }
      });

      if (io) io.emit('new_hotspot', savedHotspot);
    }

    // 4. ACTIVE KEYWORD MONITORING (Bypass RSSHub limit)
    // Directly search DuckDuckGo for every keyword to ensure we don't miss anything even if RSS is down
    const configPath = require('path').resolve(__dirname, '../../config.json');
    let localConfig: any = {};
    try {
      localConfig = JSON.parse(require('fs').readFileSync(configPath, 'utf8'));
    } catch (e) {}
    
    const platformsArr = localConfig.defaults?.platforms || ["DuckDuckGo", "Weibo", "X", "Bilibili", "Tieba", "Zhihu"];

    for (const keyword of keywords) {
        if (!keyword.isActive) continue;

        console.log(`\n======================================`);
        console.log(`Actively cross-platform searching for keyword: ${keyword.word}...`);
        
        let allSearchResults: any[] = [];

        for (const platform of platformsArr) {
            let queryStr = keyword.word;
            if (platform === 'Weibo') queryStr += ' site:weibo.com';
            else if (platform === 'Xiaohongshu') queryStr += ' site:xiaohongshu.com';
            else if (platform === 'X') queryStr += ' site:twitter.com OR site:x.com';
            else if (platform === 'Bilibili') queryStr += ' site:bilibili.com';
            else if (platform === 'Tieba') queryStr += ' site:tieba.baidu.com';
            else if (platform === 'Zhihu') queryStr += ' site:zhihu.com';
            
            console.log(`[${keyword.word}] Fetching from ${platform}...`);
            try {
              let res;
              const foreignPlatforms = ['X', 'DuckDuckGo', 'Reddit'];
              if (foreignPlatforms.includes(platform)) {
                res = await duckSearch(queryStr, 1);
              } else {
                res = await bingSearch(queryStr, 1);
              }
              if (res && res.length > 0) {
                 allSearchResults.push(...res.map(r => ({ ...r, platform })));
              }
            } catch (err: any) {
              console.error(`[${keyword.word}] Error on ${platform}:`, err.message);
            }
            // Delay for 10 seconds to ensure extreme safety against rate limiting
            await new Promise(resolve => setTimeout(resolve, 10000));
        }

        const newResults = [];
        for (const r of allSearchResults) {
            const hash = crypto.createHash('md5').update(r.url || r.title).digest('hex');
            const exists = await prisma.hotspot.findFirst({ where: { sourceHash: hash, keywordId: keyword.id } });
            if (!exists) newResults.push(r);
        }

        if (newResults.length === 0) {
           console.log(`[${keyword.word}] No new articles found across platforms. Caught up to history.`);
        } else {
           console.log(`[${keyword.word}] Sending ${newResults.length} new items to AI...`);
           
           // Shuffle the results before slicing to ensure all platforms get equal representation 
           // and we don't just cut off platforms that are fetched last (like Bilibili/Tieba).
           newResults.sort(() => Math.random() - 0.5);
           
           // Process in chunks if too many (to avoid AI context overflow)
           const deepRes = await deepAnalyzeEvent(keyword.word, newResults.slice(0, 30));
           if (deepRes && deepRes.results && Array.isArray(deepRes.results)) {
               for (const res of deepRes.results) {
                   if (!res.isReal) continue;
                   
                   // Deduplication check for this specific article
                   const sourceHash = crypto.createHash('md5').update(res.url || res.summary).digest('hex');
                   const existing = await prisma.hotspot.findFirst({
                      where: { sourceHash, keywordId: keyword.id }
                   });

                   if (existing) continue;
                   
                   const original = newResults.find(r => r.url === res.url);
                   const realTitle = original ? original.title : `Keyword: ${keyword.word}`;
                   const mappedPlatform = original ? original.platform : 'General';

                   // Save the individual search result as a hotspot
                   const savedHotspot = await prisma.hotspot.create({
                      data: {
                        title: realTitle,
                        summary: res.summary || '',
                        platform: mappedPlatform, 
                        url: res.url || null,
                        isReal: true,
                        publishTime: res.publishTime || '未知',
                        tags: (res.keywords && Array.isArray(res.keywords)) ? res.keywords.join(',') : null,
                        sourceHash: sourceHash,
                        keywordId: keyword.id,
                        heat: res.heatEstimate || 50,
                        notified: true
                      }
                   });
                   
                   if (io) io.emit('new_hotspot', savedHotspot);
                   if (io) io.emit('hotspot_alert', { keyword: keyword.word, details: res });
               }
           }
        }

        // 5. Generate Refined Word Cloud using AI
        console.log(`[${keyword.word}] Generating refined AI Word Cloud...`);
        const allHotspotsForKeyword = await prisma.hotspot.findMany({
          where: { keywordId: keyword.id, isReal: true },
          select: { title: true, summary: true, createdAt: true }
        });
        
        if (allHotspotsForKeyword.length > 0) {
          const aiWordCloud = await generateRefinedWordCloud(keyword.word, allHotspotsForKeyword);
          if (aiWordCloud) {
            await prisma.keyword.update({
              where: { id: keyword.id },
              data: { cloudData: JSON.stringify(aiWordCloud) }
            });
            console.log(`[${keyword.word}] AI Word Cloud updated successfully.`);
            if (io) io.emit('keyword_cloud_updated', { keywordId: keyword.id, cloudData: aiWordCloud });
          }
        }
    }

  } catch (e) {
    console.error("Cron job error:", e);
  }
}

export async function runAlertScan(force: boolean = false) {
  console.log(`Running scheduled Alert Task scan... (force: ${force})`);
  
  try {
    const tasks = await prisma.alertTask.findMany();
    const now = Date.now();

    for (const task of tasks) {
      if (!task.isActive) continue;

      // Check if it's time to run based on intervalHours
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
        allResults.push(...generalResults.map(r => ({ ...r, platform: 'Search Engine' })));
        await new Promise(res => setTimeout(res, 10000));
      }
      
      if (platformsArr.includes('Xiaohongshu')) {
        const xhbResults = await bingSearch(`${task.keyword} site:xiaohongshu.com`, 1);
        allResults.push(...xhbResults.map(r => ({ ...r, platform: 'Xiaohongshu' })));
        await new Promise(res => setTimeout(res, 10000));
      }
      
      if (platformsArr.includes('X')) {
        const twitterResults = await duckSearch(`${task.keyword} site:twitter.com OR site:x.com`, 1);
        allResults.push(...twitterResults.map(r => ({ ...r, platform: 'X/Twitter' })));
        await new Promise(res => setTimeout(res, 10000));
      }
      
      if (platformsArr.includes('Weibo')) {
        const weiboResults = await bingSearch(`${task.keyword} site:weibo.com`, 1);
        allResults.push(...weiboResults.map(r => ({ ...r, platform: 'Weibo' })));
        await new Promise(res => setTimeout(res, 10000));
      }
      
      if (platformsArr.includes('Bilibili')) {
        const bilibiliResults = await bingSearch(`${task.keyword} site:bilibili.com`, 1);
        allResults.push(...bilibiliResults.map(r => ({ ...r, platform: 'Bilibili' })));
        await new Promise(res => setTimeout(res, 10000));
      }
      
      if (platformsArr.includes('Tieba')) {
        const tiebaResults = await bingSearch(`${task.keyword} site:tieba.baidu.com`, 1);
        allResults.push(...tiebaResults.map(r => ({ ...r, platform: 'Tieba' })));
        await new Promise(res => setTimeout(res, 10000));
      }
      
      if (platformsArr.includes('Zhihu')) {
        const zhihuResults = await bingSearch(`${task.keyword} site:zhihu.com`, 1);
        allResults.push(...zhihuResults.map(r => ({ ...r, platform: 'Zhihu' })));
        await new Promise(res => setTimeout(res, 10000));
      }

      if (allResults.length === 0) {
        await prisma.alertTask.update({ where: { id: task.id }, data: { lastRunAt: new Date() } });
        continue;
      }

      // Shuffle the results to ensure fair platform representation in the AI prompt
      allResults.sort(() => Math.random() - 0.5);

      const events = await analyzeAlertCredibility(task.keyword, allResults);
      const newEvents = [];
      
      for (const event of events) {
        if (!event.isReal) continue;

        // Deduplicate using sourceHash
        const sourceHash = crypto.createHash('md5').update(event.url || event.summary).digest('hex');
        const exists = await prisma.alertRecord.findFirst({
          where: { taskId: task.id, sourceHash }
        });

        if (exists) continue;

        const newRecord = await prisma.alertRecord.create({
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

        // Trigger aggregated webhook or email if configured
        await sendNotification(task, newEvents, wordCloudImgUrl);
      }

      // Update lastRunAt
      await prisma.alertTask.update({ where: { id: task.id }, data: { lastRunAt: new Date() } });
    }
  } catch (e) {
    console.error("Alert Cron job error:", e);
  }
}

export function initCron() {
  cron.schedule(config.cron.schedule, () => {
    runScan();
  });
  // Check alert tasks every 10 minutes
  cron.schedule('*/10 * * * *', () => {
    runAlertScan();
  });
}
