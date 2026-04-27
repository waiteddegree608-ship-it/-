import { generateRefinedWordCloud } from '../backend/src/services/ai';
import config from '../backend/src/config';

async function run() {
  const hotspots = [
    {
      title: '中文社区热议 ChatGPT 新版模型',
      summary: '在百度贴吧和 Bilibili 平台，大量用户讨论关于 GPT 5.2 的国内使用教程。'
    }
  ];
  console.log("Generating...");
  try {
    const res = await generateRefinedWordCloud('ChatGPT', hotspots);
    console.log("Result:", res);
  } catch(e) {
    console.error(e);
  }
}
run();
