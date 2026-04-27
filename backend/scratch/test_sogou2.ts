import axios from 'axios';
import * as cheerio from 'cheerio';

async function testSogou(query: string) {
    const url = `https://www.sogou.com/web?query=${encodeURIComponent(query)}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000
    });
    const $ = cheerio.load(response.data);
    const results: any[] = [];
    $('.vrwrap, .rb').each((i, el) => {
      const title = $(el).find('h3 a').text().trim();
      const link = $(el).find('h3 a').attr('href');
      if (title && link) {
        results.push({ title, url: link });
      }
    });
    return results;
}

testSogou("ChatGPT site:twitter.com").then(r => console.log("sogou twitter:", r.length, r[0])).catch(console.error);
testSogou("ChatGPT site:reddit.com").then(r => console.log("sogou reddit:", r.length, r[0])).catch(console.error);
