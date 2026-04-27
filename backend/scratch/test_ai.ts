import { deepAnalyzeEvent } from '../src/services/ai';
import { bingSearch } from '../src/services/search';

async function run() {
  const keyword = "新三国";
  const res = await bingSearch(`${keyword} site:bilibili.com`);
  console.log("Bing returned:", res.length);
  const aiRes = await deepAnalyzeEvent(keyword, res);
  console.log("AI returned items:", aiRes?.results?.length);
  
  if (aiRes?.results) {
    for(const r of aiRes.results) {
      console.log(`- ${r.isReal}: ${r.summary}`);
    }
  }
}
run();
