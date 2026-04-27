import axios from 'axios';
import * as cheerio from 'cheerio';

async function testDdgHtml(query: string) {
    const url = `https://html.duckduckgo.com/html/`;
    const response = await axios.post(url, `q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 10000
    });
    const $ = cheerio.load(response.data);
    const results: any[] = [];
    $('.result').each((i, el) => {
      const title = $(el).find('.result__title a').text().trim();
      const link = $(el).find('.result__url').attr('href');
      if (title && link) {
        results.push({ title, url: link });
      }
    });
    return results;
}

testDdgHtml("ChatGPT site:twitter.com").then(r => console.log("ddg html:", r.length)).catch(e => console.log(e.message));
