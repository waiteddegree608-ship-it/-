import axios from 'axios';
import * as cheerio from 'cheerio';

async function testGnews(query: string) {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`;
    const response = await axios.get(url, { timeout: 10000 });
    const $ = cheerio.load(response.data, { xmlMode: true });
    return $('item').length;
}

async function testYahooTw(query: string) {
    const url = `https://tw.search.yahoo.com/search?p=${encodeURIComponent(query)}`;
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 10000
    });
    const $ = cheerio.load(response.data);
    return $('.algo').length || $('.sw-Card').length || $('.compTitle').length;
}

async function run() {
  console.log("gnews bilibili:", await testGnews("新三国 site:bilibili.com").catch(e=>e.message));
  console.log("yahoo tw bilibili:", await testYahooTw("新三国 site:bilibili.com").catch(e=>e.message));
  console.log("yahoo tw tieba:", await testYahooTw("东华大学 site:tieba.baidu.com").catch(e=>e.message));
  console.log("yahoo tw xiaohongshu:", await testYahooTw("穿搭 site:xiaohongshu.com").catch(e=>e.message));
}
run();
