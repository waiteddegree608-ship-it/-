import axios from 'axios';
import * as cheerio from 'cheerio';

async function bingWeb(query: string) {
    const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&first=1`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
      timeout: 10000
    });
    const $ = cheerio.load(response.data);
    const results: any[] = [];
    $('.b_algo').each((i, el) => {
      const title = $(el).find('h2 a').text().trim();
      const link = $(el).find('h2 a').attr('href');
      if (title && link) {
        results.push({ title, url: link });
      }
    });
    return results;
}

bingWeb("新三国 bilibili").then(r => console.log("bilibili:", r.length, r[0]));
bingWeb("新三国 贴吧").then(r => console.log("tieba:", r.length, r[0]));
