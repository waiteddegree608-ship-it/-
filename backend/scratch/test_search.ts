import { bingSearch, duckSearch } from '../src/services/search';

async function run() {
  console.log("Testing bing...");
  const bingRes = await bingSearch("ChatGPT site:bilibili.com", 1);
  console.log("Bing results:", bingRes.length);

  console.log("Testing duckduckgo...");
  const duckRes = await duckSearch("ChatGPT", 1);
  console.log("Duck results:", duckRes.length);
}
run();
