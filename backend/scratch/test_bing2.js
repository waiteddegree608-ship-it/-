const axios = require('axios');
const cheerio = require('cheerio');
async function test() {
    try {
        const query = 'ChatGPT site:bilibili.com';
        const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&first=1`;
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'zh-CN,zh;q=0.9',
            },
            timeout: 10000
        });
        const $ = cheerio.load(response.data);
        const results = [];
        $('.b_algo').each((i, el) => {
            const titleEl = $(el).find('h2 a');
            const title = titleEl.text().trim();
            const link = titleEl.attr('href');
            console.log("Found raw link:", link);
            if (title && link && !link.includes('/search?q=')) {
                results.push({ title, url: link });
            }
        });
        console.log("Found:", results.length, "results");
        if (results.length === 0) {
            console.log(response.data.substring(0, 500));
        }
    } catch(e) {
        console.error(e.message);
    }
}
test();
