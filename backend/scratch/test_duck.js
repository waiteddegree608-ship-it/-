const axios = require('axios');
const cheerio = require('cheerio');
async function test() {
    try {
        const response = await axios.post(`https://lite.duckduckgo.com/lite/`, "q=ChatGPT", {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept-Language': 'zh-CN,zh;q=0.9',
                'Referer': 'https://lite.duckduckgo.com/'
            }
        });
        const $ = cheerio.load(response.data);
        const results = [];
        $('tr').each((i, el) => {
            const titleEl = $(el).find('a.result-link');
            if (titleEl.length > 0) {
                const title = titleEl.text().trim();
                const url = titleEl.attr('href');
                if (title && url && !url.includes('duckduckgo.com')) {
                    results.push({ title, url });
                }
            }
        });
        console.log("Found:", results.length, "results");
        if (results.length === 0) {
            console.log("HTML response snippet:", response.data.substring(0, 500));
        }
    } catch(e) {
        console.error(e.message);
    }
}
test();
