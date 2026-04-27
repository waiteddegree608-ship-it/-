const axios = require('axios');
const cheerio = require('cheerio');
async function test() {
    try {
        const response = await axios.get(`https://www.bing.com/search?q=ChatGPT`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'zh-CN,zh;q=0.9'
            }
        });
        const $ = cheerio.load(response.data);
        const results = [];
        $('.b_algo').each((i, el) => {
            const titleEl = $(el).find('h2 a');
            const title = titleEl.text().trim();
            const url = titleEl.attr('href');
            const snippet = $(el).find('.b_caption p, .b_algoSlug, .b_lineclamp2').text().trim();
            if (title && url) {
                results.push({ title, url, snippet });
            }
        });
        console.log("Found:", results.length, "results");
        console.log(results.slice(0,2));
    } catch(e) {
        console.error(e.message);
    }
}
test();
