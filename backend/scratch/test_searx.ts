import axios from 'axios';

async function testSearx(instance: string, query: string) {
    try {
      const url = `${instance}/search?q=${encodeURIComponent(query)}&format=json`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        timeout: 5000
      });
      console.log(instance, "=>", response.data.results.length);
    } catch(e: any) {
      console.log(instance, "=> Error", e.message);
    }
}

async function run() {
  await testSearx("https://searx.tiekoetter.com", "ChatGPT site:twitter.com");
  await testSearx("https://searx.work", "ChatGPT site:twitter.com");
  await testSearx("https://paulgo.io", "ChatGPT site:twitter.com");
  await testSearx("https://searxng.au", "ChatGPT site:twitter.com");
}
run();
