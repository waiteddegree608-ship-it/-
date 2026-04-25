import cron from 'node-cron';
import crypto from 'crypto';
import prisma from '../db';
import config from '../config';
import { fetchAllHotspots } from './rss';
import { analyzeHotspots, deepAnalyzeEvent, generateRefinedWordCloud, analyzeAlertCredibility } from './ai';
import { duckSearch } from './search';
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
    for (const keyword of keywords) {
        console.log(`\n======================================`);
        console.log(`Actively continuous-searching for keyword: ${keyword.word}...`);
        
        let page = 1;
        while (page <= 10) { // Safety limit of 10 pages per keyword
           console.log(`[${keyword.word}] Fetching Page ${page}...`);
           try {
             const searchResults = await duckSearch(keyword.word, page);
             
             if (!searchResults || searchResults.length === 0) {
                 console.log(`[${keyword.word}] No more results found at page ${page}. Continuous historical crawl finished.`);
                 break;
             }

             const newResults = [];
             for (const r of searchResults) {
                 const hash = crypto.createHash('md5').update(r.url || r.title).digest('hex');
                 const exists = await prisma.hotspot.findFirst({ where: { sourceHash: hash, keywordId: keyword.id } });
                 if (!exists) newResults.push(r);
             }

             if (newResults.length === 0) {
                console.log(`[${keyword.word}] Page ${page} has no new articles. Caught up to history. Stopping continuous crawl.`);
                break; // Stop going to next page if current page is already fully cached
             }

             console.log(`[${keyword.word}] Sending ${newResults.length} new items from Page ${page} to AI...`);
             const deepRes = await deepAnalyzeEvent(keyword.word, newResults);
             
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
                     const realTitle = original ? original.title : `DuckDuckGo: ${keyword.word}`;

                     // Save the individual search result as a hotspot
                     const savedHotspot = await prisma.hotspot.create({
                        data: {
                          title: realTitle,
                          summary: res.summary || '',
                          platform: 'DuckDuckGo', 
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
           } catch (err: any) {
             console.error(`[${keyword.word}] Error on page ${page}:`, err.message);
             // On API timeout, maybe break this keyword's continuous crawl to be safe
             break;
           }
           
           page++;
           // Sleep for 2 seconds between pages to simulate human crawling & protect API
           await new Promise(resolve => setTimeout(resolve, 2000));
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
      }
      
      if (platformsArr.includes('Xiaohongshu')) {
        const xhbResults = await duckSearch(`${task.keyword} site:xiaohongshu.com`, 1);
        allResults.push(...xhbResults.map(r => ({ ...r, platform: 'Xiaohongshu' })));
      }
      
      if (platformsArr.includes('X')) {
        const twitterResults = await duckSearch(`${task.keyword} site:twitter.com OR site:x.com`, 1);
        allResults.push(...twitterResults.map(r => ({ ...r, platform: 'X/Twitter' })));
      }
      
      if (platformsArr.includes('Weibo')) {
        const weiboResults = await duckSearch(`${task.keyword} site:weibo.com`, 1);
        allResults.push(...weiboResults.map(r => ({ ...r, platform: 'Weibo' })));
      }

      if (allResults.length === 0) {
        await prisma.alertTask.update({ where: { id: task.id }, data: { lastRunAt: new Date() } });
        continue;
      }

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
        // Trigger aggregated webhook or email if configured
        await sendNotification(task, newEvents);
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
