import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import prisma from '../db';
import { fetchAllHotspots } from './rss';
import { analyzeHotspots, deepAnalyzeEvent, generateRefinedWordCloud } from './ai';
import { duckSearch, bingSearch } from './search';
import { getIO } from '../socket';

export async function runScan() {
  console.log("Running scheduled hotspot scan...");
  const io = getIO();
  
  try {
    // 1. Fetch current keywords, newest first
    const keywords = await prisma.keyword.findMany({
      orderBy: { createdAt: 'desc' }
    });
    const keywordStrings = keywords.map((k: any) => k.word);
    
    // 2. Fetch hotspots from RSS
    const hotspots = await fetchAllHotspots();
    
    // 3. Broad analysis using AI
    const validHotspots = hotspots.filter((h: any) => !h.title.includes("Mock Hotspot"));
    const aiResults = await analyzeHotspots(validHotspots, keywordStrings);
    
    for (const res of aiResults) {
      let keywordId = null;
      if (res.matchedKeyword) {
        const matched = keywords.find((k: any) => k.word === res.matchedKeyword);
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

    // 4. ACTIVE KEYWORD MONITORING
    const configPath = require('path').resolve(__dirname, '../../.env');
    let platformsArr = ["DuckDuckGo", "Weibo", "X", "Bilibili", "Tieba", "Zhihu"];
    if (process.env.DEFAULT_PLATFORMS) {
       platformsArr = process.env.DEFAULT_PLATFORMS.split(',');
    }

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
                 allSearchResults.push(...res.map((r: any) => ({ ...r, platform })));
              }
            } catch (err: any) {
              console.error(`[${keyword.word}] Error on ${platform}:`, err.message);
            }
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
           
           newResults.sort(() => Math.random() - 0.5);
           
           const deepRes = await deepAnalyzeEvent(keyword.word, newResults.slice(0, 30));
           if (deepRes && deepRes.results && Array.isArray(deepRes.results)) {
               const newSavedHotspots = [];
               for (const res of deepRes.results) {
                   if (!res.isReal) continue;
                   
                   const sourceHash = crypto.createHash('md5').update(res.url || res.summary).digest('hex');
                   const existing = await prisma.hotspot.findFirst({
                      where: { sourceHash, keywordId: keyword.id }
                   });

                   if (existing) continue;
                   
                   const original = newResults.find(r => r.url === res.url);
                   const realTitle = original ? original.title : `Keyword: ${keyword.word}`;
                   const mappedPlatform = original ? original.platform : 'General';

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
                   
                   newSavedHotspots.push(savedHotspot);
                   if (io) io.emit('new_hotspot', savedHotspot);
                   if (io) io.emit('hotspot_alert', { keyword: keyword.word, details: res });
               }

               if (newSavedHotspots.length > 0) {
                 try {
                   const dateStr = new Date().toISOString().split('T')[0];
                   const folderPath = path.resolve(__dirname, '../../../data/hotspots');
                   if (!fs.existsSync(folderPath)) {
                     fs.mkdirSync(folderPath, { recursive: true });
                   }
                   const safeWord = keyword.word.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_');
                   const timestamp = Date.now();
                   const filename = `${dateStr}_${safeWord}_${timestamp}.json`;
                   fs.writeFileSync(path.join(folderPath, filename), JSON.stringify({ keyword: keyword.word, hotspots: newSavedHotspots }, null, 2), 'utf-8');
                 } catch (err) {
                   console.error(`[${keyword.word}] Failed to export hotspots data:`, err);
                 }
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

            // Export to separate file folder
            try {
              const dateStr = new Date().toISOString().split('T')[0];
              const folderPath = path.resolve(__dirname, '../../../data/wordclouds');
              if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
              }
              const safeWord = keyword.word.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_');
              const timestamp = Date.now();
              const filename = `${dateStr}_${safeWord}_${timestamp}.json`;
              fs.writeFileSync(path.join(folderPath, filename), JSON.stringify({ keyword: keyword.word, cloudData: aiWordCloud }, null, 2), 'utf-8');
            } catch (err) {
              console.error(`[${keyword.word}] Failed to export word cloud data:`, err);
            }
          }
        }
    }

  } catch (e) {
    console.error("Cron job error:", e);
  }
}
