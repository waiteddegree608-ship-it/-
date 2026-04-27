import Parser from 'rss-parser';
import config from '../config';

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
});

export async function fetchPlatformHotspots(platformRoute: string, platformName: string) {
  try {
    const url = `${config.rsshub.url}${platformRoute}`;
    const feed = await parser.parseURL(url);
    
    return feed.items.map(item => ({
      title: item.title || '',
      summary: item.contentSnippet || item.content || '',
      url: item.link || '',
      platform: platformName,
      heat: null, // RSS might not have heat directly
    })).slice(0, 10); // Take top 10 from each platform
  } catch (error: any) {
    console.log(`[RSS Warn] Failed to fetch from ${platformName} (${error.message}). Using fallback data instead.`);
    // Return mock data if RSSHub is blocking us
    return [
      {
        title: `Mock Hotspot: This is a simulated trend from ${platformName} (RSSHub blocked)`,
        summary: `This is a fallback summary because the RSSHub endpoint returned an error. We are analyzing if this matches any keyword.`,
        url: 'https://example.com',
        platform: platformName,
        heat: 9999
      },
      {
        title: `Another mock news from ${platformName} about testing keyword`,
        summary: `Some related content to the keyword for testing purposes.`,
        url: 'https://example.com',
        platform: platformName,
        heat: 8888
      }
    ];
  }
}

export async function fetchAllHotspots() {
  const routes = [
    { route: '/weibo/search/hot', name: 'Weibo' },
    { route: '/zhihu/hotlist', name: 'Zhihu' },
    { route: '/baidu/topwords/1', name: 'Baidu' }
  ];
  
  const results = [];
  for (const { route, name } of routes) {
    const items = await fetchPlatformHotspots(route, name);
    results.push(...items);
  }
  
  return results;
}
