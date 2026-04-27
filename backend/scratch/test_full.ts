import { bingSearch, duckSearch } from '../src/services/search';

async function testAll() {
  console.log("=== Testing Bing General ===");
  try {
    const b1 = await bingSearch("ChatGPT", 1);
    console.log("Bing General Results:", b1.length);
  } catch(e) { console.log("Bing error:", (e as any).message); }
}
testAll().then(() => console.log("Done"));
