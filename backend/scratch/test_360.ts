import axios from 'axios';
import * as cheerio from 'cheerio';

async function test360(query: string) {
    const url = `https://www.so.com/s?q=${encodeURIComponent(query)}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 10000
    });
    const $ = cheerio.load(response.data);
    const results: any[] = [];
    $('.res-list').each((i, el) => {
      const title = $(el).find('h3 a').text().trim();
      let link = $(el).find('h3 a').attr('href');
      if (link && link.startsWith('/link?')) link = 'https://www.so.com' + link;
      const snippet = $(el).find('.res-desc, .res-rich').text().trim() || $(el).text().replace(/\s+/g, ' ').substring(0, 200).trim();
      if (title && link) {
        results.push({ title, url: link, snippet });
      }
    });
    return results;
}

test360("东华大学 site:tieba.baidu.com").then(r => console.log("360 tieba:", r.length, r[0])).catch(e => console.log(e.message));
