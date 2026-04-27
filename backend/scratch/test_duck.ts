import { duckSearch } from './src/services/search';

async function run() {
    const r = await duckSearch("新三国 site:bilibili.com");
    console.log("DuckDuckGo Lite returned:", r.length);
}
run();
