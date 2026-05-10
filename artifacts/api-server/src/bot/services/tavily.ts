import axios from "axios";

const MAX_RETRIES = 3;

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw new Error("Max retries reached");
}

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export async function searchWeb(query: string, maxResults = 5): Promise<SearchResult[]> {
  return withRetry(async () => {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) throw new Error("TAVILY_API_KEY not set");

    const response = await axios.post(
      "https://api.tavily.com/search",
      {
        api_key: apiKey,
        query,
        search_depth: "advanced",
        max_results: maxResults,
        include_answer: true,
        include_raw_content: false,
      },
      { timeout: 30000 }
    );

    return (response.data.results || []).map((r: any) => ({
      title: r.title || "",
      url: r.url || "",
      content: r.content || "",
      score: r.score || 0,
    }));
  });
}

export function formatSearchResults(results: SearchResult[], query: string): string {
  if (!results.length) return `❌ لم يتم العثور على نتائج لـ: ${query}`;

  let msg = `🔍 *نتائج البحث عن: ${query}*\n\n`;
  results.forEach((r, i) => {
    msg += `*${i + 1}. ${r.title}*\n`;
    msg += `${r.content.substring(0, 200)}...\n`;
    msg += `🔗 [رابط المصدر](${r.url})\n\n`;
  });
  return msg;
}
