import axios from 'axios';
import * as cheerio from 'cheerio';

const vqdMap = new Map<string, string>();

export async function duckSearch(query: string, page: number = 1) {
  try {
    const s = (page - 1) * 10;
    let postData = `q=${encodeURIComponent(query)}`;
    
    if (page > 1) {
      const vqd = vqdMap.get(query);
      if (vqd) {
        postData += `&s=${s}&nextParams=&v=l&o=json&dc=${s + 1}&api=d.js&vqd=${encodeURIComponent(vqd)}`;
      } else {
        return []; // If we lost the token, we can't paginate further safely
      }
    }

    const response = await axios.post(`https://lite.duckduckgo.com/lite/`, postData, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      }
    });
    
    const $ = cheerio.load(response.data);
    const results: any[] = [];
    
    // Save token for next page
    const newVqd = $('input[name="vqd"]').val();
    if (newVqd) {
      vqdMap.set(query, newVqd as string);
    }
    
    $('tr').each((i, el) => {
      const titleEl = $(el).find('a.result-link');
      if (titleEl.length > 0) {
        const title = titleEl.text().trim();
        const url = titleEl.attr('href');
        const snippetEl = $(el).next().find('.result-snippet');
        const snippet = snippetEl.text().trim();
        
        if (title && url && !url.includes('duckduckgo.com')) {
          results.push({ title, url, snippet });
        }
      }
    });
    
    if (results.length > 0) return results;
    return [];
  } catch (error: any) {
    console.error(`Search error on page ${page}:`, error.message);
    return [];
  }
}
