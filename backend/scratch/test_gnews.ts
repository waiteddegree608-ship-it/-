import axios from 'axios';
import * as cheerio from 'cheerio';

async function testGoogleNews(query: string) {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000
    });
    const $ = cheerio.load(response.data, { xmlMode: true });
    const results: any[] = [];
    $('item').each((i, el) => {
      const title = $(el).find('title').text().trim();
      const link = $(el).find('link').text().trim();
      const snippet = $(el).find('description').text().replace(/<[^>]+>/g, '').trim();
      if (title && link) {
        results.push({ title, url: link, snippet });
      }
    });
    return results;
}

testGoogleNews("ChatGPT site:twitter.com").then(r => console.log("google news twitter:", r.length, r[0])).catch(e => console.log(e.message));
