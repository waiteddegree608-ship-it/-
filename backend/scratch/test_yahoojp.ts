import axios from 'axios';
import * as cheerio from 'cheerio';

async function testYahooJp(query: string) {
    const url = `https://search.yahoo.co.jp/search?p=${encodeURIComponent(query)}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 10000
    });
    const $ = cheerio.load(response.data);
    const results: any[] = [];
    $('.sw-Card').each((i, el) => {
      const title = $(el).find('h3').text().trim() || $(el).find('.sw-Card__title').text().trim();
      const link = $(el).find('a').attr('href');
      const snippet = $(el).find('.sw-Card__summary').text().trim() || $(el).text().replace(/\s+/g, ' ').substring(0, 200).trim();
      if (title && link) {
        results.push({ title, url: link, snippet });
      }
    });
    return results;
}

testYahooJp("新三国 site:xiaohongshu.com").then(r => console.log("yahoo jp xhs:", r.length, r[0])).catch(e => console.log(e.message));
