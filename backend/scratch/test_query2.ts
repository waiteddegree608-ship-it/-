import { bingSearch } from '../src/services/search';

async function run() {
  const keyword = "新三国";
  const res = await bingSearch(`${keyword} site:bilibili.com`);
  for(const r of res) {
    console.log(r.title, "=>", r.url);
  }
}
run();
