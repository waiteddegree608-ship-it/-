import axios from 'axios';
import * as cheerio from 'cheerio';

async function testReddit(query: string) {
    const url = `https://www.reddit.com/search.xml?q=${encodeURIComponent(query)}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000
    });
    const $ = cheerio.load(response.data, { xmlMode: true });
    const results: any[] = [];
    $('entry').each((i, el) => {
      const title = $(el).find('title').text().trim();
      const link = $(el).find('link').attr('href');
      const snippet = $(el).find('content').text().replace(/<[^>]+>/g, '').substring(0, 200).trim();
      if (title && link) {
        results.push({ title, url: link, snippet });
      }
    });
    return results;
}

testReddit("ChatGPT").then(r => console.log("reddit:", r.length, r[0])).catch(e => console.log(e.message));
