import axios from 'axios';
import * as cheerio from 'cheerio';

async function testBrave(query: string) {
    const url = `https://search.brave.com/search?q=${encodeURIComponent(query)}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 10000
    });
    const $ = cheerio.load(response.data);
    const results: any[] = [];
    $('.snippet').each((i, el) => {
      const title = $(el).find('.title').text().trim();
      const link = $(el).find('a').attr('href');
      const snippet = $(el).find('.snippet-description').text().trim();
      if (title && link) {
        results.push({ title, url: link, snippet });
      }
    });
    return results;
}

testBrave("ChatGPT site:twitter.com").then(r => console.log("brave twitter:", r.length, r[0])).catch(e => console.log(e.message));
