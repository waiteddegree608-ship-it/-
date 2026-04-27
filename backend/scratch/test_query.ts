import { bingSearch } from '../src/services/search';

async function test() {
  const query1 = "新三国 site:bilibili.com";
  console.log("Testing:", query1);
  const res1 = await bingSearch(query1, 1);
  console.log(`Found ${res1.length} results for bilibili`);

  const query2 = "新三国 site:tieba.baidu.com";
  console.log("Testing:", query2);
  const res2 = await bingSearch(query2, 1);
  console.log(`Found ${res2.length} results for tieba`);
}

test();
