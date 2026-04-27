import fs from 'fs';
import path from 'path';
import prisma from '../src/db';

async function exportOldData() {
  console.log('Starting export of old data from dev.db...');
  
  // 1. Export Wordclouds
  const keywords = await prisma.keyword.findMany({
    where: { cloudData: { not: null } }
  });
  
  let wordcloudCount = 0;
  for (const kw of keywords) {
    if (!kw.cloudData) continue;
    try {
      const parsedData = typeof kw.cloudData === 'string' ? JSON.parse(kw.cloudData) : kw.cloudData;
      const dateStr = kw.updatedAt.toISOString().split('T')[0];
      const folderPath = path.resolve(__dirname, '../../data/wordclouds');
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      const safeWord = kw.word.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_');
      const timestamp = kw.updatedAt.getTime();
      const filename = `${dateStr}_${safeWord}_${timestamp}_legacy.json`;
      
      fs.writeFileSync(
        path.join(folderPath, filename), 
        JSON.stringify({ keyword: kw.word, cloudData: parsedData, isLegacyExport: true }, null, 2), 
        'utf-8'
      );
      wordcloudCount++;
    } catch (e) {
      console.error(`Failed to export wordcloud for ${kw.word}:`, e);
    }
  }
  console.log(`Exported ${wordcloudCount} wordcloud records.`);

  // 2. Export Alerts
  const tasks = await prisma.alertTask.findMany({
    include: {
      records: true
    }
  });

  let alertCount = 0;
  for (const task of tasks) {
    if (!task.records || task.records.length === 0) continue;
    
    try {
      // Group records by day or just export all as one file since it's legacy data
      // For legacy, we'll just dump all records for this task into one file to preserve them
      const dateStr = new Date().toISOString().split('T')[0];
      const folderPath = path.resolve(__dirname, '../../data/alerts');
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      const safeWord = task.keyword.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_');
      const timestamp = Date.now();
      const filename = `${dateStr}_${safeWord}_${timestamp}_legacy_bulk.json`;
      
      fs.writeFileSync(
        path.join(folderPath, filename), 
        JSON.stringify({ keyword: task.keyword, events: task.records, isLegacyBulkExport: true }, null, 2), 
        'utf-8'
      );
      alertCount += task.records.length;
    } catch (e) {
      console.error(`Failed to export alerts for ${task.keyword}:`, e);
    }
  }
  console.log(`Exported ${alertCount} alert records across ${tasks.filter(t => t.records.length > 0).length} tasks.`);
  
  // 3. Export Hotspots
  const hotspots = await prisma.hotspot.findMany({
    include: { keyword: true }
  });
  
  // Group by keyword
  const hotspotsByKeyword: Record<string, any[]> = {};
  for (const hs of hotspots) {
    const kw = hs.keyword?.word || 'General';
    if (!hotspotsByKeyword[kw]) hotspotsByKeyword[kw] = [];
    hotspotsByKeyword[kw].push(hs);
  }
  
  let hotspotCount = 0;
  for (const [kw, hsList] of Object.entries(hotspotsByKeyword)) {
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const folderPath = path.resolve(__dirname, '../../data/hotspots');
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      const safeWord = kw.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_');
      const timestamp = Date.now();
      const filename = `${dateStr}_${safeWord}_${timestamp}_legacy_bulk.json`;
      
      fs.writeFileSync(
        path.join(folderPath, filename), 
        JSON.stringify({ keyword: kw, hotspots: hsList, isLegacyBulkExport: true }, null, 2), 
        'utf-8'
      );
      hotspotCount += hsList.length;
    } catch (e) {
      console.error(`Failed to export hotspots for ${kw}:`, e);
    }
  }
  console.log(`Exported ${hotspotCount} hotspot records.`);

  console.log('Old data export complete!');
}

exportOldData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
