import axios from 'axios';
import * as cheerio from 'cheerio';

async function testYahooTw(query: string) {
    const url = `https://tw.search.yahoo.com/search?p=${encodeURIComponent(query)}`;
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 10000
    });
    const $ = cheerio.load(response.data);
    const results: any[] = [];
    $('.algo').each((i, el) => {
      let title = $(el).find('h3.title a').text().trim() || $(el).find('.compTitle h3').text().trim() || $(el).find('.compTitle a').text().trim();
      title = title.replace(/^.* › .* › /, ''); // remove breadcrumbs if any
      let link = $(el).find('.compTitle a').attr('href') || $(el).find('h3 a').attr('href');
      // If it's a redirect link (like r.search.yahoo.com), extract RU
      if (link && link.includes('RU=')) {
         const match = link.match(/RU=([^/]+)/);
         if (match) link = decodeURIComponent(match[1]);
      }
      const snippet = $(el).find('.compText').text().trim() || $(el).text().replace(/\s+/g, ' ').substring(0, 200).trim();
      if (title && link) {
        results.push({ title, url: link, snippet });
      }
    });
    return results;
}

testYahooTw("新三国 site:bilibili.com").then(r => console.log("yahoo tw bilibili:\n", r)).catch(e => console.log(e.message));
