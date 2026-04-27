import axios from 'axios';
import * as cheerio from 'cheerio';

async function testYahoo(query: string) {
    const url = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 10000
    });
    const $ = cheerio.load(response.data);
    const results: any[] = [];
    $('.algo').each((i, el) => {
      const title = $(el).find('h3 a').text().trim();
      const link = $(el).find('h3 a').attr('href');
      const snippet = $(el).find('.compTitle + div').text().trim() || $(el).find('.fz-ms').text().trim() || $(el).text().substring(0, 200).trim();
      if (title && link) {
        results.push({ title, url: link, snippet });
      }
    });
    return results;
}

testYahoo("ChatGPT site:twitter.com").then(r => console.log("yahoo twitter:", r.length, r[0])).catch(e => console.log(e.message));
