import { bingSearch } from '../src/services/search';
bingSearch('ChatGPT site:weibo.com').then(r => console.log('weibo:', r.length));
