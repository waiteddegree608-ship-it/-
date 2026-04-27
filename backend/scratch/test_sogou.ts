import axios from 'axios';
import * as cheerio from 'cheerio';

async function sogouWeb(query: string) {
    const url = `https://www.sogou.com/web?query=${encodeURIComponent(query)}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
      timeout: 10000
    });
    const $ = cheerio.load(response.data);
    const results: any[] = [];
    $('.vrwrap, .rb').each((i, el) => {
      const title = $(el).find('h3 a').text().trim();
      let link = $(el).find('h3 a').attr('href');
      if (link && link.startsWith('/link?')) link = 'https://www.sogou.com' + link;
      const snippet = $(el).find('.ft, .str_info, .star-wrapper').text().replace(/\s+/g, ' ').trim();
      if (title && link) {
        results.push({ title, url: link, snippet });
      }
    });
    return results;
}

sogouWeb("新三国 site:bilibili.com").then(r => console.log("sogou bilibili:\n", r.map(x => x.title + ' | ' + x.snippet).join('\n')));
