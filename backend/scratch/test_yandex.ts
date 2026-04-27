import axios from 'axios';
import * as cheerio from 'cheerio';

async function testYandex(query: string) {
    const url = `https://yandex.com/search/?text=${encodeURIComponent(query)}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000
    });
    const $ = cheerio.load(response.data);
    const results: any[] = [];
    $('.serp-item').each((i, el) => {
      const title = $(el).find('.OrganicTitle-LinkText').text().trim() || $(el).find('a').first().text().trim();
      const link = $(el).find('a').attr('href');
      if (title && link) {
        results.push({ title, url: link });
      }
    });
    return results;
}

testYandex("ChatGPT site:reddit.com").then(r => console.log("yandex reddit:", r.length, r[0])).catch(e => console.log(e.message));
