import axios from 'axios';
import config from '../config';

const { apiUrl, apiKey, model } = config.siliconflow;

export async function analyzeHotspots(hotspots: any[], keywords: string[]) {
  if (!apiKey) {
    console.warn("No API Key configured for SiliconFlow");
    return [];
  }
  if (!hotspots || hotspots.length === 0) {
    console.warn("Hotspots list is empty, skipping AI analysis");
    return [];
  }

  const prompt = `
You are an expert AI analyst. Please analyze the following list of hot topics.
Check if they match any of the following keywords: ${keywords.join(', ')}.
For each topic, output whether it's related, if it's a real event (not a rumor), and a short summary.
IMPORTANT: You MUST respond entirely in Simplified Chinese (简体中文). 
Respond in JSON format:
{ "results": [{ "title": "...", "isRelated": true/false, "matchedKeyword": "...", "isReal": true/false, "analysis": "中文分析内容..." }] }

Hot topics:
${JSON.stringify(hotspots)}
  `;

  try {
    const response = await axios.post(`${apiUrl}/chat/completions`, {
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" }
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const result = response.data.choices[0].message.content;
    return JSON.parse(result).results || [];
  } catch (err) {
    console.error("Error calling AI model", err);
    return [];
  }
}

export async function deepAnalyzeEvent(keyword: string, searchResults: any[]) {
    if (!apiKey) {
    console.warn("No API Key configured for SiliconFlow");
    return null;
  }

  const prompt = `
A keyword "${keyword}" was triggered. Here are several search results (news items):
${JSON.stringify(searchResults)}

Please analyze EACH result INDIVIDUALLY.
For EACH item:
1. Determine if this specific article represents a real event happening right now about the keyword.
2. Extract 3-5 specific entity keywords from this specific article.
3. Write a concise summary (1-3 sentences) specifically for this article.
4. Extract or deduce the original "publishTime" (发布时间) of the article from its snippet (e.g., if it says "13 hours ago", convert it to a relative time string like "13小时前" or an exact date if mentioned). If totally unknown, return "未知".
5. Include the original "url" of the article in the output exactly as provided so we can map it back.

IMPORTANT: You MUST respond entirely in Simplified Chinese (简体中文).
Respond in JSON format with an array of "results":
{
  "results": [
    {
      "url": "https://...",
      "isReal": true/false,
      "summary": "...",
      "heatEstimate": 80,
      "publishTime": "2026-04-18" or "13小时前",
      "keywords": ["同济大学", "王某", "Nature"]
    }
  ]
}
  `;

  try {
    const response = await axios.post(`${apiUrl}/chat/completions`, {
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" }
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const result = response.data.choices[0].message.content;
    return JSON.parse(result);
  } catch (err) {
    console.error("Error calling AI model", err);
    return null;
  }
}

export async function generateRefinedWordCloud(keyword: string, hotspots: any[]) {
  if (!apiKey) {
    console.warn("No API Key configured for SiliconFlow");
    return null;
  }

  // Summarize the hotspots text to send to AI with time decay context
  const now = Date.now();
  const corpus = hotspots.map(h => {
     const daysAgo = h.createdAt ? Math.floor((now - new Date(h.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;
     const timeTag = daysAgo === 0 ? "今天" : `距今${daysAgo}天前`;
     return `[${timeTag}] 标题: ${h.title}\n摘要: ${h.summary || ''}`;
  }).join('\n\n').substring(0, 10000); // Prevent context limit

  const prompt = `
A keyword "${keyword}" was triggered. Here are the collected news snippets:
${corpus}

Your task is to generate exactly 30 highly relevant and specific keywords for a Word Cloud visualization of this event.
1. Merge synonyms and identical concepts (e.g. if the news is about "王某" but another mentions "王平", merge them to "王平").
2. DO NOT include generic platform names (e.g., "抖音", "知乎早报", "微博", "百度", "百家号", "搜狐新闻") unless the platform itself is the main subject of the event.
3. Remove generic useless words like "表示", "今天", "我们", "发现". Keep only nouns, entities, specific actions, and core topics.
4. Assign a reasonable weight (10 to 100) to each keyword based on its importance and frequency. **CRITICAL TIME DECAY ALGORITHM**: You MUST give significantly higher weights to concepts that appear in recent news (e.g., [今天] or [距今1天前]), and severely penalize/decay the weights of concepts that only appeared in older news (e.g., [距今10天前] or older).
5. Output exactly 30 keywords.

IMPORTANT: You MUST respond entirely in Simplified Chinese (简体中文).
Respond in JSON format:
{
  "keywords": [
    { "name": "王平", "value": 100 },
    { "name": "学术造假", "value": 85 }
  ]
}
  `;

  try {
    const response = await axios.post(`${apiUrl}/chat/completions`, {
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" }
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const result = response.data.choices[0].message.content;
    return JSON.parse(result).keywords || null;
  } catch (err) {
    console.error("Error calling AI model for wordcloud", err);
    return null;
  }
}

export async function analyzeAlertCredibility(keyword: string, searchResults: any[]) {
  if (!apiKey) {
    console.warn("No API Key configured for SiliconFlow");
    return [];
  }
  if (!searchResults || searchResults.length === 0) return [];

  const corpus = searchResults.map(r => `Platform: ${r.platform || 'Search Engine'}\nTitle: ${r.title}\nURL: ${r.url || ''}\nSnippet: ${r.summary || ''}`).join('\n\n---\n\n').substring(0, 15000);

  const prompt = `
You are an expert intelligence analyst assessing the credibility and authenticity of breaking news.
A user is monitoring the keyword: "${keyword}".
We have collected the following recent social media and search engine data:

${corpus}

Your task:
1. Analyze if there are any ACTUAL breaking news or real events related to this keyword occurring in the provided text.
2. Filter out SEO spam, irrelevant mentions, and old news.
3. For each real and relevant event found, provide:
   - A descriptive title
   - A clear, factual summary of the event
   - An assessment of its credibility (0 to 100), based on the source platform and context.
   - Your reasoning for the credibility score.
   - Identify the primary source URL if available.

IMPORTANT: You MUST respond entirely in Simplified Chinese (简体中文). The title, summary, and analysis fields MUST be written in Chinese, regardless of the source language.

Respond ONLY with a valid JSON object in this exact format:
{
  "events": [
    {
      "title": "Clear event title",
      "summary": "Detailed summary",
      "isReal": true,
      "credibility": 85,
      "analysis": "Reasoning for why this is real and its credibility score",
      "url": "https://...",
      "platform": "Weibo/Xiaohongshu/Bing/etc"
    }
  ]
}
If no relevant, real events are found, return { "events": [] }.
`;

  try {
    const response = await axios.post(`${apiUrl}/chat/completions`, {
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2
    }, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
    });

    let content = response.data.choices[0].message.content;
    content = content.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    const parsed = JSON.parse(content);
    return parsed.events || [];
  } catch (error) {
    console.error("AI Alert analysis error:", error);
    return [];
  }
}
