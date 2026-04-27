import axios from 'axios';
import * as cheerio from 'cheerio';

async function testQwant(query: string) {
    const url = `https://lite.qwant.com/?q=${encodeURIComponent(query)}&t=web`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
      timeout: 10000
    });
    const $ = cheerio.load(response.data);
    const results: any[] = [];
    $('.result').each((i, el) => {
      const title = $(el).find('h2 a').text().trim();
      const link = $(el).find('h2 a').attr('href');
      const snippet = $(el).find('.result-snippet, .result__snippet').text().trim() || $(el).text().replace(/\s+/g, ' ').substring(0, 200).trim();
      if (title && link) {
        results.push({ title, url: link, snippet });
      }
    });
    return results;
}

testQwant("新三国 site:bilibili.com").then(r => console.log("qwant bilibili:", r.length, r[0])).catch(e => console.log(e.message));
