import axios from 'axios';
import * as cheerio from 'cheerio';

async function testEcosia(query: string) {
    const url = `https://www.ecosia.org/search?q=${encodeURIComponent(query)}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 10000
    });
    const $ = cheerio.load(response.data);
    const results: any[] = [];
    $('.result').each((i, el) => {
      const title = $(el).find('h2 a').text().trim();
      const link = $(el).find('h2 a').attr('href');
      const snippet = $(el).find('p').text().trim() || $(el).text().replace(/\s+/g, ' ').substring(0, 200).trim();
      if (title && link) {
        results.push({ title, url: link, snippet });
      }
    });
    return results;
}

testEcosia("ChatGPT site:twitter.com").then(r => console.log("ecosia twitter:", r.length, r[0])).catch(e => console.log(e.message));
